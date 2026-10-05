package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.ratelimit.QuotaStatus;
import br.gov.pr.secid.workstation.application.ratelimit.RateLimitPort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * {@link RateLimitPort} no Redis (SEG RN49.03): a reserva é um único script Lua — {@code INCR} + {@code PEXPIRE} na
 * primeira reserva — logo é atômica entre instâncias da API; pedidos em paralelo nunca passam do limite juntos.
 * A janela é fixa (abre na primeira reserva, não é estendida por tentativa bloqueada); se por algum motivo a chave
 * ficar sem TTL, o script repõe o TTL para o balde nunca virar permanente. {@code release} é outro script:
 * {@code GET} e {@code DECR} só se maior que zero (nunca negativo).
 */
public class RedisRateLimit implements RateLimitPort {
    static final String PREFIX = "ws:rl:";

    static final String ACQUIRE_LUA = """
            local c = redis.call('INCR', KEYS[1])
            if c == 1 then
              redis.call('PEXPIRE', KEYS[1], ARGV[1])
            elseif redis.call('PTTL', KEYS[1]) < 0 then
              redis.call('PEXPIRE', KEYS[1], ARGV[1])
            end
            return c
            """;

    static final String RELEASE_LUA = """
            local c = tonumber(redis.call('GET', KEYS[1]) or '0')
            if c > 0 then
              return redis.call('DECR', KEYS[1])
            end
            return 0
            """;

    /** Devolve {usado, pttl} numa ida só, para o status ser consistente. */
    static final String STATUS_LUA = """
            local c = tonumber(redis.call('GET', KEYS[1]) or '0')
            local ttl = redis.call('PTTL', KEYS[1])
            return {c, ttl}
            """;

    private final StringRedisTemplate redis;
    private final Clock clock;
    private final RedisScript<Long> acquireLua = new DefaultRedisScript<>(ACQUIRE_LUA, Long.class);
    private final RedisScript<Long> releaseLua = new DefaultRedisScript<>(RELEASE_LUA, Long.class);
    @SuppressWarnings({"unchecked", "rawtypes"})
    private final RedisScript<List> statusLua = new DefaultRedisScript<>(STATUS_LUA, List.class);

    public RedisRateLimit(StringRedisTemplate redis) {
        this(redis, Clock.systemUTC());
    }

    public RedisRateLimit(StringRedisTemplate redis, Clock clock) {
        this.redis = redis;
        this.clock = clock;
    }

    static String redisKey(String owner, String bucket) {
        return PREFIX + RateLimitPort.key(owner, bucket);
    }

    @Override
    public boolean tryAcquire(String owner, String bucket, int limit, Duration window) {
        requirePositive(limit, window);
        Long used = redis.execute(acquireLua, List.of(redisKey(owner, bucket)), String.valueOf(window.toMillis()));
        return used != null && used <= limit;
    }

    @Override
    @SuppressWarnings("unchecked")
    public QuotaStatus status(String owner, String bucket, int limit, Duration window) {
        requirePositive(limit, window);
        List<Object> r = redis.execute(statusLua, List.of(redisKey(owner, bucket)));
        if (r == null || r.size() < 2) {
            return QuotaStatus.empty(limit);
        }
        long used = toLong(r.get(0));
        long pttl = toLong(r.get(1));
        if (used <= 0 || pttl < 0) {
            return QuotaStatus.empty(limit);
        }
        Instant resetAt = clock.instant().plusMillis(pttl);
        return new QuotaStatus(limit, used, resetAt);
    }

    @Override
    public void reset(String owner, String bucket) {
        redis.delete(redisKey(owner, bucket));
    }

    @Override
    public void release(String owner, String bucket) {
        redis.execute(releaseLua, List.of(redisKey(owner, bucket)));
    }

    private static long toLong(Object o) {
        if (o instanceof Number n) {
            return n.longValue();
        }
        return o == null ? 0 : Long.parseLong(o.toString());
    }

    private static void requirePositive(int limit, Duration window) {
        if (limit < 1 || window == null || window.isZero() || window.isNegative()) {
            throw new IllegalArgumentException("limit e window devem ser positivos");
        }
    }
}
