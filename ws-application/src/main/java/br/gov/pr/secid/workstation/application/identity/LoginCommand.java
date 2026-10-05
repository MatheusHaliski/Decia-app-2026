package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.common.Masking;

/**
 * Pedido de login (RF1/RF2): e-mail ou nome de usuário e a senha em claro, que só existe na memória desta requisição.
 * {@code toString} nunca mostra a senha nem o identificador em claro.
 */
public record LoginCommand(String identifier, CharSequence password) {
    @Override
    public String toString() {
        return "LoginCommand[identifier=" + (identifier == null ? "null" : Masking.maskEmail(identifier)) + ", password=***]";
    }
}
