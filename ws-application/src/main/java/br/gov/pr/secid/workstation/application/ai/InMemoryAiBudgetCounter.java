package br.gov.pr.secid.workstation.application.ai;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Orçamento de IA em memória (uma instância; com várias réplicas use Redis — {@code ws.redis.enabled=true}). Atômico por chave
 * ({@code compute}); janelas vencidas são descartadas na próxima soma e numa varredura quando o mapa cresce.
 */
@Component
@ConditionalOnProperty(prefix = "ws.redis", name = "enabled", havingValue = "false", matchIfMissing = true)
public class InMemoryAiBudgetCounter implements AiBudgetCounterPort {
    static final int SWEEP_AT = 50_000;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final Clock clock;

    public InMemoryAiBudgetCounter(Clock clock) {
        this.clock = clock;
    }

    private record Window(long value, Instant expiresAt) {
    }

    @Override
    public boolean tryAdd(String key, long delta, long limit, Duration window) {
        Instant now = clock.instant();
        sweep(now);
        boolean[] ok = {false};
        windows.compute(key, (k, w) -> {
            Window cur = w == null || !now.isBefore(w.expiresAt()) ? new Window(0, now.plus(window)) : w;
            if (cur.value() + delta > limit) {
                return cur;
            }
            ok[0] = true;
            return new Window(cur.value() + delta, cur.expiresAt());
        });
        return ok[0];
    }

    @Override
    public void add(String key, long delta, Duration window) {
        Instant now = clock.instant();
        windows.compute(key, (k, w) -> {
            Window cur = w == null || !now.isBefore(w.expiresAt()) ? new Window(0, now.plus(window)) : w;
            return new Window(Math.max(0, cur.value() + delta), cur.expiresAt());
        });
    }

    @Override
    public long current(String key) {
        Window w = windows.get(key);
        return w == null || !clock.instant().isBefore(w.expiresAt()) ? 0 : w.value();
    }

    private void sweep(Instant now) {
        if (windows.size() >= SWEEP_AT) {
            windows.entrySet().removeIf(e -> !now.isBefore(e.getValue().expiresAt()));
        }
    }
}
