package br.gov.pr.secid.workstation.domain.social;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.TargetType;

import java.time.Instant;
import java.util.UUID;

/** Comentário (RF26; por tarefa do projeto em RF22.CA05 com targetType PROJECT_TASK) — TAXONOMIA §8.2/§3.5. */
@DomainEntity(context = "7 Social & Descoberta", table = "comments", rfs = {"RF26", "RF22", "RF27"}, migration = 16,
        doc = "Comentários em alvo polimórfico, com respostas (parent SET NULL). Autor → CASCADE; moderador RESTRICT.",
        indexes = {"target_type, target_id, created_at", "author_id", "parent_comment_id"})
public record Comment(
        @Attr("identificador") UUID id,
        @Attr(value = "autor", ref = "users", onDelete = OnDelete.CASCADE) UUID authorId,
        @Attr("tipo do alvo") TargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr(value = "comentário pai", opt = true, ref = "comments", onDelete = OnDelete.SET_NULL) UUID parentCommentId,
        @Attr(value = "conteúdo em Markdown", sql = "TEXT") String contentMd,
        @Attr(value = "menções (@usuário)", opt = true) String mentionsJson,
        @Attr(value = "editado em", opt = true) Instant editedAt,
        @Attr(value = "removido por (autor/moderador)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID deletedBy,
        @Attr(value = "ativo", def = "TRUE") boolean active) {
}
