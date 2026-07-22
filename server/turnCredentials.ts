const CLOUDFLARE_TURN_ORIGIN = "https://rtc.live.cloudflare.com";
export const TURN_CREDENTIAL_TTL_SECONDS = 3_600;
const UPSTREAM_TIMEOUT_MS = 4_500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 12;

declare const process: { env: Record<string, string | undefined> };

type HeaderValue = string | string[] | undefined;

export type ApiRequest = Readonly<{
  method?: string;
  headers: Readonly<Record<string, HeaderValue>>;
  socket?: Readonly<{ remoteAddress?: string }>;
}>;

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  end: () => void;
};

export type TurnEnvironment = Readonly<{
  TURN_KEY_ID?: string;
  TURN_KEY_SECRET?: string;
}>;

export type TurnCredentialPayload = Readonly<{
  iceServers: RTCIceServer[];
  expiresAt: string;
}>;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function firstHeader(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function requestHost(request: ApiRequest): string | null {
  const forwarded = firstHeader(request.headers["x-forwarded-host"]);
  const host = forwarded?.split(",")[0]?.trim() || firstHeader(request.headers.host)?.trim();
  return host?.toLowerCase() || null;
}

export function isSameOriginRequest(request: ApiRequest): boolean {
  const host = requestHost(request);
  if (!host) return false;

  const origin = firstHeader(request.headers.origin);
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === host;
    } catch {
      return false;
    }
  }

  return firstHeader(request.headers["sec-fetch-site"])?.toLowerCase() === "same-origin";
}

function clientAddress(request: ApiRequest): string {
  const forwarded = firstHeader(request.headers["x-forwarded-for"]);
  return forwarded?.split(",")[0]?.trim() || request.socket?.remoteAddress || "unknown";
}

export class SlidingWindowRateLimiter {
  private readonly requests = new Map<string, number[]>();

  allow(key: string, now: number): boolean {
    const recent = (this.requests.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_REQUESTS) {
      this.requests.set(key, recent);
      return false;
    }
    recent.push(now);
    this.requests.set(key, recent);
    if (this.requests.size > 2_000) this.prune(now);
    return true;
  }

  private prune(now: number): void {
    for (const [key, timestamps] of this.requests) {
      if (!timestamps.some((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)) this.requests.delete(key);
    }
  }
}

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

export function parseCloudflareIceServers(value: unknown): RTCIceServer[] | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as Record<string, unknown>).iceServers;
  if (!Array.isArray(raw)) return null;
  const parsed = raw.map(parseIceServer).filter((server): server is RTCIceServer => server !== null);
  const urls = parsed.flatMap((server) => typeof server.urls === "string" ? [server.urls] : server.urls);
  if (!urls.some((url) => /^turns?:/i.test(url))) return null;
  return parsed;
}

function setSecurityHeaders(response: ApiResponse): void {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.setHeader("Content-Security-Policy", "default-src 'none'");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Vary", "Origin");
}

function fail(response: ApiResponse, status: number, message: string): void {
  response.status(status).json({ error: message });
}

export function createTurnCredentialsHandler(options: Readonly<{
  env?: TurnEnvironment;
  fetchFn?: FetchLike;
  now?: () => number;
  limiter?: SlidingWindowRateLimiter;
}> = {}) {
  const env = options.env ?? process.env;
  const fetchFn = options.fetchFn ?? fetch;
  const now = options.now ?? Date.now;
  const limiter = options.limiter ?? new SlidingWindowRateLimiter();

  return async function turnCredentialsHandler(request: ApiRequest, response: ApiResponse): Promise<void> {
    setSecurityHeaders(response);
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      fail(response, 405, "Method not allowed.");
      return;
    }
    if (!isSameOriginRequest(request)) {
      fail(response, 403, "Same-origin request required.");
      return;
    }
    if (!limiter.allow(clientAddress(request), now())) {
      response.setHeader("Retry-After", "60");
      fail(response, 429, "Too many relay requests. Try again shortly.");
      return;
    }

    const keyId = env.TURN_KEY_ID?.trim();
    const keySecret = env.TURN_KEY_SECRET?.trim();
    if (!keyId || !keySecret) {
      fail(response, 503, "Relay service is not configured.");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const upstream = await fetchFn(
        `${CLOUDFLARE_TURN_ORIGIN}/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keySecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: TURN_CREDENTIAL_TTL_SECONDS }),
          signal: controller.signal,
        },
      );
      if (!upstream.ok) {
        fail(response, 503, "Relay credentials are temporarily unavailable.");
        return;
      }
      const iceServers = parseCloudflareIceServers(await upstream.json());
      if (!iceServers) {
        fail(response, 503, "Relay service returned an invalid configuration.");
        return;
      }
      const payload: TurnCredentialPayload = {
        iceServers,
        expiresAt: new Date(now() + TURN_CREDENTIAL_TTL_SECONDS * 1_000).toISOString(),
      };
      response.status(200).json(payload);
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      fail(response, timedOut ? 504 : 503, timedOut
        ? "Relay credentials timed out."
        : "Relay credentials are temporarily unavailable.");
    } finally {
      clearTimeout(timeout);
    }
  };
}
