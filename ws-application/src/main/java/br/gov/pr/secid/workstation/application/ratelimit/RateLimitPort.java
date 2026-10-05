package br.gov.pr.secid.workstation.application.ratelimit;

import java.time.Duration;

/**
 * Contador atômico de janela fixa (D-14, SEG RN49.03/RN49.04): um balde por {@code owner} (IP, id de usuário) e
 * {@code bucket} (rota, {@code login-fail}). A reserva é feita <b>antes</b> da operação cara (hash Argon2) e de forma
 * atômica — pedidos em paralelo nunca passam do limite juntos (no FAI, 40 pedidos simultâneos avaliavam 40 senhas).
 * <p>Semântica: a janela abre na primeira reserva e vence após {@code window}; toda tentativa conta, inclusive as
 * recusadas (não estende a janela). {@link #release} devolve uma reserva (senha certa não é falha) e nunca deixa o
 * contador negativo. {@link #reset} zera o balde (login completo, redefinição de senha por e-mail).
 * Adaptadores: Redis (INCR+EXPIRE em Lua) quando {@code ws.redis.enabled=true}; memória (teto de baldes e varredura)
 * como fallback.
 */
public interface RateLimitPort {

    /** Reserva uma vaga no balde. {@code true} se a reserva ficou dentro do limite; {@code false} se estourou (a tentativa conta mesmo assim). */
    boolean tryAcquire(String owner, String bucket, int limit, Duration window);

    /** Estado do balde sem consumir vaga. */
    QuotaStatus status(String owner, String bucket, int limit, Duration window);

    /** Zera o balde. */
    void reset(String owner, String bucket);

    /** Devolve uma reserva (nunca abaixo de zero). Implementação padrão: nada — adaptadores sem suporte simplesmente não devolvem. */
    default void release(String owner, String bucket) {
    }

    /** Chave canônica {@code owner|bucket}, a mesma em todos os adaptadores (facilita inspeção em Redis). */
    static String key(String owner, String bucket) {
        if (owner == null || owner.isBlank() || bucket == null || bucket.isBlank()) {
            throw new IllegalArgumentException("owner e bucket são obrigatórios");
        }
        return owner + "|" + bucket;
    }
}
