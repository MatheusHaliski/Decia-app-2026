/**
 * Simulador de Perfis (D-35): a comparação e as explicações saem da MESMA matriz do registro de páginas (fonte única), toda linha
 * da matriz tem uma regra conhecida, e cada cenário guiado ensina exatamente o que a matriz faz.
 */
import { describe, expect, it } from "vitest";
import { requiresSession } from "@/lib/auth/guard";
import { PAGES } from "@/lib/pages/registry";
import { VIEWER_PROFILES, VIEWER_USERS } from "@/lib/viewer/profiles";
import { ACCESS_RULES, SCENARIOS, compareProfiles, concreteHref, explainAccess, navGroupOf, ruleOf, scenarioOutcome, signatureOf } from "./simulator";

const page = (route: string) => PAGES.find((p) => p.route === route)!;

describe("regras e explicações lidas da matriz do registro", () => {
  it("toda linha da matriz tem uma regra conhecida (uma linha nova sem regra faz este teste falhar)", () => {
    for (const p of PAGES) expect(ruleOf(p), `${p.route} ${signatureOf(p.access)}`).not.toBe("MISTA");
    expect(new Set(PAGES.map(ruleOf)).size).toBeLessThanOrEqual(ACCESS_RULES.length);
    expect(ruleOf(page("/admin"))).toBe("ADMIN");
    expect(ruleOf(page("/curation"))).toBe("CURADORIA");
    expect(ruleOf(page("/handoffs"))).toBe("DOSSIES");
    expect(ruleOf(page("/tasks/new"))).toBe("LOGADOS_EDITAM");
    expect(ruleOf(page("/mural"))).toBe("PUBLICA");
  });

  it("explica papel, regra (guard) e decisão de cada célula", () => {
    const visitor = explainAccess(page("/tasks/[id]/edit"), "VISITANTE");
    expect(visitor).toMatchObject({ cell: "O", rule: "LOGADOS_EDITAM", guard: "requireCanCreate · requireOwner" });
    expect(visitor.notes).toContain("VISITANTE");
    expect(visitor.decisions).toContain("D-60");
    const employeeSeals = explainAccess(page("/seals"), "EMPREGADO");
    expect(employeeSeals).toMatchObject({ cell: "O", rule: "CHANCELAS", guard: "requireIssuer" });
    expect(employeeSeals.notes).toContain("NAO_EMISSOR");
    expect(employeeSeals.decisions).toContain("RF28.CA08");
    const curator = explainAccess(page("/curation"), "CURADOR");
    expect(curator).toMatchObject({ cell: "E", rule: "CURADORIA" });
    expect(curator.notes).toContain("CURADOR");
    expect(curator.decisions).toContain("D-09");
    const adminAgents = explainAccess(page("/agents"), "ADMIN");
    expect(adminAgents).toMatchObject({ cell: "V", rule: "AGENTES" });
    expect(adminAgents.notes).toContain("ADMIN_CONSULTA");
    expect(adminAgents.decisions).toContain("D-130");
    expect(explainAccess(page("/tasks/[id]"), "VISITANTE").decisions).toContain("D-93");
    const lab = explainAccess(page("/lab/perfis"), "VISITANTE");
    expect(lab).toMatchObject({ cell: "V", rule: "PUBLICA" });
    expect(lab.notes).toContain("LAB");
    expect(lab.decisions).toContain("D-35");
    // a célula explicada é a do registro, sem cópia
    for (const p of PAGES) for (const prof of VIEWER_PROFILES) expect(explainAccess(p, prof).cell).toBe(p.access[prof]);
  });
});

describe("comparação entre dois perfis", () => {
  it("conta o que só um acessa, o que um edita e o outro só vê, e o que é igual — lendo os mesmos objetos do registro", () => {
    const cmp = compareProfiles("EMPREGADO", "VISITANTE");
    const { onlyA, onlyB, editA, editB, same, total } = cmp.counts;
    expect(total).toBe(PAGES.length);
    expect(onlyA + onlyB + editA + editB).toBe(cmp.diffs.length);
    expect(same + cmp.diffs.length).toBe(total);
    expect(onlyB).toBe(0); // o visitante não vê nada que o empregado não veja
    expect(onlyA).toBe(PAGES.filter((p) => p.access.EMPREGADO !== "O" && p.access.VISITANTE === "O").length);
    expect(cmp.diffs.find((d) => d.page.route === "/models")).toMatchObject({ a: "E", b: "V", kind: "A_EDITA" });
    for (const d of cmp.diffs) expect(PAGES).toContain(d.page);
    const back = compareProfiles("VISITANTE", "EMPREGADO");
    expect(back.counts).toMatchObject({ onlyA: onlyB, onlyB: onlyA, editA: editB, editB: editA });
  });

  it("chefe × empregado: gestão só do chefe; dossiês o chefe edita e o empregado vê; sub-abas que mudam", () => {
    const cmp = compareProfiles("CHEFE", "EMPREGADO");
    const kind = (route: string) => cmp.diffs.find((d) => d.page.route === route)?.kind;
    expect(kind("/seals/review")).toBe("SO_A");
    expect(kind("/seals")).toBe("SO_A");
    expect(kind("/handoffs")).toBe("A_EDITA");
    expect(kind("/tasks/new")).toBeUndefined();
    // Insights › Equipe aparece para o chefe e não para o empregado
    expect(cmp.tabDiffs).toEqual(expect.arrayContaining([expect.objectContaining({ tab: "equipe", visibleFor: "A" })]));
    // perfil: a Empresa perde 5 sub-abas que o Empregado tem
    const company = compareProfiles("EMPREGADO", "EMPRESA");
    expect(company.tabDiffs.filter((d) => d.page.route === "/profile").map((d) => d.tab)).toEqual(["deliberativo", "tarefa-do-dia", "points", "hype", "deliberativo-completo"]);
  });
});

describe("cenários guiados e endereços", () => {
  it("o resultado de cada cenário é o da matriz e o endereço leva à página certa", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(expect.arrayContaining(["chefe-chancela", "visitante-editar-tarefa"]));
    for (const s of SCENARIOS) {
      const out = scenarioOutcome(s);
      expect(out.page, s.id).toBeDefined();
      expect(out.matches, `${s.id}: ${s.profile} em ${s.route} = ${out.cell}`).toBe(true);
      expect(out.href.startsWith("/"), s.id).toBe(true);
      expect(out.href).not.toMatch(/\[|\]/);
      // o que é negado ao visitante também é protegido pelo middleware (mesma matriz)
      if (s.profile === "VISITANTE") expect(requiresSession(out.href), s.id).toBe(s.expect === "O");
    }
    expect(scenarioOutcome(SCENARIOS.find((s) => s.id === "chefe-chancela")!)).toMatchObject({ cell: "E", href: "/seals/review" });
    expect(scenarioOutcome(SCENARIOS.find((s) => s.id === "visitante-editar-tarefa")!)).toMatchObject({ cell: "O", href: "/tasks/t-exemplo/edit" });
  });

  it("rotas dinâmicas viram endereços de exemplo do perfil; grupos do menu vêm da matriz A", () => {
    expect(concreteHref("/departments/[slug]/team", VIEWER_USERS.CHEFE)).toBe("/departments/cpoe/team");
    expect(concreteHref("/companies/[slug]", VIEWER_USERS.EMPRESA)).toBe("/companies/secretaria-exemplo");
    expect(concreteHref("/companies/[slug]/manage/departments", VIEWER_USERS.VISITANTE)).toBe("/companies/secretaria-exemplo/manage/departments");
    expect(concreteHref("/projects/[id]/mirror")).toBe("/projects/decia-v1/mirror");
    expect(concreteHref("/tasks/[id]")).toBe("/tasks/t-exemplo");
    expect(concreteHref("/decia/decisoes/[decisionId]")).toBe("/decia/decisoes/d-arquitetura");
    expect(navGroupOf("/mural")).toBe("descobrir");
    expect(navGroupOf("/seals/review")).toBe("gestao");
    expect(navGroupOf("/departments/[slug]/team")).toBe("gestao");
    expect(navGroupOf("/tasks/[id]")).toBeNull();
  });
});
