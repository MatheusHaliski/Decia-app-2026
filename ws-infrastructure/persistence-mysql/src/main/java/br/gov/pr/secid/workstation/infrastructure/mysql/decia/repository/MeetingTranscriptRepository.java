package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.MeetingTranscriptEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code meeting_transcripts} (RF37). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface MeetingTranscriptRepository extends JpaRepository<MeetingTranscriptEntity, UUID> {
}
