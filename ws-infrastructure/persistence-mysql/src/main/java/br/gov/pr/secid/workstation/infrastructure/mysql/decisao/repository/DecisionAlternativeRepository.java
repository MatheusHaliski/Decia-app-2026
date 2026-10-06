package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionAlternativeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_alternatives} (RF29, RF11, RF31, RF43). Gerado pelo SchemaGenerator;
 * consultas específicas entram por RF.
 */
public interface DecisionAlternativeRepository extends JpaRepository<DecisionAlternativeEntity, UUID> {
}
