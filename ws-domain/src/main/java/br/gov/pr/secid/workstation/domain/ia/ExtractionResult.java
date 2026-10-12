package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Extração de desenho técnico/documento (RF34) — TAXONOMIA §10.8; gera PLANILHA/CRONOGRAMA (RF20, RF21). */
@DomainEntity(context = "10 IA do sistema", table = "extraction_results", rfs = {"RF34", "RF20", "RF21"}, migration = 21, versioned = true,
        doc = "Extrações por tarefa (filho → CASCADE); tarefa derivada SET NULL.",
        indexes = {"task_id, status"})
public record ExtractionResult(
        @Attr("identificador") UUID id,
        @Attr(value = "tarefa de origem", ref = "tasks", onDelete = OnDelete.CASCADE) UUID taskId,
        @Attr("tipo") ExtractionKind kind,
        @Attr(value = "linhas [{item, unit, qty, area, volume, confidence}]", opt = true) String rowsJson,
        @Attr(value = "camadas do CAD", opt = true) String layersJson,
        @Attr(value = "tarefa derivada (PLANILHA/CRONOGRAMA)", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID derivedTaskId,
        @Attr(value = "estado", def = "'PROCESSANDO'") ExtractionStatus status,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId) {
}
