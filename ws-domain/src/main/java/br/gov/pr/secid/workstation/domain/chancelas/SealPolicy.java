package br.gov.pr.secid.workstation.domain.chancelas;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Política estruturada de concessão (RF39.CA02) — TAXONOMIA §6.2; versionada por chancela. */
@DomainEntity(context = "9 Chancelas & Vínculos", table = "seal_policies", rfs = {"RF39"}, migration = 18,
        doc = "Políticas de concessão por chancela (filho → CASCADE). Critérios [{criterion, threshold}].",
        uniques = {"seal_id, version"})
public record SealPolicy(
        @Attr("identificador") UUID id,
        @Attr(value = "chancela", ref = "seals", onDelete = OnDelete.CASCADE) UUID sealId,
        @Attr(value = "modo", def = "'REVISAO'") PolicyMode mode,
        @Attr("critérios [{criterion, threshold}]") String criteriaJson,
        @Attr(value = "recertificar a cada N dias", opt = true) Integer recertifyEveryDays,
        @Attr("versão") int version,
        @Attr("vigente de") Instant validFrom) {
}
