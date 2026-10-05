package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.AiQuestionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code ai_questions} (RF8, RF16, RF33, RF42). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface AiQuestionRepository extends JpaRepository<AiQuestionEntity, UUID> {
}
