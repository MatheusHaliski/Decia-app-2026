/**
 * Matriz A (docs/produto/ABAS_POR_PERFIL.md §2): grupos e itens do menu lateral, sub-abas, visibilidade por perfil,
 * barra inferior (§2.6) e folha "+ Criar" (§2.6). Nada aqui é inventado — cada item aponta o RF e a célula da matriz.
 * Ícones: WS Glyphs (docs/design-system/GLYPHS.md). Onde o catálogo ainda não tem glifo próprio, usa-se o mais
 * próximo (Q-104 lista os faltantes).
 */
import type { GlyphName } from "@/components/ui/glyphs/sprite.gen";
import { access, everyone, logged, type AccessMatrix, type ViewerProfile, type ViewerUser } from "@/lib/viewer/profiles";

export interface SubTab {
  /** slug na URL (?tab=) */
  slug: string;
  /** chave i18n do rótulo */
  labelKey: string;
  /** perfis para os quais a sub-aba fica OCULTA (ex.: Insights › Equipe para EMPREGADO) */
  hiddenFor?: readonly ViewerProfile[];
  /** marcado "(proposta)" na matriz */
  proposal?: boolean;
}

export interface NavItem {
  id: string;
  labelKey: string;
  glyph: GlyphName;
  /** rota fixa, ou função que resolve com os dados do perfil de visualização (ex.: /companies/[slug]) */
  href: string | ((user: ViewerUser) => string);
  /** prefixos de rota que marcam o item como ativo além do próprio href */
  activeOn?: readonly string[];
  rfs: readonly string[];
  access: AccessMatrix;
  subTabs?: readonly SubTab[];
  /** chave de contagem no mock de notificações/pendências (badge) */
  badge?: "notifications" | "messages" | "reviewQueue" | "curation" | "approvals";
  proposal?: boolean;
}

export interface NavGroup {
  id: "descobrir" | "meu-trabalho" | "criar" | "jogar-e-ganhar" | "gestao";
  labelKey: string;
  items: readonly NavItem[];
}

export const MURAL_TABS: readonly SubTab[] = [
  { slug: "empresa", labelKey: "tabs.mural.empresa" },
  { slug: "vitrine", labelKey: "tabs.mural.vitrine" },
  { slug: "seguindo", labelKey: "tabs.mural.seguindo" },
];
export const SEARCH_TABS: readonly SubTab[] = [
  { slug: "projetos", labelKey: "tabs.search.projetos" },
  { slug: "tarefas", labelKey: "tabs.search.tarefas" },
  { slug: "pessoas", labelKey: "tabs.search.pessoas" },
  { slug: "empresas", labelKey: "tabs.search.empresas" },
  { slug: "chefes", labelKey: "tabs.search.chefes" },
];
export const MODELS_TABS: readonly SubTab[] = [
  { slug: "chancelados", labelKey: "tabs.models.chancelados" },
  { slug: "comunidade", labelKey: "tabs.models.comunidade" },
];
export const INSIGHTS_TABS: readonly SubTab[] = [
  { slug: "acervo", labelKey: "tabs.insights.acervo" },
  { slug: "perfil", labelKey: "tabs.insights.perfil", hiddenFor: ["EMPRESA"] },
  { slug: "equipe", labelKey: "tabs.insights.equipe", hiddenFor: ["EMPREGADO", "CURADOR", "VISITANTE"] },
  { slug: "ranking", labelKey: "tabs.insights.ranking" },
  { slug: "sugeridos", labelKey: "tabs.insights.sugeridos" },
];
export const ADMIN_TABS: readonly SubTab[] = [
  { slug: "dashboard", labelKey: "tabs.admin.dashboard" },
  { slug: "aprovacoes", labelKey: "tabs.admin.aprovacoes" },
  { slug: "usuarios", labelKey: "tabs.admin.usuarios" },
  { slug: "moderacao", labelKey: "tabs.admin.moderacao" },
  { slug: "ia", labelKey: "tabs.admin.ia" },
  { slug: "auditoria", labelKey: "tabs.admin.auditoria" },
  { slug: "sistema", labelKey: "tabs.admin.sistema" },
];
export const DESK_TABS: readonly SubTab[] = [
  { slug: "minha-mesa", labelKey: "tabs.desk.minha" },
  { slug: "equipe", labelKey: "tabs.desk.equipe" },
];
export const MESSAGES_TABS: readonly SubTab[] = [
  { slug: "conversas", labelKey: "tabs.messages.conversas" },
  { slug: "atribuicoes", labelKey: "tabs.messages.atribuicoes" },
];
export const SETTINGS_TABS: readonly SubTab[] = [
  { slug: "aparencia", labelKey: "tabs.settings.aparencia" },
  { slug: "notificacoes", labelKey: "tabs.settings.notificacoes" },
  { slug: "trabalho", labelKey: "tabs.settings.trabalho" },
  { slug: "conta", labelKey: "tabs.settings.conta" },
  { slug: "privacidade", labelKey: "tabs.settings.privacidade" },
  { slug: "dados", labelKey: "tabs.settings.dados" },
  { slug: "sessoes", labelKey: "tabs.settings.sessoes" },
  { slug: "termos", labelKey: "tabs.settings.termos" },
];
export const POINTS_TABS: readonly SubTab[] = [
  { slug: "saldo", labelKey: "tabs.points.saldo", hiddenFor: ["EMPRESA"] },
  { slug: "extrato", labelKey: "tabs.points.extrato", hiddenFor: ["EMPRESA"] },
  { slug: "regras", labelKey: "tabs.points.regras" },
  { slug: "departamentos", labelKey: "tabs.points.departamentos", hiddenFor: ["EMPREGADO", "CURADOR", "VISITANTE"] },
];
export const DECIA_TABS: readonly SubTab[] = [
  { slug: "abertas", labelKey: "tabs.decia.abertas" },
  { slug: "minhas", labelKey: "tabs.decia.minhas" },
  { slug: "encerradas", labelKey: "tabs.decia.encerradas" },
];
export const SESSION_TABS: readonly SubTab[] = [
  { slug: "conversa", labelKey: "tabs.session.conversa" },
  { slug: "minuta", labelKey: "tabs.session.minuta" },
  { slug: "artefatos", labelKey: "tabs.session.artefatos" },
  { slug: "decisao", labelKey: "tabs.session.decisao" },
  { slug: "participantes", labelKey: "tabs.session.participantes" },
];

const companyHref = (u: ViewerUser) => `/companies/${u.companySlug ?? "secretaria-exemplo"}`;
const departmentHref = (u: ViewerUser) => `/departments/${u.departmentSlug ?? "secid-uts"}`;

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "descobrir",
    labelKey: "nav.group.descobrir",
    items: [
      { id: "mural", labelKey: "nav.mural", glyph: "mural", href: "/mural", rfs: ["RF27"], access: everyone("V"), subTabs: MURAL_TABS },
      { id: "search", labelKey: "nav.search", glyph: "buscar", href: "/search", rfs: ["RF27", "RF17"], access: everyone("V"), subTabs: SEARCH_TABS },
      { id: "memory", labelKey: "nav.memory", glyph: "acervo", href: "/memory", rfs: ["RF33"], access: everyone("V") },
      { id: "companies", labelKey: "nav.companies", glyph: "perfil", href: "/companies", activeOn: ["/companies", "/departments"], rfs: ["RF28"], access: everyone("V") },
      { id: "models", labelKey: "nav.models", glyph: "balcao", href: "/models", rfs: ["RF40"], access: access({ EMPREGADO: "E", EMPRESA: "E", CHEFE: "E", CURADOR: "V", ADMIN: "V", VISITANTE: "V" }), subTabs: MODELS_TABS },
      // P-14/P-15 (ABAS_POR_PERFIL §8): Mensagens (RF46) no grupo Descobrir + ícone na barra superior — proposta
      { id: "messages", labelKey: "nav.messages", glyph: "sessao-decia", href: "/messages", rfs: ["RF46"], access: logged("E"), badge: "messages", proposal: true, subTabs: MESSAGES_TABS },
    ],
  },
  {
    id: "meu-trabalho",
    labelKey: "nav.group.meuTrabalho",
    items: [
      { id: "profile", labelKey: "nav.profile", glyph: "perfil", href: "/profile", activeOn: ["/profile", "/u/"], rfs: ["RF6", "RF19"], access: logged("E") },
      { id: "tasks", labelKey: "nav.tasks", glyph: "acervo", href: "/tasks", rfs: ["RF41"], access: logged("E") },
      { id: "attachments", labelKey: "nav.attachments", glyph: "acervo", href: "/attachments", rfs: ["RF41"], access: logged("E") },
      { id: "desk", labelKey: "nav.desk", glyph: "mesa", href: "/desk", rfs: ["RF21", "RF22"], access: logged("E"), subTabs: DESK_TABS },
      // Espelho e Simulador exigem um projeto (Q-101): o atalho abre o projeto de exemplo até existir o seletor
      { id: "mirror", labelKey: "nav.mirror", glyph: "insights-ia", href: "/projects/exemplo/mirror", activeOn: ["/projects/"], rfs: ["RF32"], access: logged("E") },
      { id: "simulate", labelKey: "nav.simulate", glyph: "hype", href: "/projects/exemplo/simulate", rfs: ["RF31"], access: logged("E") },
    ],
  },
  {
    id: "criar",
    labelKey: "nav.group.criar",
    items: [
      { id: "tasks-new", labelKey: "nav.tasksNew", glyph: "criar-tarefa", href: "/tasks/new", rfs: ["RF4", "RF23"], access: logged("E") },
      { id: "projects-new", labelKey: "nav.projectsNew", glyph: "criar-projeto", href: "/projects/new", rfs: ["RF5", "RF20"], access: logged("E") },
      { id: "plans", labelKey: "nav.plans", glyph: "tarefa-do-dia", href: "/plans", rfs: ["RF24"], access: logged("E") },
      { id: "autopilot", labelKey: "nav.autopilot", glyph: "insights-ia", href: "/autopilot", rfs: ["RF30", "RF26", "RF43"], access: logged("E") },
      { id: "decia", labelKey: "nav.decia", glyph: "sessao-decia", href: "/decia", activeOn: ["/decia"], rfs: ["RF29"], access: logged("E"), subTabs: DECIA_TABS },
      { id: "insights", labelKey: "nav.insights", glyph: "insights-ia", href: "/insights", rfs: ["RF43"], access: logged("V"), subTabs: INSIGHTS_TABS },
    ],
  },
  {
    id: "jogar-e-ganhar",
    labelKey: "nav.group.jogarEGanhar",
    items: [
      { id: "goals", labelKey: "nav.goals", glyph: "hype", href: "/goals", rfs: ["RF35"], access: access({ EMPREGADO: "V", EMPRESA: "E", CHEFE: "E", CURADOR: "V", ADMIN: "V" }) },
      { id: "points", labelKey: "nav.points", glyph: "decia-points", href: "/points", rfs: ["RF42"], access: logged("V"), subTabs: POINTS_TABS },
      { id: "store", labelKey: "nav.store", glyph: "balcao", href: "/store", rfs: ["RF42"], access: access({ EMPREGADO: "E", EMPRESA: "E", CHEFE: "E", CURADOR: "E", ADMIN: "E" }) },
      { id: "highlights", labelKey: "nav.highlights", glyph: "hype", href: "/highlights", rfs: ["RF35"], access: access({ EMPREGADO: "V", EMPRESA: "E", CHEFE: "E", CURADOR: "E", ADMIN: "V" }) },
      { id: "benefits", labelKey: "nav.benefits", glyph: "decia-points", href: "/benefits", rfs: ["RF39"], access: access({ EMPREGADO: "V", EMPRESA: "E", CHEFE: "E", CURADOR: "V", ADMIN: "V" }) },
      { id: "recognitions", labelKey: "nav.recognitions", glyph: "chancela", href: "/recognitions", rfs: ["RF35", "RF28"], access: access({ EMPREGADO: "V", EMPRESA: "E", CHEFE: "E", CURADOR: "V", ADMIN: "V" }) },
    ],
  },
  {
    id: "gestao",
    labelKey: "nav.group.gestao",
    items: [
      { id: "issuer-dashboard", labelKey: "nav.issuerDashboard", glyph: "insights-ia", href: "/issuer/dashboard", rfs: ["RF28"], access: access({ EMPRESA: "V", CHEFE: "V", ADMIN: "V" }) },
      { id: "manage-departments", labelKey: "nav.manageDepartments", glyph: "perfil", href: (u) => `${companyHref(u)}/manage/departments`, rfs: ["RF28"], access: access({ EMPRESA: "E", ADMIN: "V" }), proposal: true },
      { id: "team", labelKey: "nav.team", glyph: "perfil", href: (u) => `${departmentHref(u)}/team`, rfs: ["RF9", "RF10", "RF28", "RF43", "RF36"], access: access({ EMPRESA: "V", CHEFE: "E", CURADOR: "V", ADMIN: "V" }), proposal: true },
      { id: "seals-review", labelKey: "nav.sealsReview", glyph: "chancela", href: "/seals/review", rfs: ["RF39", "RF28"], access: access({ EMPRESA: "E", CHEFE: "E", CURADOR: "E", ADMIN: "V" }), badge: "reviewQueue" },
      { id: "decia-review", labelKey: "nav.deciaReview", glyph: "sessao-decia", href: "/decia/review", rfs: ["RF29"], access: access({ EMPRESA: "V", CHEFE: "E", ADMIN: "V" }) },
      { id: "seals", labelKey: "nav.seals", glyph: "chancela", href: "/seals", rfs: ["RF39"], access: access({ EMPRESA: "E", CHEFE: "E", ADMIN: "V" }) },
      { id: "handoffs", labelKey: "nav.handoffs", glyph: "acervo", href: "/handoffs", rfs: ["RF36"], access: access({ EMPREGADO: "V", EMPRESA: "E", CHEFE: "E", ADMIN: "V" }) },
      { id: "curation", labelKey: "nav.curation", glyph: "chancela", href: "/curation", rfs: ["RF28", "RF39"], access: access({ CURADOR: "E" }), badge: "curation", proposal: true },
      { id: "admin", labelKey: "nav.admin", glyph: "configuracoes", href: "/admin", activeOn: ["/admin"], rfs: ["RF18", "RF28", "RF43"], access: access({ ADMIN: "E" }), subTabs: ADMIN_TABS, badge: "approvals" },
    ],
  },
];

export const resolveHref = (item: Pick<NavItem, "href">, user: ViewerUser): string => (typeof item.href === "function" ? item.href(user) : item.href);

/** Itens visíveis para o perfil (célula ≠ O); visitante vê só Descobrir (ABAS_POR_PERFIL §2, regra do FAI app-shell:72). */
export function visibleGroups(profile: ViewerProfile): NavGroup[] {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.access[profile] !== "O" && (profile !== "VISITANTE" || g.id === "descobrir")) })).filter((g) => g.items.length > 0);
}

export function isActivePath(pathname: string, href: string, activeOn?: readonly string[]): boolean {
  if (pathname === href) return true;
  if (activeOn?.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`))) return true;
  return href !== "/" && pathname.startsWith(`${href}/`);
}

export interface BottomDest { id: string; labelKey: string; glyph: GlyphName; href: string }
/** §2.6: Mural · Buscar · + · Acervo · Perfil; EMPRESA → 5º = página da empresa; visitante: Mural · Buscar · Memória · Empresas. */
export function bottomNav(user: ViewerUser): (BottomDest | "create")[] {
  if (user.profile === "VISITANTE") {
    return [
      { id: "mural", labelKey: "nav.mural", glyph: "mural", href: "/mural" },
      { id: "search", labelKey: "nav.search", glyph: "buscar", href: "/search" },
      { id: "memory", labelKey: "nav.memory", glyph: "acervo", href: "/memory" },
      { id: "companies", labelKey: "nav.companies", glyph: "perfil", href: "/companies" },
    ];
  }
  const fifth: BottomDest = user.profile === "EMPRESA"
    ? { id: "company", labelKey: "nav.companyPage", glyph: "perfil", href: companyHref(user) }
    : { id: "profile", labelKey: "nav.profileShort", glyph: "perfil", href: "/profile" };
  return [
    { id: "mural", labelKey: "nav.mural", glyph: "mural", href: "/mural" },
    { id: "search", labelKey: "nav.search", glyph: "buscar", href: "/search" },
    "create",
    { id: "tasks", labelKey: "nav.tasksShort", glyph: "acervo", href: "/tasks" },
    fifth,
  ];
}

export interface CreateOption { id: string; labelKey: string; hintKey: string; glyph: GlyphName; href: string; rf: string }
/** §2.6 folha "+ Criar": Tarefa · Projeto · Plano Anual/Trilha · Nova sessão DECIA; EMPRESA/CHEFE: + Nova chancela (RF39.CA01). */
export function createOptions(profile: ViewerProfile): CreateOption[] {
  const base: CreateOption[] = [
    { id: "task", labelKey: "create.task", hintKey: "create.taskHint", glyph: "criar-tarefa", href: "/tasks/new", rf: "RF4" },
    { id: "project", labelKey: "create.project", hintKey: "create.projectHint", glyph: "criar-projeto", href: "/projects/new", rf: "RF5" },
    { id: "plan", labelKey: "create.plan", hintKey: "create.planHint", glyph: "tarefa-do-dia", href: "/plans?acao=novo", rf: "RF24" },
    { id: "decia", labelKey: "create.decia", hintKey: "create.deciaHint", glyph: "sessao-decia", href: "/decia?acao=nova", rf: "RF29" },
  ];
  if (profile === "EMPRESA" || profile === "CHEFE") base.push({ id: "seal", labelKey: "create.seal", hintKey: "create.sealHint", glyph: "chancela", href: "/seals?acao=nova", rf: "RF39" });
  return base;
}

/** Sub-abas visíveis para o perfil. */
export const visibleTabs = (tabs: readonly SubTab[], profile: ViewerProfile) => tabs.filter((t) => !t.hiddenFor?.includes(profile));
