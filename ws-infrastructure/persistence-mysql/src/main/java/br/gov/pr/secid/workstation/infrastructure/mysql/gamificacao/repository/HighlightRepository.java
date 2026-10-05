package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.HighlightEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code highlights} (RF35, RF27, RF39). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface HighlightRepository extends JpaRepository<HighlightEntity, UUID> {
}
