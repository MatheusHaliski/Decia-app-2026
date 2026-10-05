package br.gov.pr.secid.workstation.application.ratelimit;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * {@link RateLimitPort} em memória (fallback sem Redis): um {@link ConcurrentHashMap} de janelas fixas, atualizado
 * com {@code compute} — a reserva é atômica dentro da JVM, o que basta para uma instância só. Para não crescer sem
 * limite sob ataque distribuído, há um teto de baldes ({@value #DEFAULT_MAX_ENTRIES}); ao atingi-lo, uma varredura
 * remove as janelas vencidas e, se ainda não houver espaço, o pedido é recusado (falha fechada).
 */
public final class InMemoryRateLimit implements RateLimitPort {
    public static final int DEFAULT_MAX_ENTRIES = 100_000;

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicLong sweeps = new AtomicLong();
    private final Clock clock;
    private final int maxEntries;

    public InMemoryRateLimit() {
        this(Clock.systemUTC(), DEFAULT_MAX_ENTRIES);
    }

    public InMemoryRateLimit(Clock clock, int maxEntries) {
        if (maxEntries < 1) {
            throw new IllegalArgumentException("maxEntries deve ser positivo");
        }
        this.clock = clock;
        this.maxEntries = maxEntries;
    }

    /** Janela fixa: abre no primeiro pedido e vence em {@code resetAt}; {@code used} conta toda tentativa, inclusive recusadas. */
    private record Window(long used, Instant resetAt) {
        boolean expired(Instant now) {
            return !now.isBefore(resetAt);
        }
    }

    @Override
    public boolean tryAcquire(String owner, String bucket, int limit, Duration window) {
        requirePositive(limit, window);
        String key = RateLimitPort.key(owner, bucket);
        Instant now = clock.instant();
        if (!windows.containsKey(key) && windows.size() >= maxEntries) {
            sweep(now);
            if (windows.size() >= maxEntries) {
                return false;    // falha fechada: sem espaço para um balde novo, a tentativa é recusada
            }
        }
        Window w = windows.compute(key, (k, current) ->
                current == null || current.expired(now)
                        ? new Window(1, now.plus(window))
                        : new Window(current.used + 1, current.resetAt));
        return w.used <= limit;
    }

    @Override
    public QuotaStatus status(String owner, String bucket, int limit, Duration window) {
        requirePositive(limit, window);
        Window w = windows.get(RateLimitPort.key(owner, bucket));
        if (w == null || w.expired(clock.instant())) {
            return QuotaStatus.empty(limit);
        }
        return new QuotaStatus(limit, w.used, w.resetAt);
    }

    @Override
    public void reset(String owner, String bucket) {
        windows.remove(RateLimitPort.key(owner, bucket));
    }

    @Override
    public void release(String owner, String bucket) {
        Instant now = clock.instant();
        windows.computeIfPresent(RateLimitPort.key(owner, bucket), (k, current) -> {
            if (current.expired(now) || current.used <= 1) {
                return null;                     // último pedido devolvido (ou janela vencida): o balde some
            }
            return new Window(current.used - 1, current.resetAt);
        });
    }

    /** Quantos baldes existem agora (inclui vencidos ainda não varridos). */
    public int size() {
        return windows.size();
    }

    /** Quantas varreduras já rodaram (observabilidade em teste). */
    public long sweeps() {
        return sweeps.get();
    }

    private void sweep(Instant now) {
        sweeps.incrementAndGet();
        windows.entrySet().removeIf(e -> e.getValue().expired(now));
    }

    private static void requirePositive(int limit, Duration window) {
        if (limit < 1 || window == null || window.isZero() || window.isNegative()) {
            throw new IllegalArgumentException("limit e window devem ser positivos");
        }
    }
}
