package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.PointsDonationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code points_donations} (RF42). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface PointsDonationRepository extends JpaRepository<PointsDonationEntity, UUID> {
}
