package br.gov.pr.secid.workstation.application.decisao;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.Graph;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredDecision;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.Records;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredEvidence;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredRecommendation;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredWorkLink;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionAlternativeView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionAssessmentView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionAssumptionView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionCheckpointView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionForecastView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionRecommendationView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionRetrospectiveView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionRiskView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionScenarioView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionTriggerView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionWorkLinkView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionCriterionView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionEventView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionEvidenceLinkView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionEvidenceView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionOutcomeView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionParticipantView;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionPermissions;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionRoot;
import br.gov.pr.secid.workstation.application.decisao.DecisionView.DecisionSnapshotView;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.DomainRuleException;
import br.gov.pr.secid.workstation.domain.common.InvalidTransitionException;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.AlternativeStatus;
import br.gov.pr.secid.workstation.domain.decisao.ContentOrigin;
import br.gov.pr.secid.workstation.domain.decisao.CriterionAssessment;
import br.gov.pr.secid.workstation.domain.decisao.CriterionDirection;
import br.gov.pr.secid.workstation.domain.decisao.Decision;
import br.gov.pr.secid.workstation.domain.decisao.DecisionAlternative;
import br.gov.pr.secid.workstation.domain.decisao.DecisionAssumption;
import br.gov.pr.secid.workstation.domain.decisao.DecisionCheckpoint;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionCriterion;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEvent;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEventType;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEvidence;
import br.gov.pr.secid.workstation.domain.decisao.DecisionForecast;
import br.gov.pr.secid.workstation.domain.decisao.DecisionKind;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.DecisionOutcome;
import br.gov.pr.secid.workstation.domain.decisao.DecisionParticipant;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRecommendation;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRetrospective;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRisk;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRole;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRules;
import br.gov.pr.secid.workstation.domain.decisao.DecisionScenario;
import br.gov.pr.secid.workstation.domain.decisao.DecisionSnapshot;
import br.gov.pr.secid.workstation.domain.decisao.DecisionTrigger;
import br.gov.pr.secid.workstation.domain.decisao.DecisionWorkLink;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceKind;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceLink;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceStance;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceTarget;
import br.gov.pr.secid.workstation.domain.decisao.RelevanceLevel;
import br.gov.pr.secid.workstation.domain.decisao.SnapshotKind;
import br.gov.pr.secid.workstation.domain.decisao.SourceQuality;
import br.gov.pr.secid.workstation.domain.decisao.WorkLinkTarget;
import br.gov.pr.secid.workstation.domain.decisao.analise.DivergenceAnalysis;
import br.gov.pr.secid.workstation.domain.decisao.analise.EvidenceStrength;
import br.gov.pr.secid.workstation.domain.decisao.analise.MatrixInput;
import br.gov.pr.secid.workstation.domain.decisao.analise.PreDecisionGuard;
import br.gov.pr.secid.workstation.domain.decisao.analise.Readiness;
import br.gov.pr.secid.workstation.domain.decisao.analise.RecommendationValidator;
import br.gov.pr.secid.workstation.domain.decisao.analise.WeightedScoring;
import br.gov.pr.secid.workstation.domain.security.AccessDecision;
import br.gov.pr.secid.workstation.domain.security.AccessPolicy;
import br.gov.pr.secid.workstation.domain.security.DecisionAccessPolicy;
import br.gov.pr.secid.workstation.domain.security.ResourceAction;
import br.gov.pr.secid.workstation.domain.security.ScopedResource;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.slf4j.MDC;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Decisão estruturada — serviços de aplicação da fase 7 (docs/decia/08, 03_MODELO_FUNCIONAL §4.3/§8). Criar, listar as que a pessoa vê,
 * abrir e aplicar um lote de {@link DecisionCommand comandos} numa transação, com a versão otimista da raiz (409 EDICAO_CONCORRENTE).
 * <ul>
 *   <li>BOLA: toda rota com id passa por {@link ResourceAuthorizer#requireDecision}; inexistente e invisível respondem o MESMO 404.</li>
 *   <li>BFLA: cada comando exige a ação do papel DACI ({@link DecisionAccessPolicy}); visível sem a ação → 403.</li>
 *   <li>Toda escrita grava {@code decision_events} (append-only; payload só com ids, enums e números) e uma linha de {@code audit_log}.</li>
 *   <li>Decidir passa pelo guarda pré-decisão (§6.10) calculado aqui com os fatos gravados e grava o snapshot DECISAO com SHA-256 (§6.12).</li>
 * </ul>
 * Nada de pergunta, motivo, título ou nome de pessoa vai para log, evento ou auditoria.
 */
@Service
public class DecisionService {
    static final int MAX_LIST = 100;
    static final int MAX_COMMANDS = 50;
    static final int MIN_QUESTION = 15;
    static final int MAX_QUESTION = 500;
    static final int MAX_TITLE = 160;
    static final int MAX_CRITERION = 120;
    static final int MAX_CRITERIA_ON_CREATE = 20;
    static final int MAX_EVIDENCE_TITLE = 200;
    static final int MAX_SOURCE_LABEL = 300;
    static final int MAX_RATIONALE = 5000;
    static final int MAX_TEMPLATE_KEY = 60;
    static final String CICLO_INVALIDO = "DECISAO_CICLO_TRANSICAO_INVALIDA";

    /** Caminho explícito até AGUARDANDO_DECISAO para o "Decidir" de uma ação (§4.3) — o mesmo PATH_TO_AWAITING de lib/decia/types.ts. */
    static final Map<DecisionLifecycle, List<DecisionLifecycle>> PATH_TO_AWAITING = pathToAwaiting();

    static final ObjectMapper JSON = JsonMapper.builder().build();
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRINGS = new TypeReference<>() {
    };

    private final DecisionRepositoryPort decisions;
    private final ResourceAuthorizer authorizer;
    private final AuditLogPort audit;
    private final Clock clock;
    private final DecisionRecordCommands records;

    public DecisionService(DecisionRepositoryPort decisions, ResourceAuthorizer authorizer, AuditLogPort audit, Clock clock) {
        this.decisions = decisions;
        this.authorizer = authorizer;
        this.audit = audit;
        this.clock = clock;
        this.records = new DecisionRecordCommands(this, decisions);
    }

    /** Criação (botão "Nova decisão"): o responsável é quem cria (G1), CONDUTOR; critérios opcionais vêm do modelo escolhido. */
    public record NewDecision(String question, DecisionComplexity complexity, DecisionLevel impact, DecisionKind kind, DecisionLevel urgency,
                              String templateKey, Visibility visibility, List<String> criteria, UUID projectId) {

        public NewDecision(String question, DecisionComplexity complexity, DecisionLevel impact, DecisionKind kind, DecisionLevel urgency,
                           String templateKey, Visibility visibility, List<String> criteria) {
            this(question, complexity, impact, kind, urgency, templateKey, visibility, criteria, null);
        }
    }

    // ------------------------------------------------------------------------------------------------ leitura

    public List<DecisionView> list(CurrentUser actor, int limit) {
        Viewer viewer = authorizer.viewer(actor);
        int size = Math.max(1, Math.min(limit, MAX_LIST));
        List<DecisionView> out = new ArrayList<>();
        for (StoredDecision s : decisions.findCandidates(viewer.userId(), viewer.companyId(), size)) {
            DecisionRole role = decisions.roleOf(s.decision().id(), viewer.userId()).orElse(null);
            if (DecisionAccessPolicy.decide(viewer, s.decision(), role, false, ResourceAction.VIEW) == AccessDecision.ALLOW) {
                out.add(view(viewer, role, s, decisions.graph(s.decision().id())));
            }
        }
        return out;
    }

    /**
     * Decisões ligadas a um item de trabalho (bloco "Decisões ligadas" da tarefa/projeto): o alvo precisa ser visível para quem pede — senão a
     * lista volta vazia, sem dizer se o alvo existe — e cada decisão passa pela mesma política da listagem.
     */
    public List<DecisionView> listLinked(CurrentUser actor, WorkLinkTarget type, UUID targetId, int limit) {
        Viewer viewer = authorizer.viewer(actor);
        if (type == null || targetId == null || !targetVisible(viewer, type, targetId)) {
            return List.of();
        }
        int size = Math.max(1, Math.min(limit, MAX_LIST));
        List<DecisionView> out = new ArrayList<>();
        for (StoredDecision s : decisions.findByWorkTarget(type, targetId, size)) {
            DecisionRole role = decisions.roleOf(s.decision().id(), viewer.userId()).orElse(null);
            if (DecisionAccessPolicy.decide(viewer, s.decision(), role, false, ResourceAction.VIEW) == AccessDecision.ALLOW) {
                out.add(view(viewer, role, s, decisions.graph(s.decision().id())));
            }
        }
        return out;
    }

    boolean targetVisible(Viewer viewer, WorkLinkTarget type, UUID targetId) {
        return decisions.workTarget(type, targetId).map(r -> AccessPolicy.visible(viewer, r)).orElse(false);
    }

    public DecisionView get(CurrentUser actor, UUID id) {
        Viewer viewer = authorizer.viewer(actor);
        StoredDecision stored = load(id);
        DecisionRole role = decisions.roleOf(id, viewer.userId()).orElse(null);
        authorizer.requireDecision(viewer, stored.decision(), role, false, ResourceAction.VIEW);
        return view(viewer, role, stored, decisions.graph(id));
    }

    // ------------------------------------------------------------------------------------------------ criação

    @Transactional
    public DecisionView create(CurrentUser actor, NewDecision in, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        Map<String, Object> errors = new LinkedHashMap<>();
        String question = in.question() == null ? "" : in.question().strip();
        if (question.length() < MIN_QUESTION || question.length() > MAX_QUESTION || !question.endsWith("?")) {
            errors.put("question", "Escreva a pergunta com " + MIN_QUESTION + " a " + MAX_QUESTION + " caracteres, terminando em \"?\".");
        }
        if (in.complexity() == null) {
            errors.put("complexity", "Escolha a complexidade.");
        }
        if (in.impact() == null) {
            errors.put("impact", "Escolha o impacto.");
        }
        String template = blankToNull(in.templateKey());
        if (template != null && (template.length() > MAX_TEMPLATE_KEY || !template.matches("[a-z0-9_-]+"))) {
            errors.put("templateKey", "Modelo inválido.");
        }
        List<String> criteria = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        List<String> raw = in.criteria() == null ? List.of() : in.criteria();
        if (raw.size() > MAX_CRITERIA_ON_CREATE) {
            errors.put("criteria", "Até " + MAX_CRITERIA_ON_CREATE + " critérios na criação.");
        }
        for (String c : raw) {
            String name = c == null ? "" : c.strip();
            if (name.isEmpty() || name.length() > MAX_CRITERION || !seen.add(name.toLowerCase(Locale.ROOT))) {
                errors.put("criteria", "Critérios com 1 a " + MAX_CRITERION + " caracteres, sem repetir.");
                break;
            }
            criteria.add(name);
        }
        if (in.projectId() != null && !targetVisible(viewer, WorkLinkTarget.PROJETO, in.projectId())) {
            errors.put("projectId", "Projeto inexistente ou fora do seu acesso.");
        }
        if (!errors.isEmpty()) {
            throw invalid(errors);
        }
        if (viewer.companyId() == null) {
            throw ApiException.unprocessable("DECISAO_SEM_EMPRESA", "Decisões estruturadas pertencem a uma empresa: vincule sua conta antes.",
                    Map.of());
        }
        String title = question.replaceAll("\\?+$", "").strip();
        title = title.length() > MAX_TITLE ? title.substring(0, MAX_TITLE) : title;
        DecisionComplexity complexity = in.complexity();
        Decision draft = new Decision(null, title, question, null, null, null, null, null, null, null, null, viewer.userId(), viewer.userId(),
                viewer.companyId(), viewer.departmentId(), null, in.projectId(), null, null, DecisionLifecycle.RASCUNHO, complexity,
                in.kind() == null ? DecisionKind.OPERACIONAL : in.kind(), in.impact(), in.urgency() == null ? DecisionLevel.MEDIO : in.urgency(),
                in.visibility() == null ? Visibility.PRIVADA : in.visibility(), AccessClassification.INTERNO,
                complexity == DecisionComplexity.PROFUNDA, false, template, null, null, null, null, null);
        StoredDecision stored = decisions.insert(draft);
        UUID id = stored.decision().id();
        Instant now = clock.instant();
        decisions.addParticipant(new DecisionParticipant(null, id, viewer.userId(), DecisionRole.CONDUTOR, now, null));
        Trail trail = new Trail(id, viewer.userId(), now);
        trail.add(DecisionEventType.DECISAO_CRIADA, Map.of("complexity", complexity.name()));
        for (int i = 0; i < criteria.size(); i++) {
            decisions.addCriterion(new DecisionCriterion(null, id, criteria.get(i), null, CriterionDirection.MAIOR_MELHOR, null, null,
                    ContentOrigin.HUMANO, null, i));
        }
        if (!criteria.isEmpty()) {
            trail.add(DecisionEventType.CRITERIO_ATUALIZADO, Map.of("added", criteria.size()));
        }
        if (in.projectId() != null) {
            // o projeto da raiz também vira vínculo de trabalho (o bloco "Decisões ligadas" do projeto lê os vínculos)
            UUID linkId = UUID.randomUUID();
            decisions.addWorkLink(new DecisionWorkLink(linkId, id, WorkLinkTarget.PROJETO, in.projectId(), viewer.userId()), now);
            trail.add(DecisionEventType.TRABALHO_VINCULADO, Map.of("linkId", linkId.toString(), "targetType", WorkLinkTarget.PROJETO.name()));
        }
        trail.flush();
        audit.record(AuditEvent.of(viewer.userId(), AuditActions.DECISION_CREATED, "decision", id.toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("complexity", complexity.name(), "criteria", criteria.size())));
        return view(viewer, DecisionRole.CONDUTOR, stored, decisions.graph(id));
    }

    // ------------------------------------------------------------------------------------------------ comandos

    /**
     * Aplica o lote numa transação: tudo ou nada. {@code version} é a versão que o cliente leu; diferente da atual → 409 EDICAO_CONCORRENTE
     * antes de qualquer escrita. Devolve o agregado relido (versão nova).
     */
    @Transactional
    public DecisionView apply(CurrentUser actor, UUID id, long version, List<DecisionCommand> commands, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        StoredDecision stored = load(id);
        DecisionRole role = decisions.roleOf(id, viewer.userId()).orElse(null);
        authorizer.requireDecision(viewer, stored.decision(), role, false, ResourceAction.VIEW);
        if (commands == null || commands.isEmpty() || commands.size() > MAX_COMMANDS) {
            throw invalid(Map.of("commands", "Envie de 1 a " + MAX_COMMANDS + " comandos."));
        }
        if (stored.version() != version) {
            throw new OptimisticLockingFailureException("decisão " + id + " em outra versão");
        }
        Work w = new Work(viewer, role, stored.decision(), decisions.graph(id), clock.instant());
        DecisionLifecycle from = w.decision.status();
        List<String> kinds = new ArrayList<>();
        for (int i = 0; i < commands.size(); i++) {
            DecisionCommand c = commands.get(i);
            if (c == null || c.type() == null) {
                throw invalid(Map.of(field(i, "type"), "Informe o tipo do comando."));
            }
            kinds.add(c.type().name());
            try {
                run(w, c, i);
            } catch (InvalidTransitionException e) {
                throw new ApiException(e.getCode(), 409, "Transição não permitida: " + e.getFrom() + " → " + e.getTo() + ".",
                        Map.of("command", i));
            } catch (DomainRuleException e) {
                throw translate(e, i);
            }
        }
        w.trail.flush();
        StoredDecision saved = decisions.update(w.decision, version);
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("commands", String.join(",", kinds));
        meta.put("version", saved.version());
        if (from != w.decision.status()) {
            meta.put("from", from.name());
            meta.put("to", w.decision.status().name());
        }
        String action = w.decided ? AuditActions.DECISION_DECIDED : w.reopened ? AuditActions.DECISION_REOPENED : AuditActions.DECISION_CHANGED;
        audit.record(AuditEvent.of(viewer.userId(), action, "decision", id.toString(), AuditEvent.OK, ctx.ip(), ctx.userAgent(), meta));
        return view(viewer, role, saved, decisions.graph(id));
    }

    private void run(Work w, DecisionCommand c, int i) {
        switch (c.type()) {
            case TRANSITION -> transition(w, c, i);
            case REOPEN -> reopen(w, c);
            case ADD_ALTERNATIVE -> addAlternative(w, c, i);
            case ADD_CRITERION -> addCriterion(w, c, i);
            case SET_WEIGHT -> setWeight(w, c, i);
            case SET_SCORE -> setScore(w, c, i);
            case ADD_EVIDENCE -> addEvidence(w, c, i);
            case DECIDE -> decide(w, c, i);
            case RECORD_OUTCOME -> recordOutcome(w, c, i);
            case PUT_ASSUMPTION -> records.putAssumption(w, c, i);
            case REMOVE_ASSUMPTION -> records.removeAssumption(w, c, i);
            case PUT_RISK -> records.putRisk(w, c, i);
            case REMOVE_RISK -> records.removeRisk(w, c, i);
            case PUT_SCENARIO -> records.putScenario(w, c, i);
            case REMOVE_SCENARIO -> records.removeScenario(w, c, i);
            case PUT_FORECAST -> records.putForecast(w, c, i);
            case PUT_RECOMMENDATION -> records.putRecommendation(w, c, i);
            case PUT_TRIGGER -> records.putTrigger(w, c, i);
            case REMOVE_TRIGGER -> records.removeTrigger(w, c, i);
            case PUT_CHECKPOINT -> records.putCheckpoint(w, c, i);
            case LINK_WORK -> records.linkWork(w, c, i);
            case UNLINK_WORK -> records.unlinkWork(w, c, i);
            case PUT_RETROSPECTIVE -> records.putRetrospective(w, c, i);
            default -> throw invalid(Map.of(field(i, "type"), "Comando desconhecido."));
        }
    }

    private void transition(Work w, DecisionCommand c, int i) {
        if (c.to() == null) {
            throw invalid(Map.of(field(i, "to"), "Informe o novo estado."));
        }
        if (c.to() == DecisionLifecycle.REABERTA) {
            reopen(w, c);
            return;
        }
        require(w, ResourceAction.EDIT);
        DecisionLifecycle from = w.decision.status();
        w.decision = w.decision.transition(c.to());
        w.trail.add(DecisionEventType.ESTADO_ALTERADO, Map.of("from", from.name(), "to", c.to().name()));
        if (c.to() == DecisionLifecycle.ARQUIVADA) {
            w.trail.add(DecisionEventType.DECISAO_ARQUIVADA, Map.of());
        }
    }

    private void reopen(Work w, DecisionCommand c) {
        require(w, ResourceAction.REOPEN);
        DecisionLifecycle from = w.decision.status();
        w.decision = w.decision.reopen(w.viewer.userId(), false);
        String reason = blankToNull(c.rationale());
        reason = reason == null ? "Reaberta para revisão." : clip(reason, MAX_RATIONALE);
        DecisionSnapshot snap = snapshot(w, SnapshotKind.REABERTURA, reason, w.decision.decisionConfidencePct(), w.decision.selectedAlternativeId(),
                Map.of());
        w.trail.add(DecisionEventType.DECISAO_REABERTA, Map.of("snapshotId", snap.id().toString()));
        w.trail.add(DecisionEventType.ESTADO_ALTERADO, Map.of("from", from.name(), "to", DecisionLifecycle.REABERTA.name()));
        w.reopened = true;
    }

    private void addAlternative(Work w, DecisionCommand c, int i) {
        require(w, ResourceAction.EDIT_STRUCTURE);
        requireEditable(w);
        String title = c.title() == null ? "" : c.title().strip();
        if (title.isEmpty() || title.length() > MAX_TITLE) {
            throw invalid(Map.of(field(i, "title"), "Título da alternativa com 1 a " + MAX_TITLE + " caracteres."));
        }
        int position = w.alternatives.size();
        DecisionAlternative alt = decisions.addAlternative(new DecisionAlternative(null, w.decision.id(), label(position), title, null,
                Boolean.TRUE.equals(c.doNothing()), "[]", "[]", null, null, null, AlternativeStatus.ATIVA, null, ContentOrigin.HUMANO, null,
                null, null, position));
        w.alternatives.add(alt);
        w.ref(c.ref(), alt.id(), i);
        w.trail.add(DecisionEventType.ALTERNATIVA_CRIADA, Map.of("label", alt.label(), "alternativeId", alt.id().toString()));
    }

    private void addCriterion(Work w, DecisionCommand c, int i) {
        require(w, ResourceAction.EDIT_STRUCTURE);
        requireEditable(w);
        String name = c.name() == null ? "" : c.name().strip();
        boolean duplicate = w.criteria.stream().anyMatch(x -> x.name().equalsIgnoreCase(name));
        if (name.isEmpty() || name.length() > MAX_CRITERION || duplicate) {
            throw invalid(Map.of(field(i, "name"), "Critério com 1 a " + MAX_CRITERION + " caracteres, sem repetir."));
        }
        DecisionCriterion crit = decisions.addCriterion(new DecisionCriterion(null, w.decision.id(), name, null, CriterionDirection.MAIOR_MELHOR,
                null, null, ContentOrigin.HUMANO, null, w.criteria.size()));
        w.criteria.add(crit);
        w.ref(c.ref(), crit.id(), i);
        w.trail.add(DecisionEventType.CRITERIO_ATUALIZADO, Map.of("added", 1, "criterionId", crit.id().toString()));
    }

    private void setWeight(Work w, DecisionCommand c, int i) {
        require(w, ResourceAction.EDIT_STRUCTURE);
        requireEditable(w);
        UUID critId = w.criterion(c.criterionId(), i);
        Double pct = c.weightPct();
        if (pct != null && (pct.isNaN() || pct < 0 || pct > 100)) {
            throw invalid(Map.of(field(i, "weightPct"), "Peso entre 0 e 100."));
        }
        BigDecimal weight = pct == null ? null : BigDecimal.valueOf(pct).setScale(2, java.math.RoundingMode.HALF_UP);
        decisions.setWeight(critId, weight);
        w.criteria.replaceAll(x -> x.id().equals(critId) ? new DecisionCriterion(x.id(), x.decisionId(), x.name(), x.description(), x.direction(),
                weight, x.catalogKey(), x.origin(), x.aiInferenceId(), x.position()) : x);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("criterionId", critId.toString());
        payload.put("weightPct", pct);
        w.trail.add(DecisionEventType.CRITERIO_ATUALIZADO, payload);
    }

    private void setScore(Work w, DecisionCommand c, int i) {
        require(w, ResourceAction.ASSESS);
        requireEditable(w);
        UUID altId = w.alternative(c.alternativeId(), i);
        UUID critId = w.criterion(c.criterionId(), i);
        UUID me = w.viewer.userId();
        w.assessments.removeIf(a -> a.alternativeId().equals(altId) && a.criterionId().equals(critId) && a.assessorUserId().equals(me));
        if (c.score() == null) {
            decisions.removeAssessment(altId, critId, me);
        } else {
            if (c.score() < 1 || c.score() > 5) {
                throw invalid(Map.of(field(i, "score"), "Nota de 1 a 5."));
            }
            CriterionAssessment a = new CriterionAssessment(null, altId, critId, me, c.score(), null, w.now, ContentOrigin.HUMANO);
            decisions.putAssessment(a);
            w.assessments.add(a);
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("altId", altId.toString());
        payload.put("critId", critId.toString());
        payload.put("score", c.score());
        w.trail.add(DecisionEventType.AVALIACAO_REGISTRADA, payload);
    }

    private void addEvidence(Work w, DecisionCommand c, int i) {
        require(w, ResourceAction.EDIT_STRUCTURE);
        String title = c.title() == null ? "" : c.title().strip();
        if (title.isEmpty() || title.length() > MAX_EVIDENCE_TITLE) {
            throw invalid(Map.of(field(i, "title"), "Título da evidência com 1 a " + MAX_EVIDENCE_TITLE + " caracteres."));
        }
        if (c.nature() == null) {
            throw invalid(Map.of(field(i, "nature"), "Diga se é fato, evidência ou opinião."));
        }
        String source = blankToNull(c.sourceLabel());
        if (source != null && source.length() > MAX_SOURCE_LABEL) {
            throw invalid(Map.of(field(i, "sourceLabel"), "Fonte com até " + MAX_SOURCE_LABEL + " caracteres."));
        }
        UUID altId = c.alternativeId() == null ? null : w.alternative(c.alternativeId(), i);
        RelevanceLevel reliability = c.reliability() == null ? RelevanceLevel.MEDIA : c.reliability();
        DecisionEvidence ev = new DecisionEvidence(null, w.decision.id(), c.nature(), EvidenceKind.DOCUMENTO, title, "", source == null ? "—" : source,
                null, null, null, null, null, w.now, SourceQuality.NAO_VERIFICADA, RelevanceLevel.MEDIA, reliability, ContentOrigin.HUMANO, null,
                w.viewer.userId(), null);
        List<EvidenceLink> links = altId == null ? List.of()
                : List.of(new EvidenceLink(null, null, EvidenceTarget.ALTERNATIVA, altId, c.stance() == null ? EvidenceStance.SUSTENTA : c.stance(), null));
        DecisionEvidence saved = decisions.addEvidence(ev, links);
        w.evidence.add(saved);
        for (EvidenceLink l : links) {
            w.links.add(new EvidenceLink(null, saved.id(), l.targetType(), l.targetId(), l.stance(), null));
        }
        w.trail.add(DecisionEventType.EVIDENCIA_ADICIONADA, Map.of("evidenceId", saved.id().toString()));
    }

    private void decide(Work w, DecisionCommand c, int i) {
        require(w, ResourceAction.DECIDE);
        List<DecisionLifecycle> path = PATH_TO_AWAITING.get(w.decision.status());
        if (path == null) {
            throw new ApiException(CICLO_INVALIDO, 409, "Transição não permitida: " + w.decision.status() + " → DECIDIDA.", Map.of("command", i));
        }
        if (c.alternativeId() == null) {
            throw invalid(Map.of(field(i, "alternativeId"), "Escolha a alternativa."));
        }
        UUID altId = w.alternative(c.alternativeId(), i);
        String reason = c.rationale() == null ? "" : c.rationale().strip();
        if (reason.length() > MAX_RATIONALE) {
            throw invalid(Map.of(field(i, "rationale"), "Motivo com até " + MAX_RATIONALE + " caracteres."));
        }
        for (DecisionLifecycle to : path) {
            DecisionLifecycle from = w.decision.status();
            w.decision = w.decision.transition(to);
            w.trail.add(DecisionEventType.ESTADO_ALTERADO, Map.of("from", from.name(), "to", to.name()));
        }
        Facts facts = facts(w, altId);
        w.decision = w.decision.decide(w.viewer.userId(), false, altId, reason, c.confidencePct(), facts.guard(),
                Boolean.TRUE.equals(c.warningsConfirmed()), w.now);
        PreDecisionGuard.Result guard = PreDecisionGuard.check(new PreDecisionGuard.Input(w.decision.complexity(), facts.guard().alternativeStatus(),
                true, reason, facts.guard().readiness(), false, facts.guard().highDivergenceOpen(), false, c.confidencePct(),
                facts.guard().evidence()));
        List<String> warnings = guard.warnings().stream().map(Enum::name).toList();
        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("readiness", facts.guard().readiness().name());
        extra.put("warnings", warnings);
        DecisionSnapshot snap = snapshot(w, SnapshotKind.DECISAO, reason, c.confidencePct(), altId, extra);
        w.trail.add(DecisionEventType.DECISAO_FINALIZADA, Map.of("snapshotId", snap.id().toString(), "sha256", snap.contentSha256(),
                "warnings", warnings));
        w.trail.add(DecisionEventType.ESTADO_ALTERADO, Map.of("from", DecisionLifecycle.AGUARDANDO_DECISAO.name(), "to",
                DecisionLifecycle.DECIDIDA.name()));
        w.decided = true;
    }

    private void recordOutcome(Work w, DecisionCommand c, int i) {
        require(w, ResourceAction.EDIT);
        if (w.outcome != null) {
            throw ApiException.conflict("DECISAO_RESULTADO_JA_REGISTRADO", "O resultado desta decisão já foi registrado.");
        }
        if (c.result() == null) {
            throw invalid(Map.of(field(i, "result"), "Escolha o resultado."));
        }
        String summary = c.summary() == null ? "" : c.summary().strip();
        if (summary.isEmpty() || summary.length() > MAX_RATIONALE) {
            throw invalid(Map.of(field(i, "summary"), "Resumo com 1 a " + MAX_RATIONALE + " caracteres."));
        }
        DecisionLifecycle from = w.decision.status();
        w.decision = w.decision.transition(DecisionLifecycle.RESOLVIDA);
        w.outcome = new DecisionOutcome(null, w.decision.id(), c.result(), w.now, summary, null, w.viewer.userId());
        decisions.saveOutcome(w.outcome);
        w.trail.add(DecisionEventType.RESULTADO_REGISTRADO, Map.of("result", c.result().name()));
        w.trail.add(DecisionEventType.ESTADO_ALTERADO, Map.of("from", from.name(), "to", DecisionLifecycle.RESOLVIDA.name()));
    }

    // ------------------------------------------------------------------------------------------------ guarda e snapshot

    record Facts(PreDecisionGuard.Facts guard, String leader) {
    }

    /** Fatos do guarda (§6.10) a partir do que está gravado: prontidão (§6.7), matriz (§6.1), divergência (§6.2) e evidência (§6.5). */
    static Facts facts(Work w, UUID altId) {
        DecisionAlternative selected = w.alternatives.stream().filter(a -> a.id().equals(altId)).findFirst().orElseThrow();
        MatrixInput matrix = matrix(w);
        WeightedScoring.Result scoring = WeightedScoring.score(matrix);
        String leader = scoring.leader();
        long active = w.alternatives.stream().filter(DecisionAlternative::isActive).count();
        boolean weightsValid = w.decision.weightingEnabled() && scoring.valid();
        boolean matrixComplete = scoring.valid() && scoring.incomplete().isEmpty() && active > 0 && !w.criteria.isEmpty();
        EvidenceStrength.Level leaderEvidence = leader == null ? null : evidence(w, leader);
        Readiness.Result readiness = Readiness.evaluate(new Readiness.Input(w.decision.complexity(), w.decision.question(),
                w.decision.ownerUserId() != null, (int) active, w.criteria.size(), null, weightsValid, matrixComplete,
                leaderEvidence != null && leaderEvidence != EvidenceStrength.Level.FRACA, true, false));
        PreDecisionGuard.Facts guard = new PreDecisionGuard.Facts(altId, selected.status(), readiness.level(), false,
                DivergenceAnalysis.hasHigh(matrix), false, evidence(w, altId.toString()));
        return new Facts(guard, leader);
    }

    static MatrixInput matrix(Work w) {
        return new MatrixInput(w.decision.weightingEnabled(),
                w.criteria.stream().map(c -> new MatrixInput.Criterion(c.id().toString(), c.weightPct() == null ? null : c.weightPct().doubleValue()))
                        .toList(),
                w.alternatives.stream().map(a -> new MatrixInput.Alternative(a.id().toString(), a.isActive())).toList(),
                w.assessments.stream().map(a -> new MatrixInput.Assessment(a.alternativeId().toString(), a.criterionId().toString(), a.score(),
                        a.assessorUserId().toString())).toList());
    }

    static EvidenceStrength.Level evidence(Work w, String altKey) {
        List<EvidenceStrength.Item> items = new ArrayList<>();
        for (DecisionEvidence e : w.evidence) {
            List<EvidenceStrength.Link> links = w.links.stream()
                    .filter(l -> e.id().equals(l.evidenceId()) && l.targetType() == EvidenceTarget.ALTERNATIVA)
                    .map(l -> new EvidenceStrength.Link(l.targetId().toString(), l.stance())).toList();
            items.add(new EvidenceStrength.Item(e.nature(), e.reliability(), e.sourceLabel(), !e.isCurrent(), links));
        }
        return EvidenceStrength.of(altKey, items).level();
    }

    /** Snapshot append-only com o JSON canônico do que se sabia (§6.12): estrutura, notas e evidência — sem nomes de pessoas. */
    private DecisionSnapshot snapshot(Work w, SnapshotKind kind, String reason, Integer confidence, UUID selectedId, Map<String, Object> extra) {
        Map<String, Object> content = new LinkedHashMap<>(extra);
        Decision d = w.decision;
        content.put("decisionId", d.id().toString());
        content.put("kind", kind.name());
        content.put("question", d.question());
        content.put("complexity", d.complexity().name());
        content.put("status", d.status().name());
        content.put("rationale", reason);
        content.put("confidencePct", confidence);
        content.put("selectedAlternativeId", selectedId == null ? null : selectedId.toString());
        content.put("takenAt", w.now.toString());
        content.put("takenByUserId", w.viewer.userId().toString());
        content.put("modelVersion", DecisionRules.SCORING_MODEL_VERSION);
        content.put("alternatives", w.alternatives.stream().map(a -> Map.of("id", a.id().toString(), "label", a.label(), "title", a.title(),
                "status", a.status().name(), "doNothing", a.doNothing())).toList());
        content.put("criteria", w.criteria.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.id().toString());
            m.put("name", c.name());
            m.put("weightPct", c.weightPct() == null ? null : c.weightPct().doubleValue());
            return m;
        }).toList());
        content.put("assessments", w.assessments.stream().map(a -> Map.of("alt", a.alternativeId().toString(), "crit", a.criterionId().toString(),
                "by", a.assessorUserId().toString(), "score", a.score())).toList());
        content.put("evidence", w.evidence.stream().map(e -> Map.of("id", e.id().toString(), "nature", e.nature().name(), "reliability",
                e.reliability().name(), "current", e.isCurrent())).toList());
        String label = selectedId == null ? null
                : w.alternatives.stream().filter(a -> a.id().equals(selectedId)).map(DecisionAlternative::label).findFirst().orElse(null);
        DecisionSnapshot snap = DecisionSnapshot.of(UUID.randomUUID(), d.id(), kind, w.snapshots + 1, w.now, w.viewer.userId(), content,
                reason.isBlank() ? "—" : reason, confidence, label);
        decisions.appendSnapshot(snap);
        w.snapshots++;
        return snap;
    }

    // ------------------------------------------------------------------------------------------------ autorização

    void require(Work w, ResourceAction action) {
        authorizer.requireDecision(w.viewer, w.decision, w.role, false, action);
    }

    static void requireEditable(Work w) {
        if (!editable(w.decision.status())) {
            throw new ApiException(CICLO_INVALIDO, 409, "A estrutura só muda antes de decidir; reabra a decisão para alterar.");
        }
    }

    /** Estados em que alternativas, critérios, pesos e notas podem mudar (§4.3; STRUCTURE_EDITABLE no front). */
    static boolean editable(DecisionLifecycle s) {
        return switch (s) {
            case RASCUNHO, ENQUADRAMENTO, PESQUISA, COMPARACAO, AGUARDANDO_DECISAO, REABERTA -> true;
            default -> false;
        };
    }

    private StoredDecision load(UUID id) {
        return decisions.findById(id).orElseThrow(() -> ResourceAuthorizer.notFound(ScopedResource.Kind.DECISION));
    }

    // ------------------------------------------------------------------------------------------------ visão

    DecisionView view(Viewer viewer, DecisionRole role, StoredDecision s, Graph g) {
        Decision d = s.decision();
        boolean editable = editable(d.status());
        DecisionPermissions perms = new DecisionPermissions(
                editable && allowed(viewer, d, role, ResourceAction.EDIT_STRUCTURE),
                editable && allowed(viewer, d, role, ResourceAction.ASSESS),
                PATH_TO_AWAITING.containsKey(d.status()) && allowed(viewer, d, role, ResourceAction.DECIDE),
                d.status().canTransitionTo(DecisionLifecycle.REABERTA) && allowed(viewer, d, role, ResourceAction.REOPEN),
                allowed(viewer, d, role, ResourceAction.EDIT), allowed(viewer, d, role, ResourceAction.EDIT_STRUCTURE));
        DecisionParticipant me = g.participants().stream().filter(p -> p.userId().equals(viewer.userId())).findFirst().orElse(null);
        boolean seeOthers = !d.independentScoring() || (me != null && me.assessmentsSubmittedAt() != null);
        Records r = g.records();
        DecisionRoot root = new DecisionRoot(d.id(), s.version(), d.title(), d.question(), d.contextMd(), d.objective(), d.constraintsMd(),
                d.scope(), strings(d.stakeholdersJson()), d.targetDate(), d.ownerUserId(), d.createdByUserId(), d.companyId(), d.departmentId(),
                d.sessionId(), d.projectId(), d.status(), d.complexity(), d.kind(), d.impact(), d.urgency(), d.visibility(), d.accessClass(),
                d.weightingEnabled(), d.independentScoring(), d.templateKey(), d.selectedAlternativeId(), d.decidedAt(), d.decisionConfidencePct(),
                d.rationale(), d.reviewEveryDays(), s.createdAt(), s.updatedAt());
        return new DecisionView(root,
                g.participants().stream().map(p -> new DecisionParticipantView(p.userId(), p.role(), p.joinedAt(), p.assessmentsSubmittedAt()))
                        .toList(),
                g.alternatives().stream().map(a -> new DecisionAlternativeView(a.id(), a.label(), a.title(), a.description(), a.doNothing(),
                        strings(a.prosJson()), strings(a.consJson()), a.estimatedCost() == null ? null : a.estimatedCost().toPlainString(),
                        a.estimatedDurationDays(), a.status(), a.discardReason(), a.origin(), a.position())).toList(),
                g.criteria().stream().map(c -> new DecisionCriterionView(c.id(), c.name(), c.description(), c.direction(),
                        c.weightPct() == null ? null : c.weightPct().doubleValue(), c.catalogKey(), c.origin(), c.position())).toList(),
                g.assessments().stream().filter(a -> seeOthers || a.assessorUserId().equals(viewer.userId()))
                        .map(a -> new DecisionAssessmentView(a.id(), a.alternativeId(), a.criterionId(), a.assessorUserId(), a.score(), a.rationale(),
                                a.submittedAt(), a.origin())).toList(),
                g.evidence().stream().map(DecisionService::evidenceView).toList(),
                g.evidenceLinks().stream().map(l -> new DecisionEvidenceLinkView(l.id(), l.evidenceId(), l.targetType(), l.targetId(), l.stance(),
                        l.note())).toList(),
                g.snapshots().stream().map(x -> new DecisionSnapshotView(x.id(), x.kind(), x.versionNumber(), x.takenAt(), x.takenByUserId(),
                        x.contentJson(), x.contentSha256(), x.rationale(), x.confidencePct(), x.selectedAlternativeLabel(), x.modelVersion())).toList(),
                g.outcome() == null ? null : new DecisionOutcomeView(g.outcome().id(), g.outcome().result(), g.outcome().observedAt(),
                        g.outcome().summary(), g.outcome().recordedByUserId()),
                g.events().stream().map(e -> new DecisionEventView(e.id(), e.actorUserId(), e.type(), payload(e.payloadJson()), e.at(),
                        e.correlationId())).toList(),
                perms,
                r.assumptions().stream().map(a -> new DecisionAssumptionView(a.id(), a.statement(), a.importance(), a.confidencePct(),
                        a.validationStatus(), a.ownerUserId(), a.alternativeId(), a.validationNote(), a.validatedAt(), a.origin())).toList(),
                r.risks().stream().map(x -> new DecisionRiskView(x.id(), x.title(), x.description(), x.alternativeId(), x.likelihood(), x.impact(),
                        x.severity(), x.mitigation(), x.ownerUserId(), x.source(), x.status(), x.origin())).toList(),
                r.scenarios().stream().map(x -> new DecisionScenarioView(x.id(), x.alternativeId(), x.scenarioCase(), x.description(), x.likelihood(),
                        strings(x.assumptionIdsJson()), x.expectedResult())).toList(),
                r.forecasts().stream().map(x -> new DecisionForecastView(x.id(), x.alternativeId(), x.statement(), x.probabilityPct(), x.resolveBy(),
                        x.forecasterUserId(), x.resolution(), x.resolvedAt())).toList(),
                r.recommendations().stream().map(sr -> {
                    DecisionRecommendation x = sr.recommendation();
                    return new DecisionRecommendationView(x.id(), x.alternativeId(), x.source(), x.reasoningMd(), strings(x.supportingJson()),
                            strings(x.contradictingJson()), strings(x.criticalAssumptionIdsJson()), x.limitationsMd(), x.whatWouldChangeMd(),
                            x.modelVersion(), x.status(), sr.createdAt());
                }).toList(),
                r.triggers().stream().map(x -> new DecisionTriggerView(x.id(), x.conditionText(), x.metricKey(), x.comparator(),
                        x.threshold() == null ? null : x.threshold().doubleValue(), x.status(), x.firedAt())).toList(),
                r.checkpoints().stream().map(x -> new DecisionCheckpointView(x.id(), x.dueAt(), x.kind(), x.status(), x.completedAt(),
                        x.completedByUserId(), x.stillValid(), x.assumptionsChanged(), x.newEvidence(), x.confidencePctAfter(), x.action(),
                        x.note())).toList(),
                r.workLinks().stream().map(x -> new DecisionWorkLinkView(x.link().id(), x.link().targetType(), x.link().targetId(),
                        x.link().createdByUserId(), x.createdAt())).toList(),
                retrospective(r.retrospective()));
    }

    private static DecisionRetrospectiveView retrospective(DecisionRetrospective x) {
        return x == null ? null : new DecisionRetrospectiveView(x.id(), x.outcomeId(), x.whatHappened(), x.whatExpected(), x.whatWasRight(),
                x.whatWasWrong(), strings(x.failedAssumptionIdsJson()), x.processQuality(), x.lessonsMd(), x.shareAsLesson(), x.reviewedByUserId(),
                x.reviewedAt());
    }

    private static DecisionEvidenceView evidenceView(StoredEvidence s) {
        DecisionEvidence e = s.evidence();
        return new DecisionEvidenceView(e.id(), e.nature(), e.kind(), e.title(), e.summary(), e.sourceLabel(), e.sourceUrl(), e.authorLabel(),
                e.observedAt(), e.retrievedAt(), e.sourceQuality(), e.relevance(), e.reliability(), e.origin(), e.addedByUserId(), s.addedAt(),
                e.supersededAt());
    }

    private static boolean allowed(Viewer viewer, Decision d, DecisionRole role, ResourceAction action) {
        return DecisionAccessPolicy.decide(viewer, d, role, false, action) == AccessDecision.ALLOW;
    }

    // ------------------------------------------------------------------------------------------------ apoio

    /** Estado de trabalho do lote: a raiz muda em memória e só é gravada no fim (uma versão por lote). */
    final class Work {
        final Viewer viewer;
        final DecisionRole role;
        Decision decision;
        final List<DecisionAlternative> alternatives;
        final List<DecisionCriterion> criteria;
        final List<CriterionAssessment> assessments;
        final List<DecisionEvidence> evidence;
        final List<EvidenceLink> links;
        final List<DecisionParticipant> participants;
        final List<DecisionAssumption> assumptions;
        final List<DecisionRisk> risks;
        final List<DecisionScenario> scenarios;
        final List<DecisionForecast> forecasts;
        final List<StoredRecommendation> recommendations;
        final List<DecisionTrigger> triggers;
        final List<DecisionCheckpoint> checkpoints;
        final List<StoredWorkLink> workLinks;
        DecisionRetrospective retrospective;
        DecisionOutcome outcome;
        int snapshots;
        final Instant now;
        final Trail trail;
        final Map<String, UUID> refs = new HashMap<>();
        boolean decided;
        boolean reopened;

        Work(Viewer viewer, DecisionRole role, Decision decision, Graph g, Instant now) {
            this.viewer = viewer;
            this.role = role;
            this.decision = decision;
            this.alternatives = new ArrayList<>(g.alternatives());
            this.criteria = new ArrayList<>(g.criteria());
            this.assessments = new ArrayList<>(g.assessments());
            this.evidence = new ArrayList<>(g.evidence().stream().map(StoredEvidence::evidence).toList());
            this.links = new ArrayList<>(g.evidenceLinks());
            this.participants = new ArrayList<>(g.participants());
            Records r = g.records();
            this.assumptions = new ArrayList<>(r.assumptions());
            this.risks = new ArrayList<>(r.risks());
            this.scenarios = new ArrayList<>(r.scenarios());
            this.forecasts = new ArrayList<>(r.forecasts());
            this.recommendations = new ArrayList<>(r.recommendations());
            this.triggers = new ArrayList<>(r.triggers());
            this.checkpoints = new ArrayList<>(r.checkpoints());
            this.workLinks = new ArrayList<>(r.workLinks());
            this.retrospective = r.retrospective();
            this.outcome = g.outcome();
            this.snapshots = g.snapshots().stream().mapToInt(DecisionSnapshot::versionNumber).max().orElse(0);
            this.now = now;
            this.trail = new Trail(decision.id(), viewer.userId(), now);
        }

        void ref(String ref, UUID id, int i) {
            if (ref == null || ref.isBlank()) {
                return;
            }
            if (ref.length() > 64 || refs.putIfAbsent(ref, id) != null) {
                throw invalid(Map.of(field(i, "ref"), "Referência repetida ou longa demais."));
            }
        }

        UUID alternative(String idOrRef, int i) {
            return resolve(idOrRef, alternatives.stream().map(DecisionAlternative::id).toList(), field(i, "alternativeId"));
        }

        UUID criterion(String idOrRef, int i) {
            return resolve(idOrRef, criteria.stream().map(DecisionCriterion::id).toList(), field(i, "criterionId"));
        }

        /** Registro da fase 7b apontado por {@code itemId} (UUID desta decisão ou ref do lote). */
        UUID item(String idOrRef, List<UUID> known, int i) {
            if (idOrRef == null || idOrRef.isBlank()) {
                throw invalid(Map.of(field(i, "itemId"), "Informe o item."));
            }
            return resolve(idOrRef, known, field(i, "itemId"));
        }

        UUID resolveIn(String idOrRef, List<UUID> known, String fieldName) {
            return resolve(idOrRef, known, fieldName);
        }

        /** Id de filho DESTA decisão (ou ref do lote); qualquer outro id — inclusive de outra decisão — é 422, nunca acesso cruzado. */
        private UUID resolve(String idOrRef, List<UUID> known, String fieldName) {
            UUID id = idOrRef == null ? null : refs.get(idOrRef);
            if (id == null && idOrRef != null) {
                try {
                    id = UUID.fromString(idOrRef);
                } catch (IllegalArgumentException e) {
                    id = null;
                }
            }
            if (id == null || !known.contains(id)) {
                throw invalid(Map.of(fieldName, "Item inexistente nesta decisão."));
            }
            return id;
        }
    }

    /** Eventos do lote em ordem: cada um 1 µs depois do anterior (TIMESTAMP(6)), mesma correlação da requisição. */
    final class Trail {
        private final UUID decisionId;
        private final UUID actor;
        private final Instant base;
        private final String correlation;
        private final List<DecisionEvent> pending = new ArrayList<>();

        Trail(UUID decisionId, UUID actor, Instant base) {
            this.decisionId = decisionId;
            this.actor = actor;
            this.base = base.truncatedTo(ChronoUnit.MICROS);
            String mdc = MDC.get(AuditEvent.MDC_CORRELATION);
            this.correlation = mdc == null || mdc.isBlank() ? UUID.randomUUID().toString() : clip(mdc, 64);
        }

        void add(DecisionEventType type, Map<String, Object> payload) {
            pending.add(new DecisionEvent(UUID.randomUUID(), decisionId, actor, type, json(payload),
                    base.plus(pending.size(), ChronoUnit.MICROS), correlation));
        }

        void flush() {
            pending.forEach(decisions::appendEvent);
            pending.clear();
        }
    }

    private static ApiException translate(DomainRuleException e, int i) {
        String code = e.getCode();
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("command", i);
        if (PreDecisionGuard.DECISAO_INCOMPLETA.equals(code)) {
            details.put("blocking", e.getDetails());
            return ApiException.unprocessable(code, "Faltam itens obrigatórios para decidir.", details);
        }
        if (PreDecisionGuard.AVISOS_NAO_CONFIRMADOS.equals(code)) {
            details.put("warnings", e.getDetails());
            return ApiException.unprocessable(code, "Confirme os avisos antes de decidir.", details);
        }
        if (RecommendationValidator.RECOMENDACAO_INCOMPLETA.equals(code)) {
            details.put("missing", e.getDetails());
            return ApiException.unprocessable(code, "A recomendação precisa dos quatro porquês.", details);
        }
        if ("VALIDACAO".equals(code)) {
            return ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.", details);
        }
        return new ApiException(code, 409, "Ação não permitida no estado atual da decisão.", details);
    }

    static ApiException invalid(Map<String, ?> fields) {
        return ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.", Map.of("fields", Map.copyOf(fields)));
    }

    static String field(int i, String name) {
        return "commands[" + i + "]." + name;
    }

    private static String label(int position) {
        StringBuilder sb = new StringBuilder();
        int n = position;
        do {
            sb.insert(0, (char) ('A' + n % 26));
            n = n / 26 - 1;
        } while (n >= 0);
        return sb.toString();
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    private static String clip(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }

    private static String json(Map<String, Object> payload) {
        return JSON.writeValueAsString(payload == null ? Map.of() : payload);
    }

    private static Map<String, Object> payload(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return JSON.readValue(json, MAP);
        } catch (RuntimeException e) {
            return Map.of();
        }
    }

    private static List<String> strings(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> list = JSON.readValue(json, STRINGS);
            return list == null ? List.of() : list.stream().filter(Objects::nonNull).toList();
        } catch (RuntimeException e) {
            return List.of();
        }
    }

    private static Map<DecisionLifecycle, List<DecisionLifecycle>> pathToAwaiting() {
        Map<DecisionLifecycle, List<DecisionLifecycle>> m = new EnumMap<>(DecisionLifecycle.class);
        m.put(DecisionLifecycle.RASCUNHO, List.of(DecisionLifecycle.ENQUADRAMENTO, DecisionLifecycle.COMPARACAO, DecisionLifecycle.AGUARDANDO_DECISAO));
        m.put(DecisionLifecycle.ENQUADRAMENTO, List.of(DecisionLifecycle.COMPARACAO, DecisionLifecycle.AGUARDANDO_DECISAO));
        m.put(DecisionLifecycle.PESQUISA, List.of(DecisionLifecycle.COMPARACAO, DecisionLifecycle.AGUARDANDO_DECISAO));
        m.put(DecisionLifecycle.COMPARACAO, List.of(DecisionLifecycle.AGUARDANDO_DECISAO));
        m.put(DecisionLifecycle.REABERTA, List.of(DecisionLifecycle.COMPARACAO, DecisionLifecycle.AGUARDANDO_DECISAO));
        m.put(DecisionLifecycle.AGUARDANDO_DECISAO, List.of());
        return java.util.Collections.unmodifiableMap(m);
    }

    /** Só para testes e para o adaptador: o rótulo da n-ésima alternativa (A…Z, AA…). */
    static String labelFor(int position) {
        return label(position);
    }
}
