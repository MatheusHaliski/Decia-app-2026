package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.ReopenRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code reopen_requests} (RF14, RF29). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ReopenRequestRepository extends JpaRepository<ReopenRequestEntity, UUID> {
}
