package br.gov.pr.secid.workstation.infrastructure.platform.connectors;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Provedor falso em {@code 127.0.0.1} (porta livre) para testar os adaptadores HTTP de verdade, sem rede: cada rota responde o que o teste
 * programou e cada pedido fica registrado (método, caminho, consulta, cabeçalhos, corpo).
 */
final class LocalProvider implements AutoCloseable {

    /** Pedido recebido. */
    record Hit(String method, String path, String query, Map<String, String> headers, String body) {
        Map<String, String> form() {
            return decode(body);
        }

        Map<String, String> params() {
            return decode(query);
        }

        String header(String name) {
            return headers.get(name.toLowerCase());
        }
    }

    /** Resposta programada. */
    record Reply(int status, String contentType, byte[] body, Map<String, String> headers) {
        static Reply json(int status, String json) {
            return new Reply(status, "application/json", json.getBytes(StandardCharsets.UTF_8), Map.of());
        }

        static Reply bytes(int status, String contentType, byte[] body) {
            return new Reply(status, contentType, body, Map.of());
        }

        static Reply redirect(String location) {
            return new Reply(302, "text/plain", new byte[0], Map.of("Location", location));
        }
    }

    interface Handler {
        Reply handle(Hit hit);
    }

    private final HttpServer server;
    private final Map<String, Handler> routes = new ConcurrentHashMap<>();
    final List<Hit> hits = Collections.synchronizedList(new ArrayList<>());

    LocalProvider() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/", this::serve);
        server.start();
    }

    String base() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    LocalProvider on(String methodAndPath, Handler handler) {
        routes.put(methodAndPath, handler);
        return this;
    }

    LocalProvider on(String methodAndPath, Reply reply) {
        return on(methodAndPath, hit -> reply);
    }

    Hit last() {
        return hits.get(hits.size() - 1);
    }

    private void serve(HttpExchange ex) throws IOException {
        String method = ex.getRequestMethod();
        String path = ex.getRequestURI().getRawPath();
        Map<String, String> headers = new LinkedHashMap<>();
        ex.getRequestHeaders().forEach((k, v) -> headers.put(k.toLowerCase(), String.join(",", v)));
        String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Hit hit = new Hit(method, path, ex.getRequestURI().getRawQuery(), headers, body);
        hits.add(hit);
        Handler h = routes.get(method + " " + path);
        if (h == null) {   // rota com "*" no fim casa por prefixo (ex.: a busca do Graph, com o termo no caminho)
            h = routes.entrySet().stream().filter(e -> e.getKey().endsWith("*") && (method + " " + path).startsWith(
                    e.getKey().substring(0, e.getKey().length() - 1))).map(Map.Entry::getValue).findFirst().orElse(null);
        }
        Reply r = h == null ? Reply.json(404, "{\"error\":{\"code\":\"itemNotFound\"}}") : h.handle(hit);
        r.headers().forEach((k, v) -> ex.getResponseHeaders().add(k, v));
        ex.getResponseHeaders().add("Content-Type", r.contentType());
        ex.sendResponseHeaders(r.status(), r.body().length == 0 ? -1 : r.body().length);
        try (OutputStream out = ex.getResponseBody()) {
            out.write(r.body());
        }
    }

    static Map<String, String> decode(String raw) {
        Map<String, String> out = new LinkedHashMap<>();
        if (raw == null || raw.isEmpty()) {
            return out;
        }
        for (String kv : raw.split("&")) {
            String[] p = kv.split("=", 2);
            out.put(URLDecoder.decode(p[0], StandardCharsets.UTF_8), p.length > 1 ? URLDecoder.decode(p[1], StandardCharsets.UTF_8) : "");
        }
        return out;
    }

    private volatile boolean closed;

    @Override
    public void close() {
        if (!closed) {
            closed = true;
            server.stop(0);
        }
    }
}
