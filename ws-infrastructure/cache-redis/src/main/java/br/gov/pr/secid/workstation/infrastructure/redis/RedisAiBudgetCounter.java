package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.ai.AiBudgetCounterPort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.Duration;
import java.util.List;

/**
 * {@link AiBudgetCounterPort} no Redis (D-68): {@code tryAdd} é um script Lua (GET, compara com o limite, INCRBY, EXPIRE quando a
 * chave nasce ou perdeu o TTL) — atômico entre réplicas; {@code add} ajusta sem limite e nunca deixa negativo. Chaves
 * {@code ai:budget:<escopo>:<id>:<dia>:<métrica>} sempre com TTL até a virada do dia.
 */
public class RedisAiBudgetCounter implements AiBudgetCounterPort {
    static final RedisScript<Long> TRY_ADD = RedisScript.of("""
            local cur = tonumber(redis.call('GET', KEYS[1]) or '0')
            local delta = tonumber(ARGV[1])
            if cur + delta > tonumber(ARGV[2]) then return 0 end
            redis.call('INCRBY', KEYS[1], delta)
            if redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
            return 1
            """, Long.class);
    static final RedisScript<Long> ADD = RedisScript.of("""
            local v = redis.call('INCRBY', KEYS[1], ARGV[1])
            if v < 0 then redis.call('SET', KEYS[1], '0', 'KEEPTTL') v = 0 end
            if redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
            return v
            """, Long.class);

    private final StringRedisTemplate redis;

    public RedisAiBudgetCounter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public boolean tryAdd(String key, long delta, long limit, Duration window) {
        Long ok = redis.execute(TRY_ADD, List.of(key), String.valueOf(delta), String.valueOf(limit), ttl(window));
        return ok != null && ok == 1L;
    }

    @Override
    public void add(String key, long delta, Duration window) {
        redis.execute(ADD, List.of(key), String.valueOf(delta), ttl(window));
    }

    @Override
    public long current(String key) {
        String raw = redis.opsForValue().get(key);
        return raw == null ? 0 : Math.max(0, Long.parseLong(raw));
    }

    private static String ttl(Duration window) {
        return String.valueOf(Math.max(1, window.toSeconds()));
    }
}
