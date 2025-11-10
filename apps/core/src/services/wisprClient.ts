import WebSocket from "ws";
import { logger } from "../logger";

interface WisprClientOptions {
  apiKey: string;
}

export class WisprClient {
  private socket: WebSocket | null = null;
  private isReady = false;

  constructor(private readonly options: WisprClientOptions) {}

  async connect(): Promise<void> {
    if (!this.options.apiKey) {
      logger.warn("Wispr API key missing; speech streaming disabled for now");
      return;
    }

    if (this.isReady) {
      return;
    }

    const url = `wss://platform-api.wisprflow.ai/api/v1/dash/ws?api_key=Bearer%20${this.options.apiKey}`;
    logger.debug({ url }, "Connecting to Wispr Flow");
    this.socket = new WebSocket(url);

    await new Promise<void>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not initialized"));
        return;
      }

      this.socket.once("open", () => {
        this.isReady = true;
        logger.info("Wispr WebSocket connected");
        resolve();
      });
      this.socket.once("error", (err) => {
        logger.error({ err }, "Wispr socket error");
        reject(err);
      });
    });
  }

  async close(): Promise<void> {
    if (!this.socket) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.socket?.once("close", () => resolve());
      this.socket?.close();
    });
    this.socket = null;
    this.isReady = false;
  }
}
