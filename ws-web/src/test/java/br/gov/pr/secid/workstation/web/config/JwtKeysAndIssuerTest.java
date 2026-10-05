package br.gov.pr.secid.workstation.web.config;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.TokenIssuerPort;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
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

/** D-24 (chave por caminho OU PEM), RF2.CA13 (iss/aud/sid/sub/role, TTL 15 min). Chaves geradas por execução — nenhuma versionada. */
class JwtKeysAndIssuerTest {
    private static KeyPair pair;
    private static String publicPem;
    private static String privatePem;

    @BeforeAll
    static void keys() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        pair = gen.generateKeyPair();
        publicPem = pem("PUBLIC KEY", pair.getPublic().getEncoded());
        privatePem = pem("PRIVATE KEY", pair.getPrivate().getEncoded());
    }

    private static String pem(String type, byte[] der) {
        String b64 = Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(der);
        return "-----BEGIN " + type + "-----\n" + b64 + "\n-----END " + type + "-----\n";
    }

    private static WsSecurityProperties props(String pubPath, String privPath, String pubPem, String privPem) {
        return new WsSecurityProperties(new WsSecurityProperties.Jwt("ws-test", "ws-api", pubPath, privPath, pubPem, privPem, 0),
                new WsSecurityProperties.Cors(List.of("http://localhost:3000")));
    }

    private static User user() {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername("maria.silva");
        u.setRole(Role.USER);
        u.setProfileType(ProfileType.EMPREGADO);
        return u;
    }

    @Test
    void chavesPorCaminhoOuPorPemSaoEquivalentes(@TempDir Path dir) throws Exception {
        Path pub = dir.resolve("jwt-public.pem");
        Path priv = dir.resolve("jwt-private.pem");
        Files.writeString(pub, publicPem);
        Files.writeString(priv, privatePem);
        WsSecurityProperties byPath = props(pub.toString(), priv.toString(), "", "");
        WsSecurityProperties byPem = props("", "", publicPem, privatePem.replace("\n", "\\n"));
        assertThat(JwtKeys.publicKey(byPath.jwt()).orElseThrow().getEncoded()).isEqualTo(JwtKeys.publicKey(byPem.jwt()).orElseThrow().getEncoded());
        assertThat(JwtKeys.privateKey(byPath.jwt()).orElseThrow().getEncoded()).isEqualTo(JwtKeys.privateKey(byPem.jwt()).orElseThrow().getEncoded());
        // caminho tem precedência sobre PEM
        assertThat(JwtKeys.publicKey(props(pub.toString(), "", "lixo", "").jwt())).isPresent();
        assertThat(JwtKeys.publicKey(props("", "", "", "").jwt())).isEmpty();
        assertThat(JwtKeys.privateKey(props("", "", "", "").jwt())).isEmpty();
        // token emitido com a chave lida por PEM é aceito pelo decodificador configurado por caminho
        Clock clock = Clock.fixed(Instant.now(), ZoneOffset.UTC);
        JwtConfig config = new JwtConfig();
        TokenIssuerPort issuer = config.tokenIssuer(byPem, clock);
        JwtDecoder decoder = config.jwtDecoder(byPath);
        User u = user();
        UUID sid = UUID.randomUUID();
        Jwt jwt = decoder.decode(issuer.issueAccessToken(u, sid));
        assertThat(jwt.getSubject()).isEqualTo(u.getId().toString());
        assertThat(jwt.getClaimAsString("sid")).isEqualTo(sid.toString());
        assertThat(jwt.getClaimAsString("role")).isEqualTo("USER");
        assertThat(jwt.getClaimAsString("profile_type")).isEqualTo("EMPREGADO");
        assertThat(jwt.getClaimAsString("iss")).isEqualTo("ws-test");
        assertThat(jwt.getAudience()).containsExactly("ws-api");
        assertThat(jwt.getId()).isNotBlank();
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).as("TTL 15 min (Q-49)").isEqualTo(Duration.ofMinutes(15));
        assertThat(issuer.accessTokenTtl()).isEqualTo(Duration.ofMinutes(15));
        assertThat(jwt.getHeaders()).containsEntry("alg", "RS256").containsEntry("kid", JwtConfig.KEY_ID);
    }

    @Test
    void semChavePublicaNenhumTokenEAceitoESemPrivadaOLoginDa503() {
        JwtConfig config = new JwtConfig();
        JwtDecoder decoder = config.jwtDecoder(props("", "", "", ""));
        TokenIssuerPort withKeys = config.tokenIssuer(props("", "", publicPem, privatePem), Clock.systemUTC());
        String token = withKeys.issueAccessToken(user(), UUID.randomUUID());
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);

        TokenIssuerPort noPrivate = config.tokenIssuer(props("", "", publicPem, ""), Clock.systemUTC());
        ApiException e = org.assertj.core.api.Assertions.catchThrowableOfType(ApiException.class,
                () -> noPrivate.issueAccessToken(user(), UUID.randomUUID()));
        assertThat(e.status()).isEqualTo(503);
        assertThat(e.code()).isEqualTo(AuthCodes.AUTENTICACAO_INDISPONIVEL);
    }

    @Test
    void decodificadorValidaIssuerAudienceEExpiracao() throws Exception {
        JwtConfig config = new JwtConfig();
        JwtDecoder decoder = config.jwtDecoder(props("", "", publicPem, ""));
        TokenIssuerPort outroIssuer = new JwtConfig().tokenIssuer(new WsSecurityProperties(
                new WsSecurityProperties.Jwt("outro", "ws-api", "", "", publicPem, privatePem, 0), null), Clock.systemUTC());
        TokenIssuerPort outraAud = new JwtConfig().tokenIssuer(new WsSecurityProperties(
                new WsSecurityProperties.Jwt("ws-test", "outra-api", "", "", publicPem, privatePem, 0), null), Clock.systemUTC());
        TokenIssuerPort vencido = new JwtConfig().tokenIssuer(props("", "", publicPem, privatePem),
                Clock.fixed(Instant.now().minus(Duration.ofHours(2)), ZoneOffset.UTC));
        assertThatThrownBy(() -> decoder.decode(outroIssuer.issueAccessToken(user(), UUID.randomUUID()))).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder.decode(outraAud.issueAccessToken(user(), UUID.randomUUID()))).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder.decode(vencido.issueAccessToken(user(), UUID.randomUUID()))).isInstanceOf(JwtException.class);
        // par diferente: assinatura inválida
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair other = gen.generateKeyPair();
        TokenIssuerPort forged = new JwtConfig().tokenIssuer(props("", "", pem("PUBLIC KEY", other.getPublic().getEncoded()),
                pem("PRIVATE KEY", other.getPrivate().getEncoded())), Clock.systemUTC());
        assertThatThrownBy(() -> decoder.decode(forged.issueAccessToken(user(), UUID.randomUUID()))).isInstanceOf(JwtException.class);
    }

    @Test
    void arquivoInvalidoFalhaSemVazarConteudo(@TempDir Path dir) throws Exception {
        Path pem = dir.resolve("lixo.pem");
        Files.writeString(pem, "-----BEGIN PUBLIC KEY-----\nCONTEUDO-SECRETO-INVALIDO\n-----END PUBLIC KEY-----\n");
        assertThatThrownBy(() -> JwtKeys.readPublicKey(pem)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("lixo.pem").satisfies(e -> assertThat(e.getMessage()).doesNotContain("CONTEUDO-SECRETO"));
        assertThatThrownBy(() -> JwtKeys.readPrivateKey(pem)).isInstanceOf(IllegalStateException.class)
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain("CONTEUDO-SECRETO"));
        assertThatThrownBy(() -> JwtKeys.readPublicKey(dir.resolve("nao-existe.pem"))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> JwtKeys.readPrivateKey(dir.resolve("nao-existe.pem"))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> JwtKeys.parsePrivate(pemFalso("PRIVATE KEY", "SEGREDO-FALSO"), "WS_JWT_PRIVATE_KEY_PEM"))
                .hasMessageContaining("WS_JWT_PRIVATE_KEY_PEM").satisfies(e -> assertThat(e.getMessage()).doesNotContain("SEGREDO-FALSO"));
    }

    @Test
    void propriedadesTemPadroesSeguros() {
        WsSecurityProperties p = new WsSecurityProperties(null, null);
        assertThat(p.jwt().issuer()).isEqualTo("work-station");
        assertThat(p.jwt().audience()).isEqualTo("work-station-api");
        assertThat(p.jwt().hasPublicKey()).isFalse();
        assertThat(p.jwt().hasPrivateKey()).isFalse();
        assertThat(p.jwt().accessTtlMinutes()).isEqualTo(15);
        assertThat(p.cors().allowedOrigins()).containsExactly("http://localhost:3000");
        WsSecurityProperties q = new WsSecurityProperties(new WsSecurityProperties.Jwt(" ", null, " /k.pem ", null),
                new WsSecurityProperties.Cors(List.of(" https://a ", "", "https://b")));
        assertThat(q.jwt().publicKeyPath()).isEqualTo("/k.pem");
        assertThat(q.jwt().hasPublicKey()).isTrue();
        assertThat(q.cors().allowedOrigins()).containsExactly("https://a", "https://b");
        assertThat(new WsSecurityProperties.Jwt(null, null, null, null, "x", "y", 10).accessTtlMinutes()).isEqualTo(10);
    }

    /** PEM inválido montado em partes: um bloco literal "BEGIN … PRIVATE KEY" no fonte dispararia o gitleaks do CI. */
    private static String pemFalso(String tipo, String corpo) {
        String cerca = "-----";
        return cerca + "BEGIN " + tipo + cerca + "\n" + corpo + "\n" + cerca + "END " + tipo + cerca;
    }
}
