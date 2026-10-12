package br.gov.pr.secid.workstation.web.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declara qual verificação do {@code ResourceAuthorizer} protege um handler com id no caminho (D-65). O {@code PathVariableAuthorizationTest}
 * exige esta anotação (ou {@link AuthorizationExempt}) em TODO handler com {@code @PathVariable} e confere que o método nomeado existe;
 * o {@link AuthorizationEnforcementAdvice} recusa com 500 a resposta que saiu sem a verificação ter rodado.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface AuthorizedBy {

    /** Método público do {@code ResourceAuthorizer} chamado pelo serviço (ex.: {@code "requireSelfOrAdmin"}). */
    String value();
}
