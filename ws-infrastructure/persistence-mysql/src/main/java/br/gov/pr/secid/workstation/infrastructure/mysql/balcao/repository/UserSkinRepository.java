package br.gov.pr.secid.workstation.infrastructure.mysql.balcao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.balcao.entity.UserSkinEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code user_skins} (RF38, RF42). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface UserSkinRepository extends JpaRepository<UserSkinEntity, UUID> {
}
