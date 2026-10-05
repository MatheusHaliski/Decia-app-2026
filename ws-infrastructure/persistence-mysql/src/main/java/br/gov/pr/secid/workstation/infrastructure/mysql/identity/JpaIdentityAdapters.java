package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.RefreshTokenMirrorPort;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserPreferencesRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.VerificationCode;
import br.gov.pr.secid.workstation.application.identity.VerificationCodeRepositoryPort;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Adaptadores JPA das portas de identidade (users, user_preferences, refresh_tokens espelho, verification_codes). */
@Configuration
public class JpaIdentityAdapters {

    @Bean
    UserRepositoryPort userRepositoryPort(UserJpaRepository repo) {
        return new UserRepositoryPort() {
            @Override
            public Optional<User> findById(UUID id) {
                return repo.findById(id).map(UserEntity::toDomain);
            }

            @Override
            public Optional<User> findByUsername(String normalizedUsername) {
                return repo.findByUsername(normalizedUsername).map(UserEntity::toDomain);
            }

            @Override
            public Optional<User> findByEmailHash(String emailHash) {
                return repo.findByEmailHash(emailHash).map(UserEntity::toDomain);
            }

            @Override
            public Optional<User> findByOidc(String issuer, String subject) {
                return repo.findByOidcIssuerAndOidcSubject(issuer, subject).map(UserEntity::toDomain);
            }

            @Override
            public boolean existsByUsername(String normalizedUsername) {
                return repo.existsByUsername(normalizedUsername);
            }

            @Override
            public boolean existsByEmailHash(String emailHash) {
                return repo.existsByEmailHash(emailHash);
            }

            @Override
            public long countByRole(Role role) {
                return repo.countByRole(role);
            }

            @Override
            @Transactional
            public User save(User user) {
                UserEntity entity = user.getId() == null ? null : repo.findById(user.getId()).orElse(null);
                if (entity == null) {
                    entity = UserEntity.fromDomain(user);
                } else {
                    entity.apply(user);
                }
                User saved = repo.saveAndFlush(entity).toDomain();
                user.setId(saved.getId());
                user.setVersion(saved.getVersion());
                user.setCreatedAt(saved.getCreatedAt());
                user.setUpdatedAt(saved.getUpdatedAt());
                return saved;
            }
        };
    }

    @Bean
    UserPreferencesRepositoryPort userPreferencesRepositoryPort(UserPreferencesJpaRepository repo) {
        return new UserPreferencesRepositoryPort() {
            @Override
            public Optional<UserPreferences> findByUserId(UUID userId) {
                return repo.findById(userId).map(UserPreferencesEntity::toDomain);
            }

            @Override
            @Transactional
            public UserPreferences save(UserPreferences p) {
                UserPreferencesEntity e = repo.findById(p.getUserId()).orElse(null);
                if (e == null) {
                    e = UserPreferencesEntity.fromDomain(p);
                } else {
                    e.apply(p);
                }
                return repo.saveAndFlush(e).toDomain();
            }
        };
    }

    @Bean
    RefreshTokenMirrorPort refreshTokenMirrorPort(RefreshTokenJpaRepository repo) {
        return new RefreshTokenMirrorPort() {
            @Override
            @Transactional
            public void saved(RefreshRecord r, RequestContext ctx) {
                UUID rotatedFrom = r.rotatedFromHash() == null ? null
                        : repo.findByTokenHash(r.rotatedFromHash()).map(RefreshTokenEntity::getId).orElse(null);
                repo.save(new RefreshTokenEntity(r.userId(), r.tokenHash(), r.familyId(), r.createdAt(), r.expiresAt(), rotatedFrom,
                        ctx == null ? null : ctx.ip(), ctx == null ? null : ctx.userAgent(), r.deviceName(), r.persistent()));
            }

            @Override
            @Transactional
            public void revoked(String tokenHash, Instant at) {
                repo.findByTokenHash(tokenHash).ifPresent(e -> e.revoke(at));
            }

            @Override
            @Transactional
            public void familyRevoked(UUID familyId, Instant at) {
                repo.findByFamilyIdAndRevokedAtIsNull(familyId).forEach(e -> e.revoke(at));
            }

            @Override
            @Transactional
            public void userRevoked(UUID userId, UUID keepFamily, Instant at) {
                repo.findByUserIdAndRevokedAtIsNull(userId).stream()
                        .filter(e -> keepFamily == null || !keepFamily.equals(e.getFamilyId()))
                        .forEach(e -> e.revoke(at));
            }
        };
    }

    @Bean
    VerificationCodeRepositoryPort verificationCodeRepositoryPort(VerificationCodeJpaRepository repo) {
        return new VerificationCodeRepositoryPort() {
            @Override
            @Transactional
            public VerificationCode save(VerificationCode code) {
                VerificationCodeEntity e = repo.findById(code.id()).orElse(null);
                if (e == null) {
                    e = VerificationCodeEntity.fromDomain(code);
                } else {
                    e.apply(code);
                }
                return repo.saveAndFlush(e).toDomain();
            }

            @Override
            public Optional<VerificationCode> findByCodeHash(String codeHash) {
                return repo.findByCodeHash(codeHash).map(VerificationCodeEntity::toDomain);
            }

            @Override
            public List<VerificationCode> findOpen(UUID userId, VerificationPurpose purpose) {
                return repo.findByUserIdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(userId, purpose).stream()
                        .map(VerificationCodeEntity::toDomain).toList();
            }
        };
    }
}
