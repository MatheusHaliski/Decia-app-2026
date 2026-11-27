package br.gov.pr.secid.workstation.infrastructure.mysql.decisao;

import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.Graph;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.Records;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredDecision;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredEvidence;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredRecommendation;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredWorkLink;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.CriterionAssessment;
import br.gov.pr.secid.workstation.domain.decisao.Decision;
import br.gov.pr.secid.workstation.domain.decisao.DecisionAlternative;
import br.gov.pr.secid.workstation.domain.decisao.DecisionAssumption;
import br.gov.pr.secid.workstation.domain.decisao.DecisionCheckpoint;
import br.gov.pr.secid.workstation.domain.decisao.DecisionForecast;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRecommendation;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRetrospective;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRisk;
import br.gov.pr.secid.workstation.domain.decisao.DecisionScenario;
import br.gov.pr.secid.workstation.domain.decisao.DecisionTrigger;
import br.gov.pr.secid.workstation.domain.decisao.DecisionWorkLink;
import br.gov.pr.secid.workstation.domain.decisao.WorkLinkTarget;
import br.gov.pr.secid.workstation.domain.security.ScopedResource;
import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.TaskItemEntity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionCriterion;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEvent;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEvidence;
import br.gov.pr.secid.workstation.domain.decisao.DecisionOutcome;
import br.gov.pr.secid.workstation.domain.decisao.DecisionParticipant;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRole;
import br.gov.pr.secid.workstation.domain.decisao.DecisionSnapshot;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceLink;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.CriterionAssessmentEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionAlternativeEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionAssumptionEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionCheckpointEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionCriterionEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionEventEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionEvidenceEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionForecastEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionOutcomeEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionParticipantEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionRecommendationEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionRetrospectiveEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionRiskEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionScenarioEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionSnapshotEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionTriggerEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionWorkLinkEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.EvidenceLinkEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ProjectSchemeEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ProjectTaskEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Adaptador JPA de {@link DecisionRepositoryPort} (V22, fase 7 do DECIA) sobre as entidades geradas pelo SchemaGenerator (sem mudar os
 * repositórios gerados: as consultas da API ficam aqui, em JPQL). Ids da raiz e dos filhos são gerados pelo Hibernate; snapshots e eventos
 * (append-only, {@code @Immutable}) recebem o id do serviço. Toda gravação da raiz força o incremento imediato da versão
 * ({@code PESSIMISTIC_FORCE_INCREMENT}), como no Acervo: um lote que só mexe nos filhos também invalida a cópia antiga (409).
 * Fase 7b: premissas, riscos, cenários, previsões, recomendações, gatilhos, checkpoints, vínculos de trabalho e retrospectiva (tabelas da
 * V22, sem migration nova) — upsert por id conferindo que a linha é DESTA decisão.
 */
@Configuration
public class JpaDecisionAdapters {

    @Bean
    DecisionRepositoryPort decisionRepositoryPort(EntityManager em) {
        return new JpaDecisionRepository(em);
    }

    static class JpaDecisionRepository implements DecisionRepositoryPort {
        private final EntityManager em;

        JpaDecisionRepository(EntityManager em) {
            this.em = em;
        }

        @Override
        public Optional<StoredDecision> findById(UUID id) {
            return Optional.ofNullable(id == null ? null : em.find(DecisionEntity.class, id)).map(JpaDecisionAdapters::stored);
        }

        @Override
        public List<StoredDecision> findCandidates(UUID userId, UUID companyId, int limit) {
            return em.createQuery("select d from DecisionEntity d where d.ownerUserId = :me"
                            + " or d.id in (select p.decisionId from DecisionParticipantEntity p where p.userId = :me)"
                            + " or d.visibility = :publica"
                            + " or (d.companyId = :company and d.visibility <> :privada)"
                            + " order by d.updatedAt desc, d.id", DecisionEntity.class)
                    .setParameter("me", userId).setParameter("company", companyId)
                    .setParameter("publica", Visibility.PUBLICA).setParameter("privada", Visibility.PRIVADA)
                    .setMaxResults(Math.max(1, limit)).getResultList().stream().map(JpaDecisionAdapters::stored).toList();
        }

        @Override
        public Optional<DecisionRole> roleOf(UUID decisionId, UUID userId) {
            return em.createQuery("select p.role from DecisionParticipantEntity p where p.decisionId = :d and p.userId = :u", DecisionRole.class)
                    .setParameter("d", decisionId).setParameter("u", userId).setMaxResults(1).getResultList().stream().findFirst();
        }

        @Override
        public Graph graph(UUID decisionId) {
            List<DecisionParticipant> participants = em.createQuery(
                            "select p from DecisionParticipantEntity p where p.decisionId = :d order by p.joinedAt, p.id", DecisionParticipantEntity.class)
                    .setParameter("d", decisionId).getResultList().stream()
                    .map(p -> new DecisionParticipant(p.getId(), p.getDecisionId(), p.getUserId(), p.getRole(), p.getJoinedAt(),
                            p.getAssessmentsSubmittedAt())).toList();
            List<DecisionAlternative> alternatives = em.createQuery(
                            "select a from DecisionAlternativeEntity a where a.decisionId = :d order by a.position, a.label", DecisionAlternativeEntity.class)
                    .setParameter("d", decisionId).getResultList().stream().map(JpaDecisionAdapters::alternative).toList();
            List<DecisionCriterion> criteria = em.createQuery(
                            "select c from DecisionCriterionEntity c where c.decisionId = :d order by c.position, c.name", DecisionCriterionEntity.class)
                    .setParameter("d", decisionId).getResultList().stream()
                    .map(c -> new DecisionCriterion(c.getId(), c.getDecisionId(), c.getName(), c.getDescription(), c.getDirection(), c.getWeightPct(),
                            c.getCatalogKey(), c.getOrigin(), c.getAiInferenceId(), c.getPosition())).toList();
            List<CriterionAssessment> assessments = em.createQuery("select s from CriterionAssessmentEntity s where s.alternativeId in"
                            + " (select a.id from DecisionAlternativeEntity a where a.decisionId = :d) order by s.submittedAt, s.id",
                            CriterionAssessmentEntity.class)
                    .setParameter("d", decisionId).getResultList().stream()
                    .map(s -> new CriterionAssessment(s.getId(), s.getAlternativeId(), s.getCriterionId(), s.getAssessorUserId(), s.getScore(),
                            s.getRationale(), s.getSubmittedAt(), s.getOrigin())).toList();
            List<DecisionEvidenceEntity> evidenceRows = em.createQuery(
                            "select e from DecisionEvidenceEntity e where e.decisionId = :d order by e.createdAt, e.id", DecisionEvidenceEntity.class)
                    .setParameter("d", decisionId).getResultList();
            List<StoredEvidence> evidence = evidenceRows.stream().map(e -> new StoredEvidence(evidence(e), e.getCreatedAt())).toList();
            List<EvidenceLink> links = evidenceRows.isEmpty() ? List.of() : em.createQuery(
                            "select l from EvidenceLinkEntity l where l.evidenceId in :ids order by l.createdAt, l.id", EvidenceLinkEntity.class)
                    .setParameter("ids", evidenceRows.stream().map(DecisionEvidenceEntity::getId).toList()).getResultList().stream()
                    .map(l -> new EvidenceLink(l.getId(), l.getEvidenceId(), l.getTargetType(), l.getTargetId(), l.getStance(), l.getNote())).toList();
            List<DecisionSnapshot> snapshots = em.createQuery(
                            "select s from DecisionSnapshotEntity s where s.decisionId = :d order by s.versionNumber", DecisionSnapshotEntity.class)
                    .setParameter("d", decisionId).getResultList().stream()
                    .map(s -> new DecisionSnapshot(s.getId(), s.getDecisionId(), s.getKind(), s.getVersionNumber(), s.getTakenAt(),
                            s.getTakenByUserId(), s.getContentJson(), s.getContentSha256(), s.getRationale(), s.getConfidencePct(),
                            s.getSelectedAlternativeLabel(), s.getModelVersion())).toList();
            DecisionOutcome outcome = em.createQuery("select o from DecisionOutcomeEntity o where o.decisionId = :d", DecisionOutcomeEntity.class)
                    .setParameter("d", decisionId).setMaxResults(1).getResultList().stream()
                    .map(o -> new DecisionOutcome(o.getId(), o.getDecisionId(), o.getResult(), o.getObservedAt(), o.getSummary(), o.getMetricsJson(),
                            o.getRecordedByUserId())).findFirst().orElse(null);
            List<DecisionEvent> events = em.createQuery(
                            "select e from DecisionEventEntity e where e.decisionId = :d order by e.at, e.id", DecisionEventEntity.class)
                    .setParameter("d", decisionId).getResultList().stream()
                    .map(e -> new DecisionEvent(e.getId(), e.getDecisionId(), e.getActorUserId(), e.getType(), e.getPayloadJson(), e.getAt(),
                            e.getCorrelationId())).toList();
            return new Graph(participants, alternatives, criteria, assessments, evidence, links, snapshots, outcome, events, records(decisionId));
        }

        private <T> List<T> rows(Class<T> type, String order, UUID decisionId) {
            return em.createQuery("select x from " + type.getSimpleName() + " x where x.decisionId = :d order by " + order, type)
                    .setParameter("d", decisionId).getResultList();
        }

        private Records records(UUID d) {
            List<DecisionAssumption> assumptions = rows(DecisionAssumptionEntity.class, "x.createdAt, x.id", d).stream()
                    .map(JpaDecisionAdapters::assumption).toList();
            List<DecisionRisk> risks = rows(DecisionRiskEntity.class, "x.createdAt, x.id", d).stream().map(JpaDecisionAdapters::risk).toList();
            List<DecisionScenario> scenarios = rows(DecisionScenarioEntity.class, "x.createdAt, x.id", d).stream()
                    .map(JpaDecisionAdapters::scenario).toList();
            List<DecisionForecast> forecasts = rows(DecisionForecastEntity.class, "x.createdAt, x.id", d).stream()
                    .map(JpaDecisionAdapters::forecast).toList();
            List<StoredRecommendation> recommendations = rows(DecisionRecommendationEntity.class, "x.createdAt, x.id", d).stream()
                    .map(r -> new StoredRecommendation(recommendation(r), r.getCreatedAt())).toList();
            List<DecisionTrigger> triggers = rows(DecisionTriggerEntity.class, "x.createdAt, x.id", d).stream()
                    .map(JpaDecisionAdapters::trigger).toList();
            List<DecisionCheckpoint> checkpoints = rows(DecisionCheckpointEntity.class, "x.dueAt, x.id", d).stream()
                    .map(JpaDecisionAdapters::checkpoint).toList();
            List<StoredWorkLink> links = rows(DecisionWorkLinkEntity.class, "x.createdAt, x.id", d).stream()
                    .map(l -> new StoredWorkLink(new DecisionWorkLink(l.getId(), l.getDecisionId(), l.getTargetType(), l.getTargetId(),
                            l.getCreatedByUserId()), l.getCreatedAt())).toList();
            DecisionRetrospective retro = rows(DecisionRetrospectiveEntity.class, "x.reviewedAt desc, x.id", d).stream().findFirst()
                    .map(JpaDecisionAdapters::retrospective).orElse(null);
            return new Records(assumptions, risks, scenarios, forecasts, recommendations, triggers, checkpoints, links, retro);
        }

        /** Linha existente DESTA decisão (id de outra decisão nunca é alterado) ou nova. */
        private <T> T own(Class<T> type, UUID id, UUID decisionId, Function<T, UUID> decisionOf, Supplier<T> fresh) {
            if (id == null) {
                return fresh.get();
            }
            T e = em.find(type, id);
            if (e == null || !decisionId.equals(decisionOf.apply(e))) {
                throw new IllegalStateException("registro " + id + " não pertence à decisão " + decisionId);
            }
            return e;
        }

        private <T> T persist(T e, boolean isNew) {
            if (isNew) {
                em.persist(e);
            }
            em.flush();
            return e;
        }

        private <T> void remove(Class<T> type, UUID decisionId, UUID id, Function<T, UUID> decisionOf) {
            T e = em.find(type, id);
            if (e != null && decisionId.equals(decisionOf.apply(e))) {
                em.remove(e);
                em.flush();
            }
        }

        @Override
        @Transactional
        public DecisionAssumption saveAssumption(DecisionAssumption a) {
            DecisionAssumptionEntity e = own(DecisionAssumptionEntity.class, a.id(), a.decisionId(), DecisionAssumptionEntity::getDecisionId,
                    DecisionAssumptionEntity::new);
            boolean isNew = e.getId() == null;
            e.setDecisionId(a.decisionId());
            e.setStatement(a.statement());
            e.setImportance(a.importance());
            e.setConfidencePct(a.confidencePct());
            e.setValidationStatus(a.validationStatus());
            e.setOwnerUserId(a.ownerUserId());
            e.setAlternativeId(a.alternativeId());
            e.setValidationNote(a.validationNote());
            e.setValidatedAt(a.validatedAt());
            e.setOrigin(a.origin());
            e.setAiInferenceId(a.aiInferenceId());
            return assumption(persist(e, isNew));
        }

        @Override
        @Transactional
        public void removeAssumption(UUID decisionId, UUID id) {
            remove(DecisionAssumptionEntity.class, decisionId, id, DecisionAssumptionEntity::getDecisionId);
        }

        @Override
        @Transactional
        public DecisionRisk saveRisk(DecisionRisk r) {
            DecisionRiskEntity e = own(DecisionRiskEntity.class, r.id(), r.decisionId(), DecisionRiskEntity::getDecisionId, DecisionRiskEntity::new);
            boolean isNew = e.getId() == null;
            e.setDecisionId(r.decisionId());
            e.setTitle(r.title());
            e.setDescription(r.description());
            e.setAlternativeId(r.alternativeId());
            e.setLikelihood(r.likelihood());
            e.setImpact(r.impact());
            e.setMitigation(r.mitigation());
            e.setOwnerUserId(r.ownerUserId());
            e.setSource(r.source());
            e.setStatus(r.status());
            e.setOrigin(r.origin());
            e.setAiInferenceId(r.aiInferenceId());
            return risk(persist(e, isNew));
        }

        @Override
        @Transactional
        public void removeRisk(UUID decisionId, UUID id) {
            remove(DecisionRiskEntity.class, decisionId, id, DecisionRiskEntity::getDecisionId);
        }

        @Override
        @Transactional
        public DecisionScenario saveScenario(DecisionScenario s) {
            DecisionScenarioEntity e = own(DecisionScenarioEntity.class, s.id(), s.decisionId(), DecisionScenarioEntity::getDecisionId,
                    DecisionScenarioEntity::new);
            boolean isNew = e.getId() == null;
            e.setDecisionId(s.decisionId());
            e.setAlternativeId(s.alternativeId());
            e.setScenarioCase(s.scenarioCase());
            e.setDescription(s.description());
            e.setLikelihood(s.likelihood());
            e.setAssumptionIdsJson(s.assumptionIdsJson());
            e.setExpectedResult(s.expectedResult());
            e.setProjectScenarioId(s.projectScenarioId());
            return scenario(persist(e, isNew));
        }

        @Override
        @Transactional
        public void removeScenario(UUID decisionId, UUID id) {
            remove(DecisionScenarioEntity.class, decisionId, id, DecisionScenarioEntity::getDecisionId);
        }

        @Override
        @Transactional
        public DecisionForecast saveForecast(DecisionForecast f) {
            DecisionForecastEntity e = own(DecisionForecastEntity.class, f.id(), f.decisionId(), DecisionForecastEntity::getDecisionId,
                    DecisionForecastEntity::new);
            boolean isNew = e.getId() == null;
            e.setDecisionId(f.decisionId());
            e.setAlternativeId(f.alternativeId());
            e.setStatement(f.statement());
            e.setProbabilityPct(f.probabilityPct());
            e.setResolveBy(f.resolveBy());
            e.setForecasterUserId(f.forecasterUserId());
            e.setResolution(f.resolution());
            e.setResolvedAt(f.resolvedAt());
            e.setResolvedByUserId(f.resolvedByUserId());
            return forecast(persist(e, isNew));
        }

        @Override
        @Transactional
        public StoredRecommendation saveRecommendation(DecisionRecommendation r) {
            DecisionRecommendationEntity e = own(DecisionRecommendationEntity.class, r.id(), r.decisionId(), DecisionRecommendationEntity::getDecisionId,
                    DecisionRecommendationEntity::new);
            boolean isNew = e.getId() == null;
            e.setDecisionId(r.decisionId());
            e.setAlternativeId(r.alternativeId());
            e.setSource(r.source());
            e.setReasoningMd(r.reasoningMd());
            e.setSupportingJson(r.supportingJson());
            e.setContradictingJson(r.contradictingJson());
            e.setCriticalAssumptionIdsJson(r.criticalAssumptionIdsJson());
            e.setLimitationsMd(r.limitationsMd());
            e.setWhatWouldChangeMd(r.whatWouldChangeMd());
            e.setModelVersion(r.modelVersion());
            e.setAiInferenceId(r.aiInferenceId());
            e.setStatus(r.status());
            persist(e, isNew);
            return new StoredRecommendation(recommendation(e), e.getCreatedAt());
        }

        @Override
        @Transactional
        public DecisionTrigger saveTrigger(DecisionTrigger t) {
            DecisionTriggerEntity e = own(DecisionTriggerEntity.class, t.id(), t.decisionId(), DecisionTriggerEntity::getDecisionId,
                    DecisionTriggerEntity::new);
            boolean isNew = e.getId() == null;
            e.setDecisionId(t.decisionId());
            e.setConditionText(t.conditionText());
            e.setMetricKey(t.metricKey());
            e.setComparator(t.comparator());
            e.setThreshold(t.threshold());
            e.setStatus(t.status());
            e.setFiredAt(t.firedAt());
            return trigger(persist(e, isNew));
        }

        @Override
        @Transactional
        public void removeTrigger(UUID decisionId, UUID id) {
            remove(DecisionTriggerEntity.class, decisionId, id, DecisionTriggerEntity::getDecisionId);
        }

        @Override
        @Transactional
        public DecisionCheckpoint saveCheckpoint(DecisionCheckpoint c) {
            DecisionCheckpointEntity e = own(DecisionCheckpointEntity.class, c.id(), c.decisionId(), DecisionCheckpointEntity::getDecisionId,
                    DecisionCheckpointEntity::new);
            boolean isNew = e.getId() == null;
            e.setDecisionId(c.decisionId());
            e.setDueAt(c.dueAt());
            e.setKind(c.kind());
            e.setStatus(c.status());
            e.setCompletedAt(c.completedAt());
            e.setCompletedByUserId(c.completedByUserId());
            e.setStillValid(c.stillValid());
            e.setAssumptionsChanged(c.assumptionsChanged());
            e.setNewEvidence(c.newEvidence());
            e.setConfidencePctAfter(c.confidencePctAfter());
            e.setAction(c.action());
            e.setNote(c.note());
            return checkpoint(persist(e, isNew));
        }

        @Override
        @Transactional
        public StoredWorkLink addWorkLink(DecisionWorkLink l, Instant at) {
            DecisionWorkLinkEntity e = new DecisionWorkLinkEntity();
            e.setId(l.id());
            e.setDecisionId(l.decisionId());
            e.setTargetType(l.targetType());
            e.setTargetId(l.targetId());
            e.setCreatedByUserId(l.createdByUserId());
            e.setCreatedAt(at);
            em.persist(e);
            em.flush();
            return new StoredWorkLink(l, at);
        }

        @Override
        @Transactional
        public void removeWorkLink(UUID decisionId, UUID id) {
            remove(DecisionWorkLinkEntity.class, decisionId, id, DecisionWorkLinkEntity::getDecisionId);
        }

        @Override
        @Transactional
        public DecisionRetrospective saveRetrospective(DecisionRetrospective r) {
            DecisionRetrospectiveEntity e = own(DecisionRetrospectiveEntity.class, r.id(), r.decisionId(), DecisionRetrospectiveEntity::getDecisionId,
                    DecisionRetrospectiveEntity::new);
            boolean isNew = e.getId() == null;
            e.setDecisionId(r.decisionId());
            e.setOutcomeId(r.outcomeId());
            e.setWhatHappened(r.whatHappened());
            e.setWhatExpected(r.whatExpected());
            e.setWhatWasRight(r.whatWasRight());
            e.setWhatWasWrong(r.whatWasWrong());
            e.setFailedAssumptionIdsJson(r.failedAssumptionIdsJson());
            e.setProcessQuality(r.processQuality());
            e.setLessonsMd(r.lessonsMd());
            e.setShareAsLesson(r.shareAsLesson());
            e.setReviewedByUserId(r.reviewedByUserId());
            e.setReviewedAt(r.reviewedAt());
            return retrospective(persist(e, isNew));
        }

        @Override
        public List<StoredDecision> findByWorkTarget(WorkLinkTarget type, UUID targetId, int limit) {
            return em.createQuery("select d from DecisionEntity d where d.id in (select l.decisionId from DecisionWorkLinkEntity l"
                            + " where l.targetType = :t and l.targetId = :id) order by d.updatedAt desc, d.id", DecisionEntity.class)
                    .setParameter("t", type).setParameter("id", targetId).setMaxResults(Math.max(1, limit)).getResultList().stream()
                    .map(JpaDecisionAdapters::stored).toList();
        }

        @Override
        public Optional<ScopedResource> workTarget(WorkLinkTarget type, UUID targetId) {
            if (type == null || targetId == null) {
                return Optional.empty();
            }
            return switch (type) {
                case TAREFA -> Optional.ofNullable(em.find(TaskItemEntity.class, targetId)).map(t -> {
                    UUID company = em.createQuery("select u.companyId from UserEntity u where u.id = :id", UUID.class)
                            .setParameter("id", t.getOwnerId()).getResultList().stream().filter(java.util.Objects::nonNull).findFirst().orElse(null);
                    Set<UUID> collab = new HashSet<>();
                    if (t.getResponsibleId() != null && !t.getResponsibleId().equals(t.getOwnerId())) {
                        collab.add(t.getResponsibleId());
                    }
                    return new ScopedResource(ScopedResource.Kind.TASK, t.getId(), t.getOwnerId(), company, t.getDepartmentId(), t.getVisibility(),
                            t.getAccessClass(), collab);
                });
                case PROJETO -> project(targetId, targetId);
                case MARCO -> Optional.ofNullable(em.find(ProjectTaskEntity.class, targetId)).flatMap(m -> project(m.getProjectId(), targetId));
            };
        }

        private Optional<ScopedResource> project(UUID projectId, UUID resourceId) {
            return Optional.ofNullable(projectId == null ? null : em.find(ProjectSchemeEntity.class, projectId))
                    .map(p -> new ScopedResource(ScopedResource.Kind.PROJECT, resourceId, p.getOwnerId(), p.getCompanyId(), p.getDepartmentId(),
                            p.getVisibility(), AccessClassification.INTERNO, Set.of()));
        }

        @Override
        @Transactional
        public StoredDecision insert(Decision decision) {
            DecisionEntity e = new DecisionEntity();
            apply(e, decision);
            em.persist(e);
            em.flush();
            return stored(e);
        }

        @Override
        @Transactional
        public StoredDecision update(Decision decision, long expectedVersion) {
            DecisionEntity e = em.find(DecisionEntity.class, decision.id());
            if (e == null || e.getVersion() != expectedVersion) {
                throw new ObjectOptimisticLockingFailureException(DecisionEntity.class, decision.id());
            }
            apply(e, decision);
            em.lock(e, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
            em.flush();
            return stored(e);
        }

        @Override
        @Transactional
        public DecisionParticipant addParticipant(DecisionParticipant p) {
            DecisionParticipantEntity e = new DecisionParticipantEntity();
            e.setDecisionId(p.decisionId());
            e.setUserId(p.userId());
            e.setRole(p.role());
            e.setJoinedAt(p.joinedAt());
            e.setAssessmentsSubmittedAt(p.assessmentsSubmittedAt());
            em.persist(e);
            em.flush();
            return new DecisionParticipant(e.getId(), p.decisionId(), p.userId(), p.role(), p.joinedAt(), p.assessmentsSubmittedAt());
        }

        @Override
        @Transactional
        public DecisionAlternative addAlternative(DecisionAlternative a) {
            DecisionAlternativeEntity e = new DecisionAlternativeEntity();
            e.setDecisionId(a.decisionId());
            e.setLabel(a.label());
            e.setTitle(a.title());
            e.setDescription(a.description());
            e.setDoNothing(a.doNothing());
            e.setProsJson(a.prosJson());
            e.setConsJson(a.consJson());
            e.setEstimatedCost(a.estimatedCost());
            e.setEstimatedDurationDays(a.estimatedDurationDays());
            e.setDependenciesMd(a.dependenciesMd());
            e.setStatus(a.status());
            e.setDiscardReason(a.discardReason());
            e.setOrigin(a.origin());
            e.setAiInferenceId(a.aiInferenceId());
            e.setPosition(a.position());
            em.persist(e);
            em.flush();
            return alternative(e);
        }

        @Override
        @Transactional
        public DecisionCriterion addCriterion(DecisionCriterion c) {
            DecisionCriterionEntity e = new DecisionCriterionEntity();
            e.setDecisionId(c.decisionId());
            e.setName(c.name());
            e.setDescription(c.description());
            e.setDirection(c.direction());
            e.setWeightPct(c.weightPct());
            e.setCatalogKey(c.catalogKey());
            e.setOrigin(c.origin());
            e.setAiInferenceId(c.aiInferenceId());
            e.setPosition(c.position());
            em.persist(e);
            em.flush();
            return new DecisionCriterion(e.getId(), c.decisionId(), c.name(), c.description(), c.direction(), c.weightPct(), c.catalogKey(),
                    c.origin(), c.aiInferenceId(), c.position());
        }

        @Override
        @Transactional
        public void setWeight(UUID criterionId, BigDecimal weightPct) {
            DecisionCriterionEntity e = em.find(DecisionCriterionEntity.class, criterionId);
            if (e != null) {
                e.setWeightPct(weightPct);
            }
        }

        @Override
        @Transactional
        public void putAssessment(CriterionAssessment a) {
            CriterionAssessmentEntity e = findAssessment(a.alternativeId(), a.criterionId(), a.assessorUserId()).orElseGet(() -> {
                CriterionAssessmentEntity n = new CriterionAssessmentEntity();
                n.setAlternativeId(a.alternativeId());
                n.setCriterionId(a.criterionId());
                n.setAssessorUserId(a.assessorUserId());
                return n;
            });
            e.setScore(a.score());
            e.setRationale(a.rationale());
            e.setSubmittedAt(a.submittedAt());
            e.setOrigin(a.origin());
            if (e.getId() == null) {
                em.persist(e);
            }
            em.flush();
        }

        @Override
        @Transactional
        public void removeAssessment(UUID alternativeId, UUID criterionId, UUID assessorUserId) {
            findAssessment(alternativeId, criterionId, assessorUserId).ifPresent(em::remove);
            em.flush();
        }

        private Optional<CriterionAssessmentEntity> findAssessment(UUID alt, UUID crit, UUID by) {
            return em.createQuery("select s from CriterionAssessmentEntity s where s.alternativeId = :a and s.criterionId = :c and s.assessorUserId = :u",
                            CriterionAssessmentEntity.class)
                    .setParameter("a", alt).setParameter("c", crit).setParameter("u", by).setMaxResults(1).getResultList().stream().findFirst();
        }

        @Override
        @Transactional
        public DecisionEvidence addEvidence(DecisionEvidence d, List<EvidenceLink> links) {
            DecisionEvidenceEntity e = new DecisionEvidenceEntity();
            e.setDecisionId(d.decisionId());
            e.setNature(d.nature());
            e.setKind(d.kind());
            e.setTitle(d.title());
            e.setSummary(d.summary());
            e.setSourceLabel(d.sourceLabel());
            e.setSourceUrl(d.sourceUrl());
            e.setMediaId(d.mediaId());
            e.setTaskId(d.taskId());
            e.setAuthorLabel(d.authorLabel());
            e.setObservedAt(d.observedAt());
            e.setRetrievedAt(d.retrievedAt());
            e.setSourceQuality(d.sourceQuality());
            e.setRelevance(d.relevance());
            e.setReliability(d.reliability());
            e.setOrigin(d.origin());
            e.setAiInferenceId(d.aiInferenceId());
            e.setAddedByUserId(d.addedByUserId());
            e.setSupersededAt(d.supersededAt());
            em.persist(e);
            for (EvidenceLink l : links == null ? List.<EvidenceLink>of() : links) {
                EvidenceLinkEntity le = new EvidenceLinkEntity();
                le.setEvidenceId(e.getId());
                le.setTargetType(l.targetType());
                le.setTargetId(l.targetId());
                le.setStance(l.stance());
                le.setNote(l.note());
                em.persist(le);
            }
            em.flush();
            return evidence(e);
        }

        @Override
        @Transactional
        public void appendSnapshot(DecisionSnapshot s) {
            DecisionSnapshotEntity e = new DecisionSnapshotEntity();
            e.setId(s.id());
            e.setDecisionId(s.decisionId());
            e.setKind(s.kind());
            e.setVersionNumber(s.versionNumber());
            e.setTakenAt(s.takenAt());
            e.setTakenByUserId(s.takenByUserId());
            e.setContentJson(s.contentJson());
            e.setContentSha256(s.contentSha256());
            e.setRationale(s.rationale());
            e.setConfidencePct(s.confidencePct());
            e.setSelectedAlternativeLabel(s.selectedAlternativeLabel());
            e.setModelVersion(s.modelVersion());
            em.persist(e);
            em.flush();
        }

        @Override
        @Transactional
        public void saveOutcome(DecisionOutcome o) {
            DecisionOutcomeEntity e = new DecisionOutcomeEntity();
            e.setDecisionId(o.decisionId());
            e.setResult(o.result());
            e.setObservedAt(o.observedAt());
            e.setSummary(o.summary());
            e.setMetricsJson(o.metricsJson());
            e.setRecordedByUserId(o.recordedByUserId());
            em.persist(e);
            em.flush();
        }

        @Override
        @Transactional
        public void appendEvent(DecisionEvent ev) {
            DecisionEventEntity e = new DecisionEventEntity();
            e.setId(ev.id());
            e.setDecisionId(ev.decisionId());
            e.setActorUserId(ev.actorUserId());
            e.setType(ev.type());
            e.setPayloadJson(ev.payloadJson());
            e.setAt(ev.at());
            e.setCorrelationId(ev.correlationId());
            em.persist(e);
            em.flush();
        }
    }

    static StoredDecision stored(DecisionEntity e) {
        Decision d = new Decision(e.getId(), e.getTitle(), e.getQuestion(), e.getContextMd(), e.getObjective(), e.getConstraintsMd(), e.getScope(),
                e.getStakeholdersJson(), e.getResourcesMd(), e.getDependenciesMd(), e.getTargetDate(), e.getOwnerUserId(), e.getCreatedByUserId(),
                e.getCompanyId(), e.getDepartmentId(), e.getSessionId(), e.getProjectId(), e.getFinalDecisionId(), e.getSupersedesDecisionId(),
                e.getStatus(), e.getComplexity(), e.getKind(), e.getImpact(), e.getUrgency(), e.getVisibility(), e.getAccessClass(),
                e.isWeightingEnabled(), e.isIndependentScoring(), e.getTemplateKey(), e.getSelectedAlternativeId(), e.getDecidedAt(),
                e.getDecisionConfidencePct(), e.getRationale(), e.getReviewEveryDays());
        return new StoredDecision(d, e.getVersion(), e.getCreatedAt(), e.getUpdatedAt());
    }

    static void apply(DecisionEntity e, Decision d) {
        e.setTitle(d.title());
        e.setQuestion(d.question());
        e.setContextMd(d.contextMd());
        e.setObjective(d.objective());
        e.setConstraintsMd(d.constraintsMd());
        e.setScope(d.scope());
        e.setStakeholdersJson(d.stakeholdersJson());
        e.setResourcesMd(d.resourcesMd());
        e.setDependenciesMd(d.dependenciesMd());
        e.setTargetDate(d.targetDate());
        e.setOwnerUserId(d.ownerUserId());
        e.setCreatedByUserId(d.createdByUserId());
        e.setCompanyId(d.companyId());
        e.setDepartmentId(d.departmentId());
        e.setSessionId(d.sessionId());
        e.setProjectId(d.projectId());
        e.setFinalDecisionId(d.finalDecisionId());
        e.setSupersedesDecisionId(d.supersedesDecisionId());
        e.setStatus(d.status());
        e.setComplexity(d.complexity());
        e.setKind(d.kind());
        e.setImpact(d.impact());
        e.setUrgency(d.urgency());
        e.setVisibility(d.visibility());
        e.setAccessClass(d.accessClass());
        e.setWeightingEnabled(d.weightingEnabled());
        e.setIndependentScoring(d.independentScoring());
        e.setTemplateKey(d.templateKey());
        e.setSelectedAlternativeId(d.selectedAlternativeId());
        e.setDecidedAt(d.decidedAt());
        e.setDecisionConfidencePct(d.decisionConfidencePct());
        e.setRationale(d.rationale());
        e.setReviewEveryDays(d.reviewEveryDays());
    }

    static DecisionAlternative alternative(DecisionAlternativeEntity a) {
        return new DecisionAlternative(a.getId(), a.getDecisionId(), a.getLabel(), a.getTitle(), a.getDescription(), a.isDoNothing(), a.getProsJson(),
                a.getConsJson(), a.getEstimatedCost(), a.getEstimatedDurationDays(), a.getDependenciesMd(), a.getStatus(), a.getDiscardReason(),
                a.getOrigin(), a.getAiInferenceId(), a.getSummaryScenarioId(), a.getProjectScenarioId(), a.getPosition());
    }

    static DecisionEvidence evidence(DecisionEvidenceEntity e) {
        return new DecisionEvidence(e.getId(), e.getDecisionId(), e.getNature(), e.getKind(), e.getTitle(), e.getSummary(), e.getSourceLabel(),
                e.getSourceUrl(), e.getMediaId(), e.getTaskId(), e.getAuthorLabel(), e.getObservedAt(), e.getRetrievedAt(), e.getSourceQuality(),
                e.getRelevance(), e.getReliability(), e.getOrigin(), e.getAiInferenceId(), e.getAddedByUserId(), e.getSupersededAt());
    }

    static DecisionAssumption assumption(DecisionAssumptionEntity e) {
        return new DecisionAssumption(e.getId(), e.getDecisionId(), e.getStatement(), e.getImportance(), e.getConfidencePct(), e.getValidationStatus(),
                e.getOwnerUserId(), e.getAlternativeId(), e.getValidationNote(), e.getValidatedAt(), e.getOrigin(), e.getAiInferenceId());
    }

    static DecisionRisk risk(DecisionRiskEntity e) {
        return new DecisionRisk(e.getId(), e.getDecisionId(), e.getTitle(), e.getDescription(), e.getAlternativeId(), e.getLikelihood(), e.getImpact(),
                e.getMitigation(), e.getOwnerUserId(), e.getSource(), e.getStatus(), e.getOrigin(), e.getAiInferenceId());
    }

    static DecisionScenario scenario(DecisionScenarioEntity e) {
        return new DecisionScenario(e.getId(), e.getDecisionId(), e.getAlternativeId(), e.getScenarioCase(), e.getDescription(), e.getLikelihood(),
                e.getAssumptionIdsJson(), e.getExpectedResult(), e.getProjectScenarioId());
    }

    static DecisionForecast forecast(DecisionForecastEntity e) {
        return new DecisionForecast(e.getId(), e.getDecisionId(), e.getAlternativeId(), e.getStatement(), e.getProbabilityPct(), e.getResolveBy(),
                e.getForecasterUserId(), e.getResolution(), e.getResolvedAt(), e.getResolvedByUserId());
    }

    static DecisionRecommendation recommendation(DecisionRecommendationEntity e) {
        return new DecisionRecommendation(e.getId(), e.getDecisionId(), e.getAlternativeId(), e.getSource(), e.getReasoningMd(), e.getSupportingJson(),
                e.getContradictingJson(), e.getCriticalAssumptionIdsJson(), e.getLimitationsMd(), e.getWhatWouldChangeMd(), e.getModelVersion(),
                e.getAiInferenceId(), e.getStatus());
    }

    static DecisionTrigger trigger(DecisionTriggerEntity e) {
        return new DecisionTrigger(e.getId(), e.getDecisionId(), e.getConditionText(), e.getMetricKey(), e.getComparator(), e.getThreshold(),
                e.getStatus(), e.getFiredAt());
    }

    static DecisionCheckpoint checkpoint(DecisionCheckpointEntity e) {
        return new DecisionCheckpoint(e.getId(), e.getDecisionId(), e.getDueAt(), e.getKind(), e.getStatus(), e.getCompletedAt(),
                e.getCompletedByUserId(), e.getStillValid(), e.getAssumptionsChanged(), e.getNewEvidence(), e.getConfidencePctAfter(), e.getAction(),
                e.getNote());
    }

    static DecisionRetrospective retrospective(DecisionRetrospectiveEntity e) {
        return new DecisionRetrospective(e.getId(), e.getDecisionId(), e.getOutcomeId(), e.getWhatHappened(), e.getWhatExpected(), e.getWhatWasRight(),
                e.getWhatWasWrong(), e.getFailedAssumptionIdsJson(), e.getProcessQuality(), e.getLessonsMd(), e.isShareAsLesson(),
                e.getReviewedByUserId(), e.getReviewedAt());
    }
}
