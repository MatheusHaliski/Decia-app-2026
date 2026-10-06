package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.decisao.AlternativeStatus;
import br.gov.pr.secid.workstation.domain.decisao.AssumptionStatus;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointStatus;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.ForecastResolution;
import br.gov.pr.secid.workstation.domain.decisao.TriggerStatus;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Regras do §6 sem vetor no contrato: guarda pré-decisão, prontidão por complexidade, frescor com relógio, saúde, calibração e canonização. */
class DecisionRulesTest {

    private static final Instant NOW = Instant.parse("2026-10-06T12:00:00Z");
    private static final Freshness FRESHNESS = new Freshness(Clock.fixed(NOW, ZoneOffset.UTC));
    private static final String QUESTION = "Qual provedor de nuvem usar?";

    // ------------------------------------------------------------------------------------------------------- guarda §6.10

    private static PreDecisionGuard.Input guardInput(DecisionComplexity cx, AlternativeStatus selected, boolean owner, String rationale,
                                                     Readiness.Level readiness, boolean criticalRisk, boolean divergence, boolean assumption,
                                                     Integer confidence, EvidenceStrength.Level evidence) {
        return new PreDecisionGuard.Input(cx, selected, owner, rationale, readiness, criticalRisk, divergence, assumption, confidence, evidence);
    }

    @Test
    void guardaBloqueiaOsQuatroErros() {
        PreDecisionGuard.Result r = PreDecisionGuard.check(guardInput(DecisionComplexity.PADRAO, null, false, "curto", Readiness.Level.PRONTA_PARA_DECIDIR,
                false, false, false, null, EvidenceStrength.Level.FORTE));
        assertThat(r.blocking()).containsExactly(PreDecisionGuard.Block.SEM_ALTERNATIVA_SELECIONADA, PreDecisionGuard.Block.SEM_RESPONSAVEL,
                PreDecisionGuard.Block.MOTIVO_VAZIO);
        assertThat(r.canDecide(true)).isFalse();
        PreDecisionGuard.Result discarded = PreDecisionGuard.check(guardInput(DecisionComplexity.RAPIDA, AlternativeStatus.DESCARTADA, true,
                "   motivo   ", null, false, false, false, null, null));
        assertThat(discarded.blocking()).containsExactly(PreDecisionGuard.Block.ALTERNATIVA_DESCARTADA, PreDecisionGuard.Block.MOTIVO_VAZIO);
        assertThat(PreDecisionGuard.check(guardInput(DecisionComplexity.RAPIDA, AlternativeStatus.ATIVA, true, "0123456789", null, false, false, false,
                null, null)).blocking()).as("10 caracteres bastam").isEmpty();
    }

    @Test
    void guardaAvisaEExigeConfirmacao() {
        PreDecisionGuard.Result r = PreDecisionGuard.check(guardInput(DecisionComplexity.PROFUNDA, AlternativeStatus.ATIVA, true, "motivo bem explicado",
                Readiness.Level.PRONTA_PARA_REVISAO, true, true, true, 80, EvidenceStrength.Level.FRACA));
        assertThat(r.blocking()).isEmpty();
        assertThat(r.warnings()).containsExactly(PreDecisionGuard.Warning.PRONTIDAO_INCOMPLETA, PreDecisionGuard.Warning.RISCO_CRITICO_ABERTO,
                PreDecisionGuard.Warning.DIVERGENCIA_ALTA_ABERTA, PreDecisionGuard.Warning.PREMISSA_CRITICA_NAO_VALIDADA,
                PreDecisionGuard.Warning.CONFIANCA_ACIMA_DA_EVIDENCIA);
        assertThat(r.canDecide(false)).isFalse();
        assertThat(r.canDecide(true)).isTrue();
        assertThatThrownBy(() -> r.enforce(false)).hasMessageContaining(PreDecisionGuard.AVISOS_NAO_CONFIRMADOS);
        r.enforce(true);

        PreDecisionGuard.Result ok = PreDecisionGuard.check(guardInput(DecisionComplexity.PADRAO, AlternativeStatus.ATIVA, true, "motivo bem explicado",
                Readiness.Level.PRONTA_PARA_DECIDIR, false, false, false, 80, EvidenceStrength.Level.MODERADA));
        assertThat(ok.warnings()).as("confiança ALTA com evidência MODERADA não avisa").isEmpty();
        assertThat(ok.canDecide(false)).isTrue();
    }

    @Test
    void rapidaNuncaRecebeAvisosDeEvidencia() {
        PreDecisionGuard.Result quick = PreDecisionGuard.check(guardInput(DecisionComplexity.RAPIDA, AlternativeStatus.ATIVA, true, "motivo bem explicado",
                Readiness.Level.PRECISA_DE_EVIDENCIA, false, false, false, 90, EvidenceStrength.Level.FRACA));
        assertThat(quick.warnings()).isEmpty();
        PreDecisionGuard.Result standard = PreDecisionGuard.check(guardInput(DecisionComplexity.PADRAO, AlternativeStatus.ATIVA, true,
                "motivo bem explicado", Readiness.Level.PRONTA_PARA_DECIDIR, false, false, false, 90, null));
        assertThat(standard.warnings()).containsExactly(PreDecisionGuard.Warning.CONFIANCA_ACIMA_DA_EVIDENCIA);
    }

    // --------------------------------------------------------------------------------------------------- prontidão §6.7

    private static Readiness.Input readiness(DecisionComplexity cx, String question, int alternatives, int criteria, String keyText, boolean weights,
                                             boolean matrix, boolean evidence, boolean assumptions, boolean risks) {
        return new Readiness.Input(cx, question, true, alternatives, criteria, keyText, weights, matrix, evidence, assumptions, risks);
    }

    @Test
    void prontidaoRapida() {
        Readiness.Result r = Readiness.evaluate(readiness(DecisionComplexity.RAPIDA, QUESTION, 2, 0, "custo", false, false, false, false, false));
        assertThat(r.level()).isEqualTo(Readiness.Level.PRONTA_PARA_DECIDIR);
        assertThat(r.checklist()).containsOnlyKeys(Readiness.Item.PERGUNTA, Readiness.Item.RESPONSAVEL, Readiness.Item.ALTERNATIVAS,
                Readiness.Item.CRITERIOS);
        assertThat(Readiness.evaluate(readiness(DecisionComplexity.RAPIDA, QUESTION, 2, 0, " ", false, false, false, false, false)).level())
                .isEqualTo(Readiness.Level.NAO_PRONTA);
        assertThat(Readiness.evaluate(readiness(DecisionComplexity.RAPIDA, QUESTION, 1, 1, null, false, false, false, false, false)).level())
                .isEqualTo(Readiness.Level.NAO_PRONTA);
        assertThat(Readiness.evaluate(new Readiness.Input(DecisionComplexity.RAPIDA, QUESTION, false, 2, 1, null, false, false, false, false, false))
                .checklist()).containsEntry(Readiness.Item.RESPONSAVEL, Readiness.Check.FALTA);
    }

    @Test
    void prontidaoPadraoAlertaEmEvidenciaPremissasERiscos() {
        Readiness.Result r = Readiness.evaluate(readiness(DecisionComplexity.PADRAO, QUESTION, 3, 2, null, false, true, false, false, false));
        assertThat(r.level()).isEqualTo(Readiness.Level.PRONTA_PARA_REVISAO);
        assertThat(r.checklist()).containsEntry(Readiness.Item.EVIDENCIA, Readiness.Check.ALERTA).containsEntry(Readiness.Item.PREMISSAS,
                Readiness.Check.ALERTA).containsEntry(Readiness.Item.RISCOS, Readiness.Check.ALERTA);
        assertThat(Readiness.evaluate(readiness(DecisionComplexity.PADRAO, QUESTION, 3, 2, null, false, true, true, true, true)).level())
                .isEqualTo(Readiness.Level.PRONTA_PARA_DECIDIR);
        assertThat(Readiness.evaluate(readiness(DecisionComplexity.PADRAO, QUESTION, 3, 1, null, false, true, true, true, true)).level())
                .as("PADRAO exige ≥ 2 critérios").isEqualTo(Readiness.Level.NAO_PRONTA);
        assertThat(Readiness.evaluate(readiness(DecisionComplexity.PADRAO, QUESTION, 3, 2, null, false, false, true, true, true)).level())
                .as("matriz incompleta").isEqualTo(Readiness.Level.NAO_PRONTA);
    }

    @Test
    void prontidaoProfundaExigeTudo() {
        assertThat(Readiness.evaluate(readiness(DecisionComplexity.PROFUNDA, QUESTION, 3, 3, null, true, true, false, true, true)).level())
                .isEqualTo(Readiness.Level.PRECISA_DE_EVIDENCIA);
        assertThat(Readiness.evaluate(readiness(DecisionComplexity.PROFUNDA, QUESTION, 3, 3, null, false, true, true, true, true)).level())
                .as("PROFUNDA exige pesos válidos").isEqualTo(Readiness.Level.NAO_PRONTA);
        assertThat(Readiness.evaluate(readiness(DecisionComplexity.PROFUNDA, QUESTION, 3, 3, null, true, true, true, false, true)).level())
                .isEqualTo(Readiness.Level.NAO_PRONTA);
        assertThat(Readiness.evaluate(readiness(DecisionComplexity.PROFUNDA, QUESTION, 3, 3, null, true, true, true, true, true)).level())
                .isEqualTo(Readiness.Level.PRONTA_PARA_DECIDIR);
    }

    @Test
    void perguntaDefinida() {
        assertThat(Readiness.questionDefined(QUESTION)).isTrue();
        assertThat(Readiness.questionDefined("  Usar Railway?  ")).as("< 15 caracteres").isFalse();
        assertThat(Readiness.questionDefined("Qual provedor de nuvem usar")).as("sem ?").isFalse();
        assertThat(Readiness.questionDefined(null)).isFalse();
    }

    // ----------------------------------------------------------------------------------------------------- frescor §6.11

    private static Freshness.Input fresh(DecisionLifecycle status, List<Freshness.Checkpoint> cps, List<Freshness.Trigger> triggers,
                                         List<Freshness.Assumption> assumptions, Instant lastEvidence, Integer reviewEveryDays) {
        Instant decided = NOW.minus(Duration.ofDays(20));
        return new Freshness.Input(status, decided, decided, lastEvidence, reviewEveryDays, cps, triggers, assumptions);
    }

    @Test
    void frescorSoParaDecisoesDecididas() {
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.COMPARACAO, List.of(), List.of(), List.of(), null, null))).isEmpty();
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.REVISADA, List.of(), List.of(), List.of(), null, null))).isEmpty();
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.DECIDIDA, List.of(), List.of(), List.of(), null, null))).contains(Freshness.Level.FRESCA);
    }

    @Test
    void frescorVencida() {
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.EM_EXECUCAO, List.of(new Freshness.Checkpoint(CheckpointStatus.PERDIDO, NOW, null)),
                List.of(), List.of(), null, null))).contains(Freshness.Level.VENCIDA);
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.EM_EXECUCAO, List.of(), List.of(new Freshness.Trigger(TriggerStatus.DISPARADO, false)),
                List.of(), null, null))).contains(Freshness.Level.VENCIDA);
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.EM_EXECUCAO, List.of(), List.of(new Freshness.Trigger(TriggerStatus.DISPARADO, true)),
                List.of(), null, null))).as("gatilho tratado").contains(Freshness.Level.FRESCA);
        Freshness.Assumption after = new Freshness.Assumption(DecisionLevel.CRITICO, AssumptionStatus.INVALIDADA, NOW.minus(Duration.ofDays(1)));
        Freshness.Assumption before = new Freshness.Assumption(DecisionLevel.CRITICO, AssumptionStatus.INVALIDADA, NOW.minus(Duration.ofDays(30)));
        Freshness.Assumption notCritical = new Freshness.Assumption(DecisionLevel.ALTO, AssumptionStatus.INVALIDADA, NOW.minus(Duration.ofDays(1)));
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.RESOLVIDA, List.of(), List.of(), List.of(after), null, null)))
                .contains(Freshness.Level.VENCIDA);
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.RESOLVIDA, List.of(), List.of(), List.of(before, notCritical), null, null)))
                .contains(Freshness.Level.FRESCA);
    }

    @Test
    void frescorRevisaoDevida() {
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.DECIDIDA, List.of(new Freshness.Checkpoint(CheckpointStatus.AGENDADO,
                NOW.plus(Duration.ofDays(7)), null)), List.of(), List.of(), null, null))).contains(Freshness.Level.REVISAO_DEVIDA);
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.DECIDIDA, List.of(new Freshness.Checkpoint(CheckpointStatus.AGENDADO,
                NOW.plus(Duration.ofDays(8)), null)), List.of(), List.of(), null, null))).contains(Freshness.Level.FRESCA);
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.DECIDIDA, List.of(), List.of(), List.of(), NOW, null)))
                .as("evidência nova depois do snapshot").contains(Freshness.Level.REVISAO_DEVIDA);
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.DECIDIDA, List.of(), List.of(), List.of(), null, 14)))
                .as("revisão a cada 14 dias, decidida há 20").contains(Freshness.Level.REVISAO_DEVIDA);
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.DECIDIDA, List.of(new Freshness.Checkpoint(CheckpointStatus.CONCLUIDO,
                NOW.minus(Duration.ofDays(5)), NOW.minus(Duration.ofDays(5)))), List.of(), List.of(), null, 14)))
                .as("checkpoint concluído há 5 dias renova a revisão").contains(Freshness.Level.FRESCA);
        assertThat(FRESHNESS.evaluate(fresh(DecisionLifecycle.DECIDIDA, List.of(), List.of(), List.of(), null, 30))).contains(Freshness.Level.FRESCA);
    }

    // --------------------------------------------------------------------------------------------------------- saúde §6.8

    @Test
    void saudeSemNotaGeral() {
        Map<Health.Component, Health.Status> h = Health.components(new Health.Input(5, 4, 2, 1, 3, true, false, Freshness.Level.REVISAO_DEVIDA));
        assertThat(h).containsOnlyKeys(Health.Component.values());
        assertThat(h).containsEntry(Health.Component.EVIDENCE_COVERAGE, Health.Status.OK)
                .containsEntry(Health.Component.ASSUMPTION_VALIDATION, Health.Status.ATENCAO)
                .containsEntry(Health.Component.ALTERNATIVE_COVERAGE, Health.Status.OK)
                .containsEntry(Health.Component.STAKEHOLDER_ALIGNMENT, Health.Status.OK)
                .containsEntry(Health.Component.FRESHNESS, Health.Status.ATENCAO);
        Map<Health.Component, Health.Status> weak = Health.components(new Health.Input(0, 0, 0, 0, 3, false, true, Freshness.Level.VENCIDA));
        assertThat(weak).containsEntry(Health.Component.EVIDENCE_COVERAGE, Health.Status.FALTA)
                .containsEntry(Health.Component.ASSUMPTION_VALIDATION, Health.Status.OK)
                .containsEntry(Health.Component.ALTERNATIVE_COVERAGE, Health.Status.FALTA)
                .containsEntry(Health.Component.STAKEHOLDER_ALIGNMENT, Health.Status.FALTA)
                .containsEntry(Health.Component.FRESHNESS, Health.Status.FALTA);
        assertThat(Health.components(new Health.Input(10, 4, 0, 0, 2, true, false, null)))
                .containsEntry(Health.Component.EVIDENCE_COVERAGE, Health.Status.FALTA).containsEntry(Health.Component.FRESHNESS, Health.Status.OK);
        assertThat(Health.ratio(0.5)).isEqualTo(Health.Status.ATENCAO);
        assertThat(Health.ratio(0.8)).isEqualTo(Health.Status.OK);
    }

    // ----------------------------------------------------------------------------------------- confiança e calibração §6.9

    @Test
    void confiancaECalibracao() {
        assertThatThrownBy(() -> ConfidenceBand.of(72)).hasMessageContaining("passos de 5");
        assertThat(Calibration.brier(List.of(new Calibration.Forecast(60, ForecastResolution.PENDENTE)))).isEqualTo(new Calibration.BrierResult(0, null));
        assertThat(new Calibration.BrierResult(10, 0.2).showable()).isTrue();
        assertThat(new Calibration.BrierResult(9, 0.2).showable()).isFalse();
        List<Calibration.Bucket> buckets = Calibration.buckets(List.of(new Calibration.Forecast(10, ForecastResolution.NAO_OCORREU),
                new Calibration.Forecast(90, ForecastResolution.OCORREU), new Calibration.Forecast(85, ForecastResolution.NAO_OCORREU),
                new Calibration.Forecast(50, ForecastResolution.ANULADA)));
        assertThat(buckets).extracting(Calibration.Bucket::n).containsExactly(1, 0, 0, 0, 2);
        assertThat(buckets.get(4).meanDeclared()).isEqualTo(0.875);
        assertThat(buckets.get(4).observedFrequency()).isEqualTo(0.5);
        assertThat(buckets.get(2).meanDeclared()).isNull();
    }

    // ------------------------------------------------------------------------------------------------ matriz: casos de borda

    @Test
    void matrizCasosDeBorda() {
        MatrixInput semPeso = new MatrixInput(true, List.of(new MatrixInput.Criterion("x", null), new MatrixInput.Criterion("y", 100.0)),
                List.of(new MatrixInput.Alternative("A", true)), List.of());
        WeightedScoring.Result r = WeightedScoring.score(semPeso);
        assertThat(r.valid()).isFalse();
        assertThat(r.reason()).isEqualTo(WeightedScoring.PESO_INVALIDO);
        assertThat(r.weightSum()).isNull();
        assertThat(SensitivityAnalysis.analyze(semPeso).applicable()).isFalse();
        assertThatThrownBy(() -> WeightedScoring.median(List.of())).isInstanceOf(IllegalArgumentException.class);
        assertThat(WeightedScoring.r2(2.675)).as("meio-para-cima com folga de 1e-9").isEqualTo(2.68);

        // um critério com 100 %: nada a redistribuir → robusta
        MatrixInput robusta = new MatrixInput(true, List.of(new MatrixInput.Criterion("x", 100.0), new MatrixInput.Criterion("y", 0.0)),
                List.of(new MatrixInput.Alternative("A", true), new MatrixInput.Alternative("B", true)),
                List.of(new MatrixInput.Assessment("A", "x", 5, "u"), new MatrixInput.Assessment("A", "y", 5, "u"),
                        new MatrixInput.Assessment("B", "x", 1, "u"), new MatrixInput.Assessment("B", "y", 1, "u")));
        SensitivityAnalysis.Result s = SensitivityAnalysis.analyze(robusta);
        assertThat(s.applicable()).isTrue();
        assertThat(s.robust()).isTrue();
        assertThat(s.sensitive()).isFalse();
        assertThat(DominanceAnalysis.analyze(robusta)).singleElement().satisfies(d -> assertThat(d.betterOn()).containsExactly("x", "y"));
        assertThat(DivergenceAnalysis.level(2)).isEqualTo(DivergenceAnalysis.Level.MODERADA);
        assertThat(DivergenceAnalysis.level(1)).isEqualTo(DivergenceAnalysis.Level.BAIXA);
        assertThat(DivergenceAnalysis.hasHigh(robusta)).isFalse();
        assertThat(WeightedScoring.score(robusta).technicalTie()).isFalse();
    }

    // ---------------------------------------------------------------------------------------------------- canonização §6.12

    @Test
    void canonizacaoComoJsonDumpsDoPython() {
        Map<String, Object> m = new TreeMap<>();
        m.put("b", List.of(1, 2L, 1.0, 0.5, 1e-5, 1e16, 123456789012345.0, -0.0, true, false));
        m.put("a", "aspas \" barra \\ nova\nlinha\ttab \u0001 ç ✦");
        m.put("c", null);
        m.put("d", DecisionLevel.ALTO);
        assertThat(SnapshotCanonicalizer.canonical(m)).isEqualTo(
                "{\"a\":\"aspas \\\" barra \\\\ nova\\nlinha\\ttab \\u0001 ç ✦\",\"b\":[1,2,1.0,0.5,1e-05,1e+16,123456789012345.0,-0.0,true,false],"
                        + "\"c\":null,\"d\":\"ALTO\"}");
        assertThat(SnapshotCanonicalizer.canonicalizeJson("{ \"z\": 105.0, \"y\": [70, 3.80], \"x\": 1E+2 }"))
                .isEqualTo("{\"x\":100.0,\"y\":[70,3.8],\"z\":105.0}");
        assertThat(SnapshotCanonicalizer.compareCodePoints("￿", "😀")).as("ponto de código, não UTF-16").isNegative();
        assertThat(SnapshotCanonicalizer.number(java.math.BigInteger.TEN)).isEqualTo("10");
        assertThat(SnapshotCanonicalizer.pythonFloat(0.0001)).isEqualTo("0.0001");
        assertThatThrownBy(() -> SnapshotCanonicalizer.pythonFloat(Double.NaN)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SnapshotCanonicalizer.canonical(Map.of(1, "x"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SnapshotCanonicalizer.canonical(new Object())).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void forcaDaEvidenciaCasosDeBorda() {
        EvidenceStrength.Result onlyContext = EvidenceStrength.of("A", List.of(new EvidenceStrength.Item(
                br.gov.pr.secid.workstation.domain.decisao.EvidenceNature.FATO, br.gov.pr.secid.workstation.domain.decisao.RelevanceLevel.ALTA, "s",
                false, List.of(new EvidenceStrength.Link("A", br.gov.pr.secid.workstation.domain.decisao.EvidenceStance.CONTEXTO)))));
        assertThat(onlyContext.reason()).isEqualTo(EvidenceStrength.SEM_EVIDENCIA);
        assertThat(onlyContext.atLeastModerate()).isFalse();
        assertThat(new EvidenceStrength.Result(EvidenceStrength.Level.MODERADA, 3, 0, null).atLeastModerate()).isTrue();
    }
}
