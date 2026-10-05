package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.RecognitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code recognitions} (RF35, RF28, RF19, RF39, RF42). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface RecognitionRepository extends JpaRepository<RecognitionEntity, UUID> {
}
