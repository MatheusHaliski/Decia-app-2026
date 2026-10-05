package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VerificationCodeJpaRepository extends JpaRepository<VerificationCodeEntity, UUID> {
    Optional<VerificationCodeEntity> findByCodeHash(String codeHash);

    List<VerificationCodeEntity> findByUserIdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(UUID userId, VerificationPurpose purpose);
}
