package br.gov.pr.secid.workstation.application.decisao;

import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.AlternativeStatus;
import br.gov.pr.secid.workstation.domain.decisao.AssumptionStatus;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointAction;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointKind;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointStatus;
import br.gov.pr.secid.workstation.domain.decisao.ContentOrigin;
import br.gov.pr.secid.workstation.domain.decisao.CriterionDirection;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEventType;
import br.gov.pr.secid.workstation.domain.decisao.DecisionKind;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRole;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceKind;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceNature;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceStance;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceTarget;
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
import br.gov.pr.secid.workstation.domain.decisao.SnapshotKind;
import br.gov.pr.secid.workstation.domain.decisao.SourceQuality;
import br.gov.pr.secid.workstation.domain.decisao.TriggerStatus;
import br.gov.pr.secid.workstation.domain.decisao.WorkLinkTarget;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Projeção do agregado da decisão para a API ({@code /api/decisions…}). Os registros internos levam o prefixo Decision para não colidir no
 * OpenAPI com schemas de mesmo nome (ex.: o Criterion do briefing da tarefa). Espelha o {@code DecisionAggregate} do front
 * (lib/decia/types.ts) para que o cliente HTTP (lib/decia/http.ts) só converta datas e nulos. Desde a fase 7b a visão traz também premissas,
 * riscos (com a severidade calculada, §6.6), cenários, previsões, recomendações, gatilhos, checkpoints, vínculos de trabalho e a
 * retrospectiva (tabelas da V22).
 * Com avaliação independente (G5), as notas dos outros só aparecem para quem já enviou as próprias (§6.2).
 *
 * @param permissions o que o viewer pode fazer agora (a UI desabilita; o serviço revalida em cada comando)
 */
public record DecisionView(DecisionRoot decision, List<DecisionParticipantView> participants, List<DecisionAlternativeView> alternatives,
                           List<DecisionCriterionView> criteria, List<DecisionAssessmentView> assessments, List<DecisionEvidenceView> evidence,
                           List<DecisionEvidenceLinkView> evidenceLinks, List<DecisionSnapshotView> snapshots, DecisionOutcomeView outcome,
                           List<DecisionEventView> events, DecisionPermissions permissions, List<DecisionAssumptionView> assumptions,
                           List<DecisionRiskView> risks, List<DecisionScenarioView> scenarios, List<DecisionForecastView> forecasts,
                           List<DecisionRecommendationView> recommendations, List<DecisionTriggerView> triggers,
                           List<DecisionCheckpointView> checkpoints, List<DecisionWorkLinkView> workLinks, DecisionRetrospectiveView retrospective) {

    public record DecisionRoot(UUID id, long version, String title, String question, String contextMd, String objective, String constraintsMd,
                       String scope, List<String> stakeholders, LocalDate targetDate, UUID ownerUserId, UUID createdByUserId, UUID companyId,
                       UUID departmentId, UUID sessionId, UUID projectId, DecisionLifecycle status, DecisionComplexity complexity, DecisionKind kind,
                       DecisionLevel impact, DecisionLevel urgency, Visibility visibility, AccessClassification accessClass,
                       boolean weightingEnabled, boolean independentScoring, String templateKey, UUID selectedAlternativeId, Instant decidedAt,
                       Integer decisionConfidencePct, String rationale, Integer reviewEveryDays, Instant createdAt, Instant updatedAt) {
    }

    public record DecisionParticipantView(UUID userId, DecisionRole role, Instant joinedAt, Instant assessmentsSubmittedAt) {
    }

    public record DecisionAlternativeView(UUID id, String label, String title, String description, boolean doNothing, List<String> pros, List<String> cons,
                              String estimatedCost, Integer estimatedDurationDays, AlternativeStatus status, String discardReason,
                              ContentOrigin origin, int position) {
    }

    public record DecisionCriterionView(UUID id, String name, String description, CriterionDirection direction, Double weightPct, String catalogKey,
                            ContentOrigin origin, int position) {
    }

    public record DecisionAssessmentView(UUID id, UUID alternativeId, UUID criterionId, UUID assessorUserId, int score, String rationale, Instant submittedAt,
                             ContentOrigin origin) {
    }

    public record DecisionEvidenceView(UUID id, EvidenceNature nature, EvidenceKind kind, String title, String summary, String sourceLabel, String sourceUrl,
                           String authorLabel, Instant observedAt, Instant retrievedAt, SourceQuality sourceQuality, RelevanceLevel relevance,
                           RelevanceLevel reliability, ContentOrigin origin, UUID addedByUserId, Instant addedAt, Instant supersededAt) {
    }

    public record DecisionEvidenceLinkView(UUID id, UUID evidenceId, EvidenceTarget targetType, UUID targetId, EvidenceStance stance, String note) {
    }

    public record DecisionSnapshotView(UUID id, SnapshotKind kind, int versionNumber, Instant takenAt, UUID takenByUserId, String contentJson,
                           String contentSha256, String rationale, Integer confidencePct, String selectedAlternativeLabel, String modelVersion) {
    }

    public record DecisionOutcomeView(UUID id, OutcomeResult result, Instant observedAt, String summary, UUID recordedByUserId) {
    }

    /** Fato da trilha; {@code payload} só com ids, enums e números (nunca texto livre nem dado pessoal). */
    public record DecisionEventView(UUID id, UUID actorUserId, DecisionEventType type, Map<String, Object> payload, Instant at, String correlationId) {
    }

    /** {@code editRecords}: premissas, riscos, cenários, gatilhos, recomendações e vínculos (EDIT_STRUCTURE, também depois de decidir). */
    public record DecisionPermissions(boolean editStructure, boolean assess, boolean decide, boolean reopen, boolean edit, boolean editRecords) {
    }

    public record DecisionAssumptionView(UUID id, String statement, DecisionLevel importance, Integer confidencePct, AssumptionStatus validationStatus,
                                         UUID ownerUserId, UUID alternativeId, String validationNote, Instant validatedAt, ContentOrigin origin) {
    }

    /** {@code severity} = matriz probabilidade × impacto (§6.6), calculada no servidor. */
    public record DecisionRiskView(UUID id, String title, String description, UUID alternativeId, Likelihood likelihood, DecisionLevel impact,
                                   DecisionLevel severity, String mitigation, UUID ownerUserId, RiskSource source, RiskStatus status,
                                   ContentOrigin origin) {
    }

    public record DecisionScenarioView(UUID id, UUID alternativeId, ScenarioCase scenarioCase, String description, Likelihood likelihood,
                                       List<String> assumptionIds, String expectedResult) {
    }

    public record DecisionForecastView(UUID id, UUID alternativeId, String statement, int probabilityPct, LocalDate resolveBy, UUID forecasterUserId,
                                       ForecastResolution resolution, Instant resolvedAt) {
    }

    public record DecisionRecommendationView(UUID id, UUID alternativeId, RecommendationSource source, String reasoningMd, List<String> supporting,
                                             List<String> contradicting, List<String> criticalAssumptionIds, String limitationsMd,
                                             String whatWouldChangeMd, String modelVersion, RecommendationStatus status, Instant createdAt) {
    }

    public record DecisionTriggerView(UUID id, String conditionText, String metricKey, String comparator, Double threshold, TriggerStatus status,
                                      Instant firedAt) {
    }

    public record DecisionCheckpointView(UUID id, Instant dueAt, CheckpointKind kind, CheckpointStatus status, Instant completedAt,
                                         UUID completedByUserId, Boolean stillValid, Boolean assumptionsChanged, Boolean newEvidence,
                                         Integer confidencePctAfter, CheckpointAction action, String note) {
    }

    /** Vínculo sem copiar dados (§4.2): o rótulo do alvo é resolvido por quem exibe, com o acesso de quem vê. */
    public record DecisionWorkLinkView(UUID id, WorkLinkTarget targetType, UUID targetId, UUID createdByUserId, Instant createdAt) {
    }

    public record DecisionRetrospectiveView(UUID id, UUID outcomeId, String whatHappened, String whatExpected, String whatWasRight,
                                            String whatWasWrong, List<String> failedAssumptionIds, ProcessQuality processQuality, String lessonsMd,
                                            boolean shareAsLesson, UUID reviewedByUserId, Instant reviewedAt) {
    }
}
