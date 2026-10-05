package db.migration;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Duas branches que criam a mesma versão de migration passam no merge sem conflito (os nomes são diferentes), mas o
 * Flyway recusa versões repetidas e a API não sobe. Este teste falha no {@code mvn verify} antes do deploy:
 * versões SQL e Java somadas ({@code classpath*:db/migration/V*__*}), sem repetição; classes internas ({@code $}) ignoradas.
 */
class MigrationVersionsTest {
    private static final Pattern NAME = Pattern.compile("^V([0-9_.]+)__.+\\.(sql|class)$");

    static Map<String, List<String>> versions() throws Exception {
        Map<String, List<String>> byVersion = new TreeMap<>();
        for (Resource r : new PathMatchingResourcePatternResolver().getResources("classpath*:db/migration/V*__*")) {
            String file = r.getFilename();
            Matcher m = file == null ? null : NAME.matcher(file);
            if (m == null || !m.matches() || file.contains("$")) {
                continue;                                    // classes internas (V34__X$Fk.class) não são migrations
            }
            String version = m.group(1).replace('_', '.').replaceAll("(\\.0+)+$", "");
            byVersion.computeIfAbsent(version, v -> new ArrayList<>()).add(file);
        }
        return byVersion;
    }

    @Test
    void cadaVersaoDeMigrationApareceUmaVezSo() throws Exception {
        Map<String, List<String>> byVersion = versions();
        assertThat(byVersion).as("migrations encontradas no classpath").containsKey("1");
        Map<String, List<String>> repeated = new TreeMap<>();
        byVersion.forEach((v, files) -> {
            if (files.size() > 1) {
                repeated.put(v, files);
            }
        });
        assertThat(repeated).as("versões de migration repetidas (renumere a mais nova)").isEmpty();
    }

    @Test
    void baselineDoBloco1EhAV1() throws Exception {
        assertThat(versions().get("1")).containsExactly("V1__baseline.sql");
    }

    @Test
    void normalizacaoDeVersaoTrataZerosESeparadores() {
        // V1_0, V1.0 e V1 são a mesma versão para o Flyway — e para este teste
        for (String name : List.of("V1_0__a.sql", "V1.0__b.sql", "V1__c.class")) {
            Matcher m = NAME.matcher(name);
            assertThat(m.matches()).isTrue();
            assertThat(m.group(1).replace('_', '.').replaceAll("(\\.0+)+$", "")).isEqualTo("1");
        }
        assertThat(NAME.matcher("R__repeatable.sql").matches()).isFalse();
        assertThat(NAME.matcher("V2__x.txt").matches()).isFalse();
    }
}
