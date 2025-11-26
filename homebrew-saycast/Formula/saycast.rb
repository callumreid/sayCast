class Saycast < Formula
  desc "Voice-activated Raycast automation for macOS"
  homepage "https://github.com/yourusername/sayCast"
  url "https://github.com/yourusername/sayCast/releases/download/v0.1.0/sayCast-0.1.0-universal.tar.gz"
  sha256 "a3a4d33c771b68973a9a57b020438389533f4341447c745b6966df6b46e45aa5"
  license "MIT"
  version "0.1.0"

  depends_on macos: ">= :monterey"
  depends_on "raycast" => :cask

  def install
    release_dir = "sayCast-#{version}-universal"
    libexec.install Dir["#{release_dir}/*"]
    (bin/"saycast").write <<~EOS
      #!/bin/bash
      "#{libexec}/bin/saycast" "$@"
    EOS
    (bin/"saycast-native-helper").write <<~EOS
      #!/bin/bash
      "#{libexec}/bin/SayCastNativeHelper" "$@"
    EOS
  end

  def caveats
    <<~EOS
      Logs: ~/Library/Logs/sayCast
      Config: ~/Library/Application Support/sayCast
      Run sayCast with: saycast
    EOS
  end

  test do
    assert_predicate libexec/"bin/saycast", :exist?
    assert_predicate libexec/"bin/SayCastNativeHelper", :exist?
  end
end

