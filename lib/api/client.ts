/**
 * Cliente HTTP da API Work Station (contrato do Bloco 3: `POST /api/auth/login|register|refresh|logout`, erros
 * `{code, message, details, correlationId}`). Access token SÓ em memória; refresh token em cookie `ws_rt` HttpOnly
 * gravado pelo BFF (`app/bff/auth/[action]/route.ts`) e nunca visível ao JavaScript. Ao abrir o app a sessão volta por
 * `/bff/auth/refresh` quando o cookie-sinal `ws_rt_h=1` (sem segredo) existe. Arquitetura herdada do FAI (ARQUITETURA §3.3, §4).
 */
import { tr } from "@/lib/i18n/core";
import { acceptLanguage, getCurrentLocale } from "@/lib/i18n/state";
import { createAuthBus, jwtExpiry, refreshDelayMs, type AuthBus, type AuthMessage } from "@/lib/auth/bus";
import { withStorageLease } from "@/lib/auth/lease";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
export const API_BASE = (RAW_API_BASE && RAW_API_BASE.trim() ? RAW_API_BASE : "http://localhost:8080").replace(/\/+$/, "");
export const SESSION_HINT_COOKIE = "ws_rt_h";

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;
  correlationId?: string;
  retryAfterSeconds?: number;
  constructor(status: number, code: string, message: string, details?: Record<string, unknown>, correlationId?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details ?? {};
    this.correlationId = correlationId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
  /** Mensagens por campo (422 VALIDACAO com `details` por campo, RF1.CA01). */
  get fields(): Record<string, string> {
    const f = (this.details?.fields ?? this.details) as unknown;
    if (!f || typeof f !== "object") return {};
    return Object.fromEntries(Object.entries(f as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  }
}

/** Mensagem amigável e traduzida para um erro de API (401/403/409/422/429/503/offline), com o correlationId quando houver. */
export function describeError(e: unknown): string {
  if (!(e instanceof ApiError)) return tr("error.generic", { correlationId: "—" });
  const vars = { correlationId: e.correlationId ?? "—", seconds: e.retryAfterSeconds ?? 60 };
  if (e.status === 0) return tr("error.offline");
  if (e.status === 401) return tr("error.unauthorized");
  if (e.status === 403) return tr("error.forbidden");
  if (e.status === 429) return tr("error.tooMany", vars);
  if (e.status === 502 || e.status === 503) return tr("error.unavailable");
  if (e.status === 422 || e.status === 400) return tr("error.validation");
  if (e.status === 409) return e.message || tr("error.conflict");
  return tr("error.generic", vars);
}

let accessToken: string | null = null;
let sharedAt = 0;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
/** Chamado quando a sessão acabou (logout em outra aba, sessão encerrada em Configurações › Sessões, refresh recusado). */
export function onUnauthorized(l: Listener) { unauthorizedListeners.add(l); return () => unauthorizedListeners.delete(l); }

function stopTimer() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

/** Renovação silenciosa (Bloco 4, D-61): agenda o refresh 60 s (± folga) antes do `exp` do access token. */
function schedule(token: string) {
  stopTimer();
  if (typeof window === "undefined") return;
  const exp = jwtExpiry(token);
  if (exp === null) return;
  refreshTimer = setTimeout(() => { void silentRefresh(); }, refreshDelayMs(exp));
}

/** A sessão acabou: esquece o token, para o timer, avisa as outras abas (se veio daqui) e os ouvintes desta aba. */
function sessionEnded(broadcast: boolean) {
  accessToken = null;
  stopTimer();
  if (broadcast) bus.post({ type: "logout" });
  unauthorizedListeners.forEach((l) => l());
}

function onBusMessage(msg: AuthMessage) {
  if (msg.type === "access") { accessToken = msg.token; sharedAt = Date.now(); schedule(msg.token); }
  if (msg.type === "refreshed") sharedAt = Date.now();
  // logout em outra aba sai nesta também — mesmo sem token em memória (a aba pode nem ter chamado a API ainda)
  if (msg.type === "logout") sessionEnded(false);
}

let bus: AuthBus = createAuthBus();
let unsubscribeBus = bus.subscribe(onBusMessage);
/** Troca o canal entre abas (testes: duas "abas" no mesmo processo). */
export function attachAuthBus(next: AuthBus) {
  unsubscribeBus();
  bus = next;
  unsubscribeBus = bus.subscribe(onBusMessage);
}

export const tokenStore = {
  get access() { return accessToken; },
  set(access: string) {
    accessToken = access;
    sharedAt = Date.now();
    schedule(access);
    bus.post({ type: "access", token: access });
  },
  /** Saída feita NESTA aba (logout): limpa e avisa as outras abas; quem chamou cuida da navegação. */
  clear() {
    accessToken = null;
    stopTimer();
    bus.post({ type: "logout" });
  },
  /** Há sessão para restaurar? (cookie-sinal sem segredo gravado pelo BFF) */
  get restorable() {
    if (typeof document === "undefined") return false;
    return new RegExp(`(?:^|;\\s*)${SESSION_HINT_COOKIE}=1`).test(document.cookie);
  },
};

/** Sessão ativa ou restaurável — decide se vale chamar a API de preferências, notificações etc. */
export const hasSession = () => !!accessToken || tokenStore.restorable;

/** Serializa a renovação entre abas (a rotação do refresh token invalida o anterior). */
async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  return locks ? locks.request("ws-auth-refresh", fn) : withStorageLease(fn);
}

type RefreshOutcome = "ok" | "ended" | "offline";
let refreshing: Promise<RefreshOutcome> | null = null;
/** Single-flight: chamadas simultâneas nesta aba esperam a MESMA renovação; entre abas, o Web Lock + `sharedAt`. */
function refreshOnce(): Promise<RefreshOutcome> {
  if (refreshing) return refreshing;
  const startedAt = Date.now();
  refreshing = withRefreshLock<RefreshOutcome>(async () => {
    if (sharedAt > startedAt && accessToken) return "ok";
    try {
      const res = await fetch("/bff/auth/refresh", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (res.status === 401) return "ended";
      if (!res.ok) return "offline";
      const s = (await res.json()) as { accessToken?: unknown };
      if (typeof s.accessToken !== "string") return "offline";
      tokenStore.set(s.accessToken);
      return "ok";
    } catch {
      return "offline";
    }
  }).finally(() => { refreshing = null; });
  return refreshing;
}

async function tryRefresh(): Promise<boolean> {
  return (await refreshOnce()) === "ok";
}

/** Disparada pelo timer: sessão recusada (401) sai em todas as abas; API fora do ar tenta de novo em 30 s. */
export async function silentRefresh(): Promise<RefreshOutcome> {
  const outcome = await refreshOnce();
  if (outcome === "ended") sessionEnded(true);
  if (outcome === "offline" && accessToken && typeof window !== "undefined") {
    stopTimer();
    refreshTimer = setTimeout(() => { void silentRefresh(); }, 30_000);
  }
  return outcome;
}

/** Restaura a sessão ao abrir o app (cookie HttpOnly → access token em memória) e agenda a renovação silenciosa. */
export async function restoreSession(): Promise<boolean> {
  if (accessToken) return true;
  if (!tokenStore.restorable) return false;
  const outcome = await refreshOnce();
  if (outcome === "ended") sessionEnded(true); // o BFF já apagou os cookies: a sessão acabou em todas as abas
  return outcome === "ok";
}

export interface RequestOptions {
  /** Não envia Authorization nem tenta renovar (rotas públicas). */
  anonymous?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function parseError(res: Response): Promise<ApiError> {
  const retry = Number(res.headers.get("Retry-After"));
  const retryAfter = Number.isFinite(retry) && retry > 0 ? retry : undefined;
  try {
    const body = (await res.json()) as { status?: number; code?: string; message?: string; details?: Record<string, unknown>; correlationId?: string };
    return new ApiError(body.status ?? res.status, body.code ?? "ERRO", body.message ?? res.statusText, body.details, body.correlationId ?? res.headers.get("X-Correlation-Id") ?? undefined, retryAfter);
  } catch {
    return new ApiError(res.status, res.status === 0 ? "OFFLINE" : "ERRO", res.statusText, undefined, res.headers.get("X-Correlation-Id") ?? undefined, retryAfter);
  }
}

/** Caminhos vindos de parâmetros de rota: nada de "..", barra invertida ou caractere de controle. */
export function checkPath(path: string) {
  const bare = path.split("?")[0] ?? "";
  if (/[\u0000-\u001F\\]/.test(bare) || /(^|\/)(\.|%2e){2}(\/|$)/i.test(bare) || /%2f/i.test(bare) || !bare.startsWith("/")) {
    throw new ApiError(400, "CAMINHO_INVALIDO", tr("error.offline"));
  }
}

async function request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}, retry = true): Promise<T> {
  checkPath(path);
  const bff = path.startsWith("/bff/");
  const headers: Record<string, string> = { Accept: "application/json", "Accept-Language": acceptLanguage(getCurrentLocale()), ...(opts.headers ?? {}) };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  // Sem token mas com sessão restaurável: espera a renovação única ANTES de chamar a API. Antes, cada carga de página enviava as
  // chamadas sem token, colhia 401 e disparava renovações em cascata — mais chances de navegar com uma rotação em voo (P18).
  if (!opts.anonymous && !bff && !tokenStore.access && tokenStore.restorable) await refreshOnce();
  const token = opts.anonymous ? null : tokenStore.access;
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(bff ? path : `${API_BASE}${path}`, {
      method, headers, body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body), signal: opts.signal,
      cache: "no-store", credentials: "same-origin",
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "OFFLINE", tr("error.offline"));
  }
  if (res.status === 401 && !opts.anonymous && !bff && retry && (token || tokenStore.restorable)) {
    if (await tryRefresh()) return request<T>(method, path, body, opts, false);
    sessionEnded(true);
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.blob()) as T;
}

export const api = {
  get: <T,>(path: string, opts?: RequestOptions) => request<T>("GET", path, undefined, opts),
  post: <T,>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, body ?? {}, opts),
  put: <T,>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, body ?? {}, opts),
  patch: <T,>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, body ?? {}, opts),
  delete: <T,>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, undefined, opts),
};

/** Sessão (RF2) pelo BFF: o refresh token fica no cookie; só o access token volta para a memória (contrato Bloco 3: `Session`). */
export interface SessionUser { id: string; username: string; displayName?: string; fullName?: string; profileType?: string; role?: string; status?: string }
export interface SessionResponse { accessToken: string; tokenType?: string; expiresIn?: number; sessionId?: string; user?: SessionUser; warnings?: string[] }
/** Cadastro (RF1): `202 Receipt` — sem sessão até confirmar o e-mail (RF1.CA04). */
export interface RegisterReceipt { status: string; maskedEmail: string; nextStep: string }
export interface RegisterBody { profileType: string; fullName: string; username: string; email: string; password: string; confirmPassword: string; phone?: string; acceptTerms: boolean }

export const auth = {
  async login(body: { identifier: string; password: string; rememberMe?: boolean; deviceName?: string; twoFactorCode?: string }): Promise<SessionResponse> {
    const s = await api.post<SessionResponse>("/bff/auth/login", body, { anonymous: true });
    tokenStore.set(s.accessToken);
    return s;
  },
  register: (body: RegisterBody) => api.post<RegisterReceipt>("/bff/auth/register", body, { anonymous: true }),
  /** Confirma o código do e-mail e abre a sessão (RegistrationController POST /api/auth/email-verification/confirm). */
  async confirmEmail(body: { email: string; code: string; deviceName?: string }): Promise<SessionResponse> {
    const s = await api.post<SessionResponse>("/bff/auth/confirm", body, { anonymous: true });
    tokenStore.set(s.accessToken);
    return s;
  },
  resendCode: (body: { email: string }) => api.post<{ status: string }>("/api/auth/email-verification/resend", body, { anonymous: true }),
  async logout(): Promise<void> {
    try { await api.post("/bff/auth/logout"); } finally { tokenStore.clear(); }
  },
  passwordReset: (body: { email: string }) => api.post<{ status: string }>("/api/auth/password-reset/request", body, { anonymous: true }),
  passwordResetConfirm: (body: { token: string; newPassword: string; confirmPassword: string }) => api.post<void>("/api/auth/password-reset/confirm", body, { anonymous: true }),
};

/** Sessões da própria pessoa (RF2.CA05, Bloco 4): `GET/DELETE /api/auth/sessions[/{id}]`. Nunca há token na resposta. */
export interface SessionInfo { id: string; deviceName: string | null; lastActiveAt: string; expiresAt: string; persistent: boolean; current: boolean }
export const sessions = {
  list: () => api.get<SessionInfo[]>("/api/auth/sessions"),
  revoke: (id: string) => api.delete<void>(`/api/auth/sessions/${encodeURIComponent(id)}`),
  revokeOthers: () => api.delete<{ sessionsEnded: number }>("/api/auth/sessions"),
};

/** Monta query string ignorando valores vazios. */
export function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) return;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : "";
}
