package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScan;

import java.util.Optional;
import java.util.UUID;

/** Metadados de mídia ({@code media_objects}, V2) e quarentena ({@code media_scans}, V24). Adaptador JPA: {@code JpaMediaAdapters} (persistence-mysql). */
public interface MediaObjectRepositoryPort {

    Optional<MediaObject> findById(UUID id);

    /** Dedupe é por DONO (D-67): o mesmo SHA-256 de outra pessoa nunca é reaproveitado (não vaza "alguém já tem este arquivo"). */
    Optional<MediaObject> findByOwnerAndSha256(UUID ownerId, String sha256);

    MediaObject save(MediaObject media);

    Optional<MediaScan> findScan(UUID mediaId);

    MediaScan saveScan(MediaScan scan);

    /** Remove os metadados (a varredura vai junto por CASCADE); o binário é apagado pelo chamador no {@link MediaStoragePort}. */
    void delete(UUID id);
}
