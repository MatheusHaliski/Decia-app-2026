package br.gov.pr.secid.workstation.domain.lgpd;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Pedido do titular (LGPD art. 18 e 20) — TAXONOMIA §1.14 (RF3; fila do encarregado RF18; revisão de HSE/ranking/Hype RF43–RF45). */
@DomainEntity(context = "1 Identidade & Acesso", table = "data_subject_requests", rfs = {"RF3", "RF18", "RF43", "RF44", "RF45"}, migration = 10,
        doc = "Direitos do titular. RESTRICT: registro legal que fica após anonimização. assigneeId = ADMIN/encarregado.",
        indexes = {"status, due_at", "user_id, opened_at"})
public record DataSubjectRequest(
        @Attr("identificador") UUID id,
        @Attr(value = "titular", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr("tipo do pedido") DsrKind kind,
        @Attr(value = "decisão automatizada alvo (só revisão)", opt = true) DsrTarget target,
        @Attr(value = "id do alvo (snapshot HSE, RankingEntry, MessageClassification)", opt = true) UUID targetId,
        @Attr(value = "descrição (≤ 2000)", opt = true, len = 2000) String description,
        @Attr(value = "estado", def = "'ABERTA'") DsrStatus status,
        @Attr("abertura") Instant openedAt,
        @Attr(value = "prazo (Q-71)", opt = true) Instant dueAt,
        @Attr(value = "responsável (ADMIN/encarregado)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID assigneeId,
        @Attr(value = "resposta em Markdown", opt = true, sql = "TEXT") String responseMd,
        @Attr(value = "data da resposta", opt = true) Instant respondedAt,
        @Attr(value = "correlação", opt = true, len = 64) String correlationId) {

    public DataSubjectRequest transition(DsrStatus to) {
        return new DataSubjectRequest(id, userId, kind, target, targetId, description, status.transition(to), openedAt, dueAt, assigneeId,
                responseMd, respondedAt, correlationId);
    }
}
