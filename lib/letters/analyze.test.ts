import { describe, expect, it } from "vitest";
import { analyzeDocument, visibleFindings } from "./analyze";
import { buildDemoPieces, DEMO_REPORT_BLOCKS } from "./fixtures";
import { HEAT_RUBRIC_VERSION, heatLevel, scoreBlocks } from "./score";
import type { LetterBlock } from "./types";

const NOW = new Date("2026-11-13T12:00:00Z");
const report = () => buildDemoPieces(NOW)[0]!;
const analyze = (blocks: readonly LetterBlock[], extra: Partial<Parameters<typeof analyzeDocument>[1]> = {}) =>
  analyzeDocument(blocks, { revision: 3, policyVersion: 2, genre: "TECNICO", docType: "RELATORIO_TECNICO", language: "pt-BR", ...extra });

describe("análise do documento (relatório técnico DEMO)", () => {
  it("aponta os erros plantados no relatório, cada um no seu bloco e trecho", () => {
    const p = report();
    const r = analyze(p.blocks);
    const rules = new Set(r.findings.map((f) => f.ruleId));
    for (const id of ["CRASE_VERBO", "REGENCIA_OBEDECER", "CONCORDANCIA_NOMINAL", "VOZ_PASSIVA", "VERBO_IMPESSOAL", "ONDE_TEMPO", "CONCORDANCIA_VERBAL", "A_NIVEL_DE", "REGENCIA_IMPLICAR", "CITACAO_ANO_DIVERGENTE", "CITACAO_SEM_REFERENCIA", "FRASE_LONGA", "REGENCIA_ASSISTIR", "REGENCIA_PREFERIR", "PLEONASMO", "CITACAO_NUMERICA_INEXISTENTE", "SISTEMA_CHAMADA_MISTO", "REFERENCIA_CAIXA_AUTOR", "REFERENCIA_NAO_CITADA", "REFERENCIA_URL_SEM_ACESSO"]) {
      expect(rules.has(id), id).toBe(true);
    }
    for (const f of r.findings) {
      if (!f.blockId) continue;
      const block = p.blocks.find((b) => b.id === f.blockId)!;
      expect(block.text.slice(f.start, f.end)).toBe(f.excerpt);
    }
    expect(r).toMatchObject({ revision: 3, policyVersion: 2, supported: true });
    expect(r.summary.missingSections).toEqual([]);
    expect(r.summary.safeFixes).toBeGreaterThanOrEqual(10);
  });

  it("chaves estáveis: editar outro bloco não muda a chave do achado (ignorar com motivo sobrevive)", () => {
    const p = report();
    const before = analyze(p.blocks).findings.find((f) => f.ruleId === "CRASE_VERBO")!;
    const edited = p.blocks.map((b) => (b.id === "b5" ? { ...b, text: `${b.text} Texto novo.` } : b));
    const after = analyze(edited).findings.find((f) => f.ruleId === "CRASE_VERBO")!;
    expect(after.key).toBe(before.key);
    expect(visibleFindings(analyze(edited).findings, new Set([before.key])).some((f) => f.key === before.key)).toBe(false);
  });

  it("outro idioma: informa indisponibilidade e não aplica regra portuguesa (RF53.CA05)", () => {
    const r = analyze(DEMO_REPORT_BLOCKS.map((b, i) => ({ ...b, id: `b${i}` })), { language: "en" });
    expect(r.supported).toBe(false);
    expect(r.findings).toEqual([]);
    expect(r.coverage.skippedBlockIds).toHaveLength(DEMO_REPORT_BLOCKS.length);
  });

  it("cobertura: blocos além do limite de palavras ficam fora e o relatório diz quais (RF54.CA07)", () => {
    const blocks: LetterBlock[] = [
      { id: "a", kind: "PARAGRAFO", text: "Os servidores participou da reunião." },
      { id: "b", kind: "PARAGRAFO", text: "Os documento foram enviados ontem." },
    ];
    const r = analyze(blocks, { docType: "LIVRE", wordLimit: 6 });
    expect(r.coverage).toMatchObject({ analyzedBlockIds: ["a"], skippedBlockIds: ["b"], truncated: true });
    expect(r.findings.every((f) => f.blockId !== "b")).toBe(true);
  });

  it("morfossintaxe no resumo: classes contadas e ambíguos à parte", () => {
    const r = analyze([{ id: "a", kind: "PARAGRAFO", text: "Eu como pouco." }], { docType: "LIVRE" });
    expect(r.summary.ambiguousTokens).toBe(1);
    expect(r.summary.posCounts.PRONOME).toBe(1);
    expect(r.blocks[0]!.tokens.find((t) => t.text === "como")!.ambiguous).toBe(true);
  });
});

describe("placar por bloco (mapa de calor)", () => {
  it("é contagem ponderada por 100 palavras, com rubrica e níveis declarados (não nota calibrada)", () => {
    expect(HEAT_RUBRIC_VERSION).toMatch(/^letters-calor-/);
    expect(heatLevel(0, 100)).toBe(0);
    expect(heatLevel(3, 100)).toBe(1);
    expect(heatLevel(6, 100)).toBe(2);
    expect(heatLevel(12, 100)).toBe(3);
    expect(heatLevel(30, 100)).toBe(4);
    // bloco curto conta como 25 palavras
    expect(heatLevel(1, 5)).toBe(2);
  });

  it("separa as dimensões gramática, estilo, coerência e citações", () => {
    const r = analyze(report().blocks);
    const results = r.scores.find((s) => s.blockId === "b9")!;
    expect(results.dims.GRAMATICA.count).toBeGreaterThan(0);
    expect(results.dims.CITACOES.count).toBeGreaterThan(0);
    expect(results.level).toBeGreaterThan(0);
    expect(results.bySeverity.ERRO + results.bySeverity.AVISO + results.bySeverity.SUGESTAO).toBe(results.findings);
    const clean = scoreBlocks([{ blockId: "x", words: 40 }], []);
    expect(clean[0]).toMatchObject({ level: 0, findings: 0, density: 0 });
  });
});
