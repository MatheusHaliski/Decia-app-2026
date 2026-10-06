"use client";
/**
 * Hook de tradução dos componentes: o idioma vem das preferências (RF3.CA03) e muda sem recarregar. Fora de
 * componentes use `tr()` de lib/i18n/core (lê o mesmo estado, sincronizado pelo PreferencesProvider).
 */
import { useCallback, useMemo } from "react";
import { translate, type Vars } from "./core";
import { LOCALES, type Locale } from "./state";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

export interface I18n {
  t: (key: string, vars?: Vars) => string;
  locale: Locale;
  setLocale: (l: Locale) => void;
  locales: typeof LOCALES;
  /** locale Intl do idioma corrente (datas e números) */
  intl: string;
}

export function useI18n(): I18n {
  const { prefs, update } = usePreferences();
  const locale = prefs.language;
  const t = useCallback((key: string, vars?: Vars) => translate(locale, key, vars), [locale]);
  const setLocale = useCallback((l: Locale) => update({ language: l }), [update]);
  return useMemo(() => ({ t, locale, setLocale, locales: LOCALES, intl: LOCALES.find((x) => x.code === locale)?.intl ?? "pt-BR" }), [t, locale, setLocale]);
}
