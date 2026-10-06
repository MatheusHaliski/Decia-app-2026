package br.gov.pr.secid.workstation.application.ai;

import java.time.Duration;

/**
 * Contador atômico com janela para o orçamento de IA (D-68). Redis ({@code INCRBY} + {@code EXPIRE} em Lua) com
 * {@code ws.redis.enabled=true}; memória no resto. {@link #tryAdd} nunca deixa o contador passar do limite, mesmo sob concorrência.
 */
public interface AiBudgetCounterPort {

    /** Soma {@code delta} se {@code atual + delta <= limit}; {@code true} se somou. Abre a janela (TTL) na primeira soma. */
    boolean tryAdd(String key, long delta, long limit, Duration window);

    /** Ajuste sem limite (devolução ou consumo real acima do estimado); nunca abaixo de zero. */
    void add(String key, long delta, Duration window);

    long current(String key);
}
