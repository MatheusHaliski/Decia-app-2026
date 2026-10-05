package br.gov.pr.secid.workstation.web.error;

import java.time.Instant;
import java.util.Map;

/**
 * Corpo JSON de todo erro da API (ARQUITETURA §3.3): {@code {code, message, details, correlationId}} mais status,
 * caminho e instante. Nunca carrega stack trace, nome de classe nem mensagem interna de exceção.
 */
public record ApiError(int status, String code, String message, Map<String, Object> details, String path,
                       Instant timestamp, String correlationId) {
}
