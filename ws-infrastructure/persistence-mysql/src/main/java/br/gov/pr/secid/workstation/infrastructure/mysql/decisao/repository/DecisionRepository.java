package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decisions} (RF29, RF12, RF15, RF31, RF33, RF43). Gerado pelo SchemaGenerator;
 * consultas específicas entram por RF.
 */
public interface DecisionRepository extends JpaRepository<DecisionEntity, UUID> {
}
