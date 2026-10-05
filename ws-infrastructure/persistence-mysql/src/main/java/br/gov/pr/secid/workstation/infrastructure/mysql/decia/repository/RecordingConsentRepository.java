package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.RecordingConsentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code recording_consents} (RF37, RF3). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface RecordingConsentRepository extends JpaRepository<RecordingConsentEntity, UUID> {
}
