import { describe, expect, it } from "vitest";
import { importIntoPiece, pieceFromImport } from "./apply";
import { enabledExports, enabledImports, LETTERS_FORMATS } from "./formats";
import { importFile } from "./import";
import { fold, outline, searchBlocks, stepMatch } from "./navigate";
import { samplePiece } from "./testkit";
import { undo } from "../pieces";

const NOW = new Date("2026-11-13T12:00:00Z");

describe("sumário e busca — RF52.CA03", () => {
  it("sumário vem dos títulos não vazios, na ordem, com nível", () => {
    const o = outline(samplePiece().blocks);
    expect(o.map((e) => [e.level, e.text])).toEqual([[1, "Relatório técnico"], [2, "1 Introdução"], [3, "1.1 Escopo & limites"], [2, "Referências"]]);
  });
  it("busca ignora maiúsculas e acentos e devolve posições no texto original", () => {
    const blocks = [{ id: "a", kind: "PARAGRAFO" as const, text: "A AÇÃO e a acao; ação." }];
    const m = searchBlocks(blocks, "Acao");
    expect(m).toHaveLength(3);
    expect(m.map((x) => blocks[0]!.text.slice(x.start, x.end))).toEqual(["AÇÃO", "acao", "ação"]);
    expect(searchBlocks(blocks, "  ")).toEqual([]);
  });
  it("posições certas com caracteres decompostos (NFD) e fora do BMP", () => {
    const text = "x 😀 café café";
    const m = searchBlocks([{ id: "a", kind: "PARAGRAFO", text }], "café");
    expect(m.map((x) => text.slice(x.start, x.end))).toEqual(["café", "café"]);
    expect(fold("É").folded).toBe("e");
  });
  it("próximo/anterior é circular", () => {
    expect(stepMatch(0, 3, 1)).toBe(1);
    expect(stepMatch(2, 3, 1)).toBe(0);
    expect(stepMatch(0, 3, -1)).toBe(2);
    expect(stepMatch(-1, 0, 1)).toBe(-1);
  });
});

describe("aplicar importação só depois do aceite — RF52.CA04", () => {
  it("substituir grava revisão nova (IMPORT) e desfazer volta ao conteúdo anterior", async () => {
    const piece = samplePiece(NOW);
    const r = await importFile({ name: "novo.md", bytes: new TextEncoder().encode("# Novo\n\nCorpo novo.") });
    if (!r.ok) throw new Error(r.reason);
    const next = importIntoPiece(piece, r.doc, "SUBSTITUIR", NOW);
    expect(next.revision).toBe(piece.revision + 1);
    expect(next.blocks.map((b) => b.text)).toEqual(["Novo", "Corpo novo."]);
    expect(new Set(next.blocks.map((b) => b.id)).size).toBe(2);
    expect(next.blocks.every((b) => !piece.blocks.some((o) => o.id === b.id))).toBe(true);
    expect(next.history.at(-1)).toMatchObject({ origin: "IMPORT", summary: "io.replaced", vars: { format: "MD", file: "novo.md", count: 2 } });
    const back = undo(next, NOW);
    expect(back.ok && back.piece.blocks).toEqual(piece.blocks);
  });
  it("acrescentar mantém os blocos atuais e põe os novos no fim", async () => {
    const piece = samplePiece(NOW);
    const r = await importFile({ name: "extra.txt", bytes: new TextEncoder().encode("Mais um parágrafo.") });
    if (!r.ok) throw new Error(r.reason);
    const next = importIntoPiece(piece, r.doc, "ACRESCENTAR", NOW);
    expect(next.blocks.slice(0, piece.blocks.length)).toEqual(piece.blocks);
    expect(next.blocks.at(-1)).toMatchObject({ kind: "PARAGRAFO", text: "Mais um parágrafo.", id: `b${piece.nextBlockSeq}` });
    expect(next.nextBlockSeq).toBe(piece.nextBlockSeq + 1);
  });
  it("peça nova a partir do arquivo usa título e tipo dos metadados (ou o nome do arquivo)", async () => {
    const r = await importFile({ name: "meu_rascunho-final.txt", bytes: new TextEncoder().encode("Só texto.") });
    if (!r.ok) throw new Error(r.reason);
    const p = pieceFromImport(r.doc, { id: "n1", ownerId: "u", mode: "SOB_SOLICITACAO", now: NOW });
    expect(p).toMatchObject({ id: "n1", title: "meu rascunho final", docType: "LIVRE", revision: 1 });
    expect(p.history[0]).toMatchObject({ origin: "IMPORT", summary: "io.imported", vars: { format: "TXT" } });
  });
});

describe("matriz de formatos — RF52.CA05", () => {
  it("só formatos habilitados aparecem; cada um aponta o teste de ida e volta", () => {
    expect(enabledImports()).toEqual(["md", "txt", "html", "docx"]);
    expect(enabledExports()).toEqual(["md", "txt", "html", "docx"]);
    for (const f of LETTERS_FORMATS.filter((x) => x.write === "HABILITADO")) expect(f.roundTripTest).toBeTruthy();
    expect(LETTERS_FORMATS.find((f) => f.id === "pdf")).toMatchObject({ read: "PENDENTE", write: "VIA_IMPRESSAO" });
  });
});
