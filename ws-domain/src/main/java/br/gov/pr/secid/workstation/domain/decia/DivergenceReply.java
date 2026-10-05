package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Resposta a divergência (RF10) — TAXONOMIA §5.7. */
@DomainEntity(context = "5 DECIA sessão", table = "divergence_replies", rfs = {"RF10", "RF42"}, migration = 14, audit = Audit.NONE,
        doc = "Respostas (filho da divergência → CASCADE). Autor RESTRICT (pontua em RF42).",
        indexes = {"divergence_id, at"})
public record DivergenceReply(
        @Attr("identificador") UUID id,
        @Attr(value = "divergência", ref = "divergences", onDelete = OnDelete.CASCADE) UUID divergenceId,
        @Attr(value = "autor", ref = "users", onDelete = OnDelete.RESTRICT) UUID authorId,
        @Attr("mensagem (TIMEUUID)") UUID messageId,
        @Attr("marcada pela IA como resolutiva") boolean resolves,
        @Attr("momento") Instant at) {
}
