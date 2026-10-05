package br.gov.pr.secid.workstation.infrastructure.mysql;

import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * MySQL é a fonte de verdade e o único store sempre ligado (ARQUITETURA §3.2). O domínio puro fica em ws-domain; as
 * entidades JPA ({@code UserEntity}…) e os repositórios Spring Data ficam neste módulo, atrás das portas de
 * ws-application. O schema é 100% Flyway ({@code db/migration/V*__*.sql}, {@code ddl-auto: none}).
 * Boot 4: {@code EntityScan} mudou para {@code org.springframework.boot.persistence.autoconfigure}.
 */
@Configuration
@EnableTransactionManagement
@EntityScan(basePackages = {"br.gov.pr.secid.workstation.domain", "br.gov.pr.secid.workstation.infrastructure.mysql"})
@EnableJpaRepositories(basePackages = {"br.gov.pr.secid.workstation.domain", "br.gov.pr.secid.workstation.infrastructure.mysql"})
public class MysqlPersistenceConfig {
}
