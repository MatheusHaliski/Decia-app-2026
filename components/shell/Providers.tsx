"use client";
import type { ReactNode } from "react";
import { ToastProvider, TooltipProvider } from "@/components/ui";
import { NotificationsProvider } from "@/lib/notifications/NotificationsProvider";
import { PreferencesProvider } from "@/lib/preferences/PreferencesProvider";
import { CurrentUserProvider } from "@/lib/session/CurrentUserProvider";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";

/** Provedores do app: preferências (tema/idioma/densidade, RF3) → conta logada (/api/me) → quem está vendo → tooltips → toasts. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      <CurrentUserProvider>
      <ViewerProvider>
        <NotificationsProvider>
          <TooltipProvider>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </NotificationsProvider>
      </ViewerProvider>
      </CurrentUserProvider>
    </PreferencesProvider>
  );
}
