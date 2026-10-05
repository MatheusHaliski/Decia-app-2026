package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Tarefa do Dia (= FAI DailyLook) — TAXONOMIA §9.4 (RF44; lido em RF19, RF43, RF45). Única por (userId, taskDate). */
@DomainEntity(context = "8 Gamificação", table = "daily_tasks", rfs = {"RF44", "RF19", "RF43", "RF45", "RF46"}, migration = 17, versioned = true,
        doc = "Sugestão diária e feedback. Dono → CASCADE; tarefa RESTRICT (a tarefa do dia segura a tarefa); delegado SET NULL.",
        uniques = {"user_id, task_date"}, indexes = {"task_id", "week_plan_day_id"})
public record DailyTask(
        @Attr("identificador") UUID id,
        @Attr(value = "pessoa", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr("dia") LocalDate taskDate,
        @Attr(value = "tarefa sugerida", ref = "tasks", onDelete = OnDelete.RESTRICT) UUID taskId,
        @Attr("sugerida pela IA") boolean suggestedByAi,
        @Attr(value = "índice de prioridade {eisenhower, wsjf, cpmSlack, moscow, pareto, wipAdvice}", opt = true) String priorityIndexJson,
        @Attr(value = "HSE previsto {total, components[]}", opt = true) String hsePredictedJson,
        @Attr(value = "HSE realizado", opt = true) String hseRealizedJson,
        @Attr(value = "feedback", opt = true) DailyFeedback feedback,
        @Attr(value = "feedback em", opt = true) Instant feedbackAt,
        @Attr(value = "horas reais", opt = true, sql = "DECIMAL(6,2)") BigDecimal actualHours,
        @Attr(value = "motivo da troca", opt = true, len = 300) String swapReason,
        @Attr(value = "trocada a partir de", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID swappedFromTaskId,
        @Attr(value = "delegada para", opt = true, ref = "users", onDelete = OnDelete.SET_NULL) UUID delegatedToUserId,
        @Attr(value = "referência do bloqueio", opt = true, len = 200) String blockedByRef,
        @Attr(value = "dia do plano semanal", opt = true, ref = "week_plan_days", onDelete = OnDelete.SET_NULL) UUID weekPlanDayId,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId) {
}
