"use client";
import { useState } from "react";
import { Glyph, IconButton, Popover } from "@/components/ui";
import { MenuLabel, MenuOption } from "@/components/ui/Menu";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Locale } from "@/lib/i18n/state";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { THEMES, type Theme } from "@/lib/preferences/types";

/** Seletor rápido de tema (RF3.CA03, 4 temas + auto) e idioma (pt-BR · en · es) na barra superior; a tela completa é /settings. */
export function ThemeLanguageMenu() {
  const { t, locale, setLocale, locales } = useI18n();
  const { prefs, update } = usePreferences();
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={t("topbar.themeLanguage")}
      width="w-[min(92vw,16rem)]"
      trigger={<IconButton icon="configuracoes" label={t("topbar.themeLanguage")} aria-haspopup="dialog" aria-expanded={open} data-testid="theme-menu" />}
    >
      <div role="menu" aria-label={t("topbar.themeLanguage")} className="grid gap-1 p-1">
        <MenuLabel>{t("settings.theme")}</MenuLabel>
        <div role="group" aria-label={t("settings.theme")}>
          {THEMES.map((th: Theme) => (
            <MenuOption key={th} on={prefs.theme === th} onClick={() => update({ theme: th })}>{t(`theme.${th}`)}</MenuOption>
          ))}
        </div>
        <MenuLabel>{t("settings.language")}</MenuLabel>
        <div role="group" aria-label={t("settings.language")}>
          {locales.filter((l) => !l.qa).map((l) => (
            <MenuOption key={l.code} on={locale === l.code} lang={l.code} onClick={() => setLocale(l.code as Locale)}>{l.label}</MenuOption>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2 border-t border-ws-border px-3 pt-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">
          <Glyph name="configuracoes" size={16} decorative />
          {t("topbar.moreInSettings")}
        </div>
      </div>
    </Popover>
  );
}
