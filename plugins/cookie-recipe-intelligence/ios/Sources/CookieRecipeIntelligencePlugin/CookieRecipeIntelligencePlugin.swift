import Foundation
import UIKit
import Vision
import FoundationModels
import Capacitor

/// Boxes `CAPPluginCall` so it can be referenced from an unstructured `Task` without Swift 6 `Sendable` errors.
private final class UncheckedPluginCallBox: @unchecked Sendable {
    let call: CAPPluginCall
    init(_ call: CAPPluginCall) { self.call = call }
}

@Generable(description: "One ingredient with measurement")
struct ParsedIngredient {
    var name: String
    var amount: String
}

@Generable(description: "One numbered cooking step")
struct ParsedStep {
    var title: String
    var description: String
}

@Generable(description: "Recipe fields extracted from noisy OCR")
struct ParsedRecipeOutput {
    @Guide(description: "Two or three sentences summarizing the dish for a home cook")
    var summary: String
    var title: String
    var description: String
    var prepTime: String
    var timeDisplay: String
    var bakeTime: String
    var yields: String
    var category: String
    @Guide(description: "Topic keywords", .maximumCount(12))
    var tags: [String]
    @Guide(description: "Ingredients in order", .maximumCount(40))
    var ingredients: [ParsedIngredient]
    @Guide(description: "Steps in cooking order", .maximumCount(30))
    var steps: [ParsedStep]
    @Guide(description: "Optional cook tips; empty if none")
    var chefNote: String
}

@objc(CookieRecipeIntelligencePlugin)
public class CookieRecipeIntelligencePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CookieRecipeIntelligencePlugin"
    public let jsName = "CookieRecipeIntelligence"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scanRecipeFromImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkModelAvailability", returnType: CAPPluginReturnPromise),
    ]

    @objc func checkModelAvailability(_ call: CAPPluginCall) {
        let availability = SystemLanguageModel.default.availability
        switch availability {
        case .available:
            call.resolve(["available": true, "reason": "available"])
        case .unavailable(let reason):
            let rs: String = switch reason {
            case .deviceNotEligible: "deviceNotEligible"
            case .appleIntelligenceNotEnabled: "appleIntelligenceNotEnabled"
            case .modelNotReady: "modelNotReady"
            @unknown default: "unknown"
            }
            call.resolve(["available": false, "reason": rs])
        }
    }

    @objc func scanRecipeFromImage(_ call: CAPPluginCall) {
        guard let rawB64 = call.getString("imageBase64"), !rawB64.isEmpty else {
            call.reject("Missing imageBase64", "INVALID_INPUT", nil)
            return
        }
        let includeRawText = call.getBool("includeRawText") ?? false
        let callBox = UncheckedPluginCallBox(call)

        Task {
            do {
                let availability = SystemLanguageModel.default.availability
                switch availability {
                case .available:
                    break
                case .unavailable:
                    let msg = Self.unavailableUserMessage(for: availability)
                    await MainActor.run { callBox.call.reject(msg, "UNAVAILABLE", nil) }
                    return
                }

                let uiImage = try Self.decodeImageBase64(rawB64)
                guard let cgImage = uiImage.cgImage else {
                    await MainActor.run { callBox.call.reject("Could not read image", "IMAGE_DECODE", nil) }
                    return
                }

                let rawText = try await Self.recognizeText(from: cgImage)
                let trimmed = rawText.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmed.isEmpty {
                    await MainActor.run {
                        callBox.call.reject("No text found in image. Try a clearer photo.", "OCR_EMPTY", nil)
                    }
                    return
                }

                let forModel = Self.truncateForContext(trimmed)
                let instructions = """
                You convert OCR text from recipe cards, magazines, or phone screenshots into structured recipe data.
                Fix obvious OCR errors and merge hyphenated line breaks.
                If a field is missing, use an empty string or empty array.
                For steps, use concise titles; if the source only has paragraphs, use short titles like Step 1, Step 2.
                summary must be 2-3 sentences for a home cook. Do not invent ingredients or steps not supported by the text.
                """
                let session = LanguageModelSession(instructions: instructions)
                let prompt = """
                Parse this OCR recipe text into the structured format.

                OCR:
                \(forModel)
                """
                let response = try await session.respond(
                    to: prompt,
                    generating: ParsedRecipeOutput.self
                )
                let output = response.content

                var payload: [String: Any] = [
                    "summary": output.summary,
                    "recipe": Self.recipeJSObject(from: output),
                ]
                if includeRawText {
                    payload["rawText"] = rawText
                }
                await MainActor.run { callBox.call.resolve(payload) }
            } catch {
                await MainActor.run {
                    callBox.call.reject(error.localizedDescription, "SCAN_FAILED", nil)
                }
            }
        }
    }

    // MARK: - Vision OCR

    private static func recognizeText(from cgImage: CGImage) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let request = VNRecognizeTextRequest { request, error in
                    if let error {
                        continuation.resume(throwing: error)
                        return
                    }
                    guard let observations = request.results as? [VNRecognizedTextObservation] else {
                        continuation.resume(returning: "")
                        return
                    }
                    let sorted = observations.sorted { a, b in
                        let ay = a.boundingBox.midY
                        let by = b.boundingBox.midY
                        if abs(ay - by) < 0.02 { return a.boundingBox.minX < b.boundingBox.minX }
                        return ay > by
                    }
                    let lines: [String] = sorted.compactMap { obs in
                        obs.topCandidates(1).first?.string
                    }
                    continuation.resume(returning: lines.joined(separator: "\n"))
                }
                request.recognitionLevel = .accurate
                request.usesLanguageCorrection = true

                let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
                do {
                    try handler.perform([request])
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    // MARK: - Image decode

    private static func decodeImageBase64(_ raw: String) throws -> UIImage {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if let r = s.range(of: "base64,", options: .caseInsensitive) {
            s = String(s[r.upperBound...])
        }
        guard let data = Data(base64Encoded: s, options: [.ignoreUnknownCharacters]),
              let image = UIImage(data: data)
        else {
            throw NSError(
                domain: "CookieRecipeIntelligence",
                code: 10,
                userInfo: [NSLocalizedDescriptionKey: "Invalid base64 image"]
            )
        }
        return image
    }

    /// Leaves room for instructions, schema, and model response within ~4096-token session budget.
    private static func truncateForContext(_ text: String, maxCharacters: Int = 9_000) -> String {
        guard text.count > maxCharacters else { return text }
        let idx = text.index(text.startIndex, offsetBy: maxCharacters)
        return String(text[..<idx]) + "\n\n[... OCR truncated for length ...]"
    }

    // MARK: - Availability + JSON

    private static func unavailableUserMessage(for availability: SystemLanguageModel.Availability) -> String {
        switch availability {
        case .available:
            return ""
        case .unavailable(let reason):
            switch reason {
            case .deviceNotEligible:
                return "This device does not support Apple Intelligence, which is required for recipe scanning."
            case .appleIntelligenceNotEnabled:
                return "Turn on Apple Intelligence in Settings to scan recipes from photos."
            case .modelNotReady:
                return "The on-device model is not ready yet. Check Apple Intelligence settings or try again shortly."
            @unknown default:
                return "Apple Intelligence is not available right now."
            }
        }
    }

    private static func recipeJSObject(from output: ParsedRecipeOutput) -> [String: Any] {
        [
            "title": output.title,
            "description": output.description,
            "prepTime": output.prepTime,
            "timeDisplay": output.timeDisplay,
            "bakeTime": output.bakeTime,
            "yields": output.yields,
            "category": output.category,
            "tags": output.tags,
            "ingredients": output.ingredients.map {
                ["name": $0.name, "amount": $0.amount]
            },
            "steps": output.steps.map {
                ["title": $0.title, "description": $0.description]
            },
            "chefNote": output.chefNote,
        ]
    }
}
