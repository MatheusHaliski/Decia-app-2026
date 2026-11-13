import { describe, expect, it } from "vitest";
import { analyzeDocument } from "./analyze";
import { acceptProposal, applyBatch, copilotCaps, proposalState } from "./copilot";
import { LETTERS_DEMO_USER } from "./fixtures";
import { changePieceMode, createPiece, editBlockText, undo, type LetterPiece } from "./pieces";
import { buildProposal } from "./rewrite";
import type { AutonomyMode } from "@/lib/ai/autonomy";

const T0 = new Date("2026-11-13T12:00:00Z");
const ME = LETTERS_DEMO_USER;
const piece = (mode: AutonomyMode = "SOB_SOLICITACAO"): LetterPiece =>
  createPiece({
    id: "p",
    title: "P",
    docType: "LIVRE",
    ownerId: ME,
    now: T0,
    mode,
    blocks: [
      { kind: "PARAGRAFO", text: "A equipe começou à partir de março." },
      { kind: "PARAGRAFO", text: "A medida implica em custos." },
    ],
  });
const proposalFor = (p: LetterPiece, kind: "ACHADO" | "LOTE" = "LOTE") => {
  const r = analyzeDocument(p.blocks, { revision: p.revision, policyVersion: p.policy.version, genre: p.genre, docType: p.docType, language: p.language });
  return buildProposal({ findings: r.findings, blocks: p.blocks, revision: p.revision, policyVersion: p.policy.version, kind, now: T0 });
};

describe("o que cada modo libera (lib/ai/autonomy, 5 modos)", () => {
  it.each([
    ["MANUAL", { enabled: false, autoAnalyze: false, proposeOnRequest: false, oneClick: false, batch: false }],
    ["SOB_SOLICITACAO", { enabled: true, autoAnalyze: false, proposeOnRequest: true, oneClick: false, batch: false }],
    ["SUGESTOES", { enabled: true, autoAnalyze: true, proposeOnRequest: true, oneClick: true, batch: false }],
    ["ASSISTIDO", { enabled: true, autoAnalyze: true, proposeOnRequest: true, oneClick: true, batch: true }],
  ] as const)("%s", (mode, caps) => {
    expect(copilotCaps({ mode, version: 1, changedBy: ME, changedAt: T0.toISOString(), charter: null })).toMatchObject(caps);
  });
});

describe("aceite de proposta ✦ (RF51.CA02/CA05, RF55.CA05)", () => {
  it("aceite explícito na mesma revisão e política aplica e registra a origem", () => {
    const p = piece();
    const r = acceptProposal(p, proposalFor(p, "ACHADO"), ME, T0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.piece.blocks.map((b) => b.text)).toEqual(["A equipe começou a partir de março.", "A medida implica custos."]);
    expect(r.piece.history.at(-1)!.origin).toBe("AI_PROPOSAL_ACCEPTED");
  });

  it("proposta calculada sobre revisão antiga é recusada e o rascunho fica", () => {
    const p = piece();
    const prop = proposalFor(p);
    const edited = editBlockText(p, "b2", "A medida implica em custos altos.", T0);
    if (!edited.ok) throw new Error("edição");
    expect(proposalState(edited.piece, prop)).toEqual({ valid: false, reason: "PROPOSTA_OBSOLETA_REVISAO" });
    expect(acceptProposal(edited.piece, prop, ME, T0)).toEqual({ ok: false, reason: "PROPOSTA_OBSOLETA_REVISAO" });
  });

  it("proposta de política antiga é recusada depois da troca de modo", () => {
    const p = piece();
    const prop = proposalFor(p);
    const changed = changePieceMode(p, ME, "SUGESTOES", T0);
    if (!changed.ok) throw new Error("modo");
    expect(acceptProposal(changed.piece, prop, ME, T0)).toEqual({ ok: false, reason: "PROPOSTA_OBSOLETA_POLITICA" });
  });

  it("modo Manual: copiloto desligado", () => {
    const p = piece("MANUAL");
    expect(acceptProposal(p, proposalFor(p), ME, T0)).toEqual({ ok: false, reason: "COPILOTO_DESLIGADO" });
  });
});

describe("lote do modo Assistido (RF51.CA03, RF55.CA04)", () => {
  it("aplica só nos blocos escolhidos, numa versão única que um desfazer reverte inteira", () => {
    const p = piece("ASSISTIDO");
    const r = applyBatch(p, proposalFor(p), new Set(["b1", "b2"]), ME, T0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.piece.revision).toBe(p.revision + 1);
    expect(r.piece.blocks.map((b) => b.text)).toEqual(["A equipe começou a partir de março.", "A medida implica custos."]);
    const back = undo(r.piece, T0);
    expect(back.ok && back.piece.blocks.map((b) => b.text)).toEqual(p.blocks.map((b) => b.text));
  });

  it("seleção parcial fica restrita ao bloco escolhido", () => {
    const p = piece("ASSISTIDO");
    const r = applyBatch(p, proposalFor(p), new Set(["b2"]), ME, T0);
    expect(r.ok && r.piece.blocks.map((b) => b.text)).toEqual(["A equipe começou à partir de março.", "A medida implica custos."]);
  });

  it("fora do Assistido o lote é recusado pela política (MODO_NAO_PERMITE); sem seleção também", () => {
    const s = piece("SUGESTOES");
    expect(applyBatch(s, proposalFor(s), new Set(["b1"]), ME, T0)).toEqual({ ok: false, reason: "MODO_NAO_PERMITE" });
    const a = piece("ASSISTIDO");
    expect(applyBatch(a, proposalFor(a), new Set(), ME, T0)).toEqual({ ok: false, reason: "SEM_SELECAO" });
  });
});
