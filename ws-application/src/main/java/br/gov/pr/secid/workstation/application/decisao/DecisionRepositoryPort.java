package br.gov.pr.secid.workstation.application.decisao;

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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Acesso ao agregado da decisão estruturada (V22: {@code decisions} e filhos) para a API da fase 7 (docs/decia/08). Adaptador JPA em
 * persistence-mysql. Toda escrita acontece dentro da transação do {@link DecisionService}; {@link #update} exige a versão esperada e a
 * incrementa na hora (409 EDICAO_CONCORRENTE com cópia antiga). Snapshots e eventos são append-only.
 */
public interface DecisionRepositoryPort {

    /** Decisão persistida com a versão do lock otimista e os carimbos do banco. */
    record StoredDecision(Decision decision, long version, Instant createdAt, Instant updatedAt) {
    }

    /** Evidência com o carimbo de criação (vira {@code addedAt} na API). */
    record StoredEvidence(DecisionEvidence evidence, Instant addedAt) {
    }

    /** Filhos da decisão lidos para montar a visão (ordem: posição/data). {@code outcome} nulo = sem resultado registrado. */
    record Graph(List<DecisionParticipant> participants, List<DecisionAlternative> alternatives, List<DecisionCriterion> criteria,
                 List<CriterionAssessment> assessments, List<StoredEvidence> evidence, List<EvidenceLink> evidenceLinks,
                 List<DecisionSnapshot> snapshots, DecisionOutcome outcome, List<DecisionEvent> events) {
        public Graph {
            participants = List.copyOf(participants);
            alternatives = List.copyOf(alternatives);
            criteria = List.copyOf(criteria);
            assessments = List.copyOf(assessments);
            evidence = List.copyOf(evidence);
            evidenceLinks = List.copyOf(evidenceLinks);
            snapshots = List.copyOf(snapshots);
            events = List.copyOf(events);
        }

        public static Graph empty() {
            return new Graph(List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), null, List.of());
        }
    }

    Optional<StoredDecision> findById(UUID id);

    /**
     * Candidatas à listagem de quem pede, mais recentes primeiro: as que a pessoa é responsável ou participante, as da sua empresa fora de
     * PRIVADA e as PUBLICA. O serviço ainda filtra uma a uma pela {@code DecisionAccessPolicy} (classificação, departamento).
     */
    List<StoredDecision> findCandidates(UUID userId, UUID companyId, int limit);

    /** Papel DACI da pessoa nesta decisão (vazio = não participa). */
    Optional<DecisionRole> roleOf(UUID decisionId, UUID userId);

    Graph graph(UUID decisionId);

    /** Insere a decisão (id gerado pelo banco) e devolve o estado persistido. */
    StoredDecision insert(Decision decision);

    /** Grava a raiz exigindo {@code expectedVersion} e incrementando-a mesmo quando só os filhos mudaram. */
    StoredDecision update(Decision decision, long expectedVersion);

    DecisionParticipant addParticipant(DecisionParticipant participant);

    DecisionAlternative addAlternative(DecisionAlternative alternative);

    DecisionCriterion addCriterion(DecisionCriterion criterion);

    void setWeight(UUID criterionId, BigDecimal weightPct);

    /** Grava (ou substitui) a nota de um avaliador para (alternativa, critério). */
    void putAssessment(CriterionAssessment assessment);

    void removeAssessment(UUID alternativeId, UUID criterionId, UUID assessorUserId);

    /** Insere a evidência e as ligações (o {@code evidenceId} das ligações é preenchido aqui). */
    DecisionEvidence addEvidence(DecisionEvidence evidence, List<EvidenceLink> links);

    void appendSnapshot(DecisionSnapshot snapshot);

    void saveOutcome(DecisionOutcome outcome);

    void appendEvent(DecisionEvent event);
}
