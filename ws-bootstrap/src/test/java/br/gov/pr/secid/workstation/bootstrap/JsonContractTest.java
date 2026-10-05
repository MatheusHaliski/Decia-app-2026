package br.gov.pr.secid.workstation.bootstrap;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contrato JSON da API com o front Next.js sob o Jackson 3 do Spring Boot 4 (que mudou padrões do Jackson 2):
 * o JsonMapper montado com o application.yml REAL precisa continuar aceitando campo desconhecido e {@code null} num
 * campo primitivo (checkbox/número não preenchido → false/0) e escrevendo datas em ISO-8601, nunca como timestamp.
 */
class JsonContractTest {

    record Payload(String name, boolean acceptTerms, int usageLimit, Instant at) {
    }

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .withInitializer(ctx -> {
                try {
                    ctx.getEnvironment().getPropertySources().addLast(new YamlPropertySourceLoader()
                            .load("application.yml", new ClassPathResource("application.yml")).get(0));
                } catch (IOException e) {
                    throw new IllegalStateException(e);
                }
            })
            .withPropertyValues("WS_DB_PASSWORD=x");

    @Test
    void nullEmPrimitivoViraPadraoECampoDesconhecidoEIgnorado() {
        runner.run(ctx -> {
            JsonMapper json = ctx.getBean(JsonMapper.class);
            Payload p = json.readValue(
                    "{\"name\":\"a\",\"acceptTerms\":null,\"usageLimit\":null,\"campoNovoDoFront\":1}", Payload.class);
            assertThat(p.name()).isEqualTo("a");
            assertThat(p.acceptTerms()).isFalse();
            assertThat(p.usageLimit()).isZero();
        });
    }

    @Test
    void datasSaemEEntramEmIso8601() {
        runner.run(ctx -> {
            JsonMapper json = ctx.getBean(JsonMapper.class);
            String out = json.writeValueAsString(Map.of("at", Instant.parse("2026-10-05T12:00:00Z")));
            assertThat(out).isEqualTo("{\"at\":\"2026-10-05T12:00:00Z\"}");
            assertThat(json.writeValueAsString(Map.of("d", LocalDate.of(2026, 10, 5)))).isEqualTo("{\"d\":\"2026-10-05\"}");
            Payload p = json.readValue("{\"name\":\"a\",\"acceptTerms\":true,\"usageLimit\":1,\"at\":\"2026-10-05T12:00:00Z\"}",
                    Payload.class);
            assertThat(p.at()).isEqualTo(Instant.parse("2026-10-05T12:00:00Z"));
        });
    }
}
