import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./[action]/route";

const call = (action: string, body: unknown = {}, init: { origin?: string | null; cookie?: string; headers?: Record<string, string> } = {}) => {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000");
  if (init.cookie) headers.set("cookie", init.cookie);
  for (const [k, v] of Object.entries(init.headers ?? {})) headers.set(k, v);
  const req = new NextRequest("http://localhost:3000/bff/auth/" + action, { method: "POST", headers, body: JSON.stringify(body) });
  return POST(req, { params: Promise.resolve({ action }) });
};
const upstream = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

/** BFF da sessão (RF1/RF2, D-14): refresh token só em cookie HttpOnly; o navegador recebe só o access token. */
describe("POST /bff/auth/[action]", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("login: guarda ws_rt HttpOnly/SameSite=Strict/path=/bff/auth e o cookie-sinal; devolve o Session sem refreshToken", async () => {
    fetchMock.mockResolvedValueOnce(upstream(200, { accessToken: "a", refreshToken: "r", refreshExpiresAt: new Date(Date.now() + 86400_000).toISOString(), user: { id: "u" } }, { "x-correlation-id": "c-1" }));
    const res = await call("login", { identifier: "x", password: "y" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBe("a");
    expect(body.refreshToken).toBeUndefined();
    expect(res.headers.get("x-correlation-id")).toBe("c-1");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const rt = res.cookies.get("ws_rt")!;
    expect(rt.value).toBe("r");
    expect(rt.httpOnly).toBe(true);
    expect(rt.sameSite).toBe("strict");
    expect(rt.path).toBe("/bff/auth");
    expect(res.cookies.get("ws_rt_h")!.value).toBe("1");
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(/\/api\/auth\/login$/);
  });

  it("register repassa 202 Receipt; confirm abre sessão por /email-verification/confirm; ação desconhecida 404", async () => {
    fetchMock.mockResolvedValueOnce(upstream(202, { status: "PENDING", maskedEmail: "p***@x" }));
    const r = await call("register", { email: "p@x" });
    expect(r.status).toBe(202);
    expect((await r.json()).maskedEmail).toBe("p***@x");
    fetchMock.mockResolvedValueOnce(upstream(200, { accessToken: "a", refreshToken: "r" }));
    const c = await call("confirm", { email: "p@x", code: "123456" });
    expect(c.status).toBe(200);
    expect(String(fetchMock.mock.calls[1]![0])).toMatch(/\/api\/auth\/email-verification\/confirm$/);
    expect(c.cookies.get("ws_rt")!.value).toBe("r");
    expect((await call("nope")).status).toBe(404);
  });

  it("anti-CSRF: origem diferente → 403 ORIGEM_INVALIDA; corpo grande → 413", async () => {
    const res = await call("login", {}, { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("ORIGEM_INVALIDA");
    const big = await call("login", { p: "x".repeat(70 * 1024) });
    expect(big.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("erros da API passam adiante com Retry-After (429/503) e API fora do ar vira 502 OFFLINE", async () => {
    fetchMock.mockResolvedValueOnce(upstream(429, { code: "MUITAS_TENTATIVAS", message: "x", correlationId: "c" }, { "retry-after": "60" }));
    const r = await call("login", { identifier: "x", password: "y" });
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("60");
    expect(r.cookies.get("ws_rt")).toBeUndefined();
    fetchMock.mockRejectedValueOnce(new TypeError("ECONNREFUSED"));
    const off = await call("login", { identifier: "x", password: "y" });
    expect(off.status).toBe(502);
    expect((await off.json()).code).toBe("OFFLINE");
  });

  it("refresh: sem cookie → 401 SEM_SESSAO; com cookie manda o token à API e renova os cookies; falha limpa os cookies", async () => {
    const none = await call("refresh");
    expect(none.status).toBe(401);
    expect(none.cookies.get("ws_rt")!.value).toBe("");
    fetchMock.mockResolvedValueOnce(upstream(200, { accessToken: "a2", refreshToken: "r2" }));
    const ok = await call("refresh", {}, { cookie: "ws_rt=r1" });
    expect(ok.status).toBe(200);
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toEqual({ refreshToken: "r1" });
    expect(ok.cookies.get("ws_rt")!.value).toBe("r2");
    fetchMock.mockResolvedValueOnce(upstream(401, { code: "SESSAO_ENCERRADA" }));
    const bad = await call("refresh", {}, { cookie: "ws_rt=r2" });
    expect(bad.status).toBe(401);
    expect(bad.cookies.get("ws_rt")!.maxAge).toBe(0);
  });

  it("logout SEMPRE apaga os cookies, mesmo com a API fora do ar ou 401", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("down"));
    const off = await call("logout", {}, { cookie: "ws_rt=r" });
    expect(off.status).toBe(502);
    expect(off.cookies.get("ws_rt")!.maxAge).toBe(0);
    fetchMock.mockResolvedValueOnce(upstream(401, { code: "NAO_AUTENTICADO" })).mockResolvedValueOnce(upstream(200, { accessToken: "a", refreshToken: "r" })).mockResolvedValueOnce(upstream(204, null));
    const renewed = await call("logout", {}, { cookie: "ws_rt=r" });
    expect(renewed.status).toBe(204);
    expect(renewed.cookies.get("ws_rt_h")!.maxAge).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("assina só o X-Real-IP do proxy de borda; X-Forwarded-For (controlado pelo cliente) nunca é assinado", async () => {
    vi.stubEnv("EDGE_PROXY_SECRET", "s".repeat(32));
    try {
      const sent = () => new Headers(fetchMock.mock.lastCall![1]!.headers as Record<string, string>);
      fetchMock.mockResolvedValue(upstream(401, { code: "CREDENCIAIS_INVALIDAS" }));
      await call("login", {}, { headers: { "x-forwarded-for": "203.0.113.9" } });
      expect(sent().get("X-Ws-Client-Ip")).toBeNull();
      expect(sent().get("X-Ws-Proxy-Sig")).toBeNull();
      await call("login", {}, { headers: { "x-real-ip": "198.51.100.7", "x-forwarded-for": "203.0.113.9" } });
      expect(sent().get("X-Ws-Client-Ip")).toBe("198.51.100.7");
      expect(sent().get("X-Ws-Proxy-Sig")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
