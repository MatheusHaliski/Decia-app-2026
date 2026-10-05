package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.util.UUID;

/** Post-it da Mesa (RF21.CA04/CA07, proposta do README RF21): ATIVA ⇄ FIXADA (chefe) → REMOVIDA (active=false). */
@DomainEntity(context = "3 Criador de Projetos", table = "desk_notes", rfs = {"RF21", "RF22"}, migration = 12,
        doc = "Notas da Mesa pessoal (scope_id = user_id) ou da equipe (scope_id = department_id). Autor → CASCADE.",
        indexes = {"desk_scope, scope_id, active"})
public record DeskNote(
        @Attr("identificador") UUID id,
        @Attr("escopo da Mesa") DeskScope deskScope,
        @Attr("userId ou departmentId conforme o escopo") UUID scopeId,
        @Attr(value = "autor", ref = "users", onDelete = OnDelete.CASCADE) UUID authorId,
        @Attr(value = "conteúdo em Markdown", sql = "TEXT") String contentMd,
        @Attr(value = "cor (token)", opt = true, len = 40) String color,
        @Attr(value = "x", sql = "DECIMAL(10,3)", def = "0") BigDecimal canvasX,
        @Attr(value = "y", sql = "DECIMAL(10,3)", def = "0") BigDecimal canvasY,
        @Attr(value = "escala", sql = "DECIMAL(6,3)", def = "1") BigDecimal canvasScale,
        @Attr(value = "rotação", sql = "DECIMAL(6,2)", def = "0") BigDecimal canvasRotation,
        @Attr("camada") int canvasLayer,
        @Attr("fixada pelo chefe") boolean pinned,
        @Attr(value = "ativa", def = "TRUE") boolean active) {
}
