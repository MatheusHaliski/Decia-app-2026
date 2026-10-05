package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Classificação de mensagem pela IA (RF7) — TAXONOMIA §5.4; corrigível por humano; alvo de revisão art. 20
 * (DsrTarget CLASSIFICACAO_IA).
 */
@DomainEntity(context = "5 DECIA sessão", table = "message_classifications", rfs = {"RF7", "RF8", "RF11", "RF29", "RF42"}, migration = 14,
        audit = Audit.CREATED,
        doc = "Rótulo, confiança e evidência por mensagem. Filho da sessão → CASCADE; vínculos a tarefa/projeto SET NULL.",
        indexes = {"session_id, label", "message_id"})
public record MessageClassification(
        @Attr("identificador") UUID id,
        @Attr("mensagem (TIMEUUID no Cassandra)") UUID messageId,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.CASCADE) UUID sessionId,
        @Attr("rótulo") MessageClass label,
        @Attr(value = "confiança 0–1", sql = "DECIMAL(4,3)") BigDecimal confidence,
        @Attr("cita tarefa/fonte (RF42 argumento com evidência)") boolean hasEvidence,
        @Attr(value = "referências de evidência", opt = true) String evidenceRefsJson,
        @Attr(value = "tarefa citada (RF29)", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID linkedTaskId,
        @Attr(value = "projeto citado", opt = true, ref = "project_schemes", onDelete = OnDelete.SET_NULL) UUID linkedProjectId,
        @Attr(value = "justificativa da IA", opt = true, len = 1000) String rationale,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "humano que confirmou/corrigiu", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID confirmedByUserId,
        @Attr("momento") Instant at) {
}
