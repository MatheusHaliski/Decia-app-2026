package br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.entity.DataSubjectRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code data_subject_requests} (RF3, RF18, RF43, RF44, RF45). Gerado pelo SchemaGenerator;
 * consultas específicas entram por RF.
 */
public interface DataSubjectRequestRepository extends JpaRepository<DataSubjectRequestEntity, UUID> {
}
