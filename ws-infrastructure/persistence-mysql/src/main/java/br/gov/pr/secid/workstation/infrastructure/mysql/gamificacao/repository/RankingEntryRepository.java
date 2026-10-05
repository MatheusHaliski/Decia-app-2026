package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.RankingEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code ranking_entries} (RF43, RF19, RF28, RF3). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface RankingEntryRepository extends JpaRepository<RankingEntryEntity, UUID> {
}
