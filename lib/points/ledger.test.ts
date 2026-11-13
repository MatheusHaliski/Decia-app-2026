import { describe, expect, it } from "vitest";
import { createMemoryLedger } from "./ledger";

const NOW = new Date("2026-11-12T12:00:00Z");

describe("razão de DECIA Points (RF42)", () => {
  it("ganha pela regra, uma vez por fato (idempotente), com teto por sessão", () => {
    const l = createMemoryLedger();
    const r = l.award({ userId: "u1", event: "ARGUMENTO_EVIDENCIA", ref: { type: "mensagem", id: "m1" }, sessionId: "s1" }, NOW);
    expect(r.ok && r.entry.delta).toBe(5);
    expect(l.award({ userId: "u1", event: "ARGUMENTO_EVIDENCIA", ref: { type: "mensagem", id: "m1" }, sessionId: "s1" }, NOW)).toEqual({ ok: false, reason: "DUPLICADO" });
    for (let i = 2; i <= 10; i++) l.award({ userId: "u1", event: "ARGUMENTO_EVIDENCIA", ref: { type: "mensagem", id: `m${i}` }, sessionId: "s1" }, NOW);
    expect(l.award({ userId: "u1", event: "ARGUMENTO_EVIDENCIA", ref: { type: "mensagem", id: "m11" }, sessionId: "s1" }, NOW)).toEqual({ ok: false, reason: "TETO_ATINGIDO" });
    expect(l.award({ userId: "u1", event: "ARGUMENTO_EVIDENCIA", ref: { type: "mensagem", id: "m12" }, sessionId: "s2" }, NOW).ok).toBe(true);
    expect(l.balance("u1")).toBe(55);
  });

  it("multiplicador só onde a regra aceita, limitado a 0,5–2,0; teto diário das reações", () => {
    const l = createMemoryLedger();
    const v = l.award({ userId: "u1", event: "DECISAO_VALIDADA", ref: { type: "decisao", id: "d1" }, multiplier: 5 }, NOW);
    expect(v.ok && v.entry.delta).toBe(30);
    const c = l.award({ userId: "u1", event: "CONSENSO", ref: { type: "mensagem", id: "x" }, multiplier: 2 }, NOW);
    expect(c.ok && c.entry.delta).toBe(3);
    for (let i = 0; i < 20; i++) l.award({ userId: "u2", event: "REACAO_QUALIDADE", ref: { type: "reacao", id: `r${i}` } }, NOW);
    expect(l.award({ userId: "u2", event: "REACAO_QUALIDADE", ref: { type: "reacao", id: "r20" } }, NOW)).toEqual({ ok: false, reason: "TETO_ATINGIDO" });
    expect(l.award({ userId: "u2", event: "REACAO_QUALIDADE", ref: { type: "reacao", id: "r21" } }, new Date("2026-11-13T09:00:00Z")).ok).toBe(true);
  });

  it("gasto só com saldo; crédito ao autor com valor explícito; extrato do mais novo ao mais antigo; avisa quem assina", () => {
    const l = createMemoryLedger();
    let calls = 0;
    const off = l.subscribe(() => calls++);
    expect(l.spend({ userId: "u1", event: "COMPRA_LOJA", points: 10, ref: { type: "item", id: "skin" } }, NOW)).toEqual({ ok: false, reason: "SALDO_INSUFICIENTE" });
    l.award({ userId: "u1", event: "CREDITO_AUTOR_MODELO", points: 12, ref: { type: "modelo", id: "t1" } }, NOW);
    expect(l.award({ userId: "u1", event: "CREDITO_AUTOR_MODELO", ref: { type: "modelo", id: "t2" } }, NOW)).toEqual({ ok: false, reason: "VALOR_INVALIDO" });
    const s = l.spend({ userId: "u1", event: "COMPRA_LOJA", points: 10, ref: { type: "item", id: "skin" } }, NOW);
    expect(s.ok && s.entry.delta).toBe(-10);
    expect(l.balance("u1")).toBe(2);
    expect(l.entries("u1").map((e) => e.event)).toEqual(["COMPRA_LOJA", "CREDITO_AUTOR_MODELO"]);
    expect(calls).toBe(2);
    off();
  });
});
