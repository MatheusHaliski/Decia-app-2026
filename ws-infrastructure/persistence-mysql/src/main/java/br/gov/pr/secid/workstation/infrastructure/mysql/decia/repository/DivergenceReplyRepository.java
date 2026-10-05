package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.DivergenceReplyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code divergence_replies} (RF10, RF42). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface DivergenceReplyRepository extends JpaRepository<DivergenceReplyEntity, UUID> {
}
