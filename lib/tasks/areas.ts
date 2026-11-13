/**
 * Configuração por área de trabalho no criador do Acervo: o tipo de tarefa mais comum da área (pré-selecionado quando a pessoa
 * ainda não escolheu), a classe de acesso recomendada e a chave de extensão que guarda o campo de estudo usado como lente.
 */
import { FIELD_INDEX, type FieldEntry } from "./fieldIndex.gen";
import type { AccessClassName, TaskTypeName, WorkArea } from "./client";

export const AREA_DEFAULT_TYPE: Record<WorkArea, TaskTypeName> = {
  SOFTWARE: "DOCUMENTO",
  ADMINISTRACAO: "DOCUMENTO",
  DESIGN: "IMAGEM_EDITADA",
  PESQUISA: "DOCUMENTO",
  MARKETING: "DOCUMENTO",
  PLANEJAMENTO: "CRONOGRAMA",
  ENGENHARIA: "DESENHO_TECNICO",
  JURIDICO: "DOCUMENTO",
  OUTRA: "DOCUMENTO",
};

/** Classe de acesso sugerida ao escolher a área (Jurídico lida com processos e dados de partes: restrito por padrão). */
export const AREA_DEFAULT_ACCESS: Partial<Record<WorkArea, AccessClassName>> = { JURIDICO: "RESTRITO" };

/** Extensão que registra o campo de estudo escolhido como lente da tarefa (código do ramo; regra de chave do servidor). */
export const STUDY_FIELD_KEY = "studyField";
/** Extensão que registra a tarefa-guia do pacote (L1–L10, D1–D10 ou própria do campo) de onde o modelo veio. */
export const GUIDED_TASK_KEY = "guidedTask";

export const fieldByCode = (code: string | null | undefined): FieldEntry | undefined => (code ? FIELD_INDEX.find((f) => f.code === code) : undefined);
export const fieldsOfArea = (area: WorkArea): FieldEntry[] => FIELD_INDEX.filter((f) => f.area === area);
