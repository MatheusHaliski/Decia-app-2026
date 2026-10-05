package br.gov.pr.secid.workstation.application.identity;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** {@link SessionStorePort} em memória (uma instância; sessões morrem no reinício). Com Redis ligado, o adaptador Redis assume. */
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
