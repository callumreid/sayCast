import { WebSocketServer, WebSocket } from "ws";
import type { HudMessage } from "@saycast/types";
import { logger } from "../logger";

interface HudServerOptions {
  port?: number;
}

export class HudServer {
  private wss: WebSocketServer | null = null;
  private readonly port: number;

  constructor(options: HudServerOptions = {}) {
    this.port = options.port ?? Number(process.env.SAYCAST_HUD_PORT ?? 48123);
  }

  start() {
    if (this.wss) {
      return;
    }
    this.wss = new WebSocketServer({ port: this.port });
    this.wss.on("connection", (socket) => {
      logger.info({ port: this.port }, "HUD connected");
      socket.on("close", () => logger.info("HUD disconnected"));
      socket.on("error", (err) => logger.warn({ err }, "HUD socket error"));
    });
    this.wss.on("listening", () => logger.info({ port: this.port }, "HUD ws server listening"));
    this.wss.on("error", (err) => logger.error({ err }, "HUD ws server error"));
  }

  broadcast(message: HudMessage) {
    if (!this.wss) {
      return;
    }
    const payload = JSON.stringify(message);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  stop() {
    if (!this.wss) {
      return;
    }
    this.wss.close(() => logger.info("HUD ws server closed"));
    this.wss = null;
  }
}
