import { NextResponse, type NextRequest } from "next/server";

/**
 * BFF da sessão (RF1/RF2; ARQUITETURA §3.3, D-14): o refresh token nunca chega ao JavaScript da página. Login, cadastro,
 * renovação e saída passam por aqui; a rota chama a API (`POST /api/auth/{login|register|refresh|logout}`), guarda o
 * refresh token num cookie `ws_rt` HttpOnly + Secure + SameSite=Strict restrito a /bff/auth e devolve ao navegador só o
 * access token (fica em memória, lib/api/client.ts). Cookie-sinal `ws_rt_h=1` (sem segredo) avisa o cliente que vale
 * tentar renovar ao abrir o app.
 * - Anti-CSRF: só POST da própria origem (Origin / Sec-Fetch-Site) e cookie SameSite=Strict.
 * - IP real (D-14): `X-Ws-Client-Ip` + `X-Ws-Proxy-Ts` + `X-Ws-Proxy-Sig` = HMAC-SHA256(EDGE_PROXY_SECRET, "ip|ts");
 *   o backend nunca lê X-Forwarded-For. Sem EDGE_PROXY_SECRET (≥ 32 chars) os cabeçalhos não são enviados.
 * - Sem backend (etapa b): a API fora do ar vira `502 OFFLINE`, que a tela mostra como ErrorState amigável.
 */
const API = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").trim().replace(/\/+$/, "");
const RT_COOKIE = "ws_rt";
const RT_HINT_COOKIE = "ws_rt_h";
const RT_PATH = "/bff/auth";
const MAX_BODY = 64 * 1024;
const ACTIONS = new Set(["login", "register", "refresh", "logout"]);

type Json = Record<string, unknown>;

function clientIp(req: NextRequest): string | null {
  const ip = (req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
  return /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : null;
}

async function hmacB64url(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function upstreamHeaders(req: NextRequest, authorization?: string): Promise<Record<string, string>> {
  const h: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  for (const name of ["accept-language", "user-agent", "authorization", "x-correlation-id"]) {
    const v = req.headers.get(name);
    if (v) h[name] = v;
  }
  if (authorization) h.authorization = authorization;
  const secret = process.env.EDGE_PROXY_SECRET?.trim();
  const ip = clientIp(req);
  if (secret && secret.length >= 32 && ip) {
    const ts = String(Math.floor(Date.now() / 1000));
    Object.assign(h, { "X-Ws-Client-Ip": ip, "X-Ws-Proxy-Ts": ts, "X-Ws-Proxy-Sig": await hmacB64url(secret, `${ip}|${ts}`) });
  }
  return h;
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  const pub = process.env.WS_FRONTEND_URL?.trim().replace(/\/+$/, "");
  return origin === req.nextUrl.origin || (!!pub && origin === pub);
}

const secureCookie = (req: NextRequest) => process.env.NODE_ENV === "production" || req.nextUrl.protocol === "https:";

function setSessionCookies(res: NextResponse, req: NextRequest, refreshToken: string, refreshExpiresAt: unknown) {
  const until = typeof refreshExpiresAt === "string" ? Date.parse(refreshExpiresAt) : NaN;
  const maxAge = Number.isFinite(until) ? Math.max(60, Math.floor((until - Date.now()) / 1000)) : 24 * 60 * 60;
  const secure = secureCookie(req);
  res.cookies.set(RT_COOKIE, refreshToken, { httpOnly: true, secure, sameSite: "strict", path: RT_PATH, maxAge });
  res.cookies.set(RT_HINT_COOKIE, "1", { httpOnly: false, secure, sameSite: "strict", path: "/", maxAge });
}

function clearSessionCookies(res: NextResponse) {
  res.cookies.set(RT_COOKIE, "", { path: RT_PATH, maxAge: 0 });
  res.cookies.set(RT_HINT_COOKIE, "", { path: "/", maxAge: 0 });
}

async function callApi(req: NextRequest, path: string, body: Json | string | null, authorization?: string): Promise<{ status: number; data: Json | null; headers: Headers } | null> {
  try {
    const r = await fetch(`${API}${path}`, {
      method: "POST", headers: await upstreamHeaders(req, authorization), cache: "no-store",
      body: body === null ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await r.text();
    let data: Json | null = null;
    try { data = text ? (JSON.parse(text) as Json) : null; } catch { data = null; }
    return { status: r.status, data, headers: r.headers };
  } catch {
    return null;
  }
}

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

  if (action === "login" || action === "register") {
    const r = await callApi(req, `/api/auth/${action}`, raw || "{}");
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
