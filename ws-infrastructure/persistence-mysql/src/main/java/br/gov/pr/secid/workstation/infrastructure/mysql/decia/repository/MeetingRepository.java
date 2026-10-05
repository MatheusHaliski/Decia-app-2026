package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.MeetingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code meetings} (RF37, RF29, RF42). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface MeetingRepository extends JpaRepository<MeetingEntity, UUID> {
}
