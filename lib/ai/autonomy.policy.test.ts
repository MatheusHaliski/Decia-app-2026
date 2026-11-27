/**
 * D-156: o pacote da profissão só restringe — vale o modo mais restritivo entre a pessoa, o pacote (limitado a SOB_SOLICITACAO) e o
 * consentimento do serviço.
 */
import { describe, expect, it } from "vitest";
import { AUTONOMY_MODES, PACK_AUTONOMY_CEILING, autonomyRank, effectivePersonalPolicy, evaluateAiAction, mostRestrictive, packCeiling } from "./autonomy";

describe("effectivePersonalPolicy (D-156: mais restritivo vence)", () => {
  it("escada e mais restritivo", () => {
    expect(AUTONOMY_MODES.map(autonomyRank)).toEqual([0, 1, 2, 3, 4]);
    expect(mostRestrictive("AGENTE", "SUGESTOES", "ASSISTIDO")).toBe("SUGESTOES");
    expect(mostRestrictive("MANUAL", "AGENTE")).toBe("MANUAL");
    expect(mostRestrictive()).toBe("MANUAL");
  });

  it("o teto do pacote nunca passa de SOB_SOLICITACAO, mesmo com dado adulterado", () => {
    expect(PACK_AUTONOMY_CEILING).toBe("SOB_SOLICITACAO");
    expect(packCeiling("AGENTE")).toBe("SOB_SOLICITACAO");
    expect(packCeiling("SUGESTOES")).toBe("SOB_SOLICITACAO");
    expect(packCeiling("MANUAL")).toBe("MANUAL");
    expect(packCeiling(null)).toBe("SOB_SOLICITACAO");
  });

  it("pessoa em ASSISTIDO com pacote em SUGESTOES (o erro antigo dos 80 pacotes) fica em SOB_SOLICITACAO", () => {
    const p = effectivePersonalPolicy("ASSISTIDO", "SUGESTOES", null);
    expect(p.mode).toBe("SOB_SOLICITACAO");
    expect(p.changedBy).toBe("self");
    expect(evaluateAiAction(p, "SUGESTAO_ESPONTANEA", { requestedByUser: false })).toEqual({ ok: false, reason: "MODO_NAO_PERMITE" });
    expect(evaluateAiAction(p, "RESPONDER", { requestedByUser: true }).ok).toBe(true);
  });

  it("a escolha mais restritiva da pessoa vence o pacote", () => {
    expect(effectivePersonalPolicy("MANUAL", "SOB_SOLICITACAO", true).mode).toBe("MANUAL");
    expect(effectivePersonalPolicy("SOB_SOLICITACAO", "MANUAL", true).mode).toBe("MANUAL");
  });

  it("consentimento negado ou revogado desliga a IA; concedido ou não exigido não sobe nada", () => {
    expect(effectivePersonalPolicy("AGENTE", "SOB_SOLICITACAO", false).mode).toBe("MANUAL");
    expect(effectivePersonalPolicy("AGENTE", "SOB_SOLICITACAO", true).mode).toBe("SOB_SOLICITACAO");
    expect(effectivePersonalPolicy("AGENTE", undefined, undefined).mode).toBe("SOB_SOLICITACAO");
  });

  it("para qualquer combinação o resultado é ≤ cada uma das entradas", () => {
    for (const a of AUTONOMY_MODES) for (const b of AUTONOMY_MODES) for (const c of [true, false, null] as const) {
      const r = autonomyRank(effectivePersonalPolicy(a, b, c).mode);
      expect(r).toBeLessThanOrEqual(autonomyRank(a));
      expect(r).toBeLessThanOrEqual(autonomyRank(b));
      expect(r).toBeLessThanOrEqual(autonomyRank(PACK_AUTONOMY_CEILING));
      if (c === false) expect(r).toBe(0);
    }
  });
});
