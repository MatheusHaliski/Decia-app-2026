package br.gov.pr.secid.workstation.web.ratelimit;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HashBulkheadTest {

    @Test
    void permitsPadraoNuncaPassaDaMetadeDoPoolNemFicaAbaixoDeUm() {
        assertThat(HashBulkhead.defaultPermits(4, 10)).isEqualTo(4);
        assertThat(HashBulkhead.defaultPermits(16, 10)).isEqualTo(5);
        assertThat(HashBulkhead.defaultPermits(1, 10)).isEqualTo(2);
        assertThat(HashBulkhead.defaultPermits(8, 2)).isEqualTo(1);
        assertThat(HashBulkhead.defaultPermits(8, 1)).isEqualTo(1);
    }

    @Test
    void semVagaDentroDaEsperaRecusaEDevolverLibera() throws Exception {
        HashBulkhead b = new HashBulkhead(1, 50);
        assertThat(b.capacity()).isEqualTo(1);
        assertThat(b.waitMillis()).isEqualTo(50);
        assertThat(b.tryAcquire()).isTrue();
        assertThat(b.available()).isZero();
        long t0 = System.nanoTime();
        assertThat(b.tryAcquire()).isFalse();
        assertThat(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - t0)).isGreaterThanOrEqualTo(40);
        b.release();
        assertThat(b.tryAcquire()).isTrue();
        b.release();
    }

    @Test
    void quemEsperaGanhaAVagaQuandoElaVolta() throws Exception {
        HashBulkhead b = new HashBulkhead(1, 2_000);
        assertThat(b.tryAcquire()).isTrue();
        CountDownLatch done = new CountDownLatch(1);
        boolean[] got = new boolean[1];
        Thread t = new Thread(() -> {
            got[0] = b.tryAcquire();
            done.countDown();
        });
        t.start();
        Thread.sleep(100);
        b.release();
        assertThat(done.await(3, TimeUnit.SECONDS)).isTrue();
        assertThat(got[0]).isTrue();
    }

    @Test
    void threadInterrompidaNaoGanhaVaga() throws Exception {
        HashBulkhead b = new HashBulkhead(1, 5_000);
        assertThat(b.tryAcquire()).isTrue();
        boolean[] got = {true};
        boolean[] interrupted = {false};
        Thread t = new Thread(() -> {
            got[0] = b.tryAcquire();
            interrupted[0] = Thread.currentThread().isInterrupted();
        });
        t.start();
        Thread.sleep(100);
        t.interrupt();
        t.join(3_000);
        assertThat(got[0]).isFalse();
        assertThat(interrupted[0]).as("a flag de interrupção é preservada").isTrue();
    }

    @Test
    void argumentosInvalidos() {
        assertThatThrownBy(() -> new HashBulkhead(0, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new HashBulkhead(1, -1)).isInstanceOf(IllegalArgumentException.class);
    }
}
