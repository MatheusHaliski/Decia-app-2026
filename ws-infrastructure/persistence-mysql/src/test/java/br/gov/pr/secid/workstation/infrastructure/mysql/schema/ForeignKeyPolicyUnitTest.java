package br.gov.pr.secid.workstation.infrastructure.mysql.schema;

import br.gov.pr.secid.workstation.infrastructure.mysql.schema.ForeignKeyPolicy.Diff;
import br.gov.pr.secid.workstation.infrastructure.mysql.schema.ForeignKeyPolicy.Fk;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Testes sem banco do record {@link Fk}, do {@link ForeignKeyPolicy#compare} e da coerência entre a {@code POLICY} e o
 * TEXTO das migrations SQL (regex sobre {@code CONSTRAINT fk_… FOREIGN KEY … ON DELETE …}). O {@code ForeignKeyPolicyTest}
 * faz a mesma comparação contra o MySQL real (Testcontainers); este aqui roda em qualquer máquina, com ou sem Docker.
 */
class ForeignKeyPolicyUnitTest {

    private static final Pattern FK_IN_SQL = Pattern.compile(
            "CONSTRAINT\\s+(\\w+)\\s+FOREIGN\\s+KEY\\s*\\((\\w+)\\)\\s*REFERENCES\\s+(\\w+)\\s*\\((\\w+)\\)"
                    + "\\s*ON\\s+DELETE\\s+(CASCADE|RESTRICT|SET\\s+NULL|NO\\s+ACTION)\\s+ON\\s+UPDATE\\s+(\\w+)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern ANY_FK_IN_SQL = Pattern.compile("FOREIGN\\s+KEY", Pattern.CASE_INSENSITIVE);

    @Test
    void recordValidaIdentificadoresERegra() {
        Fk ok = new Fk("user_preferences", "user_id", "users", "CASCADE");
        assertThat(ok.refColumn()).isEqualTo("id");
        assertThat(ok.constraintName()).isEqualTo("fk_user_preferences__user_id");
        assertThat(ok.key()).isEqualTo("user_preferences.user_id->users.id");
        assertThat(ok).hasToString("user_preferences.user_id → users.id ON DELETE CASCADE");

        assertThat(new Fk("a", "b", "c", "d", "no action").onDelete()).isEqualTo("RESTRICT");
        assertThat(new Fk("a", "b", "c", "d", " set   null ").onDelete()).isEqualTo("SET NULL");

        assertThatThrownBy(() -> new Fk("Users", "id", "x", "CASCADE")).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("identificador inválido");
        assertThatThrownBy(() -> new Fk("users; drop", "id", "x", "CASCADE")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Fk("users", "id", "x", null, "CASCADE")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Fk("users", "id", "x", "SET DEFAULT")).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ON DELETE inválido");
        assertThatThrownBy(() -> new Fk("users", "id", "x", null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void compareDevolveFaltantesExtrasEDivergentes() {
        Fk a = new Fk("a", "x_id", "x", "CASCADE");
        Fk b = new Fk("b", "x_id", "x", "RESTRICT");
        Fk c = new Fk("c", "x_id", "x", "SET NULL");
        Fk bDivergente = new Fk("b", "x_id", "x", "CASCADE");
        Fk extra = new Fk("d", "x_id", "x", "CASCADE");

        Diff diff = ForeignKeyPolicy.compare(List.of(a, b, c), List.of(a, bDivergente, extra));

        assertThat(diff.isEmpty()).isFalse();
        assertThat(diff.missing()).containsExactly(c);
        assertThat(diff.extra()).containsExactly(extra);
        assertThat(diff.divergent()).hasSize(1);
        assertThat(diff.divergent().get(0).expected()).isEqualTo(b);
        assertThat(diff.divergent().get(0).actual()).isEqualTo(bDivergente);
        assertThat(diff.describe()).contains("ausente no banco", "sem entrada na POLICY", "regra ON DELETE diferente")
                .contains("b.x_id->x.id: política RESTRICT × banco CASCADE");
    }

    @Test
    void compareVazioQuandoIguaisMesmoEmOrdemDiferenteOuComNoAction() {
        Fk a = new Fk("a", "x_id", "x", "CASCADE");
        Fk b = new Fk("b", "x_id", "x", "RESTRICT");
        Diff diff = ForeignKeyPolicy.compare(List.of(a, b), List.of(b, new Fk("a", "x_id", "x", "id", "CASCADE")));
        assertThat(diff.isEmpty()).isTrue();
        assertThat(diff.describe()).isEqualTo("política e banco iguais");

        assertThat(ForeignKeyPolicy.compare(List.of(a, b), List.of(b, new Fk("a", "x_id", "x", "no action"))).divergent())
                .as("NO ACTION só é igual a RESTRICT, não a CASCADE").hasSize(1);
        assertThat(ForeignKeyPolicy.compare(List.of(b), List.of(new Fk("b", "x_id", "x", "NO ACTION"))).isEmpty()).isTrue();
    }

    @Test
    void compareRecusaFkRepetidaNoMesmoLado() {
        Fk a = new Fk("a", "x_id", "x", "CASCADE");
        assertThatThrownBy(() -> ForeignKeyPolicy.compare(List.of(a, a), List.of()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("FK repetida em POLICY");
    }

    @Test
    void diffEImutavel() {
        List<Fk> missing = new ArrayList<>(List.of(new Fk("a", "x_id", "x", "CASCADE")));
        Diff diff = new Diff(missing, List.of(), List.of());
        missing.clear();
        assertThat(diff.missing()).hasSize(1);
        assertThatThrownBy(() -> diff.missing().add(new Fk("b", "x_id", "x", "CASCADE")))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void politicaSemRepeticaoComNomesValidosESoRegrasPermitidas() {
        assertThat(ForeignKeyPolicy.POLICY).isNotEmpty();
        assertThat(ForeignKeyPolicy.POLICY).extracting(Fk::key).doesNotHaveDuplicates();
        assertThat(ForeignKeyPolicy.POLICY).extracting(Fk::constraintName).doesNotHaveDuplicates()
                .allSatisfy(n -> assertThat(n).startsWith("fk_").contains("__").hasSizeLessThanOrEqualTo(64));
        assertThat(ForeignKeyPolicy.POLICY).extracting(Fk::onDelete).containsOnly("CASCADE", "RESTRICT", "SET NULL");
        assertThatThrownBy(() -> ForeignKeyPolicy.POLICY.add(new Fk("a", "x_id", "x", "CASCADE")))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void trilhasAppendOnlyNuncaCascateiam() {
        assertThat(ForeignKeyPolicy.POLICY)
                .filteredOn(fk -> fk.table().equals("audit_log") || fk.table().equals("ai_inference_log"))
                .isNotEmpty()
                .allSatisfy(fk -> assertThat(fk.onDelete()).as(fk.toString()).isEqualTo("RESTRICT"));
    }

    /**
     * A POLICY precisa espelhar o que as migrations SQL declaram — este teste lê o texto das {@code V*__*.sql} e casa cada
     * {@code CONSTRAINT fk_… FOREIGN KEY} com a lista. Não substitui o teste contra o banco, mas pega o esquecimento mais
     * comum (FK nova sem linha na política) em qualquer máquina.
     */
    @Test
    void politicaEspelhaAsFksDeclaradasNasMigrationsSql() throws Exception {
        List<Fk> declared = new ArrayList<>();
        int anyFk = 0;
        for (Resource r : new PathMatchingResourcePatternResolver().getResources("classpath*:db/migration/V*__*.sql")) {
            String sql = r.getContentAsString(StandardCharsets.UTF_8);
            Matcher any = ANY_FK_IN_SQL.matcher(sql);
            while (any.find()) {
                anyFk++;
            }
            Matcher m = FK_IN_SQL.matcher(sql);
            while (m.find()) {
                String name = m.group(1).toLowerCase(Locale.ROOT);
                // a tabela dona da FK é a do CREATE TABLE que envolve a constraint
                Fk fk = new Fk(owningTable(sql, m.start()), m.group(2).toLowerCase(Locale.ROOT),
                        m.group(3).toLowerCase(Locale.ROOT), m.group(4).toLowerCase(Locale.ROOT), m.group(5));
                assertThat(name).as("nome da constraint em " + r.getFilename()).isEqualTo(fk.constraintName());
                assertThat(m.group(6).toUpperCase(Locale.ROOT)).as("ON UPDATE explícito em " + fk).isEqualTo("RESTRICT");
                declared.add(fk);
            }
        }
        assertThat(anyFk).as("toda FOREIGN KEY das migrations precisa ter nome, ON DELETE e ON UPDATE explícitos")
                .isEqualTo(declared.size());
        Diff diff = ForeignKeyPolicy.compare(ForeignKeyPolicy.POLICY, declared);
        assertThat(diff.isEmpty()).as(diff.describe()).isTrue();
    }

    @Test
    void migrationsNuncaDesligamAChecagemDeFk() throws Exception {
        for (Resource r : new PathMatchingResourcePatternResolver().getResources("classpath*:db/migration/V*__*.sql")) {
            // comentários (-- …) fora: o cabeçalho do V2 cita a regra de propósito
            String sql = r.getContentAsString(StandardCharsets.UTF_8).replaceAll("(?m)--.*$", "")
                    .toUpperCase(Locale.ROOT).replaceAll("\\s+", " ");
            assertThat(sql).as(r.getFilename()).doesNotContain("FOREIGN_KEY_CHECKS = 0").doesNotContain("FOREIGN_KEY_CHECKS=0")
                    .doesNotContain("FOREIGN_KEY_CHECKS = FALSE");
        }
    }

    private static String owningTable(String sql, int constraintOffset) {
        Matcher create = Pattern.compile("CREATE\\s+TABLE\\s+(\\w+)", Pattern.CASE_INSENSITIVE).matcher(sql);
        String table = null;
        while (create.find() && create.start() < constraintOffset) {
            table = create.group(1).toLowerCase(Locale.ROOT);
        }
        assertThat(table).as("CONSTRAINT fora de um CREATE TABLE (ALTER TABLE ainda não é lido por este teste)").isNotNull();
        return table;
    }
}
