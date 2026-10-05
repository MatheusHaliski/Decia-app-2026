package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Faixa de Hype (RF45.CA07) — TAXONOMIA §9.9: Iniciante · Contribuinte · Referência · Líder de prática · Lenda do departamento. */
@DomainEntity(context = "8 Gamificação", table = "hype_bands", rfs = {"RF45"}, migration = 17,
        doc = "Faixas por empresa (catálogo → RESTRICT). Nomes configuráveis.",
        indexes = {"company_id, min_score"}, checks = {"min_score <= max_score"})
public record HypeBand(
        @Attr("identificador") UUID id,
        @Attr(value = "empresa (nulo = padrão)", opt = true, ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "código estável", len = 40) String code,
        @Attr(value = "mínimo", col = "min_score", sql = "SMALLINT UNSIGNED") int min,
        @Attr(value = "máximo", col = "max_score", sql = "SMALLINT UNSIGNED") int max,
        @Attr(value = "nome exibido", len = 80) String name) {
}
