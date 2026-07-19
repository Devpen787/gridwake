import { applyRoomCommand } from "./room";
import type { RoomCommand, RoomState } from "./types";

const STORAGE_PREFIX = "gridwake:local-room:";
const CHANNEL_PREFIX = "gridwake:local-channel:";

type WireMessage =
  | Readonly<{ kind: "command"; senderId: string; command: RoomCommand }>
  | Readonly<{ kind: "state"; senderId: string; state: RoomState }>
  | Readonly<{ kind: "error"; senderId: string; targetId: string; message: string; state: RoomState }>
  | Readonly<{ kind: "request-state"; senderId: string }>;

export type LocalRoomListener = (state: RoomState) => void;
export type LocalRoomErrorListener = (message: string) => void;
type StripEnvelope<T> = T extends RoomCommand ? Omit<T, "id" | "actorId" | "baseSequence"> : never;
export type LocalRoomCommand = StripEnvelope<RoomCommand>;

function storageKey(code: string): string {
  return `${STORAGE_PREFIX}${code}`;
}

function readStoredRoom(code: string): RoomState | null {
  try {
    const raw = window.localStorage.getItem(storageKey(code));
    return raw ? JSON.parse(raw) as RoomState : null;
  } catch {
    return null;
  }
}

function writeStoredRoom(state: RoomState): void {
  window.localStorage.setItem(storageKey(state.code), JSON.stringify(state));
}

export function findLocalRoom(code: string): RoomState | null {
  return readStoredRoom(code);
}

export class LocalRoomSession {
  private state: RoomState;
  private readonly channel: BroadcastChannel;
  private readonly actorId: string;
  private readonly onState: LocalRoomListener;
  private readonly onError: LocalRoomErrorListener;

  constructor(input: Readonly<{
    actorId: string;
    initialState: RoomState;
    onState: LocalRoomListener;
    onError: LocalRoomErrorListener;
  }>) {
    this.actorId = input.actorId;
    this.state = input.initialState;
    this.onState = input.onState;
    this.onError = input.onError;
    this.channel = new BroadcastChannel(`${CHANNEL_PREFIX}${this.state.code}`);
    this.channel.addEventListener("message", this.handleMessage);

    if (this.isHost()) {
      writeStoredRoom(this.state);
      this.publishState();
    } else {
      this.channel.postMessage({ kind: "request-state", senderId: this.actorId } satisfies WireMessage);
    }
  }

  private isHost(): boolean {
    return this.state.hostId === this.actorId;
  }

  private publishState(): void {
    this.onState(this.state);
    this.channel.postMessage({ kind: "state", senderId: this.actorId, state: this.state } satisfies WireMessage);
  }

  private handleMessage = (event: MessageEvent<WireMessage>): void => {
    const message = event.data;
    if (!message || message.senderId === this.actorId) return;

    if (message.kind === "request-state" && this.isHost()) {
      this.publishState();
      return;
    }

    if (message.kind === "state") {
      if (message.state.code !== this.state.code || message.state.sequence < this.state.sequence) return;
      this.state = message.state;
      this.onState(this.state);
      return;
    }

    if (message.kind === "error" && message.targetId === this.actorId) {
      this.state = message.state;
      this.onState(this.state);
      this.onError(message.message);
      return;
    }

    if (message.kind === "command" && this.isHost()) {
      const result = applyRoomCommand(this.state, message.command);
      if (!result.ok) {
        this.channel.postMessage({
          kind: "error",
          senderId: this.actorId,
          targetId: message.senderId,
          message: result.message,
          state: this.state,
        } satisfies WireMessage);
        return;
      }
      this.state = result.state;
      writeStoredRoom(this.state);
      this.publishState();
    }
  };

  submit(command: LocalRoomCommand): void {
    const envelope = {
      ...command,
      id: crypto.randomUUID(),
      actorId: this.actorId,
      baseSequence: this.state.sequence,
    } as RoomCommand;

    if (this.isHost()) {
      const result = applyRoomCommand(this.state, envelope);
      if (!result.ok) {
        this.onError(result.message);
        return;
      }
      this.state = result.state;
      writeStoredRoom(this.state);
      this.publishState();
      return;
    }

    this.channel.postMessage({ kind: "command", senderId: this.actorId, command: envelope } satisfies WireMessage);
  }

  close(): void {
    this.channel.removeEventListener("message", this.handleMessage);
    this.channel.close();
  }
}
