package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.CuratorAppointmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code curator_appointments} (RF28, RF39). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface CuratorAppointmentRepository extends JpaRepository<CuratorAppointmentEntity, UUID> {
}
