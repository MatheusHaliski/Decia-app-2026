package br.gov.pr.secid.workstation.application.common;

import java.util.Map;

/**
 * Erro de negócio com código estável, status HTTP e detalhes opcionais (ARQUITETURA §3.3). A UI nunca recebe erro
 * cru: o {@code GlobalExceptionHandler} transforma esta exceção em {@code {code, message, details, correlationId}}.
 * Os códigos nomeados nos CAs (VALIDACAO, ACESSO_NEGADO, PERIODO_INVALIDO, LIMITE_ESGOTADO, …) são constantes aqui.
 */
public class ApiException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public static final String VALIDACAO = "VALIDACAO";
    public static final String NAO_AUTENTICADO = "NAO_AUTENTICADO";
    public static final String ACESSO_NEGADO = "ACESSO_NEGADO";
    public static final String NAO_ENCONTRADO = "NAO_ENCONTRADO";
    public static final String CONFLITO = "CONFLITO";
    public static final String LIMITE_ESGOTADO = "LIMITE_ESGOTADO";
    public static final String SERVICO_INDISPONIVEL = "SERVICO_INDISPONIVEL";
    public static final String ERRO_INTERNO = "ERRO_INTERNO";

    private final String code;
    private final int status;
    private final transient Map<String, Object> details;

    public ApiException(String code, int status, String message) {
        this(code, status, message, Map.of());
    }

    public ApiException(String code, int status, String message, Map<String, Object> details) {
        super(message);
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("code obrigatório");
        }
        if (status < 400 || status > 599) {
            throw new IllegalArgumentException("status deve ser um erro HTTP (400-599): " + status);
        }
        this.code = code;
        this.status = status;
        this.details = details == null ? Map.of() : Map.copyOf(details);
    }

    public String code() {
        return code;
    }

    public int status() {
        return status;
    }

    public Map<String, Object> details() {
        return details;
    }

    public static ApiException badRequest(String code, String message) {
        return new ApiException(code, 400, message);
    }

    public static ApiException badRequest(String code, String message, Map<String, Object> details) {
        return new ApiException(code, 400, message, details);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(NAO_AUTENTICADO, 401, message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(ACESSO_NEGADO, 403, message);
    }

    public static ApiException notFound(String what) {
        return new ApiException(NAO_ENCONTRADO, 404, what + " não encontrado(a)");
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(code, 409, message);
    }

    public static ApiException unprocessable(String code, String message, Map<String, Object> details) {
        return new ApiException(code, 422, message, details);
    }

    public static ApiException tooMany(String message, Map<String, Object> details) {
        return new ApiException(LIMITE_ESGOTADO, 429, message, details);
    }

    public static ApiException unavailable(String code, String message) {
        return new ApiException(code, 503, message);
    }
}
