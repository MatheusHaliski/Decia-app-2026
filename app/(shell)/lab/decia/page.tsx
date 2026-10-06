"use client";
// /lab/decia: sessão DECIA e Mesa (docs/produto/DECIA_SESSAO_E_MESA.md §A–§D; wireframe docs/lab/decia.html) com componentes
// reais: casca da sessão (§B.2), PercentBar "rumo à decisão" (§B.5), classes de mensagem por token e a Mesa (§C).
import { Badge, Card, Glyph, PercentBar, Tag, Tabs } from "@/components/ui";
import { LabEmbed } from "@/components/shell/LabEmbed";
import { PageHeader } from "@/components/shell/PageHeader";
import { useI18n } from "@/lib/i18n/useI18n";
import { SESSION_TABS } from "@/lib/nav/matrix";

const CLASSES = [
  { key: "argument", cls: "border-l-ws-msg-argument bg-ws-msg-argument-soft" },
  { key: "divergence", cls: "border-l-ws-msg-divergence bg-ws-msg-divergence-soft" },
  { key: "risk", cls: "border-l-ws-msg-risk bg-ws-msg-risk-soft" },
  { key: "consensus", cls: "border-l-ws-msg-consensus bg-ws-msg-consensus-soft" },
  { key: "question", cls: "border-l-ws-msg-question bg-ws-msg-question-soft" },
] as const;
const STATES = ["PROPOSTA", "ABERTA", "EM_RESUMO", "EM_DECISAO", "ENCERRADA"] as const;

export default function DeciaLab() {
  const { t } = useI18n();
  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <PageHeader title={t("lab.decia")} glyph="sessao-decia" rfs={["RF29", "RF37"]} description={t("lab.deciaDescription")} eyebrow={t("common.lab")} />
      <Card title={t("lab.sessionShell")} eyebrow="DECIA_SESSAO_E_MESA.md §B.2" padding="sm">
        <div className="grid gap-3 rounded-[var(--ws-radius-lg)] border border-ws-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Glyph name="sessao-decia" variant="clay" size={36} decorative />
            <span className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("lab.sessionTitleSample")}</span>
            {STATES.map((s, i) => <Tag key={s} tone={i === 1 ? "accent" : "neutral"} pulse={i === 1}>{s}</Tag>)}
          </div>
          <PercentBar value={58} label={t("lab.towardsDecision")} segments={4} tone="spark" />
          <Tabs label={t("a11y.subTabs")} param={null} tabs={SESSION_TABS.map((tb) => ({ slug: tb.slug, label: t(tb.labelKey) }))} look="pills">
            {(active) => (
              <ul className="grid gap-2">
                {CLASSES.map((c, i) => (
                  <li key={c.key} className={`grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border border-l-4 p-3 text-[length:var(--ws-text-body-sm)] ${c.cls}`}>
                    <div className="flex items-center gap-2"><Badge>{t(`msgClass.${c.key}`)}</Badge><span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">@pessoa.exemplo · {active}</span></div>
                    <p>{t("lab.messageSample", { n: i + 1 })}</p>
                  </li>
                ))}
              </ul>
            )}
          </Tabs>
        </div>
      </Card>
      <Card title={t("lab.deskSection")} eyebrow="DECIA_SESSAO_E_MESA.md §C">
        <div className="grid gap-3 md:grid-cols-3">
          {(["objetivo", "evidencias", "decisao"] as const).map((col) => (
            <div key={col} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-dashed border-ws-border bg-ws-surface-2 p-3">
              <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t(`lab.deskColumn.${col}`)}</p>
              <div className="h-14 rounded-[var(--ws-radius-sm)] bg-ws-surface-1 shadow-ws-1" aria-hidden />
              <div className="h-14 rounded-[var(--ws-radius-sm)] bg-ws-surface-1 shadow-ws-1" aria-hidden />
            </div>
          ))}
        </div>
      </Card>
      <LabEmbed file="decia.html" title={t("lab.decia")} source="docs/lab/decia.html" />
    </div>
  );
}
