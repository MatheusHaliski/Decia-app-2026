package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionWorkLinkEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_work_links} (RF29, RF21, RF41). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface DecisionWorkLinkRepository extends JpaRepository<DecisionWorkLinkEntity, UUID> {
}
