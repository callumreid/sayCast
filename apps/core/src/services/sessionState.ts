import EventEmitter from "eventemitter3";
import type { HelperEvent } from "./nativeBridge";

export type SessionState = "idle" | "listening" | "transcribing" | "executing";

type SessionStateEvents = {
  stateChange: (state: SessionState, previous: SessionState) => void;
  listeningStarted: (source: "native" | "cli") => void;
  listeningStopped: (source: "native" | "cli") => void;
};

export class SessionStateMachine extends EventEmitter<SessionStateEvents> {
  private state: SessionState = "idle";

  get current(): SessionState {
    return this.state;
  }

  startListening(source: "native" | "cli") {
    if (this.state === "listening") {
      return;
    }
    this.transition("listening");
    this.emit("listeningStarted", source);
  }

  stopListening(source: "native" | "cli") {
    if (this.state !== "listening") {
      return;
    }
    this.transition("idle");
    this.emit("listeningStopped", source);
  }

  handleHelperEvent(event: HelperEvent) {
    switch (event.type) {
      case "startListening":
        this.startListening("native");
        break;
      case "stopListening":
        this.stopListening("native");
        break;
      default:
        break;
    }
  }

  private transition(next: SessionState) {
    if (next === this.state) {
      return;
    }
    const previous = this.state;
    this.state = next;
    this.emit("stateChange", next, previous);
  }
}
