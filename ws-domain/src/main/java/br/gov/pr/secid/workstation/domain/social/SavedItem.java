package br.gov.pr.secid.workstation.domain.social;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.TargetType;

import java.time.Instant;
import java.util.UUID;

/** Item salvo / favorito (RF26, RF27) — TAXONOMIA §8.3. */
@DomainEntity(context = "7 Social & Descoberta", table = "saved_items", rfs = {"RF26", "RF27", "RF19"}, migration = 16, audit = Audit.NONE,
        doc = "Salvos do usuário → CASCADE. Único (user, target).",
        uniques = {"user_id, target_type, target_id"})
public record SavedItem(
        @Attr("identificador") UUID id,
        @Attr(value = "usuário", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr("tipo do alvo") TargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr("favorito") boolean favorite,
        @Attr("salvo em") Instant savedAt) {
}
