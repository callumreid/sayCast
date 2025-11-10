import readline from "node:readline";
import type { RuntimeConfig } from "@saycast/types";
import { logger } from "../logger";
import { CommandMatcher } from "./commandMatcher";
import { RaycastRunner } from "./raycastRunner";

export class DevHarness {
  constructor(
    private readonly matcher: CommandMatcher,
    private readonly runner: RaycastRunner,
    private readonly config: RuntimeConfig
  ) {}

  start() {
    logger.info(
      {
        commands: this.config.commands.length,
        scriptsDir: this.config.raycastScriptsDir,
        dryRun: process.env.SAYCAST_DRY_RUN === "1"
      },
      "sayCast core dev harness ready. Type simulated transcripts to test matching."
    );

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.setPrompt("sayCast> ");
    rl.prompt();

    rl.on("line", async (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        rl.prompt();
        return;
      }

      if (trimmed === "exit" || trimmed === "quit") {
        rl.close();
        return;
      }

      const match = this.matcher.match(trimmed);
      if (!match) {
        logger.warn({ utterance: trimmed }, "No command match");
        rl.prompt();
        return;
      }

      logger.info({ match: match.command.id, score: match.score }, "Matched command");
      try {
        await this.runner.run(match.command);
        logger.info({ command: match.command.id }, "Command execution complete");
      } catch (error) {
        logger.error({ err: error }, "Command execution failed");
      } finally {
        rl.prompt();
      }
    });

    rl.on("close", () => {
      logger.info("Dev harness exiting");
      process.exit(0);
    });
  }
}
