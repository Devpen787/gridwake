import { describe, expect, it } from "vitest";
import { createPeerRoomConfig, formatPeerJoinError } from "../src/multiplayer/peerTransport";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "turn:turn.cloudflare.com:3478?transport=udp", username: "short", credential: "lived" },
];

describe("peer transport configuration", () => {
  it("uses Cloudflare ICE servers with direct-first routing in production", () => {
    const config = createPeerRoomConfig({ code: "ABC234", iceServers: ICE_SERVERS });
    expect(config.relayConfig).toEqual({ redundancy: 4 });
    expect(config.rtcConfig?.iceServers).toEqual(ICE_SERVERS);
    expect(config.rtcConfig?.iceTransportPolicy).toBe("all");
  });

  it("supports relay-only routing for an explicit connectivity proof", () => {
    const config = createPeerRoomConfig({ code: "ABC234", iceServers: ICE_SERVERS, forceRelay: true });
    expect(config.rtcConfig?.iceTransportPolicy).toBe("relay");
  });

  it("preserves Trystero's default direct/STUN setup when the broker is unavailable", () => {
    const config = createPeerRoomConfig({ code: "ABC234" });
    expect(config.rtcConfig).toBeUndefined();
    expect(formatPeerJoinError("handshake timeout", false)).toContain("Relay is unavailable");
    expect(formatPeerJoinError("handshake timeout", true)).toContain("with relay available");
  });
});
