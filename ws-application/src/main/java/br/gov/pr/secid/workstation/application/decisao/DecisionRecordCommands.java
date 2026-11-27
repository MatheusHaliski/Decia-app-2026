package br.gov.pr.secid.workstation.application.decisao;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredRecommendation;
import br.gov.pr.secid.workstation.application.decisao.DecisionRepositoryPort.StoredWorkLink;
import br.gov.pr.secid.workstation.domain.decisao.AssumptionStatus;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointKind;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointStatus;
import br.gov.pr.secid.workstation.domain.decisao.ContentOrigin;
import br.gov.pr.secid.workstation.domain.decisao.DecisionAssumption;
import br.gov.pr.secid.workstation.domain.decisao.DecisionCheckpoint;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEventType;
import br.gov.pr.secid.workstation.domain.decisao.DecisionForecast;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRecommendation;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRetrospective;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRisk;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRules;
import br.gov.pr.secid.workstation.domain.decisao.DecisionScenario;
import br.gov.pr.secid.workstation.domain.decisao.DecisionTrigger;
import br.gov.pr.secid.workstation.domain.decisao.DecisionWorkLink;
import br.gov.pr.secid.workstation.domain.decisao.ForecastResolution;
import br.gov.pr.secid.workstation.domain.decisao.RecommendationSource;
import br.gov.pr.secid.workstation.domain.decisao.RecommendationStatus;
import br.gov.pr.secid.workstation.domain.decisao.RiskSource;
import br.gov.pr.secid.workstation.domain.decisao.RiskStatus;
import br.gov.pr.secid.workstation.domain.decisao.TriggerStatus;
import br.gov.pr.secid.workstation.domain.security.ResourceAction;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

import static br.gov.pr.secid.workstation.application.decisao.DecisionService.JSON;
import static br.gov.pr.secid.workstation.application.decisao.DecisionService.blankToNull;
import static br.gov.pr.secid.workstation.application.decisao.DecisionService.field;
import static br.gov.pr.secid.workstation.application.decisao.DecisionService.invalid;

/**
 * Fase 7b do DECIA — comandos sobre os registros da decisão (V22): premissas, riscos, cenários, previsões, recomendações, gatilhos,
 * checkpoints, vínculos de trabalho e retrospectiva. Rodam dentro do lote transacional de {@link DecisionService#apply} (mesma versão
 * otimista, mesma trilha e auditoria). BFLA por papel DACI ({@code DecisionAccessPolicy}):
 * <ul>
 *   <li>premissas, riscos, cenários, gatilhos, recomendações e vínculos — EDIT_STRUCTURE (responsável, CONDUTOR, APROVADOR);</li>
 *   <li>previsões — ASSESS para registrar a própria (CONTRIBUIDOR também prevê); resolver exige EDIT;</li>
 *   <li>checkpoints e retrospectiva — EDIT.</li>
 * </ul>
 * Payload dos eventos só com ids, enums e números — nenhum enunciado, título ou nota.
 */
final class DecisionRecordCommands {
    static final int MAX_STATEMENT = 1000;
    static final int MAX_FORECAST = 500;
    static final int MAX_RISK_TITLE = 200;
    static final int MAX_LONG_TEXT = 10_000;
    static final int MAX_LIST_ITEMS = 20;
    static final int MAX_METRIC_KEY = 80;
    static final Set<String> COMPARATORS = Set.of("<", "<=", ">", ">=", "=", "!=");

    private final DecisionService service;
    private final DecisionRepositoryPort decisions;

    DecisionRecordCommands(DecisionService service, DecisionRepositoryPort decisions) {
        this.service = service;
        this.decisions = decisions;
    }

    void putAssumption(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        DecisionCommand.DecisionAssumptionInput in = payload(c.assumption(), i, "assumption");
        String statement = text(in.statement(), MAX_STATEMENT, i, "assumption.statement", "Premissa com 1 a " + MAX_STATEMENT + " caracteres.");
        if (in.importance() == null) {
            throw invalid(Map.of(field(i, "assumption.importance"), "Escolha a importância."));
        }
        confidence(in.confidencePct(), i, "assumption.confidencePct");
        UUID owner = member(w, in.ownerUserId(), i, "assumption.ownerUserId");
        UUID alt = in.alternativeId() == null ? null : w.alternative(in.alternativeId(), i);
        String note = optional(in.validationNote(), MAX_STATEMENT, i, "assumption.validationNote");
        AssumptionStatus status = in.validationStatus() == null ? AssumptionStatus.NAO_VALIDADA : in.validationStatus();
        DecisionAssumption current = c.itemId() == null ? null
                : pick(w.assumptions, DecisionAssumption::id, w.item(c.itemId(), ids(w.assumptions, DecisionAssumption::id), i));
        boolean settled = status == AssumptionStatus.VALIDADA || status == AssumptionStatus.INVALIDADA;
        Instant validatedAt = !settled ? null
                : current != null && current.validationStatus() == status && current.validatedAt() != null ? current.validatedAt() : w.now;
        DecisionAssumption saved = decisions.saveAssumption(new DecisionAssumption(current == null ? null : current.id(), w.decision.id(), statement,
                in.importance(), in.confidencePct(), status, owner, alt, note, validatedAt, current == null ? ContentOrigin.HUMANO : current.origin(),
                current == null ? null : current.aiInferenceId()));
        upsert(w.assumptions, DecisionAssumption::id, saved);
        if (current == null) {
            w.ref(c.ref(), saved.id(), i);
        }
        w.trail.add(DecisionEventType.PREMISSA_ATUALIZADA, Map.of("assumptionId", saved.id().toString(), "status", status.name()));
    }

    void removeAssumption(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        UUID id = w.item(c.itemId(), ids(w.assumptions, DecisionAssumption::id), i);
        decisions.removeAssumption(w.decision.id(), id);
        w.assumptions.removeIf(a -> a.id().equals(id));
        w.trail.add(DecisionEventType.PREMISSA_ATUALIZADA, Map.of("assumptionId", id.toString(), "removed", true));
    }

    void putRisk(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        DecisionCommand.DecisionRiskInput in = payload(c.risk(), i, "risk");
        String title = text(in.title(), MAX_RISK_TITLE, i, "risk.title", "Risco com 1 a " + MAX_RISK_TITLE + " caracteres.");
        if (in.likelihood() == null || in.impact() == null) {
            throw invalid(Map.of(field(i, in.likelihood() == null ? "risk.likelihood" : "risk.impact"), "Informe probabilidade e impacto."));
        }
        if (in.source() == RiskSource.IA) {
            throw invalid(Map.of(field(i, "risk.source"), "Riscos de IA chegam pelo motor de IA do servidor, não pelo cliente."));
        }
        String description = optional(in.description(), MAX_LONG_TEXT, i, "risk.description");
        String mitigation = optional(in.mitigation(), MAX_LONG_TEXT, i, "risk.mitigation");
        UUID owner = member(w, in.ownerUserId(), i, "risk.ownerUserId");
        UUID alt = in.alternativeId() == null ? null : w.alternative(in.alternativeId(), i);
        DecisionRisk current = c.itemId() == null ? null : pick(w.risks, DecisionRisk::id, w.item(c.itemId(), ids(w.risks, DecisionRisk::id), i));
        RiskStatus status = in.status() == null ? RiskStatus.ABERTO : in.status();
        DecisionRisk saved = decisions.saveRisk(new DecisionRisk(current == null ? null : current.id(), w.decision.id(), title, description, alt,
                in.likelihood(), in.impact(), mitigation, owner, in.source() == null ? RiskSource.MANUAL : in.source(), status,
                current == null ? ContentOrigin.HUMANO : current.origin(), current == null ? null : current.aiInferenceId()));
        upsert(w.risks, DecisionRisk::id, saved);
        if (current == null) {
            w.ref(c.ref(), saved.id(), i);
        }
        w.trail.add(DecisionEventType.RISCO_ALTERADO, Map.of("riskId", saved.id().toString(), "status", status.name(), "severity",
                saved.severity().name()));
    }

    void removeRisk(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        UUID id = w.item(c.itemId(), ids(w.risks, DecisionRisk::id), i);
        decisions.removeRisk(w.decision.id(), id);
        w.risks.removeIf(r -> r.id().equals(id));
        w.trail.add(DecisionEventType.RISCO_ALTERADO, Map.of("riskId", id.toString(), "removed", true));
    }

    void putScenario(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        DecisionCommand.DecisionScenarioInput in = payload(c.scenario(), i, "scenario");
        if (in.scenarioCase() == null || in.likelihood() == null) {
            throw invalid(Map.of(field(i, in.scenarioCase() == null ? "scenario.scenarioCase" : "scenario.likelihood"),
                    "Informe o caso (melhor/base/pior) e a probabilidade."));
        }
        String description = text(in.description(), MAX_LONG_TEXT, i, "scenario.description", "Descreva o cenário.");
        String expected = text(in.expectedResult(), MAX_STATEMENT, i, "scenario.expectedResult", "Resultado esperado com 1 a " + MAX_STATEMENT
                + " caracteres.");
        UUID alt = in.alternativeId() == null ? null : w.alternative(in.alternativeId(), i);
        List<String> assumptionIds = assumptionIds(w, in.assumptionIds(), i, "scenario.assumptionIds");
        DecisionScenario current = c.itemId() == null ? null
                : pick(w.scenarios, DecisionScenario::id, w.item(c.itemId(), ids(w.scenarios, DecisionScenario::id), i));
        DecisionScenario saved = decisions.saveScenario(new DecisionScenario(current == null ? null : current.id(), w.decision.id(), alt,
                in.scenarioCase(), description, in.likelihood(), JSON.writeValueAsString(assumptionIds), expected,
                current == null ? null : current.projectScenarioId()));
        upsert(w.scenarios, DecisionScenario::id, saved);
        if (current == null) {
            w.ref(c.ref(), saved.id(), i);
        }
        w.trail.add(DecisionEventType.PREMISSA_ATUALIZADA, Map.of("scenarioId", saved.id().toString(), "case", in.scenarioCase().name()));
    }

    void removeScenario(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        UUID id = w.item(c.itemId(), ids(w.scenarios, DecisionScenario::id), i);
        decisions.removeScenario(w.decision.id(), id);
        w.scenarios.removeIf(x -> x.id().equals(id));
        w.trail.add(DecisionEventType.PREMISSA_ATUALIZADA, Map.of("scenarioId", id.toString(), "removed", true));
    }

    /**
     * Previsão (§6.9): registrar a própria exige ASSESS; enquanto PENDENTE só o previsor muda o enunciado/probabilidade; resolver
     * (OCORREU/NAO_OCORREU/ANULADA) exige EDIT e acontece uma vez só.
     */
    void putForecast(DecisionService.Work w, DecisionCommand c, int i) {
        DecisionCommand.DecisionForecastInput in = payload(c.forecast(), i, "forecast");
        ForecastResolution resolution = in.resolution() == null ? ForecastResolution.PENDENTE : in.resolution();
        DecisionForecast current = c.itemId() == null ? null
                : pick(w.forecasts, DecisionForecast::id, w.item(c.itemId(), ids(w.forecasts, DecisionForecast::id), i));
        if (current != null && resolution != ForecastResolution.PENDENTE) {
            service.require(w, ResourceAction.EDIT);
            if (current.resolution() != ForecastResolution.PENDENTE) {
                throw ApiException.conflict("DECISAO_PREVISAO_JA_RESOLVIDA", "Esta previsão já foi resolvida.");
            }
            DecisionForecast saved = decisions.saveForecast(new DecisionForecast(current.id(), current.decisionId(), current.alternativeId(),
                    current.statement(), current.probabilityPct(), current.resolveBy(), current.forecasterUserId(), resolution, w.now,
                    w.viewer.userId()));
            upsert(w.forecasts, DecisionForecast::id, saved);
            w.trail.add(DecisionEventType.AVALIACAO_REGISTRADA, Map.of("forecastId", saved.id().toString(), "resolution", resolution.name()));
            return;
        }
        service.require(w, ResourceAction.ASSESS);
        if (current != null && (!current.forecasterUserId().equals(w.viewer.userId()) || current.resolution() != ForecastResolution.PENDENTE)) {
            throw ApiException.forbidden("Só quem previu muda a previsão, e só antes de resolvê-la.");
        }
        String statement = text(in.statement(), MAX_FORECAST, i, "forecast.statement", "Previsão com 1 a " + MAX_FORECAST + " caracteres.");
        Integer pct = in.probabilityPct();
        if (pct == null || pct < 5 || pct > 95 || pct % 5 != 0) {
            throw invalid(Map.of(field(i, "forecast.probabilityPct"), "Probabilidade de 5 a 95, em passos de 5."));
        }
        LocalDate resolveBy = in.resolveBy();
        if (resolveBy == null) {
            throw invalid(Map.of(field(i, "forecast.resolveBy"), "Informe até quando a previsão se resolve."));
        }
        UUID alt = in.alternativeId() == null ? null : w.alternative(in.alternativeId(), i);
        DecisionForecast saved = decisions.saveForecast(new DecisionForecast(current == null ? null : current.id(), w.decision.id(), alt, statement,
                pct, resolveBy, w.viewer.userId(), ForecastResolution.PENDENTE, null, null));
        upsert(w.forecasts, DecisionForecast::id, saved);
        if (current == null) {
            w.ref(c.ref(), saved.id(), i);
        }
        w.trail.add(DecisionEventType.AVALIACAO_REGISTRADA, Map.of("forecastId", saved.id().toString(), "probabilityPct", pct));
    }

    /**
     * Recomendação (§7): criar só com fonte MODELO (a líder determinística calculada na tela) e os quatro porquês; sugestões de IA chegam
     * pelo motor do servidor (G2). Com {@code itemId}, só aceitar/descartar uma SUGERIDA, e só com a estrutura editável.
     */
    void putRecommendation(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        DecisionService.requireEditable(w);
        DecisionCommand.DecisionRecommendationInput in = payload(c.recommendation(), i, "recommendation");
        if (c.itemId() != null) {
            StoredRecommendation current = w.recommendations.stream().filter(r -> r.recommendation().id().equals(
                    w.item(c.itemId(), w.recommendations.stream().map(x -> x.recommendation().id()).toList(), i))).findFirst().orElseThrow();
            RecommendationStatus to = in.status();
            if (to != RecommendationStatus.ACEITA && to != RecommendationStatus.DESCARTADA) {
                throw invalid(Map.of(field(i, "recommendation.status"), "Aceite ou descarte a recomendação."));
            }
            DecisionRecommendation r = current.recommendation();
            if (r.status() != RecommendationStatus.SUGERIDA) {
                throw ApiException.conflict("RECOMENDACAO_ESTADO_INVALIDO", "Esta recomendação já foi respondida.");
            }
            StoredRecommendation saved = decisions.saveRecommendation(new DecisionRecommendation(r.id(), r.decisionId(), r.alternativeId(), r.source(),
                    r.reasoningMd(), r.supportingJson(), r.contradictingJson(), r.criticalAssumptionIdsJson(), r.limitationsMd(), r.whatWouldChangeMd(),
                    r.modelVersion(), r.aiInferenceId(), to));
            w.recommendations.replaceAll(x -> x.recommendation().id().equals(r.id()) ? saved : x);
            w.trail.add(to == RecommendationStatus.ACEITA ? DecisionEventType.SUGESTAO_IA_ACEITA : DecisionEventType.SUGESTAO_IA_DESCARTADA,
                    Map.of("recId", r.id().toString()));
            return;
        }
        if (in.source() != RecommendationSource.MODELO) {
            throw invalid(Map.of(field(i, "recommendation.source"), "Pelo cliente só entra a recomendação do MODELO; a de IA vem do servidor."));
        }
        UUID alt = in.alternativeId() == null ? null : w.alternative(in.alternativeId(), i);
        String reasoning = text(in.reasoningMd(), MAX_LONG_TEXT, i, "recommendation.reasoningMd", "Explique o raciocínio.");
        String limitations = text(in.limitationsMd(), MAX_LONG_TEXT, i, "recommendation.limitationsMd", "Diga as limitações.");
        String change = text(in.whatWouldChangeMd(), MAX_LONG_TEXT, i, "recommendation.whatWouldChangeMd", "Diga o que mudaria a resposta.");
        List<String> supporting = strings(in.supporting(), i, "recommendation.supporting");
        List<String> contradicting = strings(in.contradicting(), i, "recommendation.contradicting");
        List<String> critical = assumptionIds(w, in.criticalAssumptionIds(), i, "recommendation.criticalAssumptionIds");
        StoredRecommendation saved = decisions.saveRecommendation(new DecisionRecommendation(null, w.decision.id(), alt, RecommendationSource.MODELO,
                reasoning, JSON.writeValueAsString(supporting), JSON.writeValueAsString(contradicting), JSON.writeValueAsString(critical), limitations,
                change, DecisionRules.SCORING_MODEL_VERSION, null, RecommendationStatus.SUGERIDA));
        w.recommendations.add(saved);
        w.ref(c.ref(), saved.recommendation().id(), i);
        w.trail.add(DecisionEventType.RECOMENDACAO_GERADA, Map.of("recId", saved.recommendation().id().toString(), "source",
                RecommendationSource.MODELO.name()));
    }

    void putTrigger(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        DecisionCommand.DecisionTriggerInput in = payload(c.trigger(), i, "trigger");
        String condition = text(in.conditionText(), MAX_STATEMENT, i, "trigger.conditionText", "Condição com 1 a " + MAX_STATEMENT + " caracteres.");
        String metric = optional(in.metricKey(), MAX_METRIC_KEY, i, "trigger.metricKey");
        if (metric != null && !metric.matches("[A-Za-z0-9_.-]+")) {
            throw invalid(Map.of(field(i, "trigger.metricKey"), "Métrica com letras, números, ponto, hífen ou sublinhado."));
        }
        if (in.comparator() != null && !COMPARATORS.contains(in.comparator())) {
            throw invalid(Map.of(field(i, "trigger.comparator"), "Comparador: <, <=, >, >=, = ou !=."));
        }
        if (in.threshold() != null && (in.threshold().isNaN() || in.threshold().isInfinite())) {
            throw invalid(Map.of(field(i, "trigger.threshold"), "Limiar numérico."));
        }
        DecisionTrigger current = c.itemId() == null ? null
                : pick(w.triggers, DecisionTrigger::id, w.item(c.itemId(), ids(w.triggers, DecisionTrigger::id), i));
        TriggerStatus status = in.status() == null ? TriggerStatus.ATIVO : in.status();
        boolean fires = status == TriggerStatus.DISPARADO && (current == null || current.status() != TriggerStatus.DISPARADO);
        Instant firedAt = status != TriggerStatus.DISPARADO ? null : fires ? w.now : current.firedAt();
        DecisionTrigger saved = decisions.saveTrigger(new DecisionTrigger(current == null ? null : current.id(), w.decision.id(), condition, metric,
                in.comparator(), in.threshold() == null ? null : BigDecimal.valueOf(in.threshold()).setScale(4, RoundingMode.HALF_UP), status,
                firedAt));
        upsert(w.triggers, DecisionTrigger::id, saved);
        if (current == null) {
            w.ref(c.ref(), saved.id(), i);
        }
        w.trail.add(fires ? DecisionEventType.GATILHO_DISPARADO : DecisionEventType.RISCO_ALTERADO,
                Map.of("triggerId", saved.id().toString(), "status", status.name()));
    }

    void removeTrigger(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        UUID id = w.item(c.itemId(), ids(w.triggers, DecisionTrigger::id), i);
        decisions.removeTrigger(w.decision.id(), id);
        w.triggers.removeIf(x -> x.id().equals(id));
        w.trail.add(DecisionEventType.RISCO_ALTERADO, Map.of("triggerId", id.toString(), "removed", true));
    }

    /** Checkpoint: agendar (AGENDADO) ou, a partir de AGENDADO, concluir (ação obrigatória), cancelar ou marcar perdido. EDIT. */
    void putCheckpoint(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT);
        DecisionCommand.DecisionCheckpointInput in = payload(c.checkpoint(), i, "checkpoint");
        confidence(in.confidencePctAfter(), i, "checkpoint.confidencePctAfter");
        String note = optional(in.note(), MAX_STATEMENT, i, "checkpoint.note");
        DecisionCheckpoint current = c.itemId() == null ? null
                : pick(w.checkpoints, DecisionCheckpoint::id, w.item(c.itemId(), ids(w.checkpoints, DecisionCheckpoint::id), i));
        CheckpointStatus status = in.status() == null ? CheckpointStatus.AGENDADO : in.status();
        if (current == null && status != CheckpointStatus.AGENDADO) {
            throw invalid(Map.of(field(i, "checkpoint.status"), "Um checkpoint novo nasce AGENDADO."));
        }
        if (current != null && current.status() != CheckpointStatus.AGENDADO) {
            throw ApiException.conflict("DECISAO_CHECKPOINT_ENCERRADO", "Este checkpoint já foi encerrado.");
        }
        Instant due = in.dueAt() != null ? in.dueAt() : current == null ? null : current.dueAt();
        if (due == null) {
            throw invalid(Map.of(field(i, "checkpoint.dueAt"), "Informe quando o checkpoint vence."));
        }
        boolean done = status == CheckpointStatus.CONCLUIDO;
        if (done && in.action() == null) {
            throw invalid(Map.of(field(i, "checkpoint.action"), "Diga a ação: manter, ajustar ou reabrir."));
        }
        CheckpointKind kind = in.kind() != null ? in.kind() : current == null ? CheckpointKind.PROGRAMADO : current.kind();
        DecisionCheckpoint saved = decisions.saveCheckpoint(new DecisionCheckpoint(current == null ? null : current.id(), w.decision.id(), due, kind,
                status, done ? w.now : null, done ? w.viewer.userId() : null, in.stillValid(), in.assumptionsChanged(), in.newEvidence(),
                in.confidencePctAfter(), in.action(), note));
        upsert(w.checkpoints, DecisionCheckpoint::id, saved);
        if (current == null) {
            w.ref(c.ref(), saved.id(), i);
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("checkpointId", saved.id().toString());
        payload.put("status", status.name());
        if (done) {
            payload.put("action", in.action().name());
        }
        w.trail.add(done ? DecisionEventType.CHECKPOINT_CONCLUIDO : DecisionEventType.CHECKPOINT_VENCENDO, payload);
    }

    /** Liga a decisão a uma tarefa, projeto ou marco que quem liga consegue ver (inexistente e invisível: o mesmo 422). Repetido = nada muda. */
    void linkWork(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        DecisionCommand.DecisionWorkLinkInput in = payload(c.workLink(), i, "workLink");
        if (in.targetType() == null || in.targetId() == null) {
            throw invalid(Map.of(field(i, "workLink.targetId"), "Informe o item de trabalho."));
        }
        if (w.workLinks.stream().anyMatch(l -> l.link().targetType() == in.targetType() && l.link().targetId().equals(in.targetId()))) {
            return;
        }
        if (!service.targetVisible(w.viewer, in.targetType(), in.targetId())) {
            throw invalid(Map.of(field(i, "workLink.targetId"), "Item de trabalho inexistente ou fora do seu acesso."));
        }
        StoredWorkLink saved = decisions.addWorkLink(new DecisionWorkLink(UUID.randomUUID(), w.decision.id(), in.targetType(), in.targetId(),
                w.viewer.userId()), w.now);
        w.workLinks.add(saved);
        w.ref(c.ref(), saved.link().id(), i);
        w.trail.add(DecisionEventType.TRABALHO_VINCULADO, Map.of("linkId", saved.link().id().toString(), "targetType", in.targetType().name()));
    }

    void unlinkWork(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT_STRUCTURE);
        UUID id = w.item(c.itemId(), w.workLinks.stream().map(l -> l.link().id()).toList(), i);
        decisions.removeWorkLink(w.decision.id(), id);
        w.workLinks.removeIf(l -> l.link().id().equals(id));
        w.trail.add(DecisionEventType.TRABALHO_VINCULADO, Map.of("linkId", id.toString(), "removed", true));
    }

    /** Retrospectiva (G8: processo separado do resultado): uma por decisão, depois do resultado registrado; reenviar substitui. EDIT. */
    void putRetrospective(DecisionService.Work w, DecisionCommand c, int i) {
        service.require(w, ResourceAction.EDIT);
        if (w.outcome == null) {
            throw ApiException.conflict("DECISAO_SEM_RESULTADO", "Registre o resultado antes da retrospectiva.");
        }
        DecisionCommand.DecisionRetrospectiveInput in = payload(c.retrospective(), i, "retrospective");
        String happened = text(in.whatHappened(), MAX_LONG_TEXT, i, "retrospective.whatHappened", "Conte o que aconteceu.");
        String expected = text(in.whatExpected(), MAX_LONG_TEXT, i, "retrospective.whatExpected", "Conte o que se esperava.");
        String right = text(in.whatWasRight(), MAX_LONG_TEXT, i, "retrospective.whatWasRight", "Diga o que estava certo.");
        String wrong = text(in.whatWasWrong(), MAX_LONG_TEXT, i, "retrospective.whatWasWrong", "Diga o que estava errado.");
        String lessons = text(in.lessonsMd(), MAX_LONG_TEXT, i, "retrospective.lessonsMd", "Registre as lições.");
        if (in.processQuality() == null) {
            throw invalid(Map.of(field(i, "retrospective.processQuality"), "Avalie a qualidade do processo."));
        }
        List<String> failed = assumptionIds(w, in.failedAssumptionIds(), i, "retrospective.failedAssumptionIds");
        DecisionRetrospective saved = decisions.saveRetrospective(new DecisionRetrospective(w.retrospective == null ? null : w.retrospective.id(),
                w.decision.id(), w.outcome.id(), happened, expected, right, wrong, JSON.writeValueAsString(failed), in.processQuality(), lessons,
                Boolean.TRUE.equals(in.shareAsLesson()), w.viewer.userId(), w.now));
        w.retrospective = saved;
        w.trail.add(DecisionEventType.REVISAO_CONCLUIDA, Map.of("retrospectiveId", saved.id().toString(), "processQuality",
                in.processQuality().name()));
    }

    private static <T> T payload(T value, int i, String name) {
        if (value == null) {
            throw invalid(Map.of(field(i, name), "Envie os dados do item."));
        }
        return value;
    }

    private static String text(String value, int max, int i, String name, String message) {
        String v = value == null ? "" : value.strip();
        if (v.isEmpty() || v.length() > max) {
            throw invalid(Map.of(field(i, name), message));
        }
        return v;
    }

    private static String optional(String value, int max, int i, String name) {
        String v = blankToNull(value);
        if (v != null && v.length() > max) {
            throw invalid(Map.of(field(i, name), "Até " + max + " caracteres."));
        }
        return v;
    }

    private static void confidence(Integer pct, int i, String name) {
        if (pct != null && (pct < 0 || pct > 100 || pct % 5 != 0)) {
            throw invalid(Map.of(field(i, name), "Confiança de 0 a 100, em passos de 5."));
        }
    }

    private static List<String> strings(List<String> raw, int i, String name) {
        List<String> out = new ArrayList<>();
        for (String x : raw == null ? List.<String>of() : raw) {
            String v = x == null ? "" : x.strip();
            if (!v.isEmpty()) {
                out.add(v);
            }
        }
        if (out.size() > MAX_LIST_ITEMS || out.stream().anyMatch(v -> v.length() > MAX_STATEMENT)) {
            throw invalid(Map.of(field(i, name), "Até " + MAX_LIST_ITEMS + " itens de até " + MAX_STATEMENT + " caracteres."));
        }
        return out;
    }

    private static List<String> assumptionIds(DecisionService.Work w, List<String> raw, int i, String name) {
        List<String> in = raw == null ? List.of() : raw;
        if (in.size() > MAX_LIST_ITEMS) {
            throw invalid(Map.of(field(i, name), "Até " + MAX_LIST_ITEMS + " premissas."));
        }
        List<UUID> known = ids(w.assumptions, DecisionAssumption::id);
        return in.stream().map(x -> w.resolveIn(x, known, field(i, name)).toString()).distinct().toList();
    }

    /** Dono de premissa/risco: o responsável ou um participante desta decisão (nunca uma conta qualquer). */
    private static UUID member(DecisionService.Work w, UUID userId, int i, String name) {
        if (userId == null) {
            return null;
        }
        boolean known = userId.equals(w.decision.ownerUserId()) || w.participants.stream().anyMatch(p -> p.userId().equals(userId));
        if (!known) {
            throw invalid(Map.of(field(i, name), "O dono precisa ser o responsável ou participante da decisão."));
        }
        return userId;
    }

    private static <T> List<UUID> ids(List<T> list, Function<T, UUID> id) {
        return list.stream().map(id).toList();
    }

    private static <T> T pick(List<T> list, Function<T, UUID> id, UUID wanted) {
        return list.stream().filter(x -> id.apply(x).equals(wanted)).findFirst().orElseThrow();
    }

    private static <T> void upsert(List<T> list, Function<T, UUID> id, T item) {
        UUID key = id.apply(item);
        for (int k = 0; k < list.size(); k++) {
            if (id.apply(list.get(k)).equals(key)) {
                list.set(k, item);
                return;
            }
        }
        list.add(item);
    }
}
