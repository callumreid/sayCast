# sayCast Native Helper (Swift)

This executable will eventually:
1. Install a CGEvent tap to detect when `Fn + Shift` are held.
2. Start/stop `AVAudioEngine` capture while the hotkey is active.
3. Stream PCM16 audio chunks + lifecycle events back to the Node core process over stdio.

Current status: placeholder executable that logs startup/shutdown so we can verify the bridging pipeline.
