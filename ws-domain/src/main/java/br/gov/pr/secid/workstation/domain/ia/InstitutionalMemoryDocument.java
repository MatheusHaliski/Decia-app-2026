package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.Store;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;

import java.time.Instant;
import java.util.UUID;

/** Documento da Memória Institucional — OpenSearch índice {@code ws-memory} (RF33) — TAXONOMIA §10.10; embeddings dense_vector. */
@DomainEntity(context = "10 IA do sistema", table = "ws-memory", rfs = {"RF33", "RF8", "RF11", "RF16", "RF27", "RF30"}, store = Store.OPENSEARCH,
        audit = Audit.NONE,
        doc = "OpenSearch: texto + embedding; filtros por empresa, departamento, categoria, exercício, visibilidade e classificação.")
public record InstitutionalMemoryDocument(
        @Attr("id do documento") UUID docId,
        @Attr("tipo da fonte") MemorySourceType sourceType,
        @Attr("id da fonte") UUID sourceId,
        @Attr(value = "empresa", opt = true) UUID companyId,
        @Attr(value = "departamento", opt = true) UUID departmentId,
        @Attr(value = "categoria", opt = true, len = 80) String category,
        @Attr(value = "exercício", opt = true) Integer exerciseYear,
        @Attr(value = "autor", opt = true) UUID authorId,
        @Attr(value = "título", len = 300) String title,
        @Attr(value = "texto", sql = "TEXT") String text,
        @Attr(value = "embedding (dense_vector)", opt = true, sql = "DENSE_VECTOR") String embedding,
        @Attr("visibilidade") Visibility visibility,
        @Attr("classificação de acesso") AccessClassification accessClass,
        @Attr("indexado em") Instant indexedAt) {
}
