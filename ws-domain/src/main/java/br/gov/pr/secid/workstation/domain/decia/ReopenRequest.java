package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Pedido de reabertura (RF14) — TAXONOMIA §5.13; justificativa ≥ 20 caracteres; 1 PENDENTE por decisão. */
@DomainEntity(context = "5 DECIA sessão", table = "reopen_requests", rfs = {"RF14", "RF29"}, migration = 14,
        doc = "Pedidos de reabertura (filho da sessão/decisão → CASCADE). Quem pediu/decidiu RESTRICT.",
        indexes = {"decision_id, status"})
public record ReopenRequest(
        @Attr("identificador") UUID id,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.CASCADE) UUID sessionId,
        @Attr(value = "decisão", ref = "final_decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "quem pediu (nulo = IA)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID requestedBy,
        @Attr(value = "justificativa (≥ 20)", len = 2000) String justification,
        @Attr(value = "estado", def = "'PENDENTE'") ReopenStatus status,
        @Attr(value = "votos", opt = true) String votesJson,
        @Attr(value = "prazo da votação", opt = true) Instant votingDeadlineAt,
        @Attr(value = "quem decidiu", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID decidedBy,
        @Attr(value = "decidido em", opt = true) Instant decidedAt) {

    public static final int MIN_JUSTIFICATION = 20;

    public ReopenRequest {
        if (justification == null || justification.trim().length() < MIN_JUSTIFICATION) {
            throw new IllegalArgumentException("VALIDACAO: justificativa com pelo menos " + MIN_JUSTIFICATION + " caracteres");
        }
    }
}
