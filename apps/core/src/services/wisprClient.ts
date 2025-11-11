import EventEmitter from "eventemitter3";
import WebSocket from "ws";
import type { HelperAudioChunk, WisprClientEvents } from "@saycast/types";
import { logger } from "../logger";

interface WisprClientOptions {
  apiKey: string;
}

interface StartSessionOptions {
  dictionaryContext?: string[];
}

export class WisprClient extends EventEmitter<WisprClientEvents> {
  private socket: WebSocket | null = null;
  private isReady = false;
  private sessionActive = false;
  private packetsSent = 0;

  constructor(private readonly options: WisprClientOptions) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.options.apiKey);
  }

  async connect(): Promise<void> {
    if (!this.enabled) {
      logger.warn("Wispr API key missing; speech streaming disabled for now");
      return;
    }

    if (this.isReady && this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const url = `wss://platform-api.wisprflow.ai/api/v1/dash/ws?api_key=Bearer%20${this.options.apiKey}`;
    logger.debug({ url }, "Connecting to Wispr Flow");
    this.socket = new WebSocket(url);

    this.socket.on("message", (data) => this.handleMessage(data.toString()));
    this.socket.on("error", (err) => {
      logger.error({ err }, "Wispr socket error");
      this.isReady = false;
    });
    this.socket.on("close", () => {
      logger.warn("Wispr socket closed");
      this.isReady = false;
      this.sessionActive = false;
    });

    await new Promise<void>((resolve, reject) => {
      this.socket?.once("open", () => {
        this.isReady = true;
        logger.info("Wispr WebSocket connected");
        resolve();
      });
      this.socket?.once("error", (err) => {
        logger.error({ err }, "Wispr socket error during connect");
        reject(err);
      });
    });
  }

  async startSession(options: StartSessionOptions = {}): Promise<void> {
    if (!this.enabled) {
      return;
    }
    if (!this.isReady || !this.socket) {
      await this.connect();
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Wispr socket not open");
    }

    const payload = {
      type: "auth",
      access_token: this.options.apiKey,
      language: ["en"],
      context: {
        dictionary_context: options.dictionaryContext ?? []
      }
    };

    this.socket.send(JSON.stringify(payload));
    this.sessionActive = true;
    this.packetsSent = 0;
  }

  appendChunk(chunk: HelperAudioChunk): void {
    if (!this.sessionActive || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: "append",
      position: this.packetsSent,
      audio_packets: {
        packets: [chunk.data],
        volumes: [1],
        packet_duration: chunk.packetDuration,
        audio_encoding: "pcm_s16le",
        byte_encoding: "base64",
        sample_rate: chunk.sampleRate
      }
    };

    this.socket.send(JSON.stringify(message));
    this.packetsSent += 1;
  }

  commit(): void {
    if (!this.sessionActive || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = {
      type: "commit",
      total_packets: this.packetsSent
    };
    this.socket.send(JSON.stringify(payload));
    this.sessionActive = false;
  }

  private handleMessage(raw: string) {
    try {
      const data = JSON.parse(raw);
      if (data.status === "auth") {
        this.emit("auth");
      } else if (data.status === "text") {
        const text = data.body?.text ?? "";
        if (data.final) {
          this.emit("final", text);
        } else {
          this.emit("partial", text);
        }
      } else if (data.status === "error") {
        const error = new Error(data.message ?? "Wispr error");
        this.emit("error", error);
      }
    } catch (error) {
      logger.error({ raw, err: error }, "Failed to parse Wispr message");
    }
  }
}
