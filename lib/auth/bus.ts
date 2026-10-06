/**
 * Canal da sessão entre abas (Bloco 4, D-61): `BroadcastChannel("ws-auth")` quando existe; senão, evento `storage` do
 * `localStorage` (Safari antigo, alguns WebViews). Mensagens:
 * - `access` — o access token renovado, SÓ pelo BroadcastChannel (memória do navegador, mesma origem). Pelo `storage` o token
 *   NUNCA passa: ele ficaria gravado em disco e legível por qualquer script da origem (D-14: access token só em memória);
 * - `refreshed` — aviso sem segredo de que outra aba renovou (a aba que recebe renova sozinha quando precisar);
 * - `logout` — sair em uma aba sai em todas.
 */
export type AuthMessage = { type: "access"; token: string } | { type: "refreshed" } | { type: "logout" };

export interface AuthBus {
  post(msg: AuthMessage): void;
  subscribe(fn: (msg: AuthMessage) => void): () => void;
  readonly kind: "broadcast" | "storage" | "none";
}

export const AUTH_CHANNEL = "ws-auth";
export const AUTH_STORAGE_KEY = "ws.auth.event";

interface BusWindow {
  BroadcastChannel?: typeof BroadcastChannel;
  localStorage?: Storage;
  addEventListener?: (type: "storage", fn: (e: StorageEvent) => void) => void;
  removeEventListener?: (type: "storage", fn: (e: StorageEvent) => void) => void;
}

const isMessage = (v: unknown): v is AuthMessage => {
  const m = v as { type?: unknown; token?: unknown } | null;
  return !!m && (m.type === "logout" || m.type === "refreshed" || (m.type === "access" && typeof m.token === "string"));
};

export function createAuthBus(win: BusWindow | undefined = typeof window !== "undefined" ? (window as unknown as BusWindow) : undefined): AuthBus {
  const listeners = new Set<(msg: AuthMessage) => void>();
  const emit = (msg: unknown) => { if (isMessage(msg)) listeners.forEach((l) => l(msg)); };

  if (win?.BroadcastChannel) {
    const ch = new win.BroadcastChannel(AUTH_CHANNEL);
    ch.addEventListener("message", (e: MessageEvent) => emit(e.data));
    return { kind: "broadcast", post: (msg) => ch.postMessage(msg), subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
  }

  if (win?.localStorage && win.addEventListener) {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_STORAGE_KEY || !e.newValue) return;
      try { emit((JSON.parse(e.newValue) as { msg?: unknown }).msg); } catch { /* valor alheio: ignora */ }
    };
    win.addEventListener("storage", onStorage);
    return {
      kind: "storage",
      post(msg) {
        if (msg.type === "access") msg = { type: "refreshed" }; // o token nunca vai para o disco
        // o `at` muda o valor a cada envio: o evento `storage` só dispara quando o valor muda
        try { win.localStorage!.setItem(AUTH_STORAGE_KEY, JSON.stringify({ msg, at: `${Date.now()}-${Math.random()}` })); } catch { /* modo privado */ }
      },
      subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    };
  }

  return { kind: "none", post: () => {}, subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
}

/** `exp` (segundos) do payload de um JWT, sem validar assinatura — só para agendar a renovação. */
export function jwtExpiry(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" && Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

/** Quando renovar: 60 s antes de vencer, com folga aleatória de até 15 s (abas não disparam juntas), nunca antes de 5 s. */
export function refreshDelayMs(expSeconds: number, now = Date.now(), jitter = Math.random()): number {
  return Math.max(5_000, expSeconds * 1000 - now - 60_000 - Math.floor(jitter * 15_000));
}
