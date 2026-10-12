import { NextResponse, type NextRequest } from "next/server";
import { RT_COOKIE, callApi, clearSessionCookies, sameOrigin, setSessionCookies, type Json } from "../bff-session";

/**
 * BFF da sessão (RF1/RF2; ARQUITETURA §3.3, D-14): o refresh token nunca chega ao JavaScript da página. Login, cadastro,
 * renovação e saída passam por aqui; a rota chama a API (`POST /api/auth/{login|register|refresh|logout}`), guarda o
 * refresh token num cookie `ws_rt` HttpOnly + Secure + SameSite=Strict restrito a /bff/auth e devolve ao navegador só o
 * access token (fica em memória, lib/api/client.ts). Cookie-sinal `ws_rt_h=1` (sem segredo) avisa o cliente que vale
 * tentar renovar ao abrir o app.
 * - Anti-CSRF: só POST da própria origem (Origin / Sec-Fetch-Site) e cookie SameSite=Strict.
 * - IP real (D-14): `X-Ws-Client-Ip` + `X-Ws-Proxy-Ts` + `X-Ws-Proxy-Sig` = HMAC-SHA256(EDGE_PROXY_SECRET, "ip|ts").
 *   Só é assinado o cabeçalho que a borda confiável SOBRESCREVE (`WS_EDGE_IP_HEADER`, padrão X-Real-IP); X-Forwarded-For
 *   nunca é lido nem assinado — o cliente controla esse valor e escolheria o próprio balde de rate limit (revisão do
 *   PR #23). Sem EDGE_PROXY_SECRET (≥ 32 chars) ou sem o cabeçalho da borda, nada é assinado.
 * - Sem backend (etapa b): a API fora do ar vira `502 OFFLINE`, que a tela mostra como ErrorState amigável.
 */
const MAX_BODY = 64 * 1024;
const ACTIONS = new Set(["login", "register", "confirm", "refresh", "logout"]);
const UPSTREAM: Record<string, string> = { login: "/api/auth/login", register: "/api/auth/register", confirm: "/api/auth/email-verification/confirm" };

function reply(status: number, data: Json | null, upstream?: Headers): NextResponse {
  const res = status === 204 || data === null ? new NextResponse(null, { status: status === 200 ? 204 : status }) : NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  for (const h of ["x-correlation-id", "retry-after"]) {
    const v = upstream?.get(h);
    if (v) res.headers.set(h, v);
  }
  return res;
}

const offline = () => NextResponse.json({ status: 502, code: "OFFLINE", message: "API indisponível." }, { status: 502, headers: { "Cache-Control": "no-store" } });

/** Tira o refresh token da resposta e o guarda no cookie HttpOnly. */
function withSession(req: NextRequest, status: number, data: Json | null, upstream: Headers): NextResponse {
  if (status >= 200 && status < 300 && data && typeof data.refreshToken === "string") {
    const { refreshToken, ...rest } = data;
    const res = reply(status, rest, upstream);
    setSessionCookies(res, req, refreshToken, data.refreshExpiresAt);
    return res;
  }
  return reply(status, data, upstream);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!ACTIONS.has(action)) return NextResponse.json({ status: 404, code: "NAO_ENCONTRADO" }, { status: 404 });
  if (!sameOrigin(req)) return NextResponse.json({ status: 403, code: "ORIGEM_INVALIDA" }, { status: 403 });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ status: 413, code: "CORPO_GRANDE" }, { status: 413 });

  if (action === "login" || action === "register" || action === "confirm") {
    const r = await callApi(req, UPSTREAM[action]!, raw || "{}");
    return r ? withSession(req, r.status, r.data, r.headers) : offline();
  }

  if (action === "refresh") {
    const token = req.cookies.get(RT_COOKIE)?.value;
    if (!token) {
      const res = NextResponse.json({ status: 401, code: "SEM_SESSAO" }, { status: 401, headers: { "Cache-Control": "no-store" } });
      clearSessionCookies(res);
      return res;
    }
    const r = await callApi(req, "/api/auth/refresh", { refreshToken: token });
    if (!r) return offline();
    if (r.status >= 400) {
      const res = reply(401, r.data ?? { status: 401, code: "SESSAO_ENCERRADA" }, r.headers);
      clearSessionCookies(res);
      return res;
    }
    return withSession(req, r.status, r.data, r.headers);
  }

  // logout: encerra na API e SEMPRE apaga os cookies deste navegador, mesmo com a API fora do ar ou access token vencido
  let r = await callApi(req, "/api/auth/logout", null);
  const refreshToken = req.cookies.get(RT_COOKIE)?.value;
  if (r?.status === 401 && refreshToken) {
    const renewed = await callApi(req, "/api/auth/refresh", { refreshToken });
    const access = renewed && renewed.status < 300 && typeof renewed.data?.accessToken === "string" ? renewed.data.accessToken : null;
    if (access) r = await callApi(req, "/api/auth/logout", null, `Bearer ${access}`);
  }
  const res = !r ? offline() : r.status >= 400 && r.status !== 401 ? reply(r.status, r.data, r.headers) : reply(204, null, r.headers);
  clearSessionCookies(res);
  return res;
}
