package br.gov.pr.secid.workstation.domain.common;

/**
 * Transição de estado não permitida pela máquina de estados explícita de uma entidade (ARQUITETURA §3, "máquinas de
 * estado explícitas"). Carrega um {@code code} estável (ex.: {@code TAREFA_TRANSICAO_INVALIDA}) que o {@code ws-web}
 * devolve como {@code 409 {code}} no formato {@code ApiError}.
 */
public class InvalidTransitionException extends IllegalStateException {

    private static final long serialVersionUID = 1L;

    private final String code;
    private final String from;
    private final String to;

    public InvalidTransitionException(String code, Enum<?> from, Enum<?> to) {
        super(code + ": " + from + " -> " + to);
        this.code = code;
        this.from = from.name();
        this.to = to == null ? "null" : to.name();
    }

    public String getCode() {
        return code;
    }

    public String getFrom() {
        return from;
    }

    public String getTo() {
        return to;
    }
}
