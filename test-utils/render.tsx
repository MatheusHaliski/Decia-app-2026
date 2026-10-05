import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { ToastProvider, TooltipProvider } from "@/components/ui";
import { NotificationsProvider } from "@/lib/notifications/NotificationsProvider";
import { PreferencesProvider } from "@/lib/preferences/PreferencesProvider";
import type { PreferencesAdapter } from "@/lib/preferences/storage";
import type { UserPreferences } from "@/lib/preferences/types";
import type { ViewerProfile } from "@/lib/viewer/profiles";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";

/** Adaptador de preferências em memória para testes (sem localStorage, sem API). */
export function memoryAdapter(initial?: Partial<UserPreferences>): PreferencesAdapter & { saved: UserPreferences[] } {
  const saved: UserPreferences[] = [];
  return {
    saved,
    async load() { return initial ? ({ ...initial } as UserPreferences) : null; },
    async save(p) { saved.push(p); },
  };
}

export interface ProvidersOptions { profile?: ViewerProfile; prefs?: Partial<UserPreferences>; adapters?: PreferencesAdapter[] }

export function Providers({ children, profile = "EMPREGADO", prefs, adapters = [] }: ProvidersOptions & { children: ReactNode }) {
  return (
    <PreferencesProvider adapters={adapters} initial={prefs}>
      <ViewerProvider initial={profile}>
        <NotificationsProvider>
          <TooltipProvider>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </NotificationsProvider>
      </ViewerProvider>
    </PreferencesProvider>
  );
}

/** render() com os provedores do app (preferências, perfil de visualização, notificações, tooltip, toast). */
export function renderWithProviders(ui: ReactElement, opts: ProvidersOptions & Omit<RenderOptions, "wrapper"> = {}) {
  const { profile, prefs, adapters, ...rest } = opts;
  return render(ui, { wrapper: ({ children }) => <Providers profile={profile} prefs={prefs} adapters={adapters}>{children}</Providers>, ...rest });
}
