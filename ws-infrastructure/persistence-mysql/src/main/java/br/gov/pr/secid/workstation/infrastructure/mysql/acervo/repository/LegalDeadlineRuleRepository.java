package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.LegalDeadlineRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code legal_deadline_rules} (RF20, RF44). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface LegalDeadlineRuleRepository extends JpaRepository<LegalDeadlineRuleEntity, UUID> {
}
