package br.gov.pr.secid.workstation.infrastructure.mysql.audit;

import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

/**
 * Grava o {@code audit_log} (D-28). Com transação ativa na requisição, a gravação é adiada para {@code afterCommit}
 * e feita numa transação própria: assim a trilha de um cadastro que cria o usuário no mesmo fluxo não precisa validar a FK
 * {@code audit_log.actor_id → users.id} contra uma linha ainda não commitada (o {@code REQUIRES_NEW} direto esperava o lock
 * até o timeout), e um rollback do caso de uso não deixa trilha órfã. Sem transação ativa, grava na hora, em transação própria.
 * Falha na gravação adiada é registrada em ERROR e nunca derruba o fluxo que já foi commitado.
 */
@Component
public class JpaAuditLog implements AuditLogPort {
    private static final Logger log = LoggerFactory.getLogger(JpaAuditLog.class);
    private final AuditLogJpaRepository repository;
    private final ObjectMapper mapper;
    private final TransactionTemplate ownTransaction;

    public JpaAuditLog(AuditLogJpaRepository repository, ObjectMapper mapper, PlatformTransactionManager transactions) {
        this.repository = repository;
        this.mapper = mapper;
        this.ownTransaction = new TransactionTemplate(transactions);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public void record(AuditEvent e) {
        if (TransactionSynchronizationManager.isSynchronizationActive() && TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        write(e);
                    } catch (RuntimeException ex) {
                        log.error("Falha ao gravar audit_log {} depois do commit: {}", e.action(), ex.getClass().getSimpleName());
                    }
                }
            });
            return;
        }
        write(e);
    }

    private void write(AuditEvent e) {
        String metadata = e.metadata().isEmpty() ? null : mapper.writeValueAsString(e.metadata());
        ownTransaction.executeWithoutResult(status -> repository.save(new AuditLogEntity(e.actorId(), e.action(), e.resourceType(),
                e.resourceId(), e.result(), e.ip(), e.userAgent(), e.correlationId(), metadata)));
        log.debug("audit {} {} actor={}", e.action(), e.result(), e.actorId());
    }
}
