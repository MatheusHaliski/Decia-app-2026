package br.gov.pr.secid.workstation.web.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Handler com variável no caminho que NÃO identifica um recurso protegido (ex.: disponibilidade pública de nome de usuário). O motivo
 * é obrigatório e revisado no PR; o {@code PathVariableAuthorizationTest} recusa motivo vazio (D-65).
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface AuthorizationExempt {

    /** Por que este caminho não precisa do {@code ResourceAuthorizer}. */
    String reason();
}
