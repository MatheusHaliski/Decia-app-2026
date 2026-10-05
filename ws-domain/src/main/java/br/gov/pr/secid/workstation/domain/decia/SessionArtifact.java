package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;

import java.time.Instant;
import java.util.UUID;

/**
 * Artefato gerado pela IA (RF13) — TAXONOMIA §5.14 unida ao {@code GeneratedArtifact} do README RF13 (origem, instrução,
 * alinhamento a metas, classificação, status, substituição; Q-125). Convertível em tarefa (RF29); indexado na Memória (RF33).
 */
@DomainEntity(context = "5 DECIA sessão", table = "session_artifacts", rfs = {"RF13", "RF29", "RF33"}, migration = 14, store = Store.MYSQL_S3,
        doc = "Artefatos (relatório, ata, checklist…). session_id opcional (origem pode ser esquema/aba/feed); solicitante RESTRICT.",
        indexes = {"session_id, kind", "requested_by, generated_at", "status"})
public record SessionArtifact(
        @Attr("identificador") UUID id,
        @Attr(value = "sessão (quando a origem é o chat DECIA)", opt = true, ref = "decia_sessions", onDelete = OnDelete.CASCADE) UUID sessionId,
        @Attr("de onde foi pedido") ArtifactOrigin originType,
        @Attr(value = "id da origem (tarefa, projeto, mensagem…)", opt = true) UUID originId,
        @Attr(value = "quem pediu", ref = "users", onDelete = OnDelete.RESTRICT) UUID requestedBy,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr("tipo") ArtifactKind kind,
        @Attr(value = "título", len = 200) String title,
        @Attr(value = "instrução dada à IA", opt = true, sql = "TEXT") String instruction,
        @Attr(value = "conteúdo em Markdown", opt = true, sql = "MEDIUMTEXT") String contentMd,
        @Attr(value = "arquivo gerado (PDF/planilha)", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID mediaObjectId,
        @Attr(value = "alinhamento às metas", opt = true) String goalAlignmentJson,
        @Attr(value = "citações (RF33)", opt = true) String citationsJson,
        @Attr(value = "visibilidade", def = "'DEPARTAMENTO'") Visibility visibility,
        @Attr(value = "classificação de acesso herdada", def = "'INTERNO'") AccessClassification accessClass,
        @Attr(value = "estado", def = "'SOLICITADO'") ArtifactStatus status,
        @Attr(value = "gerado em", opt = true) Instant generatedAt,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "participantes notificados em", opt = true) Instant notifiedAt,
        @Attr(value = "tarefa criada a partir dele (RF29)", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID convertedTaskId,
        @Attr(value = "artefato que este substitui", opt = true, ref = "session_artifacts", onDelete = OnDelete.SET_NULL) UUID supersedesArtifactId,
        @Attr(value = "correlação", opt = true, len = 64) String correlationId) {
}
