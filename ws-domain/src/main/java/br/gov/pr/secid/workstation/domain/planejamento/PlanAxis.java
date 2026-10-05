package br.gov.pr.secid.workstation.domain.planejamento;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.RiskLevel;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Eixo do plano (= FAI DnaCell), 6 por plano — TAXONOMIA §4.2 (RF24.CA02; risco agregado via RF31/RF32). */
@DomainEntity(context = "4 Planejamento institucional", table = "plan_axes", rfs = {"RF24", "RF21", "RF31", "RF32"}, migration = 13,
        doc = "Eixos do plano (posição 1..6). Filho do plano → CASCADE.",
        uniques = {"plan_id, position"}, checks = {"position BETWEEN 1 AND 6"})
public record PlanAxis(
        @Attr("identificador") UUID id,
        @Attr(value = "plano", ref = "annual_plans", onDelete = OnDelete.CASCADE) UUID planId,
        @Attr(value = "posição 1..6", sql = "TINYINT UNSIGNED") int position,
        @Attr(value = "nome", len = 120) String name,
        @Attr(value = "meta", opt = true, len = 500) String goal,
        @Attr(value = "indicador", opt = true, len = 200) String indicator,
        @Attr(value = "valor-alvo", opt = true, len = 80) String targetValue,
        @Attr(value = "cor (token)", opt = true, len = 40) String color,
        @Attr(value = "ícone", opt = true, len = 60) String icon,
        @Attr("projetos vinculados") int projectsCount,
        @Attr(value = "% concluído", sql = "DECIMAL(5,2)", def = "0") BigDecimal completedPct,
        @Attr(value = "prazo mais próximo", opt = true) LocalDate nearestDueAt,
        @Attr(value = "risco agregado", opt = true) RiskLevel aggregatedRisk) {

    public PlanAxis {
        if (position < 1 || position > AnnualPlan.AXES) {
            throw new IllegalArgumentException("VALIDACAO: position entre 1 e " + AnnualPlan.AXES);
        }
    }
}
