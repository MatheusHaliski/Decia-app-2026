package br.gov.pr.secid.workstation.infrastructure.s3;

import br.gov.pr.secid.workstation.application.media.MediaKeys;
import br.gov.pr.secid.workstation.application.media.MediaStoragePort;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * {@link MediaStoragePort} em S3 compatível (MinIO, AWS S3, Ceph RGW) — {@code ws.storage.type=s3}. Cliente HTTP da JDK + assinatura
 * {@link SigV4} (o AWS SDK não está disponível offline no build; Q-168): PUT/GET/DELETE de objeto e URL pré-assinada de GET.
 * <ul>
 *   <li>Chave: só no formato de {@link MediaKeys} (o nome enviado nunca vira caminho), codificada segmento a segmento.</li>
 *   <li>Endereço: estilo caminho ({@code endpoint/bucket/chave}, padrão — é o que o MinIO usa) ou virtual-host ({@code bucket.endpoint/chave}).</li>
 *   <li>PUT assina o SHA-256 do corpo ({@code x-amz-content-sha256}): o servidor recusa corpo alterado no caminho.</li>
 *   <li>Leitura em fluxo ({@link #open}): o download não carrega o arquivo inteiro na memória da API.</li>
 *   <li>URL pré-assinada só com {@code presign=true} (o endpoint precisa ser alcançável pelo navegador); senão a leitura passa pela API
 *       depois do {@code ResourceAuthorizer}, como no disco local.</li>
 * </ul>
 * Erros não trazem a chave nem credenciais na mensagem.
 */
public class S3MediaStorage implements MediaStoragePort {
    private final URI endpoint;
    private final String bucket;
    private final boolean pathStyle;
    private final boolean presign;
    private final SigV4 signer;
    private final HttpClient http;
    private final Clock clock;
    private final Duration timeout;

    public S3MediaStorage(URI endpoint, String region, String bucket, String accessKey, String secretKey, boolean pathStyle, boolean presign,
                          HttpClient http, Clock clock, Duration timeout) {
        if (endpoint == null || endpoint.getHost() == null || !("http".equals(endpoint.getScheme()) || "https".equals(endpoint.getScheme()))) {
            throw new IllegalArgumentException("ws.storage.s3.endpoint precisa ser uma URL http(s) com host");
        }
        if (bucket == null || !bucket.matches("[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]")) {
            throw new IllegalArgumentException("ws.storage.s3.bucket inválido (regras de nome de bucket S3)");
        }
        if (accessKey == null || accessKey.isBlank() || secretKey == null || secretKey.isBlank()) {
            throw new IllegalArgumentException("ws.storage.s3.access-key e secret-key são obrigatórios com ws.storage.type=s3");
        }
        String path = endpoint.getRawPath() == null ? "" : endpoint.getRawPath();
        String basePath = path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
        this.endpoint = URI.create(endpoint.getScheme() + "://" + endpoint.getRawAuthority() + basePath);
        this.bucket = bucket;
        this.pathStyle = pathStyle;
        this.presign = presign;
        this.signer = new SigV4(accessKey.strip(), secretKey.strip(), region == null || region.isBlank() ? "us-east-1" : region.strip(), "s3");
        this.http = http;
        this.clock = clock;
        this.timeout = timeout == null ? Duration.ofSeconds(60) : timeout;
    }

    @Override
    public void put(String key, byte[] content, String mime) {
        byte[] body = content == null ? new byte[0] : content;
        String hash = SigV4.sha256Hex(body);
        Map<String, String> extra = new LinkedHashMap<>();
        extra.put("content-type", mime == null || mime.isBlank() ? "application/octet-stream" : mime);
        HttpResponse<Void> r = send("PUT", key, extra, hash, HttpRequest.BodyPublishers.ofByteArray(body), HttpResponse.BodyHandlers.discarding());
        if (r.statusCode() / 100 != 2) {
            throw new IllegalStateException("falha ao gravar mídia no S3 (HTTP " + r.statusCode() + ")");
        }
    }

    @Override
    public byte[] read(String key) {
        try (InputStream in = open(key)) {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("falha ao ler mídia do S3", e);
        }
    }

    @Override
    public InputStream open(String key) {
        HttpResponse<InputStream> r = send("GET", key, Map.of(), SigV4.EMPTY_SHA256, HttpRequest.BodyPublishers.noBody(),
                HttpResponse.BodyHandlers.ofInputStream());
        if (r.statusCode() == 200) {
            return r.body();
        }
        closeQuietly(r.body());
        if (r.statusCode() == 404) {
            throw new IllegalStateException("mídia ausente no storage");
        }
        throw new IllegalStateException("falha ao ler mídia do S3 (HTTP " + r.statusCode() + ")");
    }

    @Override
    public void delete(String key) {
        HttpResponse<Void> r = send("DELETE", key, Map.of(), SigV4.EMPTY_SHA256, HttpRequest.BodyPublishers.noBody(),
                HttpResponse.BodyHandlers.discarding());
        if (r.statusCode() / 100 != 2 && r.statusCode() != 404) {
            throw new IllegalStateException("falha ao apagar mídia no S3 (HTTP " + r.statusCode() + ")");
        }
    }

    @Override
    public Optional<URI> signedReadUrl(String key, Duration ttl) {
        if (!presign) {
            return Optional.empty();
        }
        long seconds = Math.max(1, Math.min(ttl == null ? 60 : ttl.toSeconds(), 604_800));
        Target t = target(key);
        return Optional.of(URI.create(t.uri() + "?" + signer.presignedQuery(t.host(), t.canonicalPath(), clock.instant(), seconds)));
    }

    // ------------------------------------------------------------------------------------------------ internos

    /** Endereço do objeto: URI completa, caminho canônico (codificado) e o {@code host} como o cliente HTTP vai enviar. */
    record Target(URI uri, String canonicalPath, String host) {
    }

    Target target(String key) {
        if (!MediaKeys.isValid(key)) {
            throw new IllegalArgumentException("chave de mídia fora do formato");
        }
        String encodedKey = SigV4.encode(key, false);
        String base = endpoint.getRawPath();
        String host = hostHeader(endpoint, pathStyle ? null : bucket);
        String path = pathStyle ? base + "/" + bucket + "/" + encodedKey : base + "/" + encodedKey;
        String authority = pathStyle ? endpoint.getRawAuthority() : bucket + "." + endpoint.getRawAuthority();
        return new Target(URI.create(endpoint.getScheme() + "://" + authority + path), path, host);
    }

    /** O {@code Host} que o {@link HttpClient} da JDK envia: porta só quando não é a padrão do esquema. */
    static String hostHeader(URI endpoint, String bucketPrefix) {
        String host = (bucketPrefix == null ? "" : bucketPrefix + ".") + endpoint.getHost().toLowerCase(Locale.ROOT);
        int port = endpoint.getPort();
        boolean defaultPort = port == -1 || ("https".equals(endpoint.getScheme()) && port == 443) || ("http".equals(endpoint.getScheme()) && port == 80);
        return defaultPort ? host : host + ":" + port;
    }

    private <T> HttpResponse<T> send(String method, String key, Map<String, String> extraSigned, String payloadHash,
                                     HttpRequest.BodyPublisher body, HttpResponse.BodyHandler<T> handler) {
        Target t = target(key);
        Instant now = clock.instant();
        Map<String, String> signed = new LinkedHashMap<>(extraSigned);
        signed.put("host", t.host());
        signed.put("x-amz-content-sha256", payloadHash);
        signed.put("x-amz-date", SigV4.amzDate(now));
        HttpRequest.Builder b = HttpRequest.newBuilder(t.uri()).timeout(timeout).method(method, body)
                .header("Authorization", signer.authorization(method, t.canonicalPath(), Map.of(), signed, payloadHash, now));
        signed.forEach((k, v) -> {
            if (!k.equals("host")) {
                b.header(k, v);
            }
        });
        try {
            return http.send(b.build(), handler);
        } catch (IOException e) {
            throw new UncheckedIOException("S3 indisponível", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("chamada ao S3 interrompida", e);
        }
    }

    private static void closeQuietly(InputStream in) {
        try {
            if (in != null) {
                in.close();
            }
        } catch (IOException ignored) {
            // corpo de erro descartado
        }
    }
}
