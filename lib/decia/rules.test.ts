import { createHash } from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildDemoDecisions, DEMO_DECISION_IDS } from "./fixtures";
import {
  brier, calibration, canonicalJson, confidenceBand, decisionRisk, divergence, dominance, evidenceStrength, freshness, health, median,
  preDecisionGuard, r2, readiness, riskSeverity, scoreMatrix, scoreOf, sensitivity, sha256Hex, sha256HexAsync, snapConfidence,
  suggestComplexity, toScoringInput, verifySnapshot, type DecisionRiskInput, type EvidenceInput, type ScoringInput,
} from "./rules";
import type { DecisionAggregate, DecisionLevel, Likelihood } from "./types";

/** Vetores compartilhados com o Java (contracts/decia/vetores.json, gerados por gerar_vetores.py). */
const V = JSON.parse(fs.readFileSync(fileURLToPath(new URL("../../contracts/decia/vetores.json", import.meta.url)), "utf8"));
const NOW = new Date("2026-10-06T12:00:00Z");
const DAY = 86_400_000;
const iso = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();
const demo = () => Object.fromEntries(buildDemoDecisions(NOW).map((a) => [a.decision.id, a])) as Record<string, DecisionAggregate>;

describe("vetores compartilhados (decia-scoring-v1)", () => {
  it("versão do contrato", () => expect(V.version).toBe("decia-scoring-v1"));

  for (const c of V.scoring) it(`scoring › ${c.name}`, () => expect(scoreMatrix(c.input as ScoringInput)).toEqual(c.expected));
  for (const c of V.divergence) it(`divergence › ${c.name}`, () => expect(divergence(c.input as ScoringInput)).toEqual(c.expected));
  for (const c of V.dominance) it(`dominance › ${c.name}`, () => expect(dominance(c.input as ScoringInput)).toEqual(c.expected));
  for (const c of V.sensitivity) it(`sensitivity › ${c.name}`, () => expect(sensitivity(c.input as ScoringInput)).toEqual(c.expected));
  for (const c of V.evidenceStrength) it(`evidenceStrength › ${c.name}`, () => expect(evidenceStrength(c.input as EvidenceInput)).toEqual(c.expected));
  it(`riskSeverityMatrix › ${V.riskSeverityMatrix.length} células`, () => {
    expect(V.riskSeverityMatrix).toHaveLength(16);
    for (const c of V.riskSeverityMatrix as { likelihood: Likelihood; impact: DecisionLevel; expected: string }[]) expect(riskSeverity(c.likelihood, c.impact), `${c.likelihood}×${c.impact}`).toBe(c.expected);
  });
  for (const c of V.decisionRisk) it(`decisionRisk › ${c.name}`, () => expect(decisionRisk(c.input as DecisionRiskInput)).toBe(c.expected));
  for (const c of V.confidenceBand) it(`confidenceBand › ${c.pct}`, () => expect(confidenceBand(c.pct)).toBe(c.expected));
  for (const c of V.brier) it(`brier › ${c.name}`, () => expect(brier(c.input)).toEqual(c.expected));
  for (const c of V.snapshotHash) {
    it(`snapshotHash › ${c.name}: JSON canônico e SHA-256 (puro, Web Crypto e node:crypto)`, async () => {
      const json = canonicalJson(c.input);
      expect(json).toBe(c.canonical);
      expect(sha256Hex(json)).toBe(c.sha256);
      expect(await sha256HexAsync(json)).toBe(c.sha256);
      expect(createHash("sha256").update(json, "utf8").digest("hex")).toBe(c.sha256);
    });
  }
  it("todas as seções dos vetores foram exercitadas", () => {
    expect(Object.keys(V).sort()).toEqual(["brier", "confidenceBand", "decisionRisk", "divergence", "dominance", "evidenceStrength", "riskSeverityMatrix", "scoring", "sensitivity", "snapshotHash", "version"]);
  });
});

describe("primitivas", () => {
  it("r2 arredonda meio-para-cima com tolerância; mediana par usa a média dos centrais", () => {
    expect(r2(3.745)).toBe(3.75);
    expect(r2(0.125)).toBe(0.13);
    expect(r2(1.005)).toBe(1.01);
    expect(median([2, 3, 4, 5])).toBe(3.5);
    expect(median([5, 2, 5])).toBe(5);
  });
  it("SHA-256 puro bate com node:crypto em textos variados (vazio, UTF-8, > 1 bloco)", () => {
    for (const s of ["", "abc", "ação — decisão ✦", "x".repeat(200), "a".repeat(55), "a".repeat(56), "a".repeat(64)]) {
      expect(sha256Hex(s)).toBe(createHash("sha256").update(s, "utf8").digest("hex"));
    }
  });
  it("JSON canônico ordena chaves em profundidade e omite undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: "ç" }, u: undefined })).toBe('{"a":{"c":"ç","d":[1,{"y":2,"z":1}]},"b":1}');
  });
  it("confiança em passos de 5; complexidade sugerida (§4.4)", () => {
    expect(snapConfidence(72.43)).toBe(70);
    expect(snapConfidence(103)).toBe(100);
    expect(suggestComplexity({ impact: "ALTO" })).toBe("PROFUNDA");
    expect(suggestComplexity({ impact: "BAIXO", participants: 5 })).toBe("PROFUNDA");
    expect(suggestComplexity({ impact: "MEDIO" })).toBe("PADRAO");
    expect(suggestComplexity({ impact: "BAIXO", alternatives: 3 })).toBe("PADRAO");
    expect(suggestComplexity({ impact: "BAIXO" })).toBe("RAPIDA");
  });
  it("calibração por buckets", () => {
    const b = calibration([{ probabilityPct: 10, resolution: "NAO_OCORREU" }, { probabilityPct: 90, resolution: "OCORREU" }, { probabilityPct: 50, resolution: "PENDENTE" }]);
    expect(b.map((x) => x.n)).toEqual([1, 0, 0, 0, 1]);
    expect(b[4]).toMatchObject({ declared: 0.9, observed: 1 });
  });
});

describe("fixture de arquitetura reproduz o vetor arquitetura-ponderada", () => {
  it("mesmo ranking, contribuições, líder, divergência e sensibilidade", () => {
    const agg = demo()[DEMO_DECISION_IDS.arquitetura]!;
    const label = (id: string) => agg.alternatives.find((a) => a.id === id)!.label;
    const key = (id: string) => id.replace(/^arq-/, "");
    const sc = scoreOf(agg);
    const expected = V.scoring.find((c: { name: string }) => c.name === "arquitetura-ponderada").expected;
    expect(sc.ranking.map((r) => ({ alt: label(r.alt), score: r.score, contributions: Object.fromEntries(Object.entries(r.contributions).map(([k, v]) => [key(k), v])) }))).toEqual(expected.ranking);
    expect(label(sc.leader!)).toBe("A");
    expect(divergence(toScoringInput(agg)).map((d) => ({ ...d, alt: label(d.alt), crit: key(d.crit) }))).toEqual(V.divergence[0].expected);
    const sens = sensitivity(toScoringInput(agg));
    expect(sens.flips.map((f) => ({ ...f, criterion: key(f.criterion), newLeader: label(f.newLeader) }))).toEqual(V.sensitivity[0].expected.flips);
  });
});

describe("prontidão (§6.7)", () => {
  it("exemplos: arquitetura PRONTA_PARA_REVISAO com 2 alertas; sprint PRONTA_PARA_DECIDIR; UX NAO_PRONTA", () => {
    const d = demo();
    const arq = readiness(d[DEMO_DECISION_IDS.arquitetura]!);
    expect(arq.level).toBe("PRONTA_PARA_REVISAO");
    expect(arq.checks.filter((c) => c.state === "ALERTA").map((c) => c.key)).toEqual(["evidence", "assumptions"]);
    expect(readiness(d[DEMO_DECISION_IDS.sprint]!).level).toBe("PRONTA_PARA_DECIDIR");
    const ux = readiness(d[DEMO_DECISION_IDS.navegacao]!);
    expect(ux.level).toBe("NAO_PRONTA");
    expect(ux.checks.find((c) => c.key === "alternatives")!.state).toBe("FALTA");
  });
  it("pergunta precisa de ≥ 15 caracteres e terminar com '?'", () => {
    const agg = demo()[DEMO_DECISION_IDS.sprint]!;
    const r = readiness({ ...agg, decision: { ...agg.decision, question: "Qual escolher" } });
    expect(r.checks[0]).toEqual({ key: "question", state: "FALTA" });
    expect(r.level).toBe("NAO_PRONTA");
  });
  it("PROFUNDA: evidência fraca vira FALTA → PRECISA_DE_EVIDENCIA; RAPIDA não tem itens de matriz/evidência", () => {
    const agg = demo()[DEMO_DECISION_IDS.arquitetura]!;
    const deep: DecisionAggregate = {
      ...agg,
      decision: { ...agg.decision, complexity: "PROFUNDA" },
      assumptions: agg.assumptions.map((a) => ({ ...a, validationStatus: "VALIDADA" as const })),
    };
    expect(readiness(deep).level).toBe("PRECISA_DE_EVIDENCIA");
    const quick = readiness({ ...agg, decision: { ...agg.decision, complexity: "RAPIDA" } });
    expect(quick.checks.map((c) => c.key)).toEqual(["question", "owner", "alternatives", "criteria"]);
    expect(quick.level).toBe("PRONTA_PARA_DECIDIR");
  });
  it("PROFUNDA sem pesos válidos: critérios em FALTA", () => {
    const agg = demo()[DEMO_DECISION_IDS.sprint]!;
    expect(readiness({ ...agg, decision: { ...agg.decision, complexity: "PROFUNDA" } }).checks.find((c) => c.key === "criteria")!.state).toBe("FALTA");
  });
});

describe("guarda pré-decisão (§6.10)", () => {
  it("bloqueia sem alternativa, sem responsável, motivo curto e alternativa descartada", () => {
    const agg = demo()[DEMO_DECISION_IDS.arquitetura]!;
    expect(preDecisionGuard(agg, { selectedAlternativeId: null, rationale: "curto" })).toMatchObject({ code: "DECISAO_INCOMPLETA", blocking: ["SEM_ALTERNATIVA", "MOTIVO_CURTO"] });
    expect(preDecisionGuard({ ...agg, decision: { ...agg.decision, ownerUserId: null } }, { selectedAlternativeId: "arq-a", rationale: "motivo suficiente" }).blocking).toEqual(["SEM_RESPONSAVEL"]);
    expect(preDecisionGuard(agg, { selectedAlternativeId: "arq-d", rationale: "motivo suficiente" }).blocking).toEqual(["ALTERNATIVA_DESCARTADA"]);
  });
  it("avisa: prontidão incompleta, divergência alta, premissa crítica não validada, confiança alta × evidência fraca", () => {
    const agg = demo()[DEMO_DECISION_IDS.arquitetura]!;
    const g = preDecisionGuard(agg, { selectedAlternativeId: "arq-a", rationale: "Custo e tempo pesam mais agora.", confidencePct: 80 });
    expect(g.code).toBeNull();
    expect(g.warnings).toEqual(["PRONTIDAO_INCOMPLETA", "DIVERGENCIA_ALTA", "PREMISSA_CRITICA_NAO_VALIDADA", "CONFIANCA_ACIMA_DA_EVIDENCIA"]);
  });
  it("risco CRÍTICO aberto avisa; RAPIDA nunca recebe avisos de evidência/prontidão", () => {
    const agg = demo()[DEMO_DECISION_IDS.sprint]!;
    const crit: DecisionAggregate = { ...agg, risks: [...agg.risks, { id: "x", title: "x", likelihood: "QUASE_CERTA", impact: "CRITICO", source: "MANUAL", status: "ABERTO", origin: "HUMANO" }] };
    expect(preDecisionGuard(crit, { selectedAlternativeId: "spr-a", rationale: "maior valor agora" }).warnings).toContain("RISCO_CRITICO");
    const arq = demo()[DEMO_DECISION_IDS.arquitetura]!;
    const quick: DecisionAggregate = { ...arq, decision: { ...arq.decision, complexity: "RAPIDA" } };
    const w = preDecisionGuard(quick, { selectedAlternativeId: "arq-a", rationale: "motivo suficiente", confidencePct: 90 }).warnings;
    expect(w).not.toContain("CONFIANCA_ACIMA_DA_EVIDENCIA");
    expect(w).not.toContain("PRONTIDAO_INCOMPLETA");
  });
});

describe("frescor (§6.11) e saúde (§6.8)", () => {
  it("fornecedor: checkpoint em 5 dias → REVISAO_DEVIDA; só se aplica a DECIDIDA/EM_EXECUCAO/RESOLVIDA", () => {
    const d = demo();
    expect(freshness(d[DEMO_DECISION_IDS.fornecedor]!, NOW)).toBe("REVISAO_DEVIDA");
    expect(freshness(d[DEMO_DECISION_IDS.arquitetura]!, NOW)).toBeNull();
    expect(freshness(d[DEMO_DECISION_IDS.lancamento]!, NOW)).toBeNull(); // REVISADA
  });
  it("VENCIDA: checkpoint perdido, gatilho disparado sem tratamento, premissa crítica invalidada depois da decisão", () => {
    const base = demo()[DEMO_DECISION_IDS.fornecedor]!;
    const far = { ...base, checkpoints: [{ ...base.checkpoints[0]!, dueAt: iso(60) }] };
    expect(freshness(far, NOW)).toBe("FRESCA");
    expect(freshness({ ...far, checkpoints: [{ ...far.checkpoints[0]!, status: "PERDIDO" }] }, NOW)).toBe("VENCIDA");
    expect(freshness({ ...far, triggers: [{ ...far.triggers[0]!, status: "DISPARADO", firedAt: iso(-1) }] }, NOW)).toBe("VENCIDA");
    expect(freshness({ ...far, assumptions: [{ ...far.assumptions[0]!, importance: "CRITICO", validationStatus: "INVALIDADA", validatedAt: iso(-1) }] }, NOW)).toBe("VENCIDA");
  });
  it("REVISAO_DEVIDA por evidência nova depois do snapshot e por reviewEveryDays excedido", () => {
    const base = demo()[DEMO_DECISION_IDS.fornecedor]!;
    const far = { ...base, checkpoints: [{ ...base.checkpoints[0]!, dueAt: iso(60) }] };
    expect(freshness({ ...far, evidence: [...far.evidence, { ...far.evidence[0]!, id: "novo", addedAt: iso(-1) }] }, NOW)).toBe("REVISAO_DEVIDA");
    expect(freshness({ ...far, decision: { ...far.decision, reviewEveryDays: 7 } }, NOW)).toBe("REVISAO_DEVIDA");
  });
  it("saúde tem 5 componentes e nenhuma nota geral", () => {
    const h = health(demo()[DEMO_DECISION_IDS.arquitetura]!, NOW);
    expect(h.map((c) => c.key)).toEqual(["evidenceCoverage", "assumptionValidation", "alternativeCoverage", "stakeholderAlignment", "freshness"]);
    expect(h.map((c) => c.state)).toEqual(["ATENCAO", "FALTA", "OK", "ATENCAO", "OK"]);
    expect(h.find((c) => c.key === "freshness")!.applicable).toBe(false);
    expect(Object.keys(h[0]!)).not.toContain("total");
  });
});

describe("snapshots das fixtures", () => {
  it("o hash gravado bate com o JSON canônico; adulterar o conteúdo é detectado", () => {
    const snap = demo()[DEMO_DECISION_IDS.fornecedor]!.snapshots[0]!;
    expect(verifySnapshot(snap)).toBe(true);
    expect(verifySnapshot({ ...snap, contentJson: snap.contentJson.replace("for-b", "for-a") })).toBe(false);
    expect(JSON.parse(snap.contentJson).modelVersion).toBe("decia-scoring-v1");
  });
  it("Brier do lançamento (4 previsões resolvidas)", () => {
    expect(brier(demo()[DEMO_DECISION_IDS.lancamento]!.forecasts)).toEqual({ n: 4, brier: 0.2281 });
  });
});
