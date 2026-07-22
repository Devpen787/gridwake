import { describe, expect, it, vi } from "vitest";
import {
  createTurnCredentialsHandler,
  isSameOriginRequest,
  SlidingWindowRateLimiter,
  type ApiRequest,
  type ApiResponse,
} from "../server/turnCredentials.js";

const CLOUDFLARE_RESPONSE = {
  iceServers: [
    { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"] },
    {
      urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turn:turn.cloudflare.com:53?transport=udp"],
      username: "short-lived-user",
      credential: "short-lived-password",
    },
  ],
};

function request(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    method: "GET",
    headers: {
      host: "gridwake.vercel.app",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": "203.0.113.4",
    },
    ...overrides,
  };
}

function response() {
  const headers = new Map<string, string>();
  let statusCode = 200;
  let body: unknown;
  const apiResponse: ApiResponse = {
    status(code) {
      statusCode = code;
      return apiResponse;
    },
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
    json(value) {
      body = value;
    },
    end() {},
  };
  return { apiResponse, headers, read: () => ({ statusCode, body }) };
}

function cloudflareFetch(payload: unknown = CLOUDFLARE_RESPONSE, status = 200) {
  return vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

describe("TURN broker request boundary", () => {
  it("allows browser same-origin requests and rejects foreign origins", () => {
    expect(isSameOriginRequest(request())).toBe(true);
    expect(isSameOriginRequest(request({ headers: { host: "gridwake.vercel.app", origin: "https://attacker.example" } }))).toBe(false);
  });

  it("rejects unsupported methods without contacting Cloudflare", async () => {
    const fetchFn = cloudflareFetch();
    const target = response();
    await createTurnCredentialsHandler({ env: { TURN_KEY_ID: "key", TURN_KEY_SECRET: "secret" }, fetchFn })(
      request({ method: "POST" }),
      target.apiResponse,
    );
    expect(target.read().statusCode).toBe(405);
    expect(target.headers.get("allow")).toBe("GET");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rate-limits repeated requests per forwarded client address", async () => {
    const handler = createTurnCredentialsHandler({
      env: { TURN_KEY_ID: "key", TURN_KEY_SECRET: "secret" },
      fetchFn: cloudflareFetch(),
      limiter: new SlidingWindowRateLimiter(),
      now: () => 10_000,
    });
    let last = response();
    for (let index = 0; index < 13; index += 1) {
      last = response();
      await handler(request(), last.apiResponse);
    }
    expect(last.read().statusCode).toBe(429);
    expect(last.headers.get("retry-after")).toBe("60");
  });
});

describe("TURN broker Cloudflare exchange", () => {
  it("keeps the long-term secret upstream and returns filtered short-lived servers", async () => {
    const fetchFn = cloudflareFetch();
    const target = response();
    await createTurnCredentialsHandler({
      env: { TURN_KEY_ID: "key-id", TURN_KEY_SECRET: "long-term-secret" },
      fetchFn,
      now: () => Date.UTC(2026, 6, 22, 12),
    })(request(), target.apiResponse);

    expect(target.read().statusCode).toBe(200);
    expect(target.headers.get("cache-control")).toContain("no-store");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toContain("/v1/turn/keys/key-id/credentials/generate-ice-servers");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer long-term-secret" });
    expect(init?.body).toBe(JSON.stringify({ ttl: 3_600 }));
    const serialized = JSON.stringify(target.read().body);
    expect(serialized).not.toContain("long-term-secret");
    expect(serialized).not.toContain(":53");
    expect(serialized).toContain("turn.cloudflare.com:3478");
  });

  it("fails closed for missing environment and malformed upstream data", async () => {
    const missing = response();
    await createTurnCredentialsHandler({ env: {}, fetchFn: cloudflareFetch() })(request(), missing.apiResponse);
    expect(missing.read().statusCode).toBe(503);

    const malformed = response();
    await createTurnCredentialsHandler({
      env: { TURN_KEY_ID: "key", TURN_KEY_SECRET: "secret" },
      fetchFn: cloudflareFetch({ iceServers: [{ urls: "stun:only.example:3478" }] }),
    })(request(), malformed.apiResponse);
    expect(malformed.read().statusCode).toBe(503);
  });

  it("returns a generic gateway timeout without exposing upstream details", async () => {
    const target = response();
    const fetchFn = vi.fn(async () => {
      throw new DOMException("credential provider internal detail", "AbortError");
    });
    await createTurnCredentialsHandler({
      env: { TURN_KEY_ID: "key", TURN_KEY_SECRET: "secret" },
      fetchFn,
    })(request(), target.apiResponse);
    expect(target.read().statusCode).toBe(504);
    expect(JSON.stringify(target.read().body)).not.toContain("internal detail");
  });
});
