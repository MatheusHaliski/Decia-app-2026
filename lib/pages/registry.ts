/**
 * Registro das páginas-esqueleto: rota → título (i18n) → RFs citados (docs/diagramas/RFnn/README.md "Aba/rota") →
 * visibilidade por perfil (ABAS_POR_PERFIL.md Matrizes A–E) → sub-abas. É a tabela do §11 "Implementado em" e a
 * fonte do teste que exige uma página para cada RF do catálogo (RF1–RF74) (lib/rf/catalog.test.ts).
 */
import type { GlyphName, MojiName } from "@/components/ui/glyphs/sprite.gen";
import { ADMIN_TABS, AGENTS_ACCESS, AGENTS_TABS, DECIA_TABS, DESK_TABS, FIND_TABS, INSIGHTS_TABS, MESSAGES_TABS, MODELS_TABS, MURAL_TABS, POINTS_TABS, SEARCH_TABS, SESSION_TABS, SETTINGS_TABS, type SubTab } from "@/lib/nav/matrix";
import { access, everyone, logged, type AccessMatrix } from "@/lib/viewer/profiles";

export interface PageEntry {
  /** rota do App Router (com [param]) */
  route: string;
  /** arquivo da página (para o §11 do ABAS_POR_PERFIL.md) */
  file: string;
  titleKey: string;
  /** RFs citados: o primeiro é o principal (chip grande); os demais aparecem como chips menores */
  rfs: readonly string[];
  access: AccessMatrix;
  glyph: GlyphName;
  moji?: MojiName;
  tabs?: readonly SubTab[];
  /** parâmetro de URL das sub-abas (padrão `tab`) */
  tabParam?: string;
  /** matriz de origem */
  matrix: "A" | "B" | "C" | "D" | "E" | "auth" | "lab" | "global";
  note?: "proposal" | "sessionCards";
}

const p = (route: string, file: string, titleKey: string, rfs: readonly string[], acc: AccessMatrix, glyph: GlyphName, matrix: PageEntry["matrix"], extra: Partial<PageEntry> = {}): PageEntry =>
  ({ route, file, titleKey, rfs, access: acc, glyph, matrix, ...extra });

/** Matriz B (§3): 15 sub-abas do perfil pessoal. `thirdParty` = visível no perfil de terceiros (1–5). */
export interface ProfileTab extends SubTab { n: number; thirdParty: boolean; companyLabelKey?: string }
export const PROFILE_TABS: readonly ProfileTab[] = [
  { n: 1, slug: "acervo", labelKey: "tabs.profile.acervo", thirdParty: true },
  { n: 2, slug: "projetos", labelKey: "tabs.profile.projetos", thirdParty: true, companyLabelKey: "tabs.profile.projetosEmpresa" },
  { n: 3, slug: "programas", labelKey: "tabs.profile.programas", thirdParty: true },
  { n: 4, slug: "decisoes", labelKey: "tabs.profile.decisoes", thirdParty: true },
  { n: 5, slug: "deliberativo", labelKey: "tabs.profile.deliberativo", thirdParty: true, hiddenFor: ["EMPRESA"] },
  { n: 6, slug: "planos", labelKey: "tabs.profile.planos", thirdParty: false, companyLabelKey: "tabs.profile.planoOficial" },
  { n: 7, slug: "projetos-salvos", labelKey: "tabs.profile.projetosSalvos", thirdParty: false },
  { n: 8, slug: "tarefas-salvas", labelKey: "tabs.profile.tarefasSalvas", thirdParty: false },
  { n: 9, slug: "tarefa-do-dia", labelKey: "tabs.profile.tarefaDoDia", thirdParty: false, hiddenFor: ["EMPRESA"] },
  { n: 10, slug: "kits", labelKey: "tabs.profile.kits", thirdParty: false },
  { n: 11, slug: "modelos", labelKey: "tabs.profile.modelos", thirdParty: false, companyLabelKey: "tabs.profile.modelosOficiais" },
  { n: 12, slug: "reconhecimentos", labelKey: "tabs.profile.reconhecimentos", thirdParty: false, companyLabelKey: "tabs.profile.emitidos" },
  { n: 13, slug: "points", labelKey: "tabs.profile.points", thirdParty: false, hiddenFor: ["EMPRESA"] },
  { n: 14, slug: "hype", labelKey: "tabs.profile.hype", thirdParty: false, hiddenFor: ["EMPRESA"] },
  { n: 15, slug: "deliberativo-completo", labelKey: "tabs.profile.deliberativoCompleto", thirdParty: false, hiddenFor: ["EMPRESA"] },
];

/** Matriz C (§4): página da EMPRESA. */
export const COMPANY_TABS: readonly SubTab[] = [
  { slug: "sobre", labelKey: "tabs.company.sobre" },
  { slug: "departamentos", labelKey: "tabs.company.departamentos" },
  { slug: "programas", labelKey: "tabs.company.programas" },
  { slug: "plano-anual", labelKey: "tabs.company.planoAnual" },
  { slug: "chancelas", labelKey: "tabs.company.chancelas" },
  { slug: "beneficios", labelKey: "tabs.company.beneficios" },
  { slug: "destaques", labelKey: "tabs.company.destaques" },
  { slug: "pessoas", labelKey: "tabs.company.pessoas" },
  { slug: "comunicados", labelKey: "tabs.company.comunicados", proposal: true },
  { slug: "gestao", labelKey: "tabs.company.gestao", hiddenFor: ["EMPREGADO", "CHEFE", "CURADOR", "VISITANTE"], proposal: true },
];

/** Matriz D (§5): página do DEPARTAMENTO. */
export const DEPARTMENT_TABS: readonly SubTab[] = [
  { slug: "sobre", labelKey: "tabs.department.sobre" },
  { slug: "projetos", labelKey: "tabs.department.projetos" },
  { slug: "sessoes", labelKey: "tabs.department.sessoes", hiddenFor: ["VISITANTE"] },
  { slug: "chancelas", labelKey: "tabs.department.chancelas" },
  { slug: "reconhecimentos", labelKey: "tabs.department.reconhecimentos" },
  { slug: "equipe", labelKey: "tabs.department.equipe" },
  { slug: "minha-equipe", labelKey: "tabs.department.minhaEquipe", hiddenFor: ["EMPREGADO", "VISITANTE"], proposal: true },
  { slug: "dashboard", labelKey: "tabs.department.dashboard", hiddenFor: ["EMPREGADO", "CURADOR", "VISITANTE"] },
  { slug: "insights", labelKey: "tabs.department.insights", hiddenFor: ["EMPREGADO", "CURADOR", "VISITANTE"] },
];

const ISSUER = access({ EMPRESA: "E", CHEFE: "E", ADMIN: "V" });

export const PAGES: readonly PageEntry[] = [
  // Descobrir (Matriz A §2.1)
  p("/mural", "app/(shell)/mural/page.tsx", "nav.mural", ["RF27", "RF18", "RF19"], everyone("V"), "mural", "A", { tabs: MURAL_TABS }),
  p("/search", "app/(shell)/search/page.tsx", "nav.search", ["RF27", "RF17"], everyone("V"), "buscar", "A", { tabs: SEARCH_TABS }),
  p("/memory", "app/(shell)/memory/page.tsx", "nav.memory", ["RF33"], everyone("V"), "acervo", "A"),
  p("/companies", "app/(shell)/companies/page.tsx", "nav.companies", ["RF28"], everyone("V"), "perfil", "A"),
  p("/companies/[slug]", "app/(shell)/companies/[slug]/page.tsx", "page.company", ["RF15", "RF28", "RF25", "RF39", "RF24"], everyone("V"), "perfil", "C", { tabs: COMPANY_TABS }),
  p("/departments/[slug]", "app/(shell)/departments/[slug]/page.tsx", "page.department", ["RF14", "RF28", "RF9"], everyone("V"), "perfil", "D", { tabs: DEPARTMENT_TABS }),
  p("/models", "app/(shell)/models/page.tsx", "nav.models", ["RF40"], access({ EMPREGADO: "E", EMPRESA: "E", CHEFE: "E", CURADOR: "V", ADMIN: "V", VISITANTE: "V" }), "balcao", "A", { tabs: MODELS_TABS }),
  p("/messages", "app/(shell)/messages/page.tsx", "nav.messages", ["RF46", "RF10"], logged("E"), "sessao-decia", "A", { tabs: MESSAGES_TABS, note: "proposal" }),
  p("/messages/[conversationId]", "app/(shell)/messages/[conversationId]/page.tsx", "page.conversation", ["RF46", "RF13"], logged("E"), "sessao-decia", "A", { note: "proposal" }),
  p("/find", "app/(shell)/find/page.tsx", "nav.find", ["RF47", "RF48", "RF27", "RF33", "RF20"], logged("E"), "buscar", "A", { tabs: FIND_TABS }),
  // Meu trabalho (§2.2)
  p("/profile", "app/(shell)/profile/page.tsx", "nav.profile", ["RF6", "RF19", "RF12", "RF25", "RF44", "RF45", "RF40"], logged("E"), "perfil", "B", { tabs: PROFILE_TABS }),
  p("/u/[username]", "app/(shell)/u/[username]/page.tsx", "page.userProfile", ["RF16", "RF6", "RF18", "RF19"], everyone("V"), "perfil", "B", { tabs: PROFILE_TABS }),
  p("/tasks", "app/(shell)/tasks/page.tsx", "nav.tasks", ["RF41", "RF44", "RF18", "RF13"], logged("E"), "acervo", "A"),
  // visitante lê só tarefas PUBLICA (perfis públicos, Mural, Buscar — RF16/RF17.CA04/RF27); o resto 403 no TaskDetail (D-93)
  p("/tasks/[id]", "app/(shell)/tasks/[id]/page.tsx", "page.task", ["RF41", "RF19", "RF18", "RF7", "RF34", "RF13", "RF10"], everyone("V"), "acervo", "A"),
  p("/tasks/[id]/edit", "app/(shell)/tasks/[id]/edit/page.tsx", "page.taskEdit", ["RF8", "RF11", "RF12"], logged("E"), "criar-tarefa", "A"),
  p("/attachments", "app/(shell)/attachments/page.tsx", "nav.attachments", ["RF41"], logged("E"), "acervo", "A"),
  p("/desk", "app/(shell)/desk/page.tsx", "nav.desk", ["RF21", "RF22", "RF44"], logged("E"), "mesa", "A", { tabs: DESK_TABS }),
  p("/projects/[id]", "app/(shell)/projects/[id]/page.tsx", "page.project", ["RF7", "RF29", "RF13", "RF10"], logged("V"), "criar-projeto", "A"),
  p("/projects/[id]/edit", "app/(shell)/projects/[id]/edit/page.tsx", "page.projectEdit", ["RF22", "RF12", "RF8", "RF11"], logged("E"), "mesa", "A"),
  p("/projects/[id]/simulate", "app/(shell)/projects/[id]/simulate/page.tsx", "nav.simulate", ["RF31"], logged("E"), "hype", "A"),
  p("/projects/[id]/mirror", "app/(shell)/projects/[id]/mirror/page.tsx", "nav.mirror", ["RF32"], logged("E"), "insights-ia", "A"),
  p("/agents", "app/(shell)/agents/page.tsx", "page.agents", ["RF48", "RF47", "RF29", "RF43"], AGENTS_ACCESS, "chancela", "A", { tabs: AGENTS_TABS }),
  // Criar (§2.3)
  p("/tasks/new", "app/(shell)/tasks/new/page.tsx", "nav.tasksNew", ["RF4", "RF23", "RF34"], logged("E"), "criar-tarefa", "A"),
  p("/projects/new", "app/(shell)/projects/new/page.tsx", "nav.projectsNew", ["RF5", "RF20"], logged("E"), "criar-projeto", "A"),
  p("/plans", "app/(shell)/plans/page.tsx", "nav.plans", ["RF24"], logged("E"), "tarefa-do-dia", "A"),
  p("/autopilot", "app/(shell)/autopilot/page.tsx", "nav.autopilot", ["RF30", "RF26", "RF43"], logged("E"), "insights-ia", "A"),
  p("/decia", "app/(shell)/decia/page.tsx", "nav.decia", ["RF29", "RF37"], logged("E"), "sessao-decia", "A", { tabs: DECIA_TABS }),
  p("/decia/decisoes/[decisionId]", "app/(shell)/decia/decisoes/[decisionId]/page.tsx", "page.decision", ["RF29"], logged("E"), "sessao-decia", "A"),
  p("/decia/[sessionId]", "app/(shell)/decia/[sessionId]/page.tsx", "page.session", ["RF29", "RF13", "RF37", "RF46"], logged("E"), "sessao-decia", "A", { tabs: SESSION_TABS, note: "sessionCards" }),
  p("/insights", "app/(shell)/insights/page.tsx", "nav.insights", ["RF43", "RF20", "RF26", "RF50"], logged("V"), "insights-ia", "E", { tabs: INSIGHTS_TABS }),
  // Editores de peças (PLANO_ONDAS 17/10/2026, Ondas 4 e 5): páginas-esqueleto com os CAs até o editor existir; RF51/RF69–RF72 são transversais às duas
  p("/letters", "app/(shell)/letters/page.tsx", "nav.letters", ["RF52", "RF53", "RF54", "RF55", "RF56", "RF51", "RF69", "RF70", "RF71", "RF72"], logged("E"), "criar-tarefa", "A"),
  p("/drawings", "app/(shell)/drawings/page.tsx", "nav.drawings", ["RF57", "RF58", "RF59", "RF60", "RF61", "RF62", "RF63", "RF64", "RF65", "RF66", "RF67", "RF68", "RF73", "RF74", "RF51", "RF69", "RF70", "RF71", "RF72"], logged("E"), "mesa", "A"),
  // Jogar e ganhar (§2.4 / Matriz E)
  p("/goals", "app/(shell)/goals/page.tsx", "nav.goals", ["RF35", "RF24", "RF49"], access({ EMPREGADO: "V", EMPRESA: "E", CHEFE: "E", CURADOR: "V", ADMIN: "V" }), "hype", "E"),
  p("/points", "app/(shell)/points/page.tsx", "nav.points", ["RF42"], logged("V"), "decia-points", "E", { tabs: POINTS_TABS }),
  p("/store", "app/(shell)/store/page.tsx", "nav.store", ["RF42", "RF40"], logged("E"), "balcao", "E"),
  p("/highlights", "app/(shell)/highlights/page.tsx", "nav.highlights", ["RF35"], access({ EMPREGADO: "V", EMPRESA: "E", CHEFE: "E", CURADOR: "E", ADMIN: "V" }), "hype", "E"),
  p("/benefits", "app/(shell)/benefits/page.tsx", "nav.benefits", ["RF39"], access({ EMPREGADO: "V", EMPRESA: "E", CHEFE: "E", CURADOR: "V", ADMIN: "V" }), "decia-points", "E"),
  p("/recognitions", "app/(shell)/recognitions/page.tsx", "nav.recognitions", ["RF35", "RF28"], access({ EMPREGADO: "V", EMPRESA: "E", CHEFE: "E", CURADOR: "V", ADMIN: "V" }), "chancela", "E"),
  // Gestão (§2.5)
  p("/issuer/dashboard", "app/(shell)/issuer/dashboard/page.tsx", "nav.issuerDashboard", ["RF28"], access({ EMPRESA: "V", CHEFE: "V", ADMIN: "V" }), "insights-ia", "A"),
  p("/companies/[slug]/manage/departments", "app/(shell)/companies/[slug]/manage/departments/page.tsx", "nav.manageDepartments", ["RF28", "RF9"], access({ EMPRESA: "E", ADMIN: "V" }), "perfil", "A", { note: "proposal" }),
  p("/departments/[slug]/team", "app/(shell)/departments/[slug]/team/page.tsx", "nav.team", ["RF9", "RF10", "RF28", "RF43", "RF36", "RF46"], access({ EMPRESA: "V", CHEFE: "E", CURADOR: "V", ADMIN: "V" }), "perfil", "D", { note: "proposal" }),
  p("/seals/review", "app/(shell)/seals/review/page.tsx", "nav.sealsReview", ["RF39", "RF28"], access({ EMPRESA: "E", CHEFE: "E", CURADOR: "E", ADMIN: "V" }), "chancela", "A"),
  p("/decia/review", "app/(shell)/decia/review/page.tsx", "nav.deciaReview", ["RF29"], access({ EMPRESA: "V", CHEFE: "E", ADMIN: "V" }), "sessao-decia", "A", { note: "sessionCards" }),
  p("/seals", "app/(shell)/seals/page.tsx", "nav.seals", ["RF39"], ISSUER, "chancela", "A"),
  p("/handoffs", "app/(shell)/handoffs/page.tsx", "nav.handoffs", ["RF36"], access({ EMPREGADO: "V", EMPRESA: "E", CHEFE: "E", ADMIN: "V" }), "acervo", "A"),
  p("/curation", "app/(shell)/curation/page.tsx", "nav.curation", ["RF28", "RF39", "RF35"], access({ CURADOR: "E" }), "chancela", "A", { note: "proposal" }),
  p("/admin", "app/(shell)/admin/page.tsx", "nav.admin", ["RF18", "RF28", "RF43"], access({ ADMIN: "E" }), "configuracoes", "E", { tabs: ADMIN_TABS }),
  // Globais
  p("/settings", "app/(shell)/settings/page.tsx", "nav.settings", ["RF3", "RF38"], logged("E"), "configuracoes", "global", { tabs: SETTINGS_TABS }),
  p("/notifications", "app/(shell)/notifications/page.tsx", "nav.notifications", [], logged("V"), "notificacoes", "global"),
  // Auth (fora do shell)
  p("/login", "app/(auth)/login/page.tsx", "auth.login.title", ["RF2"], everyone("V"), "perfil", "auth"),
  p("/register", "app/(auth)/register/page.tsx", "auth.register.title", ["RF1"], everyone("V"), "perfil", "auth"),
  p("/password-reset", "app/(auth)/password-reset/page.tsx", "auth.reset.title", ["RF2"], everyone("V"), "perfil", "auth"),
  p("/verify-email", "app/(auth)/verify-email/page.tsx", "auth.verify.title", ["RF1"], everyone("V"), "perfil", "auth"),
  // Lab
  p("/lab/design-system", "app/(shell)/lab/design-system/page.tsx", "lab.designSystem", ["RF38"], everyone("V"), "configuracoes", "lab"),
  p("/lab/anatomias", "app/(shell)/lab/anatomias/page.tsx", "lab.anatomias", ["RF38", "RF11"], everyone("V"), "mesa", "lab"),
  p("/lab/perfis", "app/(shell)/lab/perfis/page.tsx", "lab.perfis", ["RF14", "RF15", "RF16"], everyone("V"), "perfil", "lab"),
  p("/lab/decia", "app/(shell)/lab/decia/page.tsx", "lab.decia", ["RF29", "RF37"], everyone("V"), "sessao-decia", "lab"),
];

export const rfsOf = (page: PageEntry) => page.rfs;
export const pageByRoute = (route: string) => PAGES.find((pg) => pg.route === route);
