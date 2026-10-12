"use client";
import type { ReactNode } from "react";
import { ToastProvider, TooltipProvider } from "@/components/ui";
import { NotificationsProvider } from "@/lib/notifications/NotificationsProvider";
import { PreferencesProvider } from "@/lib/preferences/PreferencesProvider";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";

/** Provedores do app: preferências (tema/idioma/densidade, RF3) → perfil de visualização do lab → tooltips → toasts. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      <ViewerProvider>
        <NotificationsProvider>
          <TooltipProvider>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </NotificationsProvider>
      </ViewerProvider>
    </PreferencesProvider>
  );
}
