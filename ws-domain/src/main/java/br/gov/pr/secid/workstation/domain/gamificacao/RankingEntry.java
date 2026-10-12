package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.math.BigDecimal;
import java.util.UUID;

/** Posição em ranking (RF43; cache Redis; opt-out RF43.CA05; revisão art. 20) — TAXONOMIA §9.12. */
@DomainEntity(context = "8 Gamificação", table = "ranking_entries", rfs = {"RF43", "RF19", "RF28", "RF3"}, migration = 17, audit = Audit.CREATED,
        store = Store.MYSQL_REDIS,
        doc = "Rankings materializados por período (dono → CASCADE). Único (scope, scope_id, period, dimension, user).",
        uniques = {"scope, scope_id, period_key, dimension, user_id"}, indexes = {"scope, scope_id, period_key, dimension, position"})
public record RankingEntry(
        @Attr("identificador") UUID id,
        @Attr("escopo") RankingScope scope,
        @Attr("id do departamento/empresa") UUID scopeId,
        @Attr(value = "período (AAAA-MM)", sql = "CHAR(7)") String periodKey,
        @Attr("dimensão") RankingDimension dimension,
        @Attr(value = "pessoa", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr(value = "valor", sql = "DECIMAL(12,4)") BigDecimal value,
        @Attr("posição") int position,
        @Attr(value = "explicação (fórmula e fontes)", opt = true) String explanationJson) {
}
