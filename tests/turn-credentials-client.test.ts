import { describe, expect, it, vi } from "vitest";
import { fetchTurnCredentials, parseTurnCredentialPayload } from "../src/multiplayer/turnCredentials";

const VALID_PAYLOAD = {
  iceServers: [
    { urls: "stun:stun.cloudflare.com:3478" },
    {
      urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turn:turn.cloudflare.com:53?transport=udp"],
      username: "ephemeral",
      credential: "ephemeral-secret",
    },
  ],
  expiresAt: "2026-07-22T13:00:00.000Z",
};

describe("browser TURN credential client", () => {
  it("accepts valid short-lived ICE servers and filters port 53 defensively", () => {
    const parsed = parseTurnCredentialPayload(VALID_PAYLOAD);
    expect(parsed).not.toBeNull();
    expect(JSON.stringify(parsed)).not.toContain(":53");
    expect(JSON.stringify(parsed)).toContain("turn.cloudflare.com:3478");
  });

  it("rejects payloads without TURN or a valid expiry", () => {
    expect(parseTurnCredentialPayload({ iceServers: [{ urls: "stun:example.com" }], expiresAt: VALID_PAYLOAD.expiresAt })).toBeNull();
    expect(parseTurnCredentialPayload({ ...VALID_PAYLOAD, expiresAt: "not-a-date" })).toBeNull();
  });

  it("fetches same-origin credentials without cache", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(VALID_PAYLOAD), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const result = await fetchTurnCredentials(fetchFn);
    expect(result.iceServers.length).toBe(2);
    expect(fetchFn).toHaveBeenCalledWith("/api/turn-credentials", expect.objectContaining({
      cache: "no-store",
      credentials: "same-origin",
    }));
  });

  it("surfaces broker failures to the caller for direct-only fallback", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }));
    await expect(fetchTurnCredentials(fetchFn)).rejects.toThrow("503");
  });
});
