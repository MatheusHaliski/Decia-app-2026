package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Participante da meta coletiva (RF35) — TAXONOMIA §9.2. */
@DomainEntity(context = "8 Gamificação", table = "goal_participants", rfs = {"RF35"}, migration = 17, audit = Audit.NONE,
        doc = "Participantes (filho → CASCADE; pessoa → CASCADE).",
        uniques = {"goal_id, user_id"})
public record GoalParticipant(
        @Attr("identificador") UUID id,
        @Attr(value = "meta", ref = "collective_goals", onDelete = OnDelete.CASCADE) UUID goalId,
        @Attr(value = "participante", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr("entrou em") Instant joinedAt,
        @Attr(value = "contribuição", opt = true) String contributionJson) {
}
