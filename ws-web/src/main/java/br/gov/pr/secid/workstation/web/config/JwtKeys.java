package br.gov.pr.secid.workstation.web.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Optional;

/**
 * Leitura das chaves RS256 (D-24): por caminho de arquivo PEM ({@code WS_JWT_*_KEY_PATH}, gerado por
 * {@code scripts/keys/generate_jwt_keys.sh}) OU pelo conteúdo PEM em variável ({@code WS_JWT_*_KEY_PEM}, com
 * {@code \n} literal aceito). Caminho tem precedência. Erros citam só a ORIGEM (caminho/variável), nunca o conteúdo.
 */
public final class JwtKeys {
    private JwtKeys() {
    }

    public static Optional<RSAPublicKey> publicKey(WsSecurityProperties.Jwt jwt) {
        if (!jwt.publicKeyPath().isEmpty()) {
            return Optional.of(readPublicKey(Path.of(jwt.publicKeyPath())));
        }
        if (!jwt.publicKeyPem().isEmpty()) {
            return Optional.of(parsePublic(jwt.publicKeyPem(), "WS_JWT_PUBLIC_KEY_PEM"));
        }
        return Optional.empty();
    }

    public static Optional<RSAPrivateKey> privateKey(WsSecurityProperties.Jwt jwt) {
        if (!jwt.privateKeyPath().isEmpty()) {
            return Optional.of(readPrivateKey(Path.of(jwt.privateKeyPath())));
        }
        if (!jwt.privateKeyPem().isEmpty()) {
            return Optional.of(parsePrivate(jwt.privateKeyPem(), "WS_JWT_PRIVATE_KEY_PEM"));
        }
        return Optional.empty();
    }

    /** Lê uma chave pública X.509 em PEM ("BEGIN PUBLIC KEY"). */
    public static RSAPublicKey readPublicKey(Path pem) {
        try {
            return parsePublic(Files.readString(pem, StandardCharsets.US_ASCII), pem.toString());
        } catch (IOException e) {
            throw new IllegalStateException("Chave pública do JWT ilegível em " + pem, e);
        }
    }

    /** Lê uma chave privada PKCS#8 em PEM ("BEGIN PRIVATE KEY"). */
    public static RSAPrivateKey readPrivateKey(Path pem) {
        try {
            return parsePrivate(Files.readString(pem, StandardCharsets.US_ASCII), pem.toString());
        } catch (IOException e) {
            throw new IllegalStateException("Chave privada do JWT ilegível em " + pem, e);
        }
    }

    static RSAPublicKey parsePublic(String pem, String source) {
        try {
            return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(der(pem)));
        } catch (IllegalArgumentException | NoSuchAlgorithmException | InvalidKeySpecException | ClassCastException e) {
            throw new IllegalStateException("Chave pública do JWT inválida em " + source, e);
        }
    }

    static RSAPrivateKey parsePrivate(String pem, String source) {
        try {
            return (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der(pem)));
        } catch (IllegalArgumentException | NoSuchAlgorithmException | InvalidKeySpecException | ClassCastException e) {
            throw new IllegalStateException("Chave privada do JWT inválida em " + source, e);
        }
    }

    private static byte[] der(String pem) {
        String body = pem.replace("\\n", "\n").replaceAll("-----[A-Z ]+-----", "").replaceAll("\\s", "");
        return Base64.getDecoder().decode(body);
    }
}
