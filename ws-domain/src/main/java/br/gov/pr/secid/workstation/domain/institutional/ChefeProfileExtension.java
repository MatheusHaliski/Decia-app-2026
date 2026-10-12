package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Extensão 1:1 do perfil CHEFE_DEPARTAMENTO (RF1, RF28; Q-64, Q-66) — TAXONOMIA §1.1. */
@DomainEntity(context = "1 Identidade & Acesso", table = "user_chefe_ext", rfs = {"RF1", "RF28"}, migration = 10, pk = "user_id",
        doc = "Dados declarados pelo perfil CHEFE: empresa existente, departamento (nome ou id) e link do ato de nomeação no Diário Oficial.")
public record ChefeProfileExtension(
        @Attr(value = "usuário (PK)", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr(value = "empresa existente", ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "nome do departamento declarado", opt = true, len = 160) String departmentName,
        @Attr(value = "departamento existente", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "link oficial do ato de nomeação (https://)", len = 500) String appointmentLink) {
}
