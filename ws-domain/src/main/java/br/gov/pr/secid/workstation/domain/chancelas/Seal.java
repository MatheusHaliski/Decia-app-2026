package br.gov.pr.secid.workstation.domain.chancelas;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Chancela (= FAI Seal) — TAXONOMIA §6.1 (RF39; lida em RF20, RF21, RF28, RF40, RF45). Emitida por EMPRESA ou CHEFE. */
@DomainEntity(context = "9 Chancelas & Vínculos", table = "seals", rfs = {"RF39", "RF20", "RF21", "RF28", "RF40", "RF45"}, migration = 18, versioned = true,
        doc = "Chancelas (catálogo do emissor → RESTRICT). Política vigente em seal_policies.",
        indexes = {"issuer_user_id, status", "company_id, status", "department_id"},
        checks = {"usage_count >= 0"})
public record Seal(
        @Attr("identificador") UUID id,
        @Attr(value = "emissor", ref = "users", onDelete = OnDelete.RESTRICT) UUID issuerUserId,
        @Attr("tipo do emissor") IssuerKind issuerKind,
        @Attr(value = "empresa", ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento (emissor CHEFE)", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "nome", len = 120) String name,
        @Attr("nível") SealTier tier,
        @Attr(value = "estado", def = "'ATIVA'") SealStatus status,
        @Attr(value = "arte do lacre (forma, cor, fita)", opt = true) String artJson,
        @Attr(value = "ícone", opt = true, len = 500) String iconUrl,
        @Attr("excelência (fita vermelha)") boolean excellence,
        @Attr(value = "ciclo: de", opt = true) Instant availableFrom,
        @Attr(value = "ciclo: até", opt = true) Instant availableUntil,
        @Attr(value = "limite de concessões no ciclo", opt = true) Integer usageLimit,
        @Attr("concessões feitas") int usageCount,
        @Attr("emissão automática (política AUTO)") boolean autoIssued,
        @Attr(value = "política vigente", opt = true, ref = "seal_policies", onDelete = OnDelete.SET_NULL) UUID policyId,
        @Attr("exige recertificação") boolean recertificationRequired,
        @Attr(value = "descrição", opt = true, sql = "TEXT") String description) {

    public boolean hasQuota() {
        return usageLimit == null || usageCount < usageLimit;
    }
}
