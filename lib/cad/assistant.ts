/**
 * "IA" da bancada de extração (D-12): simulada e determinística, sem chamar modelo externo. Só RESUME e ALERTA a partir dos
 * números já calculados (leitura, quantitativo, planilha, cronograma) — nunca cita um número que não veio do cálculo e nunca
 * altera nada. Responde quando a pessoa pede (padrão pessoal SOB_SOLICITACAO, D-136). A tela marca tudo com ✦.
 *
 * Cada nota é uma chave `cad.ai.<código>` com variáveis; `refs` são variáveis que a tela traduz (classe de item, serviço,
 * etapa, unidade), `money` são centavos a formatar como moeda e `dates` são datas ISO.
 */
import type { Budget } from "./budget";
import type { Schedule } from "./schedule";
import type { CadAlert, Takeoff, TakeoffRow } from "./types";
import { round } from "./units";

export interface AiNote {
  code: string;
  tone: "RESUMO" | "ALERTA" | "PROXIMO";
  vars?: Record<string, string | number>;
  refs?: Record<string, { ns: "kind" | "service" | "stage" | "unit" | "format"; id: string }>;
  money?: string[];
  dates?: string[];
}

export interface AiInput {
  fileName: string;
  takeoff: Takeoff;
  /** linhas efetivas (com as correções da pessoa) */
  rows: readonly TakeoffRow[];
  budget: Budget;
  schedule: Schedule;
  /** conferências recalculadas sobre as linhas incluídas */
  checks: readonly CadAlert[];
}

const fact = (t: Takeoff, code: string) => t.facts.find((f) => f.code === code)?.n ?? 0;

export function aiNotes(input: AiInput): AiNote[] {
  const { takeoff: t, rows, budget, schedule } = input;
  const notes: AiNote[] = [];
  const included = rows.filter((r) => r.included);

  // leitura
  if (t.format === "DXF") notes.push({ code: "LEU_DXF", tone: "RESUMO", vars: { file: input.fileName, entities: fact(t, "ENTIDADES"), layers: fact(t, "CAMADAS"), rows: rows.length, included: included.length } });
  else if (t.format === "IFC") notes.push({ code: "LEU_IFC", tone: "RESUMO", vars: { file: input.fileName, elements: fact(t, "ELEMENTOS"), storeys: fact(t, "PAVIMENTOS"), rows: rows.length, included: included.length } });
  else if (t.format === "GLB") notes.push({ code: "LEU_GLB", tone: "RESUMO", vars: { file: input.fileName, meshes: fact(t, "MALHAS"), triangles: fact(t, "TRIANGULOS"), rows: rows.length, included: included.length } });
  if (!rows.length) {
    notes.push({ code: "NADA_A_MEDIR", tone: "ALERTA" });
    return notes;
  }

  const conf = { ALTA: 0, MEDIA: 0, BAIXA: 0 };
  for (const r of included) conf[r.confidence]++;
  notes.push({ code: "CONFIANCA", tone: "RESUMO", vars: { alta: conf.ALTA, media: conf.MEDIA, baixa: conf.BAIXA } });

  // maiores serviços da planilha
  const top = budget.lines.filter((l) => l.totalCents > 0 && l.service).sort((a, b) => b.totalCents - a.totalCents).slice(0, 2);
  if (top.length && budget.directCents > 0) {
    const share = round((top[0]!.totalCents / budget.directCents) * 100, 0);
    notes.push({
      code: top.length > 1 ? "MAIORES_SERVICOS" : "MAIOR_SERVICO",
      tone: "RESUMO",
      vars: { aCents: top[0]!.totalCents, share, ...(top[1] ? { bCents: top[1].totalCents } : {}) },
      refs: { a: { ns: "service", id: top[0]!.service! }, ...(top[1] ? { b: { ns: "service", id: top[1].service! } } : {}) },
      money: ["aCents", "bCents"],
    });
  }
  notes.push({ code: "TOTAL", tone: "RESUMO", vars: { totalCents: budget.totalCents, directCents: budget.directCents, bdi: budget.bdiPercent }, money: ["totalCents", "directCents"] });

  // cronograma
  if (schedule.totalDays > 0 && schedule.end) {
    const longest = [...schedule.items].sort((a, b) => b.days - a.days)[0]!;
    notes.push({
      code: "CRONOGRAMA",
      tone: "RESUMO",
      vars: { days: schedule.totalDays, startDate: schedule.start, endDate: schedule.end, stageDays: longest.days },
      refs: { stage: { ns: "stage", id: longest.stage } },
      dates: ["startDate", "endDate"],
    });
  }

  // alertas a partir dos números
  if (t.unit?.origin === "SUPOSTA") notes.push({ code: "CONFIRME_UNIDADE", tone: "ALERTA", refs: { unit: { ns: "unit", id: t.unit.id } } });
  const unnamed = t.alerts.find((a) => a.code === "CAMADA_SEM_NOME");
  if (unnamed) notes.push({ code: "CAMADAS_SEM_NOME", tone: "ALERTA", vars: { n: Number(unnamed.vars?.n ?? 0) } });
  const open = t.alerts.filter((a) => a.code.startsWith("POLILINHA_ABERTA")).length;
  if (open) notes.push({ code: "POLILINHAS_ABERTAS", tone: "ALERTA", vars: { n: open } });
  for (const c of input.checks) if (c.code === "DUPLA_CONTAGEM_PISO") notes.push({ code: "DUPLA_CONTAGEM", tone: "ALERTA", vars: { rooms: Number(c.vars?.rooms ?? 0), floors: Number(c.vars?.floors ?? 0) } });
  if (conf.BAIXA) notes.push({ code: "REVISE_BAIXA", tone: "ALERTA", vars: { n: conf.BAIXA } });
  const derived = included.filter((r) => r.formula);
  if (derived.length) notes.push({ code: "PREMISSA_PAREDE", tone: "ALERTA", vars: { n: derived.length, height: Number(derived[0]!.formula!.vars.height ?? 0) } });
  if (t.format === "IFC" && t.alerts.some((a) => a.code === "IFC_SEM_QUANTIDADES")) notes.push({ code: "IFC_SO_CONTAGENS", tone: "ALERTA" });
  const openMeshes = t.alerts.find((a) => a.code === "GLB_MALHA_ABERTA");
  if (openMeshes) notes.push({ code: "GLB_VOLUMES", tone: "ALERTA", vars: { n: Number(openMeshes.vars?.n ?? 0) } });
  if (budget.unpriced) notes.push({ code: "SEM_PRECO", tone: "ALERTA", vars: { n: budget.unpriced } });
  if (schedule.undefinedStages.length) notes.push({ code: "ETAPAS_A_DEFINIR", tone: "ALERTA", vars: { n: schedule.undefinedStages.length } });
  const estimated = schedule.items.filter((i) => i.status === "ESTIMADA").length;
  if (estimated) notes.push({ code: "ETAPAS_ESTIMADAS", tone: "ALERTA", vars: { n: estimated } });
  const corrected = rows.filter((r) => r.corrected).length;
  if (corrected) notes.push({ code: "CORRECOES", tone: "RESUMO", vars: { n: corrected } });

  notes.push({ code: "PROXIMO_PASSO", tone: "PROXIMO" });
  return notes;
}
