package br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.entity.MediaScanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repositório Spring Data de {@code media_scans} (RF20, RF34, RF38, RF41). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface MediaScanRepository extends JpaRepository<MediaScanEntity, UUID> {

    Optional<MediaScanEntity> findByMediaId(UUID mediaId);
}
