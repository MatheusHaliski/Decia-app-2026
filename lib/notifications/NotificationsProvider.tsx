"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useNotifications, type NotificationsState } from "./useNotifications";

/** Um só estado de notificações para o shell inteiro (sino, badge da sidebar, página /notifications). */
const Ctx = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const state = useNotifications();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useNotificationsState(): NotificationsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotificationsState fora do NotificationsProvider");
  return ctx;
}
