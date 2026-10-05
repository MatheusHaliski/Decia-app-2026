package br.gov.pr.secid.workstation.domain.social;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Seguir pessoa, departamento ou empresa (RF14.CA04, RF27) — TAXONOMIA §8.6; idempotente e reativável. */
@DomainEntity(context = "7 Social & Descoberta", table = "follows", rfs = {"RF27", "RF14", "RF15"}, migration = 16, audit = Audit.NONE,
        doc = "Seguidores. Único (follower, target). Seguidor → CASCADE.",
        uniques = {"follower_id, target_type, target_id"}, indexes = {"target_type, target_id, status"})
public record Follow(
        @Attr("identificador") UUID id,
        @Attr(value = "seguidor", ref = "users", onDelete = OnDelete.CASCADE) UUID followerId,
        @Attr("tipo do alvo") FollowTargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr(value = "estado", def = "'ATIVO'") FollowStatus status,
        @Attr("momento") Instant at) {
}
