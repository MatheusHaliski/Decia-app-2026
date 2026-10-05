package br.gov.pr.secid.workstation.application.security;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

class GuardTest {
    final CurrentUser user = new CurrentUser(UUID.randomUUID(), Role.USER, UUID.randomUUID());
    final CurrentUser admin = new CurrentUser(UUID.randomUUID(), Role.ADMIN, UUID.randomUUID());

    @Test
    void ownerOrAdminRecusaTerceirosSemDizerSeORecursoExiste() {
        assertThatCode(() -> Guard.ownerOrAdmin(user, user.id())).doesNotThrowAnyException();
        assertThatCode(() -> Guard.ownerOrAdmin(admin, user.id())).doesNotThrowAnyException();
        ApiException e = catchThrowableOfType(ApiException.class, () -> Guard.ownerOrAdmin(user, admin.id()));
        assertThat(e.status()).isEqualTo(403);
        assertThat(e.code()).isEqualTo(ApiException.ACESSO_NEGADO);
        assertThat(e.details()).isEmpty();
        assertThat(catchThrowableOfType(ApiException.class, () -> Guard.ownerOrAdmin(null, user.id())).status()).isEqualTo(403);
        assertThat(catchThrowableOfType(ApiException.class, () -> Guard.ownerOrAdmin(user, null)).status()).isEqualTo(403);
    }

    @Test
    void requireRoleEExclusaoAgendada() {
        assertThatCode(() -> Guard.requireRole(admin, Role.ADMIN)).doesNotThrowAnyException();
        assertThat(catchThrowableOfType(ApiException.class, () -> Guard.requireRole(user, Role.ADMIN)).status()).isEqualTo(403);
        assertThat(catchThrowableOfType(ApiException.class, () -> Guard.requireRole(null, Role.USER)).status()).isEqualTo(403);
        User u = new User();
        u.setStatus(AccountStatus.ACTIVE);
        assertThatCode(() -> Guard.requireNotDeletionScheduled(u)).doesNotThrowAnyException();
        u.setStatus(AccountStatus.DELETION_SCHEDULED);
        ApiException e = catchThrowableOfType(ApiException.class, () -> Guard.requireNotDeletionScheduled(u));
        assertThat(e.status()).isEqualTo(403);
        assertThat(e.code()).isEqualTo(AuthCodes.EXCLUSAO_AGENDADA);
    }
}
