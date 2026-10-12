package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Nomeação de curador pelo chefe (RF28.CA03) — TAXONOMIA §1.7; o curador opera a fila de chancelas em nome do emissor (RF39). */
@DomainEntity(context = "1 Identidade & Acesso", table = "curator_appointments", rfs = {"RF28", "RF39"}, migration = 10, audit = Audit.CREATED,
        doc = "Nomeações de curador (papel contextual CURADOR). revokedAt nulo = vigente.",
        indexes = {"department_id, revoked_at", "curator_user_id"})
public record CuratorAppointment(
        @Attr("identificador") UUID id,
        @Attr(value = "departamento", ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "curador nomeado", ref = "users", onDelete = OnDelete.CASCADE) UUID curatorUserId,
        @Attr(value = "chefe que nomeou", ref = "users", onDelete = OnDelete.RESTRICT) UUID appointedBy,
        @Attr("data da nomeação") Instant appointedAt,
        @Attr(value = "revogação", opt = true) Instant revokedAt,
        @Attr(value = "motivo da revogação", opt = true, len = 300) String revokeReason,
        @Attr(value = "escopo", def = "'AMBOS'") CuratorScope scope) {

    public boolean isActive() {
        return revokedAt == null;
    }
}
