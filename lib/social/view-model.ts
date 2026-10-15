/**
 * Rede social — view models PUROS dos cards (ANATOMIA_CARDS §3/§5/§7, ANATOMIAS_E_ESTUDIO §7.2 `TaskCardVariant`), do
 * cabeçalho do perfil (Matriz B "Cabeçalho", RF16.CA01/CA04/CA06) e das sub-abas por viewer (Matriz B §3). Os
 * componentes nunca leem o estado direto: recebem estes objetos.
 */
import type { SubTab } from "@/lib/nav/matrix";
import { PROFILE_TABS } from "@/lib/pages/registry";
import {
  assignmentsOf, canInteract, canSeeHype, countersOf, delegatePermission, departmentById, followersCount, giveBackPermission, hasLiked, isDraft,
  isFollowing, myQualitative, personById, profileProjects, profileTasks, remixChain, remixPermission, remixedByCount, savedOf, shareChannelPermission,
  companyById, taskById, type Counters, type Item, type Permission,
} from "./rules";
import type {
  AccessClassification, AssignmentStatus, NodeColor, ProjectPhase, ProjectStatus, QualitativeReaction, ShareChannel, SocialPerson, SocialProject,
  SocialState, SocialTask, TargetRef, TaskCategory, TaskState, TaskType, ViewerId, Visibility,
} from "./types";
import { PROJECT_PHASES, SHARE_CHANNELS } from "./types";

/* ── Metadados visuais por tipo/estado (texto sempre acompanha; cor só por token) ──────────────────────── */
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "spark" | "red" | "yellow" | "green" | "blue" | "brown" | "orange";
export type ArtFamily = "protocolo" | "carimbo" | "pasta" | "blueprint" | "monograma";

/** Glifo (caractere, aria-hidden), tom e família de arte padrão por TaskType (ANATOMIAS_E_ESTUDIO §1.2; ANATOMIA_CARDS §4). */
export const TASK_TYPE_META: Record<TaskType, { symbol: string; tone: Tone; family: ArtFamily }> = {
  TEXTO_MANUAL: { symbol: "✎", tone: "neutral", family: "monograma" },
  TEXTO_IA: { symbol: "✦", tone: "spark", family: "monograma" },
  IMAGEM_WEB: { symbol: "◍", tone: "blue", family: "protocolo" },
  IMAGEM_EDITADA: { symbol: "◩", tone: "info", family: "protocolo" },
  PLANILHA: { symbol: "▦", tone: "green", family: "protocolo" },
  DOCUMENTO: { symbol: "▤", tone: "neutral", family: "protocolo" },
  PASTA: { symbol: "▣", tone: "brown", family: "pasta" },
  LINK: { symbol: "⧉", tone: "info", family: "protocolo" },
  DESENHO_TECNICO: { symbol: "⌖", tone: "orange", family: "blueprint" },
  FORMULARIO: { symbol: "☑", tone: "success", family: "protocolo" },
  ATA_REGISTRO: { symbol: "◉", tone: "red", family: "carimbo" },
  EMAIL: { symbol: "✉", tone: "blue", family: "protocolo" },
  PROTOCOLO: { symbol: "№", tone: "yellow", family: "protocolo" },
  CRONOGRAMA: { symbol: "▥", tone: "accent", family: "protocolo" },
  ESTUDO_TECNICO_PRELIMINAR: { symbol: "⌕", tone: "warning", family: "protocolo" },
};

export const TASK_STATE_TONE: Record<TaskState, Tone> = {
  RASCUNHO: "neutral", DISPONIVEL: "accent", EM_USO: "info", BLOQUEADA: "danger", CONCLUIDA: "success", ARQUIVADA: "neutral", MODELO_PUBLICO: "warning", OFERECIDA: "yellow",
};
export const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  RASCUNHO: "neutral", PUBLICADO: "accent", EM_DECISAO: "spark", APROVADO: "success", EM_EXECUCAO: "info", CONCLUIDO: "success", ARQUIVADO: "neutral", DEVOLVIDO: "danger",
};

/** Variações do card de tarefa (ANATOMIAS_E_ESTUDIO §7.2, D-50) — só as que a rede social já deriva. */
export type TaskCardVariant = TaskState | "FAVORITA" | "ATRIBUIDA" | "REMIX" | "GERADA_IA" | "CHANCELADA" | "PRAZO_LEGAL";
export type ProjectCardVariant = ProjectStatus | "FAVORITO" | "ATRIBUIDO" | "REMIX" | "GERADO_IA" | "CHANCELADO" | "PRIVADO" | "DEPARTAMENTO" | "EMPRESA";

export interface PersonRef { id: string; name: string; username: string; node: NodeColor | null }
export interface DepartmentRef { slug: string; acronym: string; color: NodeColor }

export interface SocialPermissions {
  react: Permission;
  comment: Permission;
  save: Permission;
  share: Permission;
  shareChannels: Record<ShareChannel, Permission>;
  remix: Permission;
  delegate: Permission;
  giveBack: Permission;
}

export interface ViewerFlags { liked: boolean; qualitative: QualitativeReaction | null; saved: boolean; favorite: boolean }

export interface DelegationInfo {
  status: AssignmentStatus;
  from: PersonRef;
  to: PersonRef;
  reason: string | null;
  dueAt: string | null;
  /** o viewer é o destinatário */
  toViewer: boolean;
}

export interface CreditInfo { originalAuthor: PersonRef; originalTitle: string; originalId: string; via: PersonRef | null }

export type DueKind = "ok" | "soon" | "over";

export interface TaskCardViewModel {
  kind: "TASK";
  id: string;
  ref: TargetRef;
  href: string;
  title: string;
  summary: string | null;
  type: TaskType;
  typeSymbol: string;
  typeTone: Tone;
  family: ArtFamily;
  category: TaskCategory | null;
  format: string | null;
  state: TaskState;
  stateTone: Tone;
  visibility: Visibility;
  accessClass: AccessClassification;
  author: PersonRef;
  department: DepartmentRef | null;
  responsible: PersonRef | null;
  dueAt: string | null;
  dueKind: DueKind | null;
  legal: boolean;
  aiGenerated: boolean;
  authorship: SocialTask["authorship"] | null;
  seals: SocialTask["seals"];
  blockReason: string | null;
  counters: Counters;
  viewer: ViewerFlags;
  perms: SocialPermissions;
  credit: CreditInfo | null;
  remixedBy: number;
  delegation: DelegationInfo | null;
  variants: ReadonlySet<TaskCardVariant>;
}

export interface ProjectCardViewModel {
  kind: "PROJECT";
  id: string;
  ref: TargetRef;
  href: string;
  title: string;
  objective: string | null;
  status: ProjectStatus;
  statusTone: Tone;
  phase: ProjectPhase;
  phaseIndex: number;
  visibility: Visibility;
  author: PersonRef;
  department: DepartmentRef | null;
  mosaic: { id: string; symbol: string; tone: Tone; title: string }[];
  tasksCount: number;
  peopleCount: number;
  nextMilestoneAt: string | null;
  lastDeciaEventLabel: string | null;
  aiGenerated: boolean;
  authorship: SocialProject["authorship"] | null;
  seals: SocialProject["seals"];
  counters: Counters;
  viewer: ViewerFlags;
  perms: SocialPermissions;
  credit: CreditInfo | null;
  remixedBy: number;
  delegation: DelegationInfo | null;
  variants: ReadonlySet<ProjectCardVariant>;
}

export type CardViewModel = TaskCardViewModel | ProjectCardViewModel;

const DAY = 86_400_000;

export function personRef(s: SocialState, id: string): PersonRef {
  const p = personById(s, id);
  const node = departmentById(s, p?.departmentId)?.color ?? null;
  return { id, name: p?.fullName ?? id, username: p?.username ?? id, node };
}

function deptRef(s: SocialState, id: string | null): DepartmentRef | null {
  const d = departmentById(s, id);
  return d ? { slug: d.slug, acronym: d.acronym, color: d.color } : null;
}

export function dueKindOf(dueAt: string | null, now: Date): DueKind | null {
  if (!dueAt) return null;
  const today = now.toISOString().slice(0, 10);
  const due = dueAt.slice(0, 10);
  if (due < today) return "over";
  return new Date(`${due}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime() <= 3 * DAY ? "soon" : "ok";
}

function permissions(s: SocialState, viewer: ViewerId, item: Item): SocialPermissions {
  const base = canInteract(s, viewer, item);
  const ref: TargetRef = item.kind === "TASK" ? { type: "TASK", id: item.task.id } : { type: "PROJECT", id: item.project.id };
  const shareChannels = Object.fromEntries(SHARE_CHANNELS.map((c) => [c, shareChannelPermission(s, viewer, item, c)])) as Record<ShareChannel, Permission>;
  const anyChannel = SHARE_CHANNELS.map((c) => shareChannels[c]).find((p) => p.ok);
  return {
    react: base,
    comment: base,
    save: base,
    share: anyChannel ?? shareChannels.MURAL,
    shareChannels,
    remix: remixPermission(s, viewer, item),
    delegate: delegatePermission(s, viewer, item),
    giveBack: giveBackPermission(s, viewer, ref),
  };
}

function viewerFlags(s: SocialState, viewer: ViewerId, ref: TargetRef): ViewerFlags {
  const saved = savedOf(s, ref, viewer);
  return { liked: hasLiked(s, ref, viewer), qualitative: myQualitative(s, ref, viewer), saved: !!saved, favorite: !!saved?.favorite };
}

function delegationOf(s: SocialState, viewer: ViewerId, ref: TargetRef): DelegationInfo | null {
  const a = assignmentsOf(s, ref)[0];
  if (!a) return null;
  return { status: a.status, from: personRef(s, a.fromUserId), to: personRef(s, a.toUserId), reason: a.reason, dueAt: a.dueAt, toViewer: a.toUserId === viewer };
}

function creditOf(s: SocialState, ref: TargetRef): CreditInfo | null {
  const chain = remixChain(s, ref);
  if (!chain.length) return null;
  const root = chain[chain.length - 1]!;
  const parent = chain[0]!;
  return { originalAuthor: personRef(s, root.ownerId), originalTitle: root.title, originalId: root.id, via: chain.length > 1 ? personRef(s, parent.ownerId) : null };
}

export function toTaskCardViewModel(s: SocialState, viewer: ViewerId, task: SocialTask, now: Date): TaskCardViewModel {
  const ref: TargetRef = { type: "TASK", id: task.id };
  const item: Item = { kind: "TASK", task };
  const meta = TASK_TYPE_META[task.type];
  const flags = viewerFlags(s, viewer, ref);
  const delegation = delegationOf(s, viewer, ref);
  const due = task.legalDueAt ?? task.dueAt;
  const variants = new Set<TaskCardVariant>([task.state]);
  if (flags.favorite || (task.favorite && task.ownerId === viewer)) variants.add("FAVORITA");
  if (delegation && (delegation.status === "PROPOSTA" || delegation.status === "ACEITA")) variants.add("ATRIBUIDA");
  if (task.originalTaskId) variants.add("REMIX");
  if (task.aiGenerated) variants.add("GERADA_IA");
  if (task.seals.length) variants.add("CHANCELADA");
  if (task.legalDueAt) variants.add("PRAZO_LEGAL");
  const family: ArtFamily = (["protocolo", "carimbo", "pasta", "blueprint", "monograma"] as const).find((f) => f === task.cardSkin) ?? meta.family;
  return {
    kind: "TASK", id: task.id, ref, href: `/tasks/${task.id}`, title: task.title, summary: task.summary, type: task.type, typeSymbol: meta.symbol, typeTone: meta.tone,
    family, category: task.category, format: task.format, state: task.state, stateTone: TASK_STATE_TONE[task.state], visibility: task.visibility, accessClass: task.accessClass,
    author: personRef(s, task.ownerId), department: deptRef(s, task.departmentId),
    responsible: task.responsibleId && task.responsibleId !== task.ownerId ? personRef(s, task.responsibleId) : null,
    dueAt: due, dueKind: dueKindOf(due, now), legal: !!task.legalDueAt, aiGenerated: task.aiGenerated, authorship: task.authorship ?? null, seals: task.seals, blockReason: task.blockReason,
    counters: countersOf(s, ref), viewer: flags, perms: permissions(s, viewer, item), credit: creditOf(s, ref), remixedBy: remixedByCount(s, ref), delegation, variants,
  };
}

export function toProjectCardViewModel(s: SocialState, viewer: ViewerId, project: SocialProject): ProjectCardViewModel {
  const ref: TargetRef = { type: "PROJECT", id: project.id };
  const item: Item = { kind: "PROJECT", project };
  const flags = viewerFlags(s, viewer, ref);
  const delegation = delegationOf(s, viewer, ref);
  const variants = new Set<ProjectCardVariant>([project.status]);
  if (flags.favorite) variants.add("FAVORITO");
  if (delegation && (delegation.status === "PROPOSTA" || delegation.status === "ACEITA")) variants.add("ATRIBUIDO");
  if (project.originalProjectId) variants.add("REMIX");
  if (project.aiGenerated) variants.add("GERADO_IA");
  if (project.seals.length) variants.add("CHANCELADO");
  if (project.visibility === "PRIVADA") variants.add("PRIVADO");
  if (project.visibility === "DEPARTAMENTO") variants.add("DEPARTAMENTO");
  if (project.visibility === "EMPRESA") variants.add("EMPRESA");
  const mosaic = project.taskIds
    .map((id) => taskById(s, id))
    .filter((t): t is SocialTask => !!t)
    .slice(0, 6)
    .map((t) => ({ id: t.id, symbol: TASK_TYPE_META[t.type].symbol, tone: TASK_TYPE_META[t.type].tone, title: t.title }));
  return {
    kind: "PROJECT", id: project.id, ref, href: `/projects/${project.id}`, title: project.title, objective: project.objective, status: project.status,
    statusTone: PROJECT_STATUS_TONE[project.status], phase: project.currentPhase, phaseIndex: PROJECT_PHASES.indexOf(project.currentPhase), visibility: project.visibility,
    author: personRef(s, project.ownerId), department: deptRef(s, project.departmentId), mosaic, tasksCount: project.taskIds.length, peopleCount: project.peopleCount,
    nextMilestoneAt: project.nextMilestoneAt, lastDeciaEventLabel: project.lastDeciaEventLabel, aiGenerated: project.aiGenerated, authorship: project.authorship ?? null, seals: project.seals,
    counters: countersOf(s, ref), viewer: flags, perms: permissions(s, viewer, item), credit: creditOf(s, ref), remixedBy: remixedByCount(s, ref), delegation, variants,
  };
}

/* ── Cabeçalho do perfil (Matriz B; RF6.CA01, RF16.CA01/CA04/CA06) ────────────────────────────────────── */
export type ProfileCounterKey = "tasks" | "projects" | "decisions" | "followers" | "points" | "hype";
export interface ProfileHeaderViewModel {
  person: PersonRef & { jobTitle: string | null; profileType: SocialPerson["profileType"] };
  isSelf: boolean;
  /** etiqueta institucional (RF16.CA06): conta EMPRESA ou chefe de departamento */
  institutional: { kind: "EMPRESA"; href: string; label: string } | { kind: "CHEFE"; href: string; acronym: string; color: NodeColor } | null;
  department: DepartmentRef | null;
  company: { slug: string; name: string } | null;
  /** contadores na ordem do cabeçalho; `null` = oculto para este viewer ("—") */
  counters: { key: ProfileCounterKey; value: number | null }[];
  following: boolean;
  follow: Permission;
}

export function toProfileHeaderViewModel(s: SocialState, viewer: ViewerId, ownerId: string): ProfileHeaderViewModel | null {
  const p = personById(s, ownerId);
  if (!p) return null;
  const isSelf = viewer === ownerId;
  const company = companyById(s, p.companyId);
  const headOf = s.departments.find((d) => d.headUserId === p.id);
  const institutional: ProfileHeaderViewModel["institutional"] =
    p.profileType === "EMPRESA" && company ? { kind: "EMPRESA", href: `/companies/${company.slug}`, label: company.legalName }
    : p.profileType === "CHEFE_DEPARTAMENTO" && headOf ? { kind: "CHEFE", href: `/departments/${headOf.slug}`, acronym: headOf.acronym, color: headOf.color }
    : null;
  const counters: ProfileHeaderViewModel["counters"] = [
    { key: "tasks", value: profileTasks(s, viewer, ownerId).filter((t) => t.ownerId === ownerId).length },
    { key: "projects", value: profileProjects(s, viewer, ownerId).filter((x) => x.ownerId === ownerId).length },
    { key: "decisions", value: p.decisionsCount },
    { key: "followers", value: followersCount(s, "USER", ownerId) },
  ];
  // EMPRESA: sem DECIA Points nem Hype (§7.d); DP só para o dono (sub-aba 13); Hype conforme hypeVisibility (RF16.CA04)
  if (p.profileType !== "EMPRESA") {
    counters.push({ key: "points", value: isSelf ? p.points : null });
    counters.push({ key: "hype", value: canSeeHype(s, viewer, p) ? p.hype : null });
  }
  const follow: Permission = !viewer || !personById(s, viewer) ? { ok: false, reason: "NAO_AUTENTICADO" } : isSelf ? { ok: false, reason: "SEGUIR_A_SI" } : { ok: true };
  return {
    person: { ...personRef(s, ownerId), jobTitle: p.jobTitle, profileType: p.profileType },
    isSelf, institutional, department: deptRef(s, p.departmentId), company: company ? { slug: company.slug, name: company.legalName } : null,
    counters, following: isFollowing(s, viewer, "USER", ownerId), follow,
  };
}

/* ── Sub-abas por viewer (Matriz B §3) ─────────────────────────────────────────────────────────────────── */
/**
 * Próprio perfil: as 15 sub-abas (o RfPage ainda esconde as do perfil de visualização, ex.: EMPRESA sem 5/9/13/14/15).
 * Terceiros: só 1–5 (RF16.CA02); dono EMPRESA não tem a 5 (perfil deliberativo é por pessoa). As abas de terceiros não
 * dependem do perfil de quem olha, então o `hiddenFor` é removido.
 */
export function profileTabsFor(s: SocialState, viewer: ViewerId, ownerId: string): readonly SubTab[] {
  if (viewer === ownerId) return PROFILE_TABS;
  const owner = personById(s, ownerId);
  return PROFILE_TABS.filter((t) => t.thirdParty && !(owner?.profileType === "EMPRESA" && t.slug === "deliberativo")).map((t) => ({ ...t, hiddenFor: undefined }));
}

/** O item é rascunho visível só ao dono (borda tracejada no card). */
export const isDraftCard = (vm: CardViewModel) => (vm.kind === "TASK" ? vm.state === "RASCUNHO" : vm.status === "RASCUNHO");
export { isDraft };
