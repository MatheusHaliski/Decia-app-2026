package br.gov.pr.secid.workstation.domain.planejamento;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Vínculo eixo ↔ projeto — TAXONOMIA §4.3; um projeto em um só eixo por plano (RF24.CA02) via unicidade (plan_id, project_id). */
@DomainEntity(context = "4 Planejamento institucional", table = "plan_axis_projects", rfs = {"RF24", "RF21"}, migration = 13, audit = Audit.NONE,
        doc = "Projetos por eixo. plan_id desnormalizado para garantir um eixo por plano. Filho do eixo/projeto → CASCADE.",
        uniques = {"plan_id, project_id"}, indexes = {"project_id"})
public record PlanAxisProject(
        @Attr("identificador") UUID id,
        @Attr(value = "plano (desnormalizado)", ref = "annual_plans", onDelete = OnDelete.CASCADE) UUID planId,
        @Attr(value = "eixo", ref = "plan_axes", onDelete = OnDelete.CASCADE) UUID axisId,
        @Attr(value = "projeto", ref = "project_schemes", onDelete = OnDelete.CASCADE) UUID projectId,
        @Attr(value = "quem vinculou", ref = "users", onDelete = OnDelete.RESTRICT) UUID linkedBy,
        @Attr("quando") Instant linkedAt) {
}
