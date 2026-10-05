package br.gov.pr.secid.workstation.bootstrap.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.LoggingEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveDataMaskingConverterTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "login falhou password=Sup3rSecr3ta! user=ana          | Sup3rSecr3ta!",
            "config: senha: minhaSenha123                          | minhaSenha123",
            "{\"token\":\"abc.def.ghi\"}                            | abc.def.ghi",
            "Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1MSJ9.c2lnbmF0dXJl | eyJhbGciOiJSUzI1NiJ9",
            "jdbc:mysql://ws:S3nh4Forte@db:3306/workstation         | S3nh4Forte",
            "api_key=sk-live-123456 enviado                        | sk-live-123456",
            "WS_DATA_ENCRYPTION_KEY=YWJjZGVmZ2hpamtsbW5vcA==        | YWJjZGVmZ2hpamtsbW5vcA==",
            "client_secret: xyz-987                                | xyz-987",
    })
    void mascaraSegredosConhecidos(String message, String secret) {
        String masked = SensitiveDataMaskingConverter.mask(message);
        assertThat(masked).doesNotContain(secret).contains("***");
    }

    @Test
    void preservaOQueNaoESegredo() {
        String msg = "Usuário u1 abriu a sessão DECIA 42 em 2026-10-05T12:00:00Z (correlationId=abc-123)";
        assertThat(SensitiveDataMaskingConverter.mask(msg)).isEqualTo(msg);
        assertThat(SensitiveDataMaskingConverter.mask("")).isEmpty();
        assertThat(SensitiveDataMaskingConverter.mask(null)).isNull();
        // a palavra "token" sozinha, sem valor, não é mascarada
        assertThat(SensitiveDataMaskingConverter.mask("token expirado para o usuário")).isEqualTo("token expirado para o usuário");
    }

    @Test
    void funcionaComoConversorDoLogback() {
        LoggerContext ctx = new LoggerContext();
        Logger logger = ctx.getLogger("teste");
        LoggingEvent event = new LoggingEvent("x", logger, Level.INFO, "falha com password={} para {}", null,
                new Object[]{"segredo-real", "ana"});
        SensitiveDataMaskingConverter converter = new SensitiveDataMaskingConverter();
        converter.start();
        String out = converter.convert(event);
        assertThat(out).isEqualTo("falha com password=*** para ana");
    }
}
