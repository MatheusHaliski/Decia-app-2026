package br.gov.pr.secid.workstation.bootstrap;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * application*.yml sem padrões inseguros: senha do MySQL obrigatória (nada de "change-me"), TLS preferido/obrigatório,
 * sem allowPublicKeyRetrieval por padrão, documentação e health fechados em prod, e os segredos obrigatórios mapeados
 * só pelo NOME da variável.
 */
class ApplicationYmlSecurityTest {

    /** Ambiente só com o documento padrão do application.yml (+ perfil opcional) e as variáveis dadas — nada da máquina. */
    private static StandardEnvironment env(String profileFile, String... kv) throws Exception {
        Map<String, Object> vars = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            vars.put(kv[i], kv[i + 1]);
        }
        StandardEnvironment env = new StandardEnvironment();
        env.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        env.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        env.getPropertySources().addFirst(new MapPropertySource("variaveis", vars));
        if (profileFile != null) {
            env.getPropertySources().addLast(new YamlPropertySourceLoader().load(profileFile, new ClassPathResource(profileFile)).get(0));
        }
        env.getPropertySources().addLast(new YamlPropertySourceLoader().load("application.yml", new ClassPathResource("application.yml")).get(0));
        return env;
    }

    private static String read(String file) throws Exception {
        return new String(new ClassPathResource(file).getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    @Test
    void nenhumArquivoTrazSenhaOuChavePadrao() throws Exception {
        for (String f : List.of("application.yml", "application-dev.yml", "application-test.yml", "application-prod.yml")) {
            String yml = read(f);
            assertThat(yml).as(f).doesNotContainIgnoringCase("change-me").doesNotContainIgnoringCase("changeit")
                    .doesNotContain("allowPublicKeyRetrieval=true").doesNotContain("BEGIN PRIVATE KEY")
                    .doesNotContainPattern("(?i)password:\\s*[A-Za-z0-9]{4,}")   // password: literal (só placeholder ${...})
                    .doesNotContainPattern("\\$\\{WS_DB_PASSWORD:[^}]+}");          // nunca um valor padrão para a senha do banco
        }
    }

    @Test
    void senhaDoBancoEObrigatoriaSemPadrao() throws Exception {
        assertThatThrownBy(() -> env(null).getProperty("spring.datasource.password"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("WS_DB_PASSWORD");
        assertThat(env(null, "WS_DB_PASSWORD", "x").getProperty("spring.datasource.password")).isEqualTo("x");
    }

    @Test
    void tlsPreferidoPorPadraoEObrigatorioEmProd() throws Exception {
        assertThat(env(null, "WS_DB_PASSWORD", "x").getProperty("spring.datasource.url"))
                .contains("sslMode=PREFERRED").contains("allowPublicKeyRetrieval=false");
        assertThat(env("application-prod.yml", "WS_DB_PASSWORD", "x", "WS_DB_HOST", "db", "WS_DB_NAME", "ws")
                .getProperty("spring.datasource.url")).contains("sslMode=REQUIRED").contains("allowPublicKeyRetrieval=false");
    }

    @Test
    void prodExigeOsSegredosEFechaDocumentacaoEHealth() throws Exception {
        StandardEnvironment prod = env("application-prod.yml", "WS_DB_PASSWORD", "x", "WS_DB_HOST", "db", "WS_DB_NAME", "ws");
        assertThat(prod.getProperty("ws.secrets.enforce", Boolean.class)).isTrue();
        assertThat(prod.getProperty("springdoc.api-docs.enabled", Boolean.class)).isFalse();
        assertThat(prod.getProperty("springdoc.swagger-ui.enabled", Boolean.class)).isFalse();
        assertThat(prod.getProperty("management.endpoint.health.show-details")).isEqualTo("never");
        assertThat(prod.getProperty("management.endpoints.web.exposure.include")).isEqualTo("health");
        assertThat(prod.getProperty("spring.web.error.include-stacktrace")).isEqualTo("never");
        // dev e test não travam, mas também não trazem valores
        assertThat(env("application-dev.yml", "WS_DB_PASSWORD", "x").getProperty("ws.secrets.enforce", Boolean.class)).isFalse();
        assertThat(env("application-test.yml").getProperty("ws.secrets.enforce", Boolean.class)).isFalse();
    }

    @Test
    void segredosObrigatoriosMapeadosPeloNomeDaVariavel() throws Exception {
        StandardEnvironment e = env(null, "WS_DB_PASSWORD", "p", "WS_JWT_PRIVATE_KEY_PATH", "/k/priv.pem",
                "WS_JWT_PUBLIC_KEY_PATH", "/k/pub.pem", "WS_DATA_ENCRYPTION_KEY", "k");
        assertThat(e.getProperty("ws.secrets.required[WS_DB_PASSWORD]")).isEqualTo("p");
        assertThat(e.getProperty("ws.secrets.required[WS_JWT_PRIVATE_KEY_PATH|WS_JWT_PRIVATE_KEY_PEM]")).isEqualTo("/k/priv.pem");
        assertThat(e.getProperty("ws.secrets.required[WS_JWT_PUBLIC_KEY_PATH|WS_JWT_PUBLIC_KEY_PEM]")).isEqualTo("/k/pub.pem");
        // D-24: a chave por PEM satisfaz o mesmo requisito
        StandardEnvironment pem = env(null, "WS_DB_PASSWORD", "p", "WS_JWT_PRIVATE_KEY_PEM", "-----BEGIN", "WS_JWT_PUBLIC_KEY_PEM", "-----BEGIN");
        assertThat(pem.getProperty("ws.secrets.required[WS_JWT_PRIVATE_KEY_PATH|WS_JWT_PRIVATE_KEY_PEM]")).isEqualTo("-----BEGIN");
        assertThat(pem.getProperty("ws.security.jwt.private-key-pem")).isEqualTo("-----BEGIN");
        assertThat(pem.getProperty("ws.security.jwt.access-ttl-minutes")).isEqualTo("15");
        assertThat(pem.getProperty("ws.admin.initial-password")).isEmpty();
        assertThat(pem.getProperty("ws.admin.bootstrap-enabled")).isEqualTo("false");
        assertThat(pem.getProperty("ws.oidc.enabled")).isEqualTo("false");
        assertThat(e.getProperty("ws.secrets.required[WS_DATA_ENCRYPTION_KEY]")).isEqualTo("k");
        assertThat(e.getProperty("ws.security.jwt.public-key-path")).isEqualTo("/k/pub.pem");
        StandardEnvironment vazio = env(null, "WS_DB_PASSWORD", "p");
        assertThat(vazio.getProperty("ws.secrets.required[WS_JWT_PRIVATE_KEY_PATH|WS_JWT_PRIVATE_KEY_PEM]")).isEmpty();
        assertThat(vazio.getProperty("ws.security.jwt.public-key-path")).isEmpty();
    }

    @Test
    void jacksonEErrosComOContratoDoBoot4() throws Exception {
        StandardEnvironment e = env(null, "WS_DB_PASSWORD", "x");
        assertThat(e.getProperty("spring.jackson.deserialization.fail-on-null-for-primitives", Boolean.class)).isFalse();
        assertThat(e.getProperty("spring.jackson.deserialization.fail-on-unknown-properties", Boolean.class)).isFalse();
        assertThat(e.getProperty("spring.jackson.datatype.datetime.write-dates-as-timestamps", Boolean.class)).isFalse();
        assertThat(e.getProperty("spring.web.error.include-stacktrace")).isEqualTo("never");
        assertThat(e.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("none");
        assertThat(e.getProperty("ws.redis.enabled", Boolean.class)).isFalse();
        assertThat(e.getProperty("ws.cassandra.enabled", Boolean.class)).isFalse();
        assertThat(e.getProperty("ws.opensearch.enabled", Boolean.class)).isFalse();
        assertThat(e.getProperty("ws.ai.remote-enabled", Boolean.class)).isFalse();
    }
}
