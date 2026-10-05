package br.gov.pr.secid.workstation.infrastructure.mysql;

import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * MySQL é a fonte de verdade e o único store sempre ligado (ARQUITETURA §3.2). As entidades JPA ({@code *Entity}) e os
 * repositórios Spring Data das migrations V10+ ficam neste módulo, por contexto ({@code infrastructure.mysql.<contexto>.entity|repository},
 * gerados do {@code DomainCatalog} de ws-domain, D-40); o schema é 100% Flyway ({@code db/migration/V*__*.sql}, {@code ddl-auto: none}).
 * Boot 4: {@code EntityScan} mudou para {@code org.springframework.boot.persistence.autoconfigure}.
 */
@Configuration
@EnableTransactionManagement
@EntityScan(basePackages = {"br.gov.pr.secid.workstation.domain", "br.gov.pr.secid.workstation.infrastructure.mysql"})
@EnableJpaRepositories(basePackages = {"br.gov.pr.secid.workstation.domain", "br.gov.pr.secid.workstation.infrastructure.mysql"})
public class MysqlPersistenceConfig {
}
