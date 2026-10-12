package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/**
 * Participante da decisão com papel DACI (§4.2, [REF-DACI]). {@code assessmentsSubmittedAt} libera a visão da mediana e das notas dos
 * outros quando a avaliação é independente (G5, §6.2).
 */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_participants", rfs = {"RF29", "RF5"}, migration = 22,
        doc = "Participantes (filho da decisão → CASCADE); usuário RESTRICT. Único (decisão, usuário).",
        uniques = {"decision_id, user_id"}, indexes = {"user_id, role"})
public record DecisionParticipant(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "usuário", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr("papel DACI") DecisionRole role,
        @Attr("entrou em") Instant joinedAt,
        @Attr(value = "avaliações enviadas em (G5)", opt = true) Instant assessmentsSubmittedAt) {

    /** Com avaliação independente, só vê as notas dos outros quem já enviou as próprias ou depois da revelação da rodada (§6.2). */
    public boolean canSeeOthersScores(boolean independentScoring, boolean roundRevealed) {
        return !independentScoring || roundRevealed || assessmentsSubmittedAt != null;
    }
}
