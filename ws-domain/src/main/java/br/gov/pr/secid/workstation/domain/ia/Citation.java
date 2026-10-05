package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.math.BigDecimal;
import java.util.UUID;

/** Citação embutida em perguntas, resumos e decisões (RF33.CA03) — TAXONOMIA §10.11; lista vazia = "Sem precedente". */
@DomainEntity(context = "10 IA do sistema", rfs = {"RF33", "RF8", "RF11", "RF12"}, store = Store.CODE, audit = Audit.NONE,
        doc = "Valor embutido em *citationsJson*.")
public record Citation(
        @Attr("tipo da fonte") MemorySourceType sourceType,
        @Attr("id da fonte") UUID sourceId,
        @Attr(value = "trecho", len = 1000) String excerpt,
        @Attr(value = "URL interna", opt = true, len = 500) String url,
        @Attr(value = "score de similaridade", sql = "DECIMAL(5,4)") BigDecimal score) {
}
