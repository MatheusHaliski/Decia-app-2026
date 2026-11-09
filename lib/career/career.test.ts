/**
 * Dado versionado do Guia de Carreira (RF75.CA19): o catálogo de ramos e os pacotes de ocupação passam no validador
 * (`scripts/career/validar-pacotes.mjs`), as listas fechadas dos tipos TS são as mesmas dos JSON Schemas, e os helpers de
 * busca, composição de contexto e plano se comportam como o guia descreve (GUIA_DE_CARREIRA §4.2 d4, §4.6, §7.3).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AUTONOMY_MODES } from "@/lib/ai/autonomy";
import { ACADEMIC_FIELDS, fieldKey, neighborsOf, searchAcademicFields, type AcademicField } from "./academicFields";
import {
  AI_ACTIONS, AI_CAPABILITIES, AI_SERVICES, DRAWINGS_MODES, GENERIC_PACK_CODE, GUIDED_TASK_CODES, LETTERS_TEMPLATES, PACK_CONSENTS,
  PACK_STATUSES, autoChecks, composeAiContext, packForField, plannedTasks, serviceConfig, type OccupationPack,
} from "./occupationPack";

const ROOT = path.resolve(__dirname, "..", "..");
const CAREER = path.join(ROOT, "contracts/career");
const readJson = <T,>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) as T;
const packSchema = readJson<{ $defs: Record<string, { enum?: unknown[]; pattern?: string }> }>("contracts/career/occupation-pack.schema.json");
const packs = fs.readdirSync(path.join(CAREER, "occupation-packs")).filter((f) => f.endsWith(".json"))
  .map((f) => readJson<OccupationPack>(`contracts/career/occupation-packs/${f}`));
const generic = packs.find((p) => p.code === GENERIC_PACK_CODE)!;

describe("contracts/career: catálogo e pacotes válidos", () => {
  it("o validador não acha erro no catálogo nem nos pacotes do repositório", () => {
    const out = execFileSync("node", [path.join(ROOT, "scripts/career/validar-pacotes.mjs"), "--json"], { encoding: "utf8" });
    const report = JSON.parse(out) as { errors: string[]; warnings: string[]; files: number };
    expect(report.errors).toEqual([]);
    expect(report.files).toBeGreaterThanOrEqual(2);
  });

  it("as listas fechadas dos tipos TS são as mesmas do esquema (sem deriva entre dado e código)", () => {
    const en = (k: string) => packSchema.$defs[k].enum;
    expect(en("serviceId")).toEqual([...AI_SERVICES]);
    expect(en("capability")).toEqual([...AI_CAPABILITIES]);
    expect(en("autonomyMode")).toEqual([...AUTONOMY_MODES]);
    expect(en("aiAction")).toEqual([...AI_ACTIONS]);
    expect(en("consent")).toEqual([...PACK_CONSENTS, null]);
    expect(en("drawingsMode")).toEqual([...DRAWINGS_MODES]);
    expect(en("lettersTemplate")).toEqual([...LETTERS_TEMPLATES]);
    expect(packSchema.$defs.taskCode.pattern).toBeDefined();
    const re = new RegExp(packSchema.$defs.taskCode.pattern!, "u");
    for (const c of GUIDED_TASK_CODES) expect(c).toMatch(re);
    expect(PACK_STATUSES).toEqual(["pesquisa", "revisado", "ativo"]);
  });

  it("todo ramo do catálogo é servido por no máximo um pacote e o genérico não serve a nenhum", () => {
    const served = packs.flatMap((p) => p.fields);
    expect(new Set(served).size).toBe(served.length);
    expect(generic.fields).toEqual([]);
    for (const code of served) expect(ACADEMIC_FIELDS.some((f) => f.code === code), code).toBe(true);
  });
});

describe("occupationPack: helpers", () => {
  it("sem profissão, ou com profissão sem pacote, vale o genérico (CA19)", () => {
    expect(packForField(null, packs)?.code).toBe(GENERIC_PACK_CODE);
    expect(packForField("ramo-que-nao-existe", packs)?.code).toBe(GENERIC_PACK_CODE);
    const specific = packs.find((p) => p.fields.length);
    if (specific) expect(packForField(specific.fields[0], packs)?.code).toBe(specific.code);
  });

  it("compõe o prompt como base + pacote, nomeando a profissão e a versão do dado", () => {
    const out = composeAiContext("  Base do Copilot.  ", generic);
    expect(out.startsWith("Base do Copilot.\n\n[Profissão preferida: Genérico (sem profissão definida); pacote generico v")).toBe(true);
    expect(out.endsWith(generic.ai.contextSnippet.trim())).toBe(true);
  });

  it("o plano respeita a prioridade, as exclusões e o aparelho (celular não recebe D3/D8)", () => {
    const withExclusion: OccupationPack = {
      ...generic,
      guidedTasks: { ...generic.guidedTasks, priority: ["D3", "L6", "D8", "L1", "D2"], excluded: [{ code: "D2", reason: "teste" }] },
    };
    expect(plannedTasks(withExclusion, "computador")).toEqual(["D3", "L6", "D8", "L1"]);
    expect(plannedTasks(withExclusion, "celular")).toEqual(["L6", "L1"]);
    expect(plannedTasks(generic, "celular")).toEqual(generic.guidedTasks.priority);
  });

  it("expõe o serviço configurado e só os critérios objetivos automáticos da tarefa", () => {
    expect(serviceConfig(generic, "RESUMO_PROFISSIONAL")?.consent).toBe("RESUMO_PROFISSIONAL_IA");
    expect(serviceConfig(generic, "PRE_CHECAGEM_RUBRICA")?.defaultMode).toBe("SUGESTOES");
    const ids = autoChecks(generic, "L1").map((c) => c.id);
    expect(ids).toContain("tamanho");
    expect(ids).toContain("palavras-chave-do-alvo");
    expect(ids).not.toContain("diagrama-fechado");
    expect(autoChecks({ ...generic, rubric: { ...generic.rubric, objective: [{ id: "humano", check: "x", appliesTo: ["L1"], auto: false }] } }, "L1")).toEqual([]);
  });
});

describe("academicFields: busca do autocompletar", () => {
  const field = (code: string, label: string, aliases: string[]): AcademicField => ({
    code, label: { "pt-BR": label, en: label, es: label }, cine: { broad: "07", broadName: "x", detail: "", detailName: "" }, degrees: ["bacharelado"],
    aliases, cbo: [{ code: "2142", title: "x" }], isco08: [], esco: [], council: null,
    enrollment: { source: "", matriculas: 0, rank: 0, year: 2023, naoConferido: true }, editors: { letters: "alta", drawings: "alta" },
    sensitiveData: [], neighbors: [],
  });
  const fixture = [
    field("engenharia-civil", "Engenharia Civil", ["Engenharia Civil", "Engenheiro civil", "Construção civil"]),
    field("engenharia-eletrica", "Engenharia Elétrica", ["Engenharia Elétrica", "Eletricista"]),
    field("direito", "Direito", ["Direito", "Advogado", "Advogada", "Ciências Jurídicas"]),
    field("ciencias-contabeis", "Ciências Contábeis", ["Contabilidade", "Contador"]),
  ];

  it("ignora caixa e acento e ordena: rótulo igual, rótulo começa, alias igual, alias começa, contém", () => {
    expect(fieldKey("  Ciências   Contábeis ")).toBe("ciencias contabeis");
    expect(searchAcademicFields("ENGENHARIA", fixture).map((f) => f.code)).toEqual(["engenharia-civil", "engenharia-eletrica"]);
    expect(searchAcademicFields("advogada", fixture).map((f) => f.code)).toEqual(["direito"]);
    expect(searchAcademicFields("contabil", fixture).map((f) => f.code)).toEqual(["ciencias-contabeis"]);
    expect(searchAcademicFields("civil", fixture).map((f) => f.code)).toEqual(["engenharia-civil"]);
    expect(searchAcademicFields("e", fixture)).toEqual([]);
    expect(searchAcademicFields("medicina", fixture)).toEqual([]);
  });

  it("limita o tamanho da resposta e resolve vizinhos existentes", () => {
    expect(searchAcademicFields("en", fixture, 1)).toHaveLength(1);
    const withNeighbors = [{ ...fixture[0], neighbors: ["engenharia-eletrica", "inexistente"] }, fixture[1]];
    expect(neighborsOf("engenharia-civil", withNeighbors).map((f) => f.code)).toEqual(["engenharia-eletrica"]);
    expect(neighborsOf("inexistente", withNeighbors)).toEqual([]);
  });

  it("o catálogo real responde às profissões citadas no pedido do produto", () => {
    for (const q of ["Direito", "Engenharia Civil", "Engenharia de Software", "Medicina", "Veterinária", "Educação Física", "História"]) {
      expect(searchAcademicFields(q).length, q).toBeGreaterThan(0);
    }
  });
});
