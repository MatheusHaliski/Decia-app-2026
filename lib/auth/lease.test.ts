// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEASE_KEY, withStorageLease } from "./lease";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fakeJwt = (expSeconds: number) => `h.${btoa(JSON.stringify({ exp: expSeconds })).replace(/=+$/, "")}.s`;

/** Bloco 4 (D-61, Codex no PR #39): sem Web Locks, a renovação entre abas é serializada pelo arrendamento no localStorage. */
describe("arrendamento da renovação entre abas (sem navigator.locks)", () => {
  beforeEach(() => localStorage.clear());

  it("duas chamadas concorrentes nunca rodam ao mesmo tempo, e ambas rodam", async () => {
    let inFlight = 0;
    let max = 0;
    const work = (id: string) => async () => {
      inFlight++; max = Math.max(max, inFlight);
      await new Promise((r) => setTimeout(r, 40));
      inFlight--;
      return id;
    };
    const out = await Promise.all([withStorageLease(work("a")), withStorageLease(work("b"))]);
    expect(out.sort()).toEqual(["a", "b"]);
    expect(max).toBe(1);
    expect(localStorage.getItem(LEASE_KEY)).toBeNull();   // libera ao terminar
  });

  it("arrendamento vencido (aba que fechou no meio) não trava: é tomado e a função roda", async () => {
    localStorage.setItem(LEASE_KEY, JSON.stringify({ owner: "aba-morta", until: Date.now() - 1 }));
    await expect(withStorageLease(async () => "ok")).resolves.toBe("ok");
  });

  it("sem localStorage roda direto", async () => {
    await expect(withStorageLease(async () => "direto", { storage: null })).resolves.toBe("direto");
  });
});

describe("restaurar a sessão em duas abas ao mesmo tempo (sem navigator.locks)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "ws_rt_h=1; path=/";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "ws_rt_h=; path=/; max-age=0";
    vi.resetModules();
  });

  it("só uma renovação por vez chega ao BFF (o cookie girado nunca é reapresentado em paralelo)", async () => {
    expect((navigator as Navigator & { locks?: unknown }).locks).toBeUndefined();
    let inFlight = 0;
    let max = 0;
    fetchMock.mockImplementation(async (url) => {
      if (!String(url).endsWith("/bff/auth/refresh")) return json(404, {});
      inFlight++; max = Math.max(max, inFlight);
      await new Promise((r) => setTimeout(r, 40));
      inFlight--;
      return json(200, { accessToken: fakeJwt(Math.floor(Date.now() / 1000) + 900) });
    });
    // duas "abas": duas instâncias do módulo, cada uma com o seu estado em memória, dividindo localStorage e cookies
    vi.resetModules();
    const tabA = await import("@/lib/api/client");
    vi.resetModules();
    const tabB = await import("@/lib/api/client");
    expect(tabA).not.toBe(tabB);
    const [a, b] = await Promise.all([tabA.restoreSession(), tabB.restoreSession()]);
    expect([a, b]).toEqual([true, true]);
    expect(max).toBe(1);
    tabA.tokenStore.clear();
    tabB.tokenStore.clear();
  });
});
