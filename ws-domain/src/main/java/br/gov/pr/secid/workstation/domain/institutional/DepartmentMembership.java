package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Histórico de lotações — TAXONOMIA §1.6 (RF28.CA02: uma lotação vigente por pessoa; RF36 transição). */
@DomainEntity(context = "1 Identidade & Acesso", table = "department_memberships", rfs = {"RF28", "RF21", "RF36"}, migration = 10, audit = Audit.CREATED,
        doc = "Lotações (histórico). endedAt nulo = vigente; a aplicação garante uma vigente por usuário (RF28.CA02).",
        indexes = {"user_id, ended_at", "department_id, ended_at"})
public record DepartmentMembership(
        @Attr("identificador") UUID id,
        @Attr(value = "pessoa lotada", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr(value = "departamento", ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "papel na lotação", def = "'MEMBRO'") DeptRole roleInDept,
        @Attr("início") Instant startedAt,
        @Attr(value = "fim (nulo = vigente)", opt = true) Instant endedAt,
        @Attr(value = "motivo do encerramento", opt = true, len = 300) String reason) {

    public boolean isActive() {
        return endedAt == null;
    }
}
