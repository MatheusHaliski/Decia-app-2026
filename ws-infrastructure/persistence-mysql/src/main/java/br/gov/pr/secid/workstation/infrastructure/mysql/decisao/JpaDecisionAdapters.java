package br.gov.pr.secid.workstation.infrastructure.mysql.decisao;

import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.Graph;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredDecision;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredEvidence;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.CriterionAssessment;
import br.gov.pr.secid.workstation.domain.decisao.Decision;
import br.gov.pr.secid.workstation.domain.decisao.DecisionAlternative;
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
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionCriterionEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionEventEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionEvidenceEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionOutcomeEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionParticipantEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionSnapshotEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.EvidenceLinkEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adaptador JPA de {@link DecisionRepositoryPort} (V22, fase 7 do DECIA) sobre as entidades geradas pelo SchemaGenerator (sem mudar os
 * repositórios gerados: as consultas da API ficam aqui, em JPQL). Ids da raiz e dos filhos são gerados pelo Hibernate; snapshots e eventos
 * (append-only, {@code @Immutable}) recebem o id do serviço. Toda gravação da raiz força o incremento imediato da versão
 * ({@code PESSIMISTIC_FORCE_INCREMENT}), como no Acervo: um lote que só mexe nos filhos também invalida a cópia antiga (409).
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
            return new Graph(participants, alternatives, criteria, assessments, evidence, links, snapshots, outcome, events);
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
}
