package br.gov.pr.secid.workstation.bootstrap.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Em produção ({@code ws.secrets.enforce=true}) um segredo vazio derruba o boot citando só o NOME da variável;
 * fora de produção o boot segue com aviso. O valor nunca aparece na mensagem.
 */
class RequiredSecretsGuardTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(RequiredSecretsGuard.class);

    @Test
    void prodComSegredoVazioNaoSobeEListaSoOsNomes() {
        runner.withPropertyValues("ws.secrets.enforce=true",
                        "ws.secrets.required.[WS_DB_PASSWORD]=",
                        "ws.secrets.required.[WS_JWT_PRIVATE_KEY_PATH]=/keys/jwt-private.pem",
                        "ws.secrets.required.[WS_JWT_PUBLIC_KEY_PATH]=   ",
                        "ws.secrets.required.[WS_DATA_ENCRYPTION_KEY]=valor-que-nao-pode-vazar")
                .run(ctx -> {
                    assertThat(ctx).hasFailed();
                    Throwable root = ctx.getStartupFailure();
                    while (root.getCause() != null && !(root instanceof IllegalStateException)) {
                        root = root.getCause();
                    }
                    String msg = String.valueOf(root.getMessage());
                    assertThat(msg).contains("WS_DB_PASSWORD").contains("WS_JWT_PUBLIC_KEY_PATH")
                            .doesNotContain("WS_JWT_PRIVATE_KEY_PATH").doesNotContain("WS_DATA_ENCRYPTION_KEY")
                            .doesNotContain("valor-que-nao-pode-vazar").doesNotContain("/keys/");
                });
    }

    @Test
    void prodComTodosOsSegredosSobe() {
        runner.withPropertyValues("ws.secrets.enforce=true",
                        "ws.secrets.required.[WS_DB_PASSWORD]=p",
                        "ws.secrets.required.[WS_JWT_PRIVATE_KEY_PATH]=/k/priv.pem",
                        "ws.secrets.required.[WS_JWT_PUBLIC_KEY_PATH]=/k/pub.pem",
                        "ws.secrets.required.[WS_DATA_ENCRYPTION_KEY]=k")
                .run(ctx -> {
                    assertThat(ctx).hasNotFailed();
                    assertThat(ctx.getBean(RequiredSecretsProperties.class).missing()).isEmpty();
                });
    }

    @Test
    void foraDeProdSegredoVazioSoAvisa() {
        runner.withPropertyValues("ws.secrets.enforce=false", "ws.secrets.required.[WS_DB_PASSWORD]=")
                .run(ctx -> {
                    assertThat(ctx).hasNotFailed();
                    assertThat(ctx.getBean(RequiredSecretsProperties.class).missing()).containsExactly("WS_DB_PASSWORD");
                });
    }

    @Test
    void checagemDiretaSemContexto() {
        RequiredSecretsProperties ok = new RequiredSecretsProperties(true, Map.of("A", "1"));
        assertThatCode(() -> RequiredSecretsGuard.check(ok)).doesNotThrowAnyException();
        RequiredSecretsProperties falta = new RequiredSecretsProperties(true, Map.of("B", "", "A", "1", "C", " "));
        assertThat(falta.missing()).containsExactly("B", "C");
        assertThatThrownBy(() -> RequiredSecretsGuard.check(falta)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("B, C");
        assertThat(new RequiredSecretsProperties(false, null).required()).isEmpty();
    }
}
