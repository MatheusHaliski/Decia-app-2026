package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Fake de {@code verification_codes}: guarda o último estado salvo por id (como o JPA faria). */
final class InMemoryCodes implements VerificationCodeRepositoryPort {
    final Map<UUID, VerificationCode> rows = new ConcurrentHashMap<>();

    @Override
    public VerificationCode save(VerificationCode code) {
        rows.put(code.id(), code);
        return code;
    }

    @Override
    public Optional<VerificationCode> findByCodeHash(String codeHash) {
        return rows.values().stream().filter(c -> c.codeHash().equals(codeHash)).findFirst();
    }

    @Override
    public List<VerificationCode> findOpen(UUID userId, VerificationPurpose purpose) {
        return rows.values().stream().filter(c -> c.userId().equals(userId) && c.purpose() == purpose && c.consumedAt() == null)
                .sorted(Comparator.comparing(VerificationCode::createdAt).reversed()).toList();
    }
}
