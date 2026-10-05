package br.gov.pr.secid.workstation.infrastructure.mysql.ia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity.AiQuotaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code ai_quotas} (RF43, RF42, RF18). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface AiQuotaRepository extends JpaRepository<AiQuotaEntity, UUID> {
}
