package br.gov.pr.secid.workstation.infrastructure.mysql.schema;

import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.catalog.AttributeDescriptor;
import br.gov.pr.secid.workstation.domain.catalog.DomainCatalog;
import br.gov.pr.secid.workstation.domain.catalog.EntityDescriptor;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Teste-guarda dos CHECKs de enum (conectores, V60): ampliar um enum Java exige migration nova que amplie o CHECK (como a V37 e a V60) —
 * senão o INSERT do valor novo quebra só em produção. Para cada atributo enum de tabela do catálogo, a ÚLTIMA definição do
 * {@code ck_<tabela>_<coluna>} nas migrations (em ordem de versão, CREATE TABLE ou ALTER TABLE … ADD CONSTRAINT) tem exatamente os valores
 * do enum.
 */
class EnumChecksMatchCatalogTest {
    private static final Pattern FILE = Pattern.compile("^V([0-9_.]+)__.+\\.sql$");
    private static final Pattern CHECK = Pattern.compile(
            "CONSTRAINT\\s+(ck_\\w+)\\s+CHECK\\s*\\(\\s*(?:\\w+\\s+IS\\s+NULL\\s+OR\\s+)?\\w+\\s+IN\\s*\\(([^)]*)\\)\\s*\\)",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    /** Nome da constraint → valores, da última migration que a define. */
    static Map<String, List<String>> lastChecks() throws Exception {
        Map<Double, String> byVersion = new TreeMap<>();
        for (Resource r : new PathMatchingResourcePatternResolver().getResources("classpath*:db/migration/V*__*.sql")) {
            Matcher m = FILE.matcher(r.getFilename() == null ? "" : r.getFilename());
            if (m.matches()) {
                byVersion.put(Double.parseDouble(m.group(1).replace('_', '.')), r.getContentAsString(StandardCharsets.UTF_8));
            }
        }
        Map<String, List<String>> out = new LinkedHashMap<>();
        for (String sql : byVersion.values()) {
            Matcher c = CHECK.matcher(sql.replaceAll("(?m)--.*$", ""));
            while (c.find()) {
                List<String> values = new ArrayList<>();
                for (String v : c.group(2).split(",")) {
                    values.add(v.strip().replace("'", ""));
                }
                out.put(c.group(1).toLowerCase(), values);
            }
        }
        return out;
    }

    /** Mesmo encurtamento do SchemaGenerator para nomes acima de 64 caracteres. */
    static String constraintName(String table, String column) {
        String name = "ck_" + table + "_" + column;
        if (name.length() <= 64) {
            return name;
        }
        String suffix = Integer.toHexString(name.hashCode());
        return name.substring(0, 64 - suffix.length() - 1) + "_" + suffix;
    }

    @Test
    void ultimoCheckDeCadaEnumTemExatamenteOsValoresDoEnum() throws Exception {
        Map<String, List<String>> checks = lastChecks();
        int checked = 0;
        for (EntityDescriptor e : DomainCatalog.entries()) {
            if (!e.store().hasMysqlTable()) {
                continue;
            }
            for (AttributeDescriptor a : e.attributes()) {
                if (!a.isEnum()) {
                    continue;
                }
                String name = constraintName(e.table(), a.column());
                if (!checks.containsKey(name)) {
                    continue;   // tabelas do V1/V2 escritas à mão podem nomear diferente; o resto do schema é gerado
                }
                assertThat(checks.get(name)).as(name + " × enum " + a.type()).containsExactlyInAnyOrderElementsOf(a.enumValues());
                checked++;
            }
        }
        assertThat(checked).isGreaterThan(100);
    }

    @Test
    void osTresChecksAmpliadosPelaV60EstaoEmDia() throws Exception {
        Map<String, List<String>> checks = lastChecks();
        List<String> types = Arrays.stream(TaskType.values()).map(Enum::name).toList();
        assertThat(checks.get("ck_tasks_type")).containsExactlyElementsOf(types);
        assertThat(checks.get("ck_compliance_items_expected_type")).containsExactlyElementsOf(types);
        assertThat(checks.get("ck_tasks_source_kind")).containsExactlyElementsOf(Arrays.stream(SourceKind.values()).map(Enum::name).toList());
        assertThat(checks.get("ck_connector_accounts_status")).containsExactly("ATIVO", "EXPIRADO", "REVOGADO", "ERRO");
    }
}
