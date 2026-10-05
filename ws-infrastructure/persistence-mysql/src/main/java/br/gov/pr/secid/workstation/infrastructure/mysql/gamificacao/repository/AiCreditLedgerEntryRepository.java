package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.AiCreditLedgerEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code ai_credit_ledger} (RF42, RF39, RF43). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface AiCreditLedgerEntryRepository extends JpaRepository<AiCreditLedgerEntryEntity, UUID> {
}
