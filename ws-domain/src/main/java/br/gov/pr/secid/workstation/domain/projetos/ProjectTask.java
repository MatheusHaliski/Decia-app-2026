package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Ligação tarefa ↔ projeto (= FAI SchemeItem) — TAXONOMIA §3.2 (RF21, RF22 Mesa, RF23 snapshot, RF43 EVM/PERT).
 * {@code taskId} fica nulo se a tarefa for excluída (Q-31): o {@code snapshotJson} mantém o projeto legível.
 */
@DomainEntity(context = "3 Criador de Projetos", table = "project_tasks", rfs = {"RF21", "RF22", "RF23", "RF29", "RF43", "RF44"}, migration = 12,
        doc = "Tarefas do esquema por fase. task_id SET NULL + snapshot_json (Q-31). Filho do projeto → CASCADE.",
        indexes = {"project_id, phase, sort_order", "task_id", "responsible_id, due_at"},
        checks = {"percent_complete BETWEEN 0 AND 100"})
public record ProjectTask(
        @Attr("identificador") UUID id,
        @Attr(value = "projeto", ref = "project_schemes", onDelete = OnDelete.CASCADE) UUID projectId,
        @Attr(value = "tarefa do acervo (nulo se removida)", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID taskId,
        @Attr("fase (slot)") ProjectPhase phase,
        @Attr("ordem na fase") int sortOrder,
        @Attr(value = "responsável", opt = true, ref = "users", onDelete = OnDelete.SET_NULL) UUID responsibleId,
        @Attr(value = "prazo", opt = true) LocalDate dueAt,
        @Attr(value = "início", opt = true) LocalDate startAt,
        @Attr(value = "horas estimadas", opt = true, sql = "DECIMAL(8,2)") BigDecimal estimatedHours,
        @Attr(value = "PERT otimista", opt = true, sql = "DECIMAL(8,2)") BigDecimal pertOptimistic,
        @Attr(value = "PERT mais provável", opt = true, sql = "DECIMAL(8,2)") BigDecimal pertMostLikely,
        @Attr(value = "PERT pessimista", opt = true, sql = "DECIMAL(8,2)") BigDecimal pertPessimistic,
        @Attr(value = "horas realizadas", opt = true, sql = "DECIMAL(8,2)") BigDecimal actualHours,
        @Attr(value = "% concluído", sql = "TINYINT UNSIGNED", def = "0") int percentComplete,
        @Attr(value = "PV (EVM)", opt = true, sql = "DECIMAL(16,2)") BigDecimal plannedValue,
        @Attr(value = "EV (EVM)", opt = true, sql = "DECIMAL(16,2)") BigDecimal earnedValue,
        @Attr(value = "AC (EVM)", opt = true, sql = "DECIMAL(16,2)") BigDecimal actualCost,
        @Attr("no caminho crítico") boolean isCritical,
        @Attr(value = "folga em dias", opt = true) Integer slackDays,
        @Attr(value = "MoSCoW", opt = true) Moscow moscow,
        @Attr(value = "TaskSnapshot (RF23.CA03)", opt = true) String snapshotJson,
        @Attr("removida pelo autor da tarefa") boolean removedByAuthor,
        @Attr(value = "Mesa: x", opt = true, sql = "DECIMAL(10,3)") BigDecimal canvasX,
        @Attr(value = "Mesa: y", opt = true, sql = "DECIMAL(10,3)") BigDecimal canvasY,
        @Attr(value = "Mesa: escala", opt = true, sql = "DECIMAL(6,3)") BigDecimal canvasScale,
        @Attr(value = "Mesa: rotação", opt = true, sql = "DECIMAL(6,2)") BigDecimal canvasRotation,
        @Attr(value = "Mesa: camada", opt = true) Integer canvasLayer,
        @Attr(value = "cor do post-it", opt = true, len = 40) String stickyColor,
        @Attr(value = "nó do rastro de decisão (RF29)", opt = true, ref = "decision_trace_nodes", onDelete = OnDelete.SET_NULL) UUID decisionTraceNodeId) {

    public ProjectTask {
        if (percentComplete < 0 || percentComplete > 100) {
            throw new IllegalArgumentException("VALIDACAO: percentComplete entre 0 e 100");
        }
    }

    /** Estimativa PERT = (O + 4M + P) / 6; nula se faltar algum valor. */
    public BigDecimal pertEstimate() {
        if (pertOptimistic == null || pertMostLikely == null || pertPessimistic == null) {
            return null;
        }
        return pertOptimistic.add(pertMostLikely.multiply(BigDecimal.valueOf(4))).add(pertPessimistic)
                .divide(BigDecimal.valueOf(6), 2, java.math.RoundingMode.HALF_UP);
    }
}
