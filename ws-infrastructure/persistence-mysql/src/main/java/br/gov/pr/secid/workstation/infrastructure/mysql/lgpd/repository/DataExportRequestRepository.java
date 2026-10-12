package br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.entity.DataExportRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code data_export_requests} (RF3). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface DataExportRequestRepository extends JpaRepository<DataExportRequestEntity, UUID> {
}
