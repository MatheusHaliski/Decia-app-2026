package br.gov.pr.secid.workstation.application.identity;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * {@link RateLimitPort} em memória (janela fixa): vale para uma instância; com {@code ws.redis.enabled=true} o
 * adaptador Redis assume. O mapa tem teto ({@value #DEFAULT_MAX_ENTRIES} baldes) e varre as janelas vencidas a cada
 * {@value #SWEEP_EVERY} operações — o limite por IP cria um balde por endereço e, sem teto, cada IP ficaria para sempre.
 * A reserva é atômica: {@code compute} do ConcurrentHashMap serializa os pedidos ao mesmo balde.
 */
@Component
@ConditionalOnProperty(prefix = "ws.redis", name = "enabled", havingValue = "false", matchIfMissing = true)
public class InMemoryRateLimit implements RateLimitPort {
    static final int DEFAULT_MAX_ENTRIES = 100_000;
    static final int SWEEP_EVERY = 1_000;

    private record Window(long count, Instant resetAt) {
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicInteger operations = new AtomicInteger();
    private final int maxEntries;
    private final Clock clock;

    public InMemoryRateLimit() {
        this(DEFAULT_MAX_ENTRIES, Clock.systemUTC());
    }

    public InMemoryRateLimit(int maxEntries, Clock clock) {
        this.maxEntries = Math.max(1, maxEntries);
        this.clock = clock;
    }

    private static String key(UUID owner, String bucket) {
        return bucket + ":" + owner;
    }

    @Override
    public boolean tryAcquire(UUID owner, String bucket, int limit, Duration window) {
        Instant now = clock.instant();
        String key = key(owner, bucket);
        if (!windows.containsKey(key)) {
            makeRoom(now);
        } else if (operations.incrementAndGet() % SWEEP_EVERY == 0) {
            sweep(now);
        }
        Window w = windows.compute(key, (k, old) -> old == null || !old.resetAt.isAfter(now)
                ? new Window(1, now.plus(window))
                : new Window(old.count + 1, old.resetAt));
        return w.count <= limit;
    }

    @Override
    public QuotaStatus status(UUID owner, String bucket, int limit, Duration window) {
        Instant now = clock.instant();
        Window w = windows.get(key(owner, bucket));
        if (w == null || !w.resetAt.isAfter(now)) {
            return new QuotaStatus(limit, 0, now.plus(window));
        }
        return new QuotaStatus(limit, w.count, w.resetAt);
    }

    @Override
    public void reset(UUID owner, String bucket) {
        windows.remove(key(owner, bucket));
    }

    @Override
    public void release(UUID owner, String bucket) {
        Instant now = clock.instant();
        windows.computeIfPresent(key(owner, bucket), (k, old) ->
                !old.resetAt.isAfter(now) ? null : new Window(Math.max(0, old.count - 1), old.resetAt));
    }

    /** Baldes vivos (visível para o teste do teto). */
    public int size() {
        return windows.size();
    }

    /** Antes de abrir um balde novo: varre vencidos e, se ainda estiver cheio, descarta os que vencem primeiro. */
    private void makeRoom(Instant now) {
        if (operations.incrementAndGet() % SWEEP_EVERY == 0 || windows.size() >= maxEntries) {
            sweep(now);
        }
        int excess = windows.size() - maxEntries + 1;
        if (excess > 0) {
            windows.entrySet().stream()
                    .sorted(Comparator.comparing(e -> e.getValue().resetAt()))
                    .limit(Math.max(excess, maxEntries / 10))
                    .map(Map.Entry::getKey)
                    .toList()
                    .forEach(windows::remove);
        }
    }

    void sweep(Instant now) {
        windows.entrySet().removeIf(e -> !e.getValue().resetAt().isAfter(now));
    }
}
