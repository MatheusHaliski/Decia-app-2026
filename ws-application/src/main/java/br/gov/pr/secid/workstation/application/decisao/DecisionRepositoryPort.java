package br.gov.pr.secid.workstation.application.decisao;

import br.gov.pr.secid.workstation.domain.decisao.CriterionAssessment;
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

    /** Recomendação com o carimbo de criação (a UI ordena e mostra "gerada em"). */
    record StoredRecommendation(DecisionRecommendation recommendation, Instant createdAt) {
    }

    /** Vínculo de trabalho com o carimbo de criação. */
    record StoredWorkLink(DecisionWorkLink link, Instant createdAt) {
    }

    /** Registros da fase 7b (premissas, riscos, cenários, previsões, recomendações, gatilhos, checkpoints, vínculos e retrospectiva). */
    record Records(List<DecisionAssumption> assumptions, List<DecisionRisk> risks, List<DecisionScenario> scenarios,
                   List<DecisionForecast> forecasts, List<StoredRecommendation> recommendations, List<DecisionTrigger> triggers,
                   List<DecisionCheckpoint> checkpoints, List<StoredWorkLink> workLinks, DecisionRetrospective retrospective) {
        public Records {
            assumptions = List.copyOf(assumptions);
            risks = List.copyOf(risks);
            scenarios = List.copyOf(scenarios);
            forecasts = List.copyOf(forecasts);
            recommendations = List.copyOf(recommendations);
            triggers = List.copyOf(triggers);
            checkpoints = List.copyOf(checkpoints);
            workLinks = List.copyOf(workLinks);
        }

        public static Records empty() {
            return new Records(List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), null);
        }
    }

    /** Filhos da decisão lidos para montar a visão (ordem: posição/data). {@code outcome} nulo = sem resultado registrado. */
    record Graph(List<DecisionParticipant> participants, List<DecisionAlternative> alternatives, List<DecisionCriterion> criteria,
                 List<CriterionAssessment> assessments, List<StoredEvidence> evidence, List<EvidenceLink> evidenceLinks,
                 List<DecisionSnapshot> snapshots, DecisionOutcome outcome, List<DecisionEvent> events, Records records) {
        public Graph {
            participants = List.copyOf(participants);
            alternatives = List.copyOf(alternatives);
            criteria = List.copyOf(criteria);
            assessments = List.copyOf(assessments);
            evidence = List.copyOf(evidence);
            evidenceLinks = List.copyOf(evidenceLinks);
            snapshots = List.copyOf(snapshots);
            events = List.copyOf(events);
            records = records == null ? Records.empty() : records;
        }

        public Graph(List<DecisionParticipant> participants, List<DecisionAlternative> alternatives, List<DecisionCriterion> criteria,
                     List<CriterionAssessment> assessments, List<StoredEvidence> evidence, List<EvidenceLink> evidenceLinks,
                     List<DecisionSnapshot> snapshots, DecisionOutcome outcome, List<DecisionEvent> events) {
            this(participants, alternatives, criteria, assessments, evidence, evidenceLinks, snapshots, outcome, events, Records.empty());
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

    // ---------------------------------------------------------------------------------------------- fase 7b: registros da decisão

    /** Insere (id nulo → gerado) ou substitui a premissa; devolve o estado gravado. */
    DecisionAssumption saveAssumption(DecisionAssumption assumption);

    void removeAssumption(UUID decisionId, UUID id);

    DecisionRisk saveRisk(DecisionRisk risk);

    void removeRisk(UUID decisionId, UUID id);

    DecisionScenario saveScenario(DecisionScenario scenario);

    void removeScenario(UUID decisionId, UUID id);

    DecisionForecast saveForecast(DecisionForecast forecast);

    StoredRecommendation saveRecommendation(DecisionRecommendation recommendation);

    DecisionTrigger saveTrigger(DecisionTrigger trigger);

    void removeTrigger(UUID decisionId, UUID id);

    DecisionCheckpoint saveCheckpoint(DecisionCheckpoint checkpoint);

    /** Liga a decisão ao trabalho (id do vínculo vem do serviço). Único por (decisão, tipo, alvo). */
    StoredWorkLink addWorkLink(DecisionWorkLink link, Instant at);

    void removeWorkLink(UUID decisionId, UUID id);

    DecisionRetrospective saveRetrospective(DecisionRetrospective retrospective);

    /** Decisões com vínculo para o alvo (ex.: a página da tarefa), mais recentes primeiro; o serviço filtra uma a uma pelo acesso. */
    List<StoredDecision> findByWorkTarget(WorkLinkTarget type, UUID targetId, int limit);

    /**
     * Escopo de acesso do alvo de um vínculo (tarefa, projeto ou marco do projeto) para conferir que quem liga o vê; vazio = inexistente.
     * O serviço responde o mesmo 422 para inexistente e invisível (sem oráculo de existência).
     */
    Optional<ScopedResource> workTarget(WorkLinkTarget type, UUID targetId);
}
