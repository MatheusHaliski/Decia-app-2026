package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/**
 * Evidência com natureza explícita (G4) e fonte preservada (§4.2). Nunca é apagada: é substituída ({@code supersededAt}) e deixa de contar
 * na força da evidência (§6.5).
 */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_evidence", rfs = {"RF29", "RF33", "RF41"}, migration = 22,
        doc = "Evidências (filho da decisão → CASCADE); quem adicionou RESTRICT; arquivo, tarefa e inferência de IA SET NULL (a fonte textual fica).",
        indexes = {"decision_id, superseded_at", "added_by_user_id", "task_id"})
public record DecisionEvidence(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr("natureza (G4)") EvidenceNature nature,
        @Attr("tipo de fonte") EvidenceKind kind,
        @Attr(value = "título", len = 200) String title,
        @Attr(value = "resumo", sql = "TEXT") String summary,
        @Attr(value = "fonte (rótulo)", len = 300) String sourceLabel,
        @Attr(value = "URL da fonte", opt = true, len = 2048) String sourceUrl,
        @Attr(value = "arquivo", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID mediaId,
        @Attr(value = "tarefa de origem", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID taskId,
        @Attr(value = "autor da fonte", opt = true, len = 200) String authorLabel,
        @Attr(value = "observada em", opt = true) Instant observedAt,
        @Attr(value = "obtida em", opt = true) Instant retrievedAt,
        @Attr("qualidade da fonte") SourceQuality sourceQuality,
        @Attr("relevância") RelevanceLevel relevance,
        @Attr("confiabilidade") RelevanceLevel reliability,
        @Attr(value = "origem", def = "'HUMANO'") ContentOrigin origin,
        @Attr(value = "inferência de IA", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "adicionada por", ref = "users", onDelete = OnDelete.RESTRICT) UUID addedByUserId,
        @Attr(value = "substituída em", opt = true) Instant supersededAt) {

    public boolean isCurrent() {
        return supersededAt == null;
    }

    /** Substitui (nunca apaga) a evidência. */
    public DecisionEvidence supersede(Instant at) {
        if (supersededAt != null) {
            throw DecisionRules.invalid("evidência já substituída");
        }
        return new DecisionEvidence(id, decisionId, nature, kind, title, summary, sourceLabel, sourceUrl, mediaId, taskId, authorLabel, observedAt,
                retrievedAt, sourceQuality, relevance, reliability, origin, aiInferenceId, addedByUserId, at);
    }
}
