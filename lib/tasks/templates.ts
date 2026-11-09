/**
 * Modelos iniciais de tarefa do Acervo (RF4 + RF81): ao escolher a ÁREA de trabalho (`WorkArea`) e, opcionalmente, o CAMPO DE
 * ESTUDO (ramo do catálogo `contracts/career/academic-fields.json`), o criador oferece modelos prontos — título, tipo, objetivo
 * tangível, roteiro em seções, entregas, critérios de aceite verificáveis, referências e campos da área já preenchidos.
 *  • Modelos da ÁREA: escritos para as 9 áreas (`areaTemplates.ts`), valem para qualquer pessoa;
 *  • Modelos do CAMPO: derivados do pacote de domínio da profissão (`OccupationPack.guidedTasks`: tarefas-guia L1–L10/D1–D10
 *    parametrizadas e tarefas próprias do campo), com a rubrica do campo.
 * O conteúdo dos modelos é texto de trabalho em pt-BR (como os pacotes), editável depois de aplicado.
 */
import type { OccupationPack, GuidedTaskCode, TaskParams, CustomTask } from "@/lib/career/occupationPack";
import { AREA_EXTENSIONS, type PriorityName, type TaskTypeName, type WorkArea } from "./client";

export interface TaskTemplate {
  /** "area.<area>.<slug>" ou "campo.<pacote>.<código>" */
  id: string;
  origin: "AREA" | "CAMPO";
  area: WorkArea;
  /** ramo acadêmico de origem (modelos do campo) */
  fieldCode?: string;
  title: string;
  type: TaskTypeName;
  /** objetivo tangível: o que fica pronto, para quem, com que medida e prazo */
  objective: string;
  /** roteiro em Markdown com as seções esperadas da entrega */
  descriptionMd: string;
  deliverables: string[];
  /** critérios de aceite verificáveis (sim/não), não intenções */
  criteria: string[];
  references: { label: string; url: string }[];
  /** campos da área (`AREA_EXTENSIONS[area]`) já sugeridos; vazio deixa para a pessoa */
  extensions: Partial<Record<string, string>>;
  priority?: PriorityName;
  /** esforço típico ("2 h", "1 dia") */
  effort?: string;
  /** 1 iniciante · 2 intermediário · 3 avançado */
  level?: 1 | 2 | 3;
  tags?: string[];
}

/** Rascunho do criador (o mesmo formato do formulário, em listas simples) — entrada dos modelos e da checagem de qualidade. */
export interface TaskDraft {
  title: string;
  type: TaskTypeName | "";
  area: WorkArea | "";
  objective: string;
  descriptionMd: string;
  priority: PriorityName;
  dueAt: string;
  accessClass: "PUBLICO" | "INTERNO" | "RESTRITO" | "SIGILOSO";
  visibility: "PRIVADA" | "DEPARTAMENTO" | "EMPRESA" | "PUBLICA";
  deliverables: string[];
  criteria: string[];
  references: { label: string; url: string }[];
  extensions: Record<string, string>;
}

const LETTERS_TYPE: TaskTypeName = "DOCUMENTO";
const DRAWINGS_TYPE: TaskTypeName = "DESENHO_TECNICO";

function paramsMd(params: TaskParams["parameters"]): string {
  const lines = Object.entries(params).map(([k, v]) => `- **${k}**: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  return lines.length ? `## Parâmetros\n${lines.join("\n")}` : "";
}

/** Modelos de uma profissão a partir do pacote de domínio (tarefas-guia parametrizadas + tarefas próprias do campo). */
export function packTemplates(pack: OccupationPack, area: WorkArea): TaskTemplate[] {
  const field = pack.fields[0];
  const excluded = new Set(pack.guidedTasks.excluded.map((e) => e.code));
  const order = (code: string) => {
    const i = pack.guidedTasks.priority.indexOf(code as GuidedTaskCode);
    return i < 0 ? 99 : i;
  };
  const guided = (Object.entries(pack.guidedTasks.parameters) as [GuidedTaskCode, TaskParams][])
    .filter(([code]) => !excluded.has(code))
    .sort((a, b) => order(a[0]) - order(b[0]))
    .map(([code, p]): TaskTemplate => ({
      id: `campo.${pack.code}.${code}`,
      origin: "CAMPO",
      area,
      fieldCode: field,
      title: p.title,
      type: code.startsWith("D") ? DRAWINGS_TYPE : LETTERS_TYPE,
      objective: p.brief,
      descriptionMd: [`## Briefing\n${p.brief}`, paramsMd(p.parameters), `## Evidência\n${p.evidence}`, `## Tempo estimado\n${p.time}`].filter(Boolean).join("\n\n"),
      deliverables: [p.evidence],
      criteria: [...p.criteria],
      references: pack.ai.citeSources.slice(0, 2).map((s) => ({ label: s.title, url: s.url })),
      extensions: {},
      effort: p.time,
      level: p.level,
      tags: [code],
    }));
  const custom = pack.guidedTasks.custom.map((c: CustomTask): TaskTemplate => ({
    id: `campo.${pack.code}.${c.id}`,
    origin: "CAMPO",
    area,
    fieldCode: field,
    title: c.title,
    type: c.editor === "drawings" ? DRAWINGS_TYPE : LETTERS_TYPE,
    objective: `${c.title} — ${c.competency}`,
    descriptionMd: [`## Quando usar\n${c.trigger}`, `## Competência\n${c.competency}`, `## Evidência\n${c.evidence}`, `## Tempo estimado\n${c.time}`].join("\n\n"),
    deliverables: [c.evidence],
    criteria: [...c.criteria],
    references: pack.ai.citeSources.slice(0, 2).map((s) => ({ label: s.title, url: s.url })),
    extensions: {},
    effort: c.time,
    level: c.level,
    tags: [c.id],
  }));
  return [...guided, ...custom];
}

/** Aplica o modelo ao rascunho: substitui o conteúdo de trabalho e mantém o que é da pessoa (prazo, privacidade, responsável). */
export function applyTemplate(draft: TaskDraft, tpl: TaskTemplate): TaskDraft {
  const allowed = new Set(AREA_EXTENSIONS[tpl.area]);
  const extensions: Record<string, string> = {};
  for (const [k, v] of Object.entries(tpl.extensions)) if (allowed.has(k) && v) extensions[k] = v;
  return {
    ...draft,
    title: tpl.title,
    type: tpl.type,
    area: tpl.area,
    objective: tpl.objective,
    descriptionMd: tpl.descriptionMd,
    priority: tpl.priority ?? draft.priority,
    deliverables: [...tpl.deliverables],
    criteria: [...tpl.criteria],
    references: tpl.references.map((r) => ({ ...r })),
    extensions: { ...draft.extensions, ...extensions },
  };
}
