package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/**
 * Pesos do HSE por empresa (RF44.CA08) — TAXONOMIA §9.6: eficiência 20, eficácia 20, valor 15, pontualidade 15, qualidade 15,
 * impactoEquipe 10, foco 5.
 */
@DomainEntity(context = "8 Gamificação", table = "hse_weights", rfs = {"RF44", "RF43"}, migration = 17,
        doc = "Pesos versionados do HSE (catálogo → RESTRICT).",
        uniques = {"company_id, version"})
public record HseWeights(
        @Attr("identificador") UUID id,
        @Attr(value = "empresa (nulo = padrão)", opt = true, ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr("versão") int version,
        @Attr("pesos {eficiencia, eficacia, valor, pontualidade, qualidade, impactoEquipe, foco}") String weightsJson,
        @Attr("vigente de") Instant validFrom) {
}
