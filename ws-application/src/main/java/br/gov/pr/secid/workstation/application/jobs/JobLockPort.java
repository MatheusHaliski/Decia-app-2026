package br.gov.pr.secid.workstation.application.jobs;

import java.time.Instant;

/**
 * Trava entre instâncias para os trabalhos agendados (tabela {@code scheduled_job_locks}, V70; adaptador em persistence-mysql). Com várias
 * réplicas da API, só a que obtém a trava roda o trabalho; se ela cair, a trava expira sozinha em {@code until}.
 */
public interface JobLockPort {

    /** Tenta obter a trava {@code name} até {@code until}; só consegue se ninguém a segura agora ({@code locked_until <= now}). */
    boolean tryAcquire(String name, String holder, Instant now, Instant until);

    /** Devolve a trava, se ainda for de {@code holder}. */
    void release(String name, String holder, Instant now);
}
