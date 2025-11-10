import Foundation

struct HotkeyEvent: Codable {
    enum EventType: String, Codable {
        case startListening
        case stopListening
        case heartbeat
    }

    let type: EventType
    let timestamp: TimeInterval
}

@main
struct SayCastNativeHelper {
    static func main() async {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.withoutEscapingSlashes]
        log("sayCast native helper booting (placeholder)")

        // Emit periodic heartbeat so Node process can detect liveness while we wire the real event tap.
        Task {
            while true {
                try? emit(encoder: encoder, event: HotkeyEvent(type: .heartbeat, timestamp: Date().timeIntervalSince1970))
                try await Task.sleep(nanoseconds: 2_000_000_000)
            }
        }

        // Keep process alive.
        RunLoop.current.run()
    }

    private static func emit(encoder: JSONEncoder, event: HotkeyEvent) throws {
        let data = try encoder.encode(event)
        if let json = String(data: data, encoding: .utf8) {
            FileHandle.standardOutput.write((json + "\n").data(using: .utf8)!)
        }
    }

    private static func log(_ message: String) {
        FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    }
}
