package br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.entity.PolicyAcceptanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code policy_acceptances} (RF1, RF2, RF3, RF18). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface PolicyAcceptanceRepository extends JpaRepository<PolicyAcceptanceEntity, UUID> {
}
