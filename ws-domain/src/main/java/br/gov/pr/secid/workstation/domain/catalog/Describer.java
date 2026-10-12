package br.gov.pr.secid.workstation.domain.catalog;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/** Reflexão sobre um record anotado com {@link DomainEntity} → {@link EntityDescriptor}. */
final class Describer {

    private static final Pattern CAMEL = Pattern.compile("(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])");
    private static final int DEFAULT_VARCHAR = 255;

    private Describer() {
    }

    static EntityDescriptor describe(Class<?> type) {
        DomainEntity e = type.getAnnotation(DomainEntity.class);
        if (e == null) {
            throw new IllegalArgumentException(type.getName() + " sem @DomainEntity");
        }
        if (!type.isRecord()) {
            throw new IllegalArgumentException(type.getName() + " precisa ser record");
        }
        List<AttributeDescriptor> attrs = new ArrayList<>();
        for (RecordComponent rc : type.getRecordComponents()) {
            attrs.add(describe(e, rc));
        }
        if (e.audit() != Audit.NONE && e.store().hasMysqlTable()) {
            attrs.add(new AttributeDescriptor("createdAt", "Instant", "created_at", "TIMESTAMP(6)", false, List.of(), "", "", "",
                    "CURRENT_TIMESTAMP(6)", false, false, false, "criação (UTC)", Instant.class));
            if (e.audit() == Audit.FULL) {
                attrs.add(new AttributeDescriptor("updatedAt", "Instant", "updated_at", "TIMESTAMP(6)", false, List.of(), "", "", "",
                        "CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)", false, false, false, "última alteração (UTC)", Instant.class));
            }
        }
        if (e.versioned()) {
            attrs.add(new AttributeDescriptor("version", "long", "version", "BIGINT", false, List.of(), "", "", "", "0", false, false, false,
                    "lock otimista", long.class));
        }
        return new EntityDescriptor(e.context(), type.getSimpleName(), e.table(), Arrays.asList(e.rfs()), e.store(), e.doc(), e.migration(),
                e.audit(), e.versioned(), e.pk(), Arrays.asList(e.indexes()), Arrays.asList(e.uniques()), Arrays.asList(e.checks()), attrs, type);
    }

    private static AttributeDescriptor describe(DomainEntity e, RecordComponent rc) {
        Attr a = rc.getAnnotation(Attr.class);
        if (a == null) {
            throw new IllegalArgumentException(rc.getDeclaringRecord().getSimpleName() + "." + rc.getName() + " sem @Attr");
        }
        Class<?> javaType = rc.getType();
        Class<?> elementType = elementType(rc.getGenericType());
        String column = a.col().isEmpty() ? snake(rc.getName()) + (a.encrypted() ? "_enc" : "") : a.col();
        boolean json = rc.getName().endsWith("Json") || Set.class.isAssignableFrom(javaType) || List.class.isAssignableFrom(javaType);
        boolean pk = column.equals(e.pk());
        boolean wrapper = javaType == Integer.class || javaType == Long.class || javaType == Boolean.class || javaType == Double.class;
        boolean nullable = !pk && (a.opt() || wrapper);
        List<String> enumValues = List.of();
        Class<?> enumSource = javaType.isEnum() ? javaType : (json && elementType != null && elementType.isEnum() ? elementType : null);
        if (enumSource != null) {
            enumValues = Arrays.stream(enumSource.getEnumConstants()).map(c -> ((Enum<?>) c).name()).toList();
        }
        String type = logicalType(javaType, elementType, json);
        String sql = a.sql().isEmpty() ? defaultSql(javaType, json, a, enumValues) : a.sql();
        String def = a.def();
        if (def.isEmpty() && !nullable && !pk) {
            if (javaType == boolean.class) {
                def = "FALSE";
            } else if (javaType == int.class || javaType == long.class) {
                def = "0";
            }
        }
        String onDelete = a.ref().isEmpty() ? "" : a.onDelete().sql();
        if (!a.ref().isEmpty() && a.onDelete() == OnDelete.NONE) {
            throw new IllegalArgumentException(rc.getDeclaringRecord().getSimpleName() + "." + rc.getName() + ": FK sem onDelete");
        }
        if ("SET NULL".equals(onDelete) && !nullable) {
            throw new IllegalArgumentException(rc.getDeclaringRecord().getSimpleName() + "." + rc.getName() + ": SET NULL exige coluna anulável");
        }
        return new AttributeDescriptor(rc.getName(), type, column, sql, nullable, enumValues, a.ref(), a.ref().isEmpty() ? "" : a.refCol(),
                onDelete, def, a.unique(), pk, a.encrypted(), a.value(), javaType);
    }

    private static Class<?> elementType(Type generic) {
        if (generic instanceof ParameterizedType p && p.getActualTypeArguments().length == 1
                && p.getActualTypeArguments()[0] instanceof Class<?> c) {
            return c;
        }
        return null;
    }

    private static String logicalType(Class<?> javaType, Class<?> elementType, boolean json) {
        if (Set.class.isAssignableFrom(javaType) || List.class.isAssignableFrom(javaType)) {
            String inner = elementType == null ? "?" : elementType.getSimpleName();
            return javaType.getSimpleName() + "<" + inner + ">";
        }
        if (json) {
            return "JSON";
        }
        return javaType.getSimpleName();
    }

    private static String defaultSql(Class<?> javaType, boolean json, Attr a, List<String> enumValues) {
        if (json) {
            return "JSON";
        }
        if (javaType == UUID.class) {
            return "BINARY(16)";
        }
        if (javaType == String.class) {
            return "VARCHAR(" + (a.len() > 0 ? a.len() : DEFAULT_VARCHAR) + ")";
        }
        if (javaType == Instant.class) {
            return "TIMESTAMP(6)";
        }
        if (javaType == LocalDate.class) {
            return "DATE";
        }
        if (javaType == boolean.class || javaType == Boolean.class) {
            return "BOOLEAN";
        }
        if (javaType == int.class || javaType == Integer.class) {
            return "INT";
        }
        if (javaType == long.class || javaType == Long.class) {
            return "BIGINT";
        }
        if (javaType == double.class || javaType == Double.class) {
            return "DOUBLE";
        }
        if (javaType == BigDecimal.class) {
            return "DECIMAL(14,2)";
        }
        if (javaType.isEnum()) {
            int max = enumValues.stream().mapToInt(String::length).max().orElse(10);
            int size = Math.max(20, ((max / 10) + 1) * 10);
            return "VARCHAR(" + (a.len() > 0 ? a.len() : size) + ")";
        }
        throw new IllegalArgumentException("tipo sem mapeamento SQL: " + javaType.getName());
    }

    static String snake(String camel) {
        return CAMEL.matcher(camel).replaceAll("_").toLowerCase(Locale.ROOT);
    }
}
