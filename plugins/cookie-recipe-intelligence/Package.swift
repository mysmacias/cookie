// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "CookieRecipeIntelligence",
    platforms: [.iOS("26.0")],
    products: [
        .library(
            name: "CookieRecipeIntelligence",
            targets: ["CookieRecipeIntelligencePlugin"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
    ],
    targets: [
        .target(
            name: "CookieRecipeIntelligencePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
            ],
            path: "ios/Sources/CookieRecipeIntelligencePlugin",
            swiftSettings: [
                .swiftLanguageMode(.v5),
            ]
        ),
    ]
)
