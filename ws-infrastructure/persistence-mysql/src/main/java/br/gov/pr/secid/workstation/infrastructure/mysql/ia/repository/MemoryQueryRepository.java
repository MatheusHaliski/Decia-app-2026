package br.gov.pr.secid.workstation.infrastructure.mysql.ia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity.MemoryQueryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code memory_queries} (RF33, RF27). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface MemoryQueryRepository extends JpaRepository<MemoryQueryEntity, UUID> {
}
