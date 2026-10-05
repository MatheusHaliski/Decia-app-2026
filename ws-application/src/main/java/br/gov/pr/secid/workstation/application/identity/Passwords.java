package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.common.ApiException;

import java.util.LinkedHashMap;
import java.util.Map;

/** Política mínima de senha (RF1.CA01): 10–128 caracteres, letra e dígito, igual à confirmação; {@code 422 VALIDACAO}. */
public final class Passwords {
    public static final int MIN = 10;
    public static final int MAX = 128;

    private Passwords() {
    }

    public static void validate(String password, String confirm) {
        Map<String, Object> fields = new LinkedHashMap<>();
        problem(password).ifPresent(p -> fields.put("password", p));
        if (password != null && !password.equals(confirm)) {
            fields.put("confirmPassword", "As senhas não coincidem.");
        }
        if (!fields.isEmpty()) {
            throw ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.", Map.of("fields", fields));
        }
    }

    public static java.util.Optional<String> problem(String password) {
        if (password == null || password.length() < MIN) {
            return java.util.Optional.of("A senha precisa de pelo menos " + MIN + " caracteres.");
        }
        if (password.length() > MAX) {
            return java.util.Optional.of("A senha pode ter no máximo " + MAX + " caracteres.");
        }
        boolean letter = password.chars().anyMatch(Character::isLetter);
        boolean digit = password.chars().anyMatch(Character::isDigit);
        if (!letter || !digit) {
            return java.util.Optional.of("Use letras e números.");
        }
        return java.util.Optional.empty();
    }
}
