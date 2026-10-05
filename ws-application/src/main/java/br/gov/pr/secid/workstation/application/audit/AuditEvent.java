package br.gov.pr.secid.workstation.application.audit;

import org.slf4j.MDC;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Uma linha do {@code audit_log} (TAXONOMIA §12.1), append-only. O {@code correlationId} vem do MDC posto pelo
 * {@code CorrelationIdFilter}. Os metadados são saneados na construção: qualquer chave que pareça segredo
 * (senha, token, código, refresh, secret, hash de senha) é descartada e substituída por {@code ***} — nenhum caminho
 * do código consegue gravar um segredo na trilha, nem por engano ({@code AuditEventTest}).
 */
public record AuditEvent(UUID actorId, String action, String resourceType, String resourceId, String result,
                         String ip, String userAgent, String correlationId, Map<String, Object> metadata) {

    public static final String OK = "OK";
    public static final String FALHA = "FALHA";
    public static final String NEGADO = "NEGADO";
    public static final String MDC_CORRELATION = "correlationId";
    private static final int MAX_USER_AGENT = 512;
    private static final Pattern SECRET_KEY = Pattern.compile(
            "(?i)(password|senha|passwd|token|secret|segredo|refresh|^code$|codigo|otp|authorization|cookie|jwt|hash)");

    public AuditEvent {
        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("action obrigatória");
        }
        if (result == null || result.isBlank()) {
            throw new IllegalArgumentException("result obrigatório (OK, FALHA ou NEGADO)");
        }
        userAgent = userAgent != null && userAgent.length() > MAX_USER_AGENT ? userAgent.substring(0, MAX_USER_AGENT) : userAgent;
        metadata = sanitize(metadata);
    }

    /** Evento com o correlationId da requisição corrente (MDC) e metadados saneados. */
    public static AuditEvent of(UUID actorId, String action, String resourceType, String resourceId, String result,
                                String ip, String userAgent, Map<String, Object> metadata) {
        return new AuditEvent(actorId, action, resourceType, resourceId, result, ip, userAgent, MDC.get(MDC_CORRELATION), metadata);
    }

    static Map<String, Object> sanitize(Map<String, Object> raw) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (raw != null) {
            raw.forEach((k, v) -> out.put(k, k != null && SECRET_KEY.matcher(k).find() ? "***" : v));
        }
        return Map.copyOf(out);
    }
}
