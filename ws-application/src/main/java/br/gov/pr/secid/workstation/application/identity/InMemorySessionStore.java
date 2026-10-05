package br.gov.pr.secid.workstation.application.identity;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * {@link SessionStorePort} em memória (uma instância; sessões morrem no reinício). Com {@code ws.redis.enabled=true} o
 * {@code RedisSessionStore} (cache-redis) assume. O {@link #consume} é atômico pelo {@code compute} do ConcurrentHashMap.
 */
@Component
@ConditionalOnProperty(prefix = "ws.redis", name = "enabled", havingValue = "false", matchIfMissing = true)
public class InMemorySessionStore implements SessionStorePort {
    private final Map<String, RefreshRecord> byHash = new ConcurrentHashMap<>();

    @Override
    public void save(RefreshRecord record) {
        byHash.put(record.tokenHash(), record);
    }

    @Override
    public Optional<RefreshRecord> find(String tokenHash) {
        return Optional.ofNullable(byHash.get(tokenHash));
    }

    @Override
    public void revoke(String tokenHash, Instant at) {
        byHash.computeIfPresent(tokenHash, (k, r) -> r.revoked(at));
    }

    @Override
    public Consume consume(String tokenHash, Instant now) {
        Consume[] result = {Consume.UNKNOWN};
        byHash.computeIfPresent(tokenHash, (k, r) -> {
            if (r.revokedAt() != null) {
                result[0] = Consume.REUSED;
                return r;
            }
            if (!r.expiresAt().isAfter(now)) {
                result[0] = Consume.EXPIRED;
                return r;
            }
            result[0] = Consume.ROTATED;
            return r.revoked(now);
        });
        return result[0];
    }

    @Override
    public void revokeFamily(UUID familyId, Instant at) {
        byHash.replaceAll((k, r) -> r.familyId().equals(familyId) ? r.revoked(at) : r);
    }

    @Override
    public int revokeAllOfUser(UUID userId, UUID keepFamily, Instant at) {
        int[] count = {0};
        byHash.replaceAll((k, r) -> {
            if (r.userId().equals(userId) && !r.familyId().equals(keepFamily) && r.active(at)) {
                count[0]++;
                return r.revoked(at);
            }
            return r;
        });
        return count[0];
    }

    @Override
    public boolean familyActive(UUID familyId, Instant now) {
        return byHash.values().stream().anyMatch(r -> r.familyId().equals(familyId) && r.active(now));
    }

    @Override
    public List<RefreshRecord> activeOfUser(UUID userId, Instant now) {
        return byHash.values().stream().filter(r -> r.userId().equals(userId) && r.active(now)).toList();
    }
}
