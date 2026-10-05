package br.gov.pr.secid.workstation.application.identity;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** D-32: tombstone da família recusa sucessor, esconde tokens vivos e vence até o maior expiresAt + graça. */
class InMemorySessionStoreTest {
    final InMemorySessionStore store = new InMemorySessionStore();
    final UUID user = UUID.randomUUID();

    private RefreshRecord record(UUID family, Duration ttl) {
        Instant now = Instant.now();
        return new RefreshRecord("h-" + UUID.randomUUID(), family, user, now, now.plus(ttl), null, null, false, null);
    }

    @Test
    void tombstoneRecusaSucessorEDesativaAFamilia() {
        UUID fam = UUID.randomUUID();
        RefreshRecord first = record(fam, Duration.ofDays(1));
        store.save(first);
        assertThat(store.consume(first.tokenHash(), Instant.now())).isEqualTo(SessionStorePort.Consume.ROTATED);
        store.revokeFamily(fam, Instant.now());
        RefreshRecord successor = new RefreshRecord("h-next", fam, user, Instant.now(), Instant.now().plus(Duration.ofDays(1)), null,
                first.tokenHash(), false, null);
        assertThatThrownBy(() -> store.save(successor)).isInstanceOf(SessionStorePort.FamilyRevokedException.class);
        assertThat(store.familyActive(fam, Instant.now())).isFalse();
        assertThat(store.activeOfUser(user, Instant.now())).isEmpty();
        assertThat(store.consume(first.tokenHash(), Instant.now())).isEqualTo(SessionStorePort.Consume.REUSED);
        assertThat(store.find("h-next")).as("nada do sucessor fica vivo").matches(o -> o.isEmpty() || o.get().revokedAt() != null);
        // outra família da mesma pessoa não é afetada
        RefreshRecord other = record(UUID.randomUUID(), Duration.ofDays(1));
        store.save(other);
        assertThat(store.familyActive(other.familyId(), Instant.now())).isTrue();
        assertThat(store.activeOfUser(user, Instant.now())).containsExactly(other);
    }

    @Test
    void tokenVivoDeFamiliaComTombstoneApareceRevogadoEOTombstoneVenceDepoisDaGraca() {
        UUID fam = UUID.randomUUID();
        RefreshRecord r = record(fam, Duration.ofMinutes(1));
        store.save(r);
        store.revokeFamily(fam, Instant.now());
        assertThat(store.find(r.tokenHash()).orElseThrow().revokedAt()).isNotNull();
        store.sweep(Instant.now().plus(Duration.ofMinutes(1)).plus(InMemorySessionStore.TOMBSTONE_GRACE).plusSeconds(1));
        assertThat(store.familyActive(fam, Instant.now())).as("token já revogado individualmente").isFalse();
        UUID unknown = UUID.randomUUID();
        store.revokeFamily(unknown, Instant.now());
        assertThatThrownBy(() -> store.save(record(unknown, Duration.ofDays(1)))).isInstanceOf(SessionStorePort.FamilyRevokedException.class);
    }
}
