import { describe, expect, it } from "vitest";
import { addAlternative, addCriteria, addEvidence, createDecision, decide, DecisionIncompleteError, setScore, setWeight } from "./commands";
import { buildDemoDecisions, buildEdgeCases, DEMO_DECISION_IDS, DEMO_PEOPLE } from "./fixtures";
import { createMemoryRepository } from "./repository";
import { scoreOf, verifySnapshot } from "./rules";
import { toDecisionCardViewModel } from "./view-model";

const NOW = new Date("2026-10-06T12:00:00Z");
const byId = () => Object.fromEntries(buildDemoDecisions(NOW).map((a) => [a.decision.id, a]));
const vm = (id: string, includeBack = true) => toDecisionCardViewModel(byId()[id]!, NOW, { people: DEMO_PEOPLE, includeBack });

describe("toDecisionCardViewModel (04 §3)", () => {
  it("arquitetura: lidera A 3,8, confiança MÉDIA, evidência FRACA, risco ALTO, pronta para revisão, verso sensível", () => {
    const v = vm(DEMO_DECISION_IDS.arquitetura);
    expect(v).toMatchObject({
      status: "COMPARACAO", owner: { id: "u-pessoa", name: "Pessoa Exemplo" }, daysToDeadline: 24, selectedAlternative: null,
      leadingAlternative: { label: "A", title: "Railway", score: 3.8 }, confidence: { pct: 60, band: "MEDIA" },
      evidenceStrength: { level: "FRACA", reason: null }, risk: "ALTO", impact: "ALTO", overdue: false, criticalRisk: false, freshness: null,
      recommendation: { source: "MODELO", label: "A — Railway" },
    });
    expect(v.readiness.level).toBe("PRONTA_PARA_REVISAO");
    expect(v.back!.sensitivity).toMatchObject({ criterionName: "Custo", fromPct: 20, toPct: 17, newLeaderLabel: "B" });
    expect(v.back!.rejectedAlternative).toMatchObject({ label: "D", title: "Adiar a migração" });
    expect(v.back!.keyCriteria.map((c) => c.name)).toEqual(["Segurança", "Escalabilidade"]);
    expect(v.back!.principalRisk).toMatchObject({ title: "Limite de região do provedor", severity: "ALTO" });
    expect(v.back!.topEvidence[0]!.title).toBe("Teste de carga no ambiente de homologação");
    expect(v.timeline.map((t) => t.status)).toEqual(["RASCUNHO", "ENQUADRAMENTO", "PESQUISA", "COMPARACAO"]);
    expect(v.nextAction).toEqual({ key: "decia.next.evidenceFor", vars: { criterion: "Tempo de implantação" } });
  });

  it("modo leve (COMPACT/STANDARD) não monta o verso nem a sensibilidade", () => {
    expect(vm(DEMO_DECISION_IDS.arquitetura, false).back).toBeNull();
  });

  it("decidida mostra a escolhida, frescor e próximo checkpoint; revisada mostra resultado", () => {
    const f = vm(DEMO_DECISION_IDS.fornecedor);
    expect(f.selectedAlternative).toEqual({ label: "B", title: "Fornecedor Beta (demo)" });
    expect(f.freshness).toBe("REVISAO_DEVIDA");
    expect(f.overdue).toBe(false); // prazo vencido, mas já decidida
    expect(f.nextAction).toEqual({ key: "decia.next.checkpoint", vars: { days: 5 } });
    expect(vm(DEMO_DECISION_IDS.lancamento).outcome).toBe("PARCIAL");
  });

  it("casos de borda: atrasada, risco crítico, confiança baixa, alta × fraca, sem opção, arquivada, muitas alternativas", () => {
    const e = buildEdgeCases(NOW);
    const m = (a: typeof e.overdue) => toDecisionCardViewModel(a, NOW, { people: DEMO_PEOPLE });
    expect(m(e.overdue).overdue).toBe(true);
    expect(m(e.riskCritical)).toMatchObject({ risk: "CRITICO", criticalRisk: true });
    expect(m(e.riskHigh).risk).toBe("ALTO");
    expect(m(e.lowConfidence).confidence).toEqual({ pct: 25, band: "BAIXA" });
    expect(m(e.highConfWeakEvidence)).toMatchObject({ overconfident: true, evidenceStrength: { level: "FRACA", reason: "SEM_EVIDENCIA" } });
    expect(m(e.noOption)).toMatchObject({ leadingAlternative: null, selectedAlternative: null });
    expect(m(e.archived).archived).toBe(true);
    expect(m(e.many).alternativesCount).toBe(8);
    expect(m(e.resolved).outcome).toBe("SUCESSO");
    expect(m(e.noEvidence).risk).toBe("NAO_AVALIADO");
  });
});

describe("comandos e repositório em memória", () => {
  it("criar decisão com modelo adiciona critérios; repositório notifica assinantes", () => {
    const repo = createMemoryRepository(buildDemoDecisions(NOW));
    let calls = 0;
    const off = repo.subscribe(() => calls++);
    const agg = repo.create({ question: "Qual ferramenta de chat devemos adotar?", complexity: "PADRAO", impact: "MEDIO", templateKey: "fornecedor", ownerUserId: "u-pessoa" }, NOW);
    expect(agg.decision.id.startsWith("d-nova-")).toBe(true);
    expect(agg.decision.status).toBe("RASCUNHO");
    expect(agg.criteria.map((c) => c.name)).toEqual(["Custo", "Qualidade do serviço", "Prazo", "Risco de transição"]);
    expect(repo.list()[0]).toBe(agg);
    expect(calls).toBe(1);
    off();
    repo.save({ ...agg, decision: { ...agg.decision, title: "x" } });
    expect(calls).toBe(1);
    expect(repo.get(agg.decision.id)!.decision.title).toBe("x");
  });

  it("nota, peso, alternativa e evidência geram eventos e nova versão", () => {
    const agg = byId()[DEMO_DECISION_IDS.arquitetura]!;
    const a1 = setScore(agg, "arq-a", "arq-seguranca", "u-pessoa", 5, NOW);
    expect(a1.decision.version).toBe(agg.decision.version + 1);
    expect(scoreOf(a1).ranking[0]!.score).toBe(4.4);
    const a2 = setWeight(a1, "arq-custo", 25, "u-pessoa", NOW);
    expect(scoreOf(a2)).toMatchObject({ valid: false, reason: "PESOS_NAO_SOMAM_100", weightSum: 105 });
    const a3 = addAlternative(a2, { title: "Nova opção" }, "u-pessoa", NOW);
    expect(a3.alternatives.at(-1)).toMatchObject({ label: "E", title: "Nova opção" });
    const a4 = addEvidence(a3, { title: "Benchmark", nature: "FATO", sourceLabel: "lab", reliability: "ALTA", altId: "arq-a", stance: "SUSTENTA" }, "u-pessoa", NOW);
    expect(a4.evidenceLinks.at(-1)).toMatchObject({ targetId: "arq-a", stance: "SUSTENTA" });
    const a5 = addCriteria(a4, ["Suporte"], "u-pessoa", NOW);
    expect(a5.events.slice(-5).map((e) => e.type)).toEqual(["DECISION_COMPARED", "CRITERION_CHANGED", "ALTERNATIVE_ADDED", "EVIDENCE_ADDED", "CRITERION_CHANGED"]);
    expect(createDecision({ question: "Qual?", complexity: "RAPIDA", impact: "BAIXO", ownerUserId: "u" }, NOW).criteria).toEqual([]);
  });

  it("decidir: bloqueios lançam DECISAO_INCOMPLETA, avisos exigem confirmação, snapshot é verificável e o estado vira DECIDIDA", () => {
    const agg = byId()[DEMO_DECISION_IDS.arquitetura]!;
    expect(() => decide(agg, { selectedAlternativeId: "arq-a", rationale: "curto" }, "u-pessoa", NOW)).toThrow(DecisionIncompleteError);
    expect(() => decide(agg, { selectedAlternativeId: "arq-a", rationale: "Custo e tempo pesam mais agora." }, "u-pessoa", NOW)).toThrow(/DECISAO_AVISOS_NAO_CONFIRMADOS/);
    const { aggregate, snapshot } = decide(agg, { selectedAlternativeId: "arq-a", rationale: "Custo e tempo pesam mais agora.", confidencePct: 62, warningsConfirmed: true }, "u-pessoa", NOW);
    expect(aggregate.decision).toMatchObject({ status: "DECIDIDA", selectedAlternativeId: "arq-a", decisionConfidencePct: 60 });
    expect(snapshot).toMatchObject({ kind: "DECISAO", versionNumber: 1, selectedAlternativeLabel: "A", confidencePct: 60 });
    expect(verifySnapshot(snapshot)).toBe(true);
    expect(aggregate.events.at(-1)!.payload).toEqual({ to: "DECIDIDA" });
    // mudar a matriz depois não reescreve o passado
    const later = setScore(aggregate, "arq-b", "arq-seguranca", "u-pessoa", 1, NOW);
    expect(later.snapshots[0]!.contentSha256).toBe(snapshot.contentSha256);
  });
});
