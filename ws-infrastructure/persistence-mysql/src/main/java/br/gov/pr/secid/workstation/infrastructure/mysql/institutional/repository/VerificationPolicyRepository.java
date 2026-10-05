package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.VerificationPolicyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code verification_policies} (RF28, RF1). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface VerificationPolicyRepository extends JpaRepository<VerificationPolicyEntity, UUID> {
}
