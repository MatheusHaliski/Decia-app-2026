package br.gov.pr.secid.workstation.domain.acervo;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Trilha de transições da tarefa (RF41.CA02; reabertura RF12.CA05) — TAXONOMIA §2.4. APPEND-ONLY. */
@DomainEntity(context = "2 Acervo de Tarefas", table = "task_state_log", rfs = {"RF41", "RF12", "RF44", "RF46"}, migration = 11, audit = Audit.NONE,
        doc = "Append-only. Pertence à tarefa (CASCADE); ator RESTRICT (trilha nunca cascateia por usuário).",
        indexes = {"task_id, at", "actor_id", "correlation_id"})
public record TaskStateLog(
        @Attr("identificador") UUID id,
        @Attr(value = "tarefa", ref = "tasks", onDelete = OnDelete.CASCADE) UUID taskId,
        @Attr(value = "estado anterior", opt = true) TaskState fromState,
        @Attr("novo estado") TaskState toState,
        @Attr(value = "quem transicionou (nulo = sistema)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID actorId,
        @Attr(value = "motivo/justificativa", opt = true, len = 500) String reason,
        @Attr(value = "projeto que causou EM_USO", opt = true, ref = "project_schemes", onDelete = OnDelete.SET_NULL) UUID projectId,
        @Attr(value = "correlação", opt = true, len = 64) String correlationId,
        @Attr("momento") Instant at) {
}
