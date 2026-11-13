import { describe, expect, it } from "vitest";
import { buildDemoPieces, LETTERS_DEMO_USER } from "./fixtures";
import {
  COALESCE_MS, applyChanges, canUndo, changePieceMode, createPiece, editBlockText, ignoreFinding, insertBlock, insertSection, moveBlock,
  paragraphNumbers, removeBlock, rename, reopenFinding, restoreVersion, setBlockKind, undo, type LetterPiece,
} from "./pieces";
import { createMemoryLettersRepository } from "./repository";
import { templateBlocks } from "./templates";

const T0 = new Date("2026-11-13T12:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);
const newPiece = (): LetterPiece => createPiece({ id: "p1", title: "Relatório", docType: "RELATORIO_TECNICO", ownerId: LETTERS_DEMO_USER, now: T0, blocks: templateBlocks("RELATORIO_TECNICO"), mode: "SOB_SOLICITACAO" });
const okp = (r: { ok: boolean }) => { expect(r.ok).toBe(true); return (r as { ok: true; piece: LetterPiece }).piece; };

describe("peça estruturada (RF52 mínimo)", () => {
  it("modelo cria blocos com id estável, revisão 1 e política pessoal", () => {
    const p = newPiece();
    expect(p.blocks.map((b) => b.id)).toEqual(p.blocks.map((_, i) => `b${i + 1}`));
    expect(p.blocks.filter((b) => b.kind === "TITULO").map((b) => b.text)).toContain("2 Objetivo");
    expect(p).toMatchObject({ revision: 1, genre: "TECNICO", language: "pt-BR" });
    expect(p.policy).toMatchObject({ mode: "SOB_SOLICITACAO", version: 1 });
    expect(p.history).toHaveLength(1);
  });

  it("AGENTE como padrão pessoal cai para ASSISTIDO (exige mandato)", () => {
    const p = createPiece({ id: "x", title: "X", docType: "ADR", ownerId: "u", now: T0, blocks: templateBlocks("ADR"), mode: "AGENTE" });
    expect(p.policy.mode).toBe("ASSISTIDO");
  });

  it("cada comando incrementa a revisão; inserir, mover, trocar tipo e remover mantêm ids", () => {
    let p = newPiece();
    const ins = insertBlock(p, "b2", "LISTA", T0);
    p = okp(ins);
    expect(ins.blockId).toBe("b14");
    expect(p.blocks[2]!.id).toBe("b14");
    p = okp(moveBlock(p, "b14", -1, at(1)));
    expect(p.blocks[1]!.id).toBe("b14");
    p = okp(setBlockKind(p, "b14", "CITACAO", at(2)));
    expect(p.blocks[1]!.kind).toBe("CITACAO");
    p = okp(removeBlock(p, "b14", at(3)));
    expect(p.blocks.some((b) => b.id === "b14")).toBe(false);
    expect(p.revision).toBe(5);
    expect(moveBlock(p, "b1", -1, at(4))).toEqual({ ok: false, error: "SEM_ALTERACAO" });
    expect(editBlockText(p, "nao-existe", "x", at(4))).toEqual({ ok: false, error: "BLOCO_INEXISTENTE" });
  });

  it("digitação contínua no mesmo bloco vira uma versão; depois da janela, outra", () => {
    let p = newPiece();
    p = okp(editBlockText(p, "b3", "O", at(0)));
    p = okp(editBlockText(p, "b3", "O sis", at(1000)));
    p = okp(editBlockText(p, "b3", "O sistema", at(2000)));
    expect(p.revision).toBe(4);
    expect(p.history).toHaveLength(2);
    p = okp(editBlockText(p, "b3", "O sistema caiu", at(2000 + COALESCE_MS + 1)));
    expect(p.history).toHaveLength(3);
  });

  it("desfazer volta passo a passo numa revisão nova; restaurar versão também", () => {
    let p = newPiece();
    p = okp(editBlockText(p, "b3", "Primeiro texto.", at(0)));
    p = okp(editBlockText(p, "b5", "Objetivo.", at(1000)));
    const r3 = p.revision;
    p = okp(undo(p, at(2000)));
    expect(p.revision).toBe(r3 + 1);
    expect(p.blocks.find((b) => b.id === "b5")!.text).toBe("");
    expect(p.blocks.find((b) => b.id === "b3")!.text).toBe("Primeiro texto.");
    p = okp(undo(p, at(3000)));
    expect(p.blocks.find((b) => b.id === "b3")!.text).toBe("");
    expect(canUndo(p)).toBe(false);
    expect(undo(p, at(4000))).toEqual({ ok: false, error: "NADA_PARA_DESFAZER" });
    p = okp(restoreVersion(p, r3, at(5000)));
    expect(p.blocks.find((b) => b.id === "b5")!.text).toBe("Objetivo.");
    expect(p.history.at(-1)).toMatchObject({ origin: "RESTAURACAO", summary: "restored", vars: { revision: r3 } });
  });

  it("trocas exatas são atômicas: trecho alterado → nada muda", () => {
    let p = okp(editBlockText(newPiece(), "b3", "Começou à partir de março.", T0));
    const good = { blockId: "b3", findingId: "f", ruleId: "CRASE_VERBO", start: 8, end: 9, before: "à", after: "a" };
    const bad = { ...good, start: 0, end: 7, before: "XXXXXXX" };
    expect(applyChanges(p, [good, bad], "AI_PROPOSAL_ACCEPTED", at(1))).toEqual({ ok: false, error: "TRECHO_ALTERADO" });
    p = okp(applyChanges(p, [good], "AI_PROPOSAL_ACCEPTED", at(1)));
    expect(p.blocks.find((b) => b.id === "b3")!.text).toBe("Começou a partir de março.");
    expect(p.history.at(-1)!.origin).toBe("AI_PROPOSAL_ACCEPTED");
  });

  it("seção ausente é inserida antes da seção seguinte; título vazio é recusado", () => {
    const p = okp(insertSection(newPiece(), "Objetivo", "b6", T0));
    const i = p.blocks.findIndex((b) => b.text === "Objetivo");
    expect(p.blocks[i + 1]!.kind).toBe("PARAGRAFO");
    expect(p.blocks[i + 2]!.id).toBe("b6");
    expect(rename(p, "  ", T0)).toEqual({ ok: false, error: "TITULO_VAZIO" });
  });

  it("ignorar com motivo é reversível (RF53.CA07)", () => {
    let p = ignoreFinding(newPiece(), { key: "k1", ruleId: "REPETICAO_PROXIMA", excerpt: "sistema" }, "ESTILO_INTENCIONAL", T0, " termo técnico ");
    expect(p.ignored).toEqual([{ key: "k1", ruleId: "REPETICAO_PROXIMA", excerpt: "sistema", reason: "ESTILO_INTENCIONAL", note: "termo técnico", at: T0.toISOString() }]);
    p = reopenFinding(p, "k1");
    expect(p.ignored).toEqual([]);
  });

  it("só o dono troca o modo; cada troca sobe a versão da política; AGENTE sem mandato é recusado", () => {
    const p = newPiece();
    const r = changePieceMode(p, LETTERS_DEMO_USER, "ASSISTIDO", T0);
    expect(r.ok && r.piece.policy).toMatchObject({ mode: "ASSISTIDO", version: 2 });
    expect(changePieceMode(p, "outra-pessoa", "ASSISTIDO", T0)).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    expect(changePieceMode(p, LETTERS_DEMO_USER, "AGENTE", T0)).toEqual({ ok: false, reason: "SEM_MANDATO" });
  });

  it("numeração de parágrafos ignora títulos e referências", () => {
    const nums = paragraphNumbers(newPiece().blocks);
    expect(nums.get("b3")).toBe(1);
    expect(nums.get("b2")).toBeUndefined();
    expect(nums.get("b13")).toBeUndefined();
  });
});

describe("repositório DEMO", () => {
  it("lista, cria a partir de modelo, salva e avisa os assinantes", () => {
    const repo = createMemoryLettersRepository(buildDemoPieces(T0), () => "nova");
    let calls = 0;
    const off = repo.subscribe(() => calls++);
    expect(repo.source).toBe("DEMO");
    expect(repo.list()).toHaveLength(4);
    const p = repo.createFromTemplate({ template: "PARECER", title: "Parecer novo", ownerId: LETTERS_DEMO_USER, mode: "SUGESTOES", now: T0 });
    expect(repo.get("nova")).toBe(p);
    repo.save(okp(rename(p, "Parecer renomeado", T0)));
    expect(repo.get("nova")!.title).toBe("Parecer renomeado");
    expect(repo.list()[0]!.id).toBe("nova");
    off();
    repo.save(okp(rename(repo.get("nova")!, "De novo", T0)));
    expect(calls).toBe(2);
  });
});
