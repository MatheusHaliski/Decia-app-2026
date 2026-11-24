package br.gov.pr.secid.workstation.infrastructure.mysql.plataforma;

import br.gov.pr.secid.workstation.application.jobs.JobLockPort;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Trava dos trabalhos agendados ({@code scheduled_job_locks}, V70), no estilo do ShedLock: a linha do trabalho nasce na primeira vez
 * ({@code INSERT IGNORE}, já expirada) e a trava é um {@code UPDATE} condicional — só uma instância muda a linha enquanto
 * {@code locked_until <= agora}. Cada operação na própria transação, curta, fora da transação de quem chama.
 */
@Configuration
public class JpaJobLockAdapter {

    @Bean
    JobLockPort jobLockPort(EntityManager em) {
        return new JobLockPort() {
            @Override
            @Transactional(propagation = Propagation.REQUIRES_NEW)
            public boolean tryAcquire(String name, String holder, Instant now, Instant until) {
                em.createNativeQuery("INSERT IGNORE INTO scheduled_job_locks (name, locked_until, locked_at, locked_by) VALUES (?1, ?2, ?2, ?3)")
                        .setParameter(1, name).setParameter(2, now).setParameter(3, "-").executeUpdate();
                return em.createNativeQuery("UPDATE scheduled_job_locks SET locked_until = ?1, locked_at = ?2, locked_by = ?3 "
                                + "WHERE name = ?4 AND locked_until <= ?2")
                        .setParameter(1, until).setParameter(2, now).setParameter(3, holder).setParameter(4, name).executeUpdate() == 1;
            }

            @Override
            @Transactional(propagation = Propagation.REQUIRES_NEW)
            public void release(String name, String holder, Instant now) {
                em.createNativeQuery("UPDATE scheduled_job_locks SET locked_until = ?1 WHERE name = ?2 AND locked_by = ?3")
                        .setParameter(1, now).setParameter(2, name).setParameter(3, holder).executeUpdate();
            }
        };
    }
}
