package br.gov.pr.secid.workstation.domain.rastro;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;
import java.util.UUID;

/** Aresta do Rastro de Decisão (RF29) — TAXONOMIA §5.15; imutável; exportável PDF/JSON (RF29.CA07). */
@DomainEntity(context = "6 Rastro de Decisão", table = "decision_trace_edges", rfs = {"RF29", "RF22", "RF41"}, migration = 15, audit = Audit.NONE,
        store = Store.MYSQL_CASSANDRA,
        doc = "Arestas do rastro (imutáveis). RESTRICT nos nós.",
        uniques = {"from_node_id, to_node_id, relation"}, indexes = {"to_node_id"})
public record DecisionTraceEdge(
        @Attr("identificador") UUID id,
        @Attr(value = "nó de origem", ref = "decision_trace_nodes", onDelete = OnDelete.RESTRICT) UUID fromNodeId,
        @Attr(value = "nó de destino", ref = "decision_trace_nodes", onDelete = OnDelete.RESTRICT) UUID toNodeId,
        @Attr("relação") TraceRelation relation,
        @Attr("momento") Instant at) {
}
