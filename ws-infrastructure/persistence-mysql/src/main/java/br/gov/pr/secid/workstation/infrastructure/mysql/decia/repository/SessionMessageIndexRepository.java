package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.SessionMessageIndexEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code session_messages_idx} (RF6, RF7, RF17, RF18, RF42). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface SessionMessageIndexRepository extends JpaRepository<SessionMessageIndexEntity, UUID> {
}
