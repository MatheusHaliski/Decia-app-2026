package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.HypeIgnoredEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code hype_ignored_events} (RF45). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface HypeIgnoredEventRepository extends JpaRepository<HypeIgnoredEventEntity, UUID> {
}
