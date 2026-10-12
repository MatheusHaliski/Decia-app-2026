package br.gov.pr.secid.workstation.infrastructure.mysql.schema;

import br.gov.pr.secid.workstation.domain.catalog.DomainCatalog;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.EntityDescriptor;
import jakarta.persistence.Column;
import org.hibernate.annotations.Immutable;
import org.junit.jupiter.api.Test;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.ListCrudRepository;
import org.springframework.data.repository.PagingAndSortingRepository;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Teste-guarda do contrato append-only (Codex P2, PR #30): toda entidade {@code @DomainEntity(appendOnly = true)} — o snapshot "no momento
 * da decisão" e o histórico da decisão — precisa sair do gerador com entidade {@code @Immutable}, todas as colunas {@code updatable = false}
 * e um repositório que só insere e lê. Sem isso, um {@code save}/merge ou {@code delete*} reescreveria o passado.
 */
class AppendOnlyRepositoriesTest {

    private static final String INFRA_PKG = "br.gov.pr.secid.workstation.infrastructure.mysql";

    @Test
    void trilhasAppendOnlyNaoExpoemUpdateNemDelete() throws Exception {
        List<String> checked = new ArrayList<>();
        for (EntityDescriptor e : DomainCatalog.entries()) {
            DomainEntity ann = e.type().getAnnotation(DomainEntity.class);
            if (ann == null || !ann.appendOnly()) {
                continue;
            }
            String pkg = e.type().getPackageName();
            String ctx = pkg.substring(pkg.lastIndexOf('.') + 1);
            Class<?> entity = Class.forName(INFRA_PKG + "." + ctx + ".entity." + e.entity() + "Entity");
            Class<?> repo = Class.forName(INFRA_PKG + "." + ctx + ".repository." + e.entity() + "Repository");

            assertThat(entity.isAnnotationPresent(Immutable.class)).as(e.entity() + "Entity é @Immutable").isTrue();
            for (Field f : entity.getDeclaredFields()) {
                Column c = f.getAnnotation(Column.class);
                if (c != null) {
                    assertThat(c.updatable()).as(e.entity() + "." + f.getName() + " updatable = false").isFalse();
                }
            }
            assertThat(CrudRepository.class.isAssignableFrom(repo) || ListCrudRepository.class.isAssignableFrom(repo)
                    || PagingAndSortingRepository.class.isAssignableFrom(repo)).as(repo.getSimpleName() + " não herda CRUD").isFalse();
            for (Method m : repo.getMethods()) {
                String name = m.getName().toLowerCase(Locale.ROOT);
                assertThat(name.startsWith("delete") || name.startsWith("remove") || name.startsWith("update") || name.equals("saveall")
                        || name.equals("saveandflush")).as(repo.getSimpleName() + "." + m.getName()).isFalse();
            }
            checked.add(e.table());
        }
        assertThat(checked).as("trilhas append-only do contexto 5b").contains("decision_snapshots", "decision_events");
    }
}
