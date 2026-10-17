package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import br.gov.pr.secid.workstation.domain.identity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByUsername(String username);

    Optional<UserEntity> findByEmailHash(String emailHash);

    Optional<UserEntity> findByOidcIssuerAndOidcSubject(String issuer, String subject);

    boolean existsByUsername(String username);

    boolean existsByEmailHash(String emailHash);

    long countByRole(Role role);

    /** Busca de pessoas da empresa (RF4 responsável, RF10 atribuição): só contas ATIVAS; o chamador limita o tamanho da página. */
    @Query("""
            select u from UserEntity u
            where u.companyId = :company and u.status = br.gov.pr.secid.workstation.domain.identity.AccountStatus.ACTIVE
              and (lower(u.username) like :q or lower(u.fullName) like :q or lower(u.displayName) like :q)
            order by u.username
            """)
    List<UserEntity> searchInCompany(@Param("company") UUID companyId, @Param("q") String likePattern, Pageable page);

    @Query("select u from UserEntity u where u.status = br.gov.pr.secid.workstation.domain.identity.AccountStatus.DELETION_SCHEDULED "
            + "and u.deletionScheduledAt <= :now order by u.deletionScheduledAt")
    List<UserEntity> findDeletionDue(@Param("now") java.time.Instant now, Pageable page);
}
