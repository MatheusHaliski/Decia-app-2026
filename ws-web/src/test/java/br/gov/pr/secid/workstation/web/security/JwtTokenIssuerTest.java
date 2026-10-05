package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.AuthenticatedUser;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.web.config.JwtConfig;
import br.gov.pr.secid.workstation.web.config.WsSecurityProperties;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Chaves geradas na hora; o token emitido é aceito pelo JwtDecoder real do JwtConfig com as mesmas iss/aud. */
class JwtTokenIssuerTest {
    private static KeyPair pair;
    private static final AuthenticatedUser MARIA = new AuthenticatedUser(UUID.randomUUID(), "maria", Role.USER, ProfileType.EMPREGADO);

    @BeforeAll
    static void keys() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        pair = gen.generateKeyPair();
    }

    private static Path pem(Path dir, String name, String type, byte[] der) throws Exception {
        String b64 = Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(der);
        Path f = dir.resolve(name);
        Files.writeString(f, "-----BEGIN " + type + "-----\n" + b64 + "\n-----END " + type + "-----\n");
        return f;
    }

    private static WsSecurityProperties props(String priv, String pub) {
        return new WsSecurityProperties(new WsSecurityProperties.Jwt("ws-test", "ws-api", pub, priv), null, null);
    }

    @Test
    void tokenEmitidoEAceitoPeloDecodificadorComOsClaimsDaSessao(@TempDir Path dir) throws Exception {
        Path priv = pem(dir, "jwt-private.pem", "PRIVATE KEY", pair.getPrivate().getEncoded());
        Path pub = pem(dir, "jwt-public.pem", "PUBLIC KEY", pair.getPublic().getEncoded());
        Instant now = Instant.now();
        JwtTokenIssuer issuer = new JwtTokenIssuer(props(priv.toString(), pub.toString()), Duration.ofMinutes(10),
                Clock.fixed(now, ZoneOffset.UTC));
        assertThat(issuer.canIssue()).isTrue();
        assertThat(issuer.accessTokenTtl()).isEqualTo(Duration.ofMinutes(10));
        UUID sid = UUID.randomUUID();
        String token = issuer.issueAccessToken(MARIA, sid);

        JwtDecoder decoder = new JwtConfig().jwtDecoder(props("", pub.toString()));
        Jwt jwt = decoder.decode(token);
        assertThat(jwt.getSubject()).isEqualTo(MARIA.id().toString());
        assertThat(jwt.getClaimAsString("iss")).isEqualTo("ws-test");
        assertThat(jwt.getAudience()).containsExactly("ws-api");
        assertThat(jwt.getClaimAsString("sid")).isEqualTo(sid.toString());
        assertThat(jwt.getClaimAsString("role")).isEqualTo("USER");
        assertThat(jwt.getClaimAsString("profile_type")).isEqualTo("EMPREGADO");
        assertThat(jwt.getClaimAsString("username")).isEqualTo("maria");
        assertThat(jwt.getId()).isNotBlank();
        assertThat(jwt.getExpiresAt()).isEqualTo(now.plus(Duration.ofMinutes(10)).truncatedTo(java.time.temporal.ChronoUnit.SECONDS));
        assertThat(jwt.getHeaders()).containsEntry("alg", "RS256");
        // dois tokens da mesma sessão têm jti diferentes
        assertThat(issuer.issueAccessToken(MARIA, sid)).isNotEqualTo(token);
        // token de outra chave não é aceito
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        Path outra = pem(dir, "outra.pem", "PRIVATE KEY", gen.generateKeyPair().getPrivate().getEncoded());
        String forjado = new JwtTokenIssuer(props(outra.toString(), ""), null, Clock.systemUTC()).issueAccessToken(MARIA, sid);
        assertThatThrownBy(() -> decoder.decode(forjado)).isInstanceOf(JwtException.class);
    }

    @Test
    void semChavePrivadaAInstanciaSobeMasOLoginResponde503() {
        JwtTokenIssuer issuer = new JwtTokenIssuer(props("", ""), Duration.ZERO, Clock.systemUTC());
        assertThat(issuer.canIssue()).isFalse();
        assertThat(issuer.accessTokenTtl()).isEqualTo(JwtTokenIssuer.DEFAULT_TTL);
        assertThatThrownBy(() -> issuer.issueAccessToken(MARIA, UUID.randomUUID()))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> {
                    assertThat(((ApiException) e).status()).isEqualTo(503);
                    assertThat(((ApiException) e).code()).isEqualTo(JwtTokenIssuer.AUTENTICACAO_INDISPONIVEL);
                });
    }

    @Test
    void chaveInvalidaFalhaNoBootSemVazarOConteudo(@TempDir Path dir) throws Exception {
        Path lixo = dir.resolve("lixo.pem");
        Files.writeString(lixo, "-----BEGIN PRIVATE KEY-----\nCONTEUDO-SECRETO-INVALIDO\n-----END PRIVATE KEY-----\n");
        assertThatThrownBy(() -> new JwtTokenIssuer(props(lixo.toString(), ""), null, Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("lixo.pem")
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain("CONTEUDO-SECRETO"));
        assertThatThrownBy(() -> JwtTokenIssuer.readPrivateKey(dir.resolve("nao-existe.pem"))).isInstanceOf(IllegalStateException.class);
        assertThat(List.of()).isEmpty();
    }
}
