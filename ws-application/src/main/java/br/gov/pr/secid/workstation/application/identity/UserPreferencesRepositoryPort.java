package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.domain.identity.UserPreferences;

import java.util.Optional;
import java.util.UUID;

/** {@code user_preferences} (1:1 com a conta). */
public interface UserPreferencesRepositoryPort {
    Optional<UserPreferences> findByUserId(UUID userId);

    UserPreferences save(UserPreferences preferences);
}
