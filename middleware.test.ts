import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "./next.config";
import { csp, middleware } from "./middleware";

const BASE = "http://localhost:3000";
const run = (path: string, cookie?: string) => middleware(new NextRequest(`${BASE}${path}`, { headers: cookie ? { cookie } : {} }));
const location = (res: Response) => {
  const loc = res.headers.get("location");
  return loc ? new URL(loc) : null;
};

describe("CSP do middleware", () => {
  it("usa nonce, bloqueia iframe e não libera script inline nem origem externa", () => {
    const policy = csp("n0nce==");
    expect(policy).toContain("script-src 'self' 'nonce-n0nce==' 'strict-dynamic'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).not.toContain("'unsafe-inline' 'nonce");       // script nunca com unsafe-inline
    expect(policy).not.toMatch(/script-src[^;]*\*/);              // nenhum curinga em script-src
    expect(policy).toMatch(/connect-src 'self' https?:\/\/[^ ;]+/);
  });
});

/** Bloco 4 (D-60/D-61) — testes-guarda: rota protegida, `next` sem open redirect e cabeçalhos de segurança. */
describe("middleware: proteção de rotas e cabeçalhos (Bloco 4)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rota protegida sem sessão redireciona para /login?next=<caminho com query>", () => {
    for (const path of ["/tasks", "/settings?tab=sessoes", "/admin", "/decia/decisoes/d-1", "/tasks/new", "/projects/exemplo/mirror", "/settings/qualquer"]) {
      const res = run(path);
      expect(res.status, path).toBe(307);
      const loc = location(res)!;
      expect(loc.origin).toBe(BASE);
      expect(loc.pathname).toBe("/login");
      expect(loc.searchParams.get("next")).toBe(path);
    }
  });

  it("com o cookie-sinal da sessão a rota protegida passa; rotas do visitante continuam públicas", () => {
    expect(run("/tasks", "ws_rt_h=1").status).toBe(200);
    expect(run("/tasks", "ws_rt_h=0").status).toBe(307);
    // célula VISITANTE ≠ O na matriz (registry): Mural, Buscar, /u/[username], /tasks/[id] (D-93), auth e lab
    for (const path of ["/mural", "/search", "/memory", "/companies/secretaria-exemplo", "/u/ana.exemplo", "/tasks/t-ana-etp", "/login", "/register", "/lab/design-system", "/", "/brand/logo.svg", "/bff/auth/refresh"]) {
      expect(run(path).status, path).toBe(200);
    }
  });

  it("caminho estranho no pedido não vira open redirect: o next é relativo à própria origem ou some", () => {
    const res = run("/settings/%2F%2Fevil.example");
    expect(location(res)!.origin).toBe(BASE);
    const next = location(res)!.searchParams.get("next");
    expect(next === null || (next.startsWith("/") && !next.startsWith("//"))).toBe(true);
  });

  it("WS_ROUTE_GUARD=off desliga só a proteção (lab sem backend); a CSP continua", () => {
    vi.stubEnv("WS_ROUTE_GUARD", "off");
    const res = run("/tasks");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("toda resposta do middleware (inclusive o redirect) leva CSP com nonce novo, HSTS, frame-ancestors e Referrer-Policy", () => {
    for (const res of [run("/mural"), run("/tasks")]) {
      const policy = res.headers.get("content-security-policy") ?? "";
      expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
      expect(policy).toContain("frame-ancestors 'none'");
      expect(res.headers.get("strict-transport-security")).toMatch(/max-age=\d{8,}; includeSubDomains/);
      expect(res.headers.get("x-frame-options")).toBe("DENY");
      expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    }
    const a = run("/mural").headers.get("content-security-policy");
    const b = run("/mural").headers.get("content-security-policy");
    expect(a).not.toBe(b); // nonce por requisição
  });

  it("next.config.ts aplica HSTS, Referrer-Policy, Permissions-Policy, nosniff, X-Frame-Options e COOP em todas as rotas", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === "/:path*")!;
    const h = Object.fromEntries(all.headers.map((x) => [x.key.toLowerCase(), x.value]));
    expect(h["strict-transport-security"]).toMatch(/max-age=\d{8,}; includeSubDomains/);
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["cross-origin-opener-policy"]).toBe("same-origin");
  });
});
