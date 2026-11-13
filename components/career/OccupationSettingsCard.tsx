"use client";
/**
 * Configurações › Trabalho: a profissão que a pessoa quer desenvolver (RF81, D-148). Privada (D-147): só o dono vê e usa — não aparece
 * no perfil, para a empresa, para o chefe nem em busca, e não é sinal de busca de emprego. O que ela muda é só o ponto de partida das
 * telas pessoais: o criador de tarefas pré-seleciona o campo de estudo (área, modelos, campos da área e checagem da profissão) e mostra
 * o plano de desenvolvimento; trocar não mexe em tarefas já criadas (RF81.CA08).
 */
import { useState } from "react";
import { Button, Card, Tag } from "@/components/ui";
import { occupationArea } from "@/lib/career/categories";
import { baseLocale } from "@/lib/i18n/state";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { isOccupationCode } from "@/lib/preferences/types";
import { FIELD_INDEX } from "@/lib/tasks/fieldIndex.gen";
import { OccupationCombobox } from "./OccupationCombobox";

export function OccupationSettingsCard({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const lang = baseLocale(locale);
  const { prefs, update } = usePreferences();
  const code = isOccupationCode(prefs.preferredOccupation) ? prefs.preferredOccupation : null;
  const field = code ? FIELD_INDEX.find((f) => f.code === code) : undefined;
  const area = occupationArea(code);
  const [announce, setAnnounce] = useState("");

  const change = (next: string | null) => {
    update({ preferredOccupation: next });
    const label = next ? FIELD_INDEX.find((f) => f.code === next)?.label[lang] ?? "" : "";
    setAnnounce(next ? t("career.settings.saved", { field: label }) : t("career.settings.cleared"));
  };

  return (
    <Card title={t("career.settings.title")} eyebrow={t("career.settings.eyebrow")} className={className} data-testid="occupation-card">
      <div className="grid gap-3">
        <p className="flex items-start gap-2 rounded-[var(--ws-radius-md)] bg-ws-info-soft px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-text" data-testid="occupation-privacy">
          <span aria-hidden>🔒</span>
          <span>{t("career.settings.privacy")}</span>
        </p>
        <OccupationCombobox value={code} onChange={change} label={t("career.settings.label")} hint={t("career.settings.hint")} />
        {field && area ? (
          <div className="grid gap-2 text-[length:var(--ws-text-body-sm)]" data-testid="occupation-effect">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-ws-text-muted">{t("career.settings.category")}</span>
              <Tag tone="accent">{t(`tasks.area.${area}`)}</Tag>
            </p>
            <p>{t("career.settings.effect", { field: field.label[lang], area: t(`tasks.area.${area}`) })}</p>
            <p className="text-ws-text-muted">{t("career.settings.keep")}</p>
            <div><Button size="sm" variant="secondary" href="/tasks/new" icon="criar-tarefa">{t("career.settings.openCreator")}</Button></div>
          </div>
        ) : (
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="occupation-generic">{t("career.settings.generic")}</p>
        )}
        <p className="sr-only" aria-live="polite">{announce}</p>
      </div>
    </Card>
  );
}
