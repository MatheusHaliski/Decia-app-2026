package br.gov.pr.secid.workstation.domain.rastro;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;
import br.gov.pr.secid.workstation.domain.decia.MessageClass;

import java.time.Instant;
import java.util.UUID;

/**
 * Nó do Rastro de Decisão (RF29) — TAXONOMIA §5.15; grafo APPEND-ONLY em MySQL com espelho Cassandra {@code trace_by_entity};
 * lido em RF22, RF38, RF41, RF45.
 */
@DomainEntity(context = "6 Rastro de Decisão", table = "decision_trace_nodes", rfs = {"RF29", "RF22", "RF38", "RF41", "RF45"}, migration = 15,
        audit = Audit.NONE, store = Store.MYSQL_CASSANDRA,
        doc = "Nós do rastro (imutáveis, só INSERT). RESTRICT em sessão e ator: o rastro nunca cascateia.",
        indexes = {"session_id, at", "node_type, ref_id", "actor_id"})
public record DecisionTraceNode(
        @Attr("identificador") UUID id,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.RESTRICT) UUID sessionId,
        @Attr("tipo do nó") TraceNodeType nodeType,
        @Attr("id da entidade referenciada") UUID refId,
        @Attr(value = "rótulo", len = 300) String label,
        @Attr(value = "classe (cor do nó, RF38.CA07)", opt = true) MessageClass classLabel,
        @Attr(value = "ator (nulo = IA/sistema)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID actorId,
        @Attr("momento") Instant at,
        @Attr(value = "snapshot da entidade", opt = true) String snapshotJson) {
}
