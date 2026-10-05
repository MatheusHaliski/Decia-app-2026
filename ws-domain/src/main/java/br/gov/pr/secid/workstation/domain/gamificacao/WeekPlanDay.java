package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Dia do plano semanal (RF44) — TAXONOMIA §9.5. */
@DomainEntity(context = "8 Gamificação", table = "week_plan_days", rfs = {"RF44"}, migration = 17, audit = Audit.NONE,
        doc = "Dias do plano (filho → CASCADE); tarefa SET NULL.",
        indexes = {"week_plan_id, date"})
public record WeekPlanDay(
        @Attr("identificador") UUID id,
        @Attr(value = "plano", ref = "week_plans", onDelete = OnDelete.CASCADE) UUID weekPlanId,
        @Attr(value = "dia", col = "plan_date") LocalDate date,
        @Attr(value = "tarefa prevista", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID taskId,
        @Attr("ordem") int sortOrder,
        @Attr(value = "reuniões do dia", opt = true) String meetingsJson,
        @Attr(value = "carga %", opt = true, sql = "DECIMAL(5,2)") BigDecimal loadPct) {
}
