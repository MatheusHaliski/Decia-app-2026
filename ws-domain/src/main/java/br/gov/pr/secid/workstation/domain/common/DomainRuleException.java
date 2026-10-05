package br.gov.pr.secid.workstation.domain.common;

import java.util.List;

/**
 * Regra de negócio violada numa operação de domínio (409 no {@code ws-web}, formato {@code ApiError}): carrega um {@code code}
 * estável (ex.: {@code CRITERIOS_PENDENTES}) e, opcionalmente, {@code details} (códigos dos critérios pendentes, etc.).
 */
public class DomainRuleException extends IllegalStateException {

    private static final long serialVersionUID = 1L;

    private final String code;
    private final List<String> details;

    public DomainRuleException(String code, String message) {
        this(code, message, List.of());
    }

    public DomainRuleException(String code, String message, List<String> details) {
        super(code + ": " + message);
        this.code = code;
        this.details = List.copyOf(details);
    }

    public String getCode() {
        return code;
    }

    public List<String> getDetails() {
        return details;
    }
}
