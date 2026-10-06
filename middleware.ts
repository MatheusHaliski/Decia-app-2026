import { NextResponse, type NextRequest } from "next/server";
import { SESSION_HINT_COOKIE, requiresSession } from "@/lib/auth/guard";
import { loginUrl } from "@/lib/auth/next";

/**
 * Cabeçalhos de segurança por requisição (OWASP A03/A05):
 * - Content-Security-Policy com nonce novo a cada resposta: só roda script do próprio site com o nonce; o Next aplica o
 *   nonce aos scripts dele ao ler a CSP da requisição. `frame-ancestors 'none'` + X-Frame-Options DENY (next.config.ts)
 *   impedem embutir o app em iframe; `connect-src` só a própria origem e a API.
 * - HSTS (também em next.config.ts, repetido aqui para respostas do middleware).
 * Os demais cabeçalhos fixos (nosniff, Referrer-Policy, Permissions-Policy, COOP) ficam em next.config.ts.
 *
 * Proteção de rotas (Bloco 4, D-60): rota que o visitante não vê (matriz de lib/pages/registry.ts) sem o cookie-sinal da sessão
 * (`ws_rt_h`, gravado pelo BFF junto com o refresh token HttpOnly) → 307 para `/login?next=<caminho>`, com `next` saneado por
 * `safeNext` (sem open redirect). É experiência de uso: quem forja o cookie-sinal só vê o esqueleto da página — os dados vêm da API,
 * que exige o access token. `WS_ROUTE_GUARD=off` desliga só para o lab sem backend (D-60/Q-160); o padrão é ligado.
 */
const API = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "");
const PROD = process.env.NODE_ENV === "production";

export function csp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${PROD ? "" : " 'unsafe-eval'"}`, // unsafe-eval só no dev server (HMR)
    "style-src 'self' 'unsafe-inline'", // estilos inline do React (style={…}); sem script inline em lugar nenhum
    `img-src 'self' data: blob: ${API}`,
    "font-src 'self' data:",
    `connect-src 'self' ${API}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(PROD ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** Proteção de rotas ligada salvo `WS_ROUTE_GUARD=off` explícito (lido a cada requisição: o teste troca o valor). */
export const routeGuardEnabled = () => (process.env.WS_ROUTE_GUARD ?? "").trim().toLowerCase() !== "off";

export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);

  const { pathname, search } = req.nextUrl;
  const signedIn = req.cookies.get(SESSION_HINT_COOKIE)?.value === "1";
  const res = routeGuardEnabled() && !signedIn && requiresSession(pathname)
    ? NextResponse.redirect(new URL(loginUrl(`${pathname}${search}`), req.nextUrl.origin), 307)
    : NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", policy);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  // tudo recebe a CSP, inclusive /public; ficam de fora só os pacotes do Next
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
