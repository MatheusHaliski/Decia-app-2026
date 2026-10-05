package br.gov.pr.secid.workstation.infrastructure.mysql.social.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.CommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code comments} (RF26, RF22, RF27). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface CommentRepository extends JpaRepository<CommentEntity, UUID> {
}
