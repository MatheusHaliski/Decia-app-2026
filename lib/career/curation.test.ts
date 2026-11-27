/**
 * Curadoria dos pacotes (auditoria de 27/11/2026): D-156 nos 80 pacotes (dado, validador e carregador), trilha Carreira fora dos
 * modelos de trabalho, tipos de tarefa coerentes (infográfico/fluxo não são DESENHO_TECNICO), Ciências Contábeis com modelos da área,
 * e o script reprodutível em dia com o dado.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AUTONOMY_MODES, PACK_AUTONOMY_CEILING } from "@/lib/ai/autonomy";
import { AREA_TEMPLATES } from "@/lib/tasks/areaTemplates";
import { packTemplates } from "@/lib/tasks/templates";
import { FIELD_INDEX } from "@/lib/tasks/fieldIndex.gen";
import { CAREER_TITLE, curarTexto, drawingTypeOf, trackOf } from "../../scripts/career/curar-pacotes.mjs";
import { areaTemplatesForField, careerTemplates, isProcurementTemplate, servicePolicy, withAutonomyCeiling } from "./curation";
import type { OccupationPack } from "./occupationPack";
import { packFor } from "./packs";
import { developmentPlan } from "./plan";

const ROOT = path.resolve(__dirname, "..", "..");
const DIR = path.join(ROOT, "contracts/career/occupation-packs");
const FILES = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const raw = (f: string) => fs.readFileSync(path.join(DIR, f), "utf8");
const PACKS: OccupationPack[] = FILES.map((f) => JSON.parse(raw(f)) as OccupationPack);
const pack = (code: string) => PACKS.find((p) => p.code === code)!;
const areaOf = (p: OccupationPack) => FIELD_INDEX.find((f) => f.code === p.fields[0])?.area ?? "OUTRA";
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const rank = (m: string) => AUTONOMY_MODES.indexOf(m as (typeof AUTONOMY_MODES)[number]);

describe("D-156: nenhum pacote acima de SOB_SOLICITACAO", () => {
  it("os 80 pacotes têm defaultAutonomy ≤ SOB_SOLICITACAO e nenhum serviço nasce AGENTE", () => {
    expect(PACKS).toHaveLength(80);
    for (const p of PACKS) {
      expect(rank(p.system.defaultAutonomy), p.code).toBeLessThanOrEqual(rank(PACK_AUTONOMY_CEILING));
      expect(p.ai.services.some((s) => s.defaultMode === "AGENTE"), p.code).toBe(false);
    }
  });

  it("o validador recusa pacote com padrão acima do teto ou serviço AGENTE", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pacote-"));
    const bad = JSON.parse(raw("direito.json"));
    bad.system.defaultAutonomy = "SUGESTOES";
    bad.ai.services[0].defaultMode = "AGENTE";
    const file = path.join(tmp, "direito.json");
    fs.writeFileSync(file, JSON.stringify(bad));
    let out = "";
    try {
      execFileSync("node", [path.join(ROOT, "scripts/career/validar-pacotes.mjs"), "--pacote", file, "--json"], { encoding: "utf8" });
    } catch (e) {
      out = String((e as { stdout?: string }).stdout ?? "");
    }
    const report = JSON.parse(out) as { errors: string[] };
    expect(report.errors.some((e) => e.includes("defaultAutonomy") && e.includes("D-156"))).toBe(true);
    expect(report.errors.some((e) => e.includes("services[0].defaultMode") && e.includes("AGENTE"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("o carregador rebaixa dado adulterado e a política de um serviço é a mais restritiva", async () => {
    const law = pack("direito");
    const forged = { ...law, system: { ...law.system, defaultAutonomy: "AGENTE" as const } };
    expect(withAutonomyCeiling(forged).system.defaultAutonomy).toBe("SOB_SOLICITACAO");
    expect(withAutonomyCeiling(law)).toBe(law);
    const loaded = await packFor("direito", "pesquisa", { direito: async () => forged });
    expect(loaded!.pack.system.defaultAutonomy).toBe("SOB_SOLICITACAO");
    // serviço SUGESTOES no pacote, pessoa em AGENTE: fica no teto
    const sug = law.ai.services.find((s) => s.defaultMode === "SUGESTOES" && !s.consent)!;
    expect(servicePolicy(law, sug.service, "AGENTE", true).mode).toBe("SOB_SOLICITACAO");
    expect(servicePolicy(law, sug.service, "MANUAL", true).mode).toBe("MANUAL");
    // serviço com consentimento: sem consentimento, MANUAL
    const withConsent = law.ai.services.find((s) => s.consent)!;
    expect(servicePolicy(law, withConsent.service, "SOB_SOLICITACAO", false).mode).toBe("MANUAL");
    expect(servicePolicy(law, withConsent.service, "SOB_SOLICITACAO", true).mode).toBe("SOB_SOLICITACAO");
    expect(servicePolicy(null, "RESUMO_PROFISSIONAL", "ASSISTIDO", true).mode).toBe("SOB_SOLICITACAO");
  });
});

describe("trilha Carreira fora dos modelos de trabalho", () => {
  it("nenhum modelo de trabalho é currículo, perfil profissional ou 30-60-90; todos estão na trilha Carreira", () => {
    let careerCount = 0;
    for (const p of PACKS) {
      const area = areaOf(p);
      const work = packTemplates(p, area);
      const career = careerTemplates(p, area);
      for (const t of work) expect(CAREER_TITLE.test(norm(t.title)), `${p.code}: ${t.title}`).toBe(false);
      for (const t of work) expect(["L1", "L6"]).not.toContain(t.tags?.[0]);
      for (const t of career) expect(t.track).toBe("carreira");
      expect(work.length + career.length).toBe(packTemplates(p, area, "TODAS").length);
      if (p.guidedTasks.parameters.L1) expect(career.some((t) => t.tags?.[0] === "L1"), p.code).toBe(true);
      careerCount += career.length;
    }
    expect(careerCount).toBeGreaterThan(20);
  });

  it("o plano de desenvolvimento leva as duas trilhas, marcadas", () => {
    const p = pack("ciencias-contabeis");
    const plan = developmentPlan(p, "ciencias-contabeis", "ADMINISTRACAO");
    expect(plan.items.some((i) => i.track === "carreira" && i.code === "L9")).toBe(true);
    expect(plan.items.some((i) => i.track === "trabalho")).toBe(true);
    // editor pela tarefa, não pelo tipo: o infográfico (IMAGEM_EDITADA) continua no Drawings
    expect(plan.items.find((i) => i.code === "D7")).toMatchObject({ editor: "drawings" });
    expect(plan.items.find((i) => i.code === "X2")).toMatchObject({ editor: "letters" });
  });
});

describe("tipos de tarefa coerentes", () => {
  it("infográfico, fluxo, wireframe e portfólio não são DESENHO_TECNICO; texto é DOCUMENTO salvo planilha/cronograma", () => {
    for (const p of PACKS) {
      for (const t of packTemplates(p, areaOf(p), "TODAS")) {
        const title = norm(t.title);
        const at = `${p.code}: ${t.title} (${t.type})`;
        if (/infografico/.test(title)) expect(t.type, at).toBe("IMAGEM_EDITADA");
        if (/^(fluxo|fluxograma)\b|bpmn|wireframe/.test(title) && !/planta|fluxo de caixa/.test(title)) expect(t.type, at).toBe("DIAGRAMA");
        if (/prancha de portfolio/.test(title)) expect(t.type, at).toBe("APRESENTACAO");
        if (/^(planta|detalhe|vista explodida|modelo 3d)/.test(title)) expect(t.type, at).toBe("DESENHO_TECNICO");
        if ((t.tags?.[0] ?? "").startsWith("L")) expect(t.type, at).toBe("DOCUMENTO");
      }
    }
  });

  it("regras do script em exemplos", () => {
    expect(drawingTypeOf("Infográfico de indicadores")).toBe("IMAGEM_EDITADA");
    expect(drawingTypeOf("Fluxo de atendimento")).toBe("DIAGRAMA");
    expect(drawingTypeOf("Planta simples de cozinha com fluxo linear")).toBe("DESENHO_TECNICO");
    expect(drawingTypeOf("Diagrama unifilar com quadro de cargas")).toBe("DESENHO_TECNICO");
    expect(drawingTypeOf("Mapa temático em prancha")).toBe("MAPA");
    expect(drawingTypeOf("Painel de indicadores de um processo")).toBe("PAINEL_DADOS");
    expect(trackOf("L9", "Plano 30-60-90 para o cargo-alvo")).toBe("carreira");
    expect(trackOf("L9", "Plano de evento")).toBe("trabalho");
    expect(trackOf("L1", "Qualquer título")).toBe("carreira");
  });
});

describe("Ciências Contábeis: modelos da área, não ETP/termo de referência genérico", () => {
  it("os modelos do campo são rotinas contábeis e os de contratação pública saem da área", () => {
    const p = pack("ciencias-contabeis");
    const work = packTemplates(p, "ADMINISTRACAO");
    const titles = work.map((t) => t.title).join(" | ");
    expect(titles).toMatch(/Conciliação bancária/);
    expect(titles).toMatch(/Balanço patrimonial e DRE/);
    expect(titles).toMatch(/obrigações acessórias/);
    expect(work.find((t) => /Conciliação/.test(t.title))!.type).toBe("PLANILHA");
    expect(work.find((t) => /obrigações acessórias/.test(t.title))!.type).toBe("CRONOGRAMA");
    expect(work.some((t) => /\bETP\b|termo de referência/i.test(t.title))).toBe(false);
    const admin = AREA_TEMPLATES.filter((t) => t.area === "ADMINISTRACAO");
    expect(admin.some(isProcurementTemplate)).toBe(true);
    const shown = areaTemplatesForField(admin, "ciencias-contabeis");
    expect(shown.some((t) => /estudo técnico preliminar|termo de referência/i.test(t.title))).toBe(false);
    expect(shown.length).toBeGreaterThan(0);
    // quem lida com contratação pública continua vendo; sem campo, tudo
    expect(areaTemplatesForField(admin, "gestao-publica")).toHaveLength(admin.length);
    expect(areaTemplatesForField(admin, null)).toHaveLength(admin.length);
  });
});

describe("script reprodutível (scripts/career/curar-pacotes.mjs)", () => {
  it("o dado está curado: rodar o script não muda nenhum pacote", () => {
    for (const f of FILES) expect(curarTexto(raw(f)).changes, f).toEqual([]);
  });

  it("cura um pacote antigo: teto, trilha e tipo, sem reformatar o resto", () => {
    const old = raw("direito.json")
      .replace(/"defaultAutonomy": "SOB_SOLICITACAO"/, "\"defaultAutonomy\": \"ASSISTIDO\"")
      .replace(/,\n\s*"track": "carreira"/g, "")
      .replace(/,\n\s*"taskType": "[A-Z_]+"/g, "");
    const { text, changes } = curarTexto(old);
    expect(changes).toContain("system.defaultAutonomy ASSISTIDO → SOB_SOLICITACAO");
    expect(changes.some((c: string) => c.startsWith("L1 track"))).toBe(true);
    expect(text).toBe(raw("direito.json"));
  });
});
