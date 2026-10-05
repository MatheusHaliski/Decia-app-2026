package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.FinalDecisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code final_decisions} (RF12, RF14, RF15, RF29, RF42). Gerado pelo SchemaGenerator;
 * consultas específicas entram por RF.
 */
public interface FinalDecisionRepository extends JpaRepository<FinalDecisionEntity, UUID> {
}
