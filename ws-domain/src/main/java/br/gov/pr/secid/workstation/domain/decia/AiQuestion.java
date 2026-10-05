package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Pergunta da IA em ponto crítico (RF8, RF16) — TAXONOMIA §5.8; cita a Memória (RF33.CA03). */
@DomainEntity(context = "5 DECIA sessão", table = "ai_questions", rfs = {"RF8", "RF16", "RF33", "RF42"}, migration = 14,
        doc = "Perguntas formuladas pela IA (filho da sessão → CASCADE).",
        indexes = {"session_id, status"})
public record AiQuestion(
        @Attr("identificador") UUID id,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.CASCADE) UUID sessionId,
        @Attr("tipo") AiQuestionKind kind,
        @Attr(value = "pergunta", sql = "TEXT") String questionText,
        @Attr(value = "mensagens que a motivaram", opt = true, col = "basis_message_ids_json") String basisMessageIds,
        @Attr(value = "estado", def = "'ABERTA'") AiQuestionStatus status,
        @Attr(value = "mensagem que respondeu (TIMEUUID)", opt = true) UUID answeredByMessageId,
        @Attr("respondida com evidência") boolean answeredWithEvidence,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "citações da Memória (RF33.CA03)", opt = true) String citationsJson) {
}
