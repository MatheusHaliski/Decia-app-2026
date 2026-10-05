package br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.entity.UserConsentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code user_consents} (RF3, RF37, RF43, RF18). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface UserConsentRepository extends JpaRepository<UserConsentEntity, UUID> {
}
