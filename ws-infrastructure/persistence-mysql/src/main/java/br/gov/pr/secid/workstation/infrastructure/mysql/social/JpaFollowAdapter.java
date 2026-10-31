package br.gov.pr.secid.workstation.infrastructure.mysql.social;

import br.gov.pr.secid.workstation.application.social.FollowRepositoryPort;
import br.gov.pr.secid.workstation.domain.social.Follow;
import br.gov.pr.secid.workstation.domain.social.FollowStatus;
import br.gov.pr.secid.workstation.domain.social.FollowTargetType;
import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.FollowEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.social.repository.FollowRepository;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/** Adaptador JPA da {@link FollowRepositoryPort} ({@code follows}, V16): uma linha por par (seguidor, alvo), reativável. */
@Configuration
public class JpaFollowAdapter {

    @Bean
    FollowRepositoryPort followRepositoryPort(FollowRepository repo, EntityManager em) {
        return new FollowRepositoryPort() {
            @Override
            public Optional<Follow> find(UUID followerId, FollowTargetType type, UUID targetId) {
                return em.createQuery("select f from FollowEntity f where f.followerId = :f and f.targetType = :t and f.targetId = :id",
                                FollowEntity.class)
                        .setParameter("f", followerId).setParameter("t", type).setParameter("id", targetId)
                        .setMaxResults(1).getResultList().stream().findFirst().map(JpaFollowAdapter::toDomain);
            }

            @Override
            @Transactional
            public Follow save(Follow f) {
                FollowEntity e = repo.findById(f.id()).orElseGet(FollowEntity::new);
                e.setId(f.id());
                e.setFollowerId(f.followerId());
                e.setTargetType(f.targetType());
                e.setTargetId(f.targetId());
                e.setStatus(f.status());
                e.setAt(f.at());
                return toDomain(repo.saveAndFlush(e));
            }

            @Override
            public long countFollowers(FollowTargetType type, UUID targetId) {
                return em.createQuery("select count(f) from FollowEntity f where f.targetType = :t and f.targetId = :id and f.status = :s",
                                Long.class)
                        .setParameter("t", type).setParameter("id", targetId).setParameter("s", FollowStatus.ATIVO).getSingleResult();
            }

            @Override
            public long countFollowing(UUID followerId, FollowTargetType type) {
                return em.createQuery("select count(f) from FollowEntity f where f.followerId = :f and f.targetType = :t and f.status = :s",
                                Long.class)
                        .setParameter("f", followerId).setParameter("t", type).setParameter("s", FollowStatus.ATIVO).getSingleResult();
            }

            @Override
            @Transactional
            public int removeAllOf(UUID userId) {
                return em.createQuery("update FollowEntity f set f.status = :removed where f.status = :active "
                                + "and (f.followerId = :u or (f.targetType = :user and f.targetId = :u))")
                        .setParameter("removed", FollowStatus.REMOVIDO).setParameter("active", FollowStatus.ATIVO)
                        .setParameter("u", userId).setParameter("user", FollowTargetType.USER).executeUpdate();
            }
        };
    }

    static Follow toDomain(FollowEntity e) {
        return new Follow(e.getId(), e.getFollowerId(), e.getTargetType(), e.getTargetId(), e.getStatus(), e.getAt());
    }
}
