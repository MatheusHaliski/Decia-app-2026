package br.gov.pr.secid.workstation.application.decisao;

import br.gov.pr.secid.workstation.domain.decisao.AssumptionStatus;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointAction;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointKind;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointStatus;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceNature;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceStance;
import br.gov.pr.secid.workstation.domain.decisao.ForecastResolution;
import br.gov.pr.secid.workstation.domain.decisao.Likelihood;
import br.gov.pr.secid.workstation.domain.decisao.OutcomeResult;
import br.gov.pr.secid.workstation.domain.decisao.ProcessQuality;
import br.gov.pr.secid.workstation.domain.decisao.RecommendationSource;
import br.gov.pr.secid.workstation.domain.decisao.RecommendationStatus;
import br.gov.pr.secid.workstation.domain.decisao.RelevanceLevel;
import br.gov.pr.secid.workstation.domain.decisao.RiskSource;
import br.gov.pr.secid.workstation.domain.decisao.RiskStatus;
import br.gov.pr.secid.workstation.domain.decisao.ScenarioCase;
import br.gov.pr.secid.workstation.domain.decisao.TriggerStatus;
import br.gov.pr.secid.workstation.domain.decisao.WorkLinkTarget;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Um comando sobre a decisão (lote de {@code POST /api/decisions/{id}/commands}). Forma plana: cada tipo usa só os seus campos. Ids de
 * alternativa/critério são o UUID de um filho DESTA decisão ou o {@code ref} dado por um ADD_* anterior no mesmo lote (o cliente cria a
 * alternativa e já dá nota nela numa ida só). Ação exigida por tipo (BFLA, 03 §8):
 * <ul>
 *   <li>{@link Type#TRANSITION} — EDIT ({@code to = REABERTA} vira REOPEN; DECIDIDA só por DECIDE);</li>
 *   <li>{@link Type#ADD_ALTERNATIVE}, {@link Type#ADD_CRITERION}, {@link Type#SET_WEIGHT}, {@link Type#ADD_EVIDENCE} — EDIT_STRUCTURE;</li>
 *   <li>{@link Type#SET_SCORE} — ASSESS ({@code score} nulo remove a nota de quem pede);</li>
 *   <li>{@link Type#DECIDE} — DECIDE (guarda §6.10 + snapshot DECISAO); {@link Type#REOPEN} — REOPEN (snapshot REABERTURA);</li>
 *   <li>{@link Type#RECORD_OUTCOME} — EDIT (resultado único; move para RESOLVIDA).</li>
 *   <li>{@link Type#PUT_ASSUMPTION}, {@link Type#PUT_RISK}, {@link Type#PUT_SCENARIO}, {@link Type#PUT_TRIGGER}, {@link Type#PUT_RECOMMENDATION},
 *       {@link Type#LINK_WORK} e os REMOVE_/UNLINK_ correspondentes — EDIT_STRUCTURE;</li>
 *   <li>{@link Type#PUT_FORECAST} — ASSESS para registrar a própria previsão; resolver (resolução ≠ PENDENTE) exige EDIT;</li>
 *   <li>{@link Type#PUT_CHECKPOINT} — EDIT; {@link Type#PUT_RETROSPECTIVE} — EDIT, só depois do resultado registrado.</li>
 * </ul>
 * Os PUT_* sem {@code itemId} criam o item (o {@code ref} vale no resto do lote); com {@code itemId} (UUID ou ref) substituem os campos
 * editáveis. Cada PUT_* lê só o seu objeto ({@code assumption}, {@code risk}, …). Premissas, riscos, cenários, previsões e recomendações
 * apontam alternativas pelo mesmo {@code alternativeId} (UUID desta decisão ou ref do lote).
 */
public record DecisionCommand(Type type, String ref, DecisionLifecycle to, String title, Boolean doNothing, String name, String criterionId,
                              Double weightPct, String alternativeId, Integer score, String rationale, Integer confidencePct,
                              Boolean warningsConfirmed, OutcomeResult result, String summary, EvidenceNature nature, String sourceLabel,
                              RelevanceLevel reliability, EvidenceStance stance, String itemId, DecisionAssumptionInput assumption,
                              DecisionRiskInput risk, DecisionScenarioInput scenario, DecisionForecastInput forecast,
                              DecisionRecommendationInput recommendation, DecisionTriggerInput trigger, DecisionCheckpointInput checkpoint,
                              DecisionWorkLinkInput workLink, DecisionRetrospectiveInput retrospective) {

    public enum Type {
        TRANSITION, REOPEN, ADD_ALTERNATIVE, ADD_CRITERION, SET_WEIGHT, SET_SCORE, ADD_EVIDENCE, DECIDE, RECORD_OUTCOME,
        PUT_ASSUMPTION, REMOVE_ASSUMPTION, PUT_RISK, REMOVE_RISK, PUT_SCENARIO, REMOVE_SCENARIO, PUT_FORECAST, PUT_RECOMMENDATION,
        PUT_TRIGGER, REMOVE_TRIGGER, PUT_CHECKPOINT, LINK_WORK, UNLINK_WORK, PUT_RETROSPECTIVE
    }

    /** Premissa (§4.2): enunciado 1–1000, importância, confiança 0–100 passo 5; dono = responsável ou participante desta decisão. */
    public record DecisionAssumptionInput(String statement, DecisionLevel importance, Integer confidencePct, AssumptionStatus validationStatus,
                                          UUID ownerUserId, String alternativeId, String validationNote) {
    }

    /** Risco (§4.2): a severidade é calculada (§6.6), nunca enviada. */
    public record DecisionRiskInput(String title, String description, String alternativeId, Likelihood likelihood, DecisionLevel impact,
                                    String mitigation, UUID ownerUserId, RiskSource source, RiskStatus status) {
    }

    /** Cenário melhor/base/pior; {@code assumptionIds} são premissas desta decisão (UUID ou ref). */
    public record DecisionScenarioInput(String alternativeId, ScenarioCase scenarioCase, String description, Likelihood likelihood,
                                        List<String> assumptionIds, String expectedResult) {
    }

    /** Previsão binária (§6.9): probabilidade 5–95 passo 5; o previsor é quem envia. */
    public record DecisionForecastInput(String alternativeId, String statement, Integer probabilityPct, LocalDate resolveBy,
                                        ForecastResolution resolution) {
    }

    /** Recomendação (§7): criada com os quatro porquês; com {@code itemId} só o estado muda (SUGERIDA → ACEITA/DESCARTADA). */
    public record DecisionRecommendationInput(String alternativeId, RecommendationSource source, String reasoningMd, List<String> supporting,
                                              List<String> contradicting, List<String> criticalAssumptionIds, String limitationsMd,
                                              String whatWouldChangeMd, RecommendationStatus status) {
    }

    /** Gatilho "o que mudaria esta decisão"; DISPARADO grava o carimbo. */
    public record DecisionTriggerInput(String conditionText, String metricKey, String comparator, Double threshold, TriggerStatus status) {
    }

    /** Checkpoint: agendar (dueAt, kind) ou concluir (status CONCLUIDO + ação). */
    public record DecisionCheckpointInput(Instant dueAt, CheckpointKind kind, CheckpointStatus status, Boolean stillValid,
                                          Boolean assumptionsChanged, Boolean newEvidence, Integer confidencePctAfter, CheckpointAction action,
                                          String note) {
    }

    /** Vínculo com o trabalho (tarefa, projeto ou marco); o alvo precisa ser visível para quem liga. */
    public record DecisionWorkLinkInput(WorkLinkTarget targetType, UUID targetId) {
    }

    /** Retrospectiva (laço duplo, G8): uma por decisão, depois do resultado. */
    public record DecisionRetrospectiveInput(String whatHappened, String whatExpected, String whatWasRight, String whatWasWrong,
                                             List<String> failedAssumptionIds, ProcessQuality processQuality, String lessonsMd,
                                             Boolean shareAsLesson) {
    }

    private static DecisionCommand core(Type type, String ref, DecisionLifecycle to, String title, Boolean doNothing, String name,
                                        String criterionId, Double weightPct, String alternativeId, Integer score, String rationale,
                                        Integer confidencePct, Boolean warningsConfirmed, OutcomeResult result, String summary,
                                        EvidenceNature nature, String sourceLabel, RelevanceLevel reliability, EvidenceStance stance) {
        return new DecisionCommand(type, ref, to, title, doNothing, name, criterionId, weightPct, alternativeId, score, rationale, confidencePct,
                warningsConfirmed, result, summary, nature, sourceLabel, reliability, stance, null, null, null, null, null, null, null, null, null,
                null);
    }

    /** Comando sobre os registros da fase 7b; {@code payload} vai no campo do tipo (ex.: {@link DecisionRiskInput} em {@code risk}). */
    public static DecisionCommand item(Type type, String ref, String itemId, Object payload) {
        return new DecisionCommand(type, ref, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                itemId, payload instanceof DecisionAssumptionInput a ? a : null, payload instanceof DecisionRiskInput r ? r : null,
                payload instanceof DecisionScenarioInput s ? s : null, payload instanceof DecisionForecastInput f ? f : null,
                payload instanceof DecisionRecommendationInput rec ? rec : null, payload instanceof DecisionTriggerInput t ? t : null,
                payload instanceof DecisionCheckpointInput c ? c : null, payload instanceof DecisionWorkLinkInput w ? w : null,
                payload instanceof DecisionRetrospectiveInput rt ? rt : null);
    }

    public static DecisionCommand transition(DecisionLifecycle to) {
        return core(Type.TRANSITION, null, to, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                null, null);
    }

    public static DecisionCommand reopen(String rationale) {
        return core(Type.REOPEN, null, null, null, null, null, null, null, null, null, rationale, null, null, null, null, null, null,
                null, null);
    }

    public static DecisionCommand addAlternative(String ref, String title, boolean doNothing) {
        return core(Type.ADD_ALTERNATIVE, ref, null, title, doNothing, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null);
    }

    public static DecisionCommand addCriterion(String ref, String name) {
        return core(Type.ADD_CRITERION, ref, null, null, null, name, null, null, null, null, null, null, null, null, null, null,
                null, null, null);
    }

    public static DecisionCommand setWeight(String criterionId, Double weightPct) {
        return core(Type.SET_WEIGHT, null, null, null, null, null, criterionId, weightPct, null, null, null, null, null, null, null,
                null, null, null, null);
    }

    public static DecisionCommand setScore(String alternativeId, String criterionId, Integer score) {
        return core(Type.SET_SCORE, null, null, null, null, null, criterionId, null, alternativeId, score, null, null, null, null,
                null, null, null, null, null);
    }

    public static DecisionCommand addEvidence(String title, EvidenceNature nature, String sourceLabel, RelevanceLevel reliability,
                                              String alternativeId, EvidenceStance stance) {
        return core(Type.ADD_EVIDENCE, null, null, title, null, null, null, null, alternativeId, null, null, null, null, null, null,
                nature, sourceLabel, reliability, stance);
    }

    public static DecisionCommand decide(String alternativeId, String rationale, Integer confidencePct, boolean warningsConfirmed) {
        return core(Type.DECIDE, null, null, null, null, null, null, null, alternativeId, null, rationale, confidencePct,
                warningsConfirmed, null, null, null, null, null, null);
    }

    public static DecisionCommand recordOutcome(OutcomeResult result, String summary) {
        return core(Type.RECORD_OUTCOME, null, null, null, null, null, null, null, null, null, null, null, null, result, summary,
                null, null, null, null);
    }
}
