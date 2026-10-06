package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionEvidenceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_evidence} (RF29, RF33, RF41). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface DecisionEvidenceRepository extends JpaRepository<DecisionEvidenceEntity, UUID> {
}
