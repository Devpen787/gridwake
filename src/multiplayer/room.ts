import { compileStrategy } from "../game/strategy";
import type { LightRole } from "../game/types";
import { composeSquadStrategy } from "./squadStrategy";
import {
  ROOM_CODE_LENGTH,
  ROOM_MAX_PLAYERS,
  ROOM_MIN_PLAYERS,
  type RoomCommand,
  type RoomCommandErrorCode,
  type RoomCommandResult,
  type RoomMember,
  type RoomState,
} from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROLE_ORDER: readonly LightRole[] = ["guardian", "scout", "mender"];

function hashText(source: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function normalizeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function roomCodeFromEntropy(entropy: number): string {
  let state = entropy >>> 0;
  let code = "";
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x297a2d39) >>> 0;
    code += CODE_ALPHABET[state % CODE_ALPHABET.length];
  }
  return code;
}

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function reject(state: RoomState, code: RoomCommandErrorCode, message: string): RoomCommandResult {
  return { ok: false, state, code, message };
}

function instinctCompileError(source: string): string | null {
  try {
    compileStrategy(source);
    return null;
  } catch (caught) {
    return caught instanceof Error ? caught.message : "The Instinct could not be interpreted.";
  }
}

function nextRole(members: readonly RoomMember[]): LightRole | null {
  return ROLE_ORDER.find((role) => !members.some((member) => member.role === role)) ?? null;
}

function replaceMember(state: RoomState, member: RoomMember): RoomState {
  return {
    ...state,
    sequence: state.sequence + 1,
    members: state.members.map((candidate) => candidate.id === member.id ? member : candidate),
  };
}

export function createRoom(input: Readonly<{
  roomId: string;
  code: string;
  hostId: string;
  displayName: string;
  createdAt: number;
}>): RoomState {
  const displayName = cleanName(input.displayName);
  if (displayName.length < 1 || displayName.length > 24) {
    throw new Error("Display name must contain 1-24 characters.");
  }
  const code = normalizeRoomCode(input.code);
  if (code.length !== ROOM_CODE_LENGTH) throw new Error("Room code must contain six characters.");

  return {
    id: input.roomId,
    code,
    sequence: 0,
    phase: "lobby",
    hostId: input.hostId,
    createdAt: input.createdAt,
    members: [{
      id: input.hostId,
      displayName,
      role: "guardian",
      joinedOrder: 0,
      connection: "connected",
      instinctSource: "",
      ready: false,
    }],
    launch: null,
  };
}

export function applyRoomCommand(state: RoomState, command: RoomCommand): RoomCommandResult {
  if (command.baseSequence !== state.sequence) {
    return reject(state, "stale-sequence", "The room changed. Refresh and try again.");
  }
  if (state.phase === "closed") return reject(state, "room-closed", "This room is closed.");
  if (state.phase === "launched") return reject(state, "room-launched", "The roster is locked.");

  const actor = state.members.find((member) => member.id === command.actorId);

  if (command.type === "join") {
    if (actor) return reject(state, "member-exists", "This player is already in the room.");
    if (state.members.length >= ROOM_MAX_PLAYERS) return reject(state, "room-full", "This room is full.");
    const displayName = cleanName(command.displayName);
    if (displayName.length < 1 || displayName.length > 24) {
      return reject(state, "invalid-name", "Display name must contain 1-24 characters.");
    }
    const role = nextRole(state.members);
    if (!role) return reject(state, "room-full", "No squad role is available.");
    return {
      ok: true,
      state: {
        ...state,
        sequence: state.sequence + 1,
        members: [...state.members, {
          id: command.actorId,
          displayName,
          role,
          joinedOrder: Math.max(...state.members.map((member) => member.joinedOrder)) + 1,
          connection: "connected",
          instinctSource: "",
          ready: false,
        }],
      },
    };
  }

  if (!actor) return reject(state, "member-not-found", "You are not a member of this room.");

  if (command.type === "configure") {
    const displayName = cleanName(command.displayName);
    const source = command.source.trim();
    if (displayName.length < 1 || displayName.length > 24) {
      return reject(state, "invalid-name", "Display name must contain 1-24 characters.");
    }
    if (source.length < 1 || source.length > 280) {
      return reject(state, "invalid-instinct", "Your Instinct must contain 1-280 characters.");
    }
    const compileError = instinctCompileError(source);
    if (compileError) return reject(state, "invalid-instinct", compileError);
    if (state.members.some((member) => member.id !== actor.id && member.role === command.role)) {
      return reject(state, "role-taken", "That squad role is already claimed.");
    }
    return {
      ok: true,
      state: replaceMember(state, {
        ...actor,
        displayName,
        role: command.role,
        instinctSource: source,
        ready: command.ready,
      }),
    };
  }

  if (command.type === "set-profile") {
    const displayName = cleanName(command.displayName);
    if (displayName.length < 1 || displayName.length > 24) {
      return reject(state, "invalid-name", "Display name must contain 1-24 characters.");
    }
    if (state.members.some((member) => member.id !== actor.id && member.role === command.role)) {
      return reject(state, "role-taken", "That squad role is already claimed.");
    }
    return { ok: true, state: replaceMember(state, { ...actor, displayName, role: command.role, ready: false }) };
  }

  if (command.type === "set-instinct") {
    const source = command.source.trim();
    if (source.length < 1 || source.length > 280) {
      return reject(state, "invalid-instinct", "Your Instinct must contain 1-280 characters.");
    }
    const compileError = instinctCompileError(source);
    if (compileError) return reject(state, "invalid-instinct", compileError);
    return { ok: true, state: replaceMember(state, { ...actor, instinctSource: source, ready: false }) };
  }

  if (command.type === "set-ready") {
    if (command.ready && (actor.instinctSource.length < 1 || actor.instinctSource.length > 280)) {
      return reject(state, "invalid-instinct", "Write your Instinct before becoming ready.");
    }
    if (command.ready) {
      const compileError = instinctCompileError(actor.instinctSource);
      if (compileError) return reject(state, "invalid-instinct", compileError);
    }
    return { ok: true, state: replaceMember(state, { ...actor, ready: command.ready }) };
  }

  if (command.type === "set-connection") {
    return { ok: true, state: replaceMember(state, { ...actor, connection: command.connection }) };
  }

  if (command.type === "leave") {
    const members = state.members.filter((member) => member.id !== actor.id);
    if (members.length === 0) {
      return { ok: true, state: { ...state, sequence: state.sequence + 1, phase: "closed", members: [], launch: null } };
    }
    const hostId = actor.id === state.hostId
      ? [...members].sort((left, right) => left.joinedOrder - right.joinedOrder)[0].id
      : state.hostId;
    return { ok: true, state: { ...state, sequence: state.sequence + 1, hostId, members } };
  }

  if (command.actorId !== state.hostId) {
    return reject(state, "host-required", "Only the host can wake the room.");
  }
  if (!Number.isSafeInteger(command.startsAt) || command.startsAt < state.createdAt) {
    return reject(state, "invalid-start-time", "The launch time is invalid.");
  }
  if (state.members.length < ROOM_MIN_PLAYERS || state.members.some((member) => !member.ready || member.connection !== "connected")) {
    return reject(state, "not-ready", "Every connected player must write an Instinct and become ready.");
  }

  const contributions = [...state.members]
    .sort((left, right) => ROLE_ORDER.indexOf(left.role) - ROLE_ORDER.indexOf(right.role))
    .map((member) => ({
      memberId: member.id,
      displayName: member.displayName,
      role: member.role,
      source: member.instinctSource,
    }));
  const combinedSource = contributions.map((item) => `${item.role}: ${item.source}`).join(" ");
  const composed = composeSquadStrategy(contributions, combinedSource);
  if (!composed.ok) {
    return reject(
      state,
      "invalid-instinct",
      `${composed.error.displayName}'s Instinct could not be interpreted. ${composed.error.message}`,
    );
  }
  const nextSequence = state.sequence + 1;
  const seed = hashText(`${state.id}:${nextSequence}:${combinedSource}`);
  return {
    ok: true,
    state: {
      ...state,
      sequence: nextSequence,
      phase: "launched",
      launch: {
        roomId: state.id,
        sequence: nextSequence,
        seed,
        startsAt: command.startsAt,
        contributions,
        combinedSource,
        strategy: composed.strategy,
      },
    },
  };
}

export function launchBlockReason(state: RoomState, actorId: string): string | null {
  if (state.phase !== "lobby") return "THE ROSTER IS LOCKED";
  if (state.hostId !== actorId) return "WAITING FOR HOST";
  if (state.members.length < ROOM_MIN_PLAYERS) return "WAITING FOR ONE MORE PLAYER";
  if (state.members.some((member) => member.connection !== "connected")) return "WAITING FOR RECONNECTION";
  if (state.members.some((member) => !member.ready)) return "EVERY PLAYER MUST BE READY";
  return null;
}
