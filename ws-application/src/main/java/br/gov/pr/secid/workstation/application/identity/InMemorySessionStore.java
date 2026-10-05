package br.gov.pr.secid.workstation.application.identity;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * {@link SessionStorePort} em memória (uma instância; sessões morrem no reinício). Com {@code ws.redis.enabled=true} o
 * {@code RedisSessionStore} (cache-redis) assume. {@link #consume} é atômico pelo {@code compute} do ConcurrentHashMap e
 * {@link #revokeFamily} deixa um <b>tombstone</b> (D-32): depois dele nenhum token da família é salvo, encontrado vivo ou
 * considerado ativo — mesmo um sucessor cuja emissão já estava em voo quando o reuso foi detectado.
 */
@Component
@ConditionalOnProperty(prefix = "ws.redis", name = "enabled", havingValue = "false", matchIfMissing = true)
public class InMemorySessionStore implements SessionStorePort {
    static final Duration TOMBSTONE_GRACE = Duration.ofDays(1);

    private record Tombstone(Instant revokedAt, Instant expiresAt) {
    }

    private final Map<String, RefreshRecord> byHash = new ConcurrentHashMap<>();
    private final Map<UUID, Tombstone> revokedFamilies = new ConcurrentHashMap<>();

    @Override
    public void save(RefreshRecord record) {
        if (revokedFamilies.containsKey(record.familyId())) {
            throw new FamilyRevokedException(record.familyId());
        }
        byHash.put(record.tokenHash(), record);
        // janela entre o containsKey e o put: o tombstone que entrou nesse meio-tempo também derruba o que acabou de entrar
        Tombstone t = revokedFamilies.get(record.familyId());
        if (t != null) {
            byHash.computeIfPresent(record.tokenHash(), (k, r) -> r.revoked(t.revokedAt()));
            throw new FamilyRevokedException(record.familyId());
        }
    }

    @Override
    public Optional<RefreshRecord> find(String tokenHash) {
        return Optional.ofNullable(byHash.get(tokenHash)).map(this::withTombstone);
    }

    private RefreshRecord withTombstone(RefreshRecord r) {
        Tombstone t = revokedFamilies.get(r.familyId());
        return t == null ? r : r.revoked(t.revokedAt());
    }

    @Override
    public void revoke(String tokenHash, Instant at) {
        byHash.computeIfPresent(tokenHash, (k, r) -> r.revoked(at));
    }

    @Override
    public Consume consume(String tokenHash, Instant now) {
        Consume[] result = {Consume.UNKNOWN};
        byHash.computeIfPresent(tokenHash, (k, r) -> {
            if (r.revokedAt() != null || revokedFamilies.containsKey(r.familyId())) {
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
        sweep(at);
        Instant expires = byHash.values().stream().filter(r -> r.familyId().equals(familyId)).map(RefreshRecord::expiresAt)
                .max(Instant::compareTo).orElse(at).plus(TOMBSTONE_GRACE);
        revokedFamilies.putIfAbsent(familyId, new Tombstone(at, expires));
        byHash.replaceAll((k, r) -> r.familyId().equals(familyId) ? r.revoked(at) : r);
    }

    @Override
    public int revokeAllOfUser(UUID userId, UUID keepFamily, Instant at) {
        int[] count = {0};
        byHash.values().stream().filter(r -> r.userId().equals(userId) && !r.familyId().equals(keepFamily)).map(RefreshRecord::familyId)
                .distinct().toList().forEach(family -> {
                    if (familyActive(family, at)) {
                        count[0]++;
                    }
                    revokeFamily(family, at);
                });
        return count[0];
    }

    @Override
    public boolean familyActive(UUID familyId, Instant now) {
        if (revokedFamilies.containsKey(familyId)) {
            return false;
        }
        return byHash.values().stream().anyMatch(r -> r.familyId().equals(familyId) && r.active(now));
    }

    @Override
    public List<RefreshRecord> activeOfUser(UUID userId, Instant now) {
        return byHash.values().stream().filter(r -> r.userId().equals(userId) && !revokedFamilies.containsKey(r.familyId()) && r.active(now))
                .toList();
    }

    /** Tombstones vencidos saem (o token mais longo da família já expirou faz um dia). */
    void sweep(Instant now) {
        revokedFamilies.entrySet().removeIf(e -> !e.getValue().expiresAt().isAfter(now));
    }
}
