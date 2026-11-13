/**
 * Memória Institucional (RF33.CA01) — adaptador SOMENTE LEITURA: decisão encerrada do DECIA DEMO → documento da Memória.
 * "Encerrada" = já decidida (DECIDIDA, EM_EXECUCAO, RESOLVIDA, REVISADA ou ARQUIVADA com alternativa escolhida e data). O texto
 * do documento é montado só com o que está registrado na decisão (pergunta, escolha, justificativa, alternativas, evidências,
 * riscos, resultado e lições) — nada é inventado. Privacidade: decisão PRIVADA fica restrita aos participantes (`audience`),
 * exceto quando a retrospectiva foi marcada para compartilhar como lição (`shareAsLesson`).
 */
import type { DecisionAggregate, DecisionLifecycle } from "@/lib/decia/types";
import { ACCESS_CLASSES, type AccessClass, type MemoryDocument } from "./types";

export const CLOSED_DECISION_STATES: readonly DecisionLifecycle[] = ["DECIDIDA", "EM_EXECUCAO", "RESOLVIDA", "REVISADA", "ARQUIVADA"];

export const isClosedDecision = (agg: DecisionAggregate) =>
  CLOSED_DECISION_STATES.includes(agg.decision.status) && !!agg.decision.decidedAt && !!agg.decision.selectedAlternativeId;

/** Minúscula no começo de um trecho que continua a frase ("descartada porque testes…"), sem mexer em siglas e nomes. */
const lcFirst = (s: string) => (/^\p{Lu}\p{Ll}/u.test(s) ? s[0]!.toLocaleLowerCase("pt-BR") + s.slice(1) : s);
const noDot = (s: string) => s.trim().replace(/[.]$/, "");

const sentence = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim();
  return !t ? "" : /[.!?]$/.test(t) ? t : `${t}.`;
};

/** Texto (Markdown) da decisão encerrada, em seções que viram trechos citáveis. */
export function decisionBody(agg: DecisionAggregate): string {
  const d = agg.decision;
  const chosen = agg.alternatives.find((a) => a.id === d.selectedAlternativeId);
  const out: string[] = [`# Decisão: ${d.title}`, "", sentence(`Pergunta: ${d.question}`)];
  if (d.objective) out.push(sentence(`Objetivo: ${d.objective}`));
  if (d.contextMd) out.push(sentence(`Contexto: ${d.contextMd}`));
  out.push("", "## Decisão tomada");
  if (chosen) out.push(sentence(`Alternativa escolhida: ${chosen.label} — ${chosen.title}`));
  if (d.rationale) out.push(sentence(`Justificativa: ${d.rationale}`));
  if (typeof d.decisionConfidencePct === "number") out.push(sentence(`Confiança declarada na decisão: ${d.decisionConfidencePct} %`));
  const others = agg.alternatives.filter((a) => a.id !== d.selectedAlternativeId);
  if (others.length) {
    out.push("", "## Alternativas consideradas");
    for (const a of others) out.push(sentence(`${a.label} — ${a.title}${a.discardReason ? `: descartada porque ${lcFirst(noDot(a.discardReason))}` : ""}`));
  }
  const evidence = agg.evidence.filter((e) => !e.supersededAt);
  if (evidence.length) {
    out.push("", "## Evidências usadas");
    for (const e of evidence) out.push(sentence(`${e.title}: ${lcFirst(noDot(e.summary))} (fonte: ${e.sourceLabel})`));
  }
  if (agg.risks.length) {
    out.push("", "## Riscos registrados");
    for (const r of agg.risks) out.push(sentence(`${r.title}${r.mitigation ? `; mitigação: ${lcFirst(noDot(r.mitigation))}` : ""}`));
  }
  if (agg.outcome) out.push("", "## Resultado", sentence(agg.outcome.summary));
  if (agg.retrospective) {
    const rt = agg.retrospective;
    out.push("", "## Lições");
    out.push(sentence(`O que deu certo: ${lcFirst(rt.whatWasRight)}`), sentence(`O que deu errado: ${lcFirst(rt.whatWasWrong)}`), sentence(rt.lessonsMd));
  }
  return out.join("\n");
}

export interface DecisionAdapterOptions {
  /** sigla do departamento a partir do id (diretório DEMO); sem diretório, o documento fica sem departamento */
  departmentAcronym?: (departmentId: string) => string | null;
}

/** Decisão encerrada → documento da Memória (`null` se ainda não encerrada). */
export function decisionToMemoryDoc(agg: DecisionAggregate, opts: DecisionAdapterOptions = {}): MemoryDocument | null {
  if (!isClosedDecision(agg)) return null;
  const d = agg.decision;
  const decidedAt = d.decidedAt!;
  const accessClass: AccessClass = (ACCESS_CLASSES as readonly string[]).includes(d.accessClass) ? (d.accessClass as AccessClass) : "INTERNO";
  const shared = d.visibility !== "PRIVADA" || agg.retrospective?.shareAsLesson === true;
  const audience = shared ? undefined : [...new Set([d.ownerUserId, d.createdByUserId, ...agg.participants.map((p) => p.userId)].filter((x): x is string => !!x))].sort();
  return {
    id: `decia-${d.id}`,
    kind: "SESSAO",
    origin: "DECIA",
    ref: `Decisão DECIA — ${d.title}`,
    title: `Decisão: ${d.title}`,
    department: d.departmentId ? (opts.departmentAcronym?.(d.departmentId) ?? null) : null,
    year: new Date(decidedAt).getUTCFullYear(),
    date: decidedAt.slice(0, 10),
    accessClass,
    href: `/decia/decisoes/${encodeURIComponent(d.id)}`,
    body: decisionBody(agg),
    audience,
  };
}

/** Todas as decisões encerradas da lista, na ordem recebida. */
export function closedDecisionDocs(list: readonly DecisionAggregate[], opts: DecisionAdapterOptions = {}): MemoryDocument[] {
  return list.map((a) => decisionToMemoryDoc(a, opts)).filter((d): d is MemoryDocument => !!d);
}
