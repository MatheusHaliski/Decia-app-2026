package br.gov.pr.secid.workstation.web.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo de {@code POST /api/auth/login}. {@code toString} nunca mostra a senha. */
public record LoginRequest(
        @NotBlank(message = "Informe o e-mail ou nome de usuário.") @Size(max = 320) String identifier,
        @NotBlank(message = "Informe a senha.") @Size(max = 256) String password) {
    @Override
    public String toString() {
        return "LoginRequest[identifier=***, password=***]";
    }
}
