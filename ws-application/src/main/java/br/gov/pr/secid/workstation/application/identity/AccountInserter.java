package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * INSERT de {@code users} + {@code user_preferences} em transação PRÓPRIA ({@code REQUIRES_NEW}, D-31). Se a unicidade de
 * {@code email_hash}/{@code username} for violada por um cadastro concorrente, só ESTA transação é desfeita e a
 * {@code DataIntegrityViolationException} chega ao chamador com a transação dele intacta (não fica rollback-only).
 */
@Component
public class AccountInserter {
    private final UserRepositoryPort users;
    private final UserPreferencesRepositoryPort preferences;

    public AccountInserter(UserRepositoryPort users, UserPreferencesRepositoryPort preferences) {
        this.users = users;
        this.preferences = preferences;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public User insert(User user) {
        User saved = users.save(user);
        UserPreferences prefs = new UserPreferences();
        prefs.setUserId(saved.getId());
        preferences.save(prefs);
        return saved;
    }
}
