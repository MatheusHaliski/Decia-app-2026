package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.HypeBandEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code hype_bands} (RF45). Gerado pelo SchemaGenerator; consultas específicas entram por RF.
 */
public interface HypeBandRepository extends JpaRepository<HypeBandEntity, UUID> {
}
