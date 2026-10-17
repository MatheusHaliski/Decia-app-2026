package br.gov.pr.secid.workstation.web.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regressão da auditoria 17/10/2026: com dois construtores no record {@code Jwt} e nenhum marcado, o Spring não ligava as chaves
 * e o login respondia 503 com as variáveis definidas. Liga pelo {@link Binder}, como o Boot faz no arranque.
 */
class WsSecurityPropertiesBindingTest {

    @Test
    void ligaCaminhosEPemDasChavesETtl() {
        MapConfigurationPropertySource source = new MapConfigurationPropertySource(Map.of(
                "ws.security.jwt.public-key-path", "/run/keys/jwt.pub.pem",
                "ws.security.jwt.private-key-path", "/run/keys/jwt.pem",
                "ws.security.jwt.issuer", "emissor",
                "ws.security.jwt.access-ttl-minutes", "7",
                "ws.security.cors.allowed-origins", "https://ws.example"));
        WsSecurityProperties p = new Binder(source).bind("ws.security", WsSecurityProperties.class).get();
        assertThat(p.jwt().publicKeyPath()).isEqualTo("/run/keys/jwt.pub.pem");
        assertThat(p.jwt().privateKeyPath()).isEqualTo("/run/keys/jwt.pem");
        assertThat(p.jwt().issuer()).isEqualTo("emissor");
        assertThat(p.jwt().accessTtlMinutes()).isEqualTo(7);
        assertThat(p.jwt().hasPublicKey()).isTrue();
        assertThat(p.jwt().hasPrivateKey()).isTrue();
    }
}
