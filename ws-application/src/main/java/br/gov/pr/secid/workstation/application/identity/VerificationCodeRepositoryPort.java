package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** {@code verification_codes} (V3). */
public interface VerificationCodeRepositoryPort {
    VerificationCode save(VerificationCode code);

    Optional<VerificationCode> findByCodeHash(String codeHash);

    /** Códigos abertos (não consumidos) da pessoa e finalidade, do mais novo para o mais antigo. */
    List<VerificationCode> findOpen(UUID userId, VerificationPurpose purpose);
}
