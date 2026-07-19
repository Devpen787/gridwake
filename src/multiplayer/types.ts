import type { CompiledStrategy, LightRole } from "../game/types";

export const ROOM_CODE_LENGTH = 6;
export const ROOM_MIN_PLAYERS = 2;
export const ROOM_MAX_PLAYERS = 3;

export type RoomPhase = "lobby" | "launched" | "closed";
export type ConnectionState = "connected" | "reconnecting" | "disconnected";

export type RoomMember = Readonly<{
  id: string;
  displayName: string;
  role: LightRole;
  joinedOrder: number;
  connection: ConnectionState;
  instinctSource: string;
  ready: boolean;
}>;

export type LaunchContribution = Readonly<{
  memberId: string;
  displayName: string;
  role: LightRole;
  source: string;
}>;

export type RoomLaunch = Readonly<{
  roomId: string;
  sequence: number;
  seed: number;
  startsAt: number;
  contributions: readonly LaunchContribution[];
  combinedSource: string;
  strategy: CompiledStrategy;
}>;

export type RoomPulseEvent = Readonly<{
  id: string;
  sequence: number;
  requestedBy: string;
  executeAtTick: number;
}>;

export type RoomState = Readonly<{
  id: string;
  code: string;
  sequence: number;
  phase: RoomPhase;
  hostId: string;
  createdAt: number;
  members: readonly RoomMember[];
  launch: RoomLaunch | null;
}>;

type CommandBase = Readonly<{
  id: string;
  actorId: string;
  baseSequence: number;
}>;

export type RoomCommand =
  | (CommandBase & Readonly<{ type: "join"; displayName: string }>)
  | (CommandBase & Readonly<{ type: "configure"; displayName: string; role: LightRole; source: string; ready: boolean }>)
  | (CommandBase & Readonly<{ type: "set-profile"; displayName: string; role: LightRole }>)
  | (CommandBase & Readonly<{ type: "set-instinct"; source: string }>)
  | (CommandBase & Readonly<{ type: "set-ready"; ready: boolean }>)
  | (CommandBase & Readonly<{ type: "set-connection"; connection: ConnectionState }>)
  | (CommandBase & Readonly<{ type: "leave" }>)
  | (CommandBase & Readonly<{ type: "launch"; startsAt: number }>);

export type RoomCommandErrorCode =
  | "stale-sequence"
  | "room-closed"
  | "room-launched"
  | "room-full"
  | "member-exists"
  | "member-not-found"
  | "host-required"
  | "role-taken"
  | "invalid-name"
  | "invalid-instinct"
  | "not-ready"
  | "invalid-start-time";

export type RoomCommandResult =
  | Readonly<{ ok: true; state: RoomState }>
  | Readonly<{ ok: false; state: RoomState; code: RoomCommandErrorCode; message: string }>;
