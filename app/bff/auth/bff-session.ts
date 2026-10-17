import { NextResponse, type NextRequest } from "next/server";
import { clientIp } from "./edge-ip";

/**
 * Peças comuns do BFF da sessão (`[action]/route.ts` e o login institucional `oidc/*`): chamada à API com o IP assinado (D-14),
 * anti-CSRF por origem e os cookies `ws_rt` (HttpOnly, path=/bff/auth) + `ws_rt_h` (sinal sem segredo, path=/).
 */
export const API = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").trim().replace(/\/+$/, "");
export const RT_COOKIE = "ws_rt";
export const RT_HINT_COOKIE = "ws_rt_h";
export const RT_PATH = "/bff/auth";

export type Json = Record<string, unknown>;

async function hmacB64url(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function upstreamHeaders(req: NextRequest, authorization?: string): Promise<Record<string, string>> {
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

export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  const pub = process.env.WS_FRONTEND_URL?.trim().replace(/\/+$/, "");
  return origin === req.nextUrl.origin || (!!pub && origin === pub);
}

export const secureCookie = (req: NextRequest) => process.env.NODE_ENV === "production" || req.nextUrl.protocol === "https:";

/** Acima disto o refresh é de "Manter conectado" (30 d); abaixo, de sessão curta (24 h) — `SessionPolicy` no backend. */
export const PERSISTENT_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/**
 * Grava o refresh (HttpOnly) e o sinal. Sem "Manter conectado" os dois são cookies de SESSÃO do navegador (sem Max-Age): fechar o
 * navegador — ou a janela anônima — encerra a sessão neste aparelho (D-146). Com "Manter conectado" valem até o fim do refresh.
 */
export function setSessionCookies(res: NextResponse, req: NextRequest, refreshToken: string, refreshExpiresAt: unknown) {
  const until = typeof refreshExpiresAt === "string" ? Date.parse(refreshExpiresAt) : NaN;
  const persistent = Number.isFinite(until) && until - Date.now() > PERSISTENT_THRESHOLD_MS;
  const life = persistent ? { maxAge: Math.max(60, Math.floor((until - Date.now()) / 1000)) } : {};
  const secure = secureCookie(req);
  res.cookies.set(RT_COOKIE, refreshToken, { httpOnly: true, secure, sameSite: "strict", path: RT_PATH, ...life });
  res.cookies.set(RT_HINT_COOKIE, "1", { httpOnly: false, secure, sameSite: "strict", path: "/", ...life });
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(RT_COOKIE, "", { path: RT_PATH, maxAge: 0 });
  res.cookies.set(RT_HINT_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function callApi(req: NextRequest, path: string, body: Json | string | null, authorization?: string): Promise<{ status: number; data: Json | null; headers: Headers } | null> {
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

