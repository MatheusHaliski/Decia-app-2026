"use client";
/**
 * PreferencesProvider (RF3.CA03): guarda as preferências do usuário, aplica no <html> (data-theme / data-density /
 * data-font-scale / data-reduce-motion / lang) IMEDIATAMENTE (sem recarregar) e persiste no adaptador local e,
 * havendo sessão, na API. Também é a fonte do idioma para `tr()`/`useI18n()` (lib/i18n/state.ts).
 */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

// useLayoutEffect avisa no SSR; no servidor não há <html> a ajustar
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function PreferencesProvider({ children, adapters = [localAdapter, apiAdapter], initial }: { children: ReactNode; adapters?: PreferencesAdapter[]; initial?: Partial<UserPreferences> }) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => sanitizePreferences({ ...DEFAULT_PREFERENCES, ...initial }));
  const [ready, setReady] = useState(false);
  // Até o 1º adaptador (o local, que o bootScript do <head> também lê) responder, o <html> é do bootScript: aplicar os
  // padrões antes disso apagaria o tema/idioma salvos e pintaria o padrão na hidratação (Codex, PR #36). Com `initial`,
  // o valor já é conhecido desde o 1º render.
  const [firstLoadDone, setFirstLoadDone] = useState(initial !== undefined);
  const [systemDark, setSystemDark] = useState(false);
  const adaptersRef = useRef(adapters);

  // 1) carrega: local primeiro (instantâneo), depois API (quando houver sessão) sobrepõe
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const a of adaptersRef.current) {
        const loaded = await a.load();
        if (!alive) return;
        if (loaded) setPrefs(loaded);
        setFirstLoadDone(true);
      }
      if (alive) { setFirstLoadDone(true); setReady(true); }
    })();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const l = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", l);
    return () => { alive = false; mq.removeEventListener("change", l); };
  }, []);

  // 2) aplica no <html> e no estado do i18n a cada mudança — em layout effect, no mesmo commit do render: o tema/idioma
  //    nunca fica um quadro atrás do texto (sem piscar, e o DOM já está coerente quando o render termina)
  useIsomorphicLayoutEffect(() => {
    if (!firstLoadDone) return;
    applyHtmlAttributes(document.documentElement, prefs);
    setCurrentLocale(prefs.language);
  }, [prefs, firstLoadDone]);

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
