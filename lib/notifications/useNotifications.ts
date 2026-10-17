"use client";
/**
 * Estado das notificações no shell: carregando → lista | vazio | erro; marcar uma ou todas como lidas.
 * - Com conta logada fora do laboratório: API real (`/api/notifications`, RF27). Relê a cada minuto com a aba visível, ao voltar à aba e
 *   quando a sessão muda; marcar é otimista e, se o servidor recusar, a lista é relida.
 * - Sem sessão: lista vazia (o visitante não tem notificações).
 * - Laboratório (`NEXT_PUBLIC_WS_LAB=on`) ou fora do provider de sessão (testes): MOCK (D-36) com simulação de estados.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { labMode } from "@/lib/viewer/ViewerProvider";
import { notificationsApi, toAppNotification } from "./client";
import { MOCK_NOTIFICATIONS, NOTIF_SIM_KEY, readSim, unreadCount, type AppNotification, type NotificationsSim } from "./mock";

export type NotificationsStatus = "loading" | "ready" | "error";
export type NotificationsSource = "mock" | "api" | "anonymous";

export interface NotificationsState {
  status: NotificationsStatus;
  items: AppNotification[];
  unread: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  retry: () => void;
  sim: NotificationsSim;
  setSim: (s: NotificationsSim) => void;
  /** de onde vêm os dados: o simulador do lab só faz sentido no mock */
  source: NotificationsSource;
  /** código mostrado no ErrorState */
  errorCode: string | null;
}

export const REFRESH_MS = 60_000;
const PAGE = 30;

async function loadMock(sim: NotificationsSim): Promise<AppNotification[]> {
  await new Promise((r) => setTimeout(r, sim === "carregando" ? 60_000 : 250));
  if (sim === "erro") throw new Error("MOCK_ERRO");
  if (sim === "vazio") return [];
  return MOCK_NOTIFICATIONS.map((n) => ({ ...n }));
}

export function useNotifications(): NotificationsState {
  const session = useOptionalCurrentUser();
  const source: NotificationsSource = !session || labMode() ? "mock" : session.status === "authenticated" ? "api" : "anonymous";
  const sessionLoading = !!session && !labMode() && session.status === "loading";
  const [status, setStatus] = useState<NotificationsStatus>("loading");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [serverUnread, setServerUnread] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [sim, setSimState] = useState<NotificationsSim>("padrao");
  const [tick, setTick] = useState(0);
  const itemsRef = useRef<AppNotification[]>([]);
  itemsRef.current = items;

  useEffect(() => { setSimState(readSim()); }, []);

  useEffect(() => {
    let alive = true;
    if (sessionLoading) { setStatus("loading"); return; }
    if (source === "anonymous") { setItems([]); setServerUnread(0); setErrorCode(null); setStatus("ready"); return; }
    if (source === "mock") {
      setStatus("loading");
      loadMock(sim)
        .then((list) => { if (alive) { setItems(list); setServerUnread(null); setStatus("ready"); } })
        .catch(() => { if (alive) { setErrorCode("MOCK_ERRO"); setStatus("error"); } });
      return () => { alive = false; };
    }
    // API real: na primeira carga mostra "carregando"; nas releituras mantém a lista na tela
    if (!itemsRef.current.length) setStatus("loading");
    Promise.all([notificationsApi.list(PAGE), notificationsApi.unreadCount()])
      .then(([list, count]) => {
        if (!alive) return;
        const now = Date.now();
        setItems(list.map((n) => toAppNotification(n, now)));
        setServerUnread(count.count);
        setErrorCode(null);
        setStatus("ready");
      })
      .catch((e) => { if (alive) { setErrorCode(e instanceof ApiError ? e.code : "ERRO_DE_REDE"); setStatus("error"); } });
    return () => { alive = false; };
  }, [source, sessionLoading, sim, tick]);

  // releitura periódica (aba visível) e ao voltar à aba — só na API real
  useEffect(() => {
    if (source !== "api") return;
    const refresh = () => { if (document.visibilityState === "visible") setTick((x) => x + 1); };
    const id = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, [source]);

  const reload = useCallback(() => setTick((x) => x + 1), []);

  const markAllRead = useCallback(() => {
    setItems((l) => l.map((n) => ({ ...n, read: true })));
    setServerUnread((u) => (u === null ? null : 0));
    if (source === "api") notificationsApi.markAllRead().catch(reload);
  }, [source, reload]);

  const markRead = useCallback((id: string) => {
    const wasUnread = itemsRef.current.some((n) => n.id === id && !n.read);
    if (!wasUnread) return;
    setItems((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (source !== "api") return;
    setServerUnread((u) => (u === null ? u : Math.max(0, u - 1)));
    notificationsApi.markRead(id).catch(reload);
  }, [source, reload]);

  const setSim = useCallback((s: NotificationsSim) => {
    setSimState(s);
    try { localStorage.setItem(NOTIF_SIM_KEY, s); } catch { /* ignore */ }
  }, []);

  // o servidor conta além da página carregada; no mock conta-se a lista
  const unread = serverUnread ?? unreadCount(items);
  return useMemo(() => ({ status, items, unread, markAllRead, markRead, retry: reload, sim, setSim, source, errorCode }),
    [status, items, unread, markAllRead, markRead, reload, sim, setSim, source, errorCode]);
}
