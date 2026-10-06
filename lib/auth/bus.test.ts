import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachAuthBus, onUnauthorized, silentRefresh, tokenStore } from "@/lib/api/client";
import { AUTH_STORAGE_KEY, createAuthBus, jwtExpiry, refreshDelayMs, type AuthMessage } from "./bus";

const tick = () => new Promise((r) => setTimeout(r, 20));

/** Janela falsa com localStorage + evento `storage` entre "abas" (o navegador só entrega o evento às OUTRAS abas). */
function storageTabs() {
  const data = new Map<string, string>();
  const tabs: { fire: (e: StorageEvent) => void }[] = [];
  const make = () => {
    const handlers = new Set<(e: StorageEvent) => void>();
    const self = { fire: (e: StorageEvent) => handlers.forEach((h) => h(e)) };
    tabs.push(self);
    return {
      localStorage: {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => { data.set(k, v); tabs.filter((t) => t !== self).forEach((t) => t.fire({ key: k, newValue: v } as StorageEvent)); },
        removeItem: (k: string) => data.delete(k),
        clear: () => data.clear(),
        key: () => null,
        length: 0,
      } as Storage,
      addEventListener: (_: "storage", fn: (e: StorageEvent) => void) => handlers.add(fn),
      removeEventListener: (_: "storage", fn: (e: StorageEvent) => void) => handlers.delete(fn),
    };
  };
  return { make, data };
}

const jwt = (exp: number) => `h.${btoa(JSON.stringify({ exp })).replace(/=+$/, "")}.s`;

/** Bloco 4 (D-61) — testes-guarda do logout entre abas e da renovação silenciosa. */
describe("canal da sessão entre abas", () => {
  it("BroadcastChannel: logout publicado numa aba chega à outra", async () => {
    const a = createAuthBus({ BroadcastChannel });
    const b = createAuthBus({ BroadcastChannel });
    expect(a.kind).toBe("broadcast");
    const got: AuthMessage[] = [];
    b.subscribe((m) => got.push(m));
    a.post({ type: "logout" });
    await tick();
    expect(got).toEqual([{ type: "logout" }]);
  });

  it("fallback por evento storage quando não há BroadcastChannel; o access token NUNCA vai para o localStorage", () => {
    const tabs = storageTabs();
    const a = createAuthBus(tabs.make());
    const b = createAuthBus(tabs.make());
    expect(a.kind).toBe("storage");
    const got: AuthMessage[] = [];
    b.subscribe((m) => got.push(m));
    a.post({ type: "access", token: "segredo-do-access" });
    a.post({ type: "logout" });
    a.post({ type: "logout" }); // segundo logout também dispara (valor muda a cada envio)
    expect(got).toEqual([{ type: "refreshed" }, { type: "logout" }, { type: "logout" }]);
    expect(tabs.data.get(AUTH_STORAGE_KEY)).not.toContain("segredo-do-access");
  });

  it("mensagem alheia ou malformada é ignorada", () => {
    const tabs = storageTabs();
    createAuthBus(tabs.make());
    const b = createAuthBus(tabs.make());
    const fn = vi.fn();
    b.subscribe(fn);
    const other = tabs.make();
    other.localStorage.setItem(AUTH_STORAGE_KEY, "{não é json");
    other.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ msg: { type: "access" } }));
    other.localStorage.setItem("outra-chave", JSON.stringify({ msg: { type: "logout" } }));
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("cliente HTTP: logout em uma aba sai em todas", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => { vi.unstubAllGlobals(); attachAuthBus(createAuthBus(undefined)); });

  it("a outra aba recebe o logout pelo canal: esquece o token e avisa os ouvintes (mesmo sem token em memória)", async () => {
    attachAuthBus(createAuthBus({ BroadcastChannel }));   // esta aba
    const otherTab = createAuthBus({ BroadcastChannel }); // outra aba
    const ended = vi.fn();
    const off = onUnauthorized(ended);
    tokenStore.set("tok-da-aba-1");
    otherTab.post({ type: "logout" });
    await tick();
    expect(tokenStore.access).toBeNull();
    expect(ended).toHaveBeenCalledTimes(1);
    otherTab.post({ type: "logout" });                    // aba sem token também reage
    await tick();
    expect(ended).toHaveBeenCalledTimes(2);
    off();
  });

  it("logout feito nesta aba publica no canal para as outras", async () => {
    attachAuthBus(createAuthBus({ BroadcastChannel }));
    const otherTab = createAuthBus({ BroadcastChannel });
    const got: AuthMessage[] = [];
    otherTab.subscribe((m) => got.push(m));
    tokenStore.clear();
    await tick();
    expect(got).toContainEqual({ type: "logout" });
  });

  it("renovação silenciosa single-flight: três disparos simultâneos fazem UM refresh; 401 encerra em todas as abas", async () => {
    const otherTab = createAuthBus({ BroadcastChannel });
    attachAuthBus(createAuthBus({ BroadcastChannel }));
    const got: AuthMessage[] = [];
    otherTab.subscribe((m) => got.push(m));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ accessToken: jwt(Math.floor(Date.now() / 1000) + 900) }), { status: 200, headers: { "content-type": "application/json" } }));
    const outcomes = await Promise.all([silentRefresh(), silentRefresh(), silentRefresh()]);
    expect(outcomes).toEqual(["ok", "ok", "ok"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toBe("/bff/auth/refresh");
    await tick();
    expect(got.some((m) => m.type === "access")).toBe(true); // a outra aba recebe o token novo

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: "SESSAO_ENCERRADA" }), { status: 401 }));
    const ended = vi.fn();
    const off = onUnauthorized(ended);
    expect(await silentRefresh()).toBe("ended");
    expect(tokenStore.access).toBeNull();
    expect(ended).toHaveBeenCalledTimes(1);
    await tick();
    expect(got).toContainEqual({ type: "logout" });
    off();
  });
});

describe("agenda da renovação", () => {
  it("lê o exp do JWT e renova 60 s antes, com folga, nunca antes de 5 s", () => {
    expect(jwtExpiry(jwt(2_000_000_000))).toBe(2_000_000_000);
    expect(jwtExpiry("sem-pontos")).toBeNull();
    expect(jwtExpiry("a.###.c")).toBeNull();
    const now = 1_000_000_000_000;
    expect(refreshDelayMs(now / 1000 + 900, now, 0)).toBe(840_000);
    expect(refreshDelayMs(now / 1000 + 900, now, 1)).toBe(825_000);
    expect(refreshDelayMs(now / 1000 + 30, now, 0)).toBe(5_000);
  });
});
