import { access } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import { execa } from "execa";
import type { VoiceCommandDefinition } from "@saycast/types";
import { logger } from "../logger";

export class RaycastRunner {
  private readonly dryRun = process.env.SAYCAST_DRY_RUN === "1";
  private raycastBinary: string | null = process.env.RAYCAST_CLI_PATH ?? null;

  async run(command: VoiceCommandDefinition): Promise<void> {
    if (this.dryRun) {
      logger.info({ command: command.id }, "[dry-run] Would execute command");
      return;
    }

    logger.info({ command: command.id }, "Executing command");

    switch (command.kind) {
      case "raycast-cli":
        await this.runRaycastCommand(command.target, command.args ?? {});
        break;
      case "script":
        await this.runScript(command.target);
        break;
      case "applescript":
        await this.runAppleScript(command.target);
        break;
      default:
        logger.warn({ command }, "Unknown command kind");
    }
  }

  private async runRaycastCommand(target: string, args: Record<string, string>): Promise<void> {
    const binary = await this.resolveRaycastBinary();

    const cliArgs = ["run", target];
    for (const [key, value] of Object.entries(args)) {
      cliArgs.push(`--${key}`, value);
    }

    await execa(binary, cliArgs, { stdio: "inherit" });
  }

  private async runScript(scriptPath: string): Promise<void> {
    await access(scriptPath, constants.X_OK);
    await execa(scriptPath, { stdio: "inherit" });
  }

  private async runAppleScript(scriptPath: string): Promise<void> {
    await access(scriptPath, constants.R_OK);
    await execa("osascript", [scriptPath], { stdio: "inherit" });
  }

  private async resolveRaycastBinary(): Promise<string> {
    if (this.raycastBinary && existsSync(this.raycastBinary)) {
      return this.raycastBinary;
    }

    const candidates = [
      this.raycastBinary,
      "/usr/local/bin/raycast",
      "/opt/homebrew/bin/raycast",
      path.join(process.env.HOME ?? "", ".local/bin/raycast"),
      "/Applications/Raycast.app/Contents/MacOS/raycast"
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (candidate && existsSync(candidate)) {
        this.raycastBinary = candidate;
        return candidate;
      }
    }

    throw new Error(
      "Raycast CLI not found. Install it via Raycast → Preferences → Advanced → Install Command Line Tool, or set RAYCAST_CLI_PATH to the binary."
    );
  }
}
