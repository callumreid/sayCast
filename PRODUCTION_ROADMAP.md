# sayCast Production Roadmap

This document outlines the step-by-step process to take sayCast from a personal tool to a production-ready application available via Homebrew.

## Table of Contents

1. [Quick Start Checklist](#quick-start-checklist)
2. [Phase 1: CI/CD Setup](#phase-1-cicd-setup)
3. [Phase 2: Settings UI & Configuration](#phase-2-settings-ui--configuration)
4. [Phase 3: Homebrew Distribution](#phase-3-homebrew-distribution)
5. [Phase 4: Release & Distribution](#phase-4-release--distribution)
6. [Future Enhancements](#future-enhancements)

---

## Quick Start Checklist

Before starting, ensure you have:

- [ ] Apple Developer Account (already set up ✅)
- [ ] GitHub account and the sayCast repository
- [ ] Code signing certificates installed in Xcode Keychain
- [ ] Notarization credentials configured
- [ ] `pnpm` installed (v9.12.0)
- [ ] Swift toolchain installed (via Xcode)

---

## Phase 1: CI/CD Setup

**Goal**: Automate builds, code signing, notarization, and GitHub releases

### 1.1 Configure Code Signing Certificates

In your Apple Developer account:
1. Go to Certificates, Identifiers & Profiles
2. Create certificates for "Developer ID Application" and "Developer ID Installer"
3. Download and install in Xcode Keychain

### 1.2 Set Up GitHub Actions Secrets

In your GitHub repo settings, add these secrets:

```
APPLE_DEVELOPER_ID_APPLICATION="Developer ID Application: Your Name (TEAM_ID)"
APPLE_DEVELOPER_ID_INSTALLER="Developer ID Installer: Your Name (TEAM_ID)"
APPLE_NOTARIZATION_TEAM_ID=<your_team_id>
APPLE_NOTARIZATION_USER=<your_apple_id_email>
APPLE_NOTARIZATION_PASSWORD=<app_specific_password>
```

To generate an app-specific password for Apple ID:
1. Visit [appleid.apple.com](https://appleid.apple.com)
2. Sign in → Security → App-Specific Passwords
3. Generate a new one labeled "GitHub Actions"
4. Use this as `APPLE_NOTARIZATION_PASSWORD`

### 1.3 Add the Workflow File

The `.github/workflows/build-and-release.yml` file is already in place. Review it:

```bash
cat .github/workflows/build-and-release.yml
```

### 1.4 Test the Workflow

Create a test release to verify the CI/CD pipeline:

```bash
# Update version in package.json
npm version patch  # or minor/major

# Create and push a test tag
git tag v0.2.1
git push origin v0.2.1
```

Monitor the GitHub Actions tab to see the build progress.

### 1.5 Verify Artifacts

Once the workflow completes:
1. Check the GitHub Releases page for artifacts
2. Verify the artifacts are code-signed and notarized
3. Test installing locally: `tar -xzf sayCast-*.tar.gz`

---

## Phase 2: Settings UI & Configuration

**Timeline**: 1 week  
**Goal**: Allow users to configure API keys and custom commands without editing files

### 2.1 Settings UI Components

The settings UI is now in place:
- `apps/hud/settings.html` - UI layout
- `apps/hud/settings.js` - Interaction logic

### 2.2 Integrate Settings API Endpoints

In the core service (`apps/core`), add REST endpoints:

```javascript
// GET /api/settings - Retrieve all settings
// POST /api/settings/{section} - Save settings for a section
// POST /api/test/wispr - Test Wispr connection
// POST /api/settings/reset - Reset to defaults
```

Example implementation in `apps/core/src/hudServer.ts`:

```typescript
app.get('/api/settings', (req, res) => {
  const settings = loadSettingsFromDisk();
  res.json(settings);
});

app.post('/api/settings/:section', (req, res) => {
  const section = req.params.section;
  const data = req.body;
  saveSettingsSection(section, data);
  res.json({ success: true });
});
```

### 2.3 Implement Keychain Storage for Secrets

Use native modules to store API keys securely:

```bash
pnpm add keytar  # Or use native Keychain via child_process
```

Example:

```typescript
import keytar from 'keytar';

async function saveApiKey(service: string, account: string, password: string) {
  await keytar.setPassword(service, account, password);
}

async function getApiKey(service: string, account: string) {
  return await keytar.getPassword(service, account);
}
```

### 2.4 Secure Configuration Storage

Store non-secret settings in:
```
~/Library/Application Support/sayCast/config.json
```

Example structure:

```json
{
  "wispr": {
    "language": "en"
  },
  "audio": {
    "sensitivity": 50,
    "silenceTimeout": 3
  },
  "general": {
    "hotkeyModifiers": "Control + Option",
    "hotkeyTrigger": "S",
    "autoStart": true,
    "matchThreshold": 80
  },
  "commands": {
    "customCommandsPath": "~/.saycast/commands.yaml"
  }
}
```

### 2.5 Add Settings Window

Update the HUD app's main.js to support opening settings:

```javascript
// Create settings window when user clicks settings icon
function openSettingsWindow() {
  const settingsWin = new BrowserWindow({
    width: 600,
    height: 700,
    modal: true,
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  settingsWin.loadFile(path.join(__dirname, 'settings.html'));
}
```

### 2.6 Test Settings Flow

1. Start the app: `pnpm start`
2. Click settings icon in HUD
3. Enter Wispr API key
4. Click "Test Connection"
5. Add custom commands
6. Verify settings persist across restarts

---

## Phase 3: Homebrew Distribution

**Timeline**: 1 week  
**Goal**: Set up Homebrew tap and publish formula

### 3.1 Create Homebrew Tap Repository

See `HOMEBREW_SETUP.md` for detailed instructions.

Quick summary:

```bash
# Create new GitHub repo: homebrew-saycast
git clone https://github.com/yourusername/homebrew-saycast.git
cd homebrew-saycast

# Add Formula file
mkdir -p Formula
# Edit Formula/saycast.rb (template provided in HOMEBREW_SETUP.md)

git add .
git commit -m "Initial commit: Add sayCast formula"
git push
```

### 3.2 Test Tap Locally

```bash
brew tap yourusername/homebrew-saycast /path/to/local/tap
brew install --build-from-source saycast
```

### 3.3 Publish Formula

Push to GitHub:

```bash
git push origin main
```

### 3.4 Verify Public Installation

Test that users can install via:

```bash
brew tap yourusername/homebrew-saycast
brew install saycast
```

---

## Phase 4: Release & Distribution

**Timeline**: Ongoing  
**Goal**: Publish v1.0.0 and maintain regular updates

### 4.1 Pre-Release Checklist

- [ ] All tests passing: `pnpm lint && pnpm build`
- [ ] No console errors or warnings
- [ ] Microphone + accessibility permissions work
- [ ] API key configuration works
- [ ] Custom commands configuration works
- [ ] Hotkey captures audio correctly
- [ ] Transcription works (Wispr)
- [ ] Command matching accurate
- [ ] Command execution works
- [ ] HUD displays properly
- [ ] Auto-start via LaunchAgent works
- [ ] Settings persist correctly
- [ ] Documentation complete

### 4.2 Update Documentation

- [ ] README.md - Installation & usage
- [ ] FAQ.md - Common questions
- [ ] TROUBLESHOOTING.md - Common issues
- [ ] DEVELOPMENT.md - For contributors

### 4.3 Create Release

```bash
# Update version
npm version minor  # v0.2.0 → v0.3.0

# Create and push tag
git tag v0.3.0
git push origin main --tags
```

This triggers GitHub Actions to:
1. Build universal binaries
2. Code sign and notarize
3. Create GitHub release with artifacts
4. Output instructions for Homebrew formula update

### 4.4 Update Homebrew Formula

Update `homebrew-saycast/Formula/saycast.rb`:

```ruby
url "https://github.com/yourusername/sayCast/releases/download/v0.3.0/sayCast-0.3.0-universal.tar.gz"
sha256 "<new_sha256>"
```

### 4.5 Announce Release

- Post on GitHub Discussions
- Share in relevant communities (Raycast, macOS dev forums)
- Create release notes

---

## Future Enhancements

### v1.5+: Auto-Updates with Sparkle

```bash
pnpm add electron-updater
```

Implement automatic update checks and installation via the HUD.

### v2.0: Advanced Features

- Multi-monitor support
- Command history & analytics dashboard
- Community command sharing platform
- Offline mode with local Whisper
- App Store availability
- Integration with more voice backends

---

## Deployment Checklist for Each Release

Use this checklist for every new release:

```markdown
## Release v1.0.0

### Code
- [ ] Bump version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Run tests: `pnpm test`
- [ ] Run linter: `pnpm lint`
- [ ] Commit changes

### Build & Sign
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] Wait for GitHub Actions to complete
- [ ] Verify artifacts are created and signed

### Homebrew
- [ ] Update `homebrew-saycast` formula with new URL and SHA256
- [ ] Test locally: `brew install yourusername/homebrew-saycast/saycast`
- [ ] Verify installation works

### Distribution
- [ ] Create GitHub release notes
- [ ] Add artifacts to release
- [ ] Link to documentation
- [ ] Test public installation: `brew tap && brew install`

### Announce
- [ ] GitHub release announcement
- [ ] Update website
- [ ] Share in communities
```

---

## Support & Maintenance

### Monitoring

Track:
- GitHub issue reports
- Installation failures
- Feature requests
- Community feedback

### Update Cadence

- **Critical bugs**: Release immediately
- **Minor fixes**: Weekly or bi-weekly
- **Features**: Monthly or quarterly
- **Major versions**: As needed (6-12 months)

### Version Support

- Maintain latest version
- Support previous minor version (e.g., v1.2.x when v1.3.x is out)
- Provide deprecation notices before dropping old OS support

---

## Questions?

Refer to:
- `.productionalization.md` - Detailed plan
- `HOMEBREW_SETUP.md` - Homebrew-specific instructions
- GitHub Actions workflow - `.github/workflows/build-and-release.yml`

