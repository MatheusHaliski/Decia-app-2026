package br.gov.pr.secid.workstation.infrastructure.s3;

import br.gov.pr.secid.workstation.application.media.DetectedType;
import br.gov.pr.secid.workstation.application.media.MediaKeys;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link S3MediaStorage} contra um S3 FALSO em HTTP local (estilo caminho, como o MinIO): o falso confere a assinatura SigV4 de cada
 * requisição recalculando-a com a mesma credencial (assinatura errada → 403, como o S3), o {@code x-amz-content-sha256} do corpo do PUT,
 * e guarda os objetos em memória. Prova o ciclo PUT → GET (bytes e fluxo) → DELETE, o 404 como "mídia ausente", a URL pré-assinada opcional
 * e que chave fora do formato de {@link MediaKeys} nunca vira requisição.
 */
class S3MediaStorageTest {
    private static final String ACCESS = "minio-teste";
    private static final String SECRET = "segredo-de-teste-local";
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-27T12:00:00Z"), ZoneOffset.UTC);

    private HttpServer server;
    private final Map<String, byte[]> objects = new ConcurrentHashMap<>();
    private final List<String> calls = Collections.synchronizedList(new ArrayList<>());

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/", this::handle);
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private URI endpoint() {
        return URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    }

    private S3MediaStorage storage(String secret, boolean presign) {
        return new S3MediaStorage(endpoint(), "us-east-1", "ws-media", ACCESS, secret, true, presign, HttpClient.newHttpClient(), CLOCK,
                Duration.ofSeconds(5));
    }

    private static String key() {
        return MediaKeys.objectKey(UUID.fromString("11111111-2222-3333-4444-555555555555"), MediaAccessClass.PRIVATE, "ab".repeat(32),
                DetectedType.PDF);
    }

    @Test
    void gravaLeEmFluxoEApagaComAssinaturaConferida() throws Exception {
        S3MediaStorage s = storage(SECRET, false);
        byte[] pdf = "%PDF-1.7 conteúdo".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        s.put(key(), pdf, "application/pdf");
        assertThat(objects).containsKey("/ws-media/" + key());
        assertThat(s.read(key())).isEqualTo(pdf);
        try (InputStream in = s.open(key())) {
            assertThat(in.readAllBytes()).isEqualTo(pdf);
        }
        s.delete(key());
        assertThat(objects).isEmpty();
        s.delete(key());   // apagar o que já não existe não é erro (404 do S3)
        assertThatThrownBy(() -> s.read(key())).isInstanceOf(IllegalStateException.class).hasMessageContaining("ausente");
        assertThat(calls).containsExactly("PUT", "GET", "GET", "DELETE", "DELETE", "GET");
        assertThat(s.signedReadUrl(key(), Duration.ofSeconds(60))).as("sem presign: leitura passa pela API").isEmpty();
    }

    @Test
    void credencialErradaFalhaSemVazarSegredoNemChave() {
        S3MediaStorage s = storage("outro-segredo", false);
        assertThatThrownBy(() -> s.put(key(), new byte[] {1}, "application/pdf"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("HTTP 403")
                .hasMessageNotContaining("outro-segredo").hasMessageNotContaining(key());
        assertThat(objects).isEmpty();
    }

    @Test
    void chaveForaDoFormatoNuncaViraRequisicao() {
        S3MediaStorage s = storage(SECRET, false);
        assertThatThrownBy(() -> s.put("../../etc/passwd", new byte[] {1}, "text/plain")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> s.read("private/x")).isInstanceOf(IllegalArgumentException.class);
        assertThat(calls).isEmpty();
    }

    @Test
    void urlPreAssinadaOpcionalEConfiguracaoValidada() {
        S3MediaStorage s = storage(SECRET, true);
        URI url = s.signedReadUrl(key(), Duration.ofSeconds(90)).orElseThrow();
        assertThat(url.toString()).startsWith(endpoint() + "/ws-media/" + key() + "?X-Amz-Algorithm=AWS4-HMAC-SHA256")
                .contains("X-Amz-Expires=90").contains("X-Amz-Signature=").doesNotContain(SECRET);

        assertThatThrownBy(() -> new S3MediaStorage(URI.create("ftp://x"), "r", "ws-media", "a", "b", true, false, HttpClient.newHttpClient(), CLOCK,
                null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new S3MediaStorage(endpoint(), "r", "Bucket_Invalido", "a", "b", true, false, HttpClient.newHttpClient(), CLOCK,
                null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new S3MediaStorage(endpoint(), "r", "ws-media", "", "b", true, false, HttpClient.newHttpClient(), CLOCK, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(S3MediaStorage.hostHeader(URI.create("https://s3.example.com:443"), "b")).isEqualTo("b.s3.example.com");
        assertThat(S3MediaStorage.hostHeader(URI.create("http://minio:9000"), null)).isEqualTo("minio:9000");
        S3MediaStorage virtual = new S3MediaStorage(URI.create("https://s3.example.com/"), "sa-east-1", "ws-media", "a", "b", false, false,
                HttpClient.newHttpClient(), CLOCK, null);
        assertThat(virtual.target(key()).uri().toString()).isEqualTo("https://ws-media.s3.example.com/" + key());
    }

    // ------------------------------------------------------------------------------------------------ S3 falso

    private void handle(HttpExchange ex) throws IOException {
        String method = ex.getRequestMethod();
        calls.add(method);
        String path = ex.getRequestURI().getRawPath();
        byte[] body = ex.getRequestBody().readAllBytes();
        String payloadHash = ex.getRequestHeaders().getFirst("x-amz-content-sha256");
        Map<String, String> signed = new LinkedHashMap<>();
        String auth = ex.getRequestHeaders().getFirst("Authorization");
        String signedHeaders = auth == null ? "" : auth.replaceAll(".*SignedHeaders=([^,]+),.*", "$1");
        for (String h : signedHeaders.split(";")) {
            signed.put(h, ex.getRequestHeaders().getFirst(h));
        }
        Instant at = Instant.parse(ex.getRequestHeaders().getFirst("x-amz-date").replaceAll("(\\d{4})(\\d{2})(\\d{2})T(\\d{2})(\\d{2})(\\d{2})Z",
                "$1-$2-$3T$4:$5:$6Z"));
        String expected = new SigV4(ACCESS, SECRET, "us-east-1", "s3").authorization(method, path, Map.of(), signed, payloadHash, at);
        if (!expected.equals(auth)) {
            reply(ex, 403, new byte[0]);
            return;
        }
        if (method.equals("PUT") && !SigV4.sha256Hex(body).equals(payloadHash)) {
            reply(ex, 400, new byte[0]);
            return;
        }
        switch (method) {
            case "PUT" -> {
                objects.put(path, body);
                reply(ex, 200, new byte[0]);
            }
            case "GET" -> {
                byte[] o = objects.get(path);
                reply(ex, o == null ? 404 : 200, o == null ? new byte[0] : o);
            }
            case "DELETE" -> reply(ex, objects.remove(path) == null ? 404 : 204, null);
            default -> reply(ex, 405, new byte[0]);
        }
    }

    private static void reply(HttpExchange ex, int status, byte[] body) throws IOException {
        ex.sendResponseHeaders(status, body == null || body.length == 0 ? -1 : body.length);
        if (body != null && body.length > 0) {
            try (OutputStream out = ex.getResponseBody()) {
                out.write(body);
            }
        }
        ex.close();
    }
}
