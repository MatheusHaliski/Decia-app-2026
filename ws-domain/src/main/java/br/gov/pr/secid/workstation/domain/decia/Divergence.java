package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Divergência detectada (RF8) e respondida (RF10) — TAXONOMIA §5.6. */
@DomainEntity(context = "5 DECIA sessão", table = "divergences", rfs = {"RF8", "RF10", "RF11", "RF42"}, migration = 14,
        doc = "Divergências por sessão (filho → CASCADE). Resolução referencia a resposta (SET NULL).",
        indexes = {"session_id, status"})
public record Divergence(
        @Attr("identificador") UUID id,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.CASCADE) UUID sessionId,
        @Attr("mensagem de origem (TIMEUUID)") UUID originMessageId,
        @Attr("detectada pela IA") boolean detectedByAi,
        @Attr(value = "síntese", len = 1000) String summary,
        @Attr(value = "autores envolvidos", opt = true) String partiesJson,
        @Attr(value = "estado", def = "'ABERTA'") DivergenceStatus status,
        @Attr(value = "resposta que resolveu", opt = true, ref = "divergence_replies", onDelete = OnDelete.SET_NULL) UUID resolvedByReplyId,
        @Attr(value = "resolvida em", opt = true) Instant resolvedAt,
        @Attr(value = "participantes notificados em", opt = true) Instant notifiedAt,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId) {
}
