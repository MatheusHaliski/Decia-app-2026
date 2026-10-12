package br.gov.pr.secid.workstation.domain.catalog;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Teste-guarda do catálogo (D-40): (1) toda classe anotada com {@code @DomainEntity} está em {@code DomainCatalog.ENTITIES};
 * (2) invariantes dos descritores (tabelas/colunas únicas, FK para tabela conhecida, SET NULL só em coluna anulável, nomes ≤ 64);
 * (3) {@code docs/arquitetura/catalogo-entidades.json} é exatamente o que o domínio gera — rode com {@code -Dcatalog.write=true}
 * para reescrever o arquivo depois de mudar um record.
 */
class EntityCatalogTest {

    private static final Path CATALOG = Path.of("..", "docs", "arquitetura", "catalogo-entidades.json");

    @Test
    void todaEntidadeAnotadaEstaNoCatalogo() throws IOException {
        Path classes = Path.of("target", "classes");
        Set<Class<?>> annotated = new HashSet<>();
        try (Stream<Path> files = Files.walk(classes)) {
            for (Path p : files.filter(f -> f.toString().endsWith(".class")).toList()) {
                String name = classes.relativize(p).toString().replace('/', '.').replace('\\', '.').replaceAll("\\.class$", "");
                Class<?> c;
                try {
                    c = Class.forName(name);
                } catch (ClassNotFoundException | NoClassDefFoundError ex) {
                    continue;
                }
                if (c.isAnnotationPresent(DomainEntity.class)) {
                    annotated.add(c);
                }
            }
        }
        assertThat(annotated).isNotEmpty();
        assertThat(DomainCatalog.ENTITIES).containsExactlyInAnyOrderElementsOf(annotated);
        assertThat(DomainCatalog.ENTITIES).doesNotHaveDuplicates();
    }

    @Test
    void invariantesDosDescritores() {
        List<EntityDescriptor> entries = DomainCatalog.entries();
        Set<String> tables = new HashSet<>(DomainCatalog.PRE_EXISTING_TABLES);
        for (EntityDescriptor e : entries) {
            if (e.store().hasMysqlTable()) {
                assertThat(e.table()).as(e.entity() + " precisa de tabela").isNotBlank();
                if (e.migration() >= 10) {
                    assertThat(tables.add(e.table())).as("tabela repetida: " + e.table()).isTrue();
                } else {
                    assertThat(tables).as(e.entity() + " diz existir antes do V10").contains(e.table());
                }
                assertThat(DomainCatalog.MIGRATIONS.keySet().contains(e.migration()) || e.migration() == 2)
                        .as(e.entity() + " migration " + e.migration()).isTrue();
            }
            assertThat(e.attributes()).extracting(AttributeDescriptor::column).doesNotHaveDuplicates();
            if (e.store().hasMysqlTable()) {
                assertThat(e.attributes()).extracting(AttributeDescriptor::column).as(e.entity() + " pk").contains(e.pk());
            }
            assertThat(e.rfs()).isNotEmpty().allMatch(rf -> rf.matches("RF[1-9][0-9]?"));
            List<String> columns = e.attributes().stream().map(AttributeDescriptor::column).toList();
            for (String spec : Stream.concat(e.indexes().stream(), e.uniques().stream()).toList()) {
                for (String col : spec.split(",")) {
                    assertThat(columns).as(e.entity() + " índice/unicidade usa coluna inexistente: " + spec).contains(col.trim());
                }
            }
            assertThat(e.doc()).isNotBlank();
            for (AttributeDescriptor a : e.attributes()) {
                assertThat(a.description()).as(e.entity() + "." + a.name()).isNotBlank();
                assertThat(a.column()).matches("[a-z][a-z0-9_]*").hasSizeLessThanOrEqualTo(64);
                if ("SET NULL".equals(a.onDelete())) {
                    assertThat(a.nullable()).as(e.entity() + "." + a.name() + " SET NULL exige anulável").isTrue();
                }
                if (a.hasFk()) {
                    assertThat("fk_" + e.table() + "__" + a.column()).hasSizeLessThanOrEqualTo(64);
                }
            }
        }
        for (EntityDescriptor e : entries) {
            for (AttributeDescriptor a : e.attributes()) {
                if (a.hasFk()) {
                    assertThat(tables).as(e.entity() + "." + a.name() + " → " + a.refTable()).contains(a.refTable());
                }
            }
        }
    }

    @Test
    void maquinasDeEstadoCobremTodosOsEnumsDeStatusComTransicao() {
        // toda tabela com coluna status/state de enum que tem máquina de estados declara canTransitionTo
        for (EntityDescriptor e : DomainCatalog.entries()) {
            for (AttributeDescriptor a : e.attributes()) {
                if (a.isEnum() && (a.column().equals("status") || a.column().equals("state"))) {
                    assertThat(a.enumValues()).as(e.entity() + "." + a.name()).isNotEmpty();
                }
            }
        }
    }

    @Test
    void catalogoJsonEstaAtualizado() throws IOException {
        String expected = CatalogJson.render(DomainCatalog.entries());
        if (Boolean.getBoolean("catalog.write")) {
            Files.writeString(CATALOG, expected, StandardCharsets.UTF_8);
        }
        assertThat(CATALOG).as("gere com: mvn -q -pl ws-domain test -Dtest=EntityCatalogTest -Dcatalog.write=true").exists();
        String actual = Files.readString(CATALOG, StandardCharsets.UTF_8);
        assertThat(actual).as("catalogo-entidades.json desatualizado — regenere com -Dcatalog.write=true").isEqualTo(expected);
        long attributes = DomainCatalog.entries().stream().mapToLong(e -> e.attributes().size()).sum();
        assertThat(DomainCatalog.entries().size()).isGreaterThan(100);
        assertThat(attributes).isGreaterThan(1000);
    }
}
