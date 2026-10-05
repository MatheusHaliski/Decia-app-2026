package br.gov.pr.secid.workstation.domain.lgpd;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Estado atual do consentimento por finalidade opcional (RF3 bloco C, RF37, RF43; D-17) — TAXONOMIA §1.12. Nunca nasce concedido. */
@DomainEntity(context = "1 Identidade & Acesso", table = "user_consents", rfs = {"RF3", "RF37", "RF43", "RF18"}, migration = 10,
        doc = "Consentimento vigente por (userId, purpose). Histórico em consent_events. RESTRICT: prova fica após anonimização (D-18).",
        uniques = {"user_id, purpose"})
public record UserConsent(
        @Attr("identificador") UUID id,
        @Attr(value = "titular", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr("finalidade") ConsentPurpose purpose,
        @Attr("concedido") boolean granted,
        @Attr(value = "concessão", opt = true) Instant grantedAt,
        @Attr(value = "revogação", opt = true) Instant revokedAt,
        @Attr(value = "versão da Política de Privacidade vigente no ato", opt = true, len = 20) String policyVersion,
        @Attr(value = "último evento", opt = true, ref = "consent_events", onDelete = OnDelete.SET_NULL) UUID lastEventId) {

    public UserConsent grant(Instant at, String version, UUID eventId) {
        return new UserConsent(id, userId, purpose, true, at, null, version, eventId);
    }

    public UserConsent revoke(Instant at, String version, UUID eventId) {
        return new UserConsent(id, userId, purpose, false, grantedAt, at, version, eventId);
    }
}
