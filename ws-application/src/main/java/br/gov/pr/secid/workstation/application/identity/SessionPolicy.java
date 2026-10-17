package br.gov.pr.secid.workstation.application.identity;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * TTLs da sessão (Q-30/D-25): refresh 30 d com "lembrar-me", 24 h sem; bloqueio por conta 5 falhas em 15 min.
 * O TTL do access token fica no {@code JwtTokenIssuer} ({@code ws.security.jwt.access-ttl-minutes}, 15; Q-49).
 */
@ConfigurationProperties(prefix = "ws.security.session")
public record SessionPolicy(Duration refreshTtl, Duration refreshShortTtl, int maxLoginFailures, Duration lockWindow, Duration reuseGraceWindow) {
    /** Teto da tolerância ao reuso (D-140): acima disso a janela deixa de ser "resposta perdida" e vira brecha. */
    public static final Duration MAX_REUSE_GRACE = Duration.ofSeconds(60);

    public SessionPolicy {
        refreshTtl = refreshTtl == null ? Duration.ofDays(30) : refreshTtl;
        refreshShortTtl = refreshShortTtl == null ? Duration.ofHours(24) : refreshShortTtl;
        maxLoginFailures = maxLoginFailures <= 0 ? 5 : maxLoginFailures;
        lockWindow = lockWindow == null ? Duration.ofMinutes(15) : lockWindow;
        reuseGraceWindow = reuseGraceWindow == null ? Duration.ofSeconds(15) : reuseGraceWindow;
        if (reuseGraceWindow.isNegative() || reuseGraceWindow.compareTo(MAX_REUSE_GRACE) > 0) {
            throw new IllegalArgumentException("ws.security.session.reuse-grace-window deve ficar entre 0 s e " + MAX_REUSE_GRACE.toSeconds() + " s");
        }
    }

    public static SessionPolicy defaults() {
        return new SessionPolicy(null, null, 0, null, null);
    }

    public Duration refreshTtl(boolean persistent) {
        return persistent ? refreshTtl : refreshShortTtl;
    }
}
