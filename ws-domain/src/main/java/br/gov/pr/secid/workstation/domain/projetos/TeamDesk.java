package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.identity.DeskSkin;

import java.util.UUID;

/** Mesa da equipe (RF21.CA01/CA04/CA05, proposta do README RF21) — layout de widgets por departamento; último-vence com aviso. */
@DomainEntity(context = "3 Criador de Projetos", table = "team_desks", rfs = {"RF21", "RF22"}, migration = 12, versioned = true,
        doc = "Uma Mesa por departamento (layout de widgets, skin). Catálogo institucional → RESTRICT.",
        indexes = {})
public record TeamDesk(
        @Attr("identificador") UUID id,
        @Attr(value = "departamento (uma Mesa por departamento)", ref = "departments", onDelete = OnDelete.RESTRICT, unique = true) UUID departmentId,
        @Attr(value = "widgets e posições", opt = true) String layoutJson,
        @Attr(value = "skin", def = "'PAPEL'") DeskSkin deskSkin,
        @Attr(value = "quem alterou por último", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID updatedBy) {
}
