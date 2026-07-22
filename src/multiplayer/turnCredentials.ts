const TURN_ENDPOINT = "/api/turn-credentials";
const FETCH_TIMEOUT_MS = 5_000;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type TurnCredentialResult = Readonly<{
  iceServers: RTCIceServer[];
  expiresAt: string;
}>;

function hasPort53(url: string): boolean {
  return /:53(?:[/?]|$)/i.test(url);
}

function parseIceServer(value: unknown): RTCIceServer | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const urls = typeof candidate.urls === "string"
    ? [candidate.urls]
    : Array.isArray(candidate.urls) && candidate.urls.every((url) => typeof url === "string")
      ? candidate.urls
      : null;
  if (!urls) return null;
  const safeUrls = urls.filter((url) => /^(?:stun|stuns|turn|turns):/i.test(url) && !hasPort53(url));
  if (safeUrls.length === 0) return null;
  if (candidate.username !== undefined && typeof candidate.username !== "string") return null;
  if (candidate.credential !== undefined && typeof candidate.credential !== "string") return null;
  return {
    urls: safeUrls.length === 1 ? safeUrls[0] : safeUrls,
    ...(typeof candidate.username === "string" ? { username: candidate.username } : {}),
    ...(typeof candidate.credential === "string" ? { credential: candidate.credential } : {}),
  };
}

export function parseTurnCredentialPayload(value: unknown): TurnCredentialResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.iceServers) || typeof candidate.expiresAt !== "string") return null;
  if (Number.isNaN(Date.parse(candidate.expiresAt))) return null;
  const iceServers = candidate.iceServers.map(parseIceServer).filter((server): server is RTCIceServer => server !== null);
  const urls = iceServers.flatMap((server) => typeof server.urls === "string" ? [server.urls] : server.urls);
  if (!urls.some((url) => /^turns?:/i.test(url))) return null;
  return { iceServers, expiresAt: candidate.expiresAt };
}

export async function fetchTurnCredentials(fetchFn: FetchLike = fetch): Promise<TurnCredentialResult> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchFn(TURN_ENDPOINT, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Relay broker returned ${response.status}.`);
    const payload = parseTurnCredentialPayload(await response.json());
    if (!payload) throw new Error("Relay broker returned an invalid configuration.");
    return payload;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
