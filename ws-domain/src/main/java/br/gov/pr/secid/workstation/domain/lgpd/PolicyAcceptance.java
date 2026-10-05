package br.gov.pr.secid.workstation.domain.lgpd;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Aceite de documento legal — APPEND-ONLY, sobrevive à anonimização (RF1, RF2, RF3; D-16) — TAXONOMIA §1.11. */
@DomainEntity(context = "1 Identidade & Acesso", table = "policy_acceptances", rfs = {"RF1", "RF2", "RF3", "RF18"}, migration = 10, audit = Audit.NONE,
        doc = "Prova do aceite (art. 8º §2º). Só INSERT; FK users RESTRICT: o userId fica depois da anonimização.",
        indexes = {"user_id, document, accepted_at"})
public record PolicyAcceptance(
        @Attr("identificador") UUID id,
        @Attr(value = "titular", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr("documento aceito") PolicyDocumentKind document,
        @Attr(value = "versão aceita", len = 20) String version,
        @Attr("momento do aceite") Instant acceptedAt,
        @Attr(value = "IP", opt = true, len = 45) String ip,
        @Attr(value = "user agent", opt = true, len = 512) String userAgent,
        @Attr("canal") AcceptanceChannel channel,
        @Attr(value = "correlação", opt = true, len = 64) String correlationId) {
}
