package br.gov.pr.secid.workstation.domain.lgpd;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Histórico de consentimento — APPEND-ONLY (RF3 bloco C; D-17) — TAXONOMIA §1.13. */
@DomainEntity(context = "1 Identidade & Acesso", table = "consent_events", rfs = {"RF3", "RF18"}, migration = 10, audit = Audit.NONE,
        doc = "Cada concessão/revogação. Só INSERT; FK users RESTRICT (sobrevive à anonimização junto com policy_acceptances).",
        indexes = {"user_id, purpose, at"})
public record ConsentEvent(
        @Attr("identificador") UUID id,
        @Attr(value = "titular", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr("finalidade") ConsentPurpose purpose,
        @Attr("ação") ConsentAction action,
        @Attr("momento") Instant at,
        @Attr(value = "IP", opt = true, len = 45) String ip,
        @Attr(value = "user agent", opt = true, len = 512) String userAgent,
        @Attr(value = "versão da Política vigente", opt = true, len = 20) String policyVersion,
        @Attr("canal") ConsentChannel channel,
        @Attr(value = "correlação", opt = true, len = 64) String correlationId) {
}
