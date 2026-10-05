package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Regra versionada de pontuação (RF42.CA02) — TAXONOMIA §7.3; o lançamento congela {@code ruleVersionId}. */
@DomainEntity(context = "8 Gamificação", table = "decia_points_rules", rfs = {"RF42", "RF18"}, migration = 17,
        doc = "Catálogo de regras de pontos por evento, com tetos. RESTRICT (referenciada pelo extrato).",
        indexes = {"event_code, active, valid_from"})
public record DeciaPointsRule(
        @Attr("identificador") UUID id,
        @Attr("evento") PointsEvent eventCode,
        @Attr("pontos") int points,
        @Attr(value = "teto diário", opt = true) Integer dailyCap,
        @Attr(value = "teto semanal", opt = true) Integer weeklyCap,
        @Attr(value = "teto por sessão", opt = true) Integer perSessionCap,
        @Attr("uma vez por referência") boolean oncePerRef,
        @Attr(value = "fonte do multiplicador (ex.: REACOES_QUALIDADE)", opt = true, len = 60) String multiplierSource,
        @Attr("vigente de") Instant validFrom,
        @Attr(value = "vigente até", opt = true) Instant validTo,
        @Attr(value = "ativa", def = "TRUE") boolean active,
        @Attr(value = "quem editou", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID editedBy,
        @Attr(value = "descrição pública", opt = true, len = 500) String description) {
}
