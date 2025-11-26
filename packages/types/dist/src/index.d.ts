export type ExecutionKind = "raycast-cli" | "script" | "applescript";
export interface VoiceCommandDefinition {
    /** Unique identifier (slug) for matching + logging */
    id: string;
    /** Spoken phrases/synonyms giving this command high priority */
    phrases: string[];
    /** Optional tags for grouping (e.g., window, media, custom) */
    tags?: string[];
    /** Execution strategy */
    kind: ExecutionKind;
    /** Optional match strategy (exact vs prefix for arg capture) */
    matchType?: "exact" | "prefix";
    /** Target command (Raycast command ID, script path, etc.) */
    target: string;
    /** Optional constant arguments to pass along */
    args?: Record<string, string>;
    /** Friendly description for HUD/logging */
    description?: string;
}
export interface RuntimeConfig {
    wisprApiKey: string;
    openAIApiKey?: string;
    raycastScriptsDir: string;
    commands: VoiceCommandDefinition[];
    customDictionary?: string[];
}
export interface WisprAppendPacket {
    audio: string;
    position: number;
    durationSec: number;
}
export interface WisprClientEvents {
    auth: () => void;
    partial: (text: string) => void;
    final: (text: string) => void;
    error: (error: Error) => void;
}
export interface HelperAudioChunk {
    data: string;
    packetDuration: number;
    sampleRate: number;
}
export type HudMessage = {
    type: "state";
    state: string;
    source?: string;
} | {
    type: "transcript";
    text: string;
    final: boolean;
} | {
    type: "command";
    status: "matched" | "executed" | "failed";
    commandId?: string;
    text?: string;
} | {
    type: "error";
    message: string;
} | {
    type: "listening";
    active: boolean;
};
