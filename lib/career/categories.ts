/**
 * Categorias da profissão no criador de tarefas — pedido do produto: "TI, Engenharia, Design, Pesquisa, Administração". Sem
 * vocabulário novo: cada categoria é uma `WorkArea` que já existe no Acervo (SOFTWARE é a de TI, com o rótulo de sempre
 * "Desenvolvimento de software") e os 79 ramos do catálogo já têm a sua área padrão no índice gerado (`fieldIndex.gen.ts`). As
 * demais áreas onde há ramos (Marketing, Planejamento, Jurídico) vêm depois, na mesma lista.
 */
import { FIELD_INDEX, type FieldEntry } from "@/lib/tasks/fieldIndex.gen";
import { WORK_AREAS, type WorkArea } from "@/lib/tasks/client";

export const CAREER_CATEGORIES = ["SOFTWARE", "ENGENHARIA", "DESIGN", "PESQUISA", "ADMINISTRACAO"] as const satisfies readonly WorkArea[];
export type CareerCategory = (typeof CAREER_CATEGORIES)[number];

/** Ordem de exibição: as cinco categorias pedidas e depois as outras áreas, na ordem do Acervo. */
export const AREA_ORDER: readonly WorkArea[] = [
  ...CAREER_CATEGORIES,
  ...WORK_AREAS.filter((a) => !(CAREER_CATEGORIES as readonly WorkArea[]).includes(a)),
];

export const isCareerCategory = (a: WorkArea | null | undefined): a is CareerCategory => !!a && (CAREER_CATEGORIES as readonly WorkArea[]).includes(a);

export type Lang = "pt-BR" | "en" | "es";

export interface FieldGroup {
  area: WorkArea;
  /** uma das cinco categorias pedidas */
  requested: boolean;
  fields: FieldEntry[];
}

/** Ramos agrupados por área (categorias pedidas primeiro), em ordem alfabética do idioma; grupos vazios saem. */
export function groupFieldsByArea(lang: Lang = "pt-BR", fields: readonly FieldEntry[] = FIELD_INDEX): FieldGroup[] {
  return AREA_ORDER.map((area) => ({
    area,
    requested: isCareerCategory(area),
    fields: fields.filter((f) => f.area === area).sort((a, b) => a.label[lang].localeCompare(b.label[lang], lang)),
  })).filter((g) => g.fields.length > 0);
}

/** Área de trabalho (categoria) de um ramo do catálogo. */
export const occupationArea = (code: string | null | undefined, fields: readonly FieldEntry[] = FIELD_INDEX): WorkArea | null =>
  (code ? fields.find((f) => f.code === code)?.area : undefined) ?? null;
