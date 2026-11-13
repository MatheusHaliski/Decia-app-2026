import { describe, expect, it } from "vitest";
import { DEMO_PAST_PURCHASE, seedLabPersonas } from "@/lib/points/demo";
import { createMemoryLedger } from "@/lib/points/ledger";
import { demoBoostTargets } from "./boost";
import { availabilityOf, PREMIUM_SKINS, skinItemOf, skinState, STORE_CATALOG, type StoreItem } from "./catalog";
import { createMemoryStoreRepository, demoStoreSeed } from "./repository";

const NOW = new Date("2026-11-12T12:00:00Z");

function funded(points: number) {
  const ledger = createMemoryLedger();
  if (points > 0) ledger.award({ userId: "u1", event: "CREDITO_AUTOR_MODELO", points, ref: { type: "licenca", id: "seed" } }, NOW);
  return { ledger, repo: createMemoryStoreRepository({ ledger }) };
}

describe("Loja Work AI — compra (RF42.CA04–CA06)", () => {
  it("compra com saldo: débito COMPRA_LOJA no razão, entrega dos créditos de IA no saldo próprio e histórico", () => {
    const { ledger, repo } = funded(100);
    const r = repo.purchase({ buyerId: "u1", itemId: "creditos-ia-10", idempotencyKey: "k1" }, NOW);
    expect(r.ok).toBe(true);
    expect(ledger.balance("u1")).toBe(50);
    const debit = ledger.entries("u1")[0]!;
    expect([debit.event, debit.delta, debit.ref.type]).toEqual(["COMPRA_LOJA", -50, "compra"]);
    expect(repo.aiCredits("u1")).toBe(10);
    expect(repo.purchases("u1").map((p) => [p.itemId, p.pricePaid, p.status])).toEqual([["creditos-ia-10", 50, "CONCLUIDA"]]);
  });

  it("sem saldo: SALDO_INSUFICIENTE com saldo e preço, nada é entregue nem debitado", () => {
    const { ledger, repo } = funded(30);
    expect(repo.purchase({ buyerId: "u1", itemId: "skin-blueprint", idempotencyKey: "k1" }, NOW)).toEqual({ ok: false, reason: "SALDO_INSUFICIENTE", balance: 30, price: 200 });
    expect(ledger.balance("u1")).toBe(30);
    expect(repo.ownedSkins("u1")).toEqual([]);
    expect(repo.purchases("u1")).toEqual([]);
  });

  it("a mesma confirmação não compra duas vezes (idempotência) e outra pessoa não reaproveita a chave", () => {
    const { ledger, repo } = funded(500);
    const a = repo.purchase({ buyerId: "u1", itemId: "creditos-ia-10", idempotencyKey: "k1" }, NOW);
    const b = repo.purchase({ buyerId: "u1", itemId: "creditos-ia-10", idempotencyKey: "k1" }, NOW);
    expect(b.ok && b.replay).toBe(true);
    expect(a.ok && b.ok && a.purchase.id === b.purchase.id).toBe(true);
    expect(ledger.balance("u1")).toBe(450);
    expect(repo.purchase({ buyerId: "u2", itemId: "creditos-ia-10", idempotencyKey: "k1" }, NOW)).toEqual({ ok: false, reason: "DUPLICADO" });
  });

  it("skin: desbloqueia uma vez (JA_ADQUIRIDO depois) e o estado da skin muda de bloqueada para desbloqueada", () => {
    const { repo } = funded(300);
    expect(skinState("blueprint", repo.ownedSkins("u1"))).toBe("BLOQUEADA");
    expect(skinState("papel", repo.ownedSkins("u1"))).toBe("LIVRE");
    expect(repo.purchase({ buyerId: "u1", itemId: "skin-blueprint", idempotencyKey: "k1" }, NOW).ok).toBe(true);
    expect(repo.ownedSkins("u1")).toEqual(["blueprint"]);
    expect(skinState("blueprint", repo.ownedSkins("u1"))).toBe("DESBLOQUEADA");
    expect(repo.purchase({ buyerId: "u1", itemId: "skin-blueprint", idempotencyKey: "k2" }, NOW)).toEqual({ ok: false, reason: "ITEM_INDISPONIVEL", detail: "JA_ADQUIRIDO" });
    expect(PREMIUM_SKINS).toEqual(["papel-timbrado", "blueprint"]);
    expect(skinItemOf("blueprint")?.pricePoints).toBe(200);
  });

  it("estoque, limite por pessoa e janela de venda viram ITEM_INDISPONIVEL", () => {
    const ledger = createMemoryLedger();
    for (const u of ["u1", "u2", "u3", "u4"]) ledger.award({ userId: u, event: "CREDITO_AUTOR_MODELO", points: 500, ref: { type: "licenca", id: u } }, NOW);
    const repo = createMemoryStoreRepository({ ledger });
    expect(repo.stockLeft("creditos-ia-25")).toBe(3);
    expect(repo.purchase({ buyerId: "u1", itemId: "creditos-ia-25", idempotencyKey: "a" }, NOW).ok).toBe(true);
    expect(repo.purchase({ buyerId: "u1", itemId: "creditos-ia-25", idempotencyKey: "b" }, NOW)).toMatchObject({ ok: false, detail: "LIMITE_POR_PESSOA" });
    repo.purchase({ buyerId: "u2", itemId: "creditos-ia-25", idempotencyKey: "c" }, NOW);
    repo.purchase({ buyerId: "u3", itemId: "creditos-ia-25", idempotencyKey: "d" }, NOW);
    expect(repo.stockLeft("creditos-ia-25")).toBe(0);
    expect(repo.purchase({ buyerId: "u4", itemId: "creditos-ia-25", idempotencyKey: "e" }, NOW)).toMatchObject({ ok: false, reason: "ITEM_INDISPONIVEL", detail: "ESGOTADO" });
    expect(repo.availability("impulso-72h", "u4", NOW)).toEqual({ ok: false, reason: "AINDA_NAO" });
    expect(repo.availability("creditos-ia-25", "u4", new Date("2027-01-02T12:00:00Z"))).toEqual({ ok: false, reason: "ENCERRADO" });
    const off: StoreItem = { ...STORE_CATALOG[0]!, active: false };
    expect(availabilityOf(off, { stockLeft: null, boughtByUser: 0, ownedSkins: [] }, NOW)).toEqual({ ok: false, reason: "INATIVO" });
    expect(repo.purchase({ buyerId: "u4", itemId: "nao-existe", idempotencyKey: "f" }, NOW)).toEqual({ ok: false, reason: "NAO_ENCONTRADO" });
  });

  it("impulso no Mural exige o item a impulsionar e vale por 24 h", () => {
    const { repo } = funded(300);
    expect(repo.purchase({ buyerId: "u1", itemId: "impulso-24h", idempotencyKey: "a" }, NOW)).toEqual({ ok: false, reason: "ALVO_OBRIGATORIO" });
    const target = demoBoostTargets()[0]!;
    const r = repo.purchase({ buyerId: "u1", itemId: "impulso-24h", idempotencyKey: "b", boostTarget: target }, NOW);
    expect(r.ok && r.purchase.boost?.until).toBe("2026-11-13T12:00:00.000Z");
    expect(repo.boosts("u1", NOW)).toHaveLength(1);
    expect(repo.boosts("u1", new Date("2026-11-13T13:00:00Z"))).toHaveLength(0);
    expect(demoBoostTargets().map((t) => t.type)).toContain("TAREFA");
  });

  it("créditos de benefício entram uma vez por resgate; a compra de exemplo do Pessoa Exemplo bate com o razão", () => {
    const { repo } = funded(0);
    expect(repo.grantAiCredits({ userId: "u1", credits: 10, source: "BENEFICIO", refId: "r1" }, NOW)).not.toBeNull();
    repo.grantAiCredits({ userId: "u1", credits: 10, source: "BENEFICIO", refId: "r1" }, NOW);
    expect(repo.aiCredits("u1")).toBe(10);
    expect(repo.grantAiCredits({ userId: "u1", credits: 0, source: "BENEFICIO", refId: "r2" }, NOW)).toBeNull();

    const ledger = createMemoryLedger();
    seedLabPersonas(ledger, NOW);
    const demo = createMemoryStoreRepository({ ledger, seed: demoStoreSeed(NOW) });
    const item = demo.item(DEMO_PAST_PURCHASE.itemId)!;
    expect(item.pricePoints).toBe(DEMO_PAST_PURCHASE.points);
    expect(item.delivery).toEqual({ type: "CREDITOS_IA", credits: DEMO_PAST_PURCHASE.credits });
    expect(demo.aiCredits(DEMO_PAST_PURCHASE.holderId)).toBe(DEMO_PAST_PURCHASE.credits);
    const debit = ledger.entries(DEMO_PAST_PURCHASE.holderId).find((e) => e.event === "COMPRA_LOJA")!;
    expect(debit.ref.id).toBe(demo.purchases(DEMO_PAST_PURCHASE.holderId)[0]!.id);
  });
});
