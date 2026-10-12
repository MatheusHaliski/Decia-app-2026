/**
 * Apresentação dos estados do DECIA (docs/decia/04_DECISION_CARD.md §5): rótulo (i18n) + ícone + tom de cor por token.
 * Nunca só cor (WCAG 1.4.1): todo estado tem texto e ícone. ✦ é exclusivo da IA (RF38.CA04) e não aparece aqui.
 */
import type { Tone } from "@/components/ui";
import type { CheckState, DecisionRiskLevel, EvidenceLevel, Freshness, HealthState, ReadinessLevel } from "@/lib/decia/rules";
import type { DecisionLevel, DecisionLifecycle } from "@/lib/decia/types";

export interface StatusMeta { icon: string; tone: Tone; dashed?: boolean; faded?: boolean; bar: string }

/** Classe da faixa de estado no topo do card, por tom. */
const BAR: Record<string, string> = {
  neutral: "bg-ws-border-strong", info: "bg-ws-info", accent: "bg-ws-accent", warning: "bg-ws-warning", success: "bg-ws-success", danger: "bg-ws-decision-critical",
};

export const STATUS_META: Record<DecisionLifecycle, StatusMeta> = {
  RASCUNHO: { icon: "✎", tone: "neutral", dashed: true, bar: BAR.neutral! },
  ENQUADRAMENTO: { icon: "◇", tone: "info", bar: BAR.info! },
  PESQUISA: { icon: "⌕", tone: "info", bar: BAR.info! },
  COMPARACAO: { icon: "⇄", tone: "accent", bar: BAR.accent! },
  AGUARDANDO_DECISAO: { icon: "⧗", tone: "warning", bar: BAR.warning! },
  DECIDIDA: { icon: "✓", tone: "success", bar: BAR.success! },
  EM_EXECUCAO: { icon: "▶", tone: "success", bar: BAR.success! },
  RESOLVIDA: { icon: "◉", tone: "success", bar: BAR.success! },
  REVISADA: { icon: "☑", tone: "green", bar: BAR.success! },
  REABERTA: { icon: "↺", tone: "warning", bar: BAR.warning! },
  ARQUIVADA: { icon: "▣", tone: "neutral", faded: true, bar: BAR.neutral! },
};
export const CRITICAL_BAR = BAR.danger!;

export const LEVEL_TONE: Record<DecisionLevel, Tone> = { BAIXO: "neutral", MEDIO: "info", ALTO: "warning", CRITICO: "danger" };
export const RISK_TONE: Record<DecisionRiskLevel, Tone> = { ...LEVEL_TONE, NAO_AVALIADO: "neutral" };
export const EVIDENCE_TONE: Record<EvidenceLevel, Tone> = { FRACA: "warning", MODERADA: "info", FORTE: "success" };
export const EVIDENCE_ICON: Record<EvidenceLevel, string> = { FRACA: "▤", MODERADA: "▥", FORTE: "▦" };
export const READINESS_META: Record<ReadinessLevel, { icon: string; tone: Tone }> = {
  NAO_PRONTA: { icon: "○", tone: "neutral" },
  PRECISA_DE_EVIDENCIA: { icon: "▤", tone: "warning" },
  PRONTA_PARA_REVISAO: { icon: "⚠", tone: "warning" },
  PRONTA_PARA_DECIDIR: { icon: "✓", tone: "success" },
};
export const CHECK_META: Record<CheckState, { icon: string; tone: Tone }> = { OK: { icon: "✓", tone: "success" }, ALERTA: { icon: "!", tone: "warning" }, FALTA: { icon: "✕", tone: "danger" } };
export const HEALTH_META: Record<HealthState, { icon: string; tone: Tone }> = { OK: { icon: "✓", tone: "success" }, ATENCAO: { icon: "!", tone: "warning" }, FALTA: { icon: "✕", tone: "danger" } };
export const FRESHNESS_META: Record<Freshness, { icon: string; tone: Tone }> = { FRESCA: { icon: "✓", tone: "success" }, REVISAO_DEVIDA: { icon: "⏱", tone: "warning" }, VENCIDA: { icon: "⏰", tone: "danger" } };
