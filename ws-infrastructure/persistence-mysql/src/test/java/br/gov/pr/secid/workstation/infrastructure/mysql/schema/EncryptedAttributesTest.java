package br.gov.pr.secid.workstation.infrastructure.mysql.schema;

import br.gov.pr.secid.workstation.domain.catalog.AttributeDescriptor;
import br.gov.pr.secid.workstation.domain.catalog.DomainCatalog;
import br.gov.pr.secid.workstation.domain.catalog.EntityDescriptor;
import br.gov.pr.secid.workstation.infrastructure.mysql.crypto.AesGcmStringConverter;
import jakarta.persistence.Convert;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Teste-guarda LGPD (achado 3 do PR #22): todo atributo {@code @Attr(encrypted = true)} do catálogo (coluna {@code *_enc}) precisa de
 * {@code @Convert(converter = AesGcmStringConverter.class)} na entidade JPA gerada — senão o CNPJ, a geolocalização ou a transcrição iriam
 * em claro para o banco. Também o inverso: nenhuma coluna {@code *_enc} sem {@code encrypted} e nenhum {@code @Convert} fora delas.
 */
class EncryptedAttributesTest {

    private static final String INFRA_PKG = "br.gov.pr.secid.workstation.infrastructure.mysql";

    @Test
    void todoAtributoCifradoDoCatalogoTemOConversorNaEntidadeJpa() throws Exception {
        int encrypted = 0;
        for (EntityDescriptor e : DomainCatalog.entries()) {
            if (!e.generatesSql()) {
                continue;
            }
            String pkg = e.type().getPackageName();
            String ctx = pkg.substring(pkg.lastIndexOf('.') + 1);
            Class<?> entity = Class.forName(INFRA_PKG + "." + ctx + ".entity." + e.entity() + "Entity");
            for (AttributeDescriptor a : e.attributes()) {
                assertThat(a.column().endsWith("_enc")).as(e.entity() + "." + a.name() + ": sufixo _enc ⇔ encrypted").isEqualTo(a.encrypted());
                Field f = field(entity, camel(a.column()));
                if (f == null) {
                    continue;   // id/created_at/updated_at herdados de AuditableEntity
                }
                Convert convert = f.getAnnotation(Convert.class);
                if (a.encrypted()) {
                    encrypted++;
                    assertThat(convert).as(entity.getSimpleName() + "." + f.getName() + " sem @Convert (dado pessoal iria em claro)").isNotNull();
                    assertThat(convert.converter()).as(entity.getSimpleName() + "." + f.getName()).isEqualTo(AesGcmStringConverter.class);
                    assertThat(f.getType()).isEqualTo(String.class);
                } else {
                    assertThat(convert).as(entity.getSimpleName() + "." + f.getName() + " com @Convert sem encrypted no catálogo").isNull();
                }
            }
        }
        assertThat(encrypted).as("o catálogo tem atributos cifrados (cnpj, latitude/longitude, texto da transcrição)").isGreaterThanOrEqualTo(6);
    }

    private static Field field(Class<?> type, String name) {
        for (Class<?> c = type; c != null; c = c.getSuperclass()) {
            try {
                return c.getDeclaredField(name);
            } catch (NoSuchFieldException ignored) {
                // sobe para a superclasse
            }
        }
        return null;
    }

    private static String camel(String snake) {
        StringBuilder sb = new StringBuilder();
        boolean up = false;
        for (char c : snake.toLowerCase(Locale.ROOT).toCharArray()) {
            if (c == '_') {
                up = true;
            } else {
                sb.append(up ? Character.toUpperCase(c) : c);
                up = false;
            }
        }
        return sb.toString();
    }
}
