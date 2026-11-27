package br.gov.pr.secid.workstation.application.decisao;

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
import org.springframework.dao.OptimisticLockingFailureException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** {@link DecisionRepositoryPort} em memória para os testes do serviço (mesma semântica de versão do adaptador JPA). */
final class MemoryDecisions implements DecisionRepositoryPort {
    final Map<UUID, StoredDecision> roots = new LinkedHashMap<>();
    final List<DecisionParticipant> participants = new ArrayList<>();
    final List<DecisionAlternative> alternatives = new ArrayList<>();
    final List<DecisionCriterion> criteria = new ArrayList<>();
    final List<CriterionAssessment> assessments = new ArrayList<>();
    final List<StoredEvidence> evidence = new ArrayList<>();
    final List<EvidenceLink> links = new ArrayList<>();
    final List<DecisionSnapshot> snapshots = new ArrayList<>();
    final List<DecisionOutcome> outcomes = new ArrayList<>();
    final List<DecisionEvent> events = new ArrayList<>();
    private long tick;

    private Instant now() {
        return Instant.parse("2026-11-20T12:00:00Z").plusSeconds(tick++);
    }

    @Override
    public Optional<StoredDecision> findById(UUID id) {
        return Optional.ofNullable(roots.get(id));
    }

    @Override
    public List<StoredDecision> findCandidates(UUID userId, UUID companyId, int limit) {
        return roots.values().stream().filter(s -> {
            Decision d = s.decision();
            return d.ownerUserId().equals(userId) || roleOf(d.id(), userId).isPresent() || d.visibility() == Visibility.PUBLICA
                    || (Objects.equals(d.companyId(), companyId) && d.visibility() != Visibility.PRIVADA);
        }).sorted(Comparator.comparing(StoredDecision::updatedAt).reversed()).limit(limit).toList();
    }

    @Override
    public Optional<DecisionRole> roleOf(UUID decisionId, UUID userId) {
        return participants.stream().filter(p -> p.decisionId().equals(decisionId) && p.userId().equals(userId)).map(DecisionParticipant::role)
                .findFirst();
    }

    @Override
    public Graph graph(UUID id) {
        List<UUID> alts = alternatives.stream().filter(a -> a.decisionId().equals(id)).map(DecisionAlternative::id).toList();
        List<StoredEvidence> ev = evidence.stream().filter(e -> e.evidence().decisionId().equals(id)).toList();
        List<UUID> evIds = ev.stream().map(e -> e.evidence().id()).toList();
        return new Graph(participants.stream().filter(p -> p.decisionId().equals(id)).toList(),
                alternatives.stream().filter(a -> a.decisionId().equals(id)).toList(),
                criteria.stream().filter(c -> c.decisionId().equals(id)).toList(),
                assessments.stream().filter(a -> alts.contains(a.alternativeId())).toList(), ev,
                links.stream().filter(l -> evIds.contains(l.evidenceId())).toList(),
                snapshots.stream().filter(s -> s.decisionId().equals(id)).toList(),
                outcomes.stream().filter(o -> o.decisionId().equals(id)).findFirst().orElse(null),
                events.stream().filter(e -> e.decisionId().equals(id)).toList());
    }

    @Override
    public StoredDecision insert(Decision d) {
        UUID id = UUID.randomUUID();
        Decision withId = new Decision(id, d.title(), d.question(), d.contextMd(), d.objective(), d.constraintsMd(), d.scope(), d.stakeholdersJson(),
                d.resourcesMd(), d.dependenciesMd(), d.targetDate(), d.ownerUserId(), d.createdByUserId(), d.companyId(), d.departmentId(),
                d.sessionId(), d.projectId(), d.finalDecisionId(), d.supersedesDecisionId(), d.status(), d.complexity(), d.kind(), d.impact(),
                d.urgency(), d.visibility(), d.accessClass(), d.weightingEnabled(), d.independentScoring(), d.templateKey(),
                d.selectedAlternativeId(), d.decidedAt(), d.decisionConfidencePct(), d.rationale(), d.reviewEveryDays());
        Instant at = now();
        StoredDecision s = new StoredDecision(withId, 0, at, at);
        roots.put(id, s);
        return s;
    }

    @Override
    public StoredDecision update(Decision d, long expectedVersion) {
        StoredDecision cur = roots.get(d.id());
        if (cur == null || cur.version() != expectedVersion) {
            throw new OptimisticLockingFailureException("stale");
        }
        StoredDecision s = new StoredDecision(d, expectedVersion + 1, cur.createdAt(), now());
        roots.put(d.id(), s);
        return s;
    }

    @Override
    public DecisionParticipant addParticipant(DecisionParticipant p) {
        DecisionParticipant n = new DecisionParticipant(UUID.randomUUID(), p.decisionId(), p.userId(), p.role(), p.joinedAt(),
                p.assessmentsSubmittedAt());
        participants.add(n);
        return n;
    }

    @Override
    public DecisionAlternative addAlternative(DecisionAlternative a) {
        DecisionAlternative n = new DecisionAlternative(UUID.randomUUID(), a.decisionId(), a.label(), a.title(), a.description(), a.doNothing(),
                a.prosJson(), a.consJson(), a.estimatedCost(), a.estimatedDurationDays(), a.dependenciesMd(), a.status(), a.discardReason(),
                a.origin(), a.aiInferenceId(), a.summaryScenarioId(), a.projectScenarioId(), a.position());
        alternatives.add(n);
        return n;
    }

    @Override
    public DecisionCriterion addCriterion(DecisionCriterion c) {
        DecisionCriterion n = new DecisionCriterion(UUID.randomUUID(), c.decisionId(), c.name(), c.description(), c.direction(), c.weightPct(),
                c.catalogKey(), c.origin(), c.aiInferenceId(), c.position());
        criteria.add(n);
        return n;
    }

    @Override
    public void setWeight(UUID criterionId, BigDecimal weightPct) {
        criteria.replaceAll(c -> c.id().equals(criterionId) ? new DecisionCriterion(c.id(), c.decisionId(), c.name(), c.description(), c.direction(),
                weightPct, c.catalogKey(), c.origin(), c.aiInferenceId(), c.position()) : c);
    }

    @Override
    public void putAssessment(CriterionAssessment a) {
        removeAssessment(a.alternativeId(), a.criterionId(), a.assessorUserId());
        assessments.add(new CriterionAssessment(UUID.randomUUID(), a.alternativeId(), a.criterionId(), a.assessorUserId(), a.score(), a.rationale(),
                a.submittedAt(), a.origin()));
    }

    @Override
    public void removeAssessment(UUID alternativeId, UUID criterionId, UUID assessorUserId) {
        assessments.removeIf(x -> x.alternativeId().equals(alternativeId) && x.criterionId().equals(criterionId)
                && x.assessorUserId().equals(assessorUserId));
    }

    @Override
    public DecisionEvidence addEvidence(DecisionEvidence e, List<EvidenceLink> ls) {
        UUID id = UUID.randomUUID();
        DecisionEvidence n = new DecisionEvidence(id, e.decisionId(), e.nature(), e.kind(), e.title(), e.summary(), e.sourceLabel(), e.sourceUrl(),
                e.mediaId(), e.taskId(), e.authorLabel(), e.observedAt(), e.retrievedAt(), e.sourceQuality(), e.relevance(), e.reliability(),
                e.origin(), e.aiInferenceId(), e.addedByUserId(), e.supersededAt());
        evidence.add(new StoredEvidence(n, now()));
        ls.forEach(l -> links.add(new EvidenceLink(UUID.randomUUID(), id, l.targetType(), l.targetId(), l.stance(), l.note())));
        return n;
    }

    @Override
    public void appendSnapshot(DecisionSnapshot s) {
        snapshots.add(s);
    }

    @Override
    public void saveOutcome(DecisionOutcome o) {
        outcomes.add(new DecisionOutcome(UUID.randomUUID(), o.decisionId(), o.result(), o.observedAt(), o.summary(), o.metricsJson(),
                o.recordedByUserId()));
    }

    @Override
    public void appendEvent(DecisionEvent e) {
        events.add(e);
    }

    /** Só para testes: adiciona um participante com papel. */
    void join(UUID decisionId, UUID userId, DecisionRole role) {
        addParticipant(new DecisionParticipant(null, decisionId, userId, role, now(), null));
    }

    /** Só para testes: muda a visibilidade da raiz sem mexer na versão. */
    void setVisibility(UUID id, Visibility v) {
        StoredDecision s = roots.get(id);
        Decision d = s.decision();
        roots.put(id, new StoredDecision(new Decision(d.id(), d.title(), d.question(), d.contextMd(), d.objective(), d.constraintsMd(), d.scope(),
                d.stakeholdersJson(), d.resourcesMd(), d.dependenciesMd(), d.targetDate(), d.ownerUserId(), d.createdByUserId(), d.companyId(),
                d.departmentId(), d.sessionId(), d.projectId(), d.finalDecisionId(), d.supersedesDecisionId(), d.status(), d.complexity(), d.kind(),
                d.impact(), d.urgency(), v, d.accessClass(), d.weightingEnabled(), d.independentScoring(), d.templateKey(),
                d.selectedAlternativeId(), d.decidedAt(), d.decisionConfidencePct(), d.rationale(), d.reviewEveryDays()), s.version(),
                s.createdAt(), s.updatedAt()));
    }
}
