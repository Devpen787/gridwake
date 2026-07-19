export const NETWORK_INPUT_LEAD_TICKS = 10;

export function schedulePulseTick(hostTick: number, requestedTick: number, maxTicks: number): number | null {
  if (!Number.isSafeInteger(hostTick) || !Number.isSafeInteger(requestedTick) || !Number.isSafeInteger(maxTicks)) return null;
  if (hostTick < 0 || requestedTick < 0 || maxTicks < 1) return null;
  const executeAtTick = Math.max(hostTick, requestedTick) + NETWORK_INPUT_LEAD_TICKS;
  return executeAtTick < maxTicks ? executeAtTick : null;
}
