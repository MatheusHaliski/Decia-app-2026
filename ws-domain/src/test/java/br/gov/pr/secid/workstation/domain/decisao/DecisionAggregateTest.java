package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.DomainRuleException;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.analise.EvidenceStrength;
import br.gov.pr.secid.workstation.domain.decisao.analise.PreDecisionGuard;
import br.gov.pr.secid.workstation.domain.decisao.analise.Readiness;
import br.gov.pr.secid.workstation.domain.decisao.analise.SnapshotCanonicalizer;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Invariantes dos records do contexto 5b: decidir/reabrir, limites numéricos, snapshot à prova de adulteração e recomendação com os 4 porquês. */
class DecisionAggregateTest {

    private static final Instant NOW = Instant.parse("2026-10-06T12:00:00Z");
    private static final UUID OWNER = UUID.randomUUID();
    private static final UUID OTHER = UUID.randomUUID();
    private static final UUID ALT = UUID.randomUUID();
    private static final PreDecisionGuard.Facts CLEAN = facts(ALT, false, EvidenceStrength.Level.FORTE);

    private static PreDecisionGuard.Facts facts(UUID alt, boolean criticalRisk, EvidenceStrength.Level evidence) {
        return new PreDecisionGuard.Facts(alt, AlternativeStatus.ATIVA, Readiness.Level.PRONTA_PARA_DECIDIR, criticalRisk, false, false, evidence);
    }

    private static Decision decision(DecisionLifecycle status, Integer confidence) {
        return new Decision(UUID.randomUUID(), "Nuvem da API", "Qual provedor de nuvem usar para a API?", null, null, null, null, null, null, null,
                null, OWNER, OWNER, UUID.randomUUID(), null, null, null, null, null, status, DecisionComplexity.PADRAO, DecisionKind.TATICA,
                DecisionLevel.ALTO, DecisionLevel.MEDIO, Visibility.PRIVADA, AccessClassification.INTERNO, true, true, null, null, null, confidence, null,
                null);
    }

    @Test
    void decidirSoPeloGuardaESoPeloResponsavel() {
        Decision waiting = decision(DecisionLifecycle.AGUARDANDO_DECISAO, null);
        assertThatThrownBy(() -> waiting.transition(DecisionLifecycle.DECIDIDA)).isInstanceOf(DomainRuleException.class)
                .hasMessageContaining("DECISAO_EXIGE_GUARDA");
        assertThatThrownBy(() -> waiting.decide(OTHER, false, ALT, "motivo bem explicado", 70, CLEAN, false, NOW))
                .hasMessageContaining("DECISAO_SO_RESPONSAVEL");

        assertThatThrownBy(() -> waiting.decide(OWNER, false, ALT, "curto", 70, CLEAN, true, NOW))
                .as("o motivo validado é o motivo gravado")
                .isInstanceOfSatisfying(DomainRuleException.class, e -> {
                    assertThat(e.getCode()).isEqualTo(PreDecisionGuard.DECISAO_INCOMPLETA);
                    assertThat(e.getDetails()).containsExactly("MOTIVO_VAZIO");
                });
        assertThatThrownBy(() -> waiting.decide(OWNER, false, null, "motivo bem explicado", 70, CLEAN, true, NOW))
                .isInstanceOfSatisfying(DomainRuleException.class, e -> assertThat(e.getDetails()).contains("SEM_ALTERNATIVA_SELECIONADA"));
        assertThatThrownBy(() -> waiting.decide(OWNER, false, ALT, "motivo bem explicado", 70, facts(UUID.randomUUID(), false,
                EvidenceStrength.Level.FORTE), true, NOW)).as("fatos de outra alternativa").hasMessageContaining("DECISAO_FATOS_DIVERGENTES");
        assertThatThrownBy(() -> waiting.decide(OWNER, false, ALT, "motivo bem explicado", 90, facts(ALT, false, EvidenceStrength.Level.FRACA),
                false, NOW)).as("a confiança validada é a confiança gravada").isInstanceOfSatisfying(DomainRuleException.class, e -> {
                    assertThat(e.getCode()).isEqualTo(PreDecisionGuard.AVISOS_NAO_CONFIRMADOS);
                    assertThat(e.getDetails()).containsExactly("CONFIANCA_ACIMA_DA_EVIDENCIA");
                });
        PreDecisionGuard.Facts warned = facts(ALT, true, EvidenceStrength.Level.FORTE);
        assertThatThrownBy(() -> waiting.decide(OWNER, false, ALT, "motivo bem explicado", 70, warned, false, NOW))
                .hasMessageContaining(PreDecisionGuard.AVISOS_NAO_CONFIRMADOS);

        Decision decided = waiting.decide(OWNER, false, ALT, "motivo bem explicado", 70, warned, true, NOW);
        assertThat(decided.status()).isEqualTo(DecisionLifecycle.DECIDIDA);
        assertThat(decided.selectedAlternativeId()).isEqualTo(ALT);
        assertThat(decided.decidedAt()).isEqualTo(NOW);
        assertThat(decided.decisionConfidencePct()).isEqualTo(70);
        assertThat(decided.rationale()).isEqualTo("motivo bem explicado");
        assertThat(waiting.decide(OTHER, true, ALT, "motivo bem explicado", 70, CLEAN, false, NOW).status())
                .as("APROVADOR com delegação explícita").isEqualTo(DecisionLifecycle.DECIDIDA);
        assertThatThrownBy(() -> decision(DecisionLifecycle.COMPARACAO, null).decide(OWNER, false, ALT, "motivo bem explicado", 70, CLEAN, false, NOW))
                .hasMessageContaining("DECISAO_CICLO_TRANSICAO_INVALIDA");
    }

    @Test
    void reabrirSoPeloResponsavelEVoltaParaComparacao() {
        Decision decided = decision(DecisionLifecycle.EM_EXECUCAO, 70);
        assertThatThrownBy(() -> decided.transition(DecisionLifecycle.REABERTA)).hasMessageContaining("DECISAO_EXIGE_REABERTURA");
        assertThatThrownBy(() -> decided.reopen(OTHER, false)).hasMessageContaining("DECISAO_SO_RESPONSAVEL");
        Decision reopened = decided.reopen(OWNER, false);
        assertThat(reopened.status()).isEqualTo(DecisionLifecycle.REABERTA);
        assertThat(reopened.transition(DecisionLifecycle.COMPARACAO).status()).isEqualTo(DecisionLifecycle.COMPARACAO);
        assertThat(decision(DecisionLifecycle.RASCUNHO, null).transition(DecisionLifecycle.ENQUADRAMENTO).status())
                .isEqualTo(DecisionLifecycle.ENQUADRAMENTO);
    }

    @Test
    void limitesNumericosIguaisAosChecksDaV22() {
        assertThatThrownBy(() -> decision(DecisionLifecycle.RASCUNHO, 72)).hasMessageContaining("passos de 5");
        assertThatThrownBy(() -> decision(DecisionLifecycle.RASCUNHO, 105)).hasMessageContaining("VALIDACAO");
        assertThat(decision(DecisionLifecycle.RASCUNHO, 0).decisionConfidencePct()).isZero();
        assertThatThrownBy(() -> new CriterionAssessment(UUID.randomUUID(), ALT, UUID.randomUUID(), OWNER, 6, null, NOW, ContentOrigin.HUMANO))
                .hasMessageContaining("1–5");
        assertThatThrownBy(() -> new CriterionAssessment(UUID.randomUUID(), ALT, UUID.randomUUID(), OWNER, 0, null, NOW, ContentOrigin.HUMANO))
                .hasMessageContaining("1–5");
        assertThatThrownBy(() -> forecast(95 + 5)).hasMessageContaining("5–95");
        assertThatThrownBy(() -> forecast(0)).hasMessageContaining("5–95");
        assertThatThrownBy(() -> forecast(42)).hasMessageContaining("passos de 5");
        assertThat(forecast(95).probabilityPct()).isEqualTo(95);
        assertThatThrownBy(() -> criterion(new BigDecimal("100.01"))).hasMessageContaining("0–100");
        assertThatThrownBy(() -> criterion(new BigDecimal("-1"))).hasMessageContaining("0–100");
        assertThat(criterion(new BigDecimal("37.50")).weightPct()).isEqualByComparingTo("37.5");
        assertThatThrownBy(() -> new DecisionAssumption(UUID.randomUUID(), UUID.randomUUID(), "p", DecisionLevel.CRITICO, 33,
                AssumptionStatus.NAO_VALIDADA, null, null, null, null, ContentOrigin.HUMANO, null)).hasMessageContaining("passos de 5");
    }

    @Test
    void alternativaDescartadaExigeMotivoECheckpointConcluidoExigeAcao() {
        assertThatThrownBy(() -> alternative(AlternativeStatus.DESCARTADA, " ")).hasMessageContaining("exige motivo");
        assertThat(alternative(AlternativeStatus.DESCARTADA, "caro demais").isActive()).isFalse();
        assertThat(alternative(AlternativeStatus.ATIVA, null).isActive()).isTrue();
        assertThatThrownBy(() -> new DecisionCheckpoint(UUID.randomUUID(), UUID.randomUUID(), NOW, CheckpointKind.PROGRAMADO, CheckpointStatus.CONCLUIDO,
                NOW, OWNER, true, false, false, 70, null, null)).hasMessageContaining("exige completedAt e ação");
        assertThatThrownBy(() -> new DecisionCheckpoint(UUID.randomUUID(), UUID.randomUUID(), NOW, CheckpointKind.GATILHO, CheckpointStatus.AGENDADO,
                null, null, null, null, null, 71, null, null)).hasMessageContaining("passos de 5");
    }

    @Test
    void snapshotDetectaAdulteracao() {
        Map<String, Object> content = new LinkedHashMap<>();
        content.put("selected", "B");
        content.put("confidencePct", 70);
        content.put("rationale", "Escala e segurança pesam mais.");
        content.put("scores", List.of(Map.of("alt", "B", "score", 4.25), Map.of("alt", "A", "score", 3.8)));
        DecisionSnapshot snap = DecisionSnapshot.of(UUID.randomUUID(), UUID.randomUUID(), SnapshotKind.DECISAO, 1, NOW, OWNER, content,
                "Escala e segurança pesam mais.", 70, "B");
        assertThat(snap.isIntact()).isTrue();
        assertThat(snap.modelVersion()).isEqualTo(DecisionRules.SCORING_MODEL_VERSION);
        assertThat(snap.contentJson()).isEqualTo(
                "{\"confidencePct\":70,\"rationale\":\"Escala e segurança pesam mais.\",\"scores\":[{\"alt\":\"B\",\"score\":4.25},"
                        + "{\"alt\":\"A\",\"score\":3.8}],\"selected\":\"B\"}");

        // mudar um único campo do conteúdo muda o hash
        content.put("selected", "A");
        assertThat(SnapshotCanonicalizer.sha256(SnapshotCanonicalizer.canonical(content))).isNotEqualTo(snap.contentSha256());
        // conteúdo gravado adulterado com o hash antigo é detectado
        DecisionSnapshot tampered = new DecisionSnapshot(snap.id(), snap.decisionId(), snap.kind(), snap.versionNumber(), snap.takenAt(),
                snap.takenByUserId(), snap.contentJson().replace("\"selected\":\"B\"", "\"selected\":\"A\""), snap.contentSha256(), snap.rationale(),
                snap.confidencePct(), snap.selectedAlternativeLabel(), snap.modelVersion());
        assertThat(tampered.isIntact()).isFalse();
        assertThatThrownBy(() -> new DecisionSnapshot(snap.id(), snap.decisionId(), snap.kind(), 1, NOW, OWNER, "{}", "ABC", "m", null, null, "v"))
                .hasMessageContaining("64 hexadecimais");
        assertThatThrownBy(() -> new DecisionSnapshot(snap.id(), snap.decisionId(), snap.kind(), 0, NOW, OWNER, "{}", snap.contentSha256(), "m", null,
                null, "v")).hasMessageContaining("versionNumber");
    }

    @Test
    void recomendacaoSemSustentaEContradizERejeitada() {
        assertThat(recommendation("[\"teste de carga\"]", "[\"custo inicial\"]", "[]").status()).isEqualTo(RecommendationStatus.SUGERIDA);
        assertThatThrownBy(() -> recommendation("[\"teste de carga\"]", "[]", "[]"))
                .isInstanceOfSatisfying(DomainRuleException.class, e -> assertThat(e.getDetails()).containsExactly("contradictingJson"));
        assertThatThrownBy(() -> recommendation(null, "[\"x\"]", "[]"))
                .isInstanceOfSatisfying(DomainRuleException.class, e -> assertThat(e.getDetails()).containsExactly("supportingJson"));
        assertThatThrownBy(() -> recommendation("[null, \" \"]", "{\"a\":1}", "não é json"))
                .isInstanceOfSatisfying(DomainRuleException.class, e -> {
                    assertThat(e.getCode()).isEqualTo("RECOMENDACAO_INCOMPLETA");
                    assertThat(e.getDetails()).containsExactly("supportingJson", "contradictingJson", "criticalAssumptionIdsJson");
                });
        assertThatThrownBy(() -> new DecisionRecommendation(UUID.randomUUID(), UUID.randomUUID(), ALT, RecommendationSource.MODELO, " ", "[\"a\"]",
                "[\"b\"]", "[]", "", null, "v1", null, RecommendationStatus.SUGERIDA))
                .isInstanceOfSatisfying(DomainRuleException.class, e -> assertThat(e.getDetails())
                        .containsExactly("reasoningMd", "limitationsMd", "whatWouldChangeMd"));
    }

    @Test
    void evidenciaNuncaApagadaSoSubstituida() {
        DecisionEvidence ev = new DecisionEvidence(UUID.randomUUID(), UUID.randomUUID(), EvidenceNature.FATO, EvidenceKind.TESTE_TECNICO, "Teste de carga",
                "p99 < 200 ms", "relatório", null, null, null, null, null, NOW, SourceQuality.PRIMARIA, RelevanceLevel.ALTA, RelevanceLevel.ALTA,
                ContentOrigin.HUMANO, null, OWNER, null);
        assertThat(ev.isCurrent()).isTrue();
        DecisionEvidence old = ev.supersede(NOW);
        assertThat(old.isCurrent()).isFalse();
        assertThat(old.title()).isEqualTo(ev.title());
        assertThatThrownBy(() -> old.supersede(NOW)).hasMessageContaining("já substituída");
    }

    @Test
    void papeisComplexidadeEventosEProveniencia() {
        assertThat(DecisionRole.CONDUTOR.canEditStructure()).isTrue();
        assertThat(DecisionRole.CONTRIBUIDOR.canEditStructure()).isFalse();
        assertThat(DecisionRole.CONTRIBUIDOR.canAssess()).isTrue();
        assertThat(DecisionRole.INFORMADO.canAssess()).isFalse();
        assertThat(DecisionRole.INFORMADO.isReadOnly()).isTrue();

        assertThat(DecisionComplexity.suggest(DecisionLevel.CRITICO, 1, 2)).isEqualTo(DecisionComplexity.PROFUNDA);
        assertThat(DecisionComplexity.suggest(DecisionLevel.BAIXO, 5, 2)).isEqualTo(DecisionComplexity.PROFUNDA);
        assertThat(DecisionComplexity.suggest(DecisionLevel.MEDIO, 1, 2)).isEqualTo(DecisionComplexity.PADRAO);
        assertThat(DecisionComplexity.suggest(DecisionLevel.BAIXO, 1, 3)).isEqualTo(DecisionComplexity.PADRAO);
        assertThat(DecisionComplexity.suggest(DecisionLevel.BAIXO, 2, 2)).isEqualTo(DecisionComplexity.RAPIDA);

        assertThat(DecisionEventType.DECISAO_FINALIZADA.messageType()).isEqualTo("DecisionFinalized");
        assertThat(java.util.Arrays.stream(DecisionEventType.values()).map(DecisionEventType::messageType))
                .as("evento = fato no pretérito, sem eventos de UI").doesNotHaveDuplicates().noneMatch(m -> m.contains("Flipped") || m.contains("Compared"));
        assertThat(DecisionEventType.values()).hasSize(24);
        assertThat(RelevanceLevel.ALTA.weight()).isEqualTo(3);
        assertThat(DecisionLevel.max(DecisionLevel.ALTO, DecisionLevel.MEDIO)).isEqualTo(DecisionLevel.ALTO);

        assertThatThrownBy(() -> DecisionRules.aiProvenance(ContentOrigin.IA, null)).hasMessageContaining("G2");
        DecisionRules.aiProvenance(ContentOrigin.IA, UUID.randomUUID());
        DecisionRules.aiProvenance(ContentOrigin.HUMANO, null);

        DecisionParticipant p = new DecisionParticipant(UUID.randomUUID(), UUID.randomUUID(), OWNER, DecisionRole.CONTRIBUIDOR, NOW, null);
        assertThat(p.canSeeOthersScores(true, false)).as("G5: avaliação independente esconde as notas").isFalse();
        assertThat(p.canSeeOthersScores(true, true)).isTrue();
        assertThat(p.canSeeOthersScores(false, false)).isTrue();

        DecisionRisk risk = new DecisionRisk(UUID.randomUUID(), UUID.randomUUID(), "fornecedor quebra", null, null, Likelihood.PROVAVEL,
                DecisionLevel.CRITICO, null, null, RiskSource.PRE_MORTEM, RiskStatus.ABERTO, ContentOrigin.HUMANO, null);
        assertThat(risk.severity()).isEqualTo(DecisionLevel.CRITICO);
        assertThat(new DecisionAssumption(UUID.randomUUID(), UUID.randomUUID(), "p", DecisionLevel.CRITICO, 50, AssumptionStatus.VALIDADA, null, null,
                null, null, ContentOrigin.HUMANO, null).isCritical()).isTrue();
    }

    private static DecisionForecast forecast(int pct) {
        return new DecisionForecast(UUID.randomUUID(), UUID.randomUUID(), null, "Latência p99 < 200 ms em 30 dias", pct, NOW.atZone(
                java.time.ZoneOffset.UTC).toLocalDate(), OWNER, ForecastResolution.PENDENTE, null, null);
    }

    private static DecisionCriterion criterion(BigDecimal weight) {
        return new DecisionCriterion(UUID.randomUUID(), UUID.randomUUID(), "Custo", null, CriterionDirection.MENOR_MELHOR, weight, null,
                ContentOrigin.HUMANO, null, 0);
    }

    private static DecisionAlternative alternative(AlternativeStatus status, String reason) {
        return new DecisionAlternative(UUID.randomUUID(), UUID.randomUUID(), "A", "Railway", null, false, null, null, null, null, null, status, reason,
                ContentOrigin.HUMANO, null, null, null, 0);
    }

    private static DecisionRecommendation recommendation(String supporting, String contradicting, String assumptions) {
        return new DecisionRecommendation(UUID.randomUUID(), UUID.randomUUID(), ALT, RecommendationSource.MODELO, "B lidera a matriz", supporting,
                contradicting, assumptions, "notas de um avaliador só", "se Custo passar de 35 %", DecisionRules.SCORING_MODEL_VERSION, null,
                RecommendationStatus.SUGERIDA);
    }
}
