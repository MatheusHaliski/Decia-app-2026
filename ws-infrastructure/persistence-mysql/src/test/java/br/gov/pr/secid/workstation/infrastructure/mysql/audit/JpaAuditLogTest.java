package br.gov.pr.secid.workstation.infrastructure.mysql.audit;

import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Achado P1 (Codex) / D-28: com transação ativa a trilha é gravada só DEPOIS do commit (em transação própria), nunca em
 * {@code REQUIRES_NEW} concorrente com a transação externa (que travava na FK {@code actor_id} de um usuário não commitado).
 */
class JpaAuditLogTest {

    /** Gerenciador sem recurso: só dispara os callbacks de sincronização (commit/rollback). */
    static final class NoopTransactionManager extends AbstractPlatformTransactionManager {
        int begun;

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            begun++;
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
        }
    }

    final List<AuditLogEntity> saved = new ArrayList<>();
    final NoopTransactionManager tm = new NoopTransactionManager();
    final AuditLogJpaRepository repository = new AuditLogJpaRepository() {
        @Override
        public AuditLogEntity save(AuditLogEntity entity) {
            saved.add(entity);
            return entity;
        }

        @Override
        public long count() {
            return saved.size();
        }
    };
    final JpaAuditLog audit = new JpaAuditLog(repository, new ObjectMapper(), tm);
    final AuditEvent event = new AuditEvent(UUID.randomUUID(), "LOGIN_OK", "auth", null, AuditEvent.OK, "1.2.3.4", "ua", "corr",
            Map.of("email", "m***@e***.br"));

    @Test
    void semTransacaoAtivaGravaNaHoraEmTransacaoPropria() {
        audit.record(event);
        assertThat(saved).hasSize(1);
        assertThat(tm.begun).as("uma transação própria para a trilha").isEqualTo(1);
    }

    @Test
    void comTransacaoAtivaGravaSoDepoisDoCommitENaoGravaNoRollback() {
        TransactionTemplate tx = new TransactionTemplate(tm);
        tx.executeWithoutResult(status -> {
            audit.record(event);
            assertThat(saved).as("nada gravado enquanto a transação externa está aberta").isEmpty();
        });
        assertThat(saved).as("gravado no afterCommit").hasSize(1);
        tx.executeWithoutResult(status -> {
            audit.record(event);
            status.setRollbackOnly();
        });
        assertThat(saved).as("rollback do caso de uso não deixa trilha órfã").hasSize(1);
    }

    @Test
    void falhaNaGravacaoAdiadaNuncaDerrubaOFluxoJaCommitado() {
        AuditLogJpaRepository broken = new AuditLogJpaRepository() {
            @Override
            public AuditLogEntity save(AuditLogEntity entity) {
                throw new IllegalStateException("banco fora");
            }

            @Override
            public long count() {
                return 0;
            }
        };
        JpaAuditLog fragile = new JpaAuditLog(broken, new ObjectMapper(), tm);
        TransactionTemplate tx = new TransactionTemplate(tm);
        assertThatCode(() -> tx.executeWithoutResult(status -> fragile.record(event))).doesNotThrowAnyException();
    }
}
