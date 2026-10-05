package br.gov.pr.secid.workstation.infrastructure.mysql.social.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.FollowEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code follows} (RF27, RF14, RF15). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface FollowRepository extends JpaRepository<FollowEntity, UUID> {
}
