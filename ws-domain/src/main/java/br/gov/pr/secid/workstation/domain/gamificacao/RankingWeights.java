package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Pesos do ranking por empresa (RF43) — TAXONOMIA §9.13; critérios públicos. */
@DomainEntity(context = "8 Gamificação", table = "ranking_weights", rfs = {"RF43", "RF28"}, migration = 17,
        doc = "Pesos versionados (catálogo → RESTRICT; Company.rankingWeightsId aponta para o vigente).",
        uniques = {"company_id, version"})
public record RankingWeights(
        @Attr("identificador") UUID id,
        @Attr(value = "empresa (nulo = padrão)", opt = true, ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr("versão") int version,
        @Attr("pesos por dimensão") String weightsJson,
        @Attr(value = "texto público dos critérios", opt = true, sql = "TEXT") String criteriaPublicText,
        @Attr("vigente de") Instant validFrom,
        @Attr(value = "quem editou", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID editedBy) {
}
