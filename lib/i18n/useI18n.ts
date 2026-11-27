"use client";
/**
 * Hook de tradução dos componentes: o idioma vem das preferências (RF3.CA03) e muda sem recarregar. Fora de
 * componentes use `tr()` de lib/i18n/core (lê o mesmo estado, sincronizado pelo PreferencesProvider).
 *
 * Catálogos sob demanda (lib/i18n/loader.ts): escolhido um idioma cujo catálogo ainda não chegou, o hook pede o download e
 * continua no último idioma pronto até ele chegar — a troca é um re-render, sem tela em branco. `locale` é o idioma em exibição;
 * `requestedLocale`, o escolhido; `loading` diz se a troca está a caminho.
 *
 * Fora do PreferencesProvider (global-error.tsx, que substitui o layout raiz) usa o idioma corrente do estado sem React.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { translate, type Vars } from "./core";
import { catalogsVersion, displayLocale, isCatalogLoaded, requestLocale, subscribeCatalogs } from "./loader";
import { LOCALES, getCurrentLocale, type Locale } from "./state";
import { useOptionalPreferences } from "@/lib/preferences/PreferencesProvider";

export interface I18n {
  t: (key: string, vars?: Vars) => string;
  /** idioma em exibição (o escolhido, ou o anterior enquanto o catálogo do escolhido carrega) */
  locale: Locale;
  /** idioma escolhido nas preferências */
  requestedLocale: Locale;
  /** true enquanto o catálogo do idioma escolhido é baixado */
  loading: boolean;
  setLocale: (l: Locale) => void;
  locales: typeof LOCALES;
  /** locale Intl do idioma corrente (datas e números) */
  intl: string;
}

const noop = () => {};

export function useI18n(): I18n {
  const prefsCtx = useOptionalPreferences();
  const requested = prefsCtx?.prefs.language ?? getCurrentLocale();
  const update = prefsCtx?.update;
  // re-render quando um catálogo chega
  useSyncExternalStore(subscribeCatalogs, catalogsVersion, catalogsVersion);
  const ready = isCatalogLoaded(requested);
  useEffect(() => {
    void requestLocale(requested);
  }, [requested]);
  const locale = ready ? requested : displayLocale(requested);
  const t = useCallback((key: string, vars?: Vars) => translate(locale, key, vars), [locale]);
  const setLocale = useCallback((l: Locale) => (update ? update({ language: l }) : noop()), [update]);
  return useMemo(
    () => ({ t, locale, requestedLocale: requested, loading: !ready, setLocale, locales: LOCALES, intl: LOCALES.find((x) => x.code === locale)?.intl ?? "pt-BR" }),
    [t, locale, requested, ready, setLocale],
  );
}
