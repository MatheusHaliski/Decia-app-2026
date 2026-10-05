package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** RF1.CA01/CA03–CA05/CA07/CA10/CA11/CA13/CA15/CA22 e RF1.CA02 corrigido (e-mail sem oráculo). */
class RegistrationServiceTest {
    final String password = "Senha-" + UUID.randomUUID();
    final RequestContext ctx = new RequestContext("203.0.113.7", "JUnit/5");
    final Fakes.Users users = new Fakes.Users();
    final Fakes.Preferences prefs = new Fakes.Preferences();
    final InMemoryCodes codes = new InMemoryCodes();
    final Fakes.SpyHasher hasher = new Fakes.SpyHasher();
    final InMemoryRateLimit rateLimit = new InMemoryRateLimit();
    final Fakes.Mails mails = new Fakes.Mails();
    final Fakes.Audit audit = new Fakes.Audit();
    RegistrationService registration;

    @BeforeEach
    void setUp() {
        IdentityService identity = new IdentityService(users, Fakes.EMAIL_HASHER, hasher, rateLimit, new InMemorySessionStore(),
                Fakes.NO_MIRROR, Fakes.TOKENS, audit, SessionPolicy.defaults(), Clock.systemUTC());
        registration = new RegistrationService(users, prefs, codes, Fakes.EMAIL_HASHER, hasher, rateLimit, mails, audit, identity,
                LegalProperties.defaults(), Clock.systemUTC(), new AccountInserter(users, prefs));
    }

    private RegistrationService.RegisterCommand cmd(String type, String username, String email) {
        return new RegistrationService.RegisterCommand(type, "Maria da Silva", username, email, password, password, null, true);
    }

    @Test
    void cadastroValidoCriaContaPendenteComPreferenciasVersoesDosTermosECodigo() {
        RegistrationService.Receipt r = registration.register(cmd("EMPREGADO", "Maria.Silva", "Maria@Exemplo.gov.br"), ctx);
        assertThat(r.status()).isEqualTo("VERIFICACAO_ENVIADA");
        assertThat(r.maskedEmail()).isEqualTo("m***@e***.br");
        User u = users.findByUsername("maria.silva").orElseThrow();
        assertThat(u.getStatus()).isEqualTo(AccountStatus.PENDING_EMAIL_VERIFICATION);
        assertThat(u.getEmail()).isEqualTo("maria@exemplo.gov.br");
        assertThat(u.getPasswordHash()).isEqualTo("h:" + password);
        assertThat(u.getTermsVersion()).isEqualTo("1.0");
        assertThat(u.getPrivacyVersion()).isEqualTo("1.0");
        assertThat(prefs.rows).containsKey(u.getId());
        assertThat(codes.findOpen(u.getId(), VerificationPurpose.EMAIL_VERIFICATION)).hasSize(1);
        assertThat(mails.last().template()).isEqualTo("email-verification");
        assertThat(mails.last().secret()).hasSize(6).containsOnlyDigits();
        assertThat(audit.actions()).contains(AuditActions.USER_REGISTERED);
        assertThat(audit.dump()).doesNotContain(password).doesNotContain(mails.last().secret()).doesNotContain("maria@exemplo");
    }

    @Test
    void emailJaCadastradoRecebeAMesmaRespostaEUmEmailDeContaExistente() {
        registration.register(cmd("EMPREGADO", "maria", "maria@exemplo.gov.br"), ctx);
        int before = users.rows.size();
        RegistrationService.Receipt r = registration.register(cmd("EMPRESA", "outra.pessoa", "MARIA@exemplo.gov.br"), ctx);
        assertThat(r).isEqualTo(RegistrationService.Receipt.verificationSent("maria@exemplo.gov.br"));
        assertThat(users.rows).hasSize(before);
        assertThat(mails.last().template()).isEqualTo("account-already-exists");
        assertThat(mails.last().secret()).isNull();
        assertThat(audit.actions()).contains(AuditActions.REGISTER_EMAIL_EM_USO);
    }

    /** Achado P2 (Codex): a violação de unicidade de um cadastro concorrente vira o mesmo 202, nunca um erro. */
    @Test
    void cadastroConcorrenteDoMesmoEmailViraOMesmo202ViaInserterEmTransacaoPropria() throws Exception {
        Fakes.Users racing = new Fakes.Users() {
            int saves;

            @Override
            public User save(User user) {
                if (saves++ == 0 && user.getId() == null) {
                    // outro pedido ganhou a corrida: a linha já existe quando o INSERT chega
                    User winner = Fakes.user("primeira", user.getEmail(), "h:x");
                    rows.put(winner.getId(), winner);
                    throw new org.springframework.dao.DuplicateKeyException("ux_users_email_hash");
                }
                return super.save(user);
            }
        };
        RegistrationService svc = new RegistrationService(racing, prefs, codes, Fakes.EMAIL_HASHER, hasher, rateLimit, mails, audit,
                new IdentityService(racing, Fakes.EMAIL_HASHER, hasher, rateLimit, new InMemorySessionStore(), Fakes.NO_MIRROR, Fakes.TOKENS,
                        audit, SessionPolicy.defaults(), Clock.systemUTC()), LegalProperties.defaults(), Clock.systemUTC(),
                new AccountInserter(racing, prefs));
        RegistrationService.Receipt r = svc.register(cmd("EMPREGADO", "segunda", "corrida@exemplo.gov.br"), ctx);
        assertThat(r).isEqualTo(RegistrationService.Receipt.verificationSent("corrida@exemplo.gov.br"));
        assertThat(mails.last().template()).isEqualTo("account-already-exists");
        assertThat(racing.rows).hasSize(1);
        assertThat(AccountInserter.class.getMethod("insert", User.class).getAnnotation(org.springframework.transaction.annotation.Transactional.class)
                .propagation()).as("INSERT em transação própria").isEqualTo(org.springframework.transaction.annotation.Propagation.REQUIRES_NEW);
        assertThatNoTransactionalOn(RegistrationService.class, "register");
    }

    private static void assertThatNoTransactionalOn(Class<?> type, String method) {
        java.lang.reflect.Method m = java.util.Arrays.stream(type.getMethods()).filter(x -> x.getName().equals(method)).findFirst().orElseThrow();
        assertThat(m.getAnnotation(org.springframework.transaction.annotation.Transactional.class))
                .as("register sem transação externa: a violação não pode marcar rollback-only").isNull();
    }

    @Test
    void validacoesDoFormularioVoltamPorCampoENomesReservadosDao422NomeReservado() {
        ApiException e = catchThrowableOfType(ApiException.class, () -> registration.register(
                new RegistrationService.RegisterCommand("ADMIN", "M", "a", "nao-e-email", "curta", "outra", "123", false), ctx));
        assertThat(e.status()).isEqualTo(422);
        assertThat(e.code()).isEqualTo(ApiException.VALIDACAO);
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> fields = (java.util.Map<String, Object>) e.details().get("fields");
        assertThat(fields).containsKeys("profileType", "fullName", "username", "email", "password", "confirmPassword", "phone", "acceptTerms");
        ApiException semAceite = catchThrowableOfType(ApiException.class, () -> registration.register(
                new RegistrationService.RegisterCommand("EMPREGADO", "Maria da Silva", "maria", "m@exemplo.gov.br", password, password, null, null), ctx));
        assertThat(((java.util.Map<?, ?>) semAceite.details().get("fields")).keySet().stream().map(String::valueOf).toList()).containsExactly("acceptTerms");
        for (String reserved : List.of("admin", "ROOT", "Suporte", "secid", "decia", "workstation", "demo_1", "e2e_x")) {
            ApiException r = catchThrowableOfType(ApiException.class, () -> registration.register(cmd("EMPREGADO", reserved, "x@exemplo.gov.br"), ctx));
            assertThat(r.status()).as(reserved).isEqualTo(422);
            assertThat(r.code()).as(reserved).isEqualTo(AuthCodes.NOME_RESERVADO);
            assertThat(r.details()).containsKey("suggestions");
        }
        assertThat(users.rows).isEmpty();
    }

    @Test
    void usernameOcupadoDa409ComSugestoesEDisponibilidadeResponde() {
        registration.register(cmd("EMPREGADO", "maria", "maria@exemplo.gov.br"), ctx);
        ApiException e = catchThrowableOfType(ApiException.class, () -> registration.register(cmd("EMPREGADO", "MARIA", "outra@exemplo.gov.br"), ctx));
        assertThat(e.status()).isEqualTo(409);
        assertThat(e.code()).isEqualTo(AuthCodes.USERNAME_EM_USO);
        assertThat(((List<?>) e.details().get("suggestions")).stream().map(String::valueOf).toList()).isNotEmpty().doesNotContain("maria");
        RegistrationService.Availability taken = registration.availability("Maria");
        assertThat(taken.available()).isFalse();
        assertThat(taken.reason()).isEqualTo("EM_USO");
        assertThat(taken.suggestions()).isNotEmpty();
        assertThat(registration.availability("admin").reason()).isEqualTo("RESERVADO");
        assertThat(registration.availability("a").reason()).isEqualTo("FORMATO");
        assertThat(registration.availability("livre.ok").available()).isTrue();
        assertThat(registration.suggestions("Maria da Silva")).allSatisfy(s -> assertThat(Usernames.problem(s)).isNull()).hasSizeLessThanOrEqualTo(5);
    }

    @Test
    void confirmacaoDoCodigoLimitaCincoTentativasPersistidasEDezPorHora() {
        registration.register(cmd("EMPRESA", "empresa.x", "empresa@exemplo.gov.br"), ctx);
        User u = users.findByUsername("empresa.x").orElseThrow();
        String code = mails.last().secret();
        String wrong = code.equals("000000") ? "111111" : "000000";
        for (int i = 1; i <= 4; i++) {
            ApiException e = catchThrowableOfType(ApiException.class, () -> registration.confirmEmail("empresa@exemplo.gov.br", wrong, null, ctx));
            assertThat(e.code()).isEqualTo(AuthCodes.CODIGO_INVALIDO);
            assertThat(e.details()).containsEntry("remainingAttempts", 5 - i);
            assertThat(codes.findOpen(u.getId(), VerificationPurpose.EMAIL_VERIFICATION).get(0).attempts()).as("attempts persistido").isEqualTo(i);
        }
        ApiException fifth = catchThrowableOfType(ApiException.class, () -> registration.confirmEmail("empresa@exemplo.gov.br", wrong, null, ctx));
        assertThat(fifth.code()).isEqualTo(AuthCodes.CODIGO_EXPIRADO);
        ApiException dead = catchThrowableOfType(ApiException.class, () -> registration.confirmEmail("empresa@exemplo.gov.br", code, null, ctx));
        assertThat(dead.code()).as("o código certo morreu no 5º erro").isEqualTo(AuthCodes.CODIGO_EXPIRADO);
        // reenvio gera código novo; o contador por hora (10) continua contando
        registration.resendVerification("empresa@exemplo.gov.br", ctx);
        String fresh = mails.last().secret();
        assertThat(fresh).isNotEqualTo(code);
        for (int i = 0; i < 4; i++) {
            catchThrowableOfType(ApiException.class, () -> registration.confirmEmail("empresa@exemplo.gov.br", wrong, null, ctx));
        }
        ApiException quota = catchThrowableOfType(ApiException.class, () -> registration.confirmEmail("empresa@exemplo.gov.br", fresh, null, ctx));
        assertThat(quota.status()).as("11ª tentativa na hora: 429 mesmo com o código certo").isEqualTo(429);
        assertThat(quota.code()).isEqualTo(AuthCodes.MUITAS_TENTATIVAS);
        assertThat(quota.details()).containsKey("retryAfterSeconds");
        assertThat(audit.actions()).contains(AuditActions.EMAIL_VERIFICATION_FALHA);
        assertThat(audit.dump()).doesNotContain(code).doesNotContain(fresh);
    }

    @Test
    void codigoCertoConfirmaEmpresaFicaPendenteDeValidacaoEmpregadoFicaAtivoEAbreSessao() {
        registration.register(cmd("EMPRESA", "empresa.y", "empresa@exemplo.gov.br"), ctx);
        Session s = registration.confirmEmail("Empresa@Exemplo.gov.br", mails.last().secret(), "Note", ctx);
        User empresa = users.findByUsername("empresa.y").orElseThrow();
        assertThat(empresa.isEmailVerified()).isTrue();
        assertThat(empresa.getStatus()).isEqualTo(AccountStatus.PENDING_VALIDATION);
        assertThat(s.accessToken()).startsWith("jwt:" + empresa.getId());
        assertThat(s.warnings()).anyMatch(w -> w.contains("validação"));
        registration.register(cmd("EMPREGADO", "pessoa.z", "pessoa@exemplo.gov.br"), ctx);
        registration.confirmEmail("pessoa@exemplo.gov.br", mails.last().secret(), null, ctx);
        assertThat(users.findByUsername("pessoa.z").orElseThrow().getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(audit.actions()).contains(AuditActions.EMAIL_VERIFIED);
        // já confirmado ou e-mail desconhecido: a mesma resposta genérica
        assertThat(catchThrowableOfType(ApiException.class, () -> registration.confirmEmail("pessoa@exemplo.gov.br", "123456", null, ctx)).code())
                .isEqualTo(AuthCodes.CODIGO_INVALIDO);
        assertThat(catchThrowableOfType(ApiException.class, () -> registration.confirmEmail("ninguem@exemplo.gov.br", "123456", null, ctx)).code())
                .isEqualTo(AuthCodes.CODIGO_INVALIDO);
    }

    @Test
    void reenvioESilenciosoParaEmailDesconhecidoEContaVerificadaELimitadoPorPessoa() {
        int before = mails.sent.size();
        registration.resendVerification("ninguem@exemplo.gov.br", ctx);
        assertThat(mails.sent).hasSize(before);
        registration.register(cmd("EMPREGADO", "pessoa.w", "w@exemplo.gov.br"), ctx);
        int after = mails.sent.size();
        for (int i = 0; i < 10; i++) {
            registration.resendVerification("w@exemplo.gov.br", ctx);
        }
        assertThat(mails.sent.size() - after).as("5 reenvios por hora").isEqualTo(RegistrationService.RESENDS_PER_HOUR);
        User u = users.findByUsername("pessoa.w").orElseThrow();
        assertThat(codes.findOpen(u.getId(), VerificationPurpose.EMAIL_VERIFICATION)).as("só o mais novo fica aberto").hasSize(1);
    }
}
