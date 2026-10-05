package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Snapshot diário do HSE (RF44; revisão art. 20 via DsrTarget HSE) — TAXONOMIA §9.7. */
@DomainEntity(context = "8 Gamificação", table = "hse_snapshots", rfs = {"RF44", "RF43", "RF45", "RF3"}, migration = 17, audit = Audit.CREATED,
        doc = "HSE por pessoa e dia (dono → CASCADE). Único (user, date).",
        uniques = {"user_id, score_date"})
public record EfficiencyScoreSnapshot(
        @Attr("identificador") UUID id,
        @Attr(value = "pessoa", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr(value = "dia", col = "score_date") LocalDate date,
        @Attr(value = "HSE", sql = "DECIMAL(6,2)") BigDecimal hse,
        @Attr(value = "média móvel 7 dias", opt = true, sql = "DECIMAL(6,2)") BigDecimal movingAvg7,
        @Attr("versão dos pesos") int weightsVersion) {
}
