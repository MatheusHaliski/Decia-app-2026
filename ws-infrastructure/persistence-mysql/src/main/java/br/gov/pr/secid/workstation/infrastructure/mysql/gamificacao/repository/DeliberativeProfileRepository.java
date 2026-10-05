package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.DeliberativeProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code deliberative_profiles} (RF43, RF19, RF45). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface DeliberativeProfileRepository extends JpaRepository<DeliberativeProfileEntity, UUID> {
}
