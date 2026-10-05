package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.DeskNoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code desk_notes} (RF21, RF22). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface DeskNoteRepository extends JpaRepository<DeskNoteEntity, UUID> {
}
