package br.gov.pr.secid.workstation.application.social;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.social.Follow;
import br.gov.pr.secid.workstation.domain.social.FollowStatus;
import br.gov.pr.secid.workstation.domain.social.FollowTargetType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Map;
import java.util.UUID;

/**
 * Seguir pessoas (RF16.CA01, RF27; auditoria Onda 1). Só se segue conta ATIVA que o perfil público deixa ver (inexistente ou não ativa →
 * o mesmo 404 do perfil); seguir a si mesmo é recusado. Idempotente e reativável (ATIVO ⇄ REMOVIDO, uma linha por par). Os contadores
 * contam só vínculos ATIVOS; a anonimização desliga os vínculos da conta. Departamentos e empresas entram quando tiverem API própria.
 */
@Service
public class FollowService {
    public static final String A_SI_MESMO = "SEGUIR_A_SI_MESMO";

    private final FollowRepositoryPort follows;
    private final UserRepositoryPort users;
    private final ResourceAuthorizer authorizer;
    private final Clock clock;

    public FollowService(FollowRepositoryPort follows, UserRepositoryPort users, ResourceAuthorizer authorizer, Clock clock) {
        this.follows = follows;
        this.users = users;
        this.authorizer = authorizer;
        this.clock = clock;
    }

    /** Situação de quem vê em relação a uma pessoa: se segue, quantos seguem a pessoa e quantas ela segue. */
    public record FollowView(boolean following, boolean self, long followers, long followingCount) {
    }

    public FollowView status(CurrentUser actor, UUID userId) {
        User target = visible(actor, userId);
        return view(actor.id(), target.getId());
    }

    @Transactional
    public FollowView follow(CurrentUser actor, UUID userId) {
        User target = visible(actor, userId);
        if (target.getId().equals(actor.id())) {
            throw ApiException.unprocessable(A_SI_MESMO, "Você não pode seguir a si mesmo.", Map.of());
        }
        Follow current = follows.find(actor.id(), FollowTargetType.USER, target.getId()).orElse(null);
        if (current == null) {
            follows.save(new Follow(UUID.randomUUID(), actor.id(), FollowTargetType.USER, target.getId(), FollowStatus.ATIVO, clock.instant()));
        } else if (current.status() != FollowStatus.ATIVO) {
            follows.save(new Follow(current.id(), current.followerId(), current.targetType(), current.targetId(), FollowStatus.ATIVO,
                    clock.instant()));
        }
        return view(actor.id(), target.getId());
    }

    @Transactional
    public FollowView unfollow(CurrentUser actor, UUID userId) {
        User target = visible(actor, userId);
        follows.find(actor.id(), FollowTargetType.USER, target.getId())
                .filter(f -> f.status() == FollowStatus.ATIVO)
                .ifPresent(f -> follows.save(new Follow(f.id(), f.followerId(), f.targetType(), f.targetId(), FollowStatus.REMOVIDO,
                        clock.instant())));
        return view(actor.id(), target.getId());
    }

    /** Anonimização: a conta deixa de seguir e de ser seguida. */
    public int purge(UUID userId) {
        return follows.removeAllOf(userId);
    }

    private User visible(CurrentUser actor, UUID userId) {
        User target = userId == null ? null : users.findById(userId).orElse(null);
        authorizer.requireProfileVisible(actor, target);
        if (target == null) {
            throw ApiException.notFound("Perfil");
        }
        return target;
    }

    private FollowView view(UUID viewerId, UUID targetId) {
        boolean following = follows.find(viewerId, FollowTargetType.USER, targetId).map(f -> f.status() == FollowStatus.ATIVO).orElse(false);
        return new FollowView(following, viewerId.equals(targetId), follows.countFollowers(FollowTargetType.USER, targetId),
                follows.countFollowing(targetId, FollowTargetType.USER));
    }
}
