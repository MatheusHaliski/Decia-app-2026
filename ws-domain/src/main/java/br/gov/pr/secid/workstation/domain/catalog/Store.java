package br.gov.pr.secid.workstation.domain.catalog;

/** Banco de produção onde a entidade vive (ARQUITETURA §3.2). O rótulo é o que vai ao catálogo JSON. */
public enum Store {
    MYSQL("mysql"),
    CASSANDRA("cassandra"),
    OPENSEARCH("opensearch"),
    REDIS("redis"),
    S3("s3"),
    /** Estado em MySQL com projeção/TTL em Cassandra (notificações, mural). */
    MYSQL_CASSANDRA("mysql+cassandra"),
    /** Fonte Cassandra com índice leve em MySQL (mensagens da sessão, D-05). */
    CASSANDRA_MYSQL("cassandra+mysql"),
    /** Estado em MySQL com cache/saldo em Redis (rankings, cotas). */
    MYSQL_REDIS("mysql+redis"),
    /** Metadados em MySQL, binário em S3. */
    MYSQL_S3("mysql+s3"),
    /** Texto em MySQL com embeddings/índice em OpenSearch. */
    MYSQL_OPENSEARCH("mysql+opensearch"),
    /** Só código (registro estático), sem tabela. */
    CODE("code");

    private final String label;

    Store(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** Verdadeiro quando existe tabela MySQL (CREATE TABLE em migration Flyway). */
    public boolean hasMysqlTable() {
        return label.contains("mysql");
    }
}
