package br.gov.pr.secid.workstation.infrastructure.cassandra;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * Projeções append-only no Cassandra 4.1 (timeline_by_user, notifications_by_user, messages_by_session, trace_by_entity).
 * Opt-in: {@code ws.cassandra.enabled=true} (perfil {@code cassandra} no application.yml). Sem a flag, nenhum bean
 * deste módulo existe e as projeções caem para as implementações MySQL/in-memory (ARQUITETURA §3.2).
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.cassandra", name = "enabled", havingValue = "true")
public class CassandraAdaptersConfig {
    private static final Logger log = LoggerFactory.getLogger(CassandraAdaptersConfig.class);

    public CassandraAdaptersConfig() {
        log.info("Adaptador Cassandra ligado (ws.cassandra.enabled=true)");
    }
}
