/**
 * Regras puras do criador completo de tarefas (RF4/RF20, RF12, RF41; 12/11/2026): seções do formulário, campos do Acervo que a API
 * de tarefas ainda não recebe como coluna (subcategoria, natureza, processo, esforço, valor, origem institucional, participantes,
 * justificativa de sigilo), a validação por campo com as regras condicionais e o preenchimento por seção.
 *
 * Contrato (D-12): validação, contagem e empacotamento são funções puras e testadas; a tela só traduz as chaves de erro.
 *
 * Gravação: `TaskRequest` (lib/api/schema.d.ts) aceita título, tipo, categoria, prioridade, prazo, responsável, acesso, visibilidade,
 * briefing e `extensions` (até 12 chaves `^[a-z][a-zA-Z0-9]{1,30}$`, 500 caracteres cada — `TaskBriefJson`). Os campos do Acervo sem
 * coluna no contrato vão em `extensions`, em poucas chaves reservadas (`EXTRA_KEYS`) para caber no limite junto com as da área (≤ 3), a
 * lente (`studyField`) e a tarefa-guia (`guidedTask`). O prazo legal tem rota própria (`PUT /api/tasks/{id}/legal-deadline`) e é
 * gravado logo depois de criar.
 */
import type { AccessClassName, Criterion, Deliverable, Reference, TaskCategoryName, TaskTypeName, VisibilityName } from "./client";
import { isIsoDate } from "./legalDeadline";

/** Natureza do conteúdo (≤ 2) — enum Java `NatureTag`. */
export const NATURE_TAGS = ["TECNICA", "JURIDICA", "FINANCEIRA", "ADMINISTRATIVA", "AMBIENTAL", "SOCIAL"] as const;
export type NatureTagName = (typeof NATURE_TAGS)[number];
/** Processo a que a tarefa pertence (≤ 2) — enum Java `ProcessTag`. */
export const PROCESS_TAGS = ["LICITACAO", "CONVENIO", "OBRA", "REGULARIZACAO_FUNDIARIA", "PLANEJAMENTO_URBANO", "ORCAMENTO", "PESSOAL", "JURIDICO", "OUTRO"] as const;
export type ProcessTagName = (typeof PROCESS_TAGS)[number];
/** Origem institucional — enum Java `TaskOrigin`. */
export const TASK_ORIGINS = ["INTERNA", "ORGAO_EXTERNO", "FORNECEDOR", "CIDADAO"] as const;
export type TaskOriginName = (typeof TASK_ORIGINS)[number];
/** Situação do documento — enum Java `DocSituation`. */
export const DOC_SITUATIONS = ["MINUTA", "REVISADO", "ASSINADO", "PUBLICADO"] as const;
export type DocSituationName = (typeof DOC_SITUATIONS)[number];
/** Tamanho do esforço — enum Java `EffortSize`. */
export const EFFORT_SIZES = ["P", "M", "G"] as const;
export type EffortSizeName = (typeof EFFORT_SIZES)[number];
/** Categoria documental — enum Java `TaskCategory` (TAXONOMIA §13), na mesma ordem. */
export const TASK_CATEGORIES: readonly TaskCategoryName[] = [
  "OFICIO_MEMORANDO", "PARECER_TECNICO", "ETP", "TERMO_REFERENCIA", "PLANILHA_ORCAMENTARIA", "PROJETO_BASICO_EXECUTIVO", "CRONOGRAMA", "ATA",
  "PORTARIA_RESOLUCAO", "CONTRATO_CONVENIO", "VISTORIA_RELATORIO_FOTOGRAFICO", "LICENCA_ANUENCIA", "MAPA_GEORREFERENCIA", "FORMULARIO", "OUTRO",
];

export const MAX_TAGS = 2;
export const MAX_TITLE = 200;
export const MAX_SUBCATEGORY = 80;
export const MAX_PROTOCOL = 60;
export const MAX_SENDER = 200;
export const MAX_PARTICIPANT = 120;
export const MAX_EXTENSION_VALUE = 500;
export const MAX_EXTENSIONS = 12;
export const MAX_DELIVERABLES = 20;
export const MAX_CRITERIA = 30;
export const MAX_REFERENCES = 20;
export const MAX_HOURS = 9999;

/** Chaves de `extensions` reservadas para os campos do Acervo sem coluna no contrato. */
export const EXTRA_KEYS = {
  subcategory: "subcategory",
  taxonomy: "taxonomy",
  effort: "effort",
  origin: "origin",
  participants: "participants",
  accessReason: "accessReason",
} as const;
const RESERVED = new Set<string>(Object.values(EXTRA_KEYS));
export const isReservedExtension = (key: string) => RESERVED.has(key);

/** Campos do Acervo que o criador completo acrescenta ao briefing. Datas em ISO (aaaa-mm-dd); números como digitados. */
export interface TaskExtra {
  subcategory: string;
  natures: NatureTagName[];
  processes: ProcessTagName[];
  /** início previsto (antes do prazo) */
  startAt: string;
  effortSize: EffortSizeName | "";
  estimatedHours: string;
  /** valor envolvido em R$ (0 se não se aplica) */
  amount: string;
  origin: TaskOriginName;
  /** órgão, fornecedor ou cidadão que enviou */
  sender: string;
  /** documento de origem (ofício, e-mail, requerimento…) */
  document: string;
  /** nº do protocolo/processo (e-Protocolo, SEI) */
  protocol: string;
  receivedAt: string;
  docSituation: DocSituationName | "";
  participants: string[];
  /** justificativa da classificação (obrigatória para SIGILOSO) */
  accessReason: string;
}

export const emptyExtra = (): TaskExtra => ({
  subcategory: "", natures: [], processes: [], startAt: "", effortSize: "", estimatedHours: "", amount: "", origin: "INTERNA", sender: "",
  document: "", protocol: "", receivedAt: "", docSituation: "", participants: [], accessReason: "",
});

/** Prazo legal escolhido no criador (gravado pela rota própria depois de criar a tarefa). */
export interface LegalChoice { enabled: boolean; ruleId: string; baseDate: string }
export const emptyLegal = (): LegalChoice => ({ enabled: false, ruleId: "", baseDate: "" });

const oneOf = <T extends string>(list: readonly T[], v: string | null): T | undefined => (v && (list as readonly string[]).includes(v) ? (v as T) : undefined);
const listOf = <T extends string>(list: readonly T[], v: string | null): T[] =>
  [...new Set((v ?? "").split(",").map((s) => s.trim()).filter((s): s is T => (list as readonly string[]).includes(s)))];

function params(entries: Record<string, string>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(entries)) if (v.trim()) p.set(k, v.trim());
  return p.toString();
}

/** Campos extras → chaves reservadas de `extensions` (só as que têm conteúdo). */
export function packExtra(x: TaskExtra): Record<string, string> {
  const out: Record<string, string> = {};
  if (x.subcategory.trim()) out[EXTRA_KEYS.subcategory] = x.subcategory.trim();
  const taxonomy = params({ nature: x.natures.join(","), process: x.processes.join(",") });
  if (taxonomy) out[EXTRA_KEYS.taxonomy] = taxonomy;
  const effort = params({ size: x.effortSize, hours: x.estimatedHours, amount: x.amount, start: x.startAt });
  if (effort) out[EXTRA_KEYS.effort] = effort;
  const external = x.origin !== "INTERNA";
  const origin = params({
    kind: x.origin === "INTERNA" ? "" : x.origin, sender: external ? x.sender : "", doc: external ? x.document : "", protocol: x.protocol,
    received: x.receivedAt, situation: x.docSituation,
  });
  if (origin) out[EXTRA_KEYS.origin] = origin;
  const people = x.participants.map((p) => p.trim().replace(/;/g, ",")).filter(Boolean);
  if (people.length) out[EXTRA_KEYS.participants] = people.join("; ");
  if (x.accessReason.trim()) out[EXTRA_KEYS.accessReason] = x.accessReason.trim();
  return out;
}

/** `extensions` gravadas → campos extras + as demais chaves (da área, lente, tarefa-guia), sem perder nada que não reconheça. */
export function unpackExtra(ext: Readonly<Record<string, string>> | undefined): { extra: TaskExtra; rest: Record<string, string> } {
  const extra = emptyExtra();
  const rest: Record<string, string> = {};
  for (const [k, v] of Object.entries(ext ?? {})) if (!RESERVED.has(k)) rest[k] = v;
  const e = ext ?? {};
  extra.subcategory = e[EXTRA_KEYS.subcategory] ?? "";
  const tax = new URLSearchParams(e[EXTRA_KEYS.taxonomy] ?? "");
  extra.natures = listOf(NATURE_TAGS, tax.get("nature")).slice(0, MAX_TAGS);
  extra.processes = listOf(PROCESS_TAGS, tax.get("process")).slice(0, MAX_TAGS);
  const eff = new URLSearchParams(e[EXTRA_KEYS.effort] ?? "");
  extra.effortSize = oneOf(EFFORT_SIZES, eff.get("size")) ?? "";
  extra.estimatedHours = eff.get("hours") ?? "";
  extra.amount = eff.get("amount") ?? "";
  extra.startAt = eff.get("start") ?? "";
  const org = new URLSearchParams(e[EXTRA_KEYS.origin] ?? "");
  extra.origin = oneOf(TASK_ORIGINS, org.get("kind")) ?? "INTERNA";
  extra.sender = org.get("sender") ?? "";
  extra.document = org.get("doc") ?? "";
  extra.protocol = org.get("protocol") ?? "";
  extra.receivedAt = org.get("received") ?? "";
  extra.docSituation = oneOf(DOC_SITUATIONS, org.get("situation")) ?? "";
  extra.participants = (e[EXTRA_KEYS.participants] ?? "").split(";").map((s) => s.trim()).filter(Boolean);
  extra.accessReason = e[EXTRA_KEYS.accessReason] ?? "";
  return { extra, rest };
}

/** Sugestão de tamanho pelo número de horas (P até 8 h, M até 40 h, G acima) — só sugestão, a pessoa escolhe. */
export function suggestEffort(hours: string): EffortSizeName | null {
  const h = Number(hours.replace(",", "."));
  if (!hours.trim() || !Number.isFinite(h) || h <= 0) return null;
  return h <= 8 ? "P" : h <= 40 ? "M" : "G";
}

/** Valor em reais como digitado ("1.500,50", "1500.5", "1500") → número; vazio → 0; inválido → NaN. */
export function parseAmount(text: string): number {
  const s = text.trim().replace(/\s|R\$/g, "");
  if (!s) return 0;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export const isHttpUrl = (u: string) => {
  try {
    const url = new URL(u.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// ---------- seções e validação ----------

export const TASK_SECTIONS = ["ident", "goal", "frame", "people", "dates", "deliver", "refs", "access", "origin", "area"] as const;
export type TaskSectionId = (typeof TASK_SECTIONS)[number];

/** Campo do formulário (também as chaves de erro do servidor: `descriptionMd`, `acceptanceCriteria`, `extensions`…). */
export type TaskFieldKey =
  | "title" | "type" | "priority" | "objective" | "descriptionMd" | "category" | "subcategory" | "natures" | "processes" | "area"
  | "responsibleId" | "participants" | "dueAt" | "startAt" | "legalRule" | "legalBase" | "effortSize" | "estimatedHours" | "amount"
  | "deliverables" | "acceptanceCriteria" | "references" | "accessClass" | "visibility" | "accessReason" | "origin" | "sender" | "document"
  | "protocol" | "receivedAt" | "docSituation" | "extensions";

/** Ordem dos campos na tela (foco no primeiro erro) e a seção de cada um. */
export const TASK_FIELD_SECTION: ReadonlyArray<readonly [TaskFieldKey, TaskSectionId]> = [
  ["title", "ident"], ["type", "ident"], ["priority", "ident"],
  ["objective", "goal"], ["descriptionMd", "goal"],
  ["category", "frame"], ["subcategory", "frame"], ["natures", "frame"], ["processes", "frame"], ["area", "frame"],
  ["responsibleId", "people"], ["participants", "people"],
  ["startAt", "dates"], ["dueAt", "dates"], ["legalRule", "dates"], ["legalBase", "dates"], ["effortSize", "dates"], ["estimatedHours", "dates"], ["amount", "dates"],
  ["deliverables", "deliver"], ["acceptanceCriteria", "deliver"],
  ["references", "refs"],
  ["accessClass", "access"], ["visibility", "access"], ["accessReason", "access"],
  ["origin", "origin"], ["sender", "origin"], ["document", "origin"], ["protocol", "origin"], ["receivedAt", "origin"], ["docSituation", "origin"],
  ["extensions", "area"],
];
const SECTION_OF = new Map<string, TaskSectionId>(TASK_FIELD_SECTION);
/** Seção de um campo (erros do servidor com chave desconhecida ficam na identificação). */
export const sectionOfField = (field: string): TaskSectionId => SECTION_OF.get(field) ?? "ident";

/** O que a validação lê do formulário. */
export interface TaskFormValues {
  title: string;
  type: TaskTypeName | "";
  category: TaskCategoryName | "";
  objective: string;
  descriptionMd: string;
  dueAt: string;
  accessClass: AccessClassName;
  visibility: VisibilityName;
  deliverables: readonly Deliverable[];
  criteria: readonly Criterion[];
  references: readonly Reference[];
  /** extensões que irão no corpo além das reservadas (área, lente, tarefa-guia) */
  otherExtensions: Readonly<Record<string, string>>;
  extra: TaskExtra;
  legal: LegalChoice;
}

export interface ValidateOptions {
  /** hoje (aaaa-mm-dd), para datas que não podem estar no futuro */
  today: string;
  /** rascunho: só as regras de formato (os obrigatórios condicionais ficam para quando a tarefa sair do rascunho) */
  draft?: boolean;
}

/** Erros por campo como chaves de i18n, na ordem da tela. Vazio = pode enviar. */
export function validateTaskForm(v: TaskFormValues, opts: ValidateOptions): Partial<Record<TaskFieldKey, string>> {
  const e: Partial<Record<TaskFieldKey, string>> = {};
  const x = v.extra;
  const strict = !opts.draft;
  if (!v.title.trim()) e.title = "tasks.form.errTitle";
  else if (v.title.length > MAX_TITLE) e.title = "taskForm.err.tooLong";
  if (!v.type) e.type = "tasks.form.errType";
  if (v.objective.length > 500) e.objective = "taskForm.err.tooLong";

  if (x.subcategory.trim() && !v.category) e.subcategory = "taskForm.err.subcategoryNeedsCategory";
  else if (x.subcategory.length > MAX_SUBCATEGORY) e.subcategory = "taskForm.err.tooLong";
  if (x.natures.length > MAX_TAGS) e.natures = "taskForm.err.maxTwo";
  if (x.processes.length > MAX_TAGS) e.processes = "taskForm.err.maxTwo";

  if (x.participants.some((p) => p.trim().length > MAX_PARTICIPANT)) e.participants = "taskForm.err.participantTooLong";

  if (x.startAt && !isIsoDate(x.startAt)) e.startAt = "taskForm.err.date";
  if (v.dueAt && !isIsoDate(v.dueAt)) e.dueAt = "taskForm.err.date";
  else if (v.dueAt && x.startAt && isIsoDate(x.startAt) && x.startAt > v.dueAt) e.dueAt = "taskForm.err.dueBeforeStart";
  if (v.legal.enabled) {
    if (strict && !v.legal.ruleId) e.legalRule = "taskForm.err.legalRule";
    if (v.legal.ruleId || strict) {
      if (!v.legal.baseDate) e.legalBase = "taskForm.err.legalBase";
      else if (!isIsoDate(v.legal.baseDate)) e.legalBase = "taskForm.err.date";
    }
  }
  if (x.estimatedHours.trim()) {
    const h = Number(x.estimatedHours.replace(",", "."));
    if (!Number.isFinite(h) || h <= 0 || h > MAX_HOURS) e.estimatedHours = "taskForm.err.hours";
  }
  if (x.amount.trim()) {
    const a = parseAmount(x.amount);
    if (!Number.isFinite(a) || a < 0) e.amount = "taskForm.err.amount";
  }

  if (v.deliverables.length > MAX_DELIVERABLES) e.deliverables = "taskForm.err.maxDeliverables";
  else if (v.deliverables.some((d) => d.text.length > 300)) e.deliverables = "taskForm.err.itemTooLong";
  if (v.criteria.length > MAX_CRITERIA) e.acceptanceCriteria = "taskForm.err.maxCriteria";
  else if (v.criteria.some((c) => c.text.length > 300)) e.acceptanceCriteria = "taskForm.err.itemTooLong";
  if (v.references.length > MAX_REFERENCES) e.references = "taskForm.err.maxReferences";
  else if (v.references.some((r) => r.url.trim() && !isHttpUrl(r.url))) e.references = "taskForm.err.url";

  if (strict && v.accessClass === "SIGILOSO" && !x.accessReason.trim()) e.accessReason = "taskForm.err.accessReason";
  else if (x.accessReason.length > MAX_EXTENSION_VALUE) e.accessReason = "taskForm.err.tooLong";
  if ((v.accessClass === "SIGILOSO" || v.accessClass === "RESTRITO") && v.visibility === "PUBLICA") e.visibility = "taskForm.err.visibilityPublic";

  if (x.origin !== "INTERNA") {
    if (strict && !x.sender.trim()) e.sender = "taskForm.err.sender";
    else if (x.sender.length > MAX_SENDER) e.sender = "taskForm.err.tooLong";
    if (strict && !x.document.trim()) e.document = "taskForm.err.document";
  }
  if (x.protocol.length > MAX_PROTOCOL) e.protocol = "taskForm.err.tooLong";
  if (x.receivedAt) {
    if (!isIsoDate(x.receivedAt)) e.receivedAt = "taskForm.err.date";
    else if (x.receivedAt > opts.today) e.receivedAt = "taskForm.err.receivedFuture";
  }

  // limites do servidor para `extensions`: cada valor até 500 caracteres; no máximo 12 chaves no total
  const packed = packExtra(x);
  const fieldOfKey: Record<string, TaskFieldKey> = {
    [EXTRA_KEYS.subcategory]: "subcategory", [EXTRA_KEYS.taxonomy]: "natures", [EXTRA_KEYS.effort]: "estimatedHours",
    [EXTRA_KEYS.origin]: "document", [EXTRA_KEYS.participants]: "participants", [EXTRA_KEYS.accessReason]: "accessReason",
  };
  for (const [k, val] of Object.entries(packed)) {
    const f = fieldOfKey[k]!;
    if (val.length > MAX_EXTENSION_VALUE && !e[f]) e[f] = "taskForm.err.tooLong";
  }
  const other = Object.entries(v.otherExtensions).filter(([, val]) => val.trim());
  if (other.some(([, val]) => val.length > MAX_EXTENSION_VALUE)) e.extensions = "taskForm.err.tooLong";
  else if (other.length + Object.keys(packed).length > MAX_EXTENSIONS) e.extensions = "taskForm.err.tooManyExtensions";
  return orderErrors(e);
}

/** Mesmos erros, na ordem dos campos na tela (a primeira chave é a que recebe o foco). */
export function orderErrors<T extends string>(errors: Partial<Record<T, string>>): Partial<Record<T, string>> {
  const known = TASK_FIELD_SECTION.map(([f]) => f as string);
  const keys = Object.keys(errors) as T[];
  keys.sort((a, b) => (known.indexOf(a) + 1 || 999) - (known.indexOf(b) + 1 || 999));
  return Object.fromEntries(keys.map((k) => [k, errors[k]])) as Partial<Record<T, string>>;
}

export const firstErrorField = (errors: Readonly<Record<string, string | undefined>>): string | null =>
  Object.keys(orderErrors(errors as Record<string, string>)).find((k) => errors[k]) ?? null;

export type SectionState = "empty" | "partial" | "done" | "error";

/**
 * Preenchimento por seção para o índice do formulário: `done` quando o essencial da seção está preenchido, `partial` com algo
 * preenchido, `empty` sem nada e `error` quando há erro mostrado em algum campo dela. Seções só com padrões (acesso, origem interna)
 * contam como feitas. `percent` = seções feitas ÷ seções exibidas.
 */
export function sectionProgress(
  v: TaskFormValues & { area: string; responsibleId: string; hasAreaFields: boolean; files: number },
  errors: Readonly<Record<string, string | undefined>> = {},
): { states: Record<TaskSectionId, SectionState>; done: number; total: number; percent: number } {
  const x = v.extra;
  const any = (...xs: unknown[]) => xs.some((y) => (Array.isArray(y) ? y.length > 0 : typeof y === "string" ? y.trim() !== "" : Boolean(y)));
  const level = (essential: boolean, some: boolean): SectionState => (essential ? "done" : some ? "partial" : "empty");
  const external = x.origin !== "INTERNA";
  const states: Record<TaskSectionId, SectionState> = {
    ident: level(!!v.title.trim() && !!v.type, any(v.title, v.type)),
    goal: level(!!v.objective.trim(), any(v.objective, v.descriptionMd)),
    frame: level(!!v.category && !!v.area, any(v.category, x.subcategory, x.natures, x.processes, v.area)),
    people: level(any(v.responsibleId, x.participants.filter((p) => p.trim())), false),
    dates: level(any(v.dueAt, v.legal.enabled && v.legal.ruleId), any(x.startAt, x.effortSize, x.estimatedHours, x.amount)),
    deliver: level(v.deliverables.some((d) => d.text.trim()) && v.criteria.some((c) => c.text.trim()), any(v.deliverables, v.criteria)),
    refs: level(v.references.some((r) => r.url.trim()) || v.files > 0, any(v.references)),
    access: level(v.accessClass !== "SIGILOSO" || !!x.accessReason.trim(), true),
    origin: level(!external || (!!x.sender.trim() && !!x.document.trim()), true),
    area: level(Object.values(v.otherExtensions).some((s) => s.trim()), false),
  };
  for (const [field, msg] of Object.entries(errors)) if (msg) states[sectionOfField(field)] = "error";
  const shown = TASK_SECTIONS.filter((s) => s !== "area" || v.hasAreaFields);
  const done = shown.filter((s) => states[s] === "done").length;
  return { states, done, total: shown.length, percent: Math.round((done / shown.length) * 100) };
}
