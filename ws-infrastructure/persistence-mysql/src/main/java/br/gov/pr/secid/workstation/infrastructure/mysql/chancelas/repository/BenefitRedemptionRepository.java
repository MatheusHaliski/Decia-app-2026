package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity.BenefitRedemptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code benefit_redemptions} (RF39, RF42, RF19). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface BenefitRedemptionRepository extends JpaRepository<BenefitRedemptionEntity, UUID> {
}
