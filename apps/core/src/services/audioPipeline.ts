import EventEmitter from "eventemitter3";
import type { HelperAudioChunk } from "@saycast/types";

interface AudioPipelineEvents {
  chunk: (chunk: HelperAudioChunk & { sequence: number }) => void;
  reset: () => void;
}

export class AudioPipeline extends EventEmitter<AudioPipelineEvents> {
  private active = false;
  private sequence = 0;

  start() {
    this.active = true;
    this.sequence = 0;
    this.emit("reset");
  }

  stop() {
    this.active = false;
  }

  push(chunk: HelperAudioChunk) {
    if (!this.active) {
      return;
    }
    const seq = this.sequence++;
    this.emit("chunk", { ...chunk, sequence: seq });
  }
}
