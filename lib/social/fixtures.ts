/**
 * Rede social — dados DEMO (fictícios) para os perfis, o Mural e as interações. Nenhuma pessoa, empresa ou órgão real:
 * nomes genéricos ("Ana Exemplo", "Secretaria Exemplo (demo)"). Datas relativas a `now` (como lib/decia/fixtures.ts).
 * A API social ainda não existe (APIs só depois dos Blocos 4–5 de segurança) — estes dados alimentam só o repositório em
 * memória (repository.ts). Cobrem: EMPREGADO, CHEFE_DEPARTAMENTO e EMPRESA; tarefas de vários TaskType com capas pelas
 * anatomias; itens PUBLICA/EMPRESA/DEPARTAMENTO/PRIVADA; RESTRITO e SIGILOSO; remix de remix; comentários com resposta;
 * reações; salvos; seguidores; uma delegação PROPOSTA e uma ACEITA.
 */
import type { ViewerProfile } from "@/lib/viewer/profiles";
import type {
  Assignment, Comment, Follow, MuralEntry, Reaction, ReactionType, SavedItem, Share, SocialCompany, SocialDepartment, SocialNotification,
  SocialPerson, SocialProject, SocialState, SocialTask,
} from "./types";

export const DEMO_LABEL = "DEMO";

export const DEMO_USERS = {
  pessoa: "u-pessoa",
  ana: "u-ana",
  bruno: "u-bruno",
  diego: "u-diego",
  chefe: "u-chefe",
  curadoria: "u-curadoria",
  admin: "u-admin",
  secretaria: "u-secretaria",
  carla: "u-carla",
  prefeitura: "u-prefeitura",
} as const;

/** Perfil de visualização do lab (D-35) → pessoa DEMO. VISITANTE = anônimo. */
export const VIEWER_DEMO_USER: Record<ViewerProfile, string | null> = {
  EMPREGADO: DEMO_USERS.pessoa,
  EMPRESA: DEMO_USERS.secretaria,
  CHEFE: DEMO_USERS.chefe,
  CURADOR: DEMO_USERS.curadoria,
  ADMIN: DEMO_USERS.admin,
  VISITANTE: null,
};

const COMPANIES: SocialCompany[] = [
  { id: "c-secretaria", slug: "secretaria-exemplo", legalName: "Secretaria Exemplo (demo)", ownerUserId: DEMO_USERS.secretaria },
  { id: "c-prefeitura", slug: "prefeitura-exemplo", legalName: "Prefeitura Exemplo (demo)", ownerUserId: DEMO_USERS.prefeitura },
];

const DEPARTMENTS: SocialDepartment[] = [
  { id: "d-uts", slug: "secid-uts", companyId: "c-secretaria", acronym: "SECID-UTS", name: "Unidade Técnica de Sistemas (demo)", color: "blue", headUserId: DEMO_USERS.diego },
  { id: "d-cpoe", slug: "cpoe", companyId: "c-secretaria", acronym: "CPOE", name: "Coordenação de Planejamento e Obras (demo)", color: "orange", headUserId: DEMO_USERS.chefe },
  { id: "d-obras", slug: "obras-exemplo", companyId: "c-prefeitura", acronym: "OBRAS", name: "Departamento de Obras (demo)", color: "green", headUserId: null },
];

const person = (p: Partial<SocialPerson> & Pick<SocialPerson, "id" | "username" | "fullName">): SocialPerson => ({
  profileType: "EMPREGADO", jobTitle: "Analista (demo)", companyId: "c-secretaria", departmentId: "d-uts", hypeVisibility: "SO_EU", hype: 500, points: 800, decisionsCount: 0, ...p,
});

const PEOPLE: SocialPerson[] = [
  person({ id: DEMO_USERS.pessoa, username: "pessoa.exemplo", fullName: "Pessoa Exemplo", jobTitle: "Analista de projetos (demo)", hypeVisibility: "EMPRESA", hype: 640, points: 1240, decisionsCount: 5 }),
  person({ id: DEMO_USERS.ana, username: "ana.exemplo", fullName: "Ana Exemplo", jobTitle: "Engenheira civil (demo)", hypeVisibility: "PUBLICO", hype: 712, points: 2100, decisionsCount: 8 }),
  person({ id: DEMO_USERS.bruno, username: "bruno.exemplo", fullName: "Bruno Exemplo", jobTitle: "Arquiteto (demo)", departmentId: "d-cpoe", hypeVisibility: "SO_EU", hype: 455, points: 600, decisionsCount: 2 }),
  person({ id: DEMO_USERS.diego, username: "diego.exemplo", fullName: "Diego Exemplo", profileType: "CHEFE_DEPARTAMENTO", jobTitle: "Chefe da SECID-UTS (demo)", hypeVisibility: "EMPRESA", hype: 820, points: 3000, decisionsCount: 14 }),
  person({ id: DEMO_USERS.chefe, username: "chefe.exemplo", fullName: "Chefe Exemplo", profileType: "CHEFE_DEPARTAMENTO", jobTitle: "Chefe da CPOE (demo)", departmentId: "d-cpoe", hypeVisibility: "PUBLICO", hype: 780, points: 2310, decisionsCount: 11 }),
  person({ id: DEMO_USERS.curadoria, username: "curadoria.exemplo", fullName: "Curadoria Exemplo", jobTitle: "Curadora (demo)", departmentId: "d-cpoe", hype: 530, points: 980, decisionsCount: 3 }),
  person({ id: DEMO_USERS.admin, username: "admin.exemplo", fullName: "Admin Exemplo", jobTitle: "Administração do sistema (demo)", hype: null, points: 0 }),
  person({ id: DEMO_USERS.secretaria, username: "secretaria.exemplo", fullName: "Secretaria Exemplo (demo)", profileType: "EMPRESA", jobTitle: null, departmentId: null, hypeVisibility: "SO_EU", hype: null, points: null, decisionsCount: 21 }),
  person({ id: DEMO_USERS.carla, username: "carla.exemplo", fullName: "Carla Exemplo", jobTitle: "Geógrafa (demo)", companyId: "c-prefeitura", departmentId: "d-obras", hypeVisibility: "PUBLICO", hype: 590, points: 900, decisionsCount: 4 }),
  person({ id: DEMO_USERS.prefeitura, username: "prefeitura.exemplo", fullName: "Prefeitura Exemplo (demo)", profileType: "EMPRESA", jobTitle: null, companyId: "c-prefeitura", departmentId: null, hype: null, points: null, decisionsCount: 6 }),
];

/** Usernames que existem (o resto é 404 em /u/[username]). */
export const DEMO_USERNAMES = PEOPLE.map((p) => p.username);
export const isKnownUsername = (u: string) => DEMO_USERNAMES.includes(decodeURIComponent(u));
export const DEMO_DEPARTMENT_SLUGS = DEPARTMENTS.map((d) => d.slug);
export const DEMO_COMPANY_SLUGS = COMPANIES.map((c) => c.slug);

const DAY = 86_400_000;
const at = (now: Date, days: number) => new Date(now.getTime() + days * DAY).toISOString();
const day = (now: Date, days: number) => at(now, days).slice(0, 10);

function task(now: Date, p: Partial<SocialTask> & Pick<SocialTask, "id" | "ownerId" | "title" | "type">, ageDays: number): SocialTask {
  return {
    departmentId: "d-uts", summary: null, category: null, accessClass: "INTERNO", format: null, responsibleId: null, dueAt: null, legalDueAt: null,
    state: "DISPONIVEL", blockReason: null, visibility: "EMPRESA", favorite: false, aiGenerated: false, coverMode: "AUTO", cardSkin: null,
    originalTaskId: null, reuseCount: 0, seals: [], createdAt: at(now, -ageDays), ...p,
  };
}

function project(now: Date, p: Partial<SocialProject> & Pick<SocialProject, "id" | "ownerId" | "title">, ageDays: number): SocialProject {
  return {
    companyId: "c-secretaria", departmentId: "d-uts", objective: null, origin: "CRIAR_PROJETO", originalProjectId: null, status: "PUBLICADO",
    currentPhase: "PLANEJAMENTO", visibility: "EMPRESA", coverMode: "MOSAICO", nextMilestoneAt: null, lastDeciaEventLabel: null, aiGenerated: false,
    taskIds: [], peopleCount: 3, responsibleId: null, seals: [], createdAt: at(now, -ageDays), ...p,
  };
}

/** Ids das tarefas usadas nas jornadas (e2e, capturas, testes). */
export const DEMO_TASK_IDS = {
  anaEtp: "t-ana-etp",
  anaOficioIa: "t-ana-oficio-ia",
  anaPlanilha: "t-ana-planilha",
  anaAta: "t-ana-ata",
  anaSigiloso: "t-ana-parecer-sigiloso",
  anaPrivada: "t-ana-checklist-privado",
  brunoRemix: "t-bruno-oficio-remix",
  pessoaCronograma: "t-pessoa-cronograma",
  pessoaRelatorio: "t-pessoa-relatorio",
  pessoaLink: "t-pessoa-link",
  pessoaProtocolo: "t-pessoa-protocolo",
  pessoaRascunho: "t-pessoa-rascunho",
  chefeDesenho: "t-chefe-planta",
  chefePortaria: "t-chefe-portaria",
  diegoChecklist: "t-diego-checklist",
} as const;

export const DEMO_PROJECT_IDS = {
  anaMobilidade: "p-ana-mobilidade",
  pessoaVistorias: "p-pessoa-vistorias",
  chefeSede: "p-chefe-sede",
  secretariaCalcada: "p-secretaria-calcada",
  carlaDrenagem: "p-carla-drenagem",
} as const;

/** Tarefas/projetos que o detalhe aceita: os exemplos e os remixes criados nesta aba (o resto é 404). */
export const isKnownTaskId = (id: string) => /^t-[a-z0-9-]{2,80}$/.test(id);

function tasks(now: Date): SocialTask[] {
  const U = DEMO_USERS;
  const T = DEMO_TASK_IDS;
  return [
    task(now, { id: T.anaEtp, ownerId: U.ana, title: "Estudo técnico preliminar — calçadas acessíveis no centro", type: "ESTUDO_TECNICO_PRELIMINAR", category: "ETP", format: "docx", visibility: "PUBLICA", accessClass: "PUBLICO", summary: "Levantamento de rotas, custos por metro e alternativas de piso podotátil para as quadras centrais.", dueAt: day(now, 12), seals: [{ issuer: "CHEFE", label: "SECID-UTS" }] }, 3),
    task(now, { id: T.anaOficioIa, ownerId: U.ana, title: "Minuta de ofício de resposta ao cidadão", type: "TEXTO_IA", category: "OFICIO_MEMORANDO", format: "md", visibility: "PUBLICA", accessClass: "PUBLICO", aiGenerated: true, summary: "Modelo de resposta com prazo legal e canais de recurso.", reuseCount: 1 }, 9),
    task(now, { id: T.anaPlanilha, ownerId: U.ana, title: "Planilha orçamentária de recapeamento 2026", type: "PLANILHA", category: "PLANILHA_ORCAMENTARIA", format: "xlsx", visibility: "EMPRESA", state: "CONCLUIDA" }, 20),
    task(now, { id: T.anaAta, ownerId: U.ana, title: "Ata da reunião de mobilidade urbana", type: "ATA_REGISTRO", category: "ATA", format: "pdf", visibility: "DEPARTAMENTO" }, 6),
    task(now, { id: T.anaSigiloso, ownerId: U.ana, title: "Parecer técnico sobre contrato em auditoria", type: "DOCUMENTO", category: "PARECER_TECNICO", format: "pdf", visibility: "EMPRESA", accessClass: "SIGILOSO", responsibleId: U.pessoa }, 4),
    task(now, { id: T.anaPrivada, ownerId: U.ana, title: "Checklist pessoal de vistoria", type: "FORMULARIO", category: "FORMULARIO", visibility: "PRIVADA", state: "RASCUNHO" }, 1),
    task(now, { id: T.brunoRemix, ownerId: U.bruno, departmentId: "d-cpoe", title: "Minuta de ofício de resposta ao cidadão", type: "TEXTO_IA", category: "OFICIO_MEMORANDO", format: "md", visibility: "PUBLICA", accessClass: "PUBLICO", aiGenerated: true, originalTaskId: T.anaOficioIa, summary: "Versão da CPOE com anexos de obras." }, 5),
    task(now, { id: "t-bruno-pasta", ownerId: U.bruno, departmentId: "d-cpoe", title: "Pasta de projetos executivos da sede", type: "PASTA", format: "zip", visibility: "EMPRESA", state: "EM_USO" }, 12),
    task(now, { id: T.pessoaCronograma, ownerId: U.pessoa, title: "Cronograma de obras do segundo semestre", type: "CRONOGRAMA", category: "CRONOGRAMA", format: "xlsx", visibility: "PRIVADA", dueAt: day(now, 2) }, 2),
    task(now, { id: T.pessoaRelatorio, ownerId: U.pessoa, title: "Relatório fotográfico de vistoria da escola", type: "IMAGEM_EDITADA", category: "VISTORIA_RELATORIO_FOTOGRAFICO", format: "pdf", visibility: "EMPRESA", state: "EM_USO", dueAt: day(now, -1), legalDueAt: day(now, -1) }, 8),
    task(now, { id: T.pessoaLink, ownerId: U.pessoa, title: "Painel de indicadores de obras", type: "LINK", format: "url", visibility: "PUBLICA", accessClass: "PUBLICO" }, 15),
    task(now, { id: T.pessoaProtocolo, ownerId: U.pessoa, title: "Protocolo 2026/1234 — pedido de informação", type: "PROTOCOLO", category: "OFICIO_MEMORANDO", visibility: "DEPARTAMENTO", accessClass: "RESTRITO", state: "BLOQUEADA", blockReason: "Aguardando parecer jurídico" }, 10),
    task(now, { id: T.pessoaRascunho, ownerId: U.pessoa, title: "Esboço de termo de referência", type: "DOCUMENTO", category: "TERMO_REFERENCIA", format: "docx", visibility: "PRIVADA", state: "RASCUNHO" }, 0),
    task(now, { id: T.chefeDesenho, ownerId: U.chefe, departmentId: "d-cpoe", title: "Planta baixa da sede regional", type: "DESENHO_TECNICO", category: "PROJETO_BASICO_EXECUTIVO", format: "dwg", visibility: "EMPRESA", cardSkin: "blueprint" }, 7),
    task(now, { id: T.chefePortaria, ownerId: U.chefe, departmentId: "d-cpoe", title: "Portaria de designação de fiscais de contrato", type: "DOCUMENTO", category: "PORTARIA_RESOLUCAO", format: "docx", visibility: "PUBLICA", accessClass: "PUBLICO", state: "MODELO_PUBLICO", seals: [{ issuer: "EMPRESA", label: "Secretaria Exemplo" }] }, 30),
    task(now, { id: "t-chefe-email", ownerId: U.chefe, departmentId: "d-cpoe", title: "E-mail de convocação da equipe de obras", type: "EMAIL", visibility: "DEPARTAMENTO" }, 3),
    task(now, { id: T.diegoChecklist, ownerId: U.diego, title: "Checklist de entrega de sistemas", type: "FORMULARIO", category: "FORMULARIO", visibility: "DEPARTAMENTO", state: "EM_USO", responsibleId: U.pessoa, dueAt: day(now, 5) }, 11),
    task(now, { id: "t-secretaria-modelo", ownerId: U.secretaria, departmentId: null, title: "Modelo oficial de ofício circular", type: "DOCUMENTO", category: "OFICIO_MEMORANDO", format: "docx", visibility: "PUBLICA", accessClass: "PUBLICO", state: "MODELO_PUBLICO", seals: [{ issuer: "EMPRESA", label: "Secretaria Exemplo" }] }, 40),
    task(now, { id: "t-carla-mapa", ownerId: U.carla, departmentId: "d-obras", title: "Mapa de áreas de risco de alagamento", type: "IMAGEM_WEB", category: "MAPA_GEORREFERENCIA", format: "png", visibility: "PUBLICA", accessClass: "PUBLICO" }, 6),
    task(now, { id: "t-carla-interna", ownerId: U.carla, departmentId: "d-obras", title: "Levantamento interno de bueiros", type: "PLANILHA", visibility: "EMPRESA" }, 6),
  ];
}

function projects(now: Date): SocialProject[] {
  const U = DEMO_USERS;
  const P = DEMO_PROJECT_IDS;
  const T = DEMO_TASK_IDS;
  return [
    project(now, { id: P.anaMobilidade, ownerId: U.ana, title: "Plano de mobilidade ativa do centro", objective: "Reduzir em 30 % as quedas de pedestres nas quadras centrais.", visibility: "PUBLICA", currentPhase: "ELABORACAO", taskIds: [T.anaEtp, T.anaPlanilha, T.anaAta], nextMilestoneAt: day(now, 20), lastDeciaEventLabel: "Decisão validada há 2 dias", peopleCount: 5 }, 4),
    project(now, { id: P.pessoaVistorias, ownerId: U.pessoa, title: "Programa de vistorias escolares 2026", status: "EM_EXECUCAO", currentPhase: "EXECUCAO", taskIds: [T.pessoaRelatorio, T.pessoaCronograma], nextMilestoneAt: day(now, 9), peopleCount: 4 }, 25),
    project(now, { id: "p-pessoa-rascunho", ownerId: U.pessoa, title: "Ideia: horta comunitária na sede", status: "RASCUNHO", currentPhase: "DEMANDA", visibility: "PRIVADA", aiGenerated: true, coverMode: "IA", peopleCount: 1 }, 1),
    project(now, { id: P.chefeSede, ownerId: U.chefe, departmentId: "d-cpoe", title: "Reforma da sede regional", status: "EM_DECISAO", currentPhase: "ANALISE", taskIds: [T.chefeDesenho, "t-bruno-pasta"], lastDeciaEventLabel: "Sessão DECIA aberta", peopleCount: 6 }, 14),
    project(now, { id: P.secretariaCalcada, ownerId: U.secretaria, departmentId: null, title: "Programa Calçada Segura", status: "APROVADO", currentPhase: "APROVACAO", visibility: "PUBLICA", taskIds: ["t-secretaria-modelo", T.anaEtp], seals: [{ issuer: "EMPRESA", label: "Secretaria Exemplo" }], peopleCount: 12 }, 35),
    project(now, { id: P.carlaDrenagem, ownerId: U.carla, companyId: "c-prefeitura", departmentId: "d-obras", title: "Drenagem urbana da bacia norte", visibility: "PUBLICA", currentPhase: "PLANEJAMENTO", taskIds: ["t-carla-mapa"], peopleCount: 3 }, 8),
  ];
}

export function buildDemoSocial(now: Date): SocialState {
  const U = DEMO_USERS;
  const T = DEMO_TASK_IDS;
  const P = DEMO_PROJECT_IDS;
  let n = 0;
  const reaction = (actorId: string, type: "TASK" | "PROJECT", targetId: string, reactionType: ReactionType, ageDays: number): Reaction =>
    ({ id: `r-seed-${++n}`, actorId, targetType: type, targetId, reactionType, at: at(now, -ageDays), actorHypeAtTime: null, ignoredReason: null });
  const reactions: Reaction[] = [
    reaction(U.bruno, "TASK", T.anaEtp, "CURTIR", 2), reaction(U.chefe, "TASK", T.anaEtp, "CURTIR", 2), reaction(U.diego, "TASK", T.anaEtp, "BEM_FUNDAMENTADO", 1),
    reaction(U.carla, "TASK", T.anaEtp, "INOVADOR", 1), reaction(U.pessoa, "TASK", T.anaOficioIa, "CURTIR", 5), reaction(U.bruno, "TASK", T.anaOficioIa, "UTIL", 5),
    reaction(U.ana, "TASK", T.pessoaLink, "CURTIR", 3), reaction(U.diego, "TASK", T.pessoaRelatorio, "CONFORME", 2),
    reaction(U.pessoa, "PROJECT", P.anaMobilidade, "CURTIR", 1), reaction(U.chefe, "PROJECT", P.anaMobilidade, "CURTIR", 1),
    reaction(U.ana, "TASK", T.chefePortaria, "CURTIR", 9), reaction(U.pessoa, "TASK", T.chefePortaria, "UTIL", 8),
  ];
  let c = 0;
  const comment = (authorId: string, type: "TASK" | "PROJECT", targetId: string, contentMd: string, ageHours: number, parent: string | null = null, mentions: string[] = []): Comment =>
    ({ id: `c-seed-${++c}`, authorId, targetType: type, targetId, parentCommentId: parent, contentMd, mentions, editedAt: null, deletedBy: null, active: true, createdAt: new Date(now.getTime() - ageHours * 3_600_000).toISOString() });
  const comments: Comment[] = [
    comment(U.diego, "TASK", T.anaEtp, "Ótimo levantamento. Vale incluir o custo de manutenção anual no comparativo.", 30),
    comment(U.ana, "TASK", T.anaEtp, "Boa! Incluo na próxima versão, com a tabela da CPOE.", 26, "c-seed-1"),
    comment(U.bruno, "TASK", T.anaEtp, "@pessoa.exemplo dá para reaproveitar no programa de vistorias?", 20, null, ["pessoa.exemplo"]),
    comment(U.chefe, "PROJECT", P.anaMobilidade, "Podemos levar este plano para a sessão DECIA de quinta.", 12),
  ];
  const saved: SavedItem[] = [
    { id: "s-seed-1", userId: U.pessoa, targetType: "TASK", targetId: T.chefePortaria, favorite: true, savedAt: at(now, -6) },
    { id: "s-seed-2", userId: U.pessoa, targetType: "PROJECT", targetId: P.anaMobilidade, favorite: false, savedAt: at(now, -2) },
    { id: "s-seed-3", userId: U.bruno, targetType: "TASK", targetId: T.anaEtp, favorite: false, savedAt: at(now, -2) },
    { id: "s-seed-4", userId: U.pessoa, targetType: "TASK", targetId: "t-carla-interna", favorite: false, savedAt: at(now, -40) },
  ];
  const shares: Share[] = [
    { id: "sh-seed-1", actorId: U.ana, targetType: "TASK", targetId: T.anaEtp, channel: "MURAL", sessionId: null, externalToken: null, expiresAt: null, imageMediaId: null, createdAt: at(now, -2) },
  ];
  const follows: Follow[] = [
    { id: "f-seed-1", followerId: U.pessoa, targetType: "USER", targetId: U.ana, status: "ATIVO", at: at(now, -30) },
    { id: "f-seed-2", followerId: U.pessoa, targetType: "DEPARTMENT", targetId: "d-cpoe", status: "ATIVO", at: at(now, -20) },
    { id: "f-seed-3", followerId: U.bruno, targetType: "USER", targetId: U.ana, status: "ATIVO", at: at(now, -10) },
    { id: "f-seed-4", followerId: U.chefe, targetType: "USER", targetId: U.ana, status: "ATIVO", at: at(now, -10) },
    { id: "f-seed-5", followerId: U.ana, targetType: "USER", targetId: U.pessoa, status: "ATIVO", at: at(now, -12) },
    { id: "f-seed-6", followerId: U.diego, targetType: "USER", targetId: U.pessoa, status: "REMOVIDO", at: at(now, -3) },
    { id: "f-seed-7", followerId: U.ana, targetType: "COMPANY", targetId: "c-secretaria", status: "ATIVO", at: at(now, -50) },
    { id: "f-seed-8", followerId: U.carla, targetType: "DEPARTMENT", targetId: "d-cpoe", status: "ATIVO", at: at(now, -15) },
  ];
  const mural: MuralEntry[] = [
    { id: "m-seed-1", companyId: "c-secretaria", departmentId: "d-uts", kind: "COMPARTILHAMENTO", targetType: "TASK", targetId: T.anaEtp, actorId: U.ana, boostUntil: null, at: at(now, -2) },
    { id: "m-seed-2", companyId: "c-secretaria", departmentId: "d-uts", kind: "PROJETO_PUBLICADO", targetType: "PROJECT", targetId: P.anaMobilidade, actorId: U.ana, boostUntil: null, at: at(now, -4) },
    { id: "m-seed-3", companyId: "c-secretaria", departmentId: null, kind: "PROJETO_PUBLICADO", targetType: "PROJECT", targetId: P.secretariaCalcada, actorId: U.secretaria, boostUntil: null, at: at(now, -6) },
    { id: "m-seed-4", companyId: "c-secretaria", departmentId: "d-cpoe", kind: "PROJETO_PUBLICADO", targetType: "PROJECT", targetId: P.chefeSede, actorId: U.chefe, boostUntil: null, at: at(now, -7) },
    { id: "m-seed-5", companyId: "c-secretaria", departmentId: "d-cpoe", kind: "COMPARTILHAMENTO", targetType: "TASK", targetId: T.chefePortaria, actorId: U.chefe, boostUntil: null, at: at(now, -9) },
    { id: "m-seed-6", companyId: "c-prefeitura", departmentId: "d-obras", kind: "PROJETO_PUBLICADO", targetType: "PROJECT", targetId: P.carlaDrenagem, actorId: U.carla, boostUntil: null, at: at(now, -3) },
    { id: "m-seed-7", companyId: "c-prefeitura", departmentId: "d-obras", kind: "COMPARTILHAMENTO", targetType: "TASK", targetId: "t-carla-interna", actorId: U.carla, boostUntil: null, at: at(now, -1) },
  ];
  const assignments: Assignment[] = [
    { id: "a-seed-1", targetType: "TASK", targetId: T.chefeDesenho, fromUserId: U.chefe, toUserId: U.pessoa, origin: "BOTAO_ESQUEMA", status: "PROPOSTA", dueAt: day(now, 6), message: "Pode revisar as cotas da planta antes da sessão?", reason: null, previousResponsibleId: U.chefe, traceNodeId: null, respondedAt: null, createdAt: at(now, -0.2) },
    { id: "a-seed-2", targetType: "TASK", targetId: T.diegoChecklist, fromUserId: U.diego, toUserId: U.pessoa, origin: "MINHA_EQUIPE", status: "ACEITA", dueAt: day(now, 5), message: "Fica com a conferência final?", reason: null, previousResponsibleId: U.diego, traceNodeId: null, respondedAt: at(now, -3), createdAt: at(now, -4) },
  ];
  const note = (id: string, recipientId: string, actorId: string, type: SocialNotification["type"], resourceType: "TASK" | "PROJECT", resourceId: string, targetTitle: string, hoursAgo: number, read = false, key = ""): SocialNotification => ({
    id, recipientId, actorId, type, category: "SOCIAL", resourceType, resourceId, title: `social.notif.${type}`, body: null,
    payload: { actors: [actorId], count: 1, targetTitle }, groupKey: `${type}:${resourceType}:${resourceId}:${key || "seed"}`, read, readAt: null,
    createdAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
  });
  const notifications: SocialNotification[] = [
    note("n-seed-1", U.pessoa, U.chefe, "ATRIBUICAO_PROPOSTA", "TASK", T.chefeDesenho, "Planta baixa da sede regional", 5, false, "a-seed-1"),
    note("n-seed-2", U.pessoa, U.bruno, "MENCAO", "TASK", T.anaEtp, "Estudo técnico preliminar — calçadas acessíveis no centro", 20),
    note("n-seed-3", U.pessoa, U.ana, "REACAO", "TASK", T.pessoaLink, "Painel de indicadores de obras", 72, true),
  ];
  return {
    companies: COMPANIES, departments: DEPARTMENTS, people: PEOPLE, tasks: tasks(now), projects: projects(now), reactions, comments, saved, shares,
    remixes: [{ id: "rx-seed-1", actorId: U.bruno, sourceType: "TASK", sourceId: T.anaOficioIa, resultType: "TASK", resultId: T.brunoRemix, modelOfferId: null, ledgerEntryId: null, at: at(now, -5) }],
    follows, mural, notifications, assignments,
    sessions: [{ id: "s-orcamento-2027", title: "Orçamento 2027 (demo)" }, { id: "s-sede-regional", title: "Reforma da sede regional (demo)" }],
  };
}
