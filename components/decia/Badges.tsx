"use client";
import { useId } from "react";
import { Tag, Tooltip, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ConfidenceBand, DecisionRiskLevel, EvidenceLevel, Freshness } from "@/lib/decia/rules";
import type { DecisionLevel, DecisionLifecycle } from "@/lib/decia/types";
import { EVIDENCE_ICON, EVIDENCE_TONE, FRESHNESS_META, LEVEL_TONE, RISK_TONE, STATUS_META } from "./meta";

/** Ícone textual decorativo (o rótulo ao lado diz o estado). */
const Icon = ({ children }: { children: string }) => <span aria-hidden className="font-[family-name:var(--ws-font-mono)] leading-none">{children}</span>;

/** Estado da decisão: cor + texto + ícone (04 §5). RASCUNHO tracejado; ARQUIVADA esmaecida. */
export function DecisionStatusBadge({ status, className }: { status: DecisionLifecycle; className?: string }) {
  const { t } = useI18n();
  const m = STATUS_META[status];
  return (
    <Tag tone={m.tone} dashed={m.dashed} className={cn("whitespace-nowrap", m.faded && "opacity-70", className)}>
      <Icon>{m.icon}</Icon>
      <span data-testid="status-label">{t(`decia.status.${status}`)}</span>
    </Tag>
  );
}

/** Impacto / urgência declarados (BAIXO/MÉDIO/ALTO/CRÍTICO). */
export function LevelChip({ kind, level, className }: { kind: "impact" | "urgency"; level: DecisionLevel; className?: string }) {
  const { t } = useI18n();
  return (
    <Tag tone={LEVEL_TONE[level]} className={cn("whitespace-nowrap", className)}>
      <Icon>{kind === "impact" ? "◎" : "⧗"}</Icon>
      {kind === "urgency" ? t(`decia.urgency.${level}`) : t("decia.chip.impact", { level: t(`decia.level.${level}`) })}
    </Tag>
  );
}

/** Risco da decisão (§6.6) — "não avaliado" nunca vira BAIXO por omissão. */
export function RiskBadge({ level, className }: { level: DecisionRiskLevel; className?: string }) {
  const { t } = useI18n();
  return (
    <Tag tone={RISK_TONE[level]} className={cn("whitespace-nowrap", className)}>
      <Icon>{level === "CRITICO" ? "▲" : level === "NAO_AVALIADO" ? "△" : "▲"}</Icon>
      {level === "NAO_AVALIADO" ? t("decia.chip.riskNone") : t("decia.chip.risk", { level: t(`decia.level.${level}`) })}
    </Tag>
  );
}

/** Força da evidência calculada (§6.5) — separada da confiança humana (G10). */
export function EvidenceStrengthBadge({ level, none, className }: { level: EvidenceLevel; none?: boolean; className?: string }) {
  const { t } = useI18n();
  return (
    <Tag tone={EVIDENCE_TONE[level]} className={cn("whitespace-nowrap", className)}>
      <Icon>{EVIDENCE_ICON[level]}</Icon>
      {t("decia.chip.evidence", { level: t(`decia.evidence.${level}`) })}
      {none ? <span className="font-normal">· {t("decia.evidence.none")}</span> : null}
    </Tag>
  );
}

export type StatementNature = "FATO" | "PREMISSA" | "OPINIAO" | "PREVISAO" | "EVIDENCIA";
const NATURE: Record<StatementNature, { icon: string; tone: "blue" | "yellow" | "brown" | "orange" | "green" }> = {
  FATO: { icon: "■", tone: "blue" }, EVIDENCIA: { icon: "▦", tone: "green" }, PREMISSA: { icon: "◆", tone: "yellow" }, OPINIAO: { icon: "❝", tone: "brown" }, PREVISAO: { icon: "↗", tone: "orange" },
};
/** Natureza explícita de cada enunciado (G4): fato ≠ premissa ≠ opinião ≠ previsão ≠ evidência. */
export function StatementNatureChip({ nature, className }: { nature: StatementNature; className?: string }) {
  const { t } = useI18n();
  return (
    <Tag tone={NATURE[nature].tone} className={cn("whitespace-nowrap", className)}>
      <Icon>{NATURE[nature].icon}</Icon>
      {t(`decia.nature.${nature}`)}
    </Tag>
  );
}

export function FreshnessBadge({ value, className }: { value: Freshness; className?: string }) {
  const { t } = useI18n();
  const m = FRESHNESS_META[value];
  return (
    <Tag tone={m.tone} className={cn("whitespace-nowrap", className)}>
      <Icon>{m.icon}</Icon>
      {t(`decia.freshness.${value}`)}
    </Tag>
  );
}

/** ⓘ de ajuda contextual (05 §5): abre por foco e por toque (Tooltip do DS), e o texto também fica no nome acessível. */
export function HelpHint({ text, className }: { text: string; className?: string }) {
  const { t } = useI18n();
  return (
    <Tooltip content={text}>
      <span
        tabIndex={0}
        role="img"
        aria-label={`${t("decia.help")}: ${text}`}
        className={cn("inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full border border-ws-border-strong text-[10px] font-bold leading-none text-ws-text-muted focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]", className)}
      >
        i
      </span>
    </Tooltip>
  );
}

const BAND_ICON: Record<ConfidenceBand, string> = { BAIXA: "◔", MEDIA: "◑", ALTA: "◕" };
const BAND_TONE: Record<ConfidenceBand, "warning" | "info" | "success"> = { BAIXA: "warning", MEDIA: "info", ALTA: "success" };

/**
 * Confiança humana (§5/§6.9): faixa BAIXA/MÉDIA/ALTA sempre; o "70 %" só no detalhe; passo de 5 (G11). ⓘ explica que é
 * declarada pelo responsável, não calculada.
 */
export function ConfidenceIndicator({ value, showPct = false, className }: { value: { pct: number; band: ConfidenceBand } | null; showPct?: boolean; className?: string }) {
  const { t, intl } = useI18n();
  const id = useId();
  if (!value) {
    return <span className={cn("text-[length:var(--ws-text-caption)] text-ws-text-muted", className)}>{t("decia.confidence.none")}</span>;
  }
  const pct = Math.round(value.pct / 5) * 5;
  const pctText = new Intl.NumberFormat(intl, { style: "percent" }).format(pct / 100);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} data-testid="confidence">
      <Tag tone={BAND_TONE[value.band]} className="whitespace-nowrap">
        <Icon>{BAND_ICON[value.band]}</Icon>
        <span id={id}>{t("decia.confidence.label")} {t(`decia.band.${value.band}`)}</span>
        {showPct ? <span className="font-[family-name:var(--ws-font-mono)] tabular-nums" data-testid="confidence-pct">· {pctText}</span> : null}
      </Tag>
      <HelpHint text={showPct ? t("decia.confidence.help", { pct: pctText }) : t("decia.confidence.helpNoPct")} />
    </span>
  );
}
