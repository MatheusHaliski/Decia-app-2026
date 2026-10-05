package br.gov.pr.secid.workstation.domain.plataforma;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.util.UUID;

/** Objeto de mídia — S3/MinIO + metadados em MySQL — TAXONOMIA §12.5; tabela do V2 (dono → CASCADE). */
@DomainEntity(context = "12 Plataforma", table = "media_objects", rfs = {"RF1", "RF3", "RF13", "RF17", "RF20", "RF38", "RF41"}, migration = 2,
        store = Store.MYSQL_S3, audit = Audit.CREATED,
        doc = "V2: metadados do binário; object_key único; access_class = classe de armazenamento (Q-79).")
public record MediaObject(
        @Attr("identificador") UUID id,
        @Attr(value = "dono", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr(value = "bucket", len = 63) String bucket,
        @Attr(value = "chave do objeto (única)", len = 512, unique = true) String objectKey,
        @Attr(value = "tipo MIME", len = 127) String mimeType,
        @Attr(value = "tamanho", sql = "BIGINT UNSIGNED") long sizeBytes,
        @Attr(value = "SHA-256", sql = "CHAR(64)") String sha256,
        @Attr(value = "classe de armazenamento", def = "'PRIVATE'") MediaAccessClass accessClass,
        @Attr(value = "variantes (thumb, preview)", opt = true) String variantsJson) {
}
