package br.gov.pr.secid.workstation.domain.identity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    /** Busca por hash do e-mail normalizado (nunca pelo e-mail em claro: só o hash existe no banco). */
    Optional<User> findByEmailHash(String emailHash);

    Optional<User> findByUsernameIgnoreCase(String username);
}
