package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/**
 * Trilha append-only da decisão (§8: toda escrita gera um evento com quem, o quê, quando e diff): auditoria, linha do tempo do card e
 * analytics (§9). {@code actorUserId} nulo = IA/sistema.
 */
@DomainEntity(context = "5b DECIA decisão estruturada", appendOnly = true,
        table = "decision_events", rfs = {"RF29", "RF43"}, migration = 22, audit = Audit.NONE,
        doc = "APPEND-ONLY. Decisão RESTRICT (histórico não se apaga) e ator RESTRICT (nulo = IA/sistema).",
        indexes = {"decision_id, at", "type, at", "actor_user_id, at", "correlation_id"})
public record DecisionEvent(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.RESTRICT) UUID decisionId,
        @Attr(value = "ator (nulo = IA/sistema)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID actorUserId,
        @Attr("tipo") DecisionEventType type,
        @Attr(value = "diff", opt = true) String payloadJson,
        @Attr("quando") Instant at,
        @Attr(value = "correlação", len = 64) String correlationId) {
}
