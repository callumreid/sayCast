import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import EventEmitter from "eventemitter3";
import { logger } from "../logger";

export type HelperEventType = "startListening" | "stopListening" | "heartbeat" | "error" | "audioChunk";

export interface HelperEvent {
  type: HelperEventType;
  timestamp: number;
  message?: string;
  payload?: {
    data: string;
    packetDuration: number;
    sampleRate: number;
  };
}

interface NativeBridgeEvents {
  event: (event: HelperEvent) => void;
  exit: (code: number | null) => void;
}

export class NativeBridge extends EventEmitter<NativeBridgeEvents> {
  private child: ReturnType<typeof spawn> | null = null;
  private buffer = "";

  start(helperPath = this.defaultHelperPath()) {
    if (this.child) {
      logger.warn("Native helper already running");
      return;
    }

    logger.info({ helperPath }, "Starting native helper");
    try {
      this.child = spawn(helperPath, [], { stdio: ["ignore", "pipe", "pipe"] });
      this.child.stdout?.setEncoding("utf8");
      this.child.stdout?.on("data", (chunk: string) => this.handleStdout(chunk));
      this.child.stderr?.on("data", (chunk) => {
        logger.warn({ helper: chunk.toString().trim() }, "native helper stderr");
      });
      this.child.on("close", (code) => {
        logger.warn({ code }, "native helper exited");
        this.emit("exit", code);
        this.child = null;
        this.buffer = "";
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to start native helper");
    }
  }

  stop() {
    this.child?.kill();
    this.child = null;
    this.buffer = "";
  }

  private defaultHelperPath(): string {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(__dirname, "../../../native-helper/.build/debug/SayCastNativeHelper");
  }

  private handleStdout(chunk: string) {
    this.buffer += chunk;
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (!line) continue;
      try {
        const parsed = JSON.parse(line) as HelperEvent;
        this.emit("event", parsed);
      } catch (error) {
        logger.error({ line, err: error }, "Failed to parse native helper line");
      }
    }
  }
}
