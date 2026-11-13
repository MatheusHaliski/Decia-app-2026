/**
 * Pacote da profissão nas TELAS DE PRODUTO (D-153, responde a Q-253): a escada de status do pacote decide o que pode aparecer fora
 * do Laboratório. `packForField` (occupationPack.ts) ignora o status e fica para o Lab e para os testes do dado; as telas de produto
 * pedem `packFor(code, minStatus)`:
 *  • `pesquisa` — fora do Lab, no máximo conteúdo informativo marcado "em revisão por especialistas" (`inReview`), sem status,
 *    versão nem códigos L/D/X (RF75.CA18). É o nível da lente, dos modelos sugeridos e do plano de desenvolvimento do Acervo: tudo
 *    editável pela pessoa, nada certificado nem bloqueante;
 *  • `revisado` — modelos, rubricas, Treino, Em alta e Desafios (critérios regulatórios, prazos e checklists só com revisor da área
 *    inscrito no conselho — ainda não modelado no dado);
 *  • `ativo` — IA por profissão, ranking, Memória, selo exportável, facetas do feed e lembretes.
 * Abaixo do mínimo pedido vale o pacote genérico, se ele alcança o mínimo; senão, nenhum (a tela segue sem a profissão).
 */
import { FIELD_INDEX, PACK_LOADERS } from "@/lib/tasks/fieldIndex.gen";
import { GENERIC_PACK_CODE, type GuidedTaskCode, type OccupationPack, type PackStatus } from "./occupationPack";

export const PACK_STATUS_RANK: Readonly<Record<PackStatus, number>> = { pesquisa: 0, revisado: 1, ativo: 2 };

/** O status do pacote alcança o mínimo pedido pela tela? */
export const meetsStatus = (status: PackStatus, min: PackStatus): boolean => PACK_STATUS_RANK[status] >= PACK_STATUS_RANK[min];

export interface ProductPack {
  pack: OccupationPack;
  /** ramo pedido pela tela (o pacote pode ser o genérico no lugar dele) */
  fieldCode: string | null;
  /** `true` = pacote do próprio ramo; `false` = genérico no lugar */
  own: boolean;
  /** pacote ainda em `pesquisa`: a tela marca "em revisão por especialistas" e não mostra status, versão nem códigos */
  inReview: boolean;
}

/** Escolha pura entre pacotes já carregados (o mesmo critério de `packFor`, sem import dinâmico). */
export function selectPack(code: string | null | undefined, minStatus: PackStatus, packs: readonly OccupationPack[]): ProductPack | null {
  const own = code ? packs.find((p) => p.fields.includes(code)) : undefined;
  if (own && meetsStatus(own.status, minStatus)) return { pack: own, fieldCode: code ?? null, own: true, inReview: own.status === "pesquisa" };
  const generic = packs.find((p) => p.code === GENERIC_PACK_CODE);
  if (generic && meetsStatus(generic.status, minStatus)) return { pack: generic, fieldCode: code ?? null, own: false, inReview: generic.status === "pesquisa" };
  return null;
}

type Loaders = Readonly<Record<string, () => Promise<OccupationPack>>>;

/**
 * Pacote de um ramo para uma tela de produto: carrega sob demanda (cada pacote é um pedaço separado do bundle) e aplica a escada
 * de status. O genérico só é baixado quando o do ramo não serve.
 */
export async function packFor(code: string | null | undefined, minStatus: PackStatus, loaders: Loaders = PACK_LOADERS): Promise<ProductPack | null> {
  const loaded: OccupationPack[] = [];
  const entry = code ? FIELD_INDEX.find((f) => f.code === code) : undefined;
  const ownLoader = entry ? loaders[entry.pack] : undefined;
  if (ownLoader) loaded.push(await ownLoader());
  const first = selectPack(code, minStatus, loaded);
  if (first?.own) return first;
  const genericLoader = loaders[GENERIC_PACK_CODE];
  if (genericLoader && !loaded.some((p) => p.code === GENERIC_PACK_CODE)) loaded.push(await genericLoader());
  return selectPack(code, minStatus, loaded);
}

/** Código interno de tarefa-guia (L1–L10, D1–D10) ou própria do campo (X1…): nunca aparece fora do Lab (D-153, RF75.CA18). */
export const INTERNAL_TASK_CODE = /^(?:[LD](?:10|[1-9])|X\d{1,2})$/;

/**
 * Nome da tarefa-guia para a tela, sem o código: o título parametrizado pelo pacote ou o da tarefa própria do campo. Sem título no
 * pacote, `null` — a tela usa um texto genérico ("tarefa-guia da profissão"), nunca o código.
 */
export function guidedTaskTitle(pack: OccupationPack | null | undefined, code: string | null | undefined): string | null {
  if (!pack || !code) return null;
  const params = pack.guidedTasks.parameters[code as GuidedTaskCode];
  if (params) return params.title;
  return pack.guidedTasks.custom.find((c) => c.id === code)?.title ?? null;
}
