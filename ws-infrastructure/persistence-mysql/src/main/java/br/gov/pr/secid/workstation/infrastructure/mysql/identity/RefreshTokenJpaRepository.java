package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenJpaRepository extends JpaRepository<RefreshTokenEntity, UUID> {
    Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);

    List<RefreshTokenEntity> findByFamilyIdAndRevokedAtIsNull(UUID familyId);

    List<RefreshTokenEntity> findByUserIdAndRevokedAtIsNull(UUID userId);
}
