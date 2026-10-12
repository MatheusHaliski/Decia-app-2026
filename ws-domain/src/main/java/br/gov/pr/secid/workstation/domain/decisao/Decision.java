package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.DomainRuleException;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.analise.PreDecisionGuard;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * Decisão estruturada — agregado raiz do contexto 5b (03_MODELO_FUNCIONAL §4.2). Uma pergunta decisória e um responsável humano (G1);
 * ciclo por {@link DecisionLifecycle}. {@code selectedAlternativeId} é o estado ATUAL; o do momento da decisão vive no snapshot (G7).
 * A validação formal RF29 continua no {@code FinalDecision} (sessão), ligado por {@code finalDecisionId} (D-54).
 */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decisions", rfs = {"RF29", "RF12", "RF15", "RF31", "RF33", "RF43"}, migration = 22,
        versioned = true,
        doc = "Decisões estruturadas (agregado raiz). Responsável/criador e catálogo institucional RESTRICT; sessão, projeto, FinalDecision, "
                + "alternativa selecionada e decisão substituída SET NULL. Apagar exige não haver snapshot/evento (RESTRICT nos filhos).",
        indexes = {"company_id, status", "owner_user_id, status", "department_id, status", "session_id", "project_id", "final_decision_id"},
        checks = {"decision_confidence_pct IS NULL OR (decision_confidence_pct BETWEEN 0 AND 100 AND MOD(decision_confidence_pct, 5) = 0)",
                "review_every_days IS NULL OR review_every_days > 0"})
public record Decision(
        @Attr("identificador") UUID id,
        @Attr(value = "título", len = 160) String title,
        @Attr(value = "pergunta decisória", len = 500) String question,
        @Attr(value = "contexto (Markdown)", opt = true, sql = "TEXT") String contextMd,
        @Attr(value = "objetivo", opt = true, len = 1000) String objective,
        @Attr(value = "restrições (Markdown)", opt = true, sql = "TEXT") String constraintsMd,
        @Attr(value = "escopo", opt = true, len = 1000) String scope,
        @Attr(value = "partes interessadas", opt = true) String stakeholdersJson,
        @Attr(value = "recursos (Markdown)", opt = true, sql = "TEXT") String resourcesMd,
        @Attr(value = "dependências (Markdown)", opt = true, sql = "TEXT") String dependenciesMd,
        @Attr(value = "data-alvo", opt = true) LocalDate targetDate,
        @Attr(value = "responsável humano (G1)", ref = "users", onDelete = OnDelete.RESTRICT) UUID ownerUserId,
        @Attr(value = "criado por", ref = "users", onDelete = OnDelete.RESTRICT) UUID createdByUserId,
        @Attr(value = "empresa", ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "sessão DECIA de origem", opt = true, ref = "decia_sessions", onDelete = OnDelete.SET_NULL) UUID sessionId,
        @Attr(value = "projeto", opt = true, ref = "project_schemes", onDelete = OnDelete.SET_NULL) UUID projectId,
        @Attr(value = "decisão final RF29 (validação formal)", opt = true, ref = "final_decisions", onDelete = OnDelete.SET_NULL) UUID finalDecisionId,
        @Attr(value = "decisão substituída", opt = true, ref = "decisions", onDelete = OnDelete.SET_NULL) UUID supersedesDecisionId,
        @Attr(value = "estado", def = "'RASCUNHO'") DecisionLifecycle status,
        @Attr(value = "complexidade", def = "'PADRAO'") DecisionComplexity complexity,
        @Attr("natureza") DecisionKind kind,
        @Attr("impacto") DecisionLevel impact,
        @Attr("urgência") DecisionLevel urgency,
        @Attr(value = "visibilidade", def = "'PRIVADA'") Visibility visibility,
        @Attr(value = "classificação de acesso", def = "'INTERNO'") AccessClassification accessClass,
        @Attr("pesos habilitados") boolean weightingEnabled,
        @Attr("avaliação independente (G5)") boolean independentScoring,
        @Attr(value = "modelo de decisão", opt = true, len = 60) String templateKey,
        @Attr(value = "alternativa selecionada (estado atual)", opt = true, ref = "decision_alternatives", onDelete = OnDelete.SET_NULL)
        UUID selectedAlternativeId,
        @Attr(value = "decidida em", opt = true) Instant decidedAt,
        @Attr(value = "confiança humana (0–100, passo 5)") Integer decisionConfidencePct,
        @Attr(value = "motivo da escolha", opt = true, sql = "TEXT") String rationale,
        @Attr(value = "revisar a cada N dias") Integer reviewEveryDays) {

    public Decision {
        Objects.requireNonNull(status, "status");
        DecisionRules.confidence(decisionConfidencePct, "decisionConfidencePct");
        if (reviewEveryDays != null && reviewEveryDays <= 0) {
            throw DecisionRules.invalid("reviewEveryDays deve ser positivo");
        }
    }

    /**
     * Transição comum do ciclo. DECIDIDA e REABERTA não passam por aqui: exigem {@link #decide} (guarda §6.10 + snapshot DECISAO) e
     * {@link #reopen} (só o responsável + snapshot REABERTURA).
     */
    public Decision transition(DecisionLifecycle to) {
        if (to == DecisionLifecycle.DECIDIDA) {
            throw new DomainRuleException("DECISAO_EXIGE_GUARDA", "DECIDIDA só por decide(...) com o guarda pré-decisão (§6.10)");
        }
        if (to == DecisionLifecycle.REABERTA) {
            throw new DomainRuleException("DECISAO_EXIGE_REABERTURA", "REABERTA só por reopen(...) (§4.3)");
        }
        return withState(status.transition(to), selectedAlternativeId, decidedAt, decisionConfidencePct, rationale);
    }

    /**
     * AGUARDANDO_DECISAO → DECIDIDA. Só o responsável (ou APROVADOR com delegação explícita, §8). O guarda pré-decisão (§6.10) é calculado
     * aqui, a partir dos próprios valores que serão gravados (alternativa, motivo, confiança, complexidade e responsável desta decisão) e dos
     * fatos dos filhos, que precisam ser da mesma alternativa — não há como validar um conjunto de valores e gravar outro. Quem chama grava
     * o snapshot DECISAO na mesma transação.
     */
    public Decision decide(UUID actorUserId, boolean delegatedApprover, UUID alternativeId, String reason, Integer confidencePct,
                           PreDecisionGuard.Facts facts, boolean warningsConfirmed, Instant at) {
        requireOwner(actorUserId, delegatedApprover);
        Objects.requireNonNull(facts, "facts");
        if (alternativeId != null && !alternativeId.equals(facts.alternativeId())) {
            throw new DomainRuleException("DECISAO_FATOS_DIVERGENTES", "os fatos do guarda são de outra alternativa");
        }
        DecisionRules.confidence(confidencePct, "confidencePct");
        PreDecisionGuard.Result guard = PreDecisionGuard.check(new PreDecisionGuard.Input(complexity,
                alternativeId == null ? null : facts.alternativeStatus(), ownerUserId != null, reason, facts.readiness(), facts.criticalRiskOpen(),
                facts.highDivergenceOpen(), facts.criticalAssumptionUnvalidated(), confidencePct, facts.evidence()));
        guard.enforce(warningsConfirmed);
        DecisionLifecycle next = status.transition(DecisionLifecycle.DECIDIDA);
        return withState(next, alternativeId, Objects.requireNonNull(at, "at"), confidencePct, reason);
    }

    /** DECIDIDA/EM_EXECUCAO/RESOLVIDA/REVISADA → REABERTA. Só o responsável (§8); o snapshot anterior permanece e quem chama grava o REABERTURA. */
    public Decision reopen(UUID actorUserId, boolean delegatedApprover) {
        requireOwner(actorUserId, delegatedApprover);
        return withState(status.transition(DecisionLifecycle.REABERTA), selectedAlternativeId, decidedAt, decisionConfidencePct, rationale);
    }

    private void requireOwner(UUID actorUserId, boolean delegatedApprover) {
        if (!delegatedApprover && !Objects.equals(actorUserId, ownerUserId)) {
            throw new DomainRuleException("DECISAO_SO_RESPONSAVEL", "decidir e reabrir é só do responsável (ou APROVADOR com delegação registrada)");
        }
    }

    private Decision withState(DecisionLifecycle next, UUID selected, Instant decided, Integer confidence, String reason) {
        return new Decision(id, title, question, contextMd, objective, constraintsMd, scope, stakeholdersJson, resourcesMd, dependenciesMd, targetDate,
                ownerUserId, createdByUserId, companyId, departmentId, sessionId, projectId, finalDecisionId, supersedesDecisionId, next, complexity, kind,
                impact, urgency, visibility, accessClass, weightingEnabled, independentScoring, templateKey, selected, decided, confidence, reason,
                reviewEveryDays);
    }
}
