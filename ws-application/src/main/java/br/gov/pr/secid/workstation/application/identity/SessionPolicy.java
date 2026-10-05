package br.gov.pr.secid.workstation.application.identity;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * TTLs da sessão (Q-30/D-25): refresh 30 d com "lembrar-me", 24 h sem; bloqueio por conta 5 falhas em 15 min.
 * O TTL do access token fica no {@code JwtTokenIssuer} ({@code ws.security.jwt.access-ttl-minutes}, 15; Q-49).
 */
@ConfigurationProperties(prefix = "ws.security.session")
public record SessionPolicy(Duration refreshTtl, Duration refreshShortTtl, int maxLoginFailures, Duration lockWindow) {

    public SessionPolicy {
        refreshTtl = refreshTtl == null ? Duration.ofDays(30) : refreshTtl;
        refreshShortTtl = refreshShortTtl == null ? Duration.ofHours(24) : refreshShortTtl;
        maxLoginFailures = maxLoginFailures <= 0 ? 5 : maxLoginFailures;
        lockWindow = lockWindow == null ? Duration.ofMinutes(15) : lockWindow;
    }

    public static SessionPolicy defaults() {
        return new SessionPolicy(null, null, 0, null);
    }

    public Duration refreshTtl(boolean persistent) {
        return persistent ? refreshTtl : refreshShortTtl;
    }
}
