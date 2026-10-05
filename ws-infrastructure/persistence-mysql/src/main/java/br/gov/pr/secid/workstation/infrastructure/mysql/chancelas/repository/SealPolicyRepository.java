package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity.SealPolicyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code seal_policies} (RF39). Gerado pelo SchemaGenerator; consultas específicas entram por
 * RF.
 */
public interface SealPolicyRepository extends JpaRepository<SealPolicyEntity, UUID> {
}
