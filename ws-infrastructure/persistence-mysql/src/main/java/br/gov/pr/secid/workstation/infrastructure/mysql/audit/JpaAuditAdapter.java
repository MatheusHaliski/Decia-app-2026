package br.gov.pr.secid.workstation.infrastructure.mysql.audit;

import br.gov.pr.secid.workstation.application.audit.AuditEntry;
import br.gov.pr.secid.workstation.application.audit.AuditPort;
import br.gov.pr.secid.workstation.domain.audit.AuditLog;
import br.gov.pr.secid.workstation.domain.audit.AuditLogRepository;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * Grava {@code audit_log} em transação própria ({@code REQUIRES_NEW}): a linha de um login errado ou de um acesso
 * negado sobrevive ao rollback do caso de uso. O {@code correlationId} vem do MDC (posto pelo {@code CorrelationIdFilter}),
 * então toda linha pode ser cruzada com o log da mesma requisição.
 */
@Component
public class JpaAuditAdapter implements AuditPort {
    static final String MDC_CORRELATION = "correlationId";

    private final AuditLogRepository repository;
    private final ObjectMapper mapper;

    public JpaAuditAdapter(AuditLogRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditEntry entry) {
        repository.save(toEntity(entry));
    }

    AuditLog toEntity(AuditEntry entry) {
        AuditLog row = new AuditLog();
        row.setActorId(entry.actorId());
        row.setAction(entry.action());
        row.setResult(entry.result());
        row.setIp(entry.ip());
        row.setUserAgent(entry.userAgent());
        row.setCorrelationId(MDC.get(MDC_CORRELATION));
        row.setMetadataJson(entry.metadata().isEmpty() ? null : mapper.writeValueAsString(entry.metadata()));
        return row;
    }
}
