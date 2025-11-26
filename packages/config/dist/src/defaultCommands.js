import path from "node:path";
export const buildDefaultCommands = (scriptsDir) => {
    const resolveScript = (filename) => path.join(scriptsDir, filename);
    return [
        {
            id: "window-left-half",
            phrases: ["left half", "snap left", "window left"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-left-half.sh"),
            description: "Snap active window to the left half of the display"
        },
        {
            id: "window-right-half",
            phrases: ["right half", "snap right", "window right"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-right-half.sh"),
            description: "Snap active window to the right half of the display"
        },
        {
            id: "window-maximize",
            phrases: ["full screen", "maximize window", "make it big"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-maximize.sh"),
            description: "Maximize the active window"
        },
        {
            id: "window-center-third",
            phrases: ["center third", "middle third", "center column"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-center-third.sh"),
            description: "Place window in the center third of the display"
        },
        {
            id: "window-left-third",
            phrases: ["left third", "one third left"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-left-third.sh"),
            description: "Place window in the leftmost third"
        },
        {
            id: "window-right-third",
            phrases: ["right third", "one third right"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-right-third.sh"),
            description: "Place window in the rightmost third"
        },
        {
            id: "window-top-half",
            phrases: ["top half", "upper half"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-top-half.sh"),
            description: "Place window in the top half"
        },
        {
            id: "window-bottom-half",
            phrases: ["bottom half", "lower half"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-bottom-half.sh"),
            description: "Place window in the bottom half"
        },
        {
            id: "window-larger",
            phrases: ["window larger", "increase window", "grow window"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-larger.sh"),
            description: "Increase window size by 15% (clamped to screen)"
        },
        {
            id: "window-smaller",
            phrases: ["window smaller", "shrink window", "decrease window"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-smaller.sh"),
            description: "Decrease window size by 15%"
        },
        {
            id: "window-close",
            phrases: ["close window", "dismiss window"],
            tags: ["window", "raycast"],
            kind: "script",
            target: resolveScript("window-close.sh"),
            description: "Close the frontmost window"
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
        },
        {
            id: "open-repo",
            phrases: ["open repo", "go to repo"],
            matchType: "prefix",
            tags: ["custom", "dev"],
            kind: "script",
            target: resolveScript("open-repo.sh"),
            description: "Open a repository in iTerm"
        },
        {
            id: "open-application",
            phrases: ["open application", "open app", "launch"],
            matchType: "prefix",
            tags: ["custom", "system"],
            kind: "script",
            target: resolveScript("open-app-maximized.sh"),
            description: "Open application and maximize it"
        },
        {
            id: "close-application",
            phrases: ["close application", "close app", "exit app", "quit app"],
            matchType: "prefix",
            tags: ["custom", "system"],
            kind: "script",
            target: resolveScript("close-app.sh"),
            description: "Close/Quit an application"
        }
    ];
};
