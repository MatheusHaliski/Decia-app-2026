import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/next";
import { callApi, secureCookie, setSessionCookies } from "../bff-session";

/**
 * Login institucional no BFF (RF2.CA03, Bloco 4, D-63): Authorization Code + PKCE (S256) + `state` + `nonce`, atrás de
 * `WS_OIDC_ENABLED` (padrão desligado → 404). O navegador nunca vê o `code_verifier`, o `id_token` nem o refresh token:
 * 1. `GET /bff/auth/oidc/start?next=` gera `state`, `nonce` e `code_verifier` (32 bytes aleatórios cada), guarda os três num cookie
 *    HttpOnly de uso único (`__Host-ws_oidc` em HTTPS: sem Domain, path=/, Secure — um subdomínio não consegue plantá-lo;
 *    SameSite=Lax porque a volta do IdP é navegação entre sites) e redireciona ao `authorization_endpoint` com
 *    `code_challenge = BASE64URL(SHA-256(code_verifier))` e `code_challenge_method=S256`;
 * 2. `GET /bff/auth/oidc/callback?code&state` apaga o cookie SEMPRE; sem `code_verifier` válido → `400 OIDC_PKCE_AUSENTE`; `state`
 *    diferente (comparação em tempo constante) → `400 OIDC_ESTADO_INVALIDO`; troca o código no `token_endpoint` com o verifier;
 *    `nonce` do `id_token` diferente → `400 OIDC_NONCE_INVALIDO` (a API confere de novo, com a assinatura, e também responde 400);
 *    entrega `{idToken, nonce}` a `POST /api/auth/oidc/login`, grava os cookies da sessão e volta ao `next` saneado (sem open redirect).
 * Variáveis (só nomes): WS_OIDC_ENABLED, WS_OIDC_ISSUER_URI, WS_OIDC_CLIENT_ID, WS_OIDC_CLIENT_SECRET (opcional: cliente
 * confidencial com client_secret_basic), WS_FRONTEND_URL (redirect_uri público).
 */
export interface OidcConfig { issuer: string; clientId: string; clientSecret: string }
export interface Discovery { authorization_endpoint: string; token_endpoint: string; issuer: string }
interface Pending { s: string; n: string; v: string; next: string; at: number }

const TTL_SECONDS = 600;
const PROD = () => process.env.NODE_ENV === "production";
/** `code_verifier` da RFC 7636 §4.1: 43–128 caracteres não reservados. */
const VERIFIER_RE = /^[A-Za-z0-9\-._~]{43,128}$/;

export function oidcConfig(env: Record<string, string | undefined> = process.env): OidcConfig | null {
  if ((env.WS_OIDC_ENABLED ?? "").trim().toLowerCase() !== "true") return null;
  const issuer = (env.WS_OIDC_ISSUER_URI ?? "").trim().replace(/\/+$/, "");
  const clientId = (env.WS_OIDC_CLIENT_ID ?? "").trim();
  if (!issuer || !clientId) return null;
  return { issuer, clientId, clientSecret: env.WS_OIDC_CLIENT_SECRET ?? "" };
}

export const cookieName = (req: NextRequest) => (secureCookie(req) ? "__Host-ws_oidc" : "ws_oidc");

export function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export const randomToken = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

/** RFC 7636 §4.2: S256. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

/** Comparação em tempo constante (o tamanho já é público: 43 chars). */
export function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function httpsOrLocal(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || (!PROD() && (u.hostname === "localhost" || u.hostname === "127.0.0.1"));
  } catch {
    return false;
  }
}

let cached: { issuer: string; at: number; doc: Discovery } | null = null;
/** Descoberta do IdP (`/.well-known/openid-configuration`), 1 h em memória; endpoints só HTTPS e `issuer` idêntico ao configurado. */
export async function discover(cfg: OidcConfig): Promise<Discovery> {
  if (cached && cached.issuer === cfg.issuer && Date.now() - cached.at < 3_600_000) return cached.doc;
  const r = await fetch(`${cfg.issuer}/.well-known/openid-configuration`, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`discovery ${r.status}`);
  const doc = (await r.json()) as Partial<Discovery>;
  if (doc.issuer?.replace(/\/+$/, "") !== cfg.issuer || !doc.authorization_endpoint || !doc.token_endpoint
    || !httpsOrLocal(doc.authorization_endpoint) || !httpsOrLocal(doc.token_endpoint)) {
    throw new Error("discovery inválida");
  }
  cached = { issuer: cfg.issuer, at: Date.now(), doc: doc as Discovery };
  return cached.doc;
}
/** Testes: esquece a descoberta em cache. */
export const resetDiscovery = () => { cached = null; };

export function redirectUri(req: NextRequest): string {
  const pub = process.env.WS_FRONTEND_URL?.trim().replace(/\/+$/, "");
  return `${pub || req.nextUrl.origin}/bff/auth/oidc/callback`;
}

const fail = (status: number, code: string) =>
  NextResponse.json({ status, code }, { status, headers: { "Cache-Control": "no-store" } });
export const disabled = () => fail(404, "OIDC_DESLIGADO");

function encodePending(p: Pending): string {
  return b64url(new TextEncoder().encode(JSON.stringify(p)));
}
function decodePending(raw: string | undefined): Partial<Pending> | null {
  if (!raw) return null;
  try {
    const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(raw.length / 4) * 4, "="));
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(json, (c) => c.charCodeAt(0)))) as Partial<Pending>;
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

/** Payload do id_token SEM validar assinatura — só para conferir o nonce aqui; a API valida assinatura/iss/aud/exp/nonce. */
export function idTokenNonce(idToken: string): string | null {
  const part = idToken.split(".")[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const nonce = (JSON.parse(json) as { nonce?: unknown }).nonce;
    return typeof nonce === "string" ? nonce : null;
  } catch {
    return null;
  }
}

export async function start(req: NextRequest): Promise<NextResponse> {
  const cfg = oidcConfig();
  if (!cfg) return disabled();
  let doc: Discovery;
  try { doc = await discover(cfg); } catch { return fail(502, "OIDC_IDP_INDISPONIVEL"); }
  const pending: Pending = { s: randomToken(), n: randomToken(), v: randomToken(), next: safeNext(req.nextUrl.searchParams.get("next")), at: Date.now() };
  const url = new URL(doc.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", redirectUri(req));
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", pending.s);
  url.searchParams.set("nonce", pending.n);
  url.searchParams.set("code_challenge", await pkceChallenge(pending.v));
  url.searchParams.set("code_challenge_method", "S256");
  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set(cookieName(req), encodePending(pending), { httpOnly: true, secure: secureCookie(req), sameSite: "lax", path: "/", maxAge: TTL_SECONDS });
  return res;
}

export async function callback(req: NextRequest): Promise<NextResponse> {
  const cfg = oidcConfig();
  if (!cfg) return disabled();
  const name = cookieName(req);
  const pending = decodePending(req.cookies.get(name)?.value);
  const done = (res: NextResponse) => { res.cookies.set(name, "", { path: "/", maxAge: 0 }); return res; };   // uso único, sempre
  const q = req.nextUrl.searchParams;
  if (q.get("error")) return done(NextResponse.redirect(new URL("/login?reason=oidc-error", req.nextUrl.origin), 303));
  if (!pending || typeof pending.v !== "string" || !VERIFIER_RE.test(pending.v)) return done(fail(400, "OIDC_PKCE_AUSENTE"));
  const state = q.get("state") ?? "";
  if (typeof pending.s !== "string" || !sameSecret(state, pending.s)) return done(fail(400, "OIDC_ESTADO_INVALIDO"));
  if (typeof pending.at !== "number" || Date.now() - pending.at > TTL_SECONDS * 1000) return done(fail(400, "OIDC_ESTADO_INVALIDO"));
  const code = q.get("code");
  if (!code || code.length > 4096 || typeof pending.n !== "string") return done(fail(400, "OIDC_CODIGO_INVALIDO"));

  let doc: Discovery;
  try { doc = await discover(cfg); } catch { return done(fail(502, "OIDC_IDP_INDISPONIVEL")); }
  const form = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri(req), client_id: cfg.clientId, code_verifier: pending.v });
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  if (cfg.clientSecret) headers.Authorization = `Basic ${btoa(`${encodeURIComponent(cfg.clientId)}:${encodeURIComponent(cfg.clientSecret)}`)}`;
  let idToken: string | null = null;
  try {
    const r = await fetch(doc.token_endpoint, { method: "POST", headers, body: form.toString(), cache: "no-store" });
    const body = (await r.json().catch(() => null)) as { id_token?: unknown } | null;
    if (!r.ok) return done(fail(400, "OIDC_CODIGO_INVALIDO"));
    idToken = typeof body?.id_token === "string" ? body.id_token : null;
  } catch {
    return done(fail(502, "OIDC_IDP_INDISPONIVEL"));
  }
  if (!idToken) return done(fail(400, "OIDC_CODIGO_INVALIDO"));
  const nonce = idTokenNonce(idToken);
  if (!nonce || !sameSecret(nonce, pending.n)) return done(fail(400, "OIDC_NONCE_INVALIDO"));

  const api = await callApi(req, "/api/auth/oidc/login", { idToken, nonce: pending.n });
  if (!api) return done(NextResponse.json({ status: 502, code: "OFFLINE", message: "API indisponível." }, { status: 502 }));
  if (api.status >= 400 || !api.data || typeof api.data.refreshToken !== "string") {
    return done(api.status === 400 ? fail(400, String(api.data?.code ?? "OIDC_NONCE_INVALIDO"))
      : NextResponse.redirect(new URL(`/login?reason=oidc-error`, req.nextUrl.origin), 303));
  }
  const res = NextResponse.redirect(new URL(safeNext(pending.next), req.nextUrl.origin), 303);
  res.headers.set("Cache-Control", "no-store");
  setSessionCookies(res, req, api.data.refreshToken, api.data.refreshExpiresAt);
  return done(res);
}
