"use client";
/**
 * Estado das notificações no shell: carregando → lista | vazio | erro; "marcar todas como lidas". Hoje alimentado pelo
 * mock (D-36) com simulação de estados pelo lab; quando `GET /api/notifications` existir, troca-se só o `load()`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { MOCK_NOTIFICATIONS, NOTIF_SIM_KEY, readSim, unreadCount, type AppNotification, type NotificationsSim } from "./mock";

export type NotificationsStatus = "loading" | "ready" | "error";

export interface NotificationsState {
  status: NotificationsStatus;
  items: AppNotification[];
  unread: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  retry: () => void;
  sim: NotificationsSim;
  setSim: (s: NotificationsSim) => void;
}

async function load(sim: NotificationsSim): Promise<AppNotification[]> {
  await new Promise((r) => setTimeout(r, sim === "carregando" ? 60_000 : 250));
  if (sim === "erro") throw new Error("MOCK_ERRO");
  if (sim === "vazio") return [];
  return MOCK_NOTIFICATIONS.map((n) => ({ ...n }));
}

export function useNotifications(): NotificationsState {
  const [status, setStatus] = useState<NotificationsStatus>("loading");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [sim, setSimState] = useState<NotificationsSim>("padrao");
  const [tick, setTick] = useState(0);

  useEffect(() => { setSimState(readSim()); }, []);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    load(sim)
      .then((list) => { if (alive) { setItems(list); setStatus("ready"); } })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, [sim, tick]);

  const markAllRead = useCallback(() => setItems((l) => l.map((n) => ({ ...n, read: true }))), []);
  const markRead = useCallback((id: string) => setItems((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  const setSim = useCallback((s: NotificationsSim) => {
    setSimState(s);
    try { localStorage.setItem(NOTIF_SIM_KEY, s); } catch { /* ignore */ }
  }, []);

  return useMemo(() => ({ status, items, unread: unreadCount(items), markAllRead, markRead, retry, sim, setSim }), [status, items, markAllRead, markRead, retry, sim, setSim]);
}
