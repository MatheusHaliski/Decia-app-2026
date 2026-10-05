package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.ProfileHypeScoreEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code profile_hype_scores} (RF45, RF19, RF28, RF43, RF3). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ProfileHypeScoreRepository extends JpaRepository<ProfileHypeScoreEntity, UUID> {
}
