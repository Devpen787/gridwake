import { joinRoom, type JsonValue, type MessageAction, type Room } from "trystero";
import { applyRoomCommand } from "./room";
import { schedulePulseTick } from "./input";
import { ROUND_TICKS } from "../game/types";
import type { RoomCommand, RoomPulseEvent, RoomState } from "./types";

const APP_ID = "gridwake-openai-build-week-2026-v1";

type StripEnvelope<T> = T extends RoomCommand ? Omit<T, "id" | "actorId" | "baseSequence"> : never;
export type PeerRoomCommand = StripEnvelope<RoomCommand>;

type JoinWire = Readonly<{
  kind: "join";
  actorId: string;
  displayName: string;
}>;

type CommandWire = Readonly<{
  kind: "command";
  actorId: string;
  command: RoomCommand;
}>;

type StateWire = Readonly<{
  kind: "state";
  authorityId: string;
  state: RoomState;
}>;

type ErrorWire = Readonly<{
  kind: "error";
  authorityId: string;
  message: string;
  state: RoomState;
}>;

type PulseRequestWire = Readonly<{
  kind: "pulse-request";
  actorId: string;
  requestedTick: number;
}>;

type PulseWire = Readonly<{
  kind: "pulse";
  authorityId: string;
  event: RoomPulseEvent;
}>;

type CheckpointWire = Readonly<{
  kind: "checkpoint";
  actorId: string;
  tick: number;
  replayHash: number;
}>;

type CheckpointAckWire = Readonly<{
  kind: "checkpoint-ack";
  authorityId: string;
  tick: number;
  replayHash: number;
  matched: boolean;
}>;

type WireMessage = JoinWire | CommandWire | StateWire | ErrorWire | PulseRequestWire | PulseWire | CheckpointWire | CheckpointAckWire;

export class PeerRoomSession {
  private readonly actorId: string;
  private readonly displayName: string;
  private readonly room: Room;
  private readonly wire: MessageAction<JsonValue>;
  private readonly onState: (state: RoomState) => void;
  private readonly onError: (message: string) => void;
  private readonly onPulse: (event: RoomPulseEvent) => void;
  private readonly onCheckpoint: (tick: number, matched: boolean) => void;
  private readonly peerActors = new Map<string, string>();
  private state: RoomState | null;
  private hostPeerId: string | null = null;
  private hostTick = 0;
  private pulseEvent: RoomPulseEvent | null = null;
  private readonly checkpoints = new Map<number, Map<string, number>>();
  private closed = false;

  constructor(input: Readonly<{
    actorId: string;
    displayName: string;
    code: string;
    initialState: RoomState | null;
    onState: (state: RoomState) => void;
    onError: (message: string) => void;
    onPulse: (event: RoomPulseEvent) => void;
    onCheckpoint: (tick: number, matched: boolean) => void;
  }>) {
    this.actorId = input.actorId;
    this.displayName = input.displayName;
    this.state = input.initialState;
    this.onState = input.onState;
    this.onError = input.onError;
    this.onPulse = input.onPulse;
    this.onCheckpoint = input.onCheckpoint;
    this.room = joinRoom(
      {
        appId: APP_ID,
        password: `gridwake-room-${input.code}`,
        relayConfig: { redundancy: 2 },
      },
      `gridwake-${input.code}`,
      {
        onJoinError: ({ error }) => this.onError(`Peer connection failed: ${error}`),
        handshakeTimeoutMs: 8_000,
      },
    );
    this.wire = this.room.makeAction<JsonValue>("gridwake-room-v1");
    this.wire.onMessage = (payload, context) => this.handleWire(payload as WireMessage, context.peerId);
    this.room.onPeerJoin = (peerId) => this.handlePeerJoin(peerId);
    this.room.onPeerLeave = (peerId) => this.handlePeerLeave(peerId);

    if (this.state) this.onState(this.state);
  }

  private isHost(): boolean {
    return this.state?.hostId === this.actorId;
  }

  private send(message: WireMessage, target?: string): void {
    void this.wire.send(message as unknown as JsonValue, target ? { target } : undefined).catch(() => {
      this.onError("The room message could not be delivered. Check your connection and try again.");
    });
  }

  private publishState(target?: string): void {
    if (!this.state) return;
    this.onState(this.state);
    this.send({ kind: "state", authorityId: this.actorId, state: this.state }, target);
  }

  private handlePeerJoin(peerId: string): void {
    if (this.isHost()) {
      this.publishState(peerId);
      return;
    }
    this.send({ kind: "join", actorId: this.actorId, displayName: this.displayName }, peerId);
  }

  private handlePeerLeave(peerId: string): void {
    const actorId = this.peerActors.get(peerId);
    this.peerActors.delete(peerId);
    if (this.isHost() && actorId && this.state) {
      const result = applyRoomCommand(this.state, {
        id: crypto.randomUUID(),
        type: "set-connection",
        actorId,
        connection: "disconnected",
        baseSequence: this.state.sequence,
      });
      if (result.ok) {
        this.state = result.state;
        this.publishState();
      }
    }
    if (peerId === this.hostPeerId && !this.isHost()) {
      this.onError("The host disconnected. This room is frozen to prevent a divergent game.");
    }
  }

  private handleWire(message: WireMessage, peerId: string): void {
    if (!message || typeof message !== "object" || this.closed) return;

    if (message.kind === "join") {
      if (!this.isHost() || !this.state) return;
      const boundActor = this.peerActors.get(peerId);
      if (boundActor && boundActor !== message.actorId) {
        this.send({ kind: "error", authorityId: this.actorId, message: "Peer identity changed during the room.", state: this.state }, peerId);
        return;
      }
      this.peerActors.set(peerId, message.actorId);
      const existing = this.state.members.find((member) => member.id === message.actorId);
      if (existing) {
        const reconnect = applyRoomCommand(this.state, {
          id: crypto.randomUUID(),
          type: "set-connection",
          actorId: message.actorId,
          connection: "connected",
          baseSequence: this.state.sequence,
        });
        if (reconnect.ok) this.state = reconnect.state;
        this.publishState();
        return;
      }
      const result = applyRoomCommand(this.state, {
        id: crypto.randomUUID(),
        type: "join",
        actorId: message.actorId,
        displayName: message.displayName,
        baseSequence: this.state.sequence,
      });
      if (!result.ok) {
        this.send({ kind: "error", authorityId: this.actorId, message: result.message, state: this.state }, peerId);
        return;
      }
      this.state = result.state;
      this.publishState();
      return;
    }

    if (message.kind === "command") {
      if (!this.isHost() || !this.state) return;
      if (this.peerActors.get(peerId) !== message.actorId || message.command.actorId !== message.actorId) {
        this.send({ kind: "error", authorityId: this.actorId, message: "This command does not match the connected peer.", state: this.state }, peerId);
        return;
      }
      const result = applyRoomCommand(this.state, message.command);
      if (!result.ok) {
        this.send({ kind: "error", authorityId: this.actorId, message: result.message, state: this.state }, peerId);
        return;
      }
      this.state = result.state;
      this.publishState();
      return;
    }

    if (message.kind === "pulse-request") {
      if (!this.isHost() || !this.state || this.state.phase !== "launched") return;
      if (this.peerActors.get(peerId) !== message.actorId) {
        this.send({ kind: "error", authorityId: this.actorId, message: "This Pulse request does not match the connected peer.", state: this.state }, peerId);
        return;
      }
      this.acceptPulse(message.actorId, message.requestedTick);
      return;
    }

    if (message.kind === "pulse") {
      if (this.isHost()) return;
      if (!this.hostPeerId || this.hostPeerId !== peerId || message.authorityId !== this.state?.hostId) return;
      if (this.pulseEvent && this.pulseEvent.id !== message.event.id) return;
      this.pulseEvent = message.event;
      this.onPulse(message.event);
      return;
    }

    if (message.kind === "checkpoint") {
      if (!this.isHost() || !this.state || this.state.phase !== "launched") return;
      if (this.peerActors.get(peerId) !== message.actorId) return;
      this.recordCheckpoint(message.actorId, message.tick, message.replayHash);
      return;
    }

    if (message.kind === "checkpoint-ack") {
      if (this.isHost() || this.hostPeerId !== peerId || message.authorityId !== this.state?.hostId) return;
      this.onCheckpoint(message.tick, message.matched);
      if (!message.matched) this.onError(`DESYNC DETECTED AT TICK ${message.tick}. The result cannot be verified.`);
      return;
    }

    if (message.kind === "state") {
      if (this.isHost()) return;
      if (this.hostPeerId && this.hostPeerId !== peerId) return;
      if (message.state.hostId !== message.authorityId || message.state.code.length !== 6) return;
      if (this.state && message.state.sequence < this.state.sequence) return;
      this.hostPeerId = peerId;
      this.state = message.state;
      this.onState(this.state);
      if (!this.state.members.some((member) => member.id === this.actorId)) {
        this.send({ kind: "join", actorId: this.actorId, displayName: this.displayName }, peerId);
      }
      return;
    }

    if (message.kind === "error" && (!this.hostPeerId || this.hostPeerId === peerId)) {
      this.hostPeerId = peerId;
      this.state = message.state;
      this.onState(this.state);
      this.onError(message.message);
    }
  }

  submit(command: PeerRoomCommand): void {
    if (!this.state) {
      this.onError("Still connecting to the room host.");
      return;
    }
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
      this.publishState();
      return;
    }
    if (!this.hostPeerId) {
      this.onError("The room host has not connected yet.");
      return;
    }
    this.send({ kind: "command", actorId: this.actorId, command: envelope }, this.hostPeerId);
  }

  updateTick(tick: number): void {
    if (Number.isSafeInteger(tick) && tick >= this.hostTick) this.hostTick = tick;
  }

  private acceptPulse(actorId: string, requestedTick: number): void {
    if (!this.state || this.state.phase !== "launched") return;
    if (this.pulseEvent) {
      this.onError("The room Pulse is already committed.");
      return;
    }
    if (!this.state.members.some((member) => member.id === actorId)) {
      this.onError("Only a room member can request Pulse.");
      return;
    }
    const executeAtTick = schedulePulseTick(this.hostTick, requestedTick, ROUND_TICKS);
    if (executeAtTick === null) {
      this.onError("Too late to schedule Pulse before the round ends.");
      return;
    }
    const event: RoomPulseEvent = {
      id: crypto.randomUUID(),
      sequence: 1,
      requestedBy: actorId,
      executeAtTick,
    };
    this.pulseEvent = event;
    this.onPulse(event);
    this.send({ kind: "pulse", authorityId: this.actorId, event });
  }

  requestPulse(requestedTick: number): void {
    if (!this.state || this.state.phase !== "launched") return;
    if (this.isHost()) {
      this.acceptPulse(this.actorId, requestedTick);
      return;
    }
    if (!this.hostPeerId) {
      this.onError("The room host is not connected.");
      return;
    }
    this.send({ kind: "pulse-request", actorId: this.actorId, requestedTick }, this.hostPeerId);
  }

  private recordCheckpoint(actorId: string, tick: number, replayHash: number): void {
    if (!this.state || !Number.isSafeInteger(tick) || tick < 0 || !Number.isSafeInteger(replayHash)) return;
    const checkpoint = this.checkpoints.get(tick) ?? new Map<string, number>();
    checkpoint.set(actorId, replayHash >>> 0);
    this.checkpoints.set(tick, checkpoint);
    const activeIds = this.state.members.filter((member) => member.connection === "connected").map((member) => member.id);
    if (!activeIds.every((id) => checkpoint.has(id))) return;
    const hashes = activeIds.map((id) => checkpoint.get(id));
    const matched = hashes.every((hash) => hash === hashes[0]);
    const canonicalHash = hashes[0] ?? 0;
    this.onCheckpoint(tick, matched);
    if (!matched) this.onError(`DESYNC DETECTED AT TICK ${tick}. The result cannot be verified.`);
    this.send({ kind: "checkpoint-ack", authorityId: this.actorId, tick, replayHash: canonicalHash, matched });
    for (const knownTick of this.checkpoints.keys()) {
      if (knownTick < tick - 100) this.checkpoints.delete(knownTick);
    }
  }

  reportCheckpoint(tick: number, replayHash: number): void {
    if (!this.state || this.state.phase !== "launched") return;
    if (this.isHost()) {
      this.recordCheckpoint(this.actorId, tick, replayHash);
      return;
    }
    if (!this.hostPeerId) return;
    this.send({ kind: "checkpoint", actorId: this.actorId, tick, replayHash }, this.hostPeerId);
  }

  close(): void {
    this.closed = true;
    void this.room.leave();
  }
}
