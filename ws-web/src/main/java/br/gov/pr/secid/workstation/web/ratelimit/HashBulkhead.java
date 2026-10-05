package br.gov.pr.secid.workstation.web.ratelimit;

import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Teto de hashes Argon2 simultâneos (SEG RN49.05, D-14). Argon2id com 19 MiB por hash é caro de propósito; sem teto,
 * uma rajada de logins derruba a API inteira (no FAI, 60 logins paralelos esgotaram o pool do banco: 50 respostas 500).
 * {@code permits = max(1, min(max(2, núcleos), poolDoBanco / 2))}; quem não consegue vaga em {@code waitMillis}
 * recebe {@code 503 AUTENTICACAO_OCUPADA} + {@code Retry-After} do {@code AuthRateLimitFilter}, e o resto da API segue.
 */
public final class HashBulkhead {
    public static final long DEFAULT_WAIT_MILLIS = 2_000;

    private final Semaphore permits;
    private final int capacity;
    private final long waitMillis;

    public HashBulkhead(int permits, long waitMillis) {
        if (permits < 1) {
            throw new IllegalArgumentException("permits deve ser positivo");
        }
        if (waitMillis < 0) {
            throw new IllegalArgumentException("waitMillis não pode ser negativo");
        }
        this.permits = new Semaphore(permits, true);
        this.capacity = permits;
        this.waitMillis = waitMillis;
    }

    /** {@code max(1, min(max(2, núcleos), poolDoBanco / 2))}: nunca mais hashes em paralelo do que metade do pool do banco. */
    public static int defaultPermits(int cores, int dbPool) {
        return Math.max(1, Math.min(Math.max(2, cores), dbPool / 2));
    }

    /** Espera até {@code waitMillis} por uma vaga. {@code false} = sem vaga (o chamador responde 503). */
    public boolean tryAcquire() {
        try {
            return permits.tryAcquire(waitMillis, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** Devolve a vaga — sempre em {@code finally}. */
    public void release() {
        permits.release();
    }

    public int capacity() {
        return capacity;
    }

    public int available() {
        return permits.availablePermits();
    }

    public long waitMillis() {
        return waitMillis;
    }
}
