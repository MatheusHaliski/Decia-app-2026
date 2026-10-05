package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;

import java.util.Optional;
import java.util.UUID;

/** Acesso às contas ({@code users}); adaptador JPA em persistence-mysql, fake em memória nos testes. */
public interface UserRepositoryPort {
    Optional<User> findById(UUID id);

    Optional<User> findByUsername(String normalizedUsername);

    Optional<User> findByEmailHash(String emailHash);

    Optional<User> findByOidc(String issuer, String subject);

    boolean existsByUsername(String normalizedUsername);

    boolean existsByEmailHash(String emailHash);

    long countByRole(Role role);

    User save(User user);
}
