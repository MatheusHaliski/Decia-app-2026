package br.gov.pr.secid.workstation.domain.rastro;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Item transferido pelo dossiê (RF36) — TAXONOMIA §11.2. */
@DomainEntity(context = "6 Rastro de Decisão", table = "handoff_items", rfs = {"RF36"}, migration = 15, audit = Audit.NONE,
        doc = "Itens do dossiê (filho → CASCADE). Responsáveis RESTRICT.",
        indexes = {"dossier_id", "target_type, target_id"})
public record HandoffItem(
        @Attr("identificador") UUID id,
        @Attr(value = "dossiê", ref = "handoff_dossiers", onDelete = OnDelete.CASCADE) UUID dossierId,
        @Attr("tipo do alvo") HandoffTargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr(value = "responsável anterior", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID previousResponsibleId,
        @Attr(value = "novo responsável", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID newResponsibleId,
        @Attr(value = "transferido em", opt = true) Instant transferredAt,
        @Attr(value = "nota", opt = true, len = 500) String note) {
}
