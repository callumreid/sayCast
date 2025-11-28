cask "saycast" do
  version "0.1.0"
  sha256 :no_check  # Update this with actual SHA256 after first release

  url "https://github.com/callumreid/sayCast/releases/download/v#{version}/sayCast-#{version}-arm64.dmg"
  name "sayCast"
  desc "Voice commands for your Mac"
  homepage "https://github.com/callumreid/sayCast"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: ">= :monterey"

  app "sayCast.app"

  postflight do
    system "xattr", "-cr", "#{appdir}/sayCast.app"
  end

  zap trash: [
    "~/Library/Application Support/sayCast",
    "~/Library/Logs/sayCast",
    "~/Library/Preferences/com.callumreid.saycast.plist",
  ]

  caveats <<~EOS
    sayCast requires the following permissions:
    - Accessibility (for hotkey detection)
    - Microphone (for voice capture)

    You will be prompted to grant these on first launch.
    
    Also requires a Wispr Flow API key for voice transcription.
    Get one at: https://wisprflow.ai
  EOS
end
