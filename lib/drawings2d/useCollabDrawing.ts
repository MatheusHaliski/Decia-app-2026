"use client";
/**
 * Liga a sessão colaborativa do Drawings 2D ao navegador (DEMO): estado no armazenamento local, transação sob Web Locks,
 * canal BroadcastChannel `ws-drawings-<pieceId>`, saída ao fechar a aba (`pagehide`) e releitura no evento `storage`.
 * A colaboradora simulada roda em UMA aba (liderança por Web Locks). Cada aba é um participante (id novo a cada
 * montagem). Testes trocam tudo por `setCollabEnvForTests`.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BOT_LAYER, BotRunner } from "./bot";
import { DEMO_BOT, demoDrawing } from "./fixture";
import { CollabSession, realTimers, type SessionSnapshot, type Timers } from "./session";
import { localStore, memoryStore, openChannel, storeKey, webLeadership, webTxLock, type Channel, type Leadership, type SharedStore, type TxLock } from "./transport";

export interface CollabEnvOverrides {
  store?: SharedStore;
  lock?: TxLock;
  /** `null` = sem canal (só esta aba) */
  channel?: Channel | null;
  leadership?: Leadership;
  now?: () => number;
  timers?: Timers;
  /** liga a colaboradora simulada (padrão: sim) */
  bot?: boolean;
  /** id do participante desta aba */
  id?: string;
}

let overrides: ((pieceId: string) => CollabEnvOverrides) | null = null;

/** Só para testes: troca canal, armazenamento, trava, relógio, temporizadores e a colaboradora simulada. */
export function setCollabEnvForTests(fn: ((pieceId: string) => CollabEnvOverrides) | null): void {
  overrides = fn;
}

const randomId = () => `p-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

function browserStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return window.localStorage;
  } catch {
    return null; // armazenamento bloqueado: a peça vive só nesta aba
  }
}

const noopSubscribe = () => () => undefined;
const nullSnapshot = () => null;

export function useCollabDrawing(pieceId: string, myName: string): { session: CollabSession | null; snap: SessionSnapshot | null } {
  const [session, setSession] = useState<CollabSession | null>(null);
  const nameRef = useRef(myName);
  useEffect(() => {
    nameRef.current = myName;
  }, [myName]);

  useEffect(() => {
    const o = overrides?.(pieceId) ?? {};
    const storage = browserStorage();
    const s = new CollabSession({
      pieceId,
      me: { id: o.id ?? randomId(), name: nameRef.current },
      store: o.store ?? (storage ? localStore(pieceId, storage) : memoryStore()),
      lock: o.lock ?? webTxLock(`ws-drawings-${pieceId}`),
      channel: o.channel !== undefined ? o.channel : openChannel(pieceId),
      seed: () => demoDrawing(pieceId),
      now: o.now,
      timers: o.timers,
    });
    let alive = true;
    let bot: BotRunner | null = null;
    let dropLead: () => void = () => undefined;
    void s.start().then(() => {
      if (!alive) return;
      setSession(s);
      if (o.bot === false) return;
      dropLead = (o.leadership ?? webLeadership(`ws-drawings-${pieceId}-simulada`)).acquire(() => {
        if (!alive) return;
        bot = new BotRunner(s.actor(DEMO_BOT.id, { activeLayerId: BOT_LAYER, hiddenLayerIds: [] }), o.timers ?? realTimers);
        void bot.start();
      });
    });
    const onHide = () => s.leaveSync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === storeKey(pieceId)) s.refresh();
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("storage", onStorage);
      const running = bot;
      bot = null;
      void (async () => {
        if (running) await running.stop();
        dropLead();
        await s.stop();
      })();
      setSession(null);
    };
  }, [pieceId]);

  const snap = useSyncExternalStore(session ? session.subscribe : noopSubscribe, session ? session.getSnapshot : nullSnapshot, nullSnapshot);
  return { session, snap };
}
