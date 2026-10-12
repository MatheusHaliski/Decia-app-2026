package br.gov.pr.secid.workstation.domain.mensageria;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/**
 * Atribuição de tarefa/projeto (RF46; RF10 chefe atribui; RF18/RF19 "atribuir"/"retornar") — TAXONOMIA §12b.4.
 * Só o destinatário responde (403); resposta repetida 409 ATRIBUICAO_JA_RESPONDIDA; recusar/devolver sem motivo
 * 422 MOTIVO_OBRIGATORIO.
 */
@DomainEntity(context = "12b Mensageria & Atribuição", table = "assignments", rfs = {"RF46", "RF10", "RF18", "RF19", "RF44"}, migration = 20, versioned = true,
        doc = "Atribuições (alvo polimórfico). Pessoas RESTRICT (trilha de responsabilidade); nó do rastro SET NULL.",
        indexes = {"to_user_id, status", "from_user_id, status", "target_type, target_id"})
public record Assignment(
        @Attr("identificador") UUID id,
        @Attr("tipo do alvo") AssignmentTargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr(value = "quem atribuiu", ref = "users", onDelete = OnDelete.RESTRICT) UUID fromUserId,
        @Attr(value = "destinatário", ref = "users", onDelete = OnDelete.RESTRICT) UUID toUserId,
        @Attr("origem") AssignmentOrigin origin,
        @Attr(value = "estado", def = "'PROPOSTA'") AssignmentStatus status,
        @Attr(value = "prazo", opt = true) Instant dueAt,
        @Attr(value = "mensagem", opt = true, len = 1000) String message,
        @Attr(value = "motivo (obrigatório em RECUSADA/DEVOLVIDA)", opt = true, len = 500) String reason,
        @Attr(value = "responsável anterior (restaurado ao devolver)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID previousResponsibleId,
        @Attr(value = "nó do rastro (origem CHAT_DECIA)", opt = true, ref = "decision_trace_nodes", onDelete = OnDelete.SET_NULL) UUID traceNodeId,
        @Attr(value = "respondida em", opt = true) Instant respondedAt) {

    /** Resposta do destinatário: valida quem responde, repetição e motivo obrigatório. */
    public Assignment respond(UUID responder, AssignmentStatus to, String why, Instant at) {
        if (!toUserId.equals(responder)) {
            throw new IllegalStateException("ACESSO_NEGADO: só o destinatário responde");
        }
        if (status != AssignmentStatus.PROPOSTA && to != AssignmentStatus.DEVOLVIDA) {
            throw new IllegalStateException("ATRIBUICAO_JA_RESPONDIDA");
        }
        AssignmentStatus next = status.transition(to);
        if (next.requiresReason() && (why == null || why.isBlank())) {
            throw new IllegalArgumentException("MOTIVO_OBRIGATORIO");
        }
        return new Assignment(id, targetType, targetId, fromUserId, toUserId, origin, next, dueAt, message, why, previousResponsibleId, traceNodeId, at);
    }
}
