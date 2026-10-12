package br.gov.pr.secid.workstation.domain.social;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.TargetType;

import java.time.Instant;
import java.util.UUID;

/** Reação a um alvo polimórfico (RF26) — TAXONOMIA §8.1; peso do ator no Hype (RF45.CA04); antifraude. */
@DomainEntity(context = "7 Social & Descoberta", table = "reactions", rfs = {"RF26", "RF27", "RF42", "RF45"}, migration = 16, audit = Audit.NONE,
        doc = "Reações. Ator → CASCADE (dado do dono). Única (actor, target, reaction_type).",
        uniques = {"actor_id, target_type, target_id, reaction_type"}, indexes = {"target_type, target_id, reaction_type"})
public record Reaction(
        @Attr("identificador") UUID id,
        @Attr(value = "quem reagiu", ref = "users", onDelete = OnDelete.CASCADE) UUID actorId,
        @Attr("tipo do alvo") TargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr("reação") ReactionType reactionType,
        @Attr("momento") Instant at,
        @Attr(value = "Hype do ator no momento (peso PageRank)", opt = true) Integer actorHypeAtTime,
        @Attr(value = "motivo de desconsideração (antifraude)", opt = true) IgnoredReason ignoredReason) {
}
