package br.gov.pr.secid.workstation.application.connectors;

/**
 * Falha de uma chamada a um provedor, já classificada pelo adaptador HTTP. A mensagem é curta e nunca leva token, código de autorização,
 * corpo de resposta nem dado da pessoa (vai para log). O {@link ConnectorService} traduz para o contrato: {@code UNAUTHORIZED} → renova
 * uma vez e, se persistir, {@code 409 CONECTOR_EXPIRADO}; {@code INVALID_GRANT} (refresh/código recusado) → EXPIRADO; {@code FORBIDDEN} →
 * 403; {@code NOT_FOUND} → 404; {@code REJECTED}/{@code TOO_LARGE} → 400 VALIDACAO; {@code UNAVAILABLE} → 502 PROVEDOR_INDISPONIVEL.
 */
public class ProviderException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public enum Kind {
        UNAUTHORIZED, INVALID_GRANT, FORBIDDEN, NOT_FOUND, REJECTED, TOO_LARGE, UNAVAILABLE
    }

    private final Kind kind;
    private final int status;

    public ProviderException(Kind kind, int status, String message) {
        super(message);
        this.kind = kind;
        this.status = status;
    }

    public ProviderException(Kind kind, int status, String message, Throwable cause) {
        super(message, cause);
        this.kind = kind;
        this.status = status;
    }

    public Kind kind() {
        return kind;
    }

    /** Status HTTP do provedor (0 quando nem houve resposta: timeout, DNS, conexão). */
    public int status() {
        return status;
    }
}
