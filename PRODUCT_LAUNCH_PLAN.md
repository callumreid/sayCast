# sayCast Product Launch Plan

A roadmap to transform sayCast from a personal tool into a polished macOS product that anyone can install.

---

## Current State vs. Target State

| Aspect | Current | Target |
|--------|---------|--------|
| Installation | Clone repo, `pnpm install`, manual setup | Download DMG → drag to Applications |
| Configuration | Edit `.env` file | Settings GUI with secure credential storage |
| Startup | `pnpm start` from terminal | Launch from Applications, optional login item |
| Permissions | Manual approval when prompted | Guided onboarding flow |
| Updates | `git pull` | Auto-update notifications or silent updates |
| Distribution | GitHub source | Website download, Homebrew, (future) App Store |
| Support | Read source code | In-app help, documentation site |

---

## Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: App Packaging (1-2 weeks)                                         │
│  Bundle all components into a single .app that launches like any Mac app    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: First-Run Experience (1-2 weeks)                                  │
│  Onboarding wizard, permissions guidance, API key setup                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: Settings & Polish (1-2 weeks)                                     │
│  Preferences window, menu bar controls, visual polish                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: Code Signing & Notarization (1 week)                              │
│  Apple Developer setup, automated signing in CI                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: Distribution (1 week)                                             │
│  DMG installer, landing page, Homebrew cask                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: Auto-Updates & Analytics (1 week)                                 │
│  Sparkle framework, crash reporting, usage analytics                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: Beta Launch (ongoing)                                             │
│  Limited release, gather feedback, iterate                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 8: Public Launch                                                     │
│  Marketing, documentation, support channels                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Timeline: 8-12 weeks to public beta
```

---

## Phase 1: App Packaging

**Goal**: Create `sayCast.app` that bundles everything and launches with a double-click.

### Architecture Decision: Electron as Host

Since you already have an Electron app (the HUD), extend it to be the main application that:
1. Embeds the Node.js core service
2. Bundles the Swift native helper binary
3. Manages the HUD window
4. Provides the menu bar icon and preferences

```
sayCast.app/
├── Contents/
│   ├── Info.plist              # App metadata, permissions declarations
│   ├── MacOS/
│   │   └── sayCast             # Electron executable
│   ├── Resources/
│   │   ├── app/                # Your Electron app code
│   │   │   ├── main.js         # Electron main process (manages everything)
│   │   │   ├── core/           # Bundled core service (esbuild bundle)
│   │   │   └── native-helper   # Compiled Swift binary
│   │   ├── icon.icns           # App icon
│   │   └── ...
│   └── Frameworks/             # Electron framework
└── ...
```

### Tasks

- [ ] **1.1 Consolidate into single Electron app**
  - Merge `apps/core` logic into `apps/hud` main process
  - Bundle core service with esbuild into a single JS file
  - Spawn native helper from within Electron main process

- [ ] **1.2 Bundle native helper**
  - Build universal binary (arm64 + x86_64): `swift build -c release --arch arm64 --arch x86_64`
  - Copy binary into app resources during build
  - Sign the helper binary (required for notarization)

- [ ] **1.3 Create proper Info.plist**
  ```xml
  <key>NSMicrophoneUsageDescription</key>
  <string>sayCast needs microphone access to transcribe your voice commands.</string>
  
  <key>NSAppleEventsUsageDescription</key>
  <string>sayCast needs automation access to execute commands in other applications.</string>
  ```

- [ ] **1.4 Add menu bar presence**
  - Tray icon showing status (idle, listening, error)
  - Menu: Preferences, Check for Updates, Quit
  - Option to hide dock icon (LSUIElement)

- [ ] **1.5 Build script**
  - Use `electron-builder` or `electron-forge`
  - Output: `sayCast-{version}-{arch}.dmg`

### Key Files to Modify/Create

```
apps/hud/
├── main.js              → Expand to manage core service lifecycle
├── core-bundle.js       → New: esbuild output of apps/core
├── tray.js              → New: Menu bar icon logic
├── forge.config.js      → New: electron-forge configuration
└── build/
    └── entitlements.plist → New: macOS entitlements for signing
```

---

## Phase 2: First-Run Experience

**Goal**: Guide new users through setup so they can use sayCast within 2 minutes of downloading.

### Onboarding Flow

```
┌─────────────────────────────────────────┐
│           Welcome to sayCast            │
│                                         │
│   Voice commands for your Mac,          │
│   powered by Wispr Flow                 │
│                                         │
│         [Get Started →]                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Step 1: Accessibility            │
│                                         │
│   sayCast needs permission to detect    │
│   keyboard shortcuts system-wide.       │
│                                         │
│   [Open System Preferences]             │
│                                         │
│   ☐ Permission granted                  │
│         [Continue →]                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Step 2: Microphone               │
│                                         │
│   sayCast needs microphone access       │
│   to hear your voice commands.          │
│                                         │
│   [Grant Permission]                    │
│                                         │
│   ☐ Permission granted                  │
│         [Continue →]                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Step 3: Wispr API Key            │
│                                         │
│   Enter your Wispr Flow API key:        │
│   ┌─────────────────────────────────┐   │
│   │ wfk_xxxxxxxxxxxxxxxxxxxx        │   │
│   └─────────────────────────────────┘   │
│                                         │
│   Don't have one? [Get API Key ↗]       │
│                                         │
│   [Test Connection]  ✓ Connected!       │
│         [Continue →]                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Step 4: Try It Out               │
│                                         │
│   Hold Ctrl+Option+S and say:           │
│   "left half"                           │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  🎤 Listening...                │   │
│   │  "left half"                    │   │
│   │  ✓ Window snapped to left!      │   │
│   └─────────────────────────────────┘   │
│                                         │
│         [Finish Setup]                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           You're All Set!               │
│                                         │
│   sayCast is running in your menu bar.  │
│                                         │
│   ☐ Launch at login                     │
│   ☐ Show tips occasionally              │
│                                         │
│   [View All Commands]  [Close]          │
└─────────────────────────────────────────┘
```

### Tasks

- [ ] **2.1 Create onboarding window**
  - New Electron BrowserWindow with step-by-step UI
  - Store `onboardingComplete: true` in config after finish

- [ ] **2.2 Permission detection**
  - Check Accessibility: use `AXIsProcessTrusted()` via native module or swift helper
  - Check Microphone: `systemPreferences.getMediaAccessStatus('microphone')`
  - Deep-link to System Preferences panes

- [ ] **2.3 Keychain integration for API key**
  - Use `keytar` or native `security` CLI to store credentials
  - Never store API keys in plain files

- [ ] **2.4 Interactive tutorial**
  - Embed mini-HUD in onboarding window
  - Celebrate successful first command

---

## Phase 3: Settings & Polish

**Goal**: Let users customize sayCast through a proper Preferences window.

### Preferences Window Sections

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚙️ sayCast Preferences                                    ─ □ × │
├────────────┬─────────────────────────────────────────────────────┤
│            │                                                     │
│  General   │  Startup                                            │
│            │  ☑ Launch sayCast at login                          │
│  Hotkeys   │  ☐ Start minimized to menu bar                      │
│            │                                                     │
│  Audio     │  Appearance                                         │
│            │  HUD Position: [Top Right ▼]                        │
│  Commands  │  HUD Theme: [Auto ▼] (matches system)               │
│            │                                                     │
│  API Keys  │  Feedback Sounds                                    │
│            │  ☑ Play sound on command match                      │
│  Advanced  │  ☐ Play sound on error                              │
│            │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
```

### Tabs Content

**General**: Launch at login, HUD position/theme, sounds
**Hotkeys**: Customize trigger combo, view conflicts
**Audio**: Microphone selection, noise gate, silence timeout
**Commands**: View built-in, add custom, import/export
**API Keys**: Wispr key (masked), test connection button
**Advanced**: Logs location, reset to defaults, debug mode

### Tasks

- [ ] **3.1 Preferences window UI**
  - `apps/hud/settings.html` exists but needs expansion
  - Consider using a UI framework (Tailwind, or native-feeling CSS)

- [ ] **3.2 Settings persistence**
  - Store in `~/Library/Application Support/sayCast/config.json`
  - Migrate from `.env` on first run

- [ ] **3.3 Custom hotkey support**
  - Let users change from Ctrl+Option+S to their preference
  - Update native helper to accept configurable hotkey

- [ ] **3.4 Command editor**
  - List all commands with enable/disable toggles
  - Add custom commands UI (phrase, script path)
  - Import/export as JSON/YAML

- [ ] **3.5 Visual polish**
  - Consistent styling across HUD, onboarding, preferences
  - Proper app icon (1024x1024 for App Store, icns for app)
  - Light/dark mode support

---

## Phase 4: Code Signing & Notarization

**Goal**: Make the app installable without Gatekeeper warnings.

### Requirements

1. **Apple Developer Program** ($99/year)
2. **Developer ID Application** certificate (for app signing)
3. **Developer ID Installer** certificate (for pkg/dmg signing)
4. **App-specific password** for notarization

### Tasks

- [ ] **4.1 Obtain certificates**
  - Enroll in Apple Developer Program if not already
  - Create certificates in Certificates, Identifiers & Profiles
  - Download and install in Keychain

- [ ] **4.2 Configure entitlements**
  ```xml
  <!-- build/entitlements.plist -->
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
  <plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
  </dict>
  </plist>
  ```

- [ ] **4.3 Sign the native helper**
  ```bash
  codesign --deep --force --verify --verbose \
    --sign "Developer ID Application: Your Name (TEAM_ID)" \
    --options runtime \
    --entitlements entitlements.plist \
    SayCastNativeHelper
  ```

- [ ] **4.4 Sign the Electron app**
  - electron-builder handles this with `mac.identity` config
  - Ensure all binaries inside .app are signed

- [ ] **4.5 Notarize**
  ```bash
  xcrun notarytool submit sayCast.dmg \
    --apple-id "you@email.com" \
    --team-id "TEAM_ID" \
    --password "@keychain:AC_PASSWORD" \
    --wait
  
  xcrun stapler staple sayCast.dmg
  ```

- [ ] **4.6 Automate in CI**
  - GitHub Actions workflow (you have a template in `.github/workflows/`)
  - Store credentials as secrets
  - Build, sign, notarize, release on tag push

---

## Phase 5: Distribution

**Goal**: Make sayCast easy to discover and install.

### Distribution Channels

| Channel | Effort | Reach | Control |
|---------|--------|-------|---------|
| **Direct download (DMG)** | Low | Medium | Full |
| **Homebrew Cask** | Low | High (devs) | Full |
| **Mac App Store** | High | Highest | Limited |
| **SetApp** | Medium | Medium | Shared |

### Recommended: Start with DMG + Homebrew

### Tasks

- [ ] **5.1 Create DMG installer**
  - Use `electron-builder` dmg target
  - Custom background image with drag-to-Applications arrow
  - Include uninstall instructions in README

- [ ] **5.2 Landing page**
  - Simple site: sayCast.app or saycast.dev
  - Hero section with demo video/GIF
  - Download button (auto-detect Intel vs Apple Silicon)
  - Feature list, pricing (free?), FAQ

- [ ] **5.3 Homebrew Cask**
  ```ruby
  # homebrew-cask/Casks/saycast.rb
  cask "saycast" do
    version "1.0.0"
    sha256 "abc123..."
    
    url "https://github.com/youruser/sayCast/releases/download/v#{version}/sayCast-#{version}-universal.dmg"
    name "sayCast"
    desc "Voice commands for your Mac"
    homepage "https://saycast.app"
    
    depends_on macos: ">= :monterey"
    
    app "sayCast.app"
    
    postflight do
      # Remind user about permissions
    end
  end
  ```
  - Submit to homebrew/homebrew-cask or host your own tap

- [ ] **5.4 GitHub Releases**
  - Automated via CI on version tags
  - Include changelog, checksums
  - Universal binary (arm64 + x86_64)

---

## Phase 6: Auto-Updates

**Goal**: Keep users on the latest version without manual intervention.

### Options

| Solution | Pros | Cons |
|----------|------|------|
| **Sparkle** | Native macOS feel, battle-tested | Objective-C, needs appcast server |
| **electron-updater** | Built for Electron, GitHub releases support | Requires code signing |
| **Homebrew** | Users run `brew upgrade` | Manual, dev-focused |

### Recommended: electron-updater

### Tasks

- [ ] **6.1 Configure electron-updater**
  ```javascript
  // main.js
  const { autoUpdater } = require('electron-updater');
  
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('update-available', () => {
    // Show notification
  });
  
  autoUpdater.on('update-downloaded', () => {
    // Prompt to restart
  });
  ```

- [ ] **6.2 Host update metadata**
  - GitHub Releases works automatically with electron-updater
  - Alternatively, host `latest.yml` on your server

- [ ] **6.3 Update UX**
  - Menu bar item: "Update Available"
  - Non-intrusive notification
  - "What's New" after update

---

## Phase 7: Beta Program

**Goal**: Validate with real users before public launch.

### Tasks

- [ ] **7.1 Beta distribution**
  - Use TestFlight (if going App Store route)
  - Or distribute signed DMG via invite-only link
  - Consider using a service like Setapp for managed beta

- [ ] **7.2 Feedback collection**
  - In-app feedback form (opens email or form)
  - Discord/Slack community for beta testers
  - Crash reporting (Sentry, Bugsnag)

- [ ] **7.3 Analytics (optional)**
  - Anonymous usage stats: which commands are popular
  - Helps prioritize features
  - Be transparent, let users opt out

- [ ] **7.4 Iterate based on feedback**
  - Common issues become FAQ/docs
  - Popular requests become roadmap items
  - Fix critical bugs immediately

---

## Phase 8: Public Launch

**Goal**: Get sayCast into users' hands.

### Launch Checklist

- [ ] **Documentation site**
  - Getting started guide
  - All commands reference
  - Troubleshooting
  - API key setup walkthrough

- [ ] **Marketing materials**
  - 30-second demo video
  - Screenshots showing HUD in action
  - Comparison with alternatives (if any)

- [ ] **Launch venues**
  - Product Hunt
  - Hacker News (Show HN)
  - Reddit (r/macapps, r/raycast, r/productivity)
  - Twitter/X
  - Mac-focused blogs/newsletters

- [ ] **Support channels**
  - GitHub Issues for bugs
  - GitHub Discussions for questions
  - Email for sensitive issues

---

## Pricing Considerations

| Model | Pros | Cons |
|-------|------|------|
| **Free + Open Source** | Maximum adoption, community contributions | No revenue, API costs on users |
| **Free (closed source)** | Easy adoption | No revenue |
| **Freemium** | Revenue from power users | Complexity |
| **Paid ($X one-time)** | Simple, sustainable | Friction to try |
| **Subscription** | Recurring revenue | Users dislike subscriptions for utilities |

### Recommendation

**Free during beta**, then evaluate:
- If you want to build a business: Freemium (free with limited commands, paid for custom commands + priority support)
- If you want maximum adoption: Free + open source, accept donations/sponsors

---

## Technical Debt to Address

Before production, clean up:

- [ ] Error handling: Graceful failures with user-friendly messages
- [ ] Logging: Ship logs to file, not just console; add log rotation
- [ ] Memory leaks: Profile the app under extended use
- [ ] Offline mode: Handle Wispr unavailability gracefully
- [ ] Multiple monitors: Test HUD positioning
- [ ] Accessibility: VoiceOver support for preferences UI
- [ ] Localization: Prepare for i18n even if launching English-only

---

## Wispr Flow Dependency

sayCast currently requires a Wispr Flow API key. Consider:

1. **Keep as-is**: Users get their own key
   - Pro: No backend costs for you
   - Con: Friction in onboarding

2. **Proxy through your server**: You manage the API key
   - Pro: Simpler UX
   - Con: You pay for API usage, need backend

3. **Alternative STT backends**: OpenAI Whisper, local Whisper, macOS Dictation
   - Pro: Reduces single-vendor dependency
   - Con: Development effort

### Recommendation for v1

Keep Wispr as primary, guide users through key setup. Add local Whisper fallback in v1.1 for offline/privacy-conscious users.

---

## Summary: What to Build First

### Minimum Viable Product (MVP) for Beta

1. ✅ Voice command pipeline (done)
2. ✅ HUD feedback (done)
3. ✅ Command matching (done)
4. 🔲 Bundled .app (Phase 1)
5. 🔲 Onboarding wizard (Phase 2)
6. 🔲 Basic preferences UI (Phase 3)
7. 🔲 Code signing (Phase 4)
8. 🔲 DMG distribution (Phase 5)

**Estimated time to beta: 6-8 weeks of focused work**

### Post-Beta

- Auto-updates
- Custom commands UI
- Alternative STT backends
- App Store submission (if desired)

---

## Next Steps

1. **Today**: Decide on Phase 1 approach (extend Electron vs. rebuild)
2. **This week**: Set up electron-builder/forge, get basic .app building
3. **Next week**: Onboarding UI mockups, start implementation
4. **Week 3-4**: Settings, code signing setup
5. **Week 5-6**: Polish, beta testing with friends
6. **Week 7-8**: Public beta launch

---

## Resources

- [Electron Builder](https://www.electron.build/) - App packaging
- [Electron Forge](https://www.electronforge.io/) - Alternative to builder
- [Apple Notarization Docs](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Homebrew Cask](https://github.com/Homebrew/homebrew-cask/blob/master/CONTRIBUTING.md)
- [electron-updater](https://www.electron.build/auto-update)
- [Keytar](https://github.com/atom/node-keytar) - Keychain access from Node

---

*Document created: November 2024*
*Target launch: Q1 2025*

