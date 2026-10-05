package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.MessageAttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code message_attachments} (RF29, RF42, RF6). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface MessageAttachmentRepository extends JpaRepository<MessageAttachmentEntity, UUID> {
}
