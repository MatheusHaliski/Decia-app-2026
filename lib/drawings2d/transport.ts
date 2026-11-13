/**
 * Transporte da colaboração 2D (DEMO, sem servidor): abas do MESMO navegador conversam por BroadcastChannel
 * (`ws-drawings-<pieceId>`) e guardam o estado da peça no armazenamento local do navegador. A transação é serializada
 * entre abas por uma trava exclusiva (Web Locks API, quando existe): lê, aplica UMA função pura do motor, grava e avisa
 * as outras abas. Presença (cursor, seleção) é efêmera: só passa pelo canal, nunca é gravada.
 * Tudo aqui é injetável — os testes simulam o canal, o armazenamento e a trava.
 */
import type { Label, PresenceColor, Participant } from "./engine";
import { parseState, type SharedState } from "./engine";
import type { Point } from "./model";

export const channelName = (pieceId: string) => `ws-drawings-${pieceId}`;
export const storeKey = (pieceId: string) => `ws.drawings2d.${pieceId}.v1`;

export interface PresencePayload {
  name: string;
  color: PresenceColor;
  kind: Participant["kind"];
  /** cursor em coordenadas do desenho; null = fora da prancheta */
  cursor: Point | null;
  selection: readonly string[];
  /** o que está fazendo ("editando Janela S2") */
  activity: Label | null;
}

export type WireMessage =
  | { t: "hello"; from: string }
  | { t: "presence"; from: string; p: PresencePayload }
  | { t: "commit"; from: string; seq: number }
  | { t: "bye"; from: string };

export interface Channel {
  post(msg: WireMessage): void;
  listen(fn: (msg: WireMessage) => void): () => void;
  close(): void;
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 200;
const isPoint = (v: unknown): v is Point => !!v && typeof v === "object" && Number.isFinite((v as Point).x) && Number.isFinite((v as Point).y);

/** Mensagens de outra aba são validadas antes de usar: formato inesperado é ignorado. */
export function parseWire(data: unknown): WireMessage | null {
  if (!data || typeof data !== "object") return null;
  const m = data as Record<string, unknown>;
  if (!isStr(m.from)) return null;
  if (m.t === "hello" || m.t === "bye") return { t: m.t, from: m.from };
  if (m.t === "commit") return typeof m.seq === "number" ? { t: "commit", from: m.from, seq: m.seq } : null;
  if (m.t === "presence" && m.p && typeof m.p === "object") {
    const p = m.p as Record<string, unknown>;
    if (!isStr(p.name) || !isStr(p.color) || (p.kind !== "PESSOA" && p.kind !== "SIMULADA")) return null;
    const selection = Array.isArray(p.selection) ? p.selection.filter(isStr).slice(0, 50) : [];
    const activity = p.activity && typeof p.activity === "object" && isStr((p.activity as Label).key) ? (p.activity as Label) : null;
    return { t: "presence", from: m.from, p: { name: p.name, color: p.color as PresenceColor, kind: p.kind, cursor: isPoint(p.cursor) ? p.cursor : null, selection, activity } };
  }
  return null;
}

type BroadcastLike = { postMessage(data: unknown): void; close(): void; onmessage: ((e: { data: unknown }) => void) | null };
export type BroadcastCtor = new (name: string) => BroadcastLike;

/**
 * Canal entre abas; sem BroadcastChannel no navegador → null (a peça funciona só nesta aba). `Ctor` omitido = o do
 * navegador; `null` = sem canal.
 */
export function openChannel(pieceId: string, ctor?: BroadcastCtor | null): Channel | null {
  const Ctor = ctor === undefined ? (globalThis as { BroadcastChannel?: BroadcastCtor }).BroadcastChannel : ctor;
  if (typeof Ctor !== "function") return null;
  let bc: BroadcastLike;
  try {
    bc = new Ctor(channelName(pieceId));
  } catch {
    return null;
  }
  const listeners = new Set<(msg: WireMessage) => void>();
  bc.onmessage = (e) => {
    const msg = parseWire(e.data);
    if (msg) listeners.forEach((l) => l(msg));
  };
  return {
    post(msg) {
      try {
        bc.postMessage(msg);
      } catch {
        /* canal fechado: a aba está saindo */
      }
    },
    listen(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close() {
      listeners.clear();
      bc.onmessage = null;
      bc.close();
    },
  };
}

/* ── Armazenamento compartilhado ─────────────────────────────────────────────────────────────────────────────── */

export interface SharedStore {
  read(): SharedState | null;
  write(state: SharedState): void;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Estado no armazenamento local (compartilhado pelas abas da mesma origem); falha de cota/privacidade não quebra a tela. */
export function localStore(pieceId: string, storage: StorageLike): SharedStore {
  const key = storeKey(pieceId);
  return {
    read() {
      try {
        const raw = storage.getItem(key);
        return raw ? parseState(JSON.parse(raw)) : null;
      } catch {
        return null;
      }
    },
    write(state) {
      try {
        storage.setItem(key, JSON.stringify(state));
      } catch {
        /* cota cheia ou navegação privada: a sessão continua em memória nesta aba */
      }
    },
  };
}

/** Armazenamento em memória (uma aba só, ou abas simuladas em teste). Copia na leitura/escrita como o navegador. */
export function memoryStore(initial: SharedState | null = null): SharedStore & { peek(): SharedState | null } {
  let raw = initial ? JSON.stringify(initial) : null;
  return {
    read: () => (raw ? parseState(JSON.parse(raw)) : null),
    write: (state) => {
      raw = JSON.stringify(state);
    },
    peek: () => (raw ? (JSON.parse(raw) as SharedState) : null),
  };
}

/* ── Trava da transação ──────────────────────────────────────────────────────────────────────────────────────── */

export interface TxLock {
  run<T>(fn: () => T): Promise<T>;
}

/** Fila local (uma aba): serializa as transações desta aba. */
export function localMutex(): TxLock {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(fn: () => T): Promise<T> {
      const next = tail.then(fn, fn);
      tail = next.catch(() => undefined);
      return next;
    },
  };
}

interface LockManagerLike {
  request<T>(name: string, cb: () => Promise<T> | T): Promise<T>;
  request<T>(name: string, opts: { ifAvailable?: boolean; mode?: "exclusive" | "shared" }, cb: (lock: unknown) => Promise<T> | T): Promise<T>;
}

const lockManager = (): LockManagerLike | null => {
  const nav = (globalThis as { navigator?: { locks?: LockManagerLike } }).navigator;
  return nav?.locks && typeof nav.locks.request === "function" ? nav.locks : null;
};

/** Trava exclusiva ENTRE ABAS (Web Locks API); sem ela, a fila local. */
export function webTxLock(name: string, locks: LockManagerLike | null = lockManager()): TxLock {
  if (!locks) return localMutex();
  return { run: <T>(fn: () => T) => locks.request(name, () => fn()) };
}

/* ── Liderança (quem hospeda a colaboradora simulada) ────────────────────────────────────────────────────────── */

export interface Leadership {
  /** chama `onLead` quando esta aba vira a anfitriã; devolve a função que larga a liderança */
  acquire(onLead: () => void): () => void;
}

/** Uma aba por vez hospeda a colaboradora simulada (Web Locks); fecha a aba → outra assume. Sem Web Locks: esta aba. */
export function webLeadership(name: string, locks: LockManagerLike | null = lockManager()): Leadership {
  return {
    acquire(onLead) {
      if (!locks) {
        onLead();
        return () => undefined;
      }
      let release: () => void = () => undefined;
      let dropped = false;
      void locks.request(name, () => new Promise<void>((resolve) => {
        release = resolve;
        if (dropped) resolve();
        else onLead();
      }));
      return () => {
        dropped = true;
        release();
      };
    },
  };
}
