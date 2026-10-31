package br.gov.pr.secid.workstation.application.social;

import br.gov.pr.secid.workstation.domain.social.Follow;
import br.gov.pr.secid.workstation.domain.social.FollowStatus;
import br.gov.pr.secid.workstation.domain.social.FollowTargetType;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** {@link FollowRepositoryPort} em memória, com a mesma unicidade (seguidor, tipo, alvo) do banco. */
public class MemoryFollows implements FollowRepositoryPort {
    public final Map<UUID, Follow> rows = new LinkedHashMap<>();

    @Override
    public Optional<Follow> find(UUID followerId, FollowTargetType type, UUID targetId) {
        return rows.values().stream().filter(f -> f.followerId().equals(followerId) && f.targetType() == type && f.targetId().equals(targetId))
                .findFirst();
    }

    @Override
    public Follow save(Follow follow) {
        Optional<Follow> dup = find(follow.followerId(), follow.targetType(), follow.targetId()).filter(f -> !f.id().equals(follow.id()));
        if (dup.isPresent()) {
            throw new IllegalStateException("ux_follows_follower_target_type_target");
        }
        rows.put(follow.id(), follow);
        return follow;
    }

    @Override
    public long countFollowers(FollowTargetType type, UUID targetId) {
        return rows.values().stream().filter(f -> f.targetType() == type && f.targetId().equals(targetId) && f.status() == FollowStatus.ATIVO)
                .count();
    }

    @Override
    public long countFollowing(UUID followerId, FollowTargetType type) {
        return rows.values().stream().filter(f -> f.followerId().equals(followerId) && f.targetType() == type && f.status() == FollowStatus.ATIVO)
                .count();
    }

    @Override
    public int removeAllOf(UUID userId) {
        int n = 0;
        for (Follow f : rows.values().toArray(Follow[]::new)) {
            boolean involved = f.followerId().equals(userId) || (f.targetType() == FollowTargetType.USER && f.targetId().equals(userId));
            if (involved && f.status() == FollowStatus.ATIVO) {
                rows.put(f.id(), new Follow(f.id(), f.followerId(), f.targetType(), f.targetId(), FollowStatus.REMOVIDO, f.at()));
                n++;
            }
        }
        return n;
    }
}
