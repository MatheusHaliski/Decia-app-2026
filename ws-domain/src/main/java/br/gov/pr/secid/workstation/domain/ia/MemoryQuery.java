package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Consulta feita à Memória Institucional (RF33) — TAXONOMIA §10.12. */
@DomainEntity(context = "10 IA do sistema", table = "memory_queries", rfs = {"RF33", "RF27"}, migration = 21, audit = Audit.NONE,
        doc = "Histórico de buscas (dono → CASCADE).",
        indexes = {"user_id, at"})
public record MemoryQuery(
        @Attr("identificador") UUID id,
        @Attr(value = "quem buscou", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr(value = "texto da busca", len = 1000) String queryText,
        @Attr(value = "filtros", opt = true) String filtersJson,
        @Attr(value = "resultados (ids e scores)", opt = true) String resultsJson,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr("momento") Instant at) {
}
