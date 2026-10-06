"use client";
/**
 * PreferencesProvider (RF3.CA03): guarda as preferências do usuário, aplica no <html> (data-theme / data-density /
 * data-font-scale / data-reduce-motion / lang) IMEDIATAMENTE (sem recarregar) e persiste no adaptador local e,
 * havendo sessão, na API. Também é a fonte do idioma para `tr()`/`useI18n()` (lib/i18n/state.ts).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setCurrentLocale } from "@/lib/i18n/state";
import { apiAdapter, htmlAttributes, localAdapter, type PreferencesAdapter } from "./storage";
import { DEFAULT_PREFERENCES, sanitizePreferences, type UserPreferences } from "./types";

export interface PreferencesContextValue {
  prefs: UserPreferences;
  /** true depois de ler o armazenamento local (até lá valem os padrões) */
  ready: boolean;
  update: (patch: Partial<UserPreferences>) => void;
  reset: () => void;
  /** tema efetivo (auto resolvido pelo sistema) */
  resolvedTheme: Exclude<UserPreferences["theme"], "auto">;
}

const Ctx = createContext<PreferencesContextValue | null>(null);

export function applyHtmlAttributes(root: HTMLElement, prefs: UserPreferences) {
  for (const [name, value] of Object.entries(htmlAttributes(prefs))) {
    if (value === null) root.removeAttribute(name);
    else root.setAttribute(name, value);
  }
}

export function PreferencesProvider({ children, adapters = [localAdapter, apiAdapter], initial }: { children: ReactNode; adapters?: PreferencesAdapter[]; initial?: Partial<UserPreferences> }) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => sanitizePreferences({ ...DEFAULT_PREFERENCES, ...initial }));
  const [ready, setReady] = useState(false);
  const [systemDark, setSystemDark] = useState(false);
  const adaptersRef = useRef(adapters);

  // 1) carrega: local primeiro (instantâneo), depois API (quando houver sessão) sobrepõe
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const a of adaptersRef.current) {
        const loaded = await a.load();
        if (alive && loaded) setPrefs(loaded);
      }
      if (alive) setReady(true);
    })();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const l = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", l);
    return () => { alive = false; mq.removeEventListener("change", l); };
  }, []);

  // 2) aplica no <html> e no estado do i18n a cada mudança
  useEffect(() => {
    applyHtmlAttributes(document.documentElement, prefs);
    setCurrentLocale(prefs.language);
  }, [prefs]);

  const persist = useCallback((next: UserPreferences) => {
    for (const a of adaptersRef.current) void a.save(next);
  }, []);

  const update = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((old) => {
      const next = sanitizePreferences({ ...old, ...patch });
      persist(next);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    setPrefs(DEFAULT_PREFERENCES);
    persist(DEFAULT_PREFERENCES);
  }, [persist]);

  const resolvedTheme = prefs.theme === "auto" ? (systemDark ? "escuro" : "claro") : prefs.theme;
  const value = useMemo(() => ({ prefs, ready, update, reset, resolvedTheme }), [prefs, ready, update, reset, resolvedTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePreferences fora do PreferencesProvider");
  return ctx;
}
