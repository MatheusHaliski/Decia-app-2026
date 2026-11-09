/**
 * Métodos curtos das aulas, todos determinísticos:
 *  - riscos: análise qualitativa (probabilidade × impacto) e quantitativa (VME = P × impacto) — aula "Planejamento" §3.6;
 *  - partes interessadas: matriz poder × interesse de Mendelow — aula "Iniciação" §2.3;
 *  - matriz RACI: exatamente um A por atividade, ao menos um R — aula "Planejamento" §3.5 e aula de Governança (COBIT);
 *  - matriz GUT: prioridade = G × U × T (produto, nunca soma) — aula de Governança, PDTIC/SISP;
 *  - SLA × OLA × UC: OLA e contrato de apoio mais rígidos que o SLA — aula de Governança, ITIL;
 *  - estrutura organizacional × autoridade do GP — aula "Fundamentos" §1.5.
 */

// ---------- riscos ----------
export type RiskKind = "AMEACA" | "OPORTUNIDADE";
export type ThreatResponse = "ELIMINAR" | "TRANSFERIR" | "MITIGAR" | "ACEITAR";
export type OpportunityResponse = "EXPLORAR" | "COMPARTILHAR" | "MELHORAR" | "ACEITAR";
export const THREAT_RESPONSES: readonly ThreatResponse[] = ["ELIMINAR", "TRANSFERIR", "MITIGAR", "ACEITAR"];
export const OPPORTUNITY_RESPONSES: readonly OpportunityResponse[] = ["EXPLORAR", "COMPARTILHAR", "MELHORAR", "ACEITAR"];
export type RiskBand = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";

const r2 = (x: number) => Math.round(x * 100) / 100;

/** VME = probabilidade × impacto financeiro (magnitude). Ex.: 30 % × R$ 50.000 = R$ 15.000. */
export const emv = (probability: number, impact: number) => r2(Math.max(0, Math.min(1, probability)) * Math.max(0, impact));

/** Probabilidade (0–1) → nível 1–5 da matriz qualitativa. */
export function probabilityLevel(p: number): 1 | 2 | 3 | 4 | 5 {
  if (p <= 0.1) return 1;
  if (p <= 0.3) return 2;
  if (p <= 0.5) return 3;
  if (p <= 0.7) return 4;
  return 5;
}

/** Severidade P × I (1–25) e faixa da matriz de calor 5×5. */
export function riskSeverity(pLevel: number, impactLevel: number): { score: number; band: RiskBand } {
  const score = Math.max(1, Math.min(5, pLevel)) * Math.max(1, Math.min(5, impactLevel));
  const band: RiskBand = score >= 17 ? "CRITICA" : score >= 10 ? "ALTA" : score >= 5 ? "MEDIA" : "BAIXA";
  return { score, band };
}

/** Exposição líquida (VME das ameaças − VME das oportunidades) = referência para a reserva de contingência. */
export function riskExposure(risks: readonly { kind: RiskKind; probability: number; impact: number; closed?: boolean }[]): { threats: number; opportunities: number; net: number } {
  let threats = 0;
  let opportunities = 0;
  for (const r of risks) {
    if (r.closed) continue;
    if (r.kind === "AMEACA") threats += emv(r.probability, r.impact);
    else opportunities += emv(r.probability, r.impact);
  }
  return { threats: r2(threats), opportunities: r2(opportunities), net: r2(threats - opportunities) };
}

// ---------- partes interessadas ----------
export type EngagementStrategy = "GERENCIAR_DE_PERTO" | "MANTER_SATISFEITO" | "MANTER_INFORMADO" | "MONITORAR";
/** Poder e interesse de 1 a 5; ≥ 3 é "alto". */
export function mendelow(power: number, interest: number): EngagementStrategy {
  const hp = power >= 3;
  const hi = interest >= 3;
  if (hp && hi) return "GERENCIAR_DE_PERTO";
  if (hp) return "MANTER_SATISFEITO";
  if (hi) return "MANTER_INFORMADO";
  return "MONITORAR";
}

// ---------- RACI ----------
export type RaciLetter = "R" | "A" | "C" | "I";
export type RaciProblem = "SEM_A" | "MAIS_DE_UM_A" | "SEM_R";
/** Uma linha (atividade) da matriz: letras por pessoa. R e A podem recair sobre a mesma pessoa. */
export function raciProblems(row: Readonly<Record<string, readonly RaciLetter[]>>): RaciProblem[] {
  const letters = Object.values(row).flat();
  const a = letters.filter((l) => l === "A").length;
  const r = letters.filter((l) => l === "R").length;
  const out: RaciProblem[] = [];
  if (a === 0) out.push("SEM_A");
  if (a > 1) out.push("MAIS_DE_UM_A");
  if (r === 0) out.push("SEM_R");
  return out;
}

// ---------- GUT ----------
export type GutBand = "BAIXA" | "MEDIA" | "ALTA" | "MAXIMA";
export function gut(g: number, u: number, t: number): { score: number; band: GutBand } {
  const c = (x: number) => Math.max(1, Math.min(5, Math.round(x)));
  const score = c(g) * c(u) * c(t);
  const band: GutBand = score >= 80 ? "MAXIMA" : score >= 36 ? "ALTA" : score >= 12 ? "MEDIA" : "BAIXA";
  return { score, band };
}

// ---------- SLA × OLA × UC ----------
export type AgreementProblem = "OLA_MENOS_RIGIDO_QUE_SLA" | "UC_MENOS_RIGIDO_QUE_SLA";
/** Tempos de restauração em horas: o OLA e o UC que sustentam o SLA precisam prometer menos tempo que ele. */
export function agreementProblems(slaHours?: number, olaHours?: number, ucHours?: number): AgreementProblem[] {
  const out: AgreementProblem[] = [];
  if (slaHours === undefined) return out;
  if (olaHours !== undefined && olaHours >= slaHours) out.push("OLA_MENOS_RIGIDO_QUE_SLA");
  if (ucHours !== undefined && ucHours >= slaHours) out.push("UC_MENOS_RIGIDO_QUE_SLA");
  return out;
}

// ---------- estrutura organizacional ----------
export type OrgStructure = "FUNCIONAL" | "MATRICIAL_FRACA" | "MATRICIAL_BALANCEADA" | "MATRICIAL_FORTE" | "PROJETIZADA";
export const ORG_STRUCTURES: readonly OrgStructure[] = ["FUNCIONAL", "MATRICIAL_FRACA", "MATRICIAL_BALANCEADA", "MATRICIAL_FORTE", "PROJETIZADA"];
export const PM_AUTHORITY: Record<OrgStructure, { authority: "NENHUMA" | "BAIXA" | "MODERADA" | "MODERADA_A_ALTA" | "ALTA"; budgetOwner: "GERENTE_FUNCIONAL" | "COMPARTILHADO" | "GERENTE_DE_PROJETOS" }> = {
  FUNCIONAL: { authority: "NENHUMA", budgetOwner: "GERENTE_FUNCIONAL" },
  MATRICIAL_FRACA: { authority: "BAIXA", budgetOwner: "GERENTE_FUNCIONAL" },
  MATRICIAL_BALANCEADA: { authority: "MODERADA", budgetOwner: "COMPARTILHADO" },
  MATRICIAL_FORTE: { authority: "MODERADA_A_ALTA", budgetOwner: "GERENTE_DE_PROJETOS" },
  PROJETIZADA: { authority: "ALTA", budgetOwner: "GERENTE_DE_PROJETOS" },
};

// ---------- EAP: "entrega é substantivo, atividade é verbo" ----------
const NOUNS_ENDING_LIKE_VERBS = new Set(["lugar", "mar", "par", "poder", "prazer", "dever", "ser", "ter", "lar", "colar", "altar", "bar", "radar", "elixir", "faquir", "mister", "repórter", "computador", "cluster", "container", "banner", "server"]);
/** Heurística pedagógica: o primeiro termo parece um verbo no infinitivo ("Desenvolver…", "Testar…")? EAP decompõe entregas. */
export function looksLikeActivity(title: string): boolean {
  const first = title.trim().split(/\s+/)[0]?.toLocaleLowerCase("pt-BR").normalize("NFC") ?? "";
  if (first.length < 4 || NOUNS_ENDING_LIKE_VERBS.has(first)) return false;
  return /^\p{L}+(ar|er|ir|or)$/u.test(first) && !/or$/u.test(first);
}
