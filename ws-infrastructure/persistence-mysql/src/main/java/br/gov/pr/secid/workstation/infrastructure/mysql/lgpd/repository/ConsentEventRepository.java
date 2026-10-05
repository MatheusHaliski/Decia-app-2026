package br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.entity.ConsentEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code consent_events} (RF3, RF18). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ConsentEventRepository extends JpaRepository<ConsentEventEntity, UUID> {
}
