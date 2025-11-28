![Horse A Horse](horse_a_horse.png)

# sayCast

Voice commands for your Mac. Hold a hotkey, speak a command, and watch it execute.

[![GitHub release](https://img.shields.io/github/v/release/callumreid/sayCast)](https://github.com/callumreid/sayCast/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## ✨ Features

- 🎤 **Voice-controlled** - Speak commands naturally
- ⚡ **Fast transcription** - Powered by Wispr Flow
- 🪟 **Window management** - "left half", "maximize", "center third"
- 🚀 **App control** - "open app Chrome", "close app Slack"
- 🔧 **Extensible** - Add your own commands via shell scripts

---

## 📦 Installation

### Download (Recommended)

1. Download the latest `.dmg` from [Releases](https://github.com/callumreid/sayCast/releases)
2. Open the DMG and drag **sayCast** to Applications
3. Launch from Applications

### Homebrew (Coming Soon)

```bash
brew tap callumreid/saycast
brew install --cask saycast
```

### Build from Source

```bash
git clone https://github.com/callumreid/sayCast.git
cd sayCast
pnpm install
cd apps/hud
npm run bundle
npm run package
# App is in: out/sayCast-darwin-arm64/sayCast.app
```

---

## 🚀 Quick Start

### First Launch

1. **Open sayCast** from Applications (or double-click the .app)
2. **Grant permissions** when prompted:
   - ✅ Accessibility (for hotkey detection)
   - ✅ Microphone (for voice capture)
3. **Enter your Wispr API key** in the onboarding wizard
   - Get one at [wisprflow.ai](https://wisprflow.ai)

### Using sayCast

1. **Hold `Ctrl + Cmd`** (or `Ctrl + Option + S`)
2. **Speak your command** (e.g., "left half", "open app Chrome")
3. **Release the keys** — command executes!

### Menu Bar

Look for the **sayCast icon** (small circle) in your menu bar:
- Gray = Idle
- Green = Listening
- Click for: Preferences, Quit

---

## 🎯 Voice Commands

### Window Management

| Say this | Action |
|----------|--------|
| "left half" / "snap left" | Snap window to left half |
| "right half" / "snap right" | Snap window to right half |
| "maximize" / "full screen" | Maximize window |
| "center third" | Center third of screen |
| "left third" / "right third" | Side thirds |
| "top half" / "bottom half" | Vertical halves |
| "window larger" / "window smaller" | Resize window |

### App Control

| Say this | Action |
|----------|--------|
| "open app [name]" | Open/focus an application |
| "close app [name]" | Close an application |
| "open repo [name]" | Open repository in iTerm |

### Utilities

| Say this | Action |
|----------|--------|
| "incognito" | Open Chrome incognito |
| "quicktime" / "start recording" | Start QuickTime recording |

---

## ⚙️ Configuration

### Config Location

```
~/Library/Application Support/sayCast/config.json
```

### Adding Custom Commands

Place shell scripts in `~/raycast-scripts/` and they'll be available as voice commands.

Example script (`~/raycast-scripts/my-command.sh`):
```bash
#!/bin/bash
# Your automation here
open -a "Safari"
```

---

## 🛠 Development

### Prerequisites

- macOS 12+ (Monterey or later)
- Node.js 18+
- pnpm 9+
- Xcode Command Line Tools

### Setup

```bash
# Install dependencies
pnpm install

# Development mode
pnpm start

# Build packaged app
cd apps/hud
npm run bundle
npm run package
```

### Project Structure

```
sayCast/
├── apps/
│   ├── hud/           # Electron app (HUD + core service)
│   └── native-helper/ # Swift hotkey/audio capture
├── packages/
│   ├── config/        # Shared configuration
│   └── types/         # TypeScript types
└── homebrew-saycast/  # Homebrew formula
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Wispr Flow](https://wisprflow.ai) for speech-to-text
- [Electron](https://electronjs.org) for the app framework
- [Raycast](https://raycast.com) for inspiration

---

![Hacking Beavis](https://media4.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4ZXkxajd6MzFzNzZvcTBmeGljbm00em8wd2s1OWR6NjNkOGJuYzUzcCZlcD12MV9naWZzJmN0PWc/kD6daMoWcySbKZ3ncf/giphy.gif)
