package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.TeamDeskEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code team_desks} (RF21, RF22). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface TeamDeskRepository extends JpaRepository<TeamDeskEntity, UUID> {
}
