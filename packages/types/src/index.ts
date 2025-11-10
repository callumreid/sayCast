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
}

export interface WisprAppendPacket {
  audio: string; // base64 encoded PCM16 chunk
  position: number;
  durationSec: number;
}

export type WisprSessionEvent =
  | { type: "auth" }
  | { type: "partial"; text: string }
  | { type: "final"; text: string }
  | { type: "error"; error: Error };
