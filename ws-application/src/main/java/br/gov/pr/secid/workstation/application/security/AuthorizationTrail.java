package br.gov.pr.secid.workstation.application.security;

/**
 * Registro, por requisição (thread), de que a autorização de recurso foi avaliada (D-65). O {@link ResourceAuthorizer} marca; o
 * {@code AuthorizationEnforcementAdvice} (ws-web) recusa com 500 a resposta de um handler com id no caminho que terminou sem marca —
 * esquecer o authorizer vira erro visível em teste, nunca um BOLA silencioso. O {@code AuthorizationTrailInterceptor} limpa no início e
 * no fim de cada requisição.
 */
public final class AuthorizationTrail {
    private static final ThreadLocal<String> CHECK = new ThreadLocal<>();

    private AuthorizationTrail() {
    }

    /** Marca que uma política foi avaliada (e por qual verificação). */
    public static void record(String check) {
        CHECK.set(check == null || check.isBlank() ? "?" : check);
    }

    public static boolean checked() {
        return CHECK.get() != null;
    }

    /** Última verificação registrada (diagnóstico de teste); {@code null} se nenhuma. */
    public static String last() {
        return CHECK.get();
    }

    public static void clear() {
        CHECK.remove();
    }
}
