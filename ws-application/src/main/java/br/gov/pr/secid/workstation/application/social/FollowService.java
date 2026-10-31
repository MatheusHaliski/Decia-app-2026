package br.gov.pr.secid.workstation.application.social;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService;
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
 * Seguir pessoas, departamentos e empresas (RF16.CA01, RF14.CA04, RF15.CA05, RF27; auditoria Onda 1). Só se segue o que a página pública
 * deixa ver: conta ATIVA visível pelo controle de publicação (RF3), departamento ATIVO de empresa visível, empresa ATIVA com dona ATIVA —
 * o resto responde o mesmo 404 da página. Seguir a si mesmo é recusado. Idempotente e reativável (ATIVO ⇄ REMOVIDO, uma linha por par).
 * Os contadores contam só vínculos ATIVOS; a anonimização desliga os vínculos da conta.
 */
@Service
public class FollowService {
    public static final String A_SI_MESMO = "SEGUIR_A_SI_MESMO";

    private final FollowRepositoryPort follows;
    private final UserRepositoryPort users;
    private final ResourceAuthorizer authorizer;
    private final InstitutionPageService institutions;
    private final Clock clock;

    public FollowService(FollowRepositoryPort follows, UserRepositoryPort users, ResourceAuthorizer authorizer,
                         InstitutionPageService institutions, Clock clock) {
        this.follows = follows;
        this.users = users;
        this.authorizer = authorizer;
        this.institutions = institutions;
        this.clock = clock;
    }

    /**
     * Situação de quem vê em relação a um alvo: se segue, se é a própria pessoa, quantos seguem o alvo e — só para pessoas — quantas ela
     * segue ({@code 0} para departamento e empresa).
     */
    public record FollowView(boolean following, boolean self, long followers, long followingCount) {
    }

    // ------------------------------------------------------------------------------------------------ pessoas (RF16)

    public FollowView status(CurrentUser actor, UUID userId) {
        User target = visible(actor, userId);
        return view(actor.id(), FollowTargetType.USER, target.getId());
    }

    @Transactional
    public FollowView follow(CurrentUser actor, UUID userId) {
        User target = visible(actor, userId);
        if (target.getId().equals(actor.id())) {
            throw ApiException.unprocessable(A_SI_MESMO, "Você não pode seguir a si mesmo.", Map.of());
        }
        return activate(actor, FollowTargetType.USER, target.getId());
    }

    @Transactional
    public FollowView unfollow(CurrentUser actor, UUID userId) {
        User target = visible(actor, userId);
        return deactivate(actor, FollowTargetType.USER, target.getId());
    }

    // ------------------------------------------------------------------------------------------------ departamentos (RF14.CA04)

    public FollowView departmentStatus(CurrentUser actor, String slug, String companySlug) {
        return view(actor.id(), FollowTargetType.DEPARTMENT, institutions.visibleDepartment(actor, slug, companySlug).id());
    }

    @Transactional
    public FollowView followDepartment(CurrentUser actor, String slug, String companySlug) {
        return activate(actor, FollowTargetType.DEPARTMENT, institutions.visibleDepartment(actor, slug, companySlug).id());
    }

    @Transactional
    public FollowView unfollowDepartment(CurrentUser actor, String slug, String companySlug) {
        return deactivate(actor, FollowTargetType.DEPARTMENT, institutions.visibleDepartment(actor, slug, companySlug).id());
    }

    // ------------------------------------------------------------------------------------------------ empresas (RF15.CA05)

    public FollowView companyStatus(CurrentUser actor, String slug) {
        return view(actor.id(), FollowTargetType.COMPANY, institutions.visibleCompany(actor, slug).id());
    }

    @Transactional
    public FollowView followCompany(CurrentUser actor, String slug) {
        return activate(actor, FollowTargetType.COMPANY, institutions.visibleCompany(actor, slug).id());
    }

    @Transactional
    public FollowView unfollowCompany(CurrentUser actor, String slug) {
        return deactivate(actor, FollowTargetType.COMPANY, institutions.visibleCompany(actor, slug).id());
    }

    /** Anonimização: a conta deixa de seguir e de ser seguida. */
    public int purge(UUID userId) {
        return follows.removeAllOf(userId);
    }

    // ------------------------------------------------------------------------------------------------ apoio

    private FollowView activate(CurrentUser actor, FollowTargetType type, UUID targetId) {
        Follow current = follows.find(actor.id(), type, targetId).orElse(null);
        if (current == null) {
            follows.save(new Follow(UUID.randomUUID(), actor.id(), type, targetId, FollowStatus.ATIVO, clock.instant()));
        } else if (current.status() != FollowStatus.ATIVO) {
            follows.save(new Follow(current.id(), current.followerId(), current.targetType(), current.targetId(), FollowStatus.ATIVO,
                    clock.instant()));
        }
        return view(actor.id(), type, targetId);
    }

    private FollowView deactivate(CurrentUser actor, FollowTargetType type, UUID targetId) {
        follows.find(actor.id(), type, targetId)
                .filter(f -> f.status() == FollowStatus.ATIVO)
                .ifPresent(f -> follows.save(new Follow(f.id(), f.followerId(), f.targetType(), f.targetId(), FollowStatus.REMOVIDO,
                        clock.instant())));
        return view(actor.id(), type, targetId);
    }

    private User visible(CurrentUser actor, UUID userId) {
        User target = userId == null ? null : users.findById(userId).orElse(null);
        authorizer.requireProfileVisible(actor, target);
        if (target == null) {
            throw ApiException.notFound("Perfil");
        }
        return target;
    }

    private FollowView view(UUID viewerId, FollowTargetType type, UUID targetId) {
        boolean following = follows.find(viewerId, type, targetId).map(f -> f.status() == FollowStatus.ATIVO).orElse(false);
        boolean person = type == FollowTargetType.USER;
        return new FollowView(following, person && viewerId.equals(targetId), follows.countFollowers(type, targetId),
                person ? follows.countFollowing(targetId, FollowTargetType.USER) : 0);
    }
}
