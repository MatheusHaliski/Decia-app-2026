package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import br.gov.pr.secid.workstation.domain.identity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByUsername(String username);

    Optional<UserEntity> findByEmailHash(String emailHash);

    Optional<UserEntity> findByOidcIssuerAndOidcSubject(String issuer, String subject);

    boolean existsByUsername(String username);

    boolean existsByEmailHash(String emailHash);

    long countByRole(Role role);
}
