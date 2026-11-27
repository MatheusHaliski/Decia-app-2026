"use client";
/**
 * Aba "Carreira" do perfil PRÓPRIO (RF75 n.16; auditoria 27/11/2026): a profissão que a pessoa quer desenvolver, o plano de
 * desenvolvimento (trilha de trabalho + trilha Carreira) e o atalho para trocar a profissão. Só existe em `OwnProfile` — o perfil de
 * terceiros (`ProfileView`) e a busca nunca montam este componente (D-147; contrato em `privacy.contract.test.ts`).
 */
import { Button, Card, Tag } from "@/components/ui";
import { occupationArea } from "@/lib/career/categories";
import { baseLocale } from "@/lib/i18n/state";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { isOccupationCode } from "@/lib/preferences/types";
import type { SubTab } from "@/lib/nav/matrix";
import { FIELD_INDEX } from "@/lib/tasks/fieldIndex.gen";
import { DevelopmentPlanPanel } from "./DevelopmentPlan";
import { OccupationCombobox } from "./OccupationCombobox";

/** Sub-aba registrada só no perfil próprio (fora da matriz B de 15 abas, que também alimenta o perfil de terceiros). */
export const CAREER_TAB: SubTab = { slug: "carreira", labelKey: "profissao2.tab.label" };

export const SETTINGS_WORK_HREF = "/settings?tab=trabalho";

export function CareerTab() {
  const { t, locale } = useI18n();
  const lang = baseLocale(locale);
  const { prefs, update } = usePreferences();
  const code = isOccupationCode(prefs.preferredOccupation) ? prefs.preferredOccupation : null;
  const field = code ? FIELD_INDEX.find((f) => f.code === code) : undefined;
  const area = occupationArea(code);

  return (
    <div className="grid gap-[var(--ws-space-4)]" data-testid="career-tab">
      <Card title={t("profissao2.tab.title")} eyebrow={t("career.settings.eyebrow")}>
        <div className="grid gap-3 text-[length:var(--ws-text-body-sm)]">
          <p className="flex items-start gap-2 rounded-[var(--ws-radius-md)] bg-ws-info-soft px-3 py-2 text-ws-text" data-testid="career-tab-privacy">
            <span aria-hidden>🔒</span>
            <span>{t("career.settings.privacy")}</span>
          </p>
          {field && area ? (
            <div className="grid gap-2" data-testid="career-tab-occupation">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-[length:var(--ws-text-body)] font-semibold">{field.label[lang]}</span>
                <Tag tone="accent">{t(`tasks.area.${area}`)}</Tag>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" href={SETTINGS_WORK_HREF} data-testid="career-tab-change">{t("profissao2.tab.change")}</Button>
                <Button size="sm" variant="ghost" href="/tasks/new" icon="criar-tarefa">{t("career.settings.openCreator")}</Button>
                <Button size="sm" variant="ghost" href="/models" icon="balcao">{t("profissao2.tab.models")}</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2" data-testid="career-tab-empty">
              <p className="text-ws-text-muted">{t("profissao2.tab.empty")}</p>
              <OccupationCombobox value={null} onChange={(next) => update({ preferredOccupation: next })} label={t("career.settings.label")} hint={t("career.settings.hint")} />
            </div>
          )}
        </div>
      </Card>
      {code ? <DevelopmentPlanPanel key={code} fieldCode={code} /> : null}
    </div>
  );
}
