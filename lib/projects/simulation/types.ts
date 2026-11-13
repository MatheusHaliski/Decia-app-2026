/**
 * Simulador de Cenários (RF31) — tipos das alavancas e do cenário.
 *
 * Um cenário é uma lista de ALAVANCAS aplicadas a uma CÓPIA do modelo da Mesa (`ProjectModel`); o projeto nunca é alterado pela
 * simulação. Cada alavanca é um dado puro (serializável, guardado no cenário salvo), espelhando o `variablesJson` do
 * `ProjectScenario` do README do RF31 (budgetDeltaPct, scheduleDeltaDays, removedTaskIds, addedTasksJson, responsibleSwaps,
 * supplierSwaps, scopeChangeText) numa forma que o motor determinístico entende.
 */
import type { IsoDate, Moscow, ProjectPhase } from "../types";

/** Atividades atingidas por uma alavanca: união das escolhidas, das que têm a palavra no título e das ligadas aos riscos. */
export interface TaskSelector {
  taskIds?: string[];
  keywords?: string[];
  riskIds?: string[];
}

/** De onde sai o dinheiro de um corte: reserva (gerencial e depois contingência), linhas do trabalho ou escopo de menor prioridade. */
export type CutSource = "RESERVA" | "LINHAS" | "ESCOPO";
export const CUT_SOURCES: readonly CutSource[] = ["RESERVA", "LINHAS", "ESCOPO"];

/** Corte de orçamento: percentual do orçamento total (custo planejado + reservas) ou valor em reais. */
export interface BudgetCutLever { kind: "CORTE_ORCAMENTO"; mode: "PERCENTUAL" | "VALOR"; value: number; source: CutSource }

/**
 * Atraso de fornecedor. ENTREGA: a entrega chega `days` dias depois do planejado, então as atividades atingidas não começam antes
 * do início planejado + `days` (restrição "não antes de"). DURACAO: cada atividade atingida dura `days` dias a mais.
 */
export interface SupplierDelayLever { kind: "ATRASO_FORNECEDOR"; days: number; mode: "ENTREGA" | "DURACAO"; supplier?: string; target: TaskSelector }

/** Retirar entregas (nós da EAP, com as atividades deles) e atividades. Só sai o que ainda não começou. */
export interface ScopeRemoveLever { kind: "ESCOPO_RETIRAR"; wbsIds: string[]; taskIds: string[] }

/** Incluir uma entrega nova (vira uma atividade na cópia), opcionalmente depois e/ou antes de atividades existentes. */
export interface ScopeAddLever {
  kind: "ESCOPO_INCLUIR";
  title: string;
  phase: ProjectPhase;
  durationDays: number;
  budget: number;
  afterTaskId?: string;
  beforeTaskId?: string;
  moscow?: Moscow;
}

/** Mudança percentual de esforço no que FALTA fazer das atividades escolhidas (vazio = todas as não concluídas). */
export interface ScopeEffortLever { kind: "ESCOPO_ESFORCO"; pct: number; target: TaskSelector }

/**
 * Indisponibilidade de uma pessoa. AUSENCIA: fora por `days` dias a partir de `fromDate` (padrão: data de status) — atividade dela
 * em andamento pausa, atividade que começaria na ausência espera a volta. CAPACIDADE: trabalha a `capacityPct` % e o que falta das
 * atividades dela se estica na proporção.
 */
export interface ResourceLever { kind: "INDISPONIBILIDADE"; userId: string; mode: "AUSENCIA" | "CAPACIDADE"; days: number; fromDate?: IsoDate; capacityPct: number }

/** Reajuste de preço: percentual sobre linhas de orçamento (custo certo, fora das atividades) e/ou sobre o que falta das atividades. */
export interface PriceLever { kind: "REAJUSTE_PRECO"; pct: number; budgetLineIds: string[]; target: TaskSelector }

export type Lever = BudgetCutLever | SupplierDelayLever | ScopeRemoveLever | ScopeAddLever | ScopeEffortLever | ResourceLever | PriceLever;
export type LeverKind = Lever["kind"];
export const LEVER_KINDS: readonly LeverKind[] = [
  "CORTE_ORCAMENTO", "ATRASO_FORNECEDOR", "ESCOPO_RETIRAR", "ESCOPO_INCLUIR", "ESCOPO_ESFORCO", "INDISPONIBILIDADE", "REAJUSTE_PRECO",
];

/** Ordem canônica de aplicação (determinística, independe da ordem da lista): escopo → recursos → fornecedor → preço → corte. */
export const LEVER_ORDER: Record<LeverKind, number> = {
  ESCOPO_RETIRAR: 0, ESCOPO_INCLUIR: 1, ESCOPO_ESFORCO: 2, INDISPONIBILIDADE: 3, ATRASO_FORNECEDOR: 4, REAJUSTE_PRECO: 5, CORTE_ORCAMENTO: 6,
};

export interface Scenario { id: string; name: string; levers: Lever[] }

/** Premissas comuns a todos os cenários comparados (a mesma semente dá números comparáveis). */
export interface SimulationAssumptions {
  /** prazo-alvo em dias corridos desde o início (padrão: término da linha de base aprovada, senão o do plano atual) */
  targetFinish?: number;
  /** sorteios do Monte Carlo (padrão 2000) */
  runs?: number;
  /** semente do gerador (padrão `DEFAULT_SEED`) */
  seed?: number;
  /** custo indireto por dia de atraso no término (R$/dia; padrão 0) */
  dailyOverhead?: number;
}

export const DEFAULT_RUNS = 2000;
export const DEFAULT_SEED = 31;

/** Efeito legível de uma alavanca (chave `sim.fx.<key>`); variáveis com sufixo Brl = reais, Days = dias, Pct = 0–100, Idx = índice. */
export interface Effect { lever: number; key: string; vars: Record<string, string | number> }
