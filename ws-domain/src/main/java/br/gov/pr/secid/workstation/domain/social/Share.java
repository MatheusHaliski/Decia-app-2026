package br.gov.pr.secid.workstation.domain.social;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.TargetType;

import java.time.Instant;
import java.util.UUID;

/** Compartilhamento (RF26) — TAXONOMIA §8.4: no Mural, numa sessão DECIA ou por link externo com validade. */
@DomainEntity(context = "7 Social & Descoberta", table = "shares", rfs = {"RF26", "RF27", "RF29"}, migration = 16, audit = Audit.CREATED,
        doc = "Compartilhamentos. Ator → CASCADE; sessão/imagem SET NULL. externalToken único.",
        indexes = {"target_type, target_id", "actor_id"})
public record Share(
        @Attr("identificador") UUID id,
        @Attr(value = "quem compartilhou", ref = "users", onDelete = OnDelete.CASCADE) UUID actorId,
        @Attr("tipo do alvo") TargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr("canal") ShareChannel channel,
        @Attr(value = "sessão DECIA de destino", opt = true, ref = "decia_sessions", onDelete = OnDelete.SET_NULL) UUID sessionId,
        @Attr(value = "token do link externo", opt = true, len = 64, unique = true) String externalToken,
        @Attr(value = "validade do link", opt = true) Instant expiresAt,
        @Attr(value = "imagem gerada (card)", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID imageMediaId) {
}
