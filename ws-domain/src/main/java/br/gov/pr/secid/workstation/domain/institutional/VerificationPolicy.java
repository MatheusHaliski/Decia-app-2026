package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;

import java.time.Instant;
import java.util.UUID;

/** Política versionada de validação de perfil (= FAI IssuerVerificationPolicy) — TAXONOMIA §1.9 (RF28 §8, D-19). */
@DomainEntity(context = "1 Identidade & Acesso", table = "verification_policies", rfs = {"RF28", "RF1"}, migration = 10,
        doc = "Política de validação (critérios, motivos, prazos). O ApprovalRequest congela policyVersion; uma VIGENTE por profileType.",
        uniques = {"profile_type, version"})
public record VerificationPolicy(
        @Attr("identificador") UUID id,
        @Attr(value = "versão (ex.: 1.0)", len = 20) String version,
        @Attr("perfil a que se aplica") ProfileType profileType,
        @Attr("critérios [{code, mandatory, howChecked}]") String criteriaJson,
        @Attr("catálogo de motivos de recusa/ajustes") String reasonsJson,
        @Attr(value = "máximo de envios", def = "5") int maxSubmissions,
        @Attr(value = "prazo da análise em dias úteis (Q-71)", def = "3") int slaBusinessDays,
        @Attr(value = "prazo do reenvio em dias úteis", def = "2") int resubmitSlaBusinessDays,
        @Attr(value = "dias para responder AJUSTES", def = "30") int adjustmentsReplyDays,
        @Attr(value = "domínios de e-mail gratuitos que não provam representação", opt = true) String freeMailDomainsJson,
        @Attr(value = "início da vigência", opt = true) Instant validFrom,
        @Attr(value = "situação", def = "'RASCUNHO'") PolicyStatus status) {
}
