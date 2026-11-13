import { describe, expect, it } from "vitest";
import { createDonationService, DONATION_MONTHLY_LIMIT, donatedInMonth } from "./donations";
import { createMemoryLedger, DEFAULT_RULES, type PointsEntry } from "./ledger";
import { filterStatement, monthlySeries, OTHER_EARN_EVENTS, PARTICIPATION_EVENTS, ruleViews, summarize } from "./statement";

const NOW = new Date("2026-11-12T12:00:00Z");
const at = (iso: string) => new Date(iso);

function sample() {
  const l = createMemoryLedger();
  l.award({ userId: "u1", event: "DECISAO_VALIDADA", ref: { type: "decisao", id: "d1" }, multiplier: 1.2 }, at("2026-06-03T10:00:00Z")); // 18
  l.award({ userId: "u1", event: "ARGUMENTO_EVIDENCIA", ref: { type: "msg", id: "m1" }, sessionId: "s1" }, at("2026-10-20T10:00:00Z")); // 5
  l.award({ userId: "u1", event: "CONSENSO", ref: { type: "msg", id: "m2" }, sessionId: "s1" }, at("2026-11-02T10:00:00Z")); // 3
  l.award({ userId: "u1", event: "CREDITO_AUTOR_MODELO", points: 20, ref: { type: "licenca", id: "o1:u2" } }, at("2026-11-05T10:00:00Z")); // 20
  l.spend({ userId: "u1", event: "COMPRA_LOJA", points: 30, ref: { type: "compra", id: "c1" } }, at("2026-11-10T10:00:00Z")); // -30
  // inserido por último, mas é o mais antigo: o extrato ordena pela data
  l.award({ userId: "u1", event: "PRESENCA_ENCERRADA", ref: { type: "sessao", id: "s0" }, sessionId: "s0" }, at("2026-01-15T10:00:00Z")); // 2
  return l;
}

describe("extrato, série mensal e regras (RF42.CA03)", () => {
  it("filtra por evento e período, do mais novo ao mais antigo pela data", () => {
    const entries = sample().entries("u1");
    const all = filterStatement(entries, { event: "TODOS", period: "tudo" }, NOW);
    expect(all.map((e) => e.event)).toEqual(["COMPRA_LOJA", "CREDITO_AUTOR_MODELO", "CONSENSO", "ARGUMENTO_EVIDENCIA", "DECISAO_VALIDADA", "PRESENCA_ENCERRADA"]);
    expect(filterStatement(entries, { event: "TODOS", period: "30d" }, NOW).map((e) => e.delta)).toEqual([-30, 20, 3, 5]);
    expect(filterStatement(entries, { event: "CONSENSO", period: "tudo" }, NOW)).toHaveLength(1);
    expect(filterStatement(entries, { event: "DECISAO_VALIDADA", period: "90d" }, NOW)).toHaveLength(0);
    expect(filterStatement(entries, { event: "DECISAO_VALIDADA", period: "180d" }, NOW)).toHaveLength(1);
  });

  it("série mensal: últimos 6 meses (UTC), créditos e débitos separados, meses vazios com zero", () => {
    const series = monthlySeries(sample().entries("u1"), NOW);
    expect(series.map((m) => m.month)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(series[0]).toEqual({ month: "2026-06", earned: 18, spent: 0 });
    expect(series[4]).toEqual({ month: "2026-10", earned: 5, spent: 0 });
    expect(series[5]).toEqual({ month: "2026-11", earned: 23, spent: 30 });
    expect(monthlySeries([], new Date("2026-01-31T23:00:00Z"), 3).map((m) => m.month)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("resumo separa a participação no DECIA dos demais créditos", () => {
    const s = summarize(sample().entries("u1"), NOW);
    expect(s).toEqual({ balance: 18, earned: 48, spent: 30, earnedThisMonth: 23, participation: 28 });
  });

  it("regras vigentes: participação primeiro, valor variável sem número, tetos e multiplicador do razão", () => {
    const views = ruleViews(DEFAULT_RULES);
    expect(views.slice(0, PARTICIPATION_EVENTS.length).every((r) => r.participation)).toBe(true);
    expect(views.map((r) => r.event)).toEqual([...PARTICIPATION_EVENTS, ...OTHER_EARN_EVENTS]);
    const arg = views.find((r) => r.event === "ARGUMENTO_EVIDENCIA")!;
    expect([arg.points, arg.perSessionCap, arg.dailyCap]).toEqual([5, 10, 0]);
    expect(views.find((r) => r.event === "REACAO_QUALIDADE")!.dailyCap).toBe(20);
    expect(views.find((r) => r.event === "DECISAO_VALIDADA")!.multiplier).toBe(true);
    expect(views.find((r) => r.event === "CREDITO_AUTOR_MODELO")!.points).toBeNull();
  });
});

describe("doação a colega com limite mensal (RF42 UC7, CA09)", () => {
  function funded() {
    const l = createMemoryLedger();
    l.award({ userId: "u1", event: "CREDITO_AUTOR_MODELO", points: 100, ref: { type: "licenca", id: "x" } }, at("2026-11-01T10:00:00Z"));
    return l;
  }

  it("debita o doador e credita o colega com a mesma referência; o doador não ganha nada", () => {
    const l = funded();
    const svc = createDonationService(l);
    const r = svc.donate({ id: "d1", fromId: "u1", toId: "u2", points: 20, message: "  Obrigado pela ajuda na ata  " }, NOW);
    expect(r.ok && r.remaining).toBe(DONATION_MONTHLY_LIMIT - 20);
    expect(l.balance("u1")).toBe(80);
    expect(l.balance("u2")).toBe(20);
    const sent = l.entries("u1")[0] as PointsEntry;
    expect([sent.event, sent.delta, sent.note]).toEqual(["DOACAO_ENVIADA", -20, "Obrigado pela ajuda na ata"]);
    expect(l.entries("u2")[0]!.event).toBe("DOACAO_RECEBIDA");
    expect(svc.history("u2")).toHaveLength(1);
    expect(svc.donate({ id: "d1", fromId: "u1", toId: "u2", points: 5 }, NOW)).toMatchObject({ ok: false, reason: "DUPLICADO" });
  });

  it("recusa acima do limite do mês, para si mesmo, valor inválido e sem saldo; o limite renova no mês seguinte", () => {
    const l = funded();
    const svc = createDonationService(l);
    expect(svc.donate({ id: "a", fromId: "u1", toId: "u1", points: 5 }, NOW)).toMatchObject({ ok: false, reason: "PARA_SI_MESMO" });
    expect(svc.donate({ id: "b", fromId: "u1", toId: "u2", points: 0 }, NOW)).toMatchObject({ ok: false, reason: "VALOR_INVALIDO" });
    expect(svc.donate({ id: "c", fromId: "u1", toId: "u2", points: 2.5 }, NOW)).toMatchObject({ ok: false, reason: "VALOR_INVALIDO" });
    expect(svc.donate({ id: "d", fromId: "u1", toId: "", points: 5 }, NOW)).toMatchObject({ ok: false, reason: "DESTINATARIO_INVALIDO" });
    expect(svc.donate({ id: "e", fromId: "u1", toId: "u2", points: 40 }, NOW).ok).toBe(true);
    expect(svc.donate({ id: "f", fromId: "u1", toId: "u3", points: 15 }, NOW)).toMatchObject({ ok: false, reason: "LIMITE_ESGOTADO", remaining: 10 });
    expect(donatedInMonth(l.entries("u1"), NOW)).toBe(40);
    expect(svc.allowance("u1", new Date("2026-12-01T09:00:00Z"))).toBe(DONATION_MONTHLY_LIMIT);
    const poor = createDonationService(createMemoryLedger());
    expect(poor.donate({ id: "g", fromId: "u9", toId: "u2", points: 5 }, NOW)).toMatchObject({ ok: false, reason: "SALDO_INSUFICIENTE" });
  });

  it("sem a regra de crédito ativa nada é debitado", () => {
    const l = createMemoryLedger([], { ...DEFAULT_RULES, DOACAO_RECEBIDA: { ...DEFAULT_RULES.DOACAO_RECEBIDA, active: false } });
    l.award({ userId: "u1", event: "CONSENSO", ref: { type: "m", id: "1" } }, NOW);
    expect(createDonationService(l).donate({ id: "x", fromId: "u1", toId: "u2", points: 2 }, NOW)).toMatchObject({ ok: false, reason: "REGRA_INATIVA" });
    expect(l.balance("u1")).toBe(3);
  });
});
