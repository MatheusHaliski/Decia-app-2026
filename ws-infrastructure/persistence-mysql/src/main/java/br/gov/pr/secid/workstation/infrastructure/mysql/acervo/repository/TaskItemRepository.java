package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.TaskItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code tasks} (RF20, RF41, RF21, RF22, RF23, RF29, RF34, RF40, RF44). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface TaskItemRepository extends JpaRepository<TaskItemEntity, UUID> {
}
