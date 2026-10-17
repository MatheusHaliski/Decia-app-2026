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
    /**
     * Guarda um token. Lança {@link FamilyRevokedException} se a família já tem o marcador de revogação (tombstone, D-32):
     * o sucessor de um refresh que perdeu a corrida para a detecção de reuso nunca entra em vigor.
     */
    void save(RefreshRecord record);

    Optional<RefreshRecord> find(String tokenHash);

    /** Marca um token como usado/rotacionado (a família continua viva pelo sucessor). */
    void revoke(String tokenHash, Instant at);

    /**
     * Consumo ATÔMICO do refresh (RF2.CA04, D-30): se o token existe, não está revogado e não expirou, marca-o revogado
     * e devolve {@link Consume#ROTATED}; se já estava revogado, {@link Consume#REUSED}; expirado → {@link Consume#EXPIRED};
     * inexistente → {@link Consume#UNKNOWN}. Duas requisições com o MESMO token nunca ganham as duas: só uma vê ROTATED.
     */
    Consume consume(String tokenHash, Instant now);

    enum Consume { ROTATED, REUSED, EXPIRED, UNKNOWN }

    /** A família foi revogada (logout, reuso, troca de senha) entre o consumo do token e a gravação do sucessor. */
    class FamilyRevokedException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        public FamilyRevokedException(UUID familyId) {
            super("família de sessão revogada: " + familyId);
        }
    }

    /**
     * Reivindica, de forma ATÔMICA, a tolerância ao reuso de um token já rotacionado (D-140): devolve {@code true} só na primeira
     * chamada para aquele hash. Garante um único irmão por rotação mesmo com reusos paralelos; nunca cria nem revive tokens.
     */
    boolean claimReuseGrace(String tokenHash);
    /** Revoga a família inteira (logout, reuso detectado, troca de senha). */
    void revokeFamily(UUID familyId, Instant at);

    /** Revoga todas as famílias da pessoa, exceto {@code keepFamily} (pode ser null); devolve quantas encerrou. */
    int revokeAllOfUser(UUID userId, UUID keepFamily, Instant at);

    /** A família tem algum token vivo (não revogado e não expirado). */
    boolean familyActive(UUID familyId, Instant now);

    /** Famílias vivas da pessoa (lista de sessões). */
    List<RefreshRecord> activeOfUser(UUID userId, Instant now);
}
