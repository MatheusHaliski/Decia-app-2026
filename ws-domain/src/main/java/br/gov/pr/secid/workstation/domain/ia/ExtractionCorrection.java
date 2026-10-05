package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Correção humana de uma linha extraída (RF34.CA04) — TAXONOMIA §10.9; realimenta o motor por departamento. */
@DomainEntity(context = "10 IA do sistema", table = "extraction_corrections", rfs = {"RF34"}, migration = 21, audit = Audit.NONE,
        doc = "Correções (filho → CASCADE). Quem corrigiu RESTRICT (trilha de aprendizado).",
        indexes = {"extraction_id, row_index"})
public record ExtractionCorrection(
        @Attr("identificador") UUID id,
        @Attr(value = "extração", ref = "extraction_results", onDelete = OnDelete.CASCADE) UUID extractionId,
        @Attr("índice da linha") int rowIndex,
        @Attr(value = "campo", len = 40) String field,
        @Attr(value = "valor anterior", opt = true, len = 500) String oldValue,
        @Attr(value = "valor novo", opt = true, len = 500) String newValue,
        @Attr(value = "quem corrigiu", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr("momento") Instant at) {
}
