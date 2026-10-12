package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.util.UUID;

/** Perfil deliberativo (objetivo 2; RF43, RF19) — TAXONOMIA §9.11: clareza, uso de evidência, consistência, completude, reutilização. */
@DomainEntity(context = "8 Gamificação", table = "deliberative_profiles", rfs = {"RF43", "RF19", "RF45"}, migration = 17,
        doc = "Perfil deliberativo por pessoa e período (dono → CASCADE). Único (user, period_key).",
        uniques = {"user_id, period_key"})
public record DeliberativeProfile(
        @Attr("identificador") UUID id,
        @Attr(value = "pessoa", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr(value = "período (AAAA-MM ou id da sessão)", len = 40) String periodKey,
        @Attr(value = "clareza", sql = "DECIMAL(5,2)") BigDecimal clarity,
        @Attr(value = "uso de evidência", sql = "DECIMAL(5,2)") BigDecimal evidenceUse,
        @Attr(value = "consistência", sql = "DECIMAL(5,2)") BigDecimal consistency,
        @Attr(value = "completude", sql = "DECIMAL(5,2)") BigDecimal completeness,
        @Attr(value = "reutilização", sql = "DECIMAL(5,2)") BigDecimal reuse,
        @Attr(value = "variação ▲▼", opt = true) String deltaJson,
        @Attr(value = "distintivos", opt = true) String badgesJson,
        @Attr(value = "indicadores públicos", opt = true) String publicIndicatorsJson,
        @Attr(value = "insights da IA", opt = true) String aiInsightsJson) {
}
