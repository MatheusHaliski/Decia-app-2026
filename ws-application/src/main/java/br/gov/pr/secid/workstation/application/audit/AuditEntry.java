package br.gov.pr.secid.workstation.application.audit;

import java.util.Map;
import java.util.UUID;

/**
 * Um registro para a trilha de auditoria ({@code audit_log}). Nunca carrega senha, token, código ou e-mail em
 * claro: quem monta a entrada mascara antes ({@code Masking}).
 *
 * @param actorId   quem agiu ({@code null} = sistema ou tentativa anônima)
 * @param action    catálogo que cresce por RF ({@link AuditActions})
 * @param result    {@code OK}, {@code FALHA} ou {@code NEGADO} (CHECK {@code ck_audit_log_result})
 * @param ip        IP resolvido pelo {@code ClientIpResolver} (já reduzido a /64 se IPv6)
 * @param userAgent cabeçalho {@code User-Agent} truncado a 512
 * @param metadata  detalhes serializados em JSON (motivo, {@code resetAt}, …)
 */
public record AuditEntry(UUID actorId, String action, String result, String ip, String userAgent,
                         Map<String, Object> metadata) {
    public static final String OK = "OK";
    public static final String FALHA = "FALHA";
    public static final String NEGADO = "NEGADO";

    public AuditEntry {
        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("action obrigatória");
        }
        if (!OK.equals(result) && !FALHA.equals(result) && !NEGADO.equals(result)) {
            throw new IllegalArgumentException("result deve ser OK, FALHA ou NEGADO");
        }
        userAgent = userAgent != null && userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent;
        metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }
}
