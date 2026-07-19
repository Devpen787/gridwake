import { describe, expect, it } from "vitest";
import { applyRoomCommand, createRoom, launchBlockReason, normalizeRoomCode, roomCodeFromEntropy } from "../src/multiplayer/room";
import type { RoomCommand, RoomState } from "../src/multiplayer/types";
import { NETWORK_INPUT_LEAD_TICKS, schedulePulseTick } from "../src/multiplayer/input";

type StripEnvelope<T> = T extends RoomCommand ? Omit<T, "id" | "baseSequence"> : never;
type RoomCommandInput = StripEnvelope<RoomCommand>;

function room(): RoomState {
  return createRoom({
    roomId: "room-alpha",
    code: "ABC234",
    hostId: "host",
    displayName: "Nova",
    createdAt: 1_000,
  });
}

function apply(state: RoomState, command: RoomCommandInput): RoomState {
  const result = applyRoomCommand(state, {
    ...command,
    id: `command-${state.sequence}`,
    baseSequence: state.sequence,
  } as RoomCommand);
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
  return result.state;
}

function readyPair(): RoomState {
  let state = room();
  state = apply(state, { type: "join", actorId: "peer", displayName: "Echo" });
  state = apply(state, { type: "set-instinct", actorId: "host", source: "Circle close and protect the core." });
  state = apply(state, { type: "set-ready", actorId: "host", ready: true });
  state = apply(state, { type: "set-instinct", actorId: "peer", source: "Send one scout, intercept, then return." });
  return apply(state, { type: "set-ready", actorId: "peer", ready: true });
}

describe("room identity", () => {
  it("normalizes codes and creates deterministic unambiguous codes", () => {
    expect(normalizeRoomCode(" ab-c 23 4 ")).toBe("ABC234");
    expect(roomCodeFromEntropy(42)).toBe(roomCodeFromEntropy(42));
    expect(roomCodeFromEntropy(42)).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});

describe("room command authority", () => {
  it("assigns unique roles and bounds the roster at three", () => {
    let state = room();
    state = apply(state, { type: "join", actorId: "peer-1", displayName: "Echo" });
    state = apply(state, { type: "join", actorId: "peer-2", displayName: "Vela" });
    expect(state.members.map((member) => member.role)).toEqual(["guardian", "scout", "mender"]);

    const result = applyRoomCommand(state, {
      id: "join-fourth",
      type: "join",
      actorId: "peer-3",
      displayName: "Overflow",
      baseSequence: state.sequence,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("room-full");
  });

  it("rejects stale commands without mutation", () => {
    const state = room();
    const result = applyRoomCommand(state, {
      id: "stale",
      type: "set-instinct",
      actorId: "host",
      source: "Protect the core.",
      baseSequence: 99,
    });
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.state.sequence).toBe(0);
  });

  it("rejects duplicate roles and clears ready on edits", () => {
    let state = readyPair();
    const duplicate = applyRoomCommand(state, {
      id: "duplicate-role",
      type: "set-profile",
      actorId: "peer",
      displayName: "Echo",
      role: "guardian",
      baseSequence: state.sequence,
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.code).toBe("role-taken");

    state = apply(state, { type: "set-instinct", actorId: "peer", source: "Keep a wide orbit and return." });
    expect(state.members.find((member) => member.id === "peer")?.ready).toBe(false);
  });

  it("allows only the host to launch a fully ready room", () => {
    const state = readyPair();
    const peerLaunch = applyRoomCommand(state, {
      id: "peer-launch",
      type: "launch",
      actorId: "peer",
      startsAt: 5_000,
      baseSequence: state.sequence,
    });
    expect(peerLaunch.ok).toBe(false);
    if (!peerLaunch.ok) expect(peerLaunch.code).toBe("host-required");
    expect(launchBlockReason(state, "host")).toBeNull();
  });

  it("transfers host deterministically when the host leaves", () => {
    let state = room();
    state = apply(state, { type: "join", actorId: "peer-1", displayName: "Echo" });
    state = apply(state, { type: "join", actorId: "peer-2", displayName: "Vela" });
    state = apply(state, { type: "leave", actorId: "host" });
    expect(state.hostId).toBe("peer-1");
  });
});

describe("deterministic room launch", () => {
  it("produces identical launch inputs when replayed", () => {
    const left = apply(readyPair(), { type: "launch", actorId: "host", startsAt: 5_000 });
    const right = apply(readyPair(), { type: "launch", actorId: "host", startsAt: 5_000 });
    expect(left.launch).toEqual(right.launch);
    expect(left.launch?.contributions.map((item) => item.role)).toEqual(["guardian", "scout"]);
    expect(left.launch?.combinedSource).toContain("guardian:");
    expect(left.launch?.combinedSource).toContain("scout:");
  });

  it("rejects a zero-signal instinct at lock-in with the compiler's guidance", () => {
    let state = room();
    state = apply(state, { type: "join", actorId: "peer", displayName: "Echo" });
    const result = applyRoomCommand(state, {
      id: "bad-instinct",
      type: "set-instinct",
      actorId: "peer",
      source: "Be brave, little sparks.",
      baseSequence: state.sequence,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid-instinct");
      expect(result.message).toMatch(/Describe movement or protection/);
    }
  });

  it("launches with role-owned dials instead of a blended compile", () => {
    let state = room();
    state = apply(state, { type: "join", actorId: "peer", displayName: "Echo" });
    // Host is guardian: no-chase belongs to them, not the squad.
    state = apply(state, { type: "set-instinct", actorId: "host", source: "Circle the core tightly and do not chase." });
    state = apply(state, { type: "set-ready", actorId: "host", ready: true });
    state = apply(state, { type: "set-instinct", actorId: "peer", source: "Hunt threats and chase for 6 cells." });
    state = apply(state, { type: "set-ready", actorId: "peer", ready: true });
    state = apply(state, { type: "launch", actorId: "host", startsAt: 5_000 });
    expect(state.launch?.strategy.policy.pursuitLimit).toBe(6);
    expect(state.launch?.strategy.policy.formation).toBe("ring");
  });

  it("locks all lobby mutations after launch", () => {
    const launched = apply(readyPair(), { type: "launch", actorId: "host", startsAt: 5_000 });
    const result = applyRoomCommand(launched, {
      id: "late-edit",
      type: "set-ready",
      actorId: "host",
      ready: false,
      baseSequence: launched.sequence,
    });
    expect(result.ok).toBe(false);
    expect(result.state).toBe(launched);
  });
});

describe("network input scheduling", () => {
  it("schedules from the furthest known logical tick with a fixed lead", () => {
    expect(schedulePulseTick(100, 97, 450)).toBe(100 + NETWORK_INPUT_LEAD_TICKS);
    expect(schedulePulseTick(100, 112, 450)).toBe(112 + NETWORK_INPUT_LEAD_TICKS);
  });

  it("rejects malformed and too-late Pulse requests", () => {
    expect(schedulePulseTick(-1, 2, 450)).toBeNull();
    expect(schedulePulseTick(445, 445, 450)).toBeNull();
    expect(schedulePulseTick(1.5, 2, 450)).toBeNull();
  });
});
