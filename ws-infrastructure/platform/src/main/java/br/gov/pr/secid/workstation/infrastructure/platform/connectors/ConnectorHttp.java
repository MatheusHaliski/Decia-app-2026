package br.gov.pr.secid.workstation.infrastructure.platform.connectors;

import br.gov.pr.secid.workstation.application.connectors.ProviderException;
import br.gov.pr.secid.workstation.application.connectors.ProviderException.Kind;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.ProxySelector;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.StringJoiner;

/**
 * HTTP dos conectores sobre {@link HttpClient} (JDK): JSON com Bearer, formulário do endpoint de token (RFC 6749 §4.1.3/§6) e download
 * com teto de bytes. Redirecionamento só manual: o Graph responde {@code 302} para uma URL pré-autenticada de outro host, e o token NUNCA
 * segue para outro host (nem para {@code http}, salvo quando a própria base configurada é {@code http} — servidor local de teste). Erros
 * viram {@link ProviderException} já classificada; a mensagem não leva token, corpo nem URL com consulta.
 */
final class ConnectorHttp {
    static final ObjectMapper JSON = JsonMapper.builder().build();
    private static final int MAX_JSON_BYTES = 4 * 1024 * 1024;
    private static final int MAX_REDIRECTS = 3;

    private final HttpClient client;
    private final Duration timeout;

    ConnectorHttp(Duration timeout) {
        this.timeout = timeout == null ? Duration.ofSeconds(20) : timeout;
        HttpClient.Builder b = HttpClient.newBuilder().connectTimeout(this.timeout).followRedirects(HttpClient.Redirect.NEVER);
        ProxySelector proxy = ProxySelector.getDefault();
        if (proxy != null) {
            b.proxy(proxy);   // respeita https.proxyHost/nonProxyHosts da JVM (rede corporativa)
        }
        this.client = b.build();
    }

    /** Download já lido (até o teto) e o {@code Content-Type} informado. */
    record Downloaded(byte[] bytes, String contentType) {
    }

    // ------------------------------------------------------------------------------------------------ JSON com Bearer

    JsonNode getJson(String url, String bearer) {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url)).timeout(timeout).header("Authorization", "Bearer " + bearer)
                .header("Accept", "application/json").GET().build();
        HttpResponse<InputStream> res = send(req);
        byte[] body = read(res, MAX_JSON_BYTES);
        if (res.statusCode() / 100 != 2) {
            throw apiError(res.statusCode(), body);
        }
        return parse(body);
    }

    // ------------------------------------------------------------------------------------------------ endpoint de token (form)

    /** POST {@code application/x-www-form-urlencoded} para o endpoint de token; erro OAuth classificado pelo campo {@code error}. */
    JsonNode tokenRequest(String url, Map<String, String> form) {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url)).timeout(timeout).header("Content-Type", "application/x-www-form-urlencoded")
                .header("Accept", "application/json").POST(HttpRequest.BodyPublishers.ofString(form(form))).build();
        HttpResponse<InputStream> res = send(req);
        byte[] body = read(res, MAX_JSON_BYTES);
        int status = res.statusCode();
        if (status / 100 == 2) {
            return parse(body);
        }
        String error = oauthError(body);
        if (status >= 500 || status == 429) {
            throw new ProviderException(Kind.UNAVAILABLE, status, "endpoint de token indisponível");
        }
        if ("invalid_grant".equals(error)) {
            throw new ProviderException(Kind.INVALID_GRANT, status, "concessão recusada (invalid_grant)");
        }
        if ("invalid_client".equals(error) || "unauthorized_client".equals(error) || status == 401) {
            // problema de configuração do servidor (client id/segredo/redirect), não da pessoa
            throw new ProviderException(Kind.UNAVAILABLE, status, "cliente OAuth recusado pelo provedor (" + safe(error) + ")");
        }
        throw new ProviderException(Kind.REJECTED, status, "pedido de token recusado (" + safe(error) + ")");
    }

    /** POST de formulário que só interessa pelo status (revogação). */
    int postFormStatus(String url, Map<String, String> form) {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url)).timeout(timeout).header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form(form))).build();
        HttpResponse<InputStream> res = send(req);
        read(res, MAX_JSON_BYTES);
        return res.statusCode();
    }

    // ------------------------------------------------------------------------------------------------ download

    /**
     * GET do conteúdo com Bearer, lendo no máximo {@code maxBytes} (acima disso a leitura para e sai {@link Kind#TOO_LARGE}). Segue até 3
     * redirecionamentos à mão: o Bearer só vai junto quando o destino é o MESMO host/porta/esquema.
     */
    Downloaded download(String url, String bearer, long maxBytes) {
        URI target = URI.create(url);
        URI origin = target;
        for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
            HttpRequest.Builder b = HttpRequest.newBuilder(target).timeout(timeout.multipliedBy(6)).GET();
            if (sameOrigin(origin, target)) {
                b.header("Authorization", "Bearer " + bearer);
            }
            HttpResponse<InputStream> res = send(b.build());
            int status = res.statusCode();
            if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                read(res, 64 * 1024);
                String location = res.headers().firstValue("Location").orElse(null);
                target = redirectTarget(origin, target, location);
                continue;
            }
            if (status / 100 != 2) {
                throw apiError(status, read(res, MAX_JSON_BYTES));
            }
            long declared = res.headers().firstValueAsLong("Content-Length").orElse(-1);
            if (declared > maxBytes) {
                close(res);
                throw new ProviderException(Kind.TOO_LARGE, status, "conteúdo acima do teto de importação");
            }
            String type = res.headers().firstValue("Content-Type").orElse(null);
            return new Downloaded(readCapped(res, maxBytes), type);
        }
        throw new ProviderException(Kind.UNAVAILABLE, 0, "redirecionamentos demais no download");
    }

    private static URI redirectTarget(URI origin, URI current, String location) {
        if (location == null || location.isBlank()) {
            throw new ProviderException(Kind.UNAVAILABLE, 0, "redirecionamento sem destino");
        }
        URI next;
        try {
            next = current.resolve(location.strip());
        } catch (IllegalArgumentException e) {
            throw new ProviderException(Kind.UNAVAILABLE, 0, "redirecionamento inválido");
        }
        String scheme = next.getScheme() == null ? "" : next.getScheme().toLowerCase(Locale.ROOT);
        boolean httpAllowed = "http".equalsIgnoreCase(origin.getScheme());   // só quando a base configurada é http (teste local)
        if (next.getHost() == null || !(scheme.equals("https") || (httpAllowed && scheme.equals("http")))) {
            throw new ProviderException(Kind.UNAVAILABLE, 0, "redirecionamento para destino não seguro");
        }
        return next;
    }

    static boolean sameOrigin(URI a, URI b) {
        return Objects.equals(lower(a.getScheme()), lower(b.getScheme())) && Objects.equals(lower(a.getHost()), lower(b.getHost()))
                && port(a) == port(b);
    }

    private static int port(URI u) {
        if (u.getPort() != -1) {
            return u.getPort();
        }
        return "http".equalsIgnoreCase(u.getScheme()) ? 80 : 443;
    }

    private static String lower(String s) {
        return s == null ? null : s.toLowerCase(Locale.ROOT);
    }

    // ------------------------------------------------------------------------------------------------ apoio

    private HttpResponse<InputStream> send(HttpRequest req) {
        try {
            return client.send(req, HttpResponse.BodyHandlers.ofInputStream());
        } catch (IOException e) {
            throw new ProviderException(Kind.UNAVAILABLE, 0, "falha de rede com o provedor (" + e.getClass().getSimpleName() + ")");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ProviderException(Kind.UNAVAILABLE, 0, "chamada ao provedor interrompida");
        }
    }

    /** Corpo inteiro até o teto (respostas JSON e de erro): acima do teto, só o começo (o resto é descartado). */
    private static byte[] read(HttpResponse<InputStream> res, int max) {
        try (InputStream in = res.body()) {
            return in.readNBytes(max);
        } catch (IOException e) {
            throw new ProviderException(Kind.UNAVAILABLE, res.statusCode(), "resposta do provedor interrompida");
        }
    }

    private static byte[] readCapped(HttpResponse<InputStream> res, long maxBytes) {
        try (InputStream in = res.body()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[64 * 1024];
            long total = 0;
            int n;
            while ((n = in.read(buf)) != -1) {
                total += n;
                if (total > maxBytes) {
                    throw new ProviderException(Kind.TOO_LARGE, res.statusCode(), "conteúdo acima do teto de importação");
                }
                out.write(buf, 0, n);
            }
            return out.toByteArray();
        } catch (IOException e) {
            throw new ProviderException(Kind.UNAVAILABLE, res.statusCode(), "download interrompido");
        }
    }

    private static void close(HttpResponse<InputStream> res) {
        try {
            res.body().close();
        } catch (IOException ignored) {
            // nada a fazer: a conexão é descartada
        }
    }

    static JsonNode parse(byte[] body) {
        try {
            return JSON.readTree(body);
        } catch (RuntimeException e) {
            throw new ProviderException(Kind.UNAVAILABLE, 200, "resposta do provedor não é JSON");
        }
    }

    /**
     * Erro de API (Drive/Graph) → classe: 401 token; 403 acesso (exceto cota/limite de taxa → indisponível; exportação grande → TOO_LARGE);
     * 404; 413; 429/5xx indisponível; outros 4xx recusado.
     */
    static ProviderException apiError(int status, byte[] body) {
        String reason = apiReason(body);
        return switch (status) {
            case 401 -> new ProviderException(Kind.UNAUTHORIZED, status, "token recusado pelo provedor");
            case 403 -> {
                if (reason.contains("ratelimit") || reason.contains("quota")) {
                    yield new ProviderException(Kind.UNAVAILABLE, status, "limite de uso do provedor (" + safe(reason) + ")");
                }
                if (reason.contains("exportsizelimitexceeded")) {
                    yield new ProviderException(Kind.TOO_LARGE, status, "arquivo grande demais para exportar");
                }
                if (reason.contains("filenotdownloadable") || reason.contains("cannotdownload")) {
                    yield new ProviderException(Kind.REJECTED, status, "o provedor não permite baixar este item (" + safe(reason) + ")");
                }
                yield new ProviderException(Kind.FORBIDDEN, status, "acesso recusado pelo provedor (" + safe(reason) + ")");
            }
            case 404 -> new ProviderException(Kind.NOT_FOUND, status, "item não encontrado no provedor");
            case 413 -> new ProviderException(Kind.TOO_LARGE, status, "item grande demais");
            case 408, 429 -> new ProviderException(Kind.UNAVAILABLE, status, "provedor ocupado");
            default -> status >= 500 ? new ProviderException(Kind.UNAVAILABLE, status, "provedor indisponível")
                    : new ProviderException(Kind.REJECTED, status, "pedido recusado pelo provedor (" + safe(reason) + ")");
        };
    }

    /** Motivo curto do erro: Drive {@code error.errors[0].reason}, Graph {@code error.code}; minúsculo; vazio se não houver. */
    static String apiReason(byte[] body) {
        try {
            JsonNode root = JSON.readTree(body == null || body.length == 0 ? "{}".getBytes(StandardCharsets.UTF_8) : body);
            JsonNode error = root.path("error");
            String r = text(error.path("errors").path(0), "reason");
            if (r == null) {
                r = text(error, "code");
            }
            if (r == null) {
                r = text(error, "status");
            }
            return r == null ? "" : r.toLowerCase(Locale.ROOT);
        } catch (RuntimeException e) {
            return "";
        }
    }

    static String oauthError(byte[] body) {
        try {
            String e = text(JSON.readTree(body == null || body.length == 0 ? "{}".getBytes(StandardCharsets.UTF_8) : body), "error");
            return e == null ? "" : e;
        } catch (RuntimeException ex) {
            return "";
        }
    }

    /** Texto do campo, ou nulo se ausente/nulo/não texto. */
    static String text(JsonNode node, String field) {
        JsonNode v = node == null ? null : node.get(field);
        return v == null || !v.isString() ? null : v.asString();
    }

    static Long number(JsonNode node, String field) {
        JsonNode v = node == null ? null : node.get(field);
        if (v == null || v.isNull()) {
            return null;
        }
        if (v.isNumber()) {
            return v.asLong();
        }
        if (v.isString()) {
            try {
                return Long.parseLong(v.asString().strip());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    static Instant instant(JsonNode node, String field) {
        String s = text(node, field);
        if (s == null) {
            return null;
        }
        try {
            return Instant.parse(s);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    static String form(Map<String, String> fields) {
        StringJoiner j = new StringJoiner("&");
        fields.forEach((k, v) -> {
            if (v != null) {
                j.add(enc(k) + "=" + enc(v));
            }
        });
        return j.toString();
    }

    static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    /** Código curto e seguro para log (só letras, dígitos e alguns separadores, até 60). */
    static String safe(String s) {
        if (s == null || s.isEmpty()) {
            return "-";
        }
        String clean = s.replaceAll("[^A-Za-z0-9_.:-]", "");
        return clean.length() > 60 ? clean.substring(0, 60) : clean;
    }
}
