package br.gov.pr.secid.workstation.infrastructure.mysql.social.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code notifications} (RF27, RF8, RF13, RF15, RF39, RF42, RF46). Gerado pelo SchemaGenerator;
 * consultas específicas entram por RF.
 */
public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {
}
