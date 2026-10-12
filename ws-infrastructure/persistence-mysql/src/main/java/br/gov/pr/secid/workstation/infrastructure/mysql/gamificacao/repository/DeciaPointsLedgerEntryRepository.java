package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.DeciaPointsLedgerEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decia_points_ledger} (RF42, RF19, RF35, RF39, RF40, RF43, RF45). Gerado pelo
 * SchemaGenerator; consultas específicas entram por RF.
 */
public interface DeciaPointsLedgerEntryRepository extends JpaRepository<DeciaPointsLedgerEntryEntity, UUID> {
}
