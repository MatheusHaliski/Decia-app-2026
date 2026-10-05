package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.DivergenceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code divergences} (RF8, RF10, RF11, RF42). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface DivergenceRepository extends JpaRepository<DivergenceEntity, UUID> {
}
