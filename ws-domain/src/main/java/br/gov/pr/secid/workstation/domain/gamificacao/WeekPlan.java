package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Plano da semana (RF44) — TAXONOMIA §9.5. */
@DomainEntity(context = "8 Gamificação", table = "week_plans", rfs = {"RF44", "RF19"}, migration = 17, versioned = true,
        doc = "Plano semanal por pessoa (dono → CASCADE). Único (user, week_start).",
        uniques = {"user_id, week_start"})
public record WeekPlan(
        @Attr("identificador") UUID id,
        @Attr(value = "pessoa", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr("segunda-feira da semana") LocalDate weekStart,
        @Attr("sequência de semanas cumpridas") int streak,
        @Attr(value = "HSE de fechamento", opt = true, sql = "DECIMAL(6,2)") BigDecimal closingHse,
        @Attr(value = "recomendação da IA", opt = true, len = 1000) String recommendation) {
}
