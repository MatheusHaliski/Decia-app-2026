package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Revisão da decisão pelo admin da sessão (RF15) — TAXONOMIA §5.12; DEVOLVIDA exige motivo. */
@DomainEntity(context = "5 DECIA sessão", table = "decision_reviews", rfs = {"RF15", "RF29", "RF42"}, migration = 14, audit = Audit.NONE,
        doc = "Revisões (filho da decisão → CASCADE); revisor RESTRICT (trilha).",
        indexes = {"decision_id, reviewed_at"})
public record DecisionReview(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "final_decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "revisor (admin da sessão)", ref = "users", onDelete = OnDelete.RESTRICT) UUID reviewerId,
        @Attr("resultado") ReviewOutcome outcome,
        @Attr(value = "motivo (obrigatório se DEVOLVIDA)", opt = true, len = 1000) String reason,
        @Attr("revisada em") Instant reviewedAt,
        @Attr(value = "grupo notificado em", opt = true) Instant notifiedGroupAt) {

    public DecisionReview {
        if (outcome == ReviewOutcome.DEVOLVIDA && (reason == null || reason.isBlank())) {
            throw new IllegalArgumentException("VALIDACAO: devolução exige motivo");
        }
    }
}
