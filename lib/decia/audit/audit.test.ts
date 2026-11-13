import { describe, expect, it } from "vitest";
import { decide, setRecommendationStatus } from "@/lib/decia/commands";
import { buildDemoDecisions, DEMO_DECISION_IDS } from "@/lib/decia/fixtures";
import { buildDemoAudit, DEMO_SESSION_IDS } from "@/lib/decia/session/fixtures";
import { auditFromDecisions } from "./decisions";
import { diffWords, tokenize } from "./diff";
import { auditToCsv, auditToJson, csvCell } from "./export";
import { compareTexts, defaultCompare, filterAudit, NO_AUDIT_FILTERS, sortAudit } from "./filter";
import { createAuditLog, verifyChain } from "./log";
import type { AuditInput, AuditRecord } from "./types";

const NOW = new Date("2026-11-12T15:00:00Z");
const input = (over: Partial<AuditInput> = {}): AuditInput => ({
  at: NOW.toISOString(), actorId: "u-ana", action: "ACEITOU", source: "SESSAO", sessionId: "s-1", decisionId: null, contextTitle: "Sessão",
  target: { kind: "PROPOSTA_MINUTA", id: "p-1", label: "Resumo" }, policy: { mode: "SUGESTOES", version: 2 }, reason: null, before: "a", proposed: "b", after: "b", ...over,
});

describe("livro somente-acréscimo", () => {
  it("sem update nem delete; registros congelados (nem por referência) e encadeados por hash", () => {
    const log = createAuditLog();
    const src = input();
    const r = log.append(src);
    src.after = "mudado depois";
    expect(r.after).toBe("b");
    expect(Object.isFrozen(r) && Object.isFrozen(r.target)).toBe(true);
    expect(() => { (r as { after: string }).after = "x"; }).toThrow();
    expect(Object.keys(log).sort()).toEqual(["append", "list", "snapshot", "source", "subscribe", "verify"]);
    const r2 = log.append(input({ action: "REVERTEU", before: "b", after: "a", proposed: null }));
    expect(r2).toMatchObject({ seq: 2, prevHash: r.hash });
    expect(r.prevHash).toBe("0".repeat(64));
    expect(log.verify()).toEqual({ ok: true });
  });
  it("adulterar um registro (ou a ordem) quebra a verificação da cadeia", () => {
    const log = createAuditLog(buildDemoAudit(NOW));
    const records = log.list().map((r) => ({ ...r })) as AuditRecord[];
    expect(verifyChain(records)).toEqual({ ok: true });
    records[2] = { ...records[2]!, reason: "outro motivo" };
    expect(verifyChain(records)).toEqual({ ok: false, brokenAt: 3 });
    expect(verifyChain([records[1]!, records[0]!])).toMatchObject({ ok: false, brokenAt: 1 });
  });
  it("a lista tem referência estável entre acréscimos (para useSyncExternalStore)", () => {
    const log = createAuditLog();
    const a = log.list();
    expect(log.list()).toBe(a);
    log.append(input());
    expect(log.list()).not.toBe(a);
  });
});

describe("diff por palavra", () => {
  it("marca removido e inserido, conta palavras, agrupa trechos", () => {
    const d = diffWords("Ana revisa o contrato até sexta.", "Ana revisa o contrato e o termo até 20/11.");
    expect(d.parts.filter((p) => p.op !== "IGUAL").map((p) => [p.op, p.text])).toEqual([["INSERIDO", "e o termo "], ["REMOVIDO", "sexta"], ["INSERIDO", "20/11"]]);
    expect(d.removedWords).toBe(1);
    expect(d.insertedWords).toBe(5);
    expect(d.parts.map((p) => (p.op === "REMOVIDO" ? "" : p.text)).join("")).toBe("Ana revisa o contrato e o termo até 20/11.");
    expect(d.parts.map((p) => (p.op === "INSERIDO" ? "" : p.text)).join("")).toBe("Ana revisa o contrato até sexta.");
  });
  it("idêntico, vazio e texto enorme (sem travar)", () => {
    expect(diffWords("igual", "igual")).toMatchObject({ identical: true, removedWords: 0, insertedWords: 0 });
    expect(diffWords("", "novo texto").parts).toEqual([{ op: "INSERIDO", text: "novo texto" }]);
    const big = "palavra ".repeat(2_100);
    expect(diffWords(big, `${big}fim`)).toMatchObject({ truncated: true });
    expect(tokenize("Fica-aprovado, 20 %!")).toEqual(["Fica-aprovado", ",", " ", "20", " ", "%", "!"]);
  });
});

describe("filtros, comparação e exportação", () => {
  const records = createAuditLog(buildDemoAudit(NOW)).list();
  it("por sessão, pessoa, tipo e período; decisões estruturadas à parte", () => {
    expect(filterAudit(records, { ...NO_AUDIT_FILTERS, session: DEMO_SESSION_IDS.infra })).toHaveLength(3);
    expect(filterAudit(records, { ...NO_AUDIT_FILTERS, actor: "u-ana" })).toHaveLength(4);
    expect(filterAudit(records, { ...NO_AUDIT_FILTERS, action: "REJEITOU" }).map((r) => r.target.kind)).toEqual(["ENCAMINHAMENTO", "PROPOSTA_MINUTA"]);
    const day = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString().slice(0, 10);
    expect(filterAudit(records, { ...NO_AUDIT_FILTERS, from: day(-4), to: day(-3) }).map((r) => r.action)).toEqual(["ACEITOU", "REVERTEU"]);
    expect(filterAudit(records, { ...NO_AUDIT_FILTERS, session: "DECISOES" })).toEqual([]);
    expect(sortAudit(records)[0]!.action).toBe("REVERTEU");
  });
  it("comparação padrão: proposta × aprovado quando houve edição; antes × depois na reversão", () => {
    const edited = records.find((r) => r.action === "EDITOU_E_ACEITOU")!;
    expect(defaultCompare(edited)).toBe("PROPOSTA_APROVADO");
    const reverted = records.find((r) => r.action === "REVERTEU")!;
    expect(defaultCompare(reverted)).toBe("ANTES_DEPOIS");
    expect(compareTexts(reverted, "ANTES_DEPOIS")).toEqual({ left: reverted.before, right: reverted.after });
  });
  it("CSV com aspas, quebras de linha, BOM e proteção contra fórmula; JSON com os metadados", () => {
    expect(csvCell('diz "oi", tchau')).toBe('"diz ""oi"", tchau"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell(null)).toBe("");
    const csv = auditToCsv(records.slice(0, 2), (id) => `Nome de ${id}`);
    expect(csv.startsWith("﻿id,seq,data_hora,pessoa_id,pessoa,acao")).toBe(true);
    expect(csv).toContain("Nome de u-ana");
    expect(csv.split("\r\n").filter(Boolean).length).toBeGreaterThan(2); // quebras de linha dentro das células ficam entre aspas
    const json = JSON.parse(auditToJson(records, { exportedAt: NOW.toISOString(), source: "DEMO", filters: {}, chainOk: true }));
    expect(json).toMatchObject({ source: "DEMO", count: records.length, chainOk: true });
    expect(json.records[0].hash).toBe(records[0]!.hash);
  });
});

describe("revisões das decisões estruturadas (lib/decia)", () => {
  it("snapshot DECISAO com recomendação vigente vira registro; sugestão aceita/descartada e decisão contra a recomendação também", () => {
    const all = buildDemoDecisions(NOW);
    const base = auditFromDecisions(all);
    expect(base.map((r) => [r.decisionId, r.action, r.target.kind])).toEqual([[DEMO_DECISION_IDS.fornecedor, "ACEITOU", "DECISAO"]]);
    expect(base[0]).toMatchObject({ source: "DECISAO", chained: false, policy: null, proposed: "B — Fornecedor Beta (demo)" });
    expect(base[0]!.after.startsWith("B — Fornecedor Beta (demo)\nB cobre o horário estendido")).toBe(true);

    const arq = all.find((a) => a.decision.id === DEMO_DECISION_IDS.arquitetura)!;
    const dismissed = setRecommendationStatus(arq, "arq-rec-2", "DESCARTADA", "u-pessoa", NOW);
    const recs = auditFromDecisions([dismissed]);
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ action: "REJEITOU", actorId: "u-pessoa", target: { kind: "RECOMENDACAO_IA", id: "arq-rec-2" }, after: "" });

    const sprint = all.find((a) => a.decision.id === DEMO_DECISION_IDS.sprint)!;
    const { aggregate } = decide(sprint, { selectedAlternativeId: "spr-b", rationale: "Notificações reduzem retrabalho já neste trimestre.", confidencePct: 60, warningsConfirmed: true }, "u-pessoa", NOW);
    const decided = auditFromDecisions([aggregate]);
    expect(decided.map((r) => [r.action, r.proposed])).toEqual([["REJEITOU", "A — Exportar relatórios em PDF"]]);
    expect(decided[0]!.after).toContain("B — Notificações por e-mail");
  });
});
