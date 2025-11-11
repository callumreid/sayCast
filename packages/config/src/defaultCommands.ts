import path from "node:path";
import type { VoiceCommandDefinition } from "@saycast/types";

export const buildDefaultCommands = (scriptsDir: string): VoiceCommandDefinition[] => {
  const resolveScript = (filename: string) => path.join(scriptsDir, filename);

  return [
    {
      id: "window-left-half",
      phrases: ["left half", "snap left", "window left"],
      tags: ["window", "raycast"],
      kind: "raycast-cli",
      target: "window-management.left-half",
      description: "Snap active window to the left half of the display"
    },
    {
      id: "window-right-half",
      phrases: ["right half", "snap right", "window right"],
      tags: ["window", "raycast"],
      kind: "raycast-cli",
      target: "window-management.right-half",
      description: "Snap active window to the right half of the display"
    },
    {
      id: "window-maximize",
      phrases: ["full screen", "maximize window", "make it big"],
      tags: ["window", "raycast"],
      kind: "raycast-cli",
      target: "window-management.maximize",
      description: "Maximize the active window"
    },
    {
      id: "incognito-chrome",
      phrases: ["incognito", "open incognito", "incognito chrome"],
      tags: ["custom", "browser"],
      kind: "script",
      target: resolveScript("incognito-chrome.sh"),
      description: "Launch Chrome incognito pointed at localhost:5173"
    },
    {
      id: "quicktime-recording",
      phrases: ["quicktime", "start recording", "movie recording"],
      tags: ["custom", "media"],
      kind: "script",
      target: resolveScript("quicktime-recording.sh"),
      description: "Start a new QuickTime movie recording via AppleScript"
    },
    {
      id: "transcribe-media",
      phrases: ["transcribe", "run whisper", "transcription"],
      tags: ["custom", "media"],
      kind: "script",
      target: resolveScript("transcribe.sh"),
      description: "Transcribe audio/video file via Whisper CLI"
    },
    {
      id: "saycast-test",
      phrases: ["say cast test", "saycast test", "run test"],
      tags: ["custom", "test"],
      kind: "script",
      target: resolveScript("sayCastTest.sh"),
      description: "Test command for verifying sayCast voice pipeline"
    }
  ];
};
