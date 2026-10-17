// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, tokenStore } from "./client";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fakeJwt = (exp: number) => `x.${btoa(JSON.stringify({ exp }))}.y`;

/** P18 (auditoria 17/10/2026): com sessão restaurável e sem token, a chamada espera a renovação única em vez de colher 401. */
describe("restauração antes da primeira chamada", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    tokenStore.clear();
    document.cookie = "ws_rt_h=1; path=/";
  });
  afterEach(() => { vi.unstubAllGlobals(); document.cookie = "ws_rt_h=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; tokenStore.clear(); });

  it("três chamadas simultâneas: uma renovação, nenhum 401, todas com Bearer", async () => {
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/bff/auth/refresh")) return json(200, { accessToken: fakeJwt(Math.floor(Date.now() / 1000) + 900) });
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      return auth ? json(200, { ok: u }) : json(401, { code: "NAO_AUTENTICADO" });
    });
    await Promise.all([api.get("/api/me"), api.get("/api/tasks"), api.get("/api/me/preferences")]);
    const calls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(calls.filter((u) => u.endsWith("/bff/auth/refresh"))).toHaveLength(1);
    expect(calls.indexOf(calls.find((u) => u.endsWith("/bff/auth/refresh"))!)).toBe(0);
    const results = await Promise.all(fetchMock.mock.results.map((r) => r.value as Promise<Response>));
    expect(results.some((r) => r.status === 401)).toBe(false);
  });
});
