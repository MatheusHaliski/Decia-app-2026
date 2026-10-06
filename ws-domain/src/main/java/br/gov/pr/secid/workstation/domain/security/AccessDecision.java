package br.gov.pr.secid.workstation.domain.security;

/**
 * Resultado de uma política de acesso (D-65). {@link #NOT_FOUND} = o recurso não é visível para quem pede e a resposta é a mesma de um
 * id inexistente (404, sem vazar existência); {@link #FORBIDDEN} = o recurso é visível, mas a ação não é permitida (403).
 */
public enum AccessDecision {
    ALLOW, FORBIDDEN, NOT_FOUND;

    public boolean allowed() {
        return this == ALLOW;
    }

    /** VIEW não visível → NOT_FOUND; visível → ALLOW se {@code permitted}, senão FORBIDDEN. */
    static AccessDecision of(boolean visible, boolean permitted) {
        if (!visible) {
            return NOT_FOUND;
        }
        return permitted ? ALLOW : FORBIDDEN;
    }
}
