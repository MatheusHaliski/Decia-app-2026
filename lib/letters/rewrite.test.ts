import { describe, expect, it } from "vitest";
import { analyzeDocument } from "./analyze";
import { applyChangesToText, buildProposal, diffWords, restrictProposal } from "./rewrite";
import type { LetterBlock } from "./types";

const NOW = new Date("2026-11-13T12:00:00Z");
const blocks: LetterBlock[] = [
  { id: "a", kind: "PARAGRAFO", text: "A equipe começou à partir de março. Os servidores participou." },
  { id: "b", kind: "PARAGRAFO", text: "A nível de sistema, a medida implica em custos." },
];
const findings = analyzeDocument(blocks, { revision: 4, policyVersion: 2, genre: "TECNICO", docType: "LIVRE", language: "pt-BR" }).findings;

describe("IA simulada ✦: só reescreve o que as regras apontaram", () => {
  it("monta a proposta com as correções seguras e deixa de fora as que pedem decisão", () => {
    const p = buildProposal({ findings, blocks, revision: 4, policyVersion: 2, kind: "LOTE", now: NOW });
    expect(p).toMatchObject({ baseRevision: 4, policyVersion: 2, reviewedBy: null, origin: "HEURISTICA", targetIds: ["a", "b"] });
    expect(p.previews.find((x) => x.blockId === "a")!.after).toBe("A equipe começou a partir de março. Os servidores participaram.");
    expect(p.previews.find((x) => x.blockId === "b")!.after).toBe("A nível de sistema, a medida implica custos.");
    expect(p.skipped.map((s) => [s.ruleId, s.reason])).toContainEqual(["A_NIVEL_DE", "SEM_CORRECAO_SEGURA"]);
    // nenhuma palavra nova além das correções
    for (const c of p.changes) expect(findings.find((f) => f.id === c.findingId)!.replacement).toBe(c.after);
  });

  it("alternativa escolhida pela pessoa entra na proposta; id é determinístico", () => {
    const nivel = findings.find((f) => f.ruleId === "A_NIVEL_DE")!;
    const p1 = buildProposal({ findings: [nivel], blocks, revision: 4, policyVersion: 2, kind: "ACHADO", now: NOW, chosen: { [nivel.id]: "Em nível de" } });
    expect(p1.previews[0]!.after).toBe("Em nível de sistema, a medida implica em custos.");
    const p2 = buildProposal({ findings: [nivel], blocks, revision: 4, policyVersion: 2, kind: "ACHADO", now: NOW, chosen: { [nivel.id]: "Em nível de" } });
    expect(p2.id).toBe(p1.id);
  });

  it("trecho que não confere com o texto atual é pulado (nunca insere em outro lugar)", () => {
    const changed = blocks.map((b) => (b.id === "a" ? { ...b, text: "Texto totalmente diferente agora." } : b));
    const p = buildProposal({ findings, blocks: changed, revision: 5, policyVersion: 2, kind: "LOTE", now: NOW });
    expect(p.changes.every((c) => c.blockId === "b")).toBe(true);
    expect(p.skipped.filter((s) => s.reason === "TRECHO_DIFERENTE").length).toBeGreaterThan(0);
  });

  it("restringe o lote aos blocos escolhidos", () => {
    const p = restrictProposal(buildProposal({ findings, blocks, revision: 4, policyVersion: 2, kind: "LOTE", now: NOW }), new Set(["b"]));
    expect(p.targetIds).toEqual(["b"]);
    expect(p.changes.every((c) => c.blockId === "b")).toBe(true);
  });

  it("aplica trocas da direita para a esquerda nas posições originais", () => {
    expect(applyChangesToText("aaa bbb ccc", [{ start: 0, end: 3, after: "x" }, { start: 8, end: 11, after: "yyyy" }])).toBe("x bbb yyyy");
  });

  it("diff por palavras distingue removido e adicionado", () => {
    expect(diffWords("começou à partir de março", "começou a partir de março")).toEqual([
      { type: "igual", text: "começou " },
      { type: "removido", text: "à" },
      { type: "adicionado", text: "a" },
      { type: "igual", text: " partir de março" },
    ]);
    expect(diffWords("igual", "igual")).toEqual([{ type: "igual", text: "igual" }]);
  });
});
