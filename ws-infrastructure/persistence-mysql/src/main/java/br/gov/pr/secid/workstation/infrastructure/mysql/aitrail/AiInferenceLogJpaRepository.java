package br.gov.pr.secid.workstation.infrastructure.mysql.aitrail;

import org.springframework.data.repository.Repository;

import java.util.UUID;

/** Só insere (append-only): sem {@code delete}/{@code saveAll} expostos. */
public interface AiInferenceLogJpaRepository extends Repository<AiInferenceLogEntity, UUID> {
    AiInferenceLogEntity save(AiInferenceLogEntity entity);

    long count();
}
