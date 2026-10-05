package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Avaliação do Espelho de Conformidade (RF32.CA02/CA04) — TAXONOMIA §3.9; citada no resumo analítico (RF32.CA05). */
@DomainEntity(context = "3 Criador de Projetos", table = "compliance_results", rfs = {"RF32", "RF11", "RF39"}, migration = 12, audit = Audit.CREATED,
        doc = "Resultados de avaliação por projeto × checklist. Filho do projeto → CASCADE; checklist RESTRICT.",
        indexes = {"project_id, evaluated_at"}, checks = {"percent BETWEEN 0 AND 100"})
public record ComplianceResult(
        @Attr("identificador") UUID id,
        @Attr(value = "projeto", ref = "project_schemes", onDelete = OnDelete.CASCADE) UUID projectId,
        @Attr(value = "checklist", ref = "compliance_checklists", onDelete = OnDelete.RESTRICT) UUID checklistId,
        @Attr("avaliado em") Instant evaluatedAt,
        @Attr("itens [{itemId, status, satisfiedByProjectTaskId}]") String itemsJson,
        @Attr(value = "% atendido", sql = "DECIMAL(5,2)", def = "0") BigDecimal percent,
        @Attr("obrigatórios ausentes") int blockingCount,
        @Attr(value = "quem sobrescreveu o selo (RF32.CA04)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID overrideByUserId,
        @Attr(value = "justificativa do override", opt = true, len = 500) String overrideReason,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId) {
}
