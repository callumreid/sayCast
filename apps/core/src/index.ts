import { loadRuntimeConfig } from "@saycast/config";
import { logger } from "./logger";
import { CommandMatcher } from "./services/commandMatcher";
import { RaycastRunner } from "./services/raycastRunner";
import { DevHarness } from "./services/devHarness";
import { WisprClient } from "./services/wisprClient";
import { NativeBridge } from "./services/nativeBridge";

async function bootstrap() {
  const config = loadRuntimeConfig();
  const matcher = new CommandMatcher(config.commands);
  const runner = new RaycastRunner();
  const wispr = new WisprClient({ apiKey: config.wisprApiKey });
  const nativeBridge = new NativeBridge();

  try {
    await wispr.connect();
  } catch (error) {
    logger.warn({ err: error }, "Unable to connect to Wispr at startup (ok in dev harness)");
  }

  if (process.env.START_NATIVE_HELPER === "1") {
    nativeBridge.start();
  }

  const harness = new DevHarness(matcher, runner, config);
  harness.start();
}

bootstrap().catch((error) => {
  logger.error({ err: error }, "sayCast core failed to start");
  process.exit(1);
});
