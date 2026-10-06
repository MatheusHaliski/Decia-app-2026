package br.gov.pr.secid.workstation.domain.catalog;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Metadados de catálogo de uma entidade de domínio (record). É a única fonte do {@code docs/arquitetura/catalogo-entidades.json},
 * das migrations {@code V10+} e das entidades JPA geradas — ver {@link DomainCatalog}.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DomainEntity {

    /** Contexto da TAXONOMIA, ex.: {@code "2 Acervo de Tarefas"}. */
    String context();

    /** Tabela MySQL (ou tabela Cassandra / índice OpenSearch / chave Redis); vazio quando só código. */
    String table() default "";

    /** RFs onde a entidade nasce ou é lida (TAXONOMIA §16). */
    String[] rfs();

    Store store() default Store.MYSQL;

    /** Comentário de cabeçalho da tabela na migration (1–3 linhas). */
    String doc();

    /** Versão da migration Flyway que cria a tabela; 0 = sem tabela própria; 2 = já existe no V2 (não gera SQL). */
    int migration() default 0;

    Audit audit() default Audit.FULL;

    /** Coluna {@code version BIGINT} para lock otimista. */
    boolean versioned() default false;

    /**
     * Trilha append-only: o gerador emite a entidade JPA como {@code @Immutable} com todas as colunas {@code updatable = false} e um
     * repositório só de inserção/leitura (sem update/delete), como o {@code AuditLogJpaRepository}. Não muda o SQL.
     */
    boolean appendOnly() default false;

    /** Coluna chave primária quando não é {@code id}; o record deve ter o componente correspondente. */
    String pk() default "id";

    /** Índices simples: cada entrada é a lista de colunas separada por vírgula. */
    String[] indexes() default {};

    /** Unicidades compostas: cada entrada é a lista de colunas separada por vírgula. */
    String[] uniques() default {};

    /** CHECKs adicionais (expressão SQL completa). */
    String[] checks() default {};
}
