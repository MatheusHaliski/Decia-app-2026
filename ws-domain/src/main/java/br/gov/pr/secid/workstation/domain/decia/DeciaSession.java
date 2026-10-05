package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.AiMode;

import java.time.Instant;
import java.util.UUID;

/**
 * Sessão deliberativa DECIA — TAXONOMIA §5.1. Nasce em RF4/RF5/RF9; lida em RF6–RF17, RF29. Estado pela máquina
 * {@link SessionStatus}; mensagens em Cassandra com TTL configurável (D-05).
 */
@DomainEntity(context = "5 DECIA sessão", table = "decia_sessions", rfs = {"RF4", "RF5", "RF9", "RF6", "RF11", "RF12", "RF14", "RF15", "RF17", "RF29", "RF33"},
        migration = 14, versioned = true,
        doc = "Sessões DECIA. Admin/criador RESTRICT (trilha deliberativa); catálogos RESTRICT; projeto/eixo de origem SET NULL.",
        indexes = {"status, started_at", "company_id, status", "department_id, status", "admin_user_id", "linked_project_id"})
public record DeciaSession(
        @Attr("identificador") UUID id,
        @Attr(value = "tema", len = 300) String topic,
        @Attr(value = "descrição", opt = true, sql = "TEXT") String description,
        @Attr(value = "administrador da sessão (CHEFE ou ADMIN)", ref = "users", onDelete = OnDelete.RESTRICT) UUID adminUserId,
        @Attr(value = "quem pediu a abertura (RF5)", ref = "users", onDelete = OnDelete.RESTRICT) UUID createdByUserId,
        @Attr(value = "empresa", opt = true, ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "modo de acesso", def = "'FECHADA'") SessionAccess accessMode,
        @Attr(value = "estado", def = "'PROPOSTA'") SessionStatus status,
        @Attr(value = "modo de IA (RF43.CA06)", def = "'ECONOMIA'") AiMode aiMode,
        @Attr(value = "projeto de origem (RF29.CA01)", opt = true, ref = "project_schemes", onDelete = OnDelete.SET_NULL) UUID linkedProjectId,
        @Attr(value = "eixo do plano citado (RF24.CA07)", opt = true, ref = "plan_axes", onDelete = OnDelete.SET_NULL) UUID planAxisId,
        @Attr(value = "início", opt = true) Instant startedAt,
        @Attr(value = "encerramento", opt = true) Instant closedAt,
        @Attr(value = "arquivamento", opt = true) Instant archivedAt,
        @Attr("mensagens") int messageCount,
        @Attr("participantes") int participantCount,
        @Attr(value = "TTL das mensagens no Cassandra (dias)", def = "365") int messageTtlDays,
        @Attr(value = "histórico exportado (RF17)", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID archiveMediaId,
        @Attr("indexada na Memória Institucional (RF33.CA01)") boolean indexedInMemory) {

    public DeciaSession transition(SessionStatus to, Instant at) {
        SessionStatus next = status.transition(to);
        return new DeciaSession(id, topic, description, adminUserId, createdByUserId, companyId, departmentId, accessMode, next, aiMode,
                linkedProjectId, planAxisId, next == SessionStatus.ATIVA && startedAt == null ? at : startedAt,
                next == SessionStatus.ENCERRADA ? at : closedAt, next == SessionStatus.ARQUIVADA ? at : archivedAt,
                messageCount, participantCount, messageTtlDays, archiveMediaId, indexedInMemory);
    }
}
