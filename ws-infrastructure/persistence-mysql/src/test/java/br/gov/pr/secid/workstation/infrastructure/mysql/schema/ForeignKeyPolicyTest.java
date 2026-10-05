package br.gov.pr.secid.workstation.infrastructure.mysql.schema;

import br.gov.pr.secid.workstation.infrastructure.mysql.schema.ForeignKeyPolicy.Diff;
import br.gov.pr.secid.workstation.infrastructure.mysql.schema.ForeignKeyPolicy.Fk;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Teste-guarda da integridade referencial (Bloco 2, D-23): sobe um MySQL 8.4 real, roda TODAS as migrations do zero com o
 * Flyway e compara as FKs de INFORMATION_SCHEMA com {@link ForeignKeyPolicy#POLICY}. Os três conjuntos do
 * {@link Diff} precisam estar vazios: FK no banco sem entrada na política, entrada sem FK e regra ON DELETE diferente
 * falham. Também prova que {@code users.test_account} é coluna gerada, que o CHECK de {@code account_origin} barra valor
 * inválido e que a V2 está em {@code flyway_schema_history}.
 *
 * <p>Sem Docker na máquina o teste é pulado ({@code disabledWithoutDocker}); no CI o Docker existe. A senha do contêiner é
 * gerada por execução e nunca versionada.
 */
@Testcontainers(disabledWithoutDocker = true)
class ForeignKeyPolicyTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("workstation")
            .withUsername("workstation")
            .withPassword("test-only-" + System.nanoTime());   // gerada por execução, nunca versionada

    @BeforeAll
    static void migrateFromScratch() {
        Flyway.configure()
                .dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }

    private static Connection open() throws SQLException {
        return DriverManager.getConnection(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword());
    }

    @Test
    void fksDoBancoBatemComAPolitica() throws Exception {
        try (Connection c = open()) {
            List<Fk> actual = ForeignKeyPolicy.read(c);
            assertThat(actual).as("o V2 cria FKs; INFORMATION_SCHEMA não pode vir vazio").isNotEmpty();
            Diff diff = ForeignKeyPolicy.compare(ForeignKeyPolicy.POLICY, actual);
            assertThat(diff.extra()).as("FK no banco sem entrada na POLICY:\n" + diff.describe()).isEmpty();
            assertThat(diff.missing()).as("FK na POLICY ausente no banco:\n" + diff.describe()).isEmpty();
            assertThat(diff.divergent()).as("regra ON DELETE diferente:\n" + diff.describe()).isEmpty();
            assertThat(diff.isEmpty()).isTrue();
        }
    }

    @Test
    void todaFkTemNomePelaConvencaoEOnUpdateRestrict() throws Exception {
        String sql = "SELECT k.CONSTRAINT_NAME, k.TABLE_NAME, k.COLUMN_NAME, r.UPDATE_RULE "
                + "FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r "
                + "ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.TABLE_NAME = k.TABLE_NAME "
                + "WHERE k.TABLE_SCHEMA = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL";
        try (Connection c = open(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, c.getCatalog());
            int n = 0;
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    n++;
                    assertThat(rs.getString(1)).isEqualTo("fk_" + rs.getString(2) + "__" + rs.getString(3));
                    assertThat(rs.getString(4)).as(rs.getString(1)).isIn("RESTRICT", "NO ACTION");
                }
            }
            assertThat(n).isEqualTo(ForeignKeyPolicy.POLICY.size());
        }
    }

    @Test
    void testAccountEColunaGeradaDaOrigemDaConta() throws Exception {
        try (Connection c = open(); PreparedStatement ps = c.prepareStatement(
                "SELECT EXTRA, GENERATION_EXPRESSION FROM information_schema.COLUMNS "
                        + "WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'test_account'")) {
            ps.setString(1, c.getCatalog());
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).as("coluna users.test_account existe").isTrue();
                assertThat(rs.getString(1)).contains("GENERATED");
                assertThat(rs.getString(2)).containsIgnoringCase("account_origin").contains("TEST_SEED").contains("DEMO");
            }
        }
    }

    @Test
    void checkDeAccountOriginBarraValorInvalidoEGeradaSegueAOrigem() throws Exception {
        try (Connection c = open()) {
            c.setAutoCommit(false);
            try {
                assertThatThrownBy(() -> insertUser(c, "invalida", "INVALIDA"))
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("ck_users_account_origin");
                c.rollback();

                insertUser(c, "seed", "TEST_SEED");
                insertUser(c, "demo", "DEMO");
                insertUser(c, "real", "REAL");
                insertUser(c, "sistema", "SYSTEM");
                List<String> flagged = new ArrayList<>();
                try (Statement st = c.createStatement();
                     ResultSet rs = st.executeQuery("SELECT username FROM users WHERE test_account = TRUE ORDER BY username")) {
                    while (rs.next()) {
                        flagged.add(rs.getString(1));
                    }
                }
                assertThat(flagged).containsExactly("demo", "seed");
            } finally {
                c.rollback();
            }
        }
    }

    @Test
    void trilhaAppendOnlySeguraOUsuarioEDadoDoDonoVaiJunto() throws Exception {
        try (Connection c = open()) {
            c.setAutoCommit(false);
            try {
                insertUser(c, "dono", "TEST_SEED");
                try (Statement st = c.createStatement()) {
                    st.execute("INSERT INTO user_preferences (user_id) SELECT id FROM users WHERE username = 'dono'");
                    st.execute("INSERT INTO audit_log (id, actor_id, action, result) "
                            + "SELECT UUID_TO_BIN(UUID()), id, 'LOGIN', 'OK' FROM users WHERE username = 'dono'");
                }
                assertThatThrownBy(() -> {
                    try (Statement st = c.createStatement()) {
                        st.execute("DELETE FROM users WHERE username = 'dono'");
                    }
                }).as("audit_log RESTRICT").isInstanceOf(SQLException.class).hasMessageContaining("fk_audit_log__actor_id");

                try (Statement st = c.createStatement()) {
                    st.execute("DELETE FROM audit_log");
                    st.execute("DELETE FROM users WHERE username = 'dono'");
                    try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM user_preferences")) {
                        rs.next();
                        assertThat(rs.getLong(1)).as("user_preferences CASCADE").isZero();
                    }
                }
            } finally {
                c.rollback();
            }
        }
    }

    @Test
    void v1EV2EstaoNoHistoricoDoFlywayEBaselineEBloco2() throws Exception {
        try (Connection c = open(); Statement st = c.createStatement()) {
            List<String> versions = new ArrayList<>();
            try (ResultSet rs = st.executeQuery(
                    "SELECT version, script FROM flyway_schema_history WHERE success = 1 AND version IS NOT NULL ORDER BY installed_rank")) {
                while (rs.next()) {
                    versions.add(rs.getString(1) + "=" + rs.getString(2));
                }
            }
            assertThat(versions).containsExactly("1=V1__baseline.sql", "2=V2__baseline_dominio_base.sql", "3=V3__rf1_rf2_autenticacao.sql");
            try (ResultSet rs = st.executeQuery("SELECT meta_value FROM app_meta WHERE meta_key = 'schema.baseline'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString(1)).isEqualTo("bloco-2");
            }
            try (ResultSet rs = st.executeQuery("SELECT flag_key FROM feature_flags WHERE enabled = TRUE")) {
                List<String> on = new ArrayList<>();
                while (rs.next()) {
                    on.add(rs.getString(1));
                }
                assertThat(on).as("só ai.local.only nasce ligada").containsExactly("ai.local.only");
            }
        }
    }

    private static void insertUser(Connection c, String username, String origin) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO users (id, username, full_name, email_enc, email_hash, profile_type, account_origin) "
                        + "VALUES (UUID_TO_BIN(UUID()), ?, ?, ?, ?, 'EMPREGADO', ?)")) {
            ps.setString(1, username);
            ps.setString(2, "Conta " + username);
            ps.setString(3, "enc:" + username);
            ps.setString(4, "hash:" + username);
            ps.setString(5, origin);
            ps.executeUpdate();
        }
    }
}
