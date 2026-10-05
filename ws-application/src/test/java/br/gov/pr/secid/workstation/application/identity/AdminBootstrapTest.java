package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** RF1.CA10 / D-14: cria o ADMIN só se não existe nenhum; nunca promove sem WS_ADMIN_PROMOTE_EXISTING=true; senha sem padrão. */
class AdminBootstrapTest {
    final String password = "AdminInicial-" + UUID.randomUUID();
    final Fakes.Users users = new Fakes.Users();
    final Fakes.Preferences prefs = new Fakes.Preferences();
    final Fakes.SpyHasher hasher = new Fakes.SpyHasher();
    final Fakes.Audit audit = new Fakes.Audit();

    private AdminBootstrap bootstrap(AdminProperties props, boolean enforce) {
        return new AdminBootstrap(users, prefs, Fakes.EMAIL_HASHER, hasher, audit, props, enforce, Clock.systemUTC());
    }

    @Test
    void desligadoNaoFazNadaELigadoCriaOPrimeiroAdminUmaVezSo() {
        assertThat(bootstrap(new AdminProperties(false, "adm@exemplo.gov.br", "admin", password, false), false).ensureAdmin())
                .isEqualTo(AdminBootstrap.Outcome.DISABLED);
        assertThat(users.rows).isEmpty();
        AdminBootstrap b = bootstrap(new AdminProperties(true, "Adm@Exemplo.gov.br", "admin", password, false), false);
        assertThat(b.ensureAdmin()).isEqualTo(AdminBootstrap.Outcome.CREATED);
        User admin = users.findByUsername("admin").orElseThrow();
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(admin.isEmailVerified()).isTrue();
        assertThat(admin.getPasswordHash()).isEqualTo("h:" + password);
        assertThat(admin.getTermsVersion()).as("aceite não é automático (RF1.CA17)").isNull();
        assertThat(prefs.rows).containsKey(admin.getId());
        assertThat(audit.actions()).contains(AuditActions.ADMIN_BOOTSTRAP);
        assertThat(audit.dump()).doesNotContain(password).doesNotContain("adm@exemplo");
        // segunda subida (mesma ou outra config): já existe ADMIN → nada
        assertThat(b.ensureAdmin()).isEqualTo(AdminBootstrap.Outcome.SKIPPED_ADMIN_EXISTS);
        assertThat(bootstrap(new AdminProperties(true, "outro@exemplo.gov.br", "admin2", password, true), false).ensureAdmin())
                .isEqualTo(AdminBootstrap.Outcome.SKIPPED_ADMIN_EXISTS);
        assertThat(users.countByRole(Role.ADMIN)).isEqualTo(1);
    }

    @Test
    void nuncaPromoveContaExistenteSemAFlagEComAFlagSoContaAtivaEVerificada() {
        User impostor = users.add(Fakes.user("qualquer", "adm@exemplo.gov.br", "h:x"));
        impostor.setEmailVerified(false);
        AdminProperties noPromote = new AdminProperties(true, "adm@exemplo.gov.br", "admin", password, false);
        assertThat(bootstrap(noPromote, false).ensureAdmin()).isEqualTo(AdminBootstrap.Outcome.EXISTING_NOT_PROMOTED);
        assertThat(impostor.getRole()).isEqualTo(Role.USER);
        assertThat(users.countByRole(Role.ADMIN)).as("também não cria um segundo com o mesmo e-mail").isZero();
        AdminProperties promote = new AdminProperties(true, "adm@exemplo.gov.br", "admin", password, true);
        assertThat(bootstrap(promote, false).ensureAdmin()).isEqualTo(AdminBootstrap.Outcome.EXISTING_NOT_ELIGIBLE);
        assertThat(impostor.getRole()).isEqualTo(Role.USER);
        impostor.setEmailVerified(true);
        impostor.setStatus(AccountStatus.ACTIVE);
        assertThat(bootstrap(promote, false).ensureAdmin()).isEqualTo(AdminBootstrap.Outcome.PROMOTED);
        assertThat(impostor.getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    void semSenhaOuSenhaCurtaNaoCriaEEmProdDerrubaOBoot() {
        assertThat(bootstrap(new AdminProperties(true, "adm@exemplo.gov.br", "admin", "", false), false).ensureAdmin())
                .isEqualTo(AdminBootstrap.Outcome.INVALID_CONFIG);
        assertThat(bootstrap(new AdminProperties(true, "adm@exemplo.gov.br", "admin", "curta", false), false).ensureAdmin())
                .isEqualTo(AdminBootstrap.Outcome.INVALID_CONFIG);
        assertThat(users.rows).isEmpty();
        assertThatThrownBy(() -> bootstrap(new AdminProperties(true, "adm@exemplo.gov.br", "admin", "", false), true).ensureAdmin())
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("WS_ADMIN_INITIAL_PASSWORD");
        assertThatThrownBy(() -> bootstrap(new AdminProperties(true, "adm@exemplo.gov.br", "admin", "curta", true), true).ensureAdmin())
                .isInstanceOf(IllegalStateException.class);
        assertThat(new AdminProperties(true, null, null, null, false).toString()).doesNotContain("Password=");
    }

    @Test
    void usernameOcupadoOuInvalidoGanhaSufixoOuCaiEmAdmin() {
        users.add(Fakes.user("admin", "x@exemplo.gov.br", "h:x"));
        bootstrap(new AdminProperties(true, "adm@exemplo.gov.br", "ADMIN", password, false), false).ensureAdmin();
        User created = users.findByEmailHash(Fakes.EMAIL_HASHER.hash("adm@exemplo.gov.br")).orElseThrow();
        assertThat(created.getUsername()).startsWith("admin_");
        users.rows.clear();
        bootstrap(new AdminProperties(true, "adm@exemplo.gov.br", "??", password, false), false).ensureAdmin();
        assertThat(users.findByUsername("admin")).isPresent();
    }
}
