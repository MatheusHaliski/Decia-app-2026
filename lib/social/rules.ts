/**
 * Rede social do Work Station — regras PURAS (sem React, sem rede). Cada comando recebe o estado imutável e devolve um
 * novo estado ou um código de erro com o mesmo nome que a API usará (403 ACESSO_NEGADO, 409 ATRIBUICAO_DUPLICADA,
 * 422 MOTIVO_OBRIGATORIO…). Fontes: RF18.CA01–CA06, RF19 (RF26.CA01–CA09), RF16.CA03/CA05, RF6.CA05/CA06, RF14.CA04,
 * RF27; entidades de ws-domain `domain/social` (V16) e `domain/mensageria/Assignment` (V20). Escolhas onde o card é
 * ambíguo estão em docs/DECISOES.md D-90…D-94 (perguntas Q-190…Q-194).
 */
import type {
  AccessClassification, Assignment, AssignmentStatus, Comment, Follow, FollowTargetType, MuralEntry, NotificationCategory, NotificationType,
  QualitativeReaction, Reaction, ReactionType, SavedItem, Share, ShareChannel, SocialNotification, SocialPerson, SocialProject, SocialState,
  SocialTask, TargetRef, ViewerId, Visibility,
} from "./types";

/* ── Resultado e erros ─────────────────────────────────────────────────────────────────────────────────────── */
export type SocialErrorCode =
  | "NAO_AUTENTICADO" | "ACESSO_NEGADO" | "NAO_ENCONTRADO" | "PROPRIO_ITEM" | "CLASSIFICACAO_RESTRITA" | "NAO_PUBLICO" | "ESTADO_INVALIDO"
  | "COMENTARIO_VAZIO" | "COMENTARIO_LONGO" | "COMENTARIO_SO_AUTOR" | "COMENTARIO_REMOVIDO" | "SESSAO_OBRIGATORIA" | "SEGUIR_A_SI"
  | "AUTO_ATRIBUICAO" | "EMPRESA_DIFERENTE" | "DESTINATARIO_SEM_ACESSO" | "DESTINATARIO_INSTITUCIONAL" | "JA_RESPONSAVEL" | "ATRIBUICAO_DUPLICADA"
  | "ATRIBUICAO_JA_RESPONDIDA" | "ATRIBUICAO_TRANSICAO_INVALIDA" | "MOTIVO_OBRIGATORIO" | "MOTIVO_LONGO" | "MENSAGEM_LONGA" | "SEM_ATRIBUICAO"
  | "PRAZO_INVALIDO";

export type Permission = { ok: true } | { ok: false; reason: SocialErrorCode };
export type Result<T extends object = object> = ({ ok: true; state: SocialState } & T) | { ok: false; error: SocialErrorCode };

const OK: Permission = { ok: true };
const deny = (reason: SocialErrorCode): Permission => ({ ok: false, reason });
const fail = (error: SocialErrorCode): { ok: false; error: SocialErrorCode } => ({ ok: false, error });

/* ── Limites ───────────────────────────────────────────────────────────────────────────────────────────────── */
/** Limite do comentário na UI (Comment.contentMd é TEXT; 1000 como Assignment.message — D-91). */
export const COMMENT_MAX = 1000;
/** Assignment.message len = 1000 (V20). */
export const DELEGATE_MESSAGE_MAX = 1000;
/** Assignment.reason len = 500 (V20). */
export const REASON_MAX = 500;
/** RF18.CA05: retornar exige motivo com ≥ 20 caracteres. */
export const GIVE_BACK_MIN = 20;
/** Validade padrão e máxima do link externo (Share.expiresAt, RF26.CA05) — D-94. */
export const LINK_DEFAULT_DAYS = 7;
export const LINK_MAX_DAYS = 30;

const DAY = 86_400_000;

/* ── Leitura do estado ─────────────────────────────────────────────────────────────────────────────────────── */
export const personById = (s: SocialState, id: string | null | undefined) => (id ? s.people.find((p) => p.id === id) : undefined);
export const personByUsername = (s: SocialState, username: string) => s.people.find((p) => p.username === username);
export const departmentById = (s: SocialState, id: string | null | undefined) => (id ? s.departments.find((d) => d.id === id) : undefined);
export const departmentBySlug = (s: SocialState, slug: string) => s.departments.find((d) => d.slug === slug);
export const companyById = (s: SocialState, id: string | null | undefined) => (id ? s.companies.find((c) => c.id === id) : undefined);
export const companyBySlug = (s: SocialState, slug: string) => s.companies.find((c) => c.slug === slug);
export const taskById = (s: SocialState, id: string) => s.tasks.find((t) => t.id === id);
export const projectById = (s: SocialState, id: string) => s.projects.find((p) => p.id === id);

/** Alvo das interações: tarefa ou projeto, com os campos que as regras leem. */
export type Item = { kind: "TASK"; task: SocialTask } | { kind: "PROJECT"; project: SocialProject };

export function itemOf(s: SocialState, ref: TargetRef): Item | undefined {
  if (ref.type === "TASK") {
    const task = taskById(s, ref.id);
    return task ? { kind: "TASK", task } : undefined;
  }
  const project = projectById(s, ref.id);
  return project ? { kind: "PROJECT", project } : undefined;
}

export const refOf = (item: Item): TargetRef => (item.kind === "TASK" ? { type: "TASK", id: item.task.id } : { type: "PROJECT", id: item.project.id });
export const ownerOf = (item: Item) => (item.kind === "TASK" ? item.task.ownerId : item.project.ownerId);
export const titleOf = (item: Item) => (item.kind === "TASK" ? item.task.title : item.project.title);
export const visibilityOf = (item: Item): Visibility => (item.kind === "TASK" ? item.task.visibility : item.project.visibility);
export const departmentOf = (item: Item) => (item.kind === "TASK" ? item.task.departmentId : item.project.departmentId);
/** ProjectScheme não tem classificação de acesso (só Visibility): projeto conta como INTERNO. */
export const accessClassOf = (item: Item): AccessClassification => (item.kind === "TASK" ? item.task.accessClass : "INTERNO");
export const responsibleOf = (item: Item) => (item.kind === "TASK" ? item.task.responsibleId : item.project.responsibleId) ?? ownerOf(item);
/** RASCUNHO nunca aparece para terceiros (RF16.CA03). */
export const isDraft = (item: Item) => (item.kind === "TASK" ? item.task.state === "RASCUNHO" : item.project.status === "RASCUNHO");
/** CONCLUIDA/ARQUIVADA (tarefa) e CONCLUIDO/ARQUIVADO (projeto) não aceitam atribuição (RF18.CA03 409 ESTADO_INVALIDO). */
export const isClosed = (item: Item) =>
  item.kind === "TASK" ? item.task.state === "CONCLUIDA" || item.task.state === "ARQUIVADA" : item.project.status === "CONCLUIDO" || item.project.status === "ARQUIVADO";

export function companyOfItem(s: SocialState, item: Item): string | null {
  if (item.kind === "PROJECT" && item.project.companyId) return item.project.companyId;
  return departmentById(s, departmentOf(item))?.companyId ?? personById(s, ownerOf(item))?.companyId ?? null;
}

const sameTarget = (a: { targetType: string; targetId: string }, ref: TargetRef) => a.targetType === ref.type && a.targetId === ref.id;
const isRestricted = (c: AccessClassification) => c === "RESTRITO" || c === "SIGILOSO";

/* ── Visibilidade (RF16.CA03, RF6.CA06, RF26.CA08; D-93) ──────────────────────────────────────────────────── */
/** Atribuição em aberto (PROPOSTA/ACEITA) para `userId` neste alvo — dá leitura ao destinatário. */
export const openAssignmentFor = (s: SocialState, ref: TargetRef, userId: string) =>
  s.assignments.find((a) => a.targetType === ref.type && a.targetId === ref.id && a.toUserId === userId && (a.status === "PROPOSTA" || a.status === "ACEITA"));

/**
 * Quem vê o item: dono e responsável sempre; destinatário de atribuição em aberto; RASCUNHO e PRIVADA nunca para
 * terceiros; PUBLICA todos (inclusive visitante); EMPRESA mesma empresa; DEPARTAMENTO lotação vigente no departamento do
 * item. A classificação só restringe, como `AccessPolicy.effectiveVisibility` no backend: RESTRITO nunca passa do
 * departamento dono (RF17.CA03) e SIGILOSO equivale a PRIVADA — só vínculo explícito, nunca a lotação (D-93, rev. 17/10).
 */
export function canView(s: SocialState, viewer: ViewerId, item: Item): boolean {
  const owner = ownerOf(item);
  if (viewer && (viewer === owner || viewer === responsibleOf(item) || openAssignmentFor(s, refOf(item), viewer))) return true;
  if (isDraft(item)) return false;
  const v = visibilityOf(item);
  const person = personById(s, viewer);
  const accessClass = accessClassOf(item);
  if (accessClass === "SIGILOSO") return false;
  if (accessClass === "RESTRITO" && (!person || person.departmentId !== departmentOf(item))) return false;
  if (v === "PUBLICA") return true;
  if (!person) return false;
  if (v === "EMPRESA") return person.companyId !== null && person.companyId === companyOfItem(s, item);
  if (v === "DEPARTAMENTO") return person.departmentId !== null && person.departmentId === departmentOf(item);
  return false;
}

/** Qualquer interação exige login e leitura do alvo (RF26.CA08: 401 NAO_AUTENTICADO / 403 ACESSO_NEGADO). */
export function canInteract(s: SocialState, viewer: ViewerId, item: Item): Permission {
  if (!viewer || !personById(s, viewer)) return deny("NAO_AUTENTICADO");
  if (!canView(s, viewer, item)) return deny("ACESSO_NEGADO");
  return OK;
}

/* ── Notificações (RF26.CA09: ao dono, agrupadas por hora; nunca para si mesmo) ───────────────────────────── */
const CATEGORY: Partial<Record<NotificationType, NotificationCategory>> = {
  REACAO: "SOCIAL", COMENTARIO: "SOCIAL", MENCAO: "SOCIAL", REMIX: "SOCIAL",
  ATRIBUICAO_PROPOSTA: "SOCIAL", ATRIBUICAO_ACEITA: "SOCIAL", ATRIBUICAO_RECUSADA: "SOCIAL", ATRIBUICAO_DEVOLVIDA: "SOCIAL",
};

export interface NotifyInput {
  recipientId: string | null | undefined;
  actorId: string | null;
  type: NotificationType;
  resource: TargetRef;
  targetTitle: string;
  /** agrupa por (tipo, alvo, hora) — padrão true; atribuições são individuais (uma por Assignment) */
  aggregate?: boolean;
  /** discrimina notificações não agrupadas (ex.: id da atribuição) */
  key?: string;
}

export const hourBucket = (now: Date) => now.toISOString().slice(0, 13);

export function notify(s: SocialState, n: NotifyInput, now: Date): SocialState {
  if (!n.recipientId || n.recipientId === n.actorId) return s;
  const aggregate = n.aggregate ?? true;
  const groupKey = aggregate ? `${n.type}:${n.resource.type}:${n.resource.id}:${hourBucket(now)}` : `${n.type}:${n.resource.type}:${n.resource.id}:${n.key ?? ""}`;
  const existing = s.notifications.find((x) => x.recipientId === n.recipientId && x.groupKey === groupKey && (!aggregate || !x.read));
  if (existing) {
    if (!aggregate) return s;
    const actors = n.actorId && !existing.payload.actors.includes(n.actorId) ? [...existing.payload.actors, n.actorId] : existing.payload.actors;
    const updated: SocialNotification = { ...existing, actorId: n.actorId, payload: { ...existing.payload, actors, count: existing.payload.count + 1 }, createdAt: now.toISOString() };
    return { ...s, notifications: s.notifications.map((x) => (x.id === existing.id ? updated : x)) };
  }
  const note: SocialNotification = {
    id: nextId("n", s.notifications.map((x) => x.id)),
    recipientId: n.recipientId,
    actorId: n.actorId,
    type: n.type,
    category: CATEGORY[n.type] ?? "SISTEMA",
    resourceType: n.resource.type,
    resourceId: n.resource.id,
    title: `social.notif.${n.type}`,
    body: null,
    payload: { actors: n.actorId ? [n.actorId] : [], count: 1, targetTitle: n.targetTitle },
    groupKey,
    read: false,
    readAt: null,
    createdAt: now.toISOString(),
  };
  return { ...s, notifications: [note, ...s.notifications] };
}

export function markNotificationsRead(s: SocialState, viewer: string, now: Date, ids?: readonly string[]): SocialState {
  return { ...s, notifications: s.notifications.map((x) => (x.recipientId === viewer && !x.read && (!ids || ids.includes(x.id)) ? { ...x, read: true, readAt: now.toISOString() } : x)) };
}

export const notificationsFor = (s: SocialState, viewer: ViewerId) => (viewer ? s.notifications.filter((x) => x.recipientId === viewer) : []);

/* ── Ids determinísticos (DEMO; a API gera UUID) ──────────────────────────────────────────────────────────── */
export function nextId(prefix: string, used: readonly string[]): string {
  const taken = new Set(used);
  let n = used.length + 1;
  while (taken.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

/* ── Reações (RF26.CA01/CA02; D-90) ──────────────────────────────────────────────────────────────────────── */
export const reactionsOf = (s: SocialState, ref: TargetRef) => s.reactions.filter((r) => sameTarget(r, ref));
export const myReactions = (s: SocialState, ref: TargetRef, viewer: ViewerId) => (viewer ? reactionsOf(s, ref).filter((r) => r.actorId === viewer) : []);
export const hasLiked = (s: SocialState, ref: TargetRef, viewer: ViewerId) => myReactions(s, ref, viewer).some((r) => r.reactionType === "CURTIR");
export const myQualitative = (s: SocialState, ref: TargetRef, viewer: ViewerId): QualitativeReaction | null =>
  (myReactions(s, ref, viewer).find((r) => r.reactionType !== "CURTIR")?.reactionType as QualitativeReaction | undefined) ?? null;

/**
 * CURTIR liga/desliga (único por ator e alvo, RF26.CA01). As qualitativas (RF26.CA02) são excludentes entre si: escolher
 * outra substitui, repetir a mesma remove (D-90). Reação do próprio dono fica registrada com `ignoredReason
 * AUTO_INTERACAO` (não pesa no Hype, RF45.CA03) e não notifica.
 */
export function react(s: SocialState, viewer: ViewerId, ref: TargetRef, type: ReactionType, now: Date): Result<{ active: boolean }> {
  const item = itemOf(s, ref);
  if (!item) return fail("NAO_ENCONTRADO");
  const perm = canInteract(s, viewer, item);
  if (!perm.ok) return fail(perm.reason);
  const actor = viewer!;
  const mine = myReactions(s, ref, actor);
  const same = mine.find((r) => r.reactionType === type);
  if (same) return { ok: true, active: false, state: { ...s, reactions: s.reactions.filter((r) => r.id !== same.id) } };
  const replaced = type === "CURTIR" ? [] : mine.filter((r) => r.reactionType !== "CURTIR").map((r) => r.id);
  const own = ownerOf(item) === actor;
  const reaction: Reaction = {
    id: nextId("r", s.reactions.map((r) => r.id)), actorId: actor, targetType: ref.type, targetId: ref.id, reactionType: type, at: now.toISOString(),
    actorHypeAtTime: personById(s, actor)?.hype ?? null, ignoredReason: own ? "AUTO_INTERACAO" : null,
  };
  let next: SocialState = { ...s, reactions: [...s.reactions.filter((r) => !replaced.includes(r.id)), reaction] };
  if (!own) next = notify(next, { recipientId: ownerOf(item), actorId: actor, type: "REACAO", resource: ref, targetTitle: titleOf(item) }, now);
  return { ok: true, active: true, state: next };
}

/* ── Contadores (RF26.CA07) ──────────────────────────────────────────────────────────────────────────────── */
export interface Counters { likes: number; comments: number; saves: number; shares: number; remixes: number; reactions: Record<QualitativeReaction, number> }

export function countersOf(s: SocialState, ref: TargetRef): Counters {
  const reactions = reactionsOf(s, ref);
  return {
    likes: reactions.filter((r) => r.reactionType === "CURTIR").length,
    comments: s.comments.filter((c) => sameTarget(c, ref) && c.active).length,
    saves: s.saved.filter((x) => sameTarget(x, ref)).length,
    shares: s.shares.filter((x) => sameTarget(x, ref)).length,
    remixes: s.remixes.filter((x) => x.sourceType === ref.type && x.sourceId === ref.id).length,
    reactions: {
      UTIL: reactions.filter((r) => r.reactionType === "UTIL").length,
      BEM_FUNDAMENTADO: reactions.filter((r) => r.reactionType === "BEM_FUNDAMENTADO").length,
      INOVADOR: reactions.filter((r) => r.reactionType === "INOVADOR").length,
      CONFORME: reactions.filter((r) => r.reactionType === "CONFORME").length,
    },
  };
}

/* ── Comentários (RF26.CA03; D-91) ───────────────────────────────────────────────────────────────────────── */
/** @usuário existentes (sem repetição) citados no texto. */
export function parseMentions(s: SocialState, text: string): string[] {
  const names = [...text.matchAll(/(^|[^\w.@])@([a-z0-9][a-z0-9._-]*[a-z0-9])/gi)].map((m) => m[2]!.toLowerCase());
  return [...new Set(names)].filter((u) => !!personByUsername(s, u));
}

function validateContent(text: string): SocialErrorCode | null {
  const t = text.trim();
  if (!t) return "COMENTARIO_VAZIO";
  if (t.length > COMMENT_MAX) return "COMENTARIO_LONGO";
  return null;
}

/**
 * Comenta ou responde. Respostas têm UM nível: responder a uma resposta pendura no comentário raiz (D-91). Notifica o
 * dono (COMENTARIO, agrupado), o autor do comentário respondido e cada @menção que possa ver o item (MENCAO).
 */
export function addComment(s: SocialState, viewer: ViewerId, ref: TargetRef, content: string, now: Date, parentCommentId: string | null = null): Result<{ commentId: string }> {
  const item = itemOf(s, ref);
  if (!item) return fail("NAO_ENCONTRADO");
  const perm = canInteract(s, viewer, item);
  if (!perm.ok) return fail(perm.reason);
  const invalid = validateContent(content);
  if (invalid) return fail(invalid);
  let parent: Comment | undefined;
  if (parentCommentId) {
    parent = s.comments.find((c) => c.id === parentCommentId && sameTarget(c, ref));
    if (!parent) return fail("NAO_ENCONTRADO");
    if (parent.parentCommentId) parent = s.comments.find((c) => c.id === parent!.parentCommentId) ?? parent;
  }
  const actor = viewer!;
  const text = content.trim();
  const mentions = parseMentions(s, text);
  const comment: Comment = {
    id: nextId("c", s.comments.map((c) => c.id)), authorId: actor, targetType: ref.type, targetId: ref.id, parentCommentId: parent?.id ?? null,
    contentMd: text, mentions, editedAt: null, deletedBy: null, active: true, createdAt: now.toISOString(),
  };
  let next: SocialState = { ...s, comments: [...s.comments, comment] };
  const title = titleOf(item);
  next = notify(next, { recipientId: ownerOf(item), actorId: actor, type: "COMENTARIO", resource: ref, targetTitle: title }, now);
  if (parent && parent.authorId !== ownerOf(item)) next = notify(next, { recipientId: parent.authorId, actorId: actor, type: "COMENTARIO", resource: ref, targetTitle: title }, now);
  for (const username of mentions) {
    const p = personByUsername(next, username);
    if (p && canView(next, p.id, item)) next = notify(next, { recipientId: p.id, actorId: actor, type: "MENCAO", resource: ref, targetTitle: title }, now);
  }
  return { ok: true, commentId: comment.id, state: next };
}

/** Editar: só o autor, comentário ativo; grava `editedAt` (sem janela de edição no domínio — Q-191). */
export function editComment(s: SocialState, viewer: ViewerId, commentId: string, content: string, now: Date): Result {
  const c = s.comments.find((x) => x.id === commentId);
  if (!c) return fail("NAO_ENCONTRADO");
  if (!viewer) return fail("NAO_AUTENTICADO");
  if (!c.active) return fail("COMENTARIO_REMOVIDO");
  if (c.authorId !== viewer) return fail("COMENTARIO_SO_AUTOR");
  const invalid = validateContent(content);
  if (invalid) return fail(invalid);
  const text = content.trim();
  const mentions = parseMentions(s, text);
  const updated: Comment = { ...c, contentMd: text, mentions, editedAt: now.toISOString() };
  let next: SocialState = { ...s, comments: s.comments.map((x) => (x.id === commentId ? updated : x)) };
  // só as menções NOVAS da edição notificam (sem repetir quem já foi mencionado, sem auto-notificação)
  const ref: TargetRef = { type: c.targetType as TargetRef["type"], id: c.targetId };
  const item = itemOf(next, ref);
  if (item) {
    for (const username of mentions.filter((u) => !c.mentions.includes(u))) {
      const p = personByUsername(next, username);
      if (p && canView(next, p.id, item)) next = notify(next, { recipientId: p.id, actorId: viewer, type: "MENCAO", resource: ref, targetTitle: titleOf(item), aggregate: false, key: `${c.id}:${username}` }, now);
    }
  }
  return { ok: true, state: next };
}

/** Quem pode excluir: o autor ou o chefe do departamento do item (RF26.CA03). */
export function canDeleteComment(s: SocialState, viewer: ViewerId, c: Comment): boolean {
  if (!viewer || !c.active) return false;
  if (c.authorId === viewer) return true;
  const item = itemOf(s, { type: c.targetType as TargetRef["type"], id: c.targetId });
  return !!item && departmentById(s, departmentOf(item))?.headUserId === viewer;
}

/** Exclusão é lógica: `active = false` + `deletedBy` (Comment V16); as respostas continuam. */
export function deleteComment(s: SocialState, viewer: ViewerId, commentId: string): Result {
  const c = s.comments.find((x) => x.id === commentId);
  if (!c) return fail("NAO_ENCONTRADO");
  if (!viewer) return fail("NAO_AUTENTICADO");
  if (!c.active) return fail("COMENTARIO_REMOVIDO");
  if (!canDeleteComment(s, viewer, c)) return fail("COMENTARIO_SO_AUTOR");
  return { ok: true, state: { ...s, comments: s.comments.map((x) => (x.id === commentId ? { ...x, active: false, deletedBy: viewer } : x)) } };
}

export interface ThreadNode { comment: Comment; replies: Comment[] }
/** Raízes em ordem cronológica com as respostas; raiz removida só aparece (como "removido") se tiver resposta ativa. */
export function threadOf(s: SocialState, ref: TargetRef): ThreadNode[] {
  const all = s.comments.filter((c) => sameTarget(c, ref)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return all
    .filter((c) => !c.parentCommentId)
    .map((comment) => ({ comment, replies: all.filter((r) => r.parentCommentId === comment.id && r.active) }))
    .filter((n) => n.comment.active || n.replies.length > 0);
}

/* ── Salvar (RF26.CA04, RF6.CA05) ───────────────────────────────────────────────────────────────────────────── */
export const savedOf = (s: SocialState, ref: TargetRef, viewer: ViewerId) => (viewer ? s.saved.find((x) => x.userId === viewer && sameTarget(x, ref)) : undefined);

export function toggleSave(s: SocialState, viewer: ViewerId, ref: TargetRef, now: Date): Result<{ saved: boolean }> {
  const existing = savedOf(s, ref, viewer);
  // remover dos salvos vale mesmo se o alvo ficou invisível ou deixou de existir (RF6.CA05 "indisponível" → Remover)
  if (existing) return { ok: true, saved: false, state: { ...s, saved: s.saved.filter((x) => x.id !== existing.id) } };
  const item = itemOf(s, ref);
  if (!item) return fail("NAO_ENCONTRADO");
  const perm = canInteract(s, viewer, item);
  if (!perm.ok) return fail(perm.reason);
  const saved: SavedItem = { id: nextId("s", s.saved.map((x) => x.id)), userId: viewer!, targetType: ref.type, targetId: ref.id, favorite: false, savedAt: now.toISOString() };
  return { ok: true, saved: true, state: { ...s, saved: [...s.saved, saved] } };
}

/** Marcador de favorito do salvo (SavedItem.favorite); favoritar algo não salvo salva já como favorito. */
export function toggleFavorite(s: SocialState, viewer: ViewerId, ref: TargetRef, now: Date): Result<{ favorite: boolean }> {
  const existing = savedOf(s, ref, viewer);
  if (!existing) {
    const r = toggleSave(s, viewer, ref, now);
    if (!r.ok) return r;
    return { ok: true, favorite: true, state: { ...r.state, saved: r.state.saved.map((x) => (x.userId === viewer && sameTarget(x, ref) ? { ...x, favorite: true } : x)) } };
  }
  return { ok: true, favorite: !existing.favorite, state: { ...s, saved: s.saved.map((x) => (x.id === existing.id ? { ...x, favorite: !x.favorite } : x)) } };
}

/** Salvos do usuário por tipo, com o alvo marcado "indisponível" quando ele não pode mais vê-lo (RF6.CA05). */
export function savedListOf(s: SocialState, viewer: ViewerId, type: "TASK" | "PROJECT") {
  if (!viewer) return [];
  return s.saved
    .filter((x) => x.userId === viewer && x.targetType === type)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .map((x) => {
      const item = itemOf(s, { type, id: x.targetId });
      return { saved: x, available: !!item && canView(s, viewer, item) };
    });
}

/* ── Compartilhar (RF26.CA05; D-94) ──────────────────────────────────────────────────────────────────────── */
export function shareChannelPermission(s: SocialState, viewer: ViewerId, item: Item, channel: ShareChannel): Permission {
  const base = canInteract(s, viewer, item);
  if (!base.ok) return base;
  const cls = accessClassOf(item);
  const vis = visibilityOf(item);
  if (channel === "MURAL") {
    if (isRestricted(cls)) return deny("CLASSIFICACAO_RESTRITA");
    if (vis === "PRIVADA" || isDraft(item)) return deny("NAO_PUBLICO");
    return OK;
  }
  if (channel === "SESSAO_DECIA") return cls === "SIGILOSO" ? deny("CLASSIFICACAO_RESTRITA") : OK;
  // link externo só para item PÚBLICO de verdade: visibilidade PUBLICA e classificação PUBLICO (INTERNO não sai da casa)
  if (isRestricted(cls) || (item.kind === "TASK" && cls !== "PUBLICO")) return deny("CLASSIFICACAO_RESTRITA");
  if (vis !== "PUBLICA" || isDraft(item)) return deny("NAO_PUBLICO");
  return OK;
}

export interface ShareOptions { sessionId?: string | null; expiresInDays?: number }

/**
 * Compartilha: MURAL cria também a `MuralEntry COMPARTILHAMENTO` na empresa do ator (RF27); SESSAO_DECIA exige a sessão;
 * LINK_EXTERNO gera token e validade (1–30 dias, padrão 7). Não há NotificationType de compartilhamento no domínio, então
 * o dono não é notificado (Q-194).
 */
export function share(s: SocialState, viewer: ViewerId, ref: TargetRef, channel: ShareChannel, now: Date, opts: ShareOptions = {}): Result<{ shareId: string; link: string | null }> {
  const item = itemOf(s, ref);
  if (!item) return fail("NAO_ENCONTRADO");
  const perm = shareChannelPermission(s, viewer, item, channel);
  if (!perm.ok) return fail(perm.reason);
  const actor = personById(s, viewer)!;
  if (channel === "SESSAO_DECIA" && (!opts.sessionId || !s.sessions.some((x) => x.id === opts.sessionId))) return fail("SESSAO_OBRIGATORIA");
  const id = nextId("sh", s.shares.map((x) => x.id));
  const days = Math.min(LINK_MAX_DAYS, Math.max(1, Math.round(opts.expiresInDays ?? LINK_DEFAULT_DAYS)));
  const token = channel === "LINK_EXTERNO" ? `demo${simpleHash(`${id}:${ref.id}:${now.toISOString()}`)}` : null;
  const sh: Share = {
    id, actorId: actor.id, targetType: ref.type, targetId: ref.id, channel, sessionId: channel === "SESSAO_DECIA" ? opts.sessionId! : null,
    externalToken: token, expiresAt: token ? new Date(now.getTime() + days * DAY).toISOString() : null, imageMediaId: null, createdAt: now.toISOString(),
  };
  let next: SocialState = { ...s, shares: [...s.shares, sh] };
  if (channel === "MURAL" && actor.companyId) {
    const entry: MuralEntry = {
      id: nextId("m", s.mural.map((x) => x.id)), companyId: actor.companyId, departmentId: actor.departmentId, kind: "COMPARTILHAMENTO",
      targetType: ref.type, targetId: ref.id, actorId: actor.id, boostUntil: null, at: now.toISOString(),
    };
    next = { ...next, mural: [entry, ...next.mural] };
  }
  return { ok: true, shareId: id, link: token ? `/s/${token}` : null, state: next };
}

/** Hash curto e estável (DEMO — o token real vem de SecureRandom no backend). */
export function simpleHash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}

/* ── Remixar (RF26.CA06; D-92) ───────────────────────────────────────────────────────────────────────────── */
/**
 * Remix exige login, leitura, item de outra pessoa, visibilidade além do departamento (PUBLICA ou EMPRESA — "pública"
 * do RF26.CA06, Q-192) e classificação PUBLICO/INTERNO: RESTRITO e SIGILOSO nunca são remixados.
 */
export function remixPermission(s: SocialState, viewer: ViewerId, item: Item): Permission {
  const base = canInteract(s, viewer, item);
  if (!base.ok) return base;
  if (ownerOf(item) === viewer) return deny("PROPRIO_ITEM");
  if (isRestricted(accessClassOf(item))) return deny("CLASSIFICACAO_RESTRITA");
  const v = visibilityOf(item);
  if (isDraft(item) || (v !== "PUBLICA" && v !== "EMPRESA")) return deny("NAO_PUBLICO");
  return OK;
}

/** Cadeia de créditos: do item até o original (pai, avô…), sem ciclos. */
export function remixChain(s: SocialState, ref: TargetRef): { id: string; title: string; ownerId: string }[] {
  const out: { id: string; title: string; ownerId: string }[] = [];
  const seen = new Set<string>([ref.id]);
  let current = itemOf(s, ref);
  while (current) {
    const parentId = current.kind === "TASK" ? current.task.originalTaskId : current.project.originalProjectId;
    if (!parentId || seen.has(parentId)) break;
    seen.add(parentId);
    const parent = itemOf(s, { type: ref.type, id: parentId });
    if (!parent) break;
    out.push({ id: parentId, title: titleOf(parent), ownerId: ownerOf(parent) });
    current = parent;
  }
  return out;
}

/** "remixado por N pessoas" (atores distintos que remixaram este item). */
export const remixedByCount = (s: SocialState, ref: TargetRef) => new Set(s.remixes.filter((r) => r.sourceType === ref.type && r.sourceId === ref.id).map((r) => r.actorId)).size;

/** O que o remix copia e o que fica para trás (mostrado no RemixDialog). */
export const REMIX_COPIES = { TASK: ["title", "summary", "type", "category", "format", "accessClass", "aiGenerated", "cover"], PROJECT: ["title", "objective", "phase", "tasks", "cover"] } as const;
export const REMIX_LEAVES = ["comments", "reactions", "saves", "seals", "responsible", "dueDate", "visibility"] as const;

/**
 * Cria a cópia no Acervo de quem remixou: dono = ator, RASCUNHO, PRIVADA, sem contadores/chancelas/prazo; crédito por
 * `originalTaskId`/`originalProjectId` = item de origem (a cadeia segue pelos pais); `reuseCount` da origem +1; Remix
 * registrado; o autor da origem e o do original recebem REMIX (sem auto-notificação).
 */
export function remix(s: SocialState, viewer: ViewerId, ref: TargetRef, now: Date): Result<{ resultId: string }> {
  const item = itemOf(s, ref);
  if (!item) return fail("NAO_ENCONTRADO");
  const perm = remixPermission(s, viewer, item);
  if (!perm.ok) return fail(perm.reason);
  const actor = personById(s, viewer)!;
  const at = now.toISOString();
  let next: SocialState;
  let resultId: string;
  if (item.kind === "TASK") {
    const src = item.task;
    resultId = nextId("t-remix", s.tasks.filter((t) => t.id.startsWith("t-remix-")).map((t) => t.id));
    const copy: SocialTask = {
      ...src, id: resultId, ownerId: actor.id, departmentId: actor.departmentId, responsibleId: actor.id, dueAt: null, legalDueAt: null, state: "RASCUNHO",
      blockReason: null, visibility: "PRIVADA", favorite: false, originalTaskId: src.id, reuseCount: 0, seals: [], createdAt: at,
    };
    next = { ...s, tasks: [copy, ...s.tasks.map((t) => (t.id === src.id ? { ...t, reuseCount: t.reuseCount + 1 } : t))] };
  } else {
    const src = item.project;
    resultId = nextId("p-remix", s.projects.filter((p) => p.id.startsWith("p-remix-")).map((p) => p.id));
    const copy: SocialProject = {
      ...src, id: resultId, ownerId: actor.id, companyId: actor.companyId, departmentId: actor.departmentId, origin: "REMIX", originalProjectId: src.id,
      status: "RASCUNHO", visibility: "PRIVADA", nextMilestoneAt: null, lastDeciaEventLabel: null, responsibleId: actor.id, seals: [], createdAt: at,
    };
    next = { ...s, projects: [copy, ...s.projects] };
  }
  next = { ...next, remixes: [...next.remixes, { id: nextId("rx", s.remixes.map((r) => r.id)), actorId: actor.id, sourceType: ref.type, sourceId: ref.id, resultType: ref.type, resultId, modelOfferId: null, ledgerEntryId: null, at }] };
  const title = titleOf(item);
  next = notify(next, { recipientId: ownerOf(item), actorId: actor.id, type: "REMIX", resource: ref, targetTitle: title }, now);
  const root = remixChain(s, ref).at(-1);
  if (root && root.ownerId !== ownerOf(item)) next = notify(next, { recipientId: root.ownerId, actorId: actor.id, type: "REMIX", resource: { type: ref.type, id: root.id }, targetTitle: root.title }, now);
  return { ok: true, resultId, state: next };
}

/* ── Seguir (RF14.CA04, RF15.CA05, RF16.CA01; idempotente e reativável; D-90) ─────────────────────────────── */
export const followOf = (s: SocialState, viewer: ViewerId, targetType: FollowTargetType, targetId: string) =>
  viewer ? s.follows.find((f) => f.followerId === viewer && f.targetType === targetType && f.targetId === targetId) : undefined;
export const isFollowing = (s: SocialState, viewer: ViewerId, targetType: FollowTargetType, targetId: string) => followOf(s, viewer, targetType, targetId)?.status === "ATIVO";
export const followersCount = (s: SocialState, targetType: FollowTargetType, targetId: string) => s.follows.filter((f) => f.targetType === targetType && f.targetId === targetId && f.status === "ATIVO").length;
/** "Seguindo" no cabeçalho do perfil: follows ATIVO feitos pela pessoa (usuários, departamentos e empresas). */
export const followingCount = (s: SocialState, followerId: string) => s.follows.filter((f) => f.followerId === followerId && f.status === "ATIVO").length;

/** Liga/desliga o Follow: cria ATIVO; ATIVO → REMOVIDO; REMOVIDO → ATIVO no MESMO registro (único por follower+alvo). */
export function toggleFollow(s: SocialState, viewer: ViewerId, targetType: FollowTargetType, targetId: string, now: Date): Result<{ following: boolean }> {
  if (!viewer || !personById(s, viewer)) return fail("NAO_AUTENTICADO");
  const exists = targetType === "USER" ? !!personById(s, targetId) : targetType === "DEPARTMENT" ? !!departmentById(s, targetId) : !!companyById(s, targetId);
  if (!exists) return fail("NAO_ENCONTRADO");
  if (targetType === "USER" && targetId === viewer) return fail("SEGUIR_A_SI");
  const existing = followOf(s, viewer, targetType, targetId);
  if (existing) {
    const status = existing.status === "ATIVO" ? "REMOVIDO" : "ATIVO";
    return { ok: true, following: status === "ATIVO", state: { ...s, follows: s.follows.map((f) => (f.id === existing.id ? { ...f, status, at: now.toISOString() } : f)) } };
  }
  const follow: Follow = { id: nextId("f", s.follows.map((f) => f.id)), followerId: viewer, targetType, targetId, status: "ATIVO", at: now.toISOString() };
  return { ok: true, following: true, state: { ...s, follows: [...s.follows, follow] } };
}

/* ── Atribuição / Delegar (RF18.CA03–CA06, RF10, RF46; Assignment V20; D-92) ──────────────────────────────── */
/** Máquina do Java `AssignmentStatus`: PROPOSTA → ACEITA | RECUSADA; ACEITA → DEVOLVIDA; RECUSADA e DEVOLVIDA finais. */
export const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, readonly AssignmentStatus[]> = {
  PROPOSTA: ["ACEITA", "RECUSADA"],
  ACEITA: ["DEVOLVIDA"],
  RECUSADA: [],
  DEVOLVIDA: [],
};
export const canTransition = (from: AssignmentStatus, to: AssignmentStatus) => ASSIGNMENT_TRANSITIONS[from].includes(to);
export const requiresReason = (to: AssignmentStatus) => to === "RECUSADA" || to === "DEVOLVIDA";

export type RespondResult = { ok: true; assignment: Assignment } | { ok: false; error: SocialErrorCode };
/**
 * Espelho de `Assignment.respond(responder, to, why, at)`: só o destinatário (ACESSO_NEGADO); fora de PROPOSTA só cabe
 * DEVOLVIDA (ATRIBUICAO_JA_RESPONDIDA); transição pela máquina (ATRIBUICAO_TRANSICAO_INVALIDA); RECUSADA/DEVOLVIDA sem
 * motivo → MOTIVO_OBRIGATORIO. Mesma ordem de verificação do Java.
 */
export function respond(a: Assignment, responder: string, to: AssignmentStatus, why: string | null, at: Date): RespondResult {
  if (a.toUserId !== responder) return { ok: false, error: "ACESSO_NEGADO" };
  if (a.status !== "PROPOSTA" && to !== "DEVOLVIDA") return { ok: false, error: "ATRIBUICAO_JA_RESPONDIDA" };
  if (!canTransition(a.status, to)) return { ok: false, error: "ATRIBUICAO_TRANSICAO_INVALIDA" };
  if (requiresReason(to) && (!why || !why.trim())) return { ok: false, error: "MOTIVO_OBRIGATORIO" };
  return { ok: true, assignment: { ...a, status: to, reason: why, respondedAt: at.toISOString() } };
}

/**
 * Quem pode delegar (RF18.CA03): qualquer pessoa logada que VÊ o item, da mesma empresa do item; item fechado não
 * (ESTADO_INVALIDO); SIGILOSO só o dono delega (D-92).
 */
export function delegatePermission(s: SocialState, viewer: ViewerId, item: Item): Permission {
  const base = canInteract(s, viewer, item);
  if (!base.ok) return base;
  if (isClosed(item) || isDraft(item) && ownerOf(item) !== viewer) return deny("ESTADO_INVALIDO");
  const actor = personById(s, viewer)!;
  if (!actor.companyId || actor.companyId !== companyOfItem(s, item)) return deny("EMPRESA_DIFERENTE");
  if (accessClassOf(item) === "SIGILOSO" && ownerOf(item) !== viewer) return deny("CLASSIFICACAO_RESTRITA");
  return OK;
}

/** Destinatário válido: outra pessoa, da mesma empresa, não institucional, com acesso à classificação, sem duplicata. */
export function recipientPermission(s: SocialState, viewer: ViewerId, item: Item, toUserId: string): Permission {
  if (toUserId === viewer) return deny("AUTO_ATRIBUICAO");
  const to = personById(s, toUserId);
  if (!to) return deny("NAO_ENCONTRADO");
  if (to.profileType === "EMPRESA") return deny("DESTINATARIO_INSTITUCIONAL");
  const actor = personById(s, viewer);
  if (!actor || !to.companyId || to.companyId !== actor.companyId) return deny("EMPRESA_DIFERENTE");
  if (responsibleOf(item) === toUserId) return deny("JA_RESPONSAVEL");
  if (isRestricted(accessClassOf(item)) && to.departmentId !== departmentOf(item)) return deny("DESTINATARIO_SEM_ACESSO");
  if (openAssignmentFor(s, refOf(item), toUserId)) return deny("ATRIBUICAO_DUPLICADA");
  return OK;
}

/** Pessoas que aparecem no autocomplete do Delegar (mesma empresa, não institucionais, exceto o ator). */
export function delegateCandidates(s: SocialState, viewer: ViewerId, query = ""): SocialPerson[] {
  const actor = personById(s, viewer);
  if (!actor?.companyId) return [];
  const q = query.trim().toLowerCase().replace(/^@/, "");
  return s.people
    .filter((p) => p.id !== actor.id && p.companyId === actor.companyId && p.profileType !== "EMPRESA")
    .filter((p) => !q || p.fullName.toLowerCase().includes(q) || p.username.includes(q) || (departmentById(s, p.departmentId)?.acronym.toLowerCase().includes(q) ?? false));
}

export interface DelegateInput { toUserId: string; message?: string | null; dueAt?: string | null }

/**
 * Delegar: cria `Assignment PROPOSTA` (origem MINHA_EQUIPE se o ator chefia o departamento do destinatário — RF10 —,
 * senão BOTAO_ESQUEMA), `previousResponsibleId` = responsável atual, e UMA notificação ATRIBUICAO_PROPOSTA.
 */
export function delegate(s: SocialState, viewer: ViewerId, ref: TargetRef, input: DelegateInput, now: Date): Result<{ assignmentId: string }> {
  const item = itemOf(s, ref);
  if (!item) return fail("NAO_ENCONTRADO");
  const perm = delegatePermission(s, viewer, item);
  if (!perm.ok) return fail(perm.reason);
  const rp = recipientPermission(s, viewer, item, input.toUserId);
  if (!rp.ok) return fail(rp.reason);
  const message = input.message?.trim() || null;
  if (message && message.length > DELEGATE_MESSAGE_MAX) return fail("MENSAGEM_LONGA");
  if (input.dueAt && input.dueAt.slice(0, 10) < now.toISOString().slice(0, 10)) return fail("PRAZO_INVALIDO");
  const to = personById(s, input.toUserId)!;
  const head = departmentById(s, to.departmentId)?.headUserId === viewer;
  const a: Assignment = {
    id: nextId("a", s.assignments.map((x) => x.id)), targetType: ref.type, targetId: ref.id, fromUserId: viewer!, toUserId: to.id,
    origin: head ? "MINHA_EQUIPE" : "BOTAO_ESQUEMA", status: "PROPOSTA", dueAt: input.dueAt ?? null, message, reason: null,
    previousResponsibleId: responsibleOf(item), traceNodeId: null, respondedAt: null, createdAt: now.toISOString(),
  };
  let next: SocialState = { ...s, assignments: [a, ...s.assignments] };
  next = notify(next, { recipientId: to.id, actorId: viewer, type: "ATRIBUICAO_PROPOSTA", resource: ref, targetTitle: titleOf(item), aggregate: false, key: a.id }, now);
  return { ok: true, assignmentId: a.id, state: next };
}

function setResponsible(s: SocialState, ref: TargetRef, responsibleId: string | null, startUse: boolean): SocialState {
  if (ref.type === "TASK") {
    return { ...s, tasks: s.tasks.map((t) => (t.id === ref.id ? { ...t, responsibleId, state: startUse && t.state === "DISPONIVEL" ? "EM_USO" : t.state } : t)) };
  }
  return { ...s, projects: s.projects.map((p) => (p.id === ref.id ? { ...p, responsibleId } : p)) };
}

const RESPONSE_NOTIFICATION: Partial<Record<AssignmentStatus, NotificationType>> = { ACEITA: "ATRIBUICAO_ACEITA", RECUSADA: "ATRIBUICAO_RECUSADA", DEVOLVIDA: "ATRIBUICAO_DEVOLVIDA" };

/**
 * Resposta do destinatário (Aceitar · Recusar · Retornar/Devolver): `respond` do Java + efeitos — ACEITA passa o
 * responsável ao destinatário (DISPONIVEL → EM_USO, RF18.CA04); DEVOLVIDA devolve a `previousResponsibleId` e exige
 * motivo ≥ 20 caracteres (RF18.CA05); motivo ≤ 500 (V20); o remetente recebe a notificação da resposta.
 */
export function respondToAssignment(s: SocialState, viewer: ViewerId, assignmentId: string, to: AssignmentStatus, reason: string | null, now: Date): Result {
  const a = s.assignments.find((x) => x.id === assignmentId);
  if (!a) return fail("NAO_ENCONTRADO");
  if (!viewer) return fail("NAO_AUTENTICADO");
  const why = reason?.trim() || null;
  if (why && why.length > REASON_MAX) return fail("MOTIVO_LONGO");
  const r = respond(a, viewer, to, why, now);
  if (!r.ok) return fail(r.error);
  if (to === "DEVOLVIDA" && (why?.length ?? 0) < GIVE_BACK_MIN) return fail("MOTIVO_OBRIGATORIO");
  const ref: TargetRef = { type: a.targetType, id: a.targetId };
  let next: SocialState = { ...s, assignments: s.assignments.map((x) => (x.id === a.id ? r.assignment : x)) };
  if (to === "ACEITA") next = setResponsible(next, ref, a.toUserId, true);
  if (to === "DEVOLVIDA") next = setResponsible(next, ref, a.previousResponsibleId, false);
  const item = itemOf(next, ref);
  const type = RESPONSE_NOTIFICATION[to];
  if (type) next = notify(next, { recipientId: a.fromUserId, actorId: viewer, type, resource: ref, targetTitle: item ? titleOf(item) : "", aggregate: false, key: `${a.id}:${to}` }, now);
  return { ok: true, state: next };
}

/** "Retornar" da barra social (RF18.CA05): devolve a atribuição ACEITA do viewer neste alvo; sem ela → SEM_ATRIBUICAO. */
export function giveBackPermission(s: SocialState, viewer: ViewerId, ref: TargetRef): Permission {
  if (!viewer) return deny("NAO_AUTENTICADO");
  return acceptedAssignmentFor(s, ref, viewer) ? OK : deny("SEM_ATRIBUICAO");
}
export const acceptedAssignmentFor = (s: SocialState, ref: TargetRef, viewer: string) =>
  s.assignments.find((a) => a.targetType === ref.type && a.targetId === ref.id && a.toUserId === viewer && a.status === "ACEITA");

export function giveBack(s: SocialState, viewer: ViewerId, ref: TargetRef, reason: string, now: Date): Result {
  const perm = giveBackPermission(s, viewer, ref);
  if (!perm.ok) return fail(perm.reason);
  return respondToAssignment(s, viewer, acceptedAssignmentFor(s, ref, viewer!)!.id, "DEVOLVIDA", reason, now);
}

/** Atribuições de um alvo, mais recentes primeiro (histórico do RF18.CA06). */
export const assignmentsOf = (s: SocialState, ref: TargetRef) =>
  s.assignments.filter((a) => a.targetType === ref.type && a.targetId === ref.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** "Delegadas a mim": PROPOSTA e ACEITA primeiro, depois as respondidas recentes. */
export function assignmentsTo(s: SocialState, viewer: ViewerId) {
  if (!viewer) return [];
  const rank: Record<AssignmentStatus, number> = { PROPOSTA: 0, ACEITA: 1, DEVOLVIDA: 2, RECUSADA: 3 };
  return s.assignments.filter((a) => a.toUserId === viewer).sort((a, b) => rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt));
}

/* ── O que aparece num perfil (RF6.CA01/CA06, RF16.CA02/CA03, RF18.CA06) ─────────────────────────────────── */
/** Tarefas do perfil: as do dono + as que ele aceitou por delegação (etiqueta "delegada por"), filtradas pelo viewer. */
export function profileTasks(s: SocialState, viewer: ViewerId, ownerId: string): SocialTask[] {
  const delegated = new Set(s.assignments.filter((a) => a.targetType === "TASK" && a.toUserId === ownerId && a.status === "ACEITA").map((a) => a.targetId));
  return s.tasks
    .filter((t) => t.ownerId === ownerId || delegated.has(t.id))
    .filter((t) => canView(s, viewer, { kind: "TASK", task: t }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function profileProjects(s: SocialState, viewer: ViewerId, ownerId: string): SocialProject[] {
  const delegated = new Set(s.assignments.filter((a) => a.targetType === "PROJECT" && a.toUserId === ownerId && a.status === "ACEITA").map((a) => a.targetId));
  return s.projects
    .filter((p) => p.ownerId === ownerId || delegated.has(p.id))
    .filter((p) => canView(s, viewer, { kind: "PROJECT", project: p }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Hype no cabeçalho conforme `hypeVisibility` (RF16.CA04): PUBLICO todos; EMPRESA mesma empresa; SO_EU só o dono. */
export function canSeeHype(s: SocialState, viewer: ViewerId, owner: SocialPerson): boolean {
  if (owner.hype === null || owner.profileType === "EMPRESA") return false;
  if (viewer === owner.id) return true;
  if (owner.hypeVisibility === "PUBLICO") return true;
  if (owner.hypeVisibility === "EMPRESA") return !!viewer && personById(s, viewer)?.companyId === owner.companyId;
  return false;
}

/* ── Mural (RF27.CA01/CA02/CA06) ─────────────────────────────────────────────────────────────────────────── */
export type MuralTab = "empresa" | "vitrine" | "seguindo";

/**
 * Feed: só entradas cujo alvo o viewer vê (outra empresa só PUBLICA, via canView). "empresa" = entradas da empresa do
 * viewer + públicas; "vitrine" = projetos publicados; "seguindo" = atores, departamentos e empresas seguidos.
 */
export function muralFeed(s: SocialState, viewer: ViewerId, tab: MuralTab): MuralEntry[] {
  const person = personById(s, viewer);
  const visible = s.mural.filter((e) => {
    // entrada sem alvo (COMUNICADO, META, RECONHECIMENTO…): MuralEntry não tem visibilidade própria → só a mesma empresa
    if (!e.targetType || !e.targetId) return !!person?.companyId && person.companyId === e.companyId;
    const item = itemOf(s, { type: e.targetType as TargetRef["type"], id: e.targetId });
    return !!item && canView(s, viewer, item);
  });
  const sorted = [...visible].sort((a, b) => b.at.localeCompare(a.at));
  if (tab === "vitrine") return sorted.filter((e) => e.kind === "PROJETO_PUBLICADO");
  if (tab === "seguindo") {
    if (!person) return [];
    return sorted.filter((e) => isFollowing(s, viewer, "USER", e.actorId) || (e.departmentId && isFollowing(s, viewer, "DEPARTMENT", e.departmentId)) || isFollowing(s, viewer, "COMPANY", e.companyId));
  }
  return sorted.filter((e) => (person?.companyId && e.companyId === person.companyId) || isPublicTarget(s, e));
}

function isPublicTarget(s: SocialState, e: MuralEntry): boolean {
  if (!e.targetType || !e.targetId) return false;
  const item = itemOf(s, { type: e.targetType as TargetRef["type"], id: e.targetId });
  return !!item && visibilityOf(item) === "PUBLICA";
}
