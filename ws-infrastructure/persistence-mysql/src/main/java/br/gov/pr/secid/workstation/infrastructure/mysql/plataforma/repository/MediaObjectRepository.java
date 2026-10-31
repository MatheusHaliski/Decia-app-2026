package br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.entity.MediaObjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/** Repositório Spring Data de {@code media_objects} (V2). Dedupe por dono + SHA-256 (D-67). */
public interface MediaObjectRepository extends JpaRepository<MediaObjectEntity, UUID> {

    Optional<MediaObjectEntity> findFirstByOwnerIdAndSha256(UUID ownerId, String sha256);
}
