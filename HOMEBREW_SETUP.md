# Homebrew Tap Setup for sayCast

## One-Time Setup

### 1. Create a New Repository for Your Tap

On GitHub, create a new repository with the following naming convention:
```
homebrew-saycast
```

The name MUST follow the pattern `homebrew-{name}` for Homebrew to recognize it as a tap.

### 2. Clone and Initialize the Tap Repository

```bash
mkdir homebrew-saycast
cd homebrew-saycast
git init
git config user.email "your-email@example.com"
git config user.name "Your Name"
```

### 3. Create the Formula Structure

```bash
mkdir -p Formula
touch Formula/saycast.rb
```

### 4. Add the Formula File

Create `Formula/saycast.rb` with the following content:

```ruby
class Saycast < Formula
  desc "Voice-triggered Raycast commands with speech recognition on macOS"
  homepage "https://github.com/yourusername/sayCast"
  url "https://github.com/yourusername/sayCast/releases/download/v0.2.0/sayCast-0.2.0-universal.tar.gz"
  sha256 "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
  license "MIT"

  depends_on :macos => ">= 12"
  depends_on "raycast"
  
  def install
    # Copy binary files
    bin.install "saycast-#{version}/bin/SayCastNativeHelper" => "saycast-native-helper"
    bin.install "saycast-#{version}/main.js" => "saycast-hud"
    
    # Create wrapper script for the core service
    (bin/"saycast").write_env_script libexec/"saycast.sh",
      :PATH => "#{libexec}:$PATH"
    
    # Copy application files
    libexec.install "saycast-#{version}/core"
    libexec.install "saycast-#{version}/hud"
    
    # Install LaunchAgent for auto-start
    plist_path = "#{ENV['HOME']}/Library/LaunchAgents/com.saycast.agent.plist"
    plist = <<~EOS
      <?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
      <plist version="1.0">
      <dict>
        <key>Label</key>
        <string>com.saycast.agent</string>
        <key>Program</key>
        <string>#{libexec}/saycast.sh</string>
        <key>RunAtLoad</key>
        <true/>
        <key>KeepAlive</key>
        <true/>
      </dict>
      </plist>
    EOS
    
    IO.write(plist_path, plist)
  end
  
  def caveats
    <<~EOS
      sayCast has been installed!
      
      First run setup:
      1. Grant microphone and accessibility permissions when prompted
      2. Configure your Wispr/OpenAI API keys via the settings UI
      3. Start sayCast with: saycast
      
      sayCast will auto-start on login via LaunchAgent.
      
      To disable auto-start:
      launchctl unload ~/Library/LaunchAgents/com.saycast.agent.plist
      
      To view logs:
      tail -f ~/Library/Logs/sayCast/main.log
    EOS
  end
  
  test do
    # Simple test to verify installation
    assert_predicate bin/"saycast-native-helper", :exist?
  end
end
```

### 5. Create Supporting Files

Create `README.md` in the tap repo:

```markdown
# Homebrew Saycast Tap

A Homebrew tap for [sayCast](https://github.com/yourusername/sayCast).

## Installation

```bash
brew tap yourusername/homebrew-saycast
brew install saycast
```

## Usage

Hold `Control + Option + S` and speak commands like:
- "left half"
- "maximize window"
- "quicktime recording"

## Configuration

Edit your command mappings and API keys via the sayCast settings UI.

## Uninstall

```bash
brew uninstall saycast
brew untap yourusername/homebrew-saycast
```
```

### 6. Commit and Push

```bash
git add Formula/saycast.rb README.md
git commit -m "Initial commit: Add sayCast formula"
git remote add origin https://github.com/yourusername/homebrew-saycast.git
git branch -M main
git push -u origin main
```

---

## Automated Formula Updates

The GitHub Actions workflow (`.github/workflows/build-and-release.yml`) will output the necessary information to update the formula.

When you create a new release with a git tag (`v0.2.0`), the workflow will:
1. Build and create a release on GitHub
2. Output the download URL and SHA256 hash
3. You can then update `Formula/saycast.rb` in the tap repo with:
   ```ruby
   url "https://github.com/yourusername/sayCast/releases/download/v0.2.0/sayCast-0.2.0-universal.tar.gz"
   sha256 "actual_sha256_hash_here"
   ```

### Automatic Formula Updates (Future)

To fully automate this, you can:
1. Give the GitHub Actions workflow permission to push to the tap repo
2. Add a final step to the workflow that commits and pushes the updated formula

Example additional step for `.github/workflows/build-and-release.yml`:

```yaml
      - name: Update Homebrew Formula (Automated)
        if: startsWith(github.ref, 'refs/tags/v')
        run: |
          # Requires HOMEBREW_TAP_TOKEN secret
          git clone https://${{ secrets.HOMEBREW_TAP_TOKEN }}@github.com/yourusername/homebrew-saycast.git tap-repo
          
          DOWNLOAD_URL="https://github.com/${{ github.repository }}/releases/download/${{ github.ref_name }}/sayCast-${{ steps.version.outputs.VERSION }}-universal.tar.gz"
          SHA256=$(shasum -a 256 dist/sayCast-${{ steps.version.outputs.VERSION }}-universal.tar.gz | awk '{print $1}')
          
          # Update the formula
          sed -i '' "s|url .*|url \"$DOWNLOAD_URL\"|" tap-repo/Formula/saycast.rb
          sed -i '' "s|sha256 .*|sha256 \"$SHA256\"|" tap-repo/Formula/saycast.rb
          
          cd tap-repo
          git config user.email "action@github.com"
          git config user.name "GitHub Action"
          git add Formula/saycast.rb
          git commit -m "Update sayCast to ${{ github.ref_name }}"
          git push
```

For this, you'll need to:
1. Create a GitHub Personal Access Token (PAT) with `repo` scope
2. Add it as a secret `HOMEBREW_TAP_TOKEN` in the main repo

---

## Verifying Your Tap

Once published, users can verify your tap works:

```bash
brew tap yourusername/homebrew-saycast
brew tap-info yourusername/homebrew-saycast
brew search saycast
brew install saycast
```

---

## Testing Locally

Before publishing, you can test locally:

```bash
# Validate the formula
brew audit Formula/saycast.rb

# Install from local tap
brew install --build-from-source ./Formula/saycast.rb
```

---

## Troubleshooting

### Formula not found
- Ensure the tap repo is named `homebrew-{name}`
- Ensure `Formula/` directory exists
- Ensure the formula file is named `saycast.rb`

### Installation fails
- Check that the download URL is correct and accessible
- Verify the SHA256 hash matches
- Check permissions on the formula file

### Users can't install
- Make the tap repo public on GitHub
- Verify the releases are public on the main repo
- Test the tap yourself first

