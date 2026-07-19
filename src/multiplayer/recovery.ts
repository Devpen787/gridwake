import type { RoomState } from "./types";

const RECOVERY_PREFIX = "gridwake:recovery:";

export type RoomRecovery = Readonly<{
  actorId: string;
  state: RoomState;
}>;

export function saveRoomRecovery(actorId: string, state: RoomState): void {
  try {
    window.sessionStorage.setItem(`${RECOVERY_PREFIX}${state.code}`, JSON.stringify({ actorId, state } satisfies RoomRecovery));
  } catch {
    // Recovery is optional; the active P2P room remains usable when storage is blocked.
  }
}

export function readRoomRecovery(code: string): RoomRecovery | null {
  try {
    const raw = window.sessionStorage.getItem(`${RECOVERY_PREFIX}${code}`);
    if (!raw) return null;
    const recovery = JSON.parse(raw) as RoomRecovery;
    if (!recovery.actorId || recovery.state.code !== code) return null;
    return recovery;
  } catch {
    return null;
  }
}

export function clearRoomRecovery(code: string): void {
  try {
    window.sessionStorage.removeItem(`${RECOVERY_PREFIX}${code}`);
  } catch {
    // No-op when storage is unavailable.
  }
}
