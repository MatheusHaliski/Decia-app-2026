package br.gov.pr.secid.workstation.application.ratelimit;

import java.time.Duration;
import java.time.Instant;

/**
 * Fotografia de um balde do {@link RateLimitPort}: quantas reservas a janela corrente já tem, qual o limite e
 * quando a janela vence (base do header {@code Retry-After}).
 *
 * @param limit   reservas permitidas na janela
 * @param used    reservas já feitas (pode passar do limite: toda tentativa conta, mesmo bloqueada)
 * @param resetAt instante em que a janela vence; {@code null} quando o balde não existe (nunca usado ou já vencido)
 */
public record QuotaStatus(int limit, long used, Instant resetAt) {

    /** Balde vazio: nada usado, sem janela aberta. */
    public static QuotaStatus empty(int limit) {
        return new QuotaStatus(limit, 0, null);
    }

    public boolean exhausted() {
        return used >= limit;
    }

    /** Segundos até a janela vencer (mínimo 1 quando há janela aberta; 0 sem janela), para {@code Retry-After}. */
    public long retryAfterSeconds(Instant now) {
        if (resetAt == null) {
            return 0;
        }
        long seconds = Duration.between(now, resetAt).toSeconds();
        return Math.max(1, seconds);
    }
}
