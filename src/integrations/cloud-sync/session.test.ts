import { describe, expect, it, vi } from "vitest";
import {
  completeConnect,
  connectGoogle,
  disconnect,
  getAccessToken,
  isConnected,
  startConnect,
} from "./session";
import { CloudSyncError } from "./types";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

const ORIGIN = "https://lernraum.example";

function env(responses: Array<Response | Error>, now = () => 1_000_000) {
  const requests: Array<{ url: string; body: string }> = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), body: String(init?.body ?? "") });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next ?? new Response("{}", { status: 500 });
  }) as typeof fetch;
  return {
    storage: memoryStorage(),
    pendingStorage: memoryStorage(),
    fetcher,
    now,
    requests,
  };
}

describe("cloud sign-in session", () => {
  it("refuses to connect without a client id", async () => {
    await expect(
      startConnect("onedrive", null, "/x", vi.fn(), env([]), ORIGIN),
    ).rejects.toMatchObject({ code: "not-configured" });
  });

  it("redirects to Microsoft and finishes with the returned code", async () => {
    const e = env([
      Response.json({
        access_token: "a1",
        refresh_token: "r1",
        expires_in: 3600,
      }),
    ]);
    let target = "";
    await startConnect(
      "onedrive",
      "client-1",
      "/lehrer/einstellungen",
      (url) => (target = url),
      e,
      ORIGIN,
    );
    const url = new URL(target);
    expect(url.searchParams.get("redirect_uri")).toBe(
      `${ORIGIN}/sync/rueckkehr`,
    );
    const state = url.searchParams.get("state");
    const result = await completeConnect(`?code=abc&state=${state}`, e, ORIGIN);
    expect(result).toEqual({
      provider: "onedrive",
      returnTo: "/lehrer/einstellungen",
    });
    expect(e.requests[0]?.body).toContain("code=abc");
    expect(e.requests[0]?.body).toContain("code_verifier=");
    expect(isConnected("onedrive", e.storage)).toBe(true);
    expect(await getAccessToken("onedrive", e)).toBe("a1");
  });

  it("rejects a wrong state or a declined sign-in", async () => {
    const e = env([]);
    await startConnect("onedrive", "client-1", "/", vi.fn(), e, ORIGIN);
    await expect(
      completeConnect("?code=abc&state=falsch", e, ORIGIN),
    ).rejects.toBeInstanceOf(CloudSyncError);
    await startConnect("onedrive", "client-1", "/", vi.fn(), e, ORIGIN);
    await expect(
      completeConnect("?error=access_denied", e, ORIGIN),
    ).rejects.toMatchObject({ code: "unauthorized" });
    expect(e.requests).toHaveLength(0);
  });

  it("refreshes an expired access token and keeps the refresh token", async () => {
    let clock = 1_000_000;
    const e = env(
      [
        Response.json({
          access_token: "a1",
          refresh_token: "r1",
          expires_in: 3600,
        }),
        Response.json({ access_token: "a2", expires_in: 3600 }),
      ],
      () => clock,
    );
    let target = "";
    await startConnect(
      "onedrive",
      "client-1",
      "/",
      (url) => (target = url),
      e,
      ORIGIN,
    );
    await completeConnect(
      `?code=c&state=${new URL(target).searchParams.get("state")}`,
      e,
      ORIGIN,
    );
    clock += 3_600_000;
    expect(await getAccessToken("onedrive", e)).toBe("a2");
    expect(e.requests[1]?.body).toContain("grant_type=refresh_token");
    expect(e.requests[1]?.body).toContain("refresh_token=r1");
  });

  it("disconnects when the refresh token is rejected", async () => {
    const e = env([new Response("{}", { status: 400 })]);
    e.storage.setItem(
      "lernraum:cloud-sync:tokens",
      JSON.stringify({
        onedrive: {
          clientId: "client-1",
          accessToken: "old",
          refreshToken: "r",
          expiresAt: 0,
        },
      }),
    );
    await expect(getAccessToken("onedrive", e)).rejects.toMatchObject({
      code: "unauthorized",
    });
    expect(isConnected("onedrive", e.storage)).toBe(false);
    disconnect("onedrive", e.storage);
  });

  it("connects Google without a secret and asks again after an hour", async () => {
    let clock = 1_000_000;
    const prompts: string[] = [];
    let n = 0;
    const e = {
      ...env([], () => clock),
      request: async (clientId: string, prompt: "" | "consent") => {
        expect(clientId).toBe("g-client");
        prompts.push(prompt);
        return { accessToken: `g${++n}`, expiresIn: 3600 };
      },
    };
    await connectGoogle("g-client", e);
    expect(isConnected("google-drive", e.storage)).toBe(true);
    expect(await getAccessToken("google-drive", e)).toBe("g1");
    clock += 3_600_000;
    expect(await getAccessToken("google-drive", e)).toBe("g2");
    expect(prompts).toEqual(["consent", ""]);
    expect(e.requests).toHaveLength(0);
  });

  it("requires a connection before using Google", async () => {
    const e = env([]);
    await expect(getAccessToken("google-drive", e)).rejects.toMatchObject({
      code: "unauthorized",
    });
    await expect(connectGoogle(null, e)).rejects.toMatchObject({
      code: "not-configured",
    });
  });
});
