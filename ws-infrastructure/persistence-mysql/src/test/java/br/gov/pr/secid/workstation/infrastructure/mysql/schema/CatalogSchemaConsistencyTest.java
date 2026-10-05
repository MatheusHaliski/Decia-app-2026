package br.gov.pr.secid.workstation.infrastructure.mysql.schema;

import br.gov.pr.secid.workstation.domain.catalog.AttributeDescriptor;
import br.gov.pr.secid.workstation.domain.catalog.DomainCatalog;
import br.gov.pr.secid.workstation.domain.catalog.EntityDescriptor;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Teste-guarda (D-40): o catálogo de domínio ({@code DomainCatalog}, fonte do {@code catalogo-entidades.json}) e as migrations SQL
 * descrevem as MESMAS tabelas e colunas — para cada entidade com tabela MySQL, o conjunto de colunas do {@code CREATE TABLE}
 * (mais {@code ALTER TABLE … ADD COLUMN}) é igual ao dos atributos; toda FK do catálogo está na {@code ForeignKeyPolicy.POLICY}
 * com a mesma regra. Vale também para as tabelas do V2 que o catálogo descreve (ai_inference_log, media_objects, …).
 */
class CatalogSchemaConsistencyTest {

    private static final Pattern CREATE = Pattern.compile("CREATE\\s+TABLE\\s+(\\w+)\\s*\\((.*?)\\)\\s*ENGINE", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern ADD_COLUMN = Pattern.compile("ALTER\\s+TABLE\\s+(\\w+)\\s+ADD\\s+COLUMN\\s+(\\w+)", Pattern.CASE_INSENSITIVE);
    private static final Set<String> NOT_COLUMNS = Set.of("PRIMARY", "CONSTRAINT", "INDEX", "UNIQUE", "KEY", "FOREIGN", "FULLTEXT", "CHECK", "ON");

    private static Map<String, List<String>> columnsByTable() throws Exception {
        Map<String, List<String>> out = new LinkedHashMap<>();
        for (Resource r : new PathMatchingResourcePatternResolver().getResources("classpath*:db/migration/V*__*.sql")) {
            String sql = r.getContentAsString(StandardCharsets.UTF_8).replaceAll("(?m)--.*$", "");
            Matcher m = CREATE.matcher(sql);
            while (m.find()) {
                List<String> cols = new ArrayList<>();
                for (String line : m.group(2).split("\n")) {
                    String t = line.trim();
                    if (t.isEmpty()) {
                        continue;
                    }
                    String first = t.split("\\s+")[0];
                    if (!NOT_COLUMNS.contains(first.toUpperCase(Locale.ROOT)) && first.matches("\\w+")) {
                        cols.add(first.toLowerCase(Locale.ROOT));
                    }
                }
                out.put(m.group(1).toLowerCase(Locale.ROOT), cols);
            }
            Matcher a = ADD_COLUMN.matcher(sql);
            while (a.find()) {
                out.computeIfAbsent(a.group(1).toLowerCase(Locale.ROOT), k -> new ArrayList<>()).add(a.group(2).toLowerCase(Locale.ROOT));
            }
        }
        return out;
    }

    @Test
    void colunasDoCatalogoSaoAsColunasDasMigrations() throws Exception {
        Map<String, List<String>> sql = columnsByTable();
        int checked = 0;
        for (EntityDescriptor e : DomainCatalog.entries()) {
            if (!e.store().hasMysqlTable()) {
                continue;
            }
            List<String> expected = e.attributes().stream().map(AttributeDescriptor::column).toList();
            assertThat(sql).as("tabela " + e.table() + " (" + e.entity() + ") nas migrations").containsKey(e.table());
            assertThat(sql.get(e.table())).as(e.table() + ": colunas do SQL × catálogo").containsExactlyInAnyOrderElementsOf(expected);
            checked++;
        }
        assertThat(checked).isGreaterThan(100);
    }

    @Test
    void fksDoCatalogoEstaoNaPoliticaComAMesmaRegra() {
        Map<String, String> policy = new LinkedHashMap<>();
        for (ForeignKeyPolicy.Fk fk : ForeignKeyPolicy.POLICY) {
            policy.put(fk.key(), fk.onDelete());
        }
        for (EntityDescriptor e : DomainCatalog.entries()) {
            if (!e.store().hasMysqlTable()) {
                continue;
            }
            for (AttributeDescriptor a : e.attributes()) {
                if (a.hasFk()) {
                    String key = e.table() + "." + a.column() + "->" + a.refTable() + "." + a.refColumn();
                    assertThat(policy).as(key).containsEntry(key, a.onDelete());
                }
            }
        }
        for (DomainCatalog.ExtraFk x : DomainCatalog.EXTRA_FKS) {
            assertThat(policy).containsEntry(x.table() + "." + x.column() + "->" + x.refTable() + "." + x.refColumn(), x.onDelete());
        }
    }

    @Test
    void migrationsGeradasTemUmaTabelaPorEntidadeENadaMais() throws Exception {
        Map<String, List<String>> sql = columnsByTable();
        Set<String> catalog = new java.util.HashSet<>(DomainCatalog.PRE_EXISTING_TABLES);
        DomainCatalog.entries().stream().filter(EntityDescriptor::generatesSql).forEach(e -> catalog.add(e.table()));
        for (String table : sql.keySet()) {
            // tabelas de outros blocos (V1–V9) são conhecidas por PRE_EXISTING_TABLES; as V10+ têm de estar no catálogo
            assertThat(catalog).as("tabela " + table + " sem entidade no catálogo (registre em DomainCatalog.ENTITIES ou PRE_EXISTING_TABLES)")
                    .contains(table);
        }
    }
}
