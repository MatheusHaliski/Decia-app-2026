package br.gov.pr.secid.workstation.infrastructure.mysql.audit;

import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * Grava o {@code audit_log} em transação PRÓPRIA ({@code REQUIRES_NEW}): a trilha de uma tentativa de login que falhou
 * precisa sobreviver ao rollback do caso de uso. Metadados já saneados pelo {@link AuditEvent}.
 */
@Component
public class JpaAuditLog implements AuditLogPort {
    private static final Logger log = LoggerFactory.getLogger(JpaAuditLog.class);
    private final AuditLogJpaRepository repository;
    private final ObjectMapper mapper;

    public JpaAuditLog(AuditLogJpaRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditEvent e) {
        String metadata = e.metadata().isEmpty() ? null : mapper.writeValueAsString(e.metadata());
        repository.save(new AuditLogEntity(e.actorId(), e.action(), e.resourceType(), e.resourceId(), e.result(), e.ip(),
                e.userAgent(), e.correlationId(), metadata));
        log.debug("audit {} {} actor={}", e.action(), e.result(), e.actorId());
    }
}
