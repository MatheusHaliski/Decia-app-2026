package br.gov.pr.secid.workstation.infrastructure.mysql.social.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.AnnouncementEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code announcements} (RF15, RF27). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface AnnouncementRepository extends JpaRepository<AnnouncementEntity, UUID> {
}
