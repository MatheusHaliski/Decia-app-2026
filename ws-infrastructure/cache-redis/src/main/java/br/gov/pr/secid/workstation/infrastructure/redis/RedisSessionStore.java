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
 * Famílias de refresh token no Redis (RF2.CA04/CA05, D-30/D-32; Q-85 resolvida): {@code sess:tok:<hash>} é um HASH com os
 * campos do {@link RefreshRecord} (instantes em epoch-ms para o Lua e em ISO-8601 exato nos campos {@code *Iso};
 * {@code revokedAt} ausente = vivo); {@code sess:fam:<família>} é o SET dos hashes da família (histórico, usado só para
 * revogar); {@code sess:fam:<família>:meta} é o HASH O(1) da família — {@code current} (hash do token vigente),
 * {@code expiresAt} (máximo dos tokens) e {@code revokedAt} (<b>tombstone</b>); {@code sess:user:<pessoa>} é o SET das
 * famílias. TTL de cada chave = expiração + 1 dia de graça, para o token rotacionado continuar existindo e o reuso ser
 * detectado. {@link #save} e {@link #consume} são scripts Lua: o sucessor de uma família com tombstone é recusado
 * ({@link FamilyRevokedException}) e só uma requisição com o mesmo token vê {@code ROTATED}. {@link #familyActive} lê só o
 * meta (1 round-trip) — é o que o {@code SessionActiveFilter} chama em toda requisição autenticada.
 */
public class RedisSessionStore implements SessionStorePort {
    static final Duration GRACE = Duration.ofDays(1);
    /** KEYS: token, família; ARGV: agora (ms), ISO do agora. A chave do meta deriva do campo family (mesmo nó fora de cluster, Q-91). */
    static final RedisScript<String> CONSUME = RedisScript.of("""
            local r = redis.call('HMGET', KEYS[1], 'revokedAt', 'expiresAt', 'family')
            if not r[2] then return 'UNKNOWN' end
            if r[1] then return 'REUSED' end
            if r[3] and redis.call('HEXISTS', 'sess:fam:' .. r[3] .. ':meta', 'revokedAt') == 1 then return 'REUSED' end
            if tonumber(r[2]) <= tonumber(ARGV[1]) then return 'EXPIRED' end
            redis.call('HSET', KEYS[1], 'revokedAt', ARGV[1], 'revokedAtIso', ARGV[2])
            return 'ROTATED'
            """, String.class);
    /** KEYS: token, SET da família, meta da família, SET da pessoa; ARGV: hash, expiresAt ms, ttl s, família, pares campo/valor… */
    static final RedisScript<Long> SAVE = RedisScript.of("""
            if redis.call('HEXISTS', KEYS[3], 'revokedAt') == 1 then return 0 end
            for i = 5, #ARGV, 2 do redis.call('HSET', KEYS[1], ARGV[i], ARGV[i + 1]) end
            redis.call('EXPIRE', KEYS[1], ARGV[3])
            redis.call('SADD', KEYS[2], ARGV[1])
            redis.call('HSET', KEYS[3], 'current', ARGV[1])
            local e = redis.call('HGET', KEYS[3], 'expiresAt')
            if (not e) or tonumber(e) < tonumber(ARGV[2]) then redis.call('HSET', KEYS[3], 'expiresAt', ARGV[2]) end
            redis.call('SADD', KEYS[4], ARGV[4])
            for _, k in ipairs({KEYS[2], KEYS[3], KEYS[4]}) do
              if redis.call('TTL', k) < tonumber(ARGV[3]) then redis.call('EXPIRE', k, ARGV[3]) end
            end
            return 1
            """, Long.class);
    /** KEYS: meta da família; ARGV: agora (ms). 1 round-trip: tombstone ou expiração da família → inativa. */
    static final RedisScript<Long> FAMILY_ACTIVE = RedisScript.of("""
            local m = redis.call('HMGET', KEYS[1], 'revokedAt', 'expiresAt')
            if not m[2] then return 0 end
            if m[1] then return 0 end
            if tonumber(m[2]) <= tonumber(ARGV[1]) then return 0 end
            return 1
            """, Long.class);

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

    static String metaKey(UUID family) {
        return "sess:fam:" + family + ":meta";
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
        List<String> argv = new ArrayList<>(List.of(r.tokenHash(), String.valueOf(r.expiresAt().toEpochMilli()),
                String.valueOf(ttl.toSeconds()), r.familyId().toString()));
        fields.forEach((k, v) -> {
            argv.add(k);
            argv.add(v);
        });
        Long saved = redis.execute(SAVE, List.of(tokenKey(r.tokenHash()), familyKey(r.familyId()), metaKey(r.familyId()), userKey(r.userId())),
                argv.toArray());
        if (saved == null || saved == 0L) {
            throw new FamilyRevokedException(r.familyId());
        }
    }

    @Override
    public Optional<RefreshRecord> find(String tokenHash) {
        Map<Object, Object> h = redis.opsForHash().entries(tokenKey(tokenHash));
        if (h == null || h.isEmpty()) {
            return Optional.empty();
        }
        RefreshRecord r = toRecord(tokenHash, h);
        if (r.revokedAt() == null) {
            Instant tombstone = tombstone(r.familyId());
            if (tombstone != null) {
                return Optional.of(r.revoked(tombstone));
            }
        }
        return Optional.of(r);
    }

    /** Instante da revogação da família (tombstone) ou {@code null}. */
    Instant tombstone(UUID familyId) {
        List<Object> m = redis.opsForHash().multiGet(metaKey(familyId), List.of("revokedAtIso", "revokedAt"));
        if (m == null || m.size() < 2) {
            return null;
        }
        if (m.get(0) != null) {
            return Instant.parse(m.get(0).toString());
        }
        return m.get(1) == null ? null : Instant.ofEpochMilli(Long.parseLong(m.get(1).toString()));
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
        String out = redis.execute(CONSUME, List.of(tokenKey(tokenHash)), String.valueOf(now.toEpochMilli()), now.toString());
        return out == null ? Consume.UNKNOWN : Consume.valueOf(out);
    }

    /** Tombstone primeiro (bloqueia qualquer sucessor em voo), depois os membros conhecidos. */
    @Override
    public void revokeFamily(UUID familyId, Instant at) {
        String meta = metaKey(familyId);
        if (Boolean.TRUE.equals(redis.opsForHash().putIfAbsent(meta, "revokedAt", String.valueOf(at.toEpochMilli())))) {
            redis.opsForHash().put(meta, "revokedAtIso", at.toString());
            Long ttl = redis.getExpire(meta);
            if (ttl == null || ttl < 0) {
                redis.expire(meta, GRACE);
            }
        }
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

    /** O(1): só o meta da família — nunca percorre o histórico de rotações (achado P1 do Codex). */
    @Override
    public boolean familyActive(UUID familyId, Instant now) {
        Long active = redis.execute(FAMILY_ACTIVE, List.of(metaKey(familyId)), String.valueOf(now.toEpochMilli()));
        return active != null && active == 1L;
    }

    /** Só o token vigente da família (meta.current): a lista de sessões não escala com o histórico. */
    private Optional<RefreshRecord> currentOfFamily(UUID familyId, Instant now) {
        if (!familyActive(familyId, now)) {
            return Optional.empty();
        }
        Object current = redis.opsForHash().get(metaKey(familyId), "current");
        return current == null ? Optional.empty() : find(current.toString()).filter(r -> r.active(now));
    }

    @Override
    public List<RefreshRecord> activeOfUser(UUID userId, Instant now) {
        Set<String> families = redis.opsForSet().members(userKey(userId));
        List<RefreshRecord> out = new ArrayList<>();
        if (families == null) {
            return out;
        }
        for (String f : families) {
            currentOfFamily(UUID.fromString(f), now).ifPresent(out::add);
        }
        return out;
    }
}
