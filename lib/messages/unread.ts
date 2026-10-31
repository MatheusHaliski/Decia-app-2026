"use client";
/**
 * Contador de mensagens não lidas do shell (RF46): um só estado para a barra superior e a sidebar, relido pela API a cada 30 s com a aba
 * visível (parado com a aba oculta) e na volta à aba; a tela de mensagens atualiza na hora depois de marcar uma conversa como lida.
 * - Com conta logada fora do laboratório: `GET /api/conversations/unread` (número de conversas com não lidas).
 * - Sem sessão: 0.
 * - Laboratório (`NEXT_PUBLIC_WS_LAB=on`) ou fora do provider de sessão (testes): `null` — quem chama mostra o valor DEMO.
 */
import { useEffect, useSyncExternalStore } from "react";
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { labMode } from "@/lib/viewer/lab";
import { messagesApi, type UnreadSummary } from "./client";

export const UNREAD_REFRESH_MS = 30_000;

let snapshot: UnreadSummary | null = null;
const listeners = new Set<() => void>();
let users = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function emit() { listeners.forEach((l) => l()); }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
const read = () => snapshot;

/** Totais vindos do servidor (ex.: resposta de "marcar como lida"). */
export function setUnread(s: UnreadSummary | null) {
  snapshot = s;
  emit();
}

/** Relê os totais agora (falha de rede mantém o último valor). */
export async function refreshUnread(): Promise<void> {
  try { setUnread(await messagesApi.unread()); } catch { /* mantém o último valor */ }
}

const onVisible = () => { if (document.visibilityState === "visible") void refreshUnread(); };

function start() {
  users += 1;
  if (users > 1) return;
  void refreshUnread();
  timer = setInterval(onVisible, UNREAD_REFRESH_MS);
  document.addEventListener("visibilitychange", onVisible);
}

function stop() {
  users = Math.max(0, users - 1);
  if (users > 0) return;
  if (timer) clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", onVisible);
}

type Mode = "mock" | "loading" | "anonymous" | "api";

/** Conversas com mensagens não lidas; `null` no laboratório/sem provider (DEMO). */
export function useMessagesUnread(): number | null {
  const session = useOptionalCurrentUser();
  const mode: Mode = !session || labMode() ? "mock" : session.status === "authenticated" ? "api" : session.status;
  const snap = useSyncExternalStore(subscribe, read, () => null);
  useEffect(() => {
    if (mode === "anonymous") setUnread(null);
    if (mode !== "api") return;
    start();
    return stop;
  }, [mode]);
  if (mode === "mock") return null;
  if (mode !== "api") return 0;
  return snap?.conversations ?? 0;
}
