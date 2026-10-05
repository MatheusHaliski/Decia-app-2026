package br.gov.pr.secid.workstation.web.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Teto de hashes Argon2 simultâneos (D-14, RF2.CA11). O hash é CPU pesada e a requisição segura uma conexão do banco
 * enquanto calcula: sem teto, 60 logins paralelos esgotavam o pool do Hikari e a API inteira respondia 500 (FAI).
 * Vagas = {@code max(1, min(max(2, núcleos), poolDoBanco / 2))} — sempre sobra conexão para o resto da API; quem não
 * consegue vaga em {@code ws.security.auth-hash-wait-ms} (2 s) recebe {@code 503 AUTENTICACAO_OCUPADA} + Retry-After.
 */
@Component
public class HashBulkhead {
    private static final Logger log = LoggerFactory.getLogger(HashBulkhead.class);
    /** Retry-After sugerido ao excedente, em segundos. */
    public static final long RETRY_AFTER_SECONDS = 2;

    private final Semaphore permits;
    private final int size;
    private final long waitMillis;

    @Autowired
    public HashBulkhead(@Value("${ws.security.auth-hash-concurrency:0}") int configured,
                        @Value("${ws.security.auth-hash-wait-ms:2000}") long waitMillis,
                        @Value("${spring.datasource.hikari.maximum-pool-size:10}") int dbPoolSize) {
        this(configured > 0 ? configured : defaultPermits(Runtime.getRuntime().availableProcessors(), dbPoolSize), waitMillis);
        log.info("Autenticação: até {} hashes de senha simultâneos (pool do banco: {})", size, dbPoolSize);
    }

    public HashBulkhead(int permits, long waitMillis) {
        this.size = Math.max(1, permits);
        this.permits = new Semaphore(size, true);
        this.waitMillis = Math.max(0, waitMillis);
    }

    /** Um por núcleo (o Argon2 é CPU), no mínimo 2, e no máximo metade do pool do banco. */
    public static int defaultPermits(int cores, int dbPoolSize) {
        return Math.max(1, Math.min(Math.max(2, cores), dbPoolSize / 2));
    }

    public int size() {
        return size;
    }

    /** Espera até {@code waitMillis} por uma vaga; {@code false} = 503 para quem chamou. */
    public boolean tryAcquire() {
        try {
            return permits.tryAcquire(waitMillis, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    public void release() {
        permits.release();
    }
}
