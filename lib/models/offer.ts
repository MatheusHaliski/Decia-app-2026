/**
 * "Oferecer como modelo" (RF40.CA01) — função reutilizável por qualquer tela (card de tarefa, Mesa do projeto, kits, arquivar com
 * repasse): valida a oferta e a grava no Balcão. Regras: só EMPREGADO, CHEFE e EMPRESA oferecem (a matriz do `/models` dá E a
 * eles); preço inteiro de 0 a 50 DP (`modelOfferMaxPrice`, docs/produto/DECIA_POINTS.md §5.3); conta sem saldo próprio (EMPRESA)
 * só oferece grátis; um autor não oferece a mesma origem duas vezes enquanto a oferta estiver ativa; toda oferta nova entra na
 * prateleira Comunidade (Chancelados só pela chancela, RF39).
 */
import type { ProjectModel } from "@/lib/projects/types";
import type { WorkArea } from "@/lib/tasks/client";
import type { TaskTemplate } from "@/lib/tasks/templates";
import type { ViewerProfile } from "@/lib/viewer/profiles";
import type { ModelsRepository } from "./repository";
import type { ModelLicense, ModelOffer, ModelSource } from "./types";
import { MODEL_LICENSES } from "./types";

export const MODEL_MAX_PRICE = 50;
export const MODEL_TITLE_MAX = 120;
export const MODEL_DESCRIPTION_MAX = 500;

export const canOfferModel = (profile: ViewerProfile) => profile === "EMPREGADO" || profile === "CHEFE" || profile === "EMPRESA";

export type OfferSourceInput =
  | { type: "TASK_TEMPLATE"; template: TaskTemplate }
  | { type: "PROJECT"; project: Pick<ProjectModel, "id" | "title" | "area"> }
  | { type: "KIT"; templates: readonly TaskTemplate[] };

export interface OfferAuthor {
  /** dono do saldo (recebe os créditos); conta sem saldo usa o próprio identificador */
  id: string;
  name: string;
  department: string | null;
  profile: ViewerProfile;
  /** a conta acumula DECIA Points? (EMPRESA não) */
  canEarnPoints: boolean;
}

export interface OfferAsModelInput {
  source: OfferSourceInput;
  author: OfferAuthor;
  pricePoints: number;
  license: ModelLicense;
  usageDescription?: string;
  /** título exibido no Balcão (padrão: o da origem) */
  title?: string;
}

export type OfferError =
  | "ACESSO_NEGADO" | "TITULO_OBRIGATORIO" | "TITULO_LONGO" | "DESCRICAO_LONGA" | "PRECO_INVALIDO" | "PRECO_SEM_SALDO" | "LICENCA_INVALIDA"
  | "KIT_VAZIO" | "OFERTA_DUPLICADA";
export type OfferResult = { ok: true; offer: ModelOffer } | { ok: false; reason: OfferError };

const sourceOf = (s: OfferSourceInput): ModelSource =>
  s.type === "TASK_TEMPLATE" ? { type: "TASK_TEMPLATE", templateId: s.template.id }
    : s.type === "PROJECT" ? { type: "PROJECT", projectId: s.project.id }
      : { type: "KIT", templateIds: s.templates.map((t) => t.id) };

const sameSource = (a: ModelSource, b: ModelSource) => JSON.stringify(a) === JSON.stringify(b);

function areaOf(s: OfferSourceInput): WorkArea {
  if (s.type === "TASK_TEMPLATE") return s.template.area;
  if (s.type === "PROJECT") return s.project.area ?? "SOFTWARE";
  const areas = new Set(s.templates.map((t) => t.area));
  return areas.size === 1 ? [...areas][0]! : "OUTRA";
}

const defaultTitle = (s: OfferSourceInput) => (s.type === "TASK_TEMPLATE" ? s.template.title : s.type === "PROJECT" ? s.project.title : s.templates.map((t) => t.title).join(" + "));

/** Valida sem gravar (a tela mostra o erro no campo). */
export function validateOffer(input: OfferAsModelInput, repo: ModelsRepository): OfferError | null {
  if (!canOfferModel(input.author.profile)) return "ACESSO_NEGADO";
  const title = (input.title ?? defaultTitle(input.source)).trim();
  if (!title) return "TITULO_OBRIGATORIO";
  if (title.length > MODEL_TITLE_MAX) return "TITULO_LONGO";
  if ((input.usageDescription ?? "").trim().length > MODEL_DESCRIPTION_MAX) return "DESCRICAO_LONGA";
  if (!(MODEL_LICENSES as readonly string[]).includes(input.license)) return "LICENCA_INVALIDA";
  const price = input.pricePoints;
  if (!Number.isInteger(price) || price < 0 || price > MODEL_MAX_PRICE) return "PRECO_INVALIDO";
  if (price > 0 && !input.author.canEarnPoints) return "PRECO_SEM_SALDO";
  if (input.source.type === "KIT" && input.source.templates.length < 2) return "KIT_VAZIO";
  const src = sourceOf(input.source);
  if (repo.list().some((o) => o.authorId === input.author.id && o.status === "ATIVA" && sameSource(o.source, src))) return "OFERTA_DUPLICADA";
  return null;
}

let seq = 0;

export function offerAsModel(input: OfferAsModelInput, repo: ModelsRepository, now = new Date()): OfferResult {
  const error = validateOffer(input, repo);
  if (error) return { ok: false, reason: error };
  const kind = input.source.type === "TASK_TEMPLATE" ? "TAREFA" : input.source.type === "PROJECT" ? "PROJETO" : "KIT";
  let id: string;
  do id = `mo-${now.getTime().toString(36)}-${(++seq).toString(36)}`; while (repo.get(id));
  const offer: ModelOffer = {
    id,
    kind,
    title: (input.title ?? defaultTitle(input.source)).trim(),
    usageDescription: (input.usageDescription ?? "").trim(),
    area: areaOf(input.source),
    department: input.author.department,
    authorId: input.author.id,
    authorName: input.author.name,
    license: input.license,
    pricePoints: input.pricePoints,
    shelf: "COMUNIDADE",
    sealName: null,
    status: "ATIVA",
    createdAt: now.toISOString(),
    source: sourceOf(input.source),
    reuseCount: 0,
    viewsCount: 0,
    pointsEarned: 0,
  };
  repo.add(offer);
  return { ok: true, offer };
}
