package br.gov.pr.secid.workstation.application.identity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Famílias de refresh token (RF2.CA04/CA05): Redis quando {@code ws.redis.enabled=true}, memória no resto; o
 * {@code refresh_tokens} do MySQL é espelho ({@link RefreshTokenMirrorPort}). O {@code SessionActiveFilter} consulta
 * {@link #familyActive} a cada requisição autenticada.
 */
public interface SessionStorePort {
    void save(RefreshRecord record);

    Optional<RefreshRecord> find(String tokenHash);

    /** Marca um token como usado/rotacionado (a família continua viva pelo sucessor). */
    void revoke(String tokenHash, Instant at);

    /** Revoga a família inteira (logout, reuso detectado, troca de senha). */
    void revokeFamily(UUID familyId, Instant at);

    /** Revoga todas as famílias da pessoa, exceto {@code keepFamily} (pode ser null); devolve quantas encerrou. */
    int revokeAllOfUser(UUID userId, UUID keepFamily, Instant at);

    /** A família tem algum token vivo (não revogado e não expirado). */
    boolean familyActive(UUID familyId, Instant now);

    /** Famílias vivas da pessoa (lista de sessões). */
    List<RefreshRecord> activeOfUser(UUID userId, Instant now);
}
