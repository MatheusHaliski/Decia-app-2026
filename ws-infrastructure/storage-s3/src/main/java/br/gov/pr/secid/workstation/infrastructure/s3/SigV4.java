package br.gov.pr.secid.workstation.infrastructure.s3;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Map;
import java.util.StringJoiner;
import java.util.TreeMap;

/**
 * AWS Signature Version 4 para S3 (e compatíveis: MinIO, Ceph RGW), só com a JDK — o AWS SDK não está no repositório Maven offline do
 * projeto (Q-168), e o protocolo de assinatura é público e estável. Implementa o algoritmo de
 * https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html: requisição canônica → texto a assinar → chave derivada
 * (data/região/serviço/{@code aws4_request}) → HMAC-SHA256. Conferido pelos exemplos publicados da AWS ({@code SigV4Test}).
 *
 * <p>Não guarda nem registra segredo: a chave secreta só entra no HMAC; {@link #toString()} não a expõe.
 */
final class SigV4 {
    static final String ALGORITHM = "AWS4-HMAC-SHA256";
    static final String UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
    static final String EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    private static final DateTimeFormatter AMZ_DATE = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);

    private final String accessKey;
    private final String secretKey;
    private final String region;
    private final String service;

    SigV4(String accessKey, String secretKey, String region, String service) {
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.region = region;
        this.service = service;
    }

    static String amzDate(Instant at) {
        return AMZ_DATE.format(at);
    }

    /**
     * Valor do cabeçalho {@code Authorization} para a requisição. {@code headers} são os cabeçalhos ASSINADOS (o {@code host} incluso), com
     * nome em minúsculas; {@code query} sem codificação (é codificada aqui).
     */
    String authorization(String method, String canonicalUri, Map<String, String> query, Map<String, String> headers, String payloadHash,
                         Instant at) {
        TreeMap<String, String> h = new TreeMap<>();
        headers.forEach((k, v) -> h.put(k.toLowerCase(java.util.Locale.ROOT), v.strip().replaceAll("\\s+", " ")));
        String signedHeaders = String.join(";", h.keySet());
        String signature = signature(method, canonicalUri, query, h, signedHeaders, payloadHash, at);
        return ALGORITHM + " Credential=" + accessKey + "/" + scope(at) + ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;
    }

    /**
     * Query string de uma URL pré-assinada de GET (só o {@code host} assinado, corpo {@code UNSIGNED-PAYLOAD}), já codificada e com a
     * assinatura no fim.
     */
    String presignedQuery(String host, String canonicalUri, Instant at, long expiresSeconds) {
        TreeMap<String, String> q = new TreeMap<>();
        q.put("X-Amz-Algorithm", ALGORITHM);
        q.put("X-Amz-Credential", accessKey + "/" + scope(at));
        q.put("X-Amz-Date", amzDate(at));
        q.put("X-Amz-Expires", Long.toString(expiresSeconds));
        q.put("X-Amz-SignedHeaders", "host");
        TreeMap<String, String> h = new TreeMap<>(Map.of("host", host));
        String signature = signature("GET", canonicalUri, q, h, "host", UNSIGNED_PAYLOAD, at);
        return canonicalQuery(q) + "&X-Amz-Signature=" + signature;
    }

    private String signature(String method, String canonicalUri, Map<String, String> query, TreeMap<String, String> headers,
                             String signedHeaders, String payloadHash, Instant at) {
        StringBuilder canonicalHeaders = new StringBuilder();
        headers.forEach((k, v) -> canonicalHeaders.append(k).append(':').append(v).append('\n'));
        String canonicalRequest = method + "\n" + canonicalUri + "\n" + canonicalQuery(query) + "\n" + canonicalHeaders + "\n" + signedHeaders
                + "\n" + payloadHash;
        String stringToSign = ALGORITHM + "\n" + amzDate(at) + "\n" + scope(at) + "\n" + sha256Hex(canonicalRequest.getBytes(StandardCharsets.UTF_8));
        byte[] key = hmac(("AWS4" + secretKey).getBytes(StandardCharsets.UTF_8), DATE.format(at));
        key = hmac(key, region);
        key = hmac(key, service);
        key = hmac(key, "aws4_request");
        return HexFormat.of().formatHex(hmac(key, stringToSign));
    }

    private String scope(Instant at) {
        return DATE.format(at) + "/" + region + "/" + service + "/aws4_request";
    }

    static String canonicalQuery(Map<String, String> query) {
        if (query == null || query.isEmpty()) {
            return "";
        }
        TreeMap<String, String> sorted = new TreeMap<>();
        query.forEach((k, v) -> sorted.put(encode(k, true), encode(v == null ? "" : v, true)));
        StringJoiner j = new StringJoiner("&");
        sorted.forEach((k, v) -> j.add(k + "=" + v));
        return j.toString();
    }

    /** Codificação URI da SigV4: só {@code A-Z a-z 0-9 - _ . ~} ficam; {@code /} fica no caminho quando {@code encodeSlash} é falso. */
    static String encode(String s, boolean encodeSlash) {
        StringBuilder sb = new StringBuilder();
        for (byte b : s.getBytes(StandardCharsets.UTF_8)) {
            char c = (char) (b & 0xFF);
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~'
                    || (c == '/' && !encodeSlash)) {
                sb.append(c);
            } else {
                sb.append('%').append(String.format("%02X", b & 0xFF));
            }
        }
        return sb.toString();
    }

    static String sha256Hex(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] hmac(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    public String toString() {
        return "SigV4[region=" + region + ", service=" + service + "]";
    }
}
