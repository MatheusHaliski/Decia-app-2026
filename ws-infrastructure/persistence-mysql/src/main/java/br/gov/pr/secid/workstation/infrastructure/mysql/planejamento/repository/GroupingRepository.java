package br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.entity.GroupingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code groupings} (RF25, RF19, RF28, RF36). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface GroupingRepository extends JpaRepository<GroupingEntity, UUID> {
}
