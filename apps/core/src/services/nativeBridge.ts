import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { logger } from "../logger";

export class NativeBridge {
  private child: ReturnType<typeof spawn> | null = null;

  start(helperPath = this.defaultHelperPath()) {
    logger.info({ helperPath }, "Starting native helper (placeholder)");
    try {
      this.child = spawn(helperPath, [], { stdio: ["ignore", "pipe", "pipe"] });
      this.child.stdout?.on("data", (chunk) => {
        logger.debug({ helper: chunk.toString().trim() }, "native helper stdout");
      });
      this.child.stderr?.on("data", (chunk) => {
        logger.warn({ helper: chunk.toString().trim() }, "native helper stderr");
      });
      this.child.on("close", (code) => {
        logger.warn({ code }, "native helper exited");
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to start native helper");
    }
  }

  stop() {
    this.child?.kill();
    this.child = null;
  }

  private defaultHelperPath(): string {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(__dirname, "../../../apps/native-helper/.build/debug/SayCastNativeHelper");
  }
}
