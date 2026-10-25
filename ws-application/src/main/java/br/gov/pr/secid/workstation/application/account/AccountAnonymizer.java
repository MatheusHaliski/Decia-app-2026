package br.gov.pr.secid.workstation.application.account;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.IdentityService;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.social.FollowService;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;

/**
 * Fim do prazo de reativação (D-18, D-145): contas em {@code DELETION_SCHEDULED} cujo {@code deletionScheduledAt} passou viram
 * {@code ANONYMIZED} — nome, nome de exibição, e-mail, telefone, cargo, biografia, imagens, senha, vínculo OIDC e 2FA são apagados ou
 * substituídos; o usuário passa a {@code removido-xxxxxxxx}; todas as sessões caem. O que a lei obriga a guardar (registros de acesso,
 * prova do aceite dos termos, auditoria) fica, sem dado que identifique a pessoa além do id interno. Idempotente: roda de hora em hora
 * e por lote; uma conta reativada antes do prazo nunca entra na consulta.
 */
@Service
public class AccountAnonymizer {
    private static final Logger log = LoggerFactory.getLogger(AccountAnonymizer.class);
    static final int BATCH = 100;

    private final UserRepositoryPort users;
    private final EmailHasher emailHasher;
    private final IdentityService identity;
    private final AuditLogPort audit;
    private final AvatarService avatars;
    private final FollowService follows;
    private final Clock clock;

    public AccountAnonymizer(UserRepositoryPort users, EmailHasher emailHasher, IdentityService identity, AuditLogPort audit,
                             AvatarService avatars, FollowService follows, Clock clock) {
        this.users = users;
        this.emailHasher = emailHasher;
        this.identity = identity;
        this.audit = audit;
        this.avatars = avatars;
        this.follows = follows;
        this.clock = clock;
    }

    @Scheduled(initialDelayString = "${ws.jobs.anonymize.initial-delay:PT2M}", fixedDelayString = "${ws.jobs.anonymize.every:PT1H}")
    public void run() {
        int done = anonymizeDue();
        if (done > 0) {
            log.info("Anonimizadas {} conta(s) com prazo de reativação encerrado", done);
        }
    }

    @Transactional
    public int anonymizeDue() {
        Instant now = clock.instant();
        int count = 0;
        for (User u : users.findDeletionDue(now, BATCH)) {
            if (u.getStatus() != AccountStatus.DELETION_SCHEDULED || u.getDeletionScheduledAt() == null || u.getDeletionScheduledAt().isAfter(now)) {
                continue;
            }
            anonymize(u, now);
            count++;
        }
        return count;
    }

    private void anonymize(User u, Instant now) {
        String tag = u.getId().toString().replace("-", "").substring(0, 8);
        String email = "removido+" + u.getId() + "@anonimizado.invalid";
        u.setUsername("removido-" + tag);
        u.setFullName("Conta removida");
        u.setDisplayName(null);
        u.setEmail(email);
        u.setEmailHash(emailHasher.hash(EmailHasher.normalize(email)));
        u.setEmailVerified(false);
        u.setPhone(null);
        u.setPasswordHash(null);
        u.setOidcSubject(null);
        u.setOidcIssuer(null);
        u.setJobTitle(null);
        u.setBio(null);
        avatars.purge(u);
        follows.purge(u.getId());
        u.setAvatarUrl(null);
        u.setCoverUrl(null);
        u.setTwoFactorEnabled(false);
        u.setTwoFactorEnabledAt(null);
        u.setTwoFactorSecret(null);
        u.setTwoFactorRecoveryHashes(null);
        u.setTwoFactorLastStep(null);
        u.setDeletionReason(null);
        u.setStatus(u.getStatus().transition(AccountStatus.ANONYMIZED));
        u.setAnonymizedAt(now);
        users.save(u);
        identity.revokeOtherSessions(u.getId(), null);
        audit.record(AuditEvent.of(null, AuditActions.ACCOUNT_ANONYMIZED, "user", u.getId().toString(), AuditEvent.OK, null, null,
                Map.of("deletionScheduledAt", String.valueOf(u.getDeletionScheduledAt()))));
    }
}
