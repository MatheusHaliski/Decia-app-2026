import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/messages/en.json";
import es from "@/lib/i18n/messages/es.json";
import pt from "@/lib/i18n/messages/pt-BR.json";
import { HELP } from "@/lib/nav/help";
import { NAV_GROUPS } from "@/lib/nav/matrix";
import { PAGES, pageByRoute } from "./registry";
import { GENERIC_SOON, PAGE_STATUSES, ROUTE_STATUS, SOON_GUIDE, hasExplicitStatus, isComingSoon, soonGuideOf, statusOfRoute } from "./status";

const catalogs = { "pt-BR": pt as Record<string, string>, en: en as Record<string, string>, es: es as Record<string, string> };
const hasKey = (k: string) => Object.values(catalogs).every((c) => typeof c[k] === "string" && c[k].trim().length > 0);

describe("status por rota (live · demo · preview · skeleton)", () => {
  it("toda rota do registro tem status explícito e válido — rota nova sem classificação faz este teste falhar", () => {
    for (const page of PAGES) {
      expect(hasExplicitStatus(page.route), `${page.route} sem linha em ROUTE_STATUS`).toBe(true);
      expect(PAGE_STATUSES).toContain(page.status);
      expect(page.status).toBe(ROUTE_STATUS[page.route]);
    }
  });

  it("não há linha órfã: toda rota classificada existe no registro", () => {
    for (const route of Object.keys(ROUTE_STATUS)) expect(pageByRoute(route), route).toBeDefined();
  });

  it("classificação pelo código: 9 esqueletos, 2 prévias, Hoje e Acervo reais, Mural e Mesa em demonstração", () => {
    const by = (s: string) => PAGES.filter((p) => p.status === s).map((p) => p.route).sort();
    expect(by("skeleton")).toEqual(["/companies", "/companies/[slug]/manage/departments", "/curation", "/departments/[slug]/team", "/highlights", "/insights", "/issuer/dashboard", "/plans", "/recognitions"]);
    expect(by("preview")).toEqual(["/agents", "/find"]);
    expect(pageByRoute("/today")!.status).toBe("live");
    expect(pageByRoute("/tasks")!.status).toBe("live");
    expect(pageByRoute("/mural")!.status).toBe("demo");
    expect(pageByRoute("/desk")!.status).toBe("demo");
  });

  it("rota desconhecida vale `live` em tempo de execução (nunca esconde conteúdo por engano)", () => {
    expect(statusOfRoute("/rota-nova")).toBe("live");
    expect(isComingSoon("skeleton")).toBe(true);
    expect(isComingSoon("preview")).toBe(true);
    expect(isComingSoon("demo")).toBe(false);
    expect(isComingSoon("live")).toBe(false);
  });

  it("toda rota 'Em breve' tem vazio orientado próprio, com textos nos três idiomas", () => {
    for (const page of PAGES.filter((p) => isComingSoon(p.status))) {
      expect(SOON_GUIDE[page.route], page.route).toBeDefined();
    }
    for (const g of [...Object.values(SOON_GUIDE), GENERIC_SOON]) {
      for (const part of ["what", "meanwhile", "cta"]) expect(hasKey(`guide.soon.${g.id}.${part}`), `guide.soon.${g.id}.${part}`).toBe(true);
    }
    expect(soonGuideOf("/sem-guia")).toBe(GENERIC_SOON);
  });

  it("Hoje está registrada (logado, oculta ao visitante) e no menu Meu trabalho", () => {
    const today = pageByRoute("/today")!;
    expect(today.access.VISITANTE).toBe("O");
    expect(today.access.EMPREGADO).toBe("E");
    expect(NAV_GROUPS.find((g) => g.id === "meu-trabalho")!.items[0]!.href).toBe("/today");
  });

  it("ajuda '?': as rotas principais têm texto e próximo passo nos três idiomas", () => {
    for (const r of ["/tasks", "/tasks/new", "/decia", "/desk", "/profile", "/settings", "/mural", "/models"]) expect(HELP[r], r).toBeDefined();
    for (const [route, h] of Object.entries(HELP)) {
      expect(pageByRoute(route), route).toBeDefined();
      expect(hasKey(`guide.help.${h.id}.text`), h.id).toBe(true);
      expect(hasKey(`guide.help.${h.id}.next`), h.id).toBe(true);
      expect(h.next.startsWith("/")).toBe(true);
    }
  });
});

describe("textos de usuário sem jargão interno", () => {
  const JARGON = /\bRF\d|\bD-\d|\.md\b|etapa \(b\)|\b403\b|ACESSO_NEGADO|ABAS_POR_PERFIL|matriz/i;
  it("forbidden, access.hint, vazios das sub-abas e chaves guide.* não citam RF, decisões, arquivos nem códigos", () => {
    const keys = ["forbidden.title", "forbidden.description", "access.hint", "rf.emptyTitle", "rf.emptyTitleNoTab", "rf.emptyDescription", "common.proposalHint", "create.sealHint", "topbar.dpTooltip"];
    for (const [loc, cat] of Object.entries(catalogs)) {
      for (const k of [...keys, ...Object.keys(cat).filter((x) => x.startsWith("guide."))]) expect(cat[k], `${loc} ${k}`).not.toMatch(JARGON);
    }
  });

  it("menu em pt-BR: Autopiloto, Cartas, Desenhos, Painel de insights", () => {
    expect([pt["nav.autopilot"], pt["nav.letters"], pt["nav.drawings"], pt["nav.insights"]]).toEqual(["Autopiloto", "Cartas", "Desenhos", "Painel de insights"]);
    expect([es["nav.autopilot"], es["nav.letters"], es["nav.drawings"]]).toEqual(["Autopiloto", "Cartas", "Dibujos"]);
  });
});
