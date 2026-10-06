import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as callbackGET } from "./oidc/callback/route";
import { GET as startGET } from "./oidc/start/route";
import { pkceChallenge, resetDiscovery } from "./oidc/oidc";

const ISSUER = "https://idp.exemplo.gov.br";
const DISCOVERY = { issuer: ISSUER, authorization_endpoint: `${ISSUER}/authorize`, token_endpoint: `${ISSUER}/token` };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const idToken = (claims: Record<string, unknown>) => `h.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.assinatura`;

const get = (path: string, cookie?: string) => new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });

/** Abre o fluxo e devolve o redirect ao IdP + o cookie de uso único como o navegador o reenviaria. */
async function begin(next = "/tasks") {
  const res = await startGET(get(`/bff/auth/oidc/start?next=${encodeURIComponent(next)}`));
  const cookie = res.cookies.get("ws_oidc")!;
  return { res, url: new URL(res.headers.get("location")!), cookie: `ws_oidc=${cookie.value}`, raw: cookie };
}
const pending = (cookie: string) => JSON.parse(atob(cookie.split("=")[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as { s: string; n: string; v: string };
const craft = (p: Record<string, unknown>) => `ws_oidc=${btoa(JSON.stringify(p)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

/** Bloco 4 (D-63) — testes-guarda do OIDC no BFF: PKCE S256 obrigatório, state e nonce inválidos → 400, flag desligada → 404. */
describe("BFF OIDC: Authorization Code + PKCE + state + nonce", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    resetDiscovery();
    vi.stubEnv("WS_OIDC_ENABLED", "true");
    vi.stubEnv("WS_OIDC_ISSUER_URI", ISSUER);
    vi.stubEnv("WS_OIDC_CLIENT_ID", "work-station");
    fetchMock.mockImplementation(async (url) => (String(url).endsWith("/.well-known/openid-configuration") ? json(200, DISCOVERY) : json(500, {})));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("desligado por padrão: start e callback respondem 404 OIDC_DESLIGADO", async () => {
    vi.stubEnv("WS_OIDC_ENABLED", "");
    expect((await startGET(get("/bff/auth/oidc/start"))).status).toBe(404);
    const cb = await callbackGET(get("/bff/auth/oidc/callback?code=c&state=s"));
    expect(cb.status).toBe(404);
    expect((await cb.json()).code).toBe("OIDC_DESLIGADO");
  });

  it("start manda ao IdP com code_challenge S256 do verifier guardado, state e nonce aleatórios, e cookie HttpOnly de uso único", async () => {
    const { res, url, cookie, raw } = await begin();
    expect(res.status).toBe(302);
    expect(url.origin + url.pathname).toBe(`${ISSUER}/authorize`);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const p = pending(cookie);
    expect(p.v).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(url.searchParams.get("code_challenge")).toBe(await pkceChallenge(p.v));
    expect(url.searchParams.get("code_challenge")).not.toBe(p.v);       // nunca o verifier em claro
    expect(url.searchParams.get("state")).toBe(p.s);
    expect(url.searchParams.get("nonce")).toBe(p.n);
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/bff/auth/oidc/callback");
    expect(raw.httpOnly).toBe(true);
    expect(raw.sameSite).toBe("lax");
    expect(raw.maxAge).toBe(600);
    const other = await begin();
    expect(pending(other.cookie).s).not.toBe(p.s);
  });

  it("PKCE obrigatório: callback sem code_verifier (ou com verifier inválido) → 400 OIDC_PKCE_AUSENTE e nenhuma troca de código", async () => {
    for (const cookie of [undefined, craft({ s: "estado", n: "nonce", next: "/tasks", at: Date.now() }), craft({ s: "estado", n: "nonce", v: "curto", at: Date.now() })]) {
      const res = await callbackGET(get("/bff/auth/oidc/callback?code=abc&state=estado", cookie));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("OIDC_PKCE_AUSENTE");
    }
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("/token"))).toBe(false);
  });

  it("state inválido → 400 OIDC_ESTADO_INVALIDO, sem trocar o código, e o cookie é apagado", async () => {
    const { cookie } = await begin();
    const res = await callbackGET(get("/bff/auth/oidc/callback?code=abc&state=outro-estado-qualquer-com-43-caracteres-xx", cookie));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("OIDC_ESTADO_INVALIDO");
    expect(res.cookies.get("ws_oidc")!.maxAge).toBe(0);
    const missing = await callbackGET(get("/bff/auth/oidc/callback?code=abc", cookie));
    expect(missing.status).toBe(400);
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("/token"))).toBe(false);
  });

  it("nonce do id_token diferente do guardado → 400 OIDC_NONCE_INVALIDO e a API nem é chamada", async () => {
    const { cookie } = await begin();
    const p = pending(cookie);
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/.well-known/openid-configuration")) return json(200, DISCOVERY);
      if (u.endsWith("/token")) return json(200, { id_token: idToken({ nonce: "nonce-de-outro-login", sub: "s" }) });
      return json(200, {});
    });
    const res = await callbackGET(get(`/bff/auth/oidc/callback?code=abc&state=${p.s}`, cookie));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("OIDC_NONCE_INVALIDO");
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/api/auth/oidc/login"))).toBe(false);
  });

  it("fluxo válido: troca o código com o code_verifier, entrega id_token+nonce à API, grava ws_rt HttpOnly e volta ao next saneado", async () => {
    const { cookie } = await begin("/settings?tab=sessoes");
    const p = pending(cookie);
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/.well-known/openid-configuration")) return json(200, DISCOVERY);
      if (u.endsWith("/token")) return json(200, { id_token: idToken({ nonce: p.n, sub: "s" }) });
      if (u.endsWith("/api/auth/oidc/login")) return json(200, { accessToken: "a", refreshToken: "r-oidc", user: { id: "u" } });
      return json(404, {});
    });
    const res = await callbackGET(get(`/bff/auth/oidc/callback?code=abc&state=${p.s}`, cookie));
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).pathname + new URL(res.headers.get("location")!).search).toBe("/settings?tab=sessoes");
    const token = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/token"))!;
    const form = new URLSearchParams(String(token[1]!.body));
    expect(form.get("code_verifier")).toBe(p.v);
    expect(form.get("grant_type")).toBe("authorization_code");
    const api = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/api/auth/oidc/login"))!;
    expect(JSON.parse(String(api[1]!.body))).toEqual({ idToken: expect.any(String), nonce: p.n });
    expect(res.cookies.get("ws_rt")!.value).toBe("r-oidc");
    expect(res.cookies.get("ws_rt")!.httpOnly).toBe(true);
    expect(res.cookies.get("ws_oidc")!.maxAge).toBe(0);
  });

  it("next externo no start é descartado (sem open redirect na volta)", async () => {
    const { cookie } = await begin("//evil.example");
    const p = pending(cookie);
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/.well-known/openid-configuration")) return json(200, DISCOVERY);
      if (u.endsWith("/token")) return json(200, { id_token: idToken({ nonce: p.n }) });
      return json(200, { accessToken: "a", refreshToken: "r" });
    });
    const res = await callbackGET(get(`/bff/auth/oidc/callback?code=abc&state=${p.s}`, cookie));
    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin).toBe("http://localhost:3000");
    expect(loc.pathname).toBe("/mural");
  });
});
