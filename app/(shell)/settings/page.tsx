"use client";
// Preferências (RF3.CA03): tema, idioma, densidade, tamanho da fonte, reduzir movimento, skin da Mesa, arte de fundo,
// notificações, fuso, WIP e modo de IA — aplicadas imediatamente e persistidas (local agora; API no Bloco 3).
// Abas Conta · Privacidade · Dados · Sessões · Termos ficam como esqueleto (backend no Bloco 3 / LGPD C, RF3.CA07–CA24).
import { useState } from "react";
import { BackgroundArt, Badge, Button, Card, Checkbox, EmptyState, Field, Input, RadioCards, Select, Switch, WS_BACKGROUNDS, useToast } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Locale } from "@/lib/i18n/state";
import { pageByRoute } from "@/lib/pages/registry";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { AI_MODES, DENSITIES, DESK_SKINS, FONT_SCALES, THEMES, type AiMode, type Density, type DeskSkin, type FontScale, type Theme } from "@/lib/preferences/types";

const PAGE = pageByRoute("/settings")!;
const TIMEZONES = ["America/Sao_Paulo", "America/Manaus", "America/Rio_Branco", "America/Noronha", "America/Belem", "America/Fortaleza", "America/Recife", "America/Bahia", "America/Cuiaba", "America/Campo_Grande", "America/Boa_Vista", "UTC"];
const SKELETON_TABS = new Set(["conta", "privacidade", "dados", "sessoes", "termos"]);

function Appearance() {
  const { t, locales } = useI18n();
  const { prefs, update, reset, resolvedTheme } = usePreferences();
  const { toast } = useToast();
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Card title={t("settings.theme")} eyebrow={t("settings.appliedNow")}>
        <RadioCards
          label={t("settings.theme")}
          value={prefs.theme}
          onValueChange={(v) => update({ theme: v as Theme })}
          columns={3}
          options={THEMES.map((th) => ({ value: th, label: t(`theme.${th}`), hint: th === "auto" ? t("theme.autoHint", { theme: t(`theme.${resolvedTheme}`) }) : undefined }))}
        />
      </Card>
      <Card title={t("settings.language")}>
        <RadioCards
          label={t("settings.language")}
          value={prefs.language}
          onValueChange={(v) => update({ language: v as Locale })}
          columns={3}
          options={locales.filter((l) => !l.qa).map((l) => ({ value: l.code, label: l.label }))}
        />
        <Checkbox className="mt-3" checked={prefs.language === "qps-ploc"} onCheckedChange={(v) => update({ language: v ? "qps-ploc" : "pt-BR" })} label={t("settings.pseudoLocale")} hint={t("settings.pseudoLocaleHint")} />
      </Card>
      <div className="grid gap-[var(--ws-space-4)] md:grid-cols-2">
        <Card title={t("settings.density")}>
          <RadioCards label={t("settings.density")} value={prefs.density} onValueChange={(v) => update({ density: v as Density })} columns={3} options={DENSITIES.map((d) => ({ value: d, label: t(`density.${d}`) }))} />
        </Card>
        <Card title={t("settings.fontScale")}>
          <RadioCards label={t("settings.fontScale")} value={String(prefs.fontScale)} onValueChange={(v) => update({ fontScale: Number(v) as FontScale })} columns={4} options={FONT_SCALES.map((f) => ({ value: String(f), label: `${f}%` }))} />
        </Card>
      </div>
      <Card title={t("settings.motion")}>
        <Switch checked={prefs.reduceMotion} onCheckedChange={(v) => update({ reduceMotion: v })} label={t("settings.reduceMotion")} hint={t("settings.reduceMotionHint")} />
      </Card>
      <Card title={t("settings.deskSkin")} eyebrow="RF22 · RF38.CA08">
        <RadioCards
          label={t("settings.deskSkin")}
          value={prefs.deskSkin}
          onValueChange={(v) => update({ deskSkin: v as DeskSkin })}
          columns={4}
          options={DESK_SKINS.map((s) => ({ value: s, label: t(`deskSkin.${s}`), preview: <BackgroundArt skin={s} minHeight="2.5rem" className="rounded-none border-0" /> }))}
        />
      </Card>
      <Card title={t("settings.background")} eyebrow={t("settings.backgroundHint")}>
        <RadioCards
          label={t("settings.background")}
          value={prefs.backgroundId}
          onValueChange={(v) => update({ backgroundId: v })}
          columns={4}
          options={WS_BACKGROUNDS.map((b) => ({ value: b.id, label: t(b.labelKey), hint: b.placeholder ? t("settings.placeholderArt") : undefined, preview: <BackgroundArt backgroundId={b.id} minHeight="2.5rem" className="rounded-none border-0" /> }))}
        />
        <div className="mt-3"><BackgroundArt backgroundId={prefs.backgroundId} minHeight="6rem"><p className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("settings.backgroundPreview")}</p></BackgroundArt></div>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => { reset(); toast({ title: t("settings.resetDone"), tone: "info" }); }}>{t("settings.reset")}</Button>
        <Button variant="primary" onClick={() => toast({ title: t("settings.savedLocally"), description: t("settings.savedLocallyHint"), tone: "sucesso" })}>{t("settings.saveHint")}</Button>
      </div>
    </div>
  );
}

function Notifications() {
  const { t } = useI18n();
  const { prefs, update } = usePreferences();
  const n = prefs.notificationPrefs;
  const set = (patch: Partial<typeof n>) => update({ notificationPrefs: { ...n, ...patch } });
  return (
    <Card title={t("tabs.settings.notificacoes")} eyebrow="RF3.CA03 · RF44.CA10">
      <Field label={t("settings.dailyTaskAt")} hint={t("settings.dailyTaskAtHint")}>
        {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="time" value={n.dailyTaskAt} onChange={(e) => set({ dailyTaskAt: e.target.value })} className="max-w-40" />}
      </Field>
      <div className="mt-2 divide-y divide-ws-border">
        {(["email", "push", "mentions", "decia", "seals", "points", "weeklyDigest"] as const).map((k) => (
          <Switch key={k} checked={n[k]} onCheckedChange={(v) => set({ [k]: v })} label={t(`notifPrefs.${k}`)} />
        ))}
      </div>
    </Card>
  );
}

function Work() {
  const { t } = useI18n();
  const { prefs, update } = usePreferences();
  const [wip, setWip] = useState(String(prefs.wipLimit));
  return (
    <div className="grid gap-[var(--ws-space-4)] md:grid-cols-2">
      <Card title={t("settings.timezone")}>
        <Field label={t("settings.timezone")}>
          {({ id }) => <Select id={id} value={prefs.timezone} onChange={(e) => update({ timezone: e.target.value })} options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))} />}
        </Field>
      </Card>
      <Card title={t("settings.wipLimit")} eyebrow="RF44.CA05">
        <Field label={t("settings.wipLimit")} hint={t("settings.wipLimitHint")} error={Number(wip) >= 1 && Number(wip) <= 20 ? undefined : t("settings.wipLimitError")}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-describedby={describedBy} invalid={invalid} type="number" min={1} max={20} value={wip} onChange={(e) => { setWip(e.target.value); const v = Number(e.target.value); if (v >= 1 && v <= 20) update({ wipLimit: v }); }} className="max-w-32" />
          )}
        </Field>
      </Card>
      <Card title={t("settings.aiMode")} eyebrow="RF43.CA06" className="md:col-span-2">
        <RadioCards label={t("settings.aiMode")} value={prefs.aiModeDefault} onValueChange={(v) => update({ aiModeDefault: v as AiMode })} columns={2} options={AI_MODES.map((m) => ({ value: m, label: t(`aiMode.${m}`), hint: t(`aiMode.${m}Hint`) }))} />
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <RfPage
      page={PAGE}
      hideCas={false}
      renderTab={(tab) => {
        if (tab === "aparencia") return <Appearance />;
        if (tab === "notificacoes") return <Notifications />;
        if (tab === "trabalho") return <Work />;
        if (SKELETON_TABS.has(tab)) {
          return (
            <EmptyState
              moji="carregando"
              title={t(`tabs.settings.${tab}`)}
              description={t("settings.backendPending")}
              action={<Badge tone="warning">{t("settings.block3")}</Badge>}
            />
          );
        }
        return undefined;
      }}
    />
  );
}
