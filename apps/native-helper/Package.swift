// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SayCastNativeHelper",
    platforms: [
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "SayCastNativeHelper",
            path: "Sources"
        )
    ]
)
