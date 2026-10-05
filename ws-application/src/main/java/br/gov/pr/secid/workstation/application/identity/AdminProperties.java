package br.gov.pr.secid.workstation.application.identity;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code ws.admin.*} ({@code WS_ADMIN_BOOTSTRAP_ENABLED}, {@code WS_ADMIN_EMAIL}, {@code WS_ADMIN_USERNAME},
 * {@code WS_ADMIN_INITIAL_PASSWORD}, {@code WS_ADMIN_PROMOTE_EXISTING}). A senha nunca tem valor padrão e nunca é logada.
 */
@ConfigurationProperties(prefix = "ws.admin")
public record AdminProperties(boolean bootstrapEnabled, String email, String username, String initialPassword, boolean promoteExisting) {

    public AdminProperties {
        email = email == null ? "" : email.trim();
        username = username == null || username.isBlank() ? "admin" : username.trim();
        initialPassword = initialPassword == null ? "" : initialPassword;
    }

    @Override
    public String toString() {
        return "AdminProperties{bootstrapEnabled=" + bootstrapEnabled + ", username=" + username + ", promoteExisting=" + promoteExisting + "}";
    }
}
