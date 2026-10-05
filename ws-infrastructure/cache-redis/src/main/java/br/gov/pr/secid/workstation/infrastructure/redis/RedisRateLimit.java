package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.identity.RateLimitPort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * {@link RateLimitPort} no Redis (D-14, RF2.CA08): a reserva é um só script Lua (INCR + EXPIRE quando a chave nasce
 * ou perdeu o TTL) — atômica entre instâncias da API; o {@code release} é GET e DECR só se > 0, também em Lua, para
 * nunca ficar negativo nem recriar a chave sem expiração. Chaves {@code rate:<balde>:<dono>} com TTL sempre explícito.
 */
public class RedisRateLimit implements RateLimitPort {
    static final RedisScript<Long> ACQUIRE = RedisScript.of("""
            local v = redis.call('INCR', KEYS[1])
            if v == 1 or redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
            return v
            """, Long.class);
    static final RedisScript<Long> RELEASE = RedisScript.of("""
            local v = tonumber(redis.call('GET', KEYS[1]) or '0')
            if v > 0 then return redis.call('DECR', KEYS[1]) end
            return 0
            """, Long.class);

    private final StringRedisTemplate redis;

    public RedisRateLimit(StringRedisTemplate redis) {
        this.redis = redis;
    }

    static String key(UUID owner, String bucket) {
        return "rate:" + bucket + ":" + owner;
    }

    @Override
    public boolean tryAcquire(UUID owner, String bucket, int limit, Duration window) {
        Long count = redis.execute(ACQUIRE, List.of(key(owner, bucket)), String.valueOf(Math.max(1, window.toSeconds())));
        return count != null && count <= limit;
    }

    @Override
    public QuotaStatus status(UUID owner, String bucket, int limit, Duration window) {
        String key = key(owner, bucket);
        String raw = redis.opsForValue().get(key);
        long used = raw == null ? 0 : Long.parseLong(raw);
        Long ttl = redis.getExpire(key, TimeUnit.SECONDS);
        Instant reset = ttl == null || ttl < 0 ? Instant.now().plus(window) : Instant.now().plusSeconds(ttl);
        return new QuotaStatus(limit, used, reset);
    }

    @Override
    public void reset(UUID owner, String bucket) {
        redis.delete(key(owner, bucket));
    }

    @Override
    public void release(UUID owner, String bucket) {
        redis.execute(RELEASE, List.of(key(owner, bucket)));
    }
}
