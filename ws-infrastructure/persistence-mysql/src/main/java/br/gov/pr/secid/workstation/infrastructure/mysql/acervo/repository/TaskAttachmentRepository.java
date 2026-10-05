package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.TaskAttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code task_attachments} (RF20, RF41, RF34). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface TaskAttachmentRepository extends JpaRepository<TaskAttachmentEntity, UUID> {
}
