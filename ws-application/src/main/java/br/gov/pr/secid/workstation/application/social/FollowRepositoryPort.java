package br.gov.pr.secid.workstation.application.social;

import br.gov.pr.secid.workstation.domain.social.Follow;
import br.gov.pr.secid.workstation.domain.social.FollowTargetType;

import java.util.Optional;
import java.util.UUID;

/** Acesso a {@code follows} (V16; RF16, RF14, RF15, RF27); adaptador JPA em persistence-mysql. */
public interface FollowRepositoryPort {

    Optional<Follow> find(UUID followerId, FollowTargetType type, UUID targetId);

    Follow save(Follow follow);

    /** Seguidores ATIVOS de um alvo. */
    long countFollowers(FollowTargetType type, UUID targetId);

    /** Quantos alvos do tipo a pessoa segue (ATIVO). */
    long countFollowing(UUID followerId, FollowTargetType type);

    /** Marca como REMOVIDO tudo o que envolve a pessoa (seguindo e sendo seguida); devolve quantas linhas mudaram. */
    int removeAllOf(UUID userId);
}
