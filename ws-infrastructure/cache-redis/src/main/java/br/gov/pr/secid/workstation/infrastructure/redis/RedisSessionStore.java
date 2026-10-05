package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.SessionStorePort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Famílias de refresh token no Redis (RF2.CA04/CA05, D-30; Q-85 resolvida): {@code sess:tok:<hash>} é um HASH com os
 * campos do {@link RefreshRecord} (instantes em epoch-ms para o Lua e em ISO-8601 exato nos campos {@code *Iso};
 * {@code revokedAt} ausente = vivo), {@code sess:fam:<família>} é
 * o SET dos hashes da família e {@code sess:user:<pessoa>} o SET das famílias. TTL de cada chave = expiração + 1 dia de
 * graça, para o token rotacionado continuar existindo e o reuso ser detectado. {@link #consume} é um script Lua: só uma
 * requisição com o mesmo token vê {@code ROTATED}.
 */
public class RedisSessionStore implements SessionStorePort {
    static final Duration GRACE = Duration.ofDays(1);
    static final RedisScript<String> CONSUME = RedisScript.of("""
            local r = redis.call('HMGET', KEYS[1], 'revokedAt', 'expiresAt')
            if not r[2] then return 'UNKNOWN' end
            if r[1] then return 'REUSED' end
            if tonumber(r[2]) <= tonumber(ARGV[1]) then return 'EXPIRED' end
            redis.call('HSET', KEYS[1], 'revokedAt', ARGV[1])
            return 'ROTATED'
            """, String.class);

    private final StringRedisTemplate redis;

    public RedisSessionStore(StringRedisTemplate redis) {
        this.redis = redis;
    }

    static String tokenKey(String hash) {
        return "sess:tok:" + hash;
    }

    static String familyKey(UUID family) {
        return "sess:fam:" + family;
    }

    static String userKey(UUID user) {
        return "sess:user:" + user;
    }

    @Override
    public void save(RefreshRecord r) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("family", r.familyId().toString());
        fields.put("user", r.userId().toString());
        // Dois formatos por instante: epoch-millis (o script Lua compara números) e ISO-8601 completo (*Iso), para a
        // leitura devolver exatamente o instante gravado — Instant.now() tem nanos em JVMs recentes e millis os perdiam.
        putInstant(fields, "createdAt", r.createdAt());
        putInstant(fields, "expiresAt", r.expiresAt());
        if (r.revokedAt() != null) {
            putInstant(fields, "revokedAt", r.revokedAt());
        }
        if (r.rotatedFromHash() != null) {
            fields.put("rotatedFrom", r.rotatedFromHash());
        }
        fields.put("persistent", String.valueOf(r.persistent()));
        if (r.deviceName() != null) {
            fields.put("device", r.deviceName());
        }
        Duration ttl = Duration.between(Instant.now(), r.expiresAt()).plus(GRACE);
        if (ttl.isNegative() || ttl.isZero()) {
            ttl = GRACE;
        }
        String key = tokenKey(r.tokenHash());
        redis.opsForHash().putAll(key, fields);
        redis.expire(key, ttl);
        redis.opsForSet().add(familyKey(r.familyId()), r.tokenHash());
        extend(familyKey(r.familyId()), ttl);
        redis.opsForSet().add(userKey(r.userId()), r.familyId().toString());
        extend(userKey(r.userId()), ttl);
    }

    private void extend(String key, Duration ttl) {
        Long current = redis.getExpire(key);
        if (current == null || current < 0 || current < ttl.toSeconds()) {
            redis.expire(key, ttl);
        }
    }

    @Override
    public Optional<RefreshRecord> find(String tokenHash) {
        Map<Object, Object> h = redis.opsForHash().entries(tokenKey(tokenHash));
        if (h == null || h.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(toRecord(tokenHash, h));
    }

    private static RefreshRecord toRecord(String hash, Map<Object, Object> h) {
        return new RefreshRecord(hash, UUID.fromString(str(h, "family")), UUID.fromString(str(h, "user")), instant(h, "createdAt"),
                instant(h, "expiresAt"), instant(h, "revokedAt"), str(h, "rotatedFrom"), Boolean.parseBoolean(str(h, "persistent")),
                str(h, "device"));
    }

    private static String str(Map<Object, Object> h, String field) {
        Object v = h.get(field);
        return v == null ? null : v.toString();
    }

    private static void putInstant(Map<String, String> fields, String field, Instant value) {
        fields.put(field, String.valueOf(value.toEpochMilli()));
        fields.put(field + "Iso", value.toString());
    }

    private static Instant instant(Map<Object, Object> h, String field) {
        String iso = str(h, field + "Iso");
        if (iso != null) {
            return Instant.parse(iso);
        }
        String v = str(h, field);
        return v == null ? null : Instant.ofEpochMilli(Long.parseLong(v));
    }

    @Override
    public void revoke(String tokenHash, Instant at) {
        if (Boolean.TRUE.equals(redis.hasKey(tokenKey(tokenHash)))) {
            if (Boolean.TRUE.equals(redis.opsForHash().putIfAbsent(tokenKey(tokenHash), "revokedAt", String.valueOf(at.toEpochMilli())))) {
                redis.opsForHash().put(tokenKey(tokenHash), "revokedAtIso", at.toString());
            }
        }
    }

    @Override
    public Consume consume(String tokenHash, Instant now) {
        String out = redis.execute(CONSUME, List.of(tokenKey(tokenHash)), String.valueOf(now.toEpochMilli()));
        return out == null ? Consume.UNKNOWN : Consume.valueOf(out);
    }

    @Override
    public void revokeFamily(UUID familyId, Instant at) {
        Set<String> hashes = redis.opsForSet().members(familyKey(familyId));
        if (hashes != null) {
            hashes.forEach(h -> revoke(h, at));
        }
    }

    @Override
    public int revokeAllOfUser(UUID userId, UUID keepFamily, Instant at) {
        Set<String> families = redis.opsForSet().members(userKey(userId));
        int count = 0;
        if (families == null) {
            return 0;
        }
        for (String f : families) {
            UUID family = UUID.fromString(f);
            if (family.equals(keepFamily)) {
                continue;
            }
            if (familyActive(family, at)) {
                count++;
            }
            revokeFamily(family, at);
        }
        return count;
    }

    @Override
    public boolean familyActive(UUID familyId, Instant now) {
        return !activeOfFamily(familyId, now).isEmpty();
    }

    private List<RefreshRecord> activeOfFamily(UUID familyId, Instant now) {
        Set<String> hashes = redis.opsForSet().members(familyKey(familyId));
        List<RefreshRecord> out = new ArrayList<>();
        if (hashes == null) {
            return out;
        }
        for (String h : hashes) {
            find(h).filter(r -> r.active(now)).ifPresent(out::add);
        }
        return out;
    }

    @Override
    public List<RefreshRecord> activeOfUser(UUID userId, Instant now) {
        Set<String> families = redis.opsForSet().members(userKey(userId));
        List<RefreshRecord> out = new ArrayList<>();
        if (families == null) {
            return out;
        }
        for (String f : families) {
            out.addAll(activeOfFamily(UUID.fromString(f), now));
        }
        return out;
    }
}
