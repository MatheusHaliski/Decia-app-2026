import { describe, expect, it } from "vitest";
import { PAGES, PROFILE_TABS, COMPANY_TABS, DEPARTMENT_TABS } from "@/lib/pages/registry";
import { VIEWER_PROFILES, VIEWER_USERS } from "@/lib/viewer/profiles";
import { DECIA_SESSION_TABS, DECIA_TABS, NAV_GROUPS, bottomNav, createOptions, isActivePath, resolveHref, visibleGroups, visibleTabs, INSIGHTS_TABS } from "./matrix";

/** A Matriz A (ABAS_POR_PERFIL.md §2) codificada em lib/nav/matrix.ts — células conferidas contra o documento. */
describe("Matriz A — sidebar por perfil", () => {
  it("cinco grupos na ordem Descobrir · Meu trabalho · Criar · Jogar e ganhar · Gestão", () => {
    expect(NAV_GROUPS.map((g) => g.id)).toEqual(["descobrir", "meu-trabalho", "criar", "jogar-e-ganhar", "gestao"]);
  });

  it("visitante vê só Descobrir; EMPREGADO não vê Gestão; EMPRESA/CHEFE/CURADOR/ADMIN veem o seu recorte de Gestão", () => {
    expect(visibleGroups("VISITANTE").map((g) => g.id)).toEqual(["descobrir"]);
    expect(visibleGroups("VISITANTE")[0]!.items.map((i) => i.id)).not.toContain("messages");
    const emp = visibleGroups("EMPREGADO");
    expect(emp.map((g) => g.id)).toEqual(["descobrir", "meu-trabalho", "criar", "jogar-e-ganhar", "gestao"]);
    expect(emp.find((g) => g.id === "gestao")!.items.map((i) => i.id)).toEqual(["handoffs"]); // Dossiês: V para EMPREGADO (os seus)
    const ids = (p: Parameters<typeof visibleGroups>[0]) => visibleGroups(p).find((g) => g.id === "gestao")!.items.map((i) => i.id);
    expect(ids("EMPRESA")).toEqual(["issuer-dashboard", "manage-departments", "team", "seals-review", "decia-review", "seals", "handoffs"]);
    expect(ids("CHEFE")).toEqual(["issuer-dashboard", "team", "seals-review", "decia-review", "seals", "handoffs"]);
    expect(ids("CURADOR")).toEqual(["team", "seals-review", "curation"]);
    expect(ids("ADMIN")).toContain("admin");
    expect(ids("ADMIN")).not.toContain("curation");
  });

  it("células pontuais: Balcão E/E/E/V/V, Metas V/E/E/V/V, Admin só ADMIN, Curadoria só CURADOR", () => {
    const item = (id: string) => NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === id)!;
    expect(VIEWER_PROFILES.map((p) => item("models").access[p])).toEqual(["E", "E", "E", "V", "V", "V"]);
    expect(VIEWER_PROFILES.map((p) => item("goals").access[p])).toEqual(["V", "E", "E", "V", "V", "O"]);
    expect(VIEWER_PROFILES.map((p) => item("admin").access[p])).toEqual(["O", "O", "O", "O", "E", "O"]);
    expect(VIEWER_PROFILES.map((p) => item("curation").access[p])).toEqual(["O", "O", "O", "E", "O", "O"]);
  });

  it("rotas dinâmicas resolvem com a empresa/departamento do perfil; estado ativo por prefixo", () => {
    const team = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === "team")!;
    expect(resolveHref(team, VIEWER_USERS.CHEFE)).toBe("/departments/cpoe/team");
    expect(resolveHref(team, VIEWER_USERS.EMPRESA)).toBe("/departments/secid-uts/team");
    expect(isActivePath("/companies/x/manage/departments", "/companies", ["/companies", "/departments"])).toBe(true);
    expect(isActivePath("/u/pessoa", "/profile", ["/profile", "/u/"])).toBe(true);
    expect(isActivePath("/mural", "/mural")).toBe(true);
    expect(isActivePath("/muralx", "/mural")).toBe(false);
  });

  it("DECIA: Precisa de atenção (padrão) · Decisões · Sessões · Revisões; as abas da sessão ficam em Sessões; + Criar abre ?acao=nova", () => {
    expect(DECIA_TABS.map((t) => t.slug)).toEqual(["atencao", "decisoes", "sessoes", "revisoes"]);
    expect(DECIA_SESSION_TABS.map((t) => t.slug)).toEqual(["abertas", "minhas", "encerradas"]);
    expect(createOptions("EMPREGADO").find((o) => o.id === "decia")).toMatchObject({ href: "/decia?acao=nova", rf: "RF29" });
    const ws = PAGES.find((p) => p.route === "/decia/decisoes/[decisionId]")!;
    expect(ws.rfs).toEqual(["RF29"]);
    expect(ws.access.VISITANTE).toBe("O");
    expect(ws.access.EMPREGADO).toBe("E");
  });

  it("sub-abas: Insights › Equipe oculta para EMPREGADO/CURADOR; Perfil oculta para EMPRESA", () => {
    expect(visibleTabs(INSIGHTS_TABS, "EMPREGADO").map((t) => t.slug)).toEqual(["acervo", "perfil", "ranking", "sugeridos"]);
    expect(visibleTabs(INSIGHTS_TABS, "EMPRESA").map((t) => t.slug)).toEqual(["acervo", "equipe", "ranking", "sugeridos"]);
    expect(visibleTabs(INSIGHTS_TABS, "CHEFE")).toHaveLength(5);
  });

  it("§2.6 barra inferior e folha + Criar por perfil", () => {
    expect(bottomNav(VIEWER_USERS.EMPREGADO).map((d) => (d === "create" ? "+" : d.id))).toEqual(["mural", "search", "+", "tasks", "profile"]);
    expect(bottomNav(VIEWER_USERS.EMPRESA).at(-1)).toMatchObject({ id: "company", href: "/companies/secretaria-exemplo" });
    expect(bottomNav(VIEWER_USERS.VISITANTE).map((d) => (d === "create" ? "+" : d.id))).toEqual(["mural", "search", "memory", "companies"]);
    expect(createOptions("EMPREGADO").map((o) => o.id)).toEqual(["task", "project", "plan", "decia"]);
    expect(createOptions("CHEFE").map((o) => o.id)).toContain("seal");
    expect(createOptions("EMPRESA").at(-1)!.rf).toBe("RF39");
  });
});

describe("Matrizes B/C/D e registro de páginas", () => {
  it("perfil: 15 sub-abas, 1–5 públicas, EMPRESA perde 5/9/13/14/15 e renomeia 6/11/12", () => {
    expect(PROFILE_TABS).toHaveLength(15);
    expect(PROFILE_TABS.filter((t) => t.thirdParty).map((t) => t.n)).toEqual([1, 2, 3, 4, 5]);
    expect(PROFILE_TABS.filter((t) => t.hiddenFor?.includes("EMPRESA")).map((t) => t.n)).toEqual([5, 9, 13, 14, 15]);
    expect(PROFILE_TABS.filter((t) => t.companyLabelKey).map((t) => t.n)).toEqual([2, 6, 11, 12]);
  });

  it("empresa: 10 sub-abas (Comunicados e Gestão como proposta; Gestão só da dona); departamento: 9", () => {
    expect(COMPANY_TABS).toHaveLength(10);
    expect(visibleTabs(COMPANY_TABS, "EMPREGADO").map((t) => t.slug)).not.toContain("gestao");
    expect(visibleTabs(COMPANY_TABS, "EMPRESA").map((t) => t.slug)).toContain("gestao");
    expect(DEPARTMENT_TABS).toHaveLength(9);
    expect(visibleTabs(DEPARTMENT_TABS, "EMPREGADO").map((t) => t.slug)).not.toContain("minha-equipe");
  });

  it("todas as rotas da ARQUITETURA §4 e da Matriz A estão registradas, sem duplicatas", () => {
    const routes = PAGES.map((p) => p.route);
    expect(new Set(routes).size).toBe(routes.length);
    for (const r of ["/mural", "/search", "/memory", "/companies", "/models", "/profile", "/u/[username]", "/tasks", "/attachments", "/desk", "/projects/[id]/edit", "/projects/[id]/simulate", "/projects/[id]/mirror", "/tasks/new", "/projects/new", "/plans", "/autopilot", "/decia", "/decia/decisoes/[decisionId]", "/decia/[sessionId]", "/insights", "/goals", "/points", "/store", "/highlights", "/recognitions", "/benefits", "/admin", "/lab/design-system", "/settings", "/notifications", "/messages", "/login", "/register", "/password-reset", "/verify-email", "/issuer/dashboard", "/companies/[slug]/manage/departments", "/departments/[slug]/team", "/seals", "/seals/review", "/decia/review", "/handoffs", "/curation"]) {
      expect(routes, r).toContain(r);
    }
    for (const item of NAV_GROUPS.flatMap((g) => g.items)) {
      const href = resolveHref(item, VIEWER_USERS.CHEFE).replace(/\/(cpoe|secretaria-exemplo|exemplo)(\/|$)/, (_m, _s, tail) => (tail ? "/[slug]/" : "/[slug]"));
      const pattern = href.replace("/projects/[slug]/", "/projects/[id]/");
      expect(routes.some((r) => r === pattern || r === href), `${item.id} → ${href}`).toBe(true);
    }
  });
});
