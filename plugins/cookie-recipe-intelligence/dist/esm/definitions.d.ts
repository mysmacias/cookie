export interface ParsedIngredientDraft {
    name: string;
    amount: string;
}
export interface ParsedStepDraft {
    title: string;
    description: string;
}
export interface ParsedRecipeDraft {
    title: string;
    description: string;
    prepTime: string;
    timeDisplay: string;
    bakeTime: string;
    yields: string;
    category: string;
    tags: string[];
    ingredients: ParsedIngredientDraft[];
    steps: ParsedStepDraft[];
    chefNote: string;
}
export type ModelAvailabilityReason = 'available' | 'deviceNotEligible' | 'appleIntelligenceNotEnabled' | 'modelNotReady' | 'unknown';
export interface ScanRecipeFromImageOptions {
    /** Base64 image data, with or without a `data:image/...;base64,` prefix */
    imageBase64: string;
    /** Include raw OCR text in the response (defaults to false) */
    includeRawText?: boolean;
}
export interface ScanRecipeFromImageResult {
    summary: string;
    recipe: ParsedRecipeDraft;
    rawText?: string;
}
export interface CheckModelAvailabilityResult {
    available: boolean;
    reason: ModelAvailabilityReason;
}
export interface CookieRecipeIntelligencePlugin {
    scanRecipeFromImage(options: ScanRecipeFromImageOptions): Promise<ScanRecipeFromImageResult>;
    checkModelAvailability(): Promise<CheckModelAvailabilityResult>;
}
