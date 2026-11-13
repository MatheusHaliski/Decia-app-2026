import { describe, expect, it } from "vitest";
import { DEMO_CURRENT_USER_ID } from "@/lib/decia/fixtures";
import { VIEWER_USERS } from "@/lib/viewer/profiles";
import { DEMO_PAST_PURCHASE, demoHistoryPlan, isLabHolder, labOpenings, seedDemoHistory, seedLabPersonas } from "./demo";
import { LAB_PERSON_ID, pointsHolderOf } from "./identity";
import { createMemoryLedger, DEFAULT_RULES } from "./ledger";
import { PARTICIPATION_EVENTS } from "./statement";

const NOW = new Date("2026-11-12T12:00:00Z");

describe("dono do saldo (RF42, ABAS_POR_PERFIL §7.d)", () => {
  it("EMPRESA e visitante não têm saldo; o EMPREGADO do laboratório é o participante do DECIA", () => {
    expect(LAB_PERSON_ID).toBe(DEMO_CURRENT_USER_ID);
    expect(pointsHolderOf(VIEWER_USERS.EMPREGADO)).toBe(DEMO_CURRENT_USER_ID);
    expect(pointsHolderOf(VIEWER_USERS.CHEFE)).toBe("chefe.exemplo");
    expect(pointsHolderOf(VIEWER_USERS.EMPRESA)).toBeNull();
    expect(pointsHolderOf(VIEWER_USERS.VISITANTE)).toBeNull();
    expect(pointsHolderOf({ profile: "EMPREGADO", username: "" })).toBeNull();
  });
});

describe("histórico DEMO dos perfis do laboratório", () => {
  it("o plano soma exatamente o alvo, só com eventos de participação, nunca no dia de hoje", () => {
    for (const target of [2, 3, 7, 61, 980, 1240, 2310, 5000]) {
      const plan = demoHistoryPlan("u-x", target, DEFAULT_RULES, NOW);
      expect(plan.reduce((s, p) => s + p.points, 0)).toBe(target);
      expect(plan.every((p) => PARTICIPATION_EVENTS.includes(p.event))).toBe(true);
      expect(plan.every((p) => p.at.toISOString().slice(0, 10) < "2026-11-12")).toBe(true);
    }
    expect(demoHistoryPlan("u-x", 1, DEFAULT_RULES, NOW)).toEqual([]);
  });

  it("semear respeita os tetos do razão e fecha no saldo; semear de novo não duplica", () => {
    const ledger = createMemoryLedger();
    seedDemoHistory(ledger, "u-x", 1240, NOW);
    expect(ledger.balance("u-x")).toBe(1240);
    const count = ledger.entries("u-x").length;
    seedDemoHistory(ledger, "u-x", 1240, new Date("2026-12-01T12:00:00Z"));
    expect(ledger.entries("u-x").length).toBe(count);
  });

  it("cada perfil do laboratório abre com o saldo da ficha; o Pessoa Exemplo tem a compra de créditos de IA no extrato", () => {
    const ledger = createMemoryLedger();
    seedLabPersonas(ledger, NOW);
    seedLabPersonas(ledger, NOW);
    for (const { holderId, opening } of labOpenings()) expect(ledger.balance(holderId)).toBe(opening);
    expect(ledger.balance(DEMO_CURRENT_USER_ID)).toBe(VIEWER_USERS.EMPREGADO.points);
    expect(ledger.balance("chefe.exemplo")).toBe(VIEWER_USERS.CHEFE.points);
    const buy = ledger.entries(DEMO_CURRENT_USER_ID).filter((e) => e.event === "COMPRA_LOJA");
    expect(buy).toHaveLength(1);
    expect(buy[0]!.delta).toBe(-DEMO_PAST_PURCHASE.points);
    expect(isLabHolder("admin.exemplo")).toBe(false); // ADMIN abre com 0
    expect(isLabHolder(DEMO_CURRENT_USER_ID)).toBe(true);
  });
});
