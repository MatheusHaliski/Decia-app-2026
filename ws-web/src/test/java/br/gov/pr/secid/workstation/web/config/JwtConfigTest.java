package br.gov.pr.secid.workstation.web.config;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
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
import java.security.interfaces.RSAPrivateKey;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Chaves geradas na hora em cada execução — nenhuma chave versionada. */
class JwtConfigTest {
    private static KeyPair pair;

    @BeforeAll
    static void keys() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        pair = gen.generateKeyPair();
    }

    private static Path writePublicPem(Path dir) throws Exception {
        String b64 = Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(pair.getPublic().getEncoded());
        Path pem = dir.resolve("jwt-public.pem");
        Files.writeString(pem, "-----BEGIN PUBLIC KEY-----\n" + b64 + "\n-----END PUBLIC KEY-----\n");
        return pem;
    }

    private static String sign(String issuer, String audience, Instant exp) throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder().subject("u1").issuer(issuer).audience(audience)
                .claim("role", "EMPREGADO").expirationTime(Date.from(exp)).issueTime(new Date()).build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
        jwt.sign(new RSASSASigner((RSAPrivateKey) pair.getPrivate()));
        return jwt.serialize();
    }

    private static WsSecurityProperties props(String publicKeyPath) {
        return new WsSecurityProperties(new WsSecurityProperties.Jwt("ws-test", "ws-api", publicKeyPath, ""),
                new WsSecurityProperties.Cors(List.of("http://localhost:3000")));
    }

    @Test
    void semChaveNenhumTokenEAceito() throws Exception {
        JwtDecoder decoder = new JwtConfig().jwtDecoder(props(""));
        String token = sign("ws-test", "ws-api", Instant.now().plusSeconds(60));
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void comChaveValidaIssuerAudienceEExpiracao(@TempDir Path dir) throws Exception {
        JwtDecoder decoder = new JwtConfig().jwtDecoder(props(writePublicPem(dir).toString()));
        Jwt ok = decoder.decode(sign("ws-test", "ws-api", Instant.now().plusSeconds(60)));
        assertThat(ok.getSubject()).isEqualTo("u1");
        assertThat(ok.getClaimAsString("role")).isEqualTo("EMPREGADO");
        assertThatThrownBy(() -> decoder.decode(sign("outro", "ws-api", Instant.now().plusSeconds(60))))
                .isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder.decode(sign("ws-test", "outra-api", Instant.now().plusSeconds(60))))
                .isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder.decode(sign("ws-test", "ws-api", Instant.now().minusSeconds(600))))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void arquivoInvalidoFalhaSemVazarConteudo(@TempDir Path dir) throws Exception {
        Path pem = dir.resolve("lixo.pem");
        Files.writeString(pem, "-----BEGIN PUBLIC KEY-----\nCONTEUDO-SECRETO-INVALIDO\n-----END PUBLIC KEY-----\n");
        assertThatThrownBy(() -> JwtConfig.readPublicKey(pem))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("lixo.pem")
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain("CONTEUDO-SECRETO"));
        assertThatThrownBy(() -> JwtConfig.readPublicKey(dir.resolve("nao-existe.pem")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void propriedadesTemPadroesSeguros() {
        WsSecurityProperties p = new WsSecurityProperties(null, null);
        assertThat(p.jwt().issuer()).isEqualTo("work-station");
        assertThat(p.jwt().audience()).isEqualTo("work-station-api");
        assertThat(p.jwt().hasPublicKey()).isFalse();
        assertThat(p.cors().allowedOrigins()).containsExactly("http://localhost:3000");
        WsSecurityProperties q = new WsSecurityProperties(new WsSecurityProperties.Jwt(" ", null, " /k.pem ", null),
                new WsSecurityProperties.Cors(List.of(" https://a ", "", "https://b")));
        assertThat(q.jwt().publicKeyPath()).isEqualTo("/k.pem");
        assertThat(q.cors().allowedOrigins()).containsExactly("https://a", "https://b");
    }
}
