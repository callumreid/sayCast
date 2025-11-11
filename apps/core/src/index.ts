import { loadRuntimeConfig } from "@saycast/config";
import { logger } from "./logger";
import { CommandMatcher } from "./services/commandMatcher";
import { RaycastRunner } from "./services/raycastRunner";
import { DevHarness } from "./services/devHarness";
import { WisprClient } from "./services/wisprClient";
import { NativeBridge } from "./services/nativeBridge";
import { SessionStateMachine } from "./services/sessionState";
import { AudioPipeline } from "./services/audioPipeline";
import { HudServer } from "./services/hudServer";

async function bootstrap() {
  const config = loadRuntimeConfig();
  const matcher = new CommandMatcher(config.commands);
  const runner = new RaycastRunner();
  const wispr = new WisprClient({ apiKey: config.wisprApiKey });
  const nativeBridge = new NativeBridge();
  const session = new SessionStateMachine();
  const audioPipeline = new AudioPipeline();
  const hud = new HudServer();
  const dictionaryContext = config.commands.flatMap((command) => command.phrases);
  let lastExecutedTranscript = "";

  try {
    await wispr.connect();
  } catch (error) {
    logger.warn({ err: error }, "Unable to connect to Wispr at startup (ok in dev harness)");
  }

  wispr.on("partial", (text) => {
    logger.debug({ text }, "Wispr partial transcript");
    hud.broadcast({ type: "transcript", text, final: false });
  });
  wispr.on("final", (text) => {
    logger.info({ text }, "Wispr final transcript");
    hud.broadcast({ type: "transcript", text, final: true });
    handleTranscript(text).catch((error) => {
      logger.error({ err: error }, "Error handling transcript");
      hud.broadcast({ type: "error", message: error instanceof Error ? error.message : String(error) });
    });
  });
  wispr.on("error", (error) => {
    logger.error({ err: error }, "Wispr stream error");
    hud.broadcast({ type: "error", message: error.message });
  });

  const harness = new DevHarness(matcher, runner, config);
  harness.start();
  hud.start();

  session.on("stateChange", (state, prev) => {
    logger.info({ from: prev, to: state }, "Session state change");
    hud.broadcast({ type: "state", state });
  });

  session.on("listeningStarted", (source) => {
    logger.info({ source }, "Listening started");
    hud.broadcast({ type: "listening", active: true });
    audioPipeline.start();
    lastExecutedTranscript = "";
    if (wispr.enabled) {
      wispr.startSession({ dictionaryContext }).catch((error) => {
        logger.error({ err: error }, "Failed to start Wispr session");
      });
    }
  });

  session.on("listeningStopped", (source) => {
    logger.info({ source }, "Listening stopped");
    hud.broadcast({ type: "listening", active: false });
    audioPipeline.stop();
    if (wispr.enabled) {
      wispr.commit();
    }
  });

  nativeBridge.on("event", (event) => {
    if (event.type === "error") {
      logger.error({ message: event.message }, "Native helper error");
      return;
    }
    if (event.type === "audioChunk" && event.payload) {
      audioPipeline.push(event.payload);
      logger.debug({ duration: event.payload.packetDuration }, "Received audio chunk");
      return;
    }
    session.handleHelperEvent(event);
  });

  nativeBridge.on("exit", (code) => {
    logger.warn({ code }, "Native helper exited");
  });

  audioPipeline.on("chunk", (chunk) => {
    if (!wispr.enabled) {
      return;
    }
    wispr.appendChunk({
      data: chunk.data,
      packetDuration: chunk.packetDuration,
      sampleRate: chunk.sampleRate
    });
  });

  const handleTranscript = async (text: string) => {
    const normalized = text.trim();
    if (!normalized) {
      return;
    }
    if (normalized === lastExecutedTranscript) {
      return;
    }
    lastExecutedTranscript = normalized;

    const match = matcher.match(normalized);
    if (!match) {
      logger.warn({ transcript: normalized }, "No command matched transcript");
      return;
    }

    logger.info({ transcript: normalized, command: match.command.id }, "Executing command from voice transcript");
    hud.broadcast({ type: "command", status: "matched", commandId: match.command.id, text: normalized });

    try {
      await runner.run(match.command);
      hud.broadcast({ type: "command", status: "executed", commandId: match.command.id, text: normalized });
    } catch (error) {
      logger.error({ err: error, command: match.command.id }, "Failed to execute command from transcript");
      hud.broadcast({ type: "command", status: "failed", commandId: match.command.id });
    }
  };

  if (process.env.START_NATIVE_HELPER === "1") {
    nativeBridge.start();
  }

  const shutdown = async () => {
    logger.info("Shutting down sayCast core…");
    hud.broadcast({ type: "state", state: "shutting-down" });
    hud.stop();
    nativeBridge.stop();
    await wispr.close().catch((error) => {
      logger.warn({ err: error }, "Failed to close Wispr socket");
    });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  logger.error({ err: error }, "sayCast core failed to start");
  process.exit(1);
});
