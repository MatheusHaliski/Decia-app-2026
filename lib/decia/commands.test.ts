import { describe, expect, it } from "vitest";
import { decide, DecisionLifecycleError, RecommendationStateError, recordOutcome, setRecommendationStatus, setStatus, setWeight } from "./commands";
import { buildDemoDecisions, DEMO_DECISION_IDS as D } from "./fixtures";
import type { DecisionAggregate } from "./types";
import { structureChanges, toDecisionCardViewModel } from "./view-model";

const NOW = new Date("2026-10-06T12:00:00Z");
const demo = () => Object.fromEntries(buildDemoDecisions(NOW).map((a) => [a.decision.id, a])) as Record<string, DecisionAggregate>;

/** Regressões da auditoria de 17/10/2026 (integridade do registro de decisão e controle da IA). */
describe("sugestão da IA só entra no registro enquanto a decisão é editável", () => {
  it("aceita/descarta a partir de SUGERIDA e registra o evento", () => {
    const arq = demo()[D.arquitetura]!;
    const next = setRecommendationStatus(arq, "arq-rec-2", "ACEITA", "u-pessoa", NOW);
    expect(next.recommendations.find((r) => r.id === "arq-rec-2")!.status).toBe("ACEITA");
    expect(next.events.at(-1)!.type).toBe("SUGESTAO_IA_ACEITA");
  });
  it("não alterna ACEITA ↔ DESCARTADA sem rastro, nem aceita id inexistente", () => {
    const arq = setRecommendationStatus(demo()[D.arquitetura]!, "arq-rec-2", "ACEITA", "u-pessoa", NOW);
    expect(() => setRecommendationStatus(arq, "arq-rec-2", "DESCARTADA", "u-pessoa", NOW)).toThrow(RecommendationStateError);
    expect(() => setRecommendationStatus(arq, "nao-existe", "ACEITA", "u-pessoa", NOW)).toThrow(RecommendationStateError);
  });
  it("depois de DECIDIDA, aceitar sugestão é recusado e o agregado não muda", () => {
    const decided = demo()[D.fornecedor]!;
    const withAi: DecisionAggregate = {
      ...decided,
      recommendations: [...decided.recommendations, { ...decided.recommendations[0]!, id: "ia-tardia", source: "IA", status: "SUGERIDA" }],
    };
    expect(() => setRecommendationStatus(withAi, "ia-tardia", "ACEITA", "u-pessoa", NOW)).toThrow(DecisionLifecycleError);
  });
});

describe("transições de estado validadas", () => {
  it("setStatus recusa salto e recusa DECIDIDA fora de decide()", () => {
    const nav = demo()[D.navegacao]!; // ENQUADRAMENTO
    expect(() => setStatus(nav, "DECIDIDA", "u-pessoa", NOW)).toThrow(DecisionLifecycleError);
    expect(() => setStatus(nav, "RESOLVIDA", "u-pessoa", NOW)).toThrow(DecisionLifecycleError);
    expect(setStatus(nav, "PESQUISA", "u-pessoa", NOW).decision.status).toBe("PESQUISA");
  });
  it("recordOutcome só a partir de estado que admite RESOLVIDA", () => {
    expect(() => recordOutcome(demo()[D.navegacao]!, { result: "SUCESSO", summary: "x" }, "u-pessoa", NOW)).toThrow(DecisionLifecycleError);
    expect(recordOutcome(demo()[D.fornecedor]!, { result: "SUCESSO", summary: "ok" }, "u-pessoa", NOW).decision.status).toBe("RESOLVIDA");
  });
});

describe("decide() não regride a versão", () => {
  it("versão final = inicial + um incremento por evento gravado (COMPARACAO → AGUARDANDO → DECIDIDA)", () => {
    const arq = demo()[D.arquitetura]!; // COMPARACAO: decide() percorre uma transição intermediária
    const result = decide(arq, { selectedAlternativeId: arq.alternatives[0]!.id, rationale: "Justificativa registrada pelo responsável.", confidencePct: 70, warningsConfirmed: true }, arq.decision.ownerUserId!, NOW);
    const added = result.aggregate.events.length - arq.events.length;
    expect(added).toBe(3);
    expect(result.aggregate.decision.version).toBe(arq.decision.version + added); // antes: regredia para +2
  });
});

describe("mudanças de estrutura ficam visíveis (sem alteração silenciosa de critérios)", () => {
  it("alterar peso aparece na trilha legível com critério, valor e autor", () => {
    const arq = demo()[D.arquitetura]!;
    const crit = arq.criteria[0]!;
    const next = setWeight(arq, crit.id, 35, "u-pessoa", NOW);
    const changes = structureChanges(next, { "u-pessoa": { name: "Pessoa Exemplo" } });
    expect(changes[0]).toMatchObject({ type: "CRITERIO_ATUALIZADO", subject: crit.name, value: 35, actor: "Pessoa Exemplo" });
    expect(toDecisionCardViewModel(next, NOW).changes[0]!.type).toBe("CRITERIO_ATUALIZADO");
  });
});
