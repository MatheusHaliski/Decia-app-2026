package br.gov.pr.secid.workstation.infrastructure.mysql.audit;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V72 — o {@code audit_log} é append-only NO BANCO: com todas as migrations aplicadas por um usuário comum (sem SUPER, como em produção),
 * INSERT funciona e qualquer UPDATE ou DELETE — de uma linha, de todas, com ou sem transação — falha com SQLSTATE 45000 e deixa a linha
 * intacta. Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
class AuditLogAppendOnlyIT {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("workstation")
            .withUsername("workstation")
            .withPassword("test-only-" + System.nanoTime());   // gerada por execução, nunca versionada

    @BeforeAll
    static void migrate() {
        Flyway.configure().dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                .locations("classpath:db/migration").load().migrate();
    }

    private static Connection open() throws SQLException {
        return DriverManager.getConnection(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword());
    }

    @Test
    void insertPassaUpdateEDeleteSaoBarradosPeloGatilho() throws Exception {
        try (Connection c = open(); Statement st = c.createStatement()) {
            st.execute("INSERT INTO audit_log (id, action, resource_type, resource_id, result, ip) "
                    + "VALUES (UUID_TO_BIN('00000000-0000-0000-0000-0000000000a1'), 'LOGIN_FAILED', 'user', 'x', 'FALHA', '203.0.113.9')");

            assertThatThrownBy(() -> st.executeUpdate("UPDATE audit_log SET result = 'OK' WHERE resource_id = 'x'"))
                    .isInstanceOf(SQLException.class)
                    .satisfies(e -> assertThat(((SQLException) e).getSQLState()).isEqualTo("45000"))
                    .hasMessageContaining("UPDATE proibido");
            assertThatThrownBy(() -> st.executeUpdate("UPDATE audit_log SET ip = NULL"))
                    .as("apagar dado pessoal por UPDATE também é barrado").hasMessageContaining("UPDATE proibido");
            assertThatThrownBy(() -> st.executeUpdate("DELETE FROM audit_log WHERE resource_id = 'x'"))
                    .isInstanceOf(SQLException.class)
                    .satisfies(e -> assertThat(((SQLException) e).getSQLState()).isEqualTo("45000"))
                    .hasMessageContaining("DELETE proibido");
            assertThatThrownBy(() -> st.executeUpdate("DELETE FROM audit_log")).hasMessageContaining("DELETE proibido");

            try (ResultSet rs = st.executeQuery("SELECT result, ip FROM audit_log WHERE resource_id = 'x'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString(1)).isEqualTo("FALHA");
                assertThat(rs.getString(2)).isEqualTo("203.0.113.9");
                assertThat(rs.next()).isFalse();
            }
        }
    }

    @Test
    void dentroDeTransacaoOErroNaoApagaOQueJaFoiInserido() throws Exception {
        try (Connection c = open()) {
            c.setAutoCommit(false);
            try (Statement st = c.createStatement()) {
                st.execute("INSERT INTO audit_log (id, action, result) VALUES (UUID_TO_BIN('00000000-0000-0000-0000-0000000000b2'), 'TESTE', 'OK')");
                assertThatThrownBy(() -> st.executeUpdate("DELETE FROM audit_log WHERE action = 'TESTE'")).hasMessageContaining("append-only");
                c.commit();
            }
        }
        try (Connection c = open(); Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM audit_log WHERE action = 'TESTE'")) {
            rs.next();
            assertThat(rs.getLong(1)).isEqualTo(1);
        }
    }

    @Test
    void gatilhosExistemNoSchema() throws Exception {
        try (Connection c = open(); Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT TRIGGER_NAME, EVENT_MANIPULATION, ACTION_TIMING FROM information_schema.TRIGGERS "
                     + "WHERE EVENT_OBJECT_TABLE = 'audit_log' AND TRIGGER_SCHEMA = DATABASE() ORDER BY TRIGGER_NAME")) {
            assertThat(rs.next()).isTrue();
            assertThat(rs.getString(1)).isEqualTo("trg_audit_log_no_delete");
            assertThat(rs.getString(2)).isEqualTo("DELETE");
            assertThat(rs.getString(3)).isEqualTo("BEFORE");
            assertThat(rs.next()).isTrue();
            assertThat(rs.getString(1)).isEqualTo("trg_audit_log_no_update");
            assertThat(rs.getString(2)).isEqualTo("UPDATE");
            assertThat(rs.next()).isFalse();
        }
    }
}
