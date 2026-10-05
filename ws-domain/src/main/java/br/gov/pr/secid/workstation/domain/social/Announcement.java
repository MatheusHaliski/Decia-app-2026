package br.gov.pr.secid.workstation.domain.social;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Comunicado institucional da página da empresa (RF15.CA03/CA06, README RF15) — gera MuralEntry COMUNICADO e notifica seguidores. */
@DomainEntity(context = "7 Social & Descoberta", table = "announcements", rfs = {"RF15", "RF27"}, migration = 16, versioned = true,
        doc = "Comunicados da EMPRESA/CHEFE. Catálogos e autor RESTRICT (comunicação oficial).",
        indexes = {"company_id, status, published_at", "department_id"})
public record Announcement(
        @Attr("identificador") UUID id,
        @Attr(value = "empresa", ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento (quando o autor é chefe)", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "autor", ref = "users", onDelete = OnDelete.RESTRICT) UUID authorId,
        @Attr(value = "título", len = 200) String title,
        @Attr(value = "corpo em Markdown", sql = "MEDIUMTEXT") String bodyMd,
        @Attr(value = "anexos (ids de MediaObject)", opt = true) String attachmentsJson,
        @Attr(value = "visibilidade", def = "'EMPRESA'") AnnouncementVisibility visibility,
        @Attr("fixado no topo") boolean pinned,
        @Attr(value = "comentários habilitados", def = "TRUE") boolean commentsEnabled,
        @Attr(value = "estado", def = "'RASCUNHO'") AnnouncementStatus status,
        @Attr(value = "publicado em", opt = true) Instant publishedAt,
        @Attr(value = "arquivado em", opt = true) Instant archivedAt) {
}
