package br.gov.pr.secid.workstation.domain.social;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.TargetType;

import java.time.Instant;
import java.util.UUID;

/** Remix — cópia com crédito ao original (RF23, RF26, RF40) — TAXONOMIA §8.5. */
@DomainEntity(context = "7 Social & Descoberta", table = "remixes", rfs = {"RF26", "RF23", "RF40", "RF42"}, migration = 16, audit = Audit.NONE,
        doc = "Remixes. Ator → CASCADE; oferta e lançamento de pontos SET NULL.",
        indexes = {"source_type, source_id", "actor_id"})
public record Remix(
        @Attr("identificador") UUID id,
        @Attr(value = "quem remixou", ref = "users", onDelete = OnDelete.CASCADE) UUID actorId,
        @Attr("tipo da origem") TargetType sourceType,
        @Attr("id da origem") UUID sourceId,
        @Attr("tipo do resultado") TargetType resultType,
        @Attr("id do resultado") UUID resultId,
        @Attr(value = "oferta do Balcão usada", opt = true, ref = "model_offers", onDelete = OnDelete.SET_NULL) UUID modelOfferId,
        @Attr(value = "lançamento de DECIA Points", opt = true, ref = "decia_points_ledger", onDelete = OnDelete.SET_NULL) UUID ledgerEntryId,
        @Attr("momento") Instant at) {
}
