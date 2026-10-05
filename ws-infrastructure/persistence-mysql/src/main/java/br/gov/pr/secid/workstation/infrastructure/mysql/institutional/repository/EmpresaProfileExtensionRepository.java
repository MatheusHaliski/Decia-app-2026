package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.EmpresaProfileExtensionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code user_empresa_ext} (RF1, RF28). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface EmpresaProfileExtensionRepository extends JpaRepository<EmpresaProfileExtensionEntity, UUID> {
}
