/**
 * Cliente HTTP da API Work Station (contrato do Bloco 3: `POST /api/auth/login|register|refresh|logout`, erros
 * `{code, message, details, correlationId}`). Access token SÓ em memória; refresh token em cookie `ws_rt` HttpOnly
 * gravado pelo BFF (`app/bff/auth/[action]/route.ts`) e nunca visível ao JavaScript. Ao abrir o app a sessão volta por
 * `/bff/auth/refresh` quando o cookie-sinal `ws_rt_h=1` (sem segredo) existe. Arquitetura herdada do FAI (ARQUITETURA §3.3, §4).
 */
import { tr } from "@/lib/i18n/core";
import { acceptLanguage, getCurrentLocale } from "@/lib/i18n/state";

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
const channel: BroadcastChannel | null = typeof window !== "undefined" && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("ws-auth") : null;
let sharedAt = 0;

export const tokenStore = {
  get access() { return accessToken; },
  set(access: string) {
    accessToken = access;
    sharedAt = Date.now();
    channel?.postMessage({ type: "access", token: access });
  },
  clear() {
    accessToken = null;
    channel?.postMessage({ type: "logout" });
  },
  /** Há sessão para restaurar? (cookie-sinal sem segredo gravado pelo BFF) */
  get restorable() {
    if (typeof document === "undefined") return false;
    return new RegExp(`(?:^|;\\s*)${SESSION_HINT_COOKIE}=1`).test(document.cookie);
  },
};

/** Sessão ativa ou restaurável — decide se vale chamar a API de preferências, notificações etc. */
export const hasSession = () => !!accessToken || tokenStore.restorable;

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
/** Chamado quando a sessão não pode ser renovada (logout global). */
export function onUnauthorized(l: Listener) { unauthorizedListeners.add(l); return () => unauthorizedListeners.delete(l); }

channel?.addEventListener("message", (e: MessageEvent) => {
  const msg = e.data as { type?: string; token?: string } | null;
  if (msg?.type === "access" && typeof msg.token === "string") { accessToken = msg.token; sharedAt = Date.now(); }
  if (msg?.type === "logout" && accessToken) { accessToken = null; unauthorizedListeners.forEach((l) => l()); }
});

/** Serializa a renovação entre abas (a rotação do refresh token invalida o anterior). */
async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  return locks ? locks.request("ws-auth-refresh", fn) : fn();
}

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  const startedAt = Date.now();
  refreshing = withRefreshLock(async () => {
    if (sharedAt > startedAt && accessToken) return true;
    try {
      const res = await fetch("/bff/auth/refresh", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) return false;
      const s = (await res.json()) as { accessToken?: unknown };
      if (typeof s.accessToken !== "string") return false;
      tokenStore.set(s.accessToken);
      return true;
    } catch {
      return false;
    }
  }).finally(() => { refreshing = null; });
  return refreshing;
}

/** Restaura a sessão ao abrir o app (cookie HttpOnly → access token em memória). */
export async function restoreSession(): Promise<boolean> {
  if (accessToken) return true;
  if (!tokenStore.restorable) return false;
  return tryRefresh();
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
  // eslint-disable-next-line no-control-regex
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
    tokenStore.clear();
    unauthorizedListeners.forEach((l) => l());
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

/** Sessão (RF1/RF2) pelo BFF: o refresh token fica no cookie; só o access token volta para a memória. */
export interface SessionResponse { accessToken: string; user?: { id: string; username: string; displayName?: string; profileType?: string; role?: string } }
export const auth = {
  async login(body: { identifier: string; password: string }): Promise<SessionResponse> {
    const s = await api.post<SessionResponse>("/bff/auth/login", body, { anonymous: true });
    tokenStore.set(s.accessToken);
    return s;
  },
  async register(body: Record<string, unknown>): Promise<SessionResponse> {
    const s = await api.post<SessionResponse>("/bff/auth/register", body, { anonymous: true });
    if (typeof s?.accessToken === "string") tokenStore.set(s.accessToken);
    return s;
  },
  async logout(): Promise<void> {
    try { await api.post("/bff/auth/logout"); } finally { tokenStore.clear(); }
  },
  passwordReset: (body: { email: string }) => api.post<void>("/api/auth/password-reset", body, { anonymous: true }),
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
