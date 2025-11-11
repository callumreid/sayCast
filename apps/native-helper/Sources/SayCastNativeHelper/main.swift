import ApplicationServices
import AVFoundation
import Foundation

struct HelperEvent: Codable {
    enum EventType: String, Codable {
        case startListening
        case stopListening
        case heartbeat
        case error
        case audioChunk
    }

    let type: EventType
    let timestamp: TimeInterval
    let message: String?
    let payload: AudioPayload?

    init(type: EventType, message: String? = nil, payload: AudioPayload? = nil) {
        self.type = type
        self.timestamp = Date().timeIntervalSince1970
        self.message = message
        self.payload = payload
    }
}

struct AudioPayload: Codable {
    let data: String
    let packetDuration: Double
    let sampleRate: Double
}

final class EventEmitter {
    private let encoder = JSONEncoder()

    init() {
        encoder.outputFormatting = [.withoutEscapingSlashes]
    }

    func emit(_ event: HelperEvent) {
        do {
            let data = try encoder.encode(event)
            if let json = String(data: data, encoding: .utf8) {
                FileHandle.standardOutput.write((json + "\n").data(using: .utf8)!)
            }
        } catch {
            helperLog("Failed to encode event: \(error)")
        }
    }
}

final class FnShiftMonitor {
    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var listening = false
    private let emitter: EventEmitter
    private let audioStream: AudioStream

    init(emitter: EventEmitter, audioStream: AudioStream) {
        self.emitter = emitter
        self.audioStream = audioStream
    }

    func start() {
        let mask = CGEventMask(1 << CGEventType.flagsChanged.rawValue)
            | CGEventMask(1 << CGEventType.keyDown.rawValue)
            | CGEventMask(1 << CGEventType.keyUp.rawValue)

        let callback: CGEventTapCallBack = { _, type, event, refcon in
            guard let refcon = refcon else { return Unmanaged.passUnretained(event) }
            let monitor = Unmanaged<FnShiftMonitor>.fromOpaque(refcon).takeUnretainedValue()
            monitor.handleEvent(type: type, event: event)
            return Unmanaged.passUnretained(event)
        }

        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: mask,
            callback: callback,
            userInfo: UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
        ) else {
            emitter.emit(HelperEvent(type: .error, message: "Unable to create CGEvent tap. Grant Accessibility permissions."))
            return
        }

        eventTap = tap
        runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        if let source = runLoopSource {
            CFRunLoopAddSource(CFRunLoopGetCurrent(), source, .commonModes)
        }
        CGEvent.tapEnable(tap: tap, enable: true)
    }

    private func handleEvent(type: CGEventType, event: CGEvent) {
        guard type == .flagsChanged || type == .keyDown || type == .keyUp else { return }
        let flags = event.flags
        let fnPressed = flags.contains(.maskSecondaryFn)
        let shiftPressed = flags.contains(.maskShift)
        let shouldListen = fnPressed && shiftPressed

        if shouldListen && !listening {
            listening = true
            audioStream.start()
            emitter.emit(HelperEvent(type: .startListening))
        } else if !shouldListen && listening {
            listening = false
            audioStream.stop()
            emitter.emit(HelperEvent(type: .stopListening))
        }
    }

    deinit {
        if let tap = eventTap {
            CGEvent.tapEnable(tap: tap, enable: false)
        }
        if let source = runLoopSource {
            CFRunLoopRemoveSource(CFRunLoopGetCurrent(), source, .commonModes)
        }
    }
}

final class AudioStream {
    private let engine = AVAudioEngine()
    private let emitter: EventEmitter
    private let chunkDuration: Double = 0.5 // seconds
    private let targetSampleRate: Double = 16_000
    private var tapInstalled = false
    private var isRunning = false

    init(emitter: EventEmitter) {
        self.emitter = emitter
    }

    private func installTapIfNeeded() {
        guard !tapInstalled else { return }
        let inputNode = engine.inputNode
        guard let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: targetSampleRate, channels: 1, interleaved: false) else {
            emitter.emit(HelperEvent(type: .error, message: "Unable to create audio format"))
            return
        }
        let bufferSize = AVAudioFrameCount(targetSampleRate * chunkDuration)

        inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: format) { [weak self] buffer, _ in
            self?.handle(buffer: buffer)
        }
        tapInstalled = true
    }

    func start() {
        installTapIfNeeded()
        guard !isRunning else { return }
        do {
            try engine.start()
            isRunning = true
        } catch {
            emitter.emit(HelperEvent(type: .error, message: "Audio engine failed: \(error.localizedDescription)"))
        }
    }

    func stop() {
        guard isRunning else { return }
        engine.pause()
        isRunning = false
    }

    private func handle(buffer: AVAudioPCMBuffer) {
        guard let floatChannelData = buffer.floatChannelData else { return }
        let channelPointer = floatChannelData.pointee
        let frameLength = Int(buffer.frameLength)
        var pcm = [Int16](repeating: 0, count: frameLength)
        for idx in 0..<frameLength {
            let clamped = max(-1.0, min(1.0, channelPointer[idx]))
            pcm[idx] = Int16(clamped * Float(Int16.max))
        }
        let data = pcm.withUnsafeBufferPointer { Data(buffer: $0) }
        let base64 = data.base64EncodedString()
        let packetDuration = Double(frameLength) / targetSampleRate
        let payload = AudioPayload(data: base64, packetDuration: packetDuration, sampleRate: targetSampleRate)
        emitter.emit(HelperEvent(type: .audioChunk, payload: payload))
    }
}

@main
struct SayCastNativeHelper {
    static func main() {
        helperLog("sayCast native helper booting")
        let emitter = EventEmitter()
        let audioStream = AudioStream(emitter: emitter)
        let monitor = FnShiftMonitor(emitter: emitter, audioStream: audioStream)
        monitor.start()

        Task.detached {
            while true {
                emitter.emit(HelperEvent(type: .heartbeat))
                try? await Task.sleep(nanoseconds: 2_000_000_000)
            }
        }

        RunLoop.main.run()
    }
}

private func helperLog(_ message: String) {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
}
