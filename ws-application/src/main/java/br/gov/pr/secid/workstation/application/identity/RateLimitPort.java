package br.gov.pr.secid.workstation.application.identity;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Contador de janela fixa por dono + balde (D-14, RF2.CA08/CA10): bloqueio por conta, limite por IP e por rota,
 * tentativas de código. Redis via Lua quando {@code ws.redis.enabled=true}; memória com teto no resto.
 *
 * <p>Padrão "reserva antes, devolve se deu certo": {@link #tryAcquire} conta a tentativa ANTES do trabalho caro
 * (hash de senha) de forma atômica — N pedidos em paralelo nunca passam do limite; {@link #release} devolve a unidade
 * quando a tentativa não era falha (senha certa) e nunca deixa o contador abaixo de zero.
 */
public interface RateLimitPort {

    /** Reserva uma unidade; {@code true} se ainda dentro do limite. Abre a janela se não existir. */
    boolean tryAcquire(UUID owner, String bucket, int limit, Duration window);

    /** Estado atual do balde, sem consumir. */
    QuotaStatus status(UUID owner, String bucket, int limit, Duration window);

    /** Zera o balde (login completo, redefinição de senha por e-mail). */
    default void reset(UUID owner, String bucket) {
    }

    /** Devolve uma unidade tomada por {@link #tryAcquire}; nunca abaixo de zero e nunca recria o balde. */
    default void release(UUID owner, String bucket) {
    }

    record QuotaStatus(int limit, long used, Instant resetAt) {
        public boolean exhausted() {
            return used >= limit;
        }

        /** Segundos até a janela zerar (≥ 1) — vai no header {@code Retry-After}. */
        public long retryAfterSeconds(Instant now) {
            return Math.max(1, Duration.between(now, resetAt).toSeconds());
        }
    }
}
