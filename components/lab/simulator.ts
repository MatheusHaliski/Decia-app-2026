/**
 * Simulador de Perfis e Governança no Laboratório (D-35) — lógica PURA sobre a MESMA matriz de acesso do registro de páginas
 * (`lib/pages/registry.ts`): é dela que a sidebar, o middleware (D-60) e o 403 simulado das páginas (`RfPage`) já leem. Nada de
 * matriz paralela: o simulador só classifica, compara e explica as células que estão lá.
 *  • `explainAccess` — por que um perfil edita, vê ou não vê uma página: o papel do perfil (ABAS_POR_PERFIL §1.1), a regra que a
 *    linha da matriz expressa (os guards do §1.2) e as decisões que a fixaram;
 *  • `compareProfiles` — o que muda entre dois perfis, página a página e nas sub-abas;
 *  • `SCENARIOS` — cenários guiados que levam à página certa já no perfil escolhido; o resultado esperado é lido da matriz.
 */
import { NAV_GROUPS, resolveHref, visibleTabs, type NavGroup } from "@/lib/nav/matrix";
import { PAGES, type PageEntry } from "@/lib/pages/registry";
import { VIEWER_PROFILES, VIEWER_USERS, type Access, type AccessMatrix, type ViewerProfile, type ViewerUser } from "@/lib/viewer/profiles";

/** Regras de acesso que as linhas da matriz expressam hoje (uma por padrão de células, na ordem dos perfis). */
export const ACCESS_RULES = [
  "PUBLICA", "LOGADOS_EDITAM", "LOGADOS_VEEM", "BALCAO", "AGENTES", "EMISSOR_CRIA", "EMISSOR_E_CURADORIA", "PAINEL_EMISSOR",
  "EMPRESA_DONA", "CHEFE_EQUIPE", "FILA_CHANCELAS", "REVISAO_DECISOES", "CHANCELAS", "DOSSIES", "CURADORIA", "ADMIN", "MISTA",
] as const;
export type AccessRule = (typeof ACCESS_RULES)[number];

/** Assinatura da linha: as 6 células na ordem EMPREGADO · EMPRESA · CHEFE · CURADOR · ADMIN · VISITANTE. */
export const signatureOf = (acc: AccessMatrix) => VIEWER_PROFILES.map((p) => acc[p]).join("");

const BY_SIGNATURE: Readonly<Record<string, AccessRule>> = {
  VVVVVV: "PUBLICA",
  EEEEEO: "LOGADOS_EDITAM",
  VVVVVO: "LOGADOS_VEEM",
  EEEVVV: "BALCAO",
  EEEEVO: "AGENTES",
  VEEVVO: "EMISSOR_CRIA",
  VEEEVO: "EMISSOR_E_CURADORIA",
  OVVOVO: "PAINEL_EMISSOR",
  OEOOVO: "EMPRESA_DONA",
  OVEVVO: "CHEFE_EQUIPE",
  OEEEVO: "FILA_CHANCELAS",
  OVEOVO: "REVISAO_DECISOES",
  OEEOVO: "CHANCELAS",
  VEEOVO: "DOSSIES",
  OOOEOO: "CURADORIA",
  OOOOEO: "ADMIN",
};

export const ruleOf = (page: PageEntry): AccessRule => BY_SIGNATURE[signatureOf(page.access)] ?? "MISTA";

/** Guard do backend (planejado ou existente) que sustenta cada regra (ABAS_POR_PERFIL §1.2). */
const GUARD: Readonly<Record<AccessRule, string | null>> = {
  PUBLICA: "canView",
  LOGADOS_EDITAM: "requireCanCreate · requireOwner",
  LOGADOS_VEEM: "requireCanCreate · canView",
  BALCAO: "requireOwner · requireIssuer",
  AGENTES: "ResourceAuthorizer",
  EMISSOR_CRIA: "requireIssuer",
  EMISSOR_E_CURADORIA: "requireIssuerOrCurator(PREMIACAO)",
  PAINEL_EMISSOR: "requireIssuer",
  EMPRESA_DONA: "requireRole(EMPRESA) · requireOwner(company)",
  CHEFE_EQUIPE: "requireDeptHead",
  FILA_CHANCELAS: "requireIssuerOrCurator(FILA_REVISAO)",
  REVISAO_DECISOES: "requireSessionAdmin",
  CHANCELAS: "requireIssuer",
  DOSSIES: "requireIssuer",
  CURADORIA: "requireCurator",
  ADMIN: "requireAdmin",
  MISTA: null,
};

/** Decisões que fixaram o acesso de uma rota (além das gerais da regra). */
const ROUTE_DECISIONS: Readonly<Record<string, readonly string[]>> = {
  "/tasks/[id]": ["D-93"],
  "/find": ["D-128"],
  "/agents": ["D-130"],
  "/curation": ["D-09"],
  "/seals/review": ["D-09"],
  "/handoffs": ["RF36"],
  "/settings": ["D-147"],
};
const RULE_DECISIONS: Partial<Record<AccessRule, readonly string[]>> = {
  CURADORIA: ["D-09"],
  EMISSOR_E_CURADORIA: ["D-09"],
  PAINEL_EMISSOR: ["RF28.CA08"],
  CHANCELAS: ["RF28.CA08"],
  EMISSOR_CRIA: ["RF28.CA08"],
};

export type ExplainNote = "VISITANTE" | "NAO_EMISSOR" | "CURADOR" | "ADMIN_CONSULTA" | "LAB";

export interface AccessExplanation {
  cell: Access;
  rule: AccessRule;
  guard: string | null;
  /** notas do perfil nesta célula (chaves `labSim.note.*`) */
  notes: ExplainNote[];
  /** decisões e requisitos que fixaram a regra */
  decisions: string[];
}

const ISSUER_RULES: readonly AccessRule[] = ["EMISSOR_CRIA", "EMISSOR_E_CURADORIA", "PAINEL_EMISSOR", "FILA_CHANCELAS", "CHANCELAS", "DOSSIES", "EMPRESA_DONA", "REVISAO_DECISOES", "CHEFE_EQUIPE"];

export function explainAccess(page: PageEntry, profile: ViewerProfile): AccessExplanation {
  const cell = page.access[profile];
  const rule = ruleOf(page);
  const notes: ExplainNote[] = [];
  if (profile === "VISITANTE" && cell === "O") notes.push("VISITANTE");
  if ((profile === "EMPREGADO" || profile === "CURADOR") && ISSUER_RULES.includes(rule) && cell !== "E") notes.push("NAO_EMISSOR");
  if (profile === "CURADOR") notes.push("CURADOR");
  if (profile === "ADMIN" && cell === "V" && VIEWER_PROFILES.some((p) => page.access[p] === "E")) notes.push("ADMIN_CONSULTA");
  if (page.matrix === "lab") notes.push("LAB");
  const decisions = [...(ROUTE_DECISIONS[page.route] ?? []), ...(RULE_DECISIONS[rule] ?? [])];
  if (cell === "O" && profile === "VISITANTE") decisions.push("D-60");
  if (page.matrix === "lab") decisions.push("D-35");
  return { cell, rule, guard: GUARD[rule], notes, decisions: [...new Set(decisions)] };
}

export type DiffKind = "SO_A" | "SO_B" | "A_EDITA" | "B_EDITA";
export interface PageDiff { page: PageEntry; a: Access; b: Access; kind: DiffKind }
export interface TabDiff { page: PageEntry; tab: string; labelKey: string; visibleFor: "A" | "B" }
export interface ProfileComparison {
  a: ViewerProfile;
  b: ViewerProfile;
  diffs: PageDiff[];
  tabDiffs: TabDiff[];
  counts: { onlyA: number; onlyB: number; editA: number; editB: number; same: number; total: number };
}

const diffKind = (a: Access, b: Access): DiffKind | null => {
  if (a === b) return null;
  if (b === "O") return "SO_A";
  if (a === "O") return "SO_B";
  return a === "E" ? "A_EDITA" : "B_EDITA";
};

/** Diferenças entre dois perfis, lidas da matriz: páginas que só um vê, que um edita e o outro só vê, e sub-abas que mudam. */
export function compareProfiles(a: ViewerProfile, b: ViewerProfile, pages: readonly PageEntry[] = PAGES): ProfileComparison {
  const diffs: PageDiff[] = [];
  const tabDiffs: TabDiff[] = [];
  for (const page of pages) {
    const kind = diffKind(page.access[a], page.access[b]);
    if (kind) diffs.push({ page, a: page.access[a], b: page.access[b], kind });
    if (page.tabs && page.access[a] !== "O" && page.access[b] !== "O") {
      const va = new Set(visibleTabs(page.tabs, a).map((x) => x.slug));
      const vb = new Set(visibleTabs(page.tabs, b).map((x) => x.slug));
      for (const tab of page.tabs) {
        if (va.has(tab.slug) !== vb.has(tab.slug)) tabDiffs.push({ page, tab: tab.slug, labelKey: tab.labelKey, visibleFor: va.has(tab.slug) ? "A" : "B" });
      }
    }
  }
  const count = (k: DiffKind) => diffs.filter((d) => d.kind === k).length;
  return {
    a, b, diffs, tabDiffs,
    counts: { onlyA: count("SO_A"), onlyB: count("SO_B"), editA: count("A_EDITA"), editB: count("B_EDITA"), same: pages.length - diffs.length, total: pages.length },
  };
}

/** Rota do registro → endereço navegável com os dados fictícios do perfil (empresa, departamento, ids de exemplo). */
export function concreteHref(route: string, user: ViewerUser = VIEWER_USERS.EMPREGADO): string {
  return route
    .replace("/departments/[slug]", `/departments/${user.departmentSlug ?? "secid-uts"}`)
    .replace("[slug]", user.companySlug ?? "secretaria-exemplo")
    .replace("[username]", "pessoa.exemplo")
    .replace("[decisionId]", "d-arquitetura")
    .replace("[sessionId]", "exemplo")
    .replace("[conversationId]", "exemplo")
    .replace("[id]/edit", route.startsWith("/tasks") ? "t-exemplo/edit" : "decia-v1/edit")
    .replace("[id]", route.startsWith("/tasks") ? "t-exemplo" : "decia-v1");
}

/** Grupo do menu lateral de uma página (pela rota que o item aponta); `null` = página interna, global, de entrada ou do Lab. */
export function navGroupOf(route: string): NavGroup["id"] | null {
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      const href = resolveHref(item, VIEWER_USERS.CHEFE)
        .replace(/\/(cpoe|secretaria-exemplo|exemplo)(\/|$)/, (_m, _s, tail: string) => (tail ? "/[slug]/" : "/[slug]"))
        .replace("/projects/[slug]/", "/projects/[id]/");
      if (href === route) return g.id;
    }
  }
  return null;
}

export interface Scenario {
  id: string;
  profile: ViewerProfile;
  /** rota do registro */
  route: string;
  /** resultado que o cenário ensina (conferido contra a matriz nos testes) */
  expect: Access;
}

/** Cenários guiados: "como Chefe, conceda uma chancela", "como Visitante, tente editar uma tarefa → acesso negado"… */
export const SCENARIOS: readonly Scenario[] = [
  { id: "chefe-chancela", profile: "CHEFE", route: "/seals/review", expect: "E" },
  { id: "visitante-editar-tarefa", profile: "VISITANTE", route: "/tasks/[id]/edit", expect: "O" },
  { id: "empregado-criar-chancela", profile: "EMPREGADO", route: "/seals", expect: "O" },
  { id: "empregado-tarefa-profissao", profile: "EMPREGADO", route: "/tasks/new", expect: "E" },
  { id: "empresa-dossie", profile: "EMPRESA", route: "/handoffs", expect: "E" },
  { id: "curador-fila", profile: "CURADOR", route: "/curation", expect: "E" },
  { id: "admin-painel", profile: "ADMIN", route: "/admin", expect: "E" },
  { id: "visitante-mural", profile: "VISITANTE", route: "/mural", expect: "V" },
];

/** Resultado do cenário pela matriz (o que a página vai mostrar no perfil escolhido) e o endereço já resolvido. */
export function scenarioOutcome(s: Scenario, pages: readonly PageEntry[] = PAGES): { page: PageEntry | undefined; cell: Access | null; matches: boolean; href: string } {
  const page = pages.find((p) => p.route === s.route);
  const cell = page ? page.access[s.profile] : null;
  return { page, cell, matches: cell === s.expect, href: concreteHref(s.route, VIEWER_USERS[s.profile]) };
}
