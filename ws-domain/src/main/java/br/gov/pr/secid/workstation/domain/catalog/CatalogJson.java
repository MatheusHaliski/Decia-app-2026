package br.gov.pr.secid.workstation.domain.catalog;

import java.util.List;

/**
 * Serializa o catálogo em JSON determinístico (sem dependência de biblioteca): uma entrada por entidade e uma linha por
 * atributo — formato consumido pela planilha Excel do PO ({@code docs/arquitetura/catalogo-entidades.json}).
 */
public final class CatalogJson {

    private CatalogJson() {
    }

    public static String render(List<EntityDescriptor> entries) {
        StringBuilder sb = new StringBuilder(1 << 16);
        sb.append("{\n  \"source\": \"ws-domain @DomainEntity/@Attr via DomainCatalog (gerado por EntityCatalogTest; não edite à mão)\",\n");
        sb.append("  \"entities\": [\n");
        for (int i = 0; i < entries.size(); i++) {
            EntityDescriptor e = entries.get(i);
            sb.append("    {\n");
            field(sb, "context", e.context()).append(",\n");
            field(sb, "entity", e.entity()).append(",\n");
            field(sb, "table", e.table()).append(",\n");
            sb.append("      \"rfs\": ").append(array(e.rfs())).append(",\n");
            field(sb, "store", e.store().label()).append(",\n");
            sb.append("      \"migration\": ").append(e.migration() == 0 ? "null" : "\"V" + e.migration() + "\"").append(",\n");
            field(sb, "pk", e.pk()).append(",\n");
            field(sb, "doc", e.doc()).append(",\n");
            sb.append("      \"indexes\": ").append(array(e.indexes())).append(",\n");
            sb.append("      \"uniques\": ").append(array(e.uniques())).append(",\n");
            sb.append("      \"attributes\": [\n");
            List<AttributeDescriptor> attrs = e.attributes();
            for (int j = 0; j < attrs.size(); j++) {
                AttributeDescriptor a = attrs.get(j);
                sb.append("        {");
                sb.append("\"name\": ").append(str(a.name()))
                        .append(", \"type\": ").append(str(a.type()))
                        .append(", \"column\": ").append(str(a.column()))
                        .append(", \"sqlType\": ").append(str(a.sqlType()))
                        .append(", \"nullable\": ").append(a.nullable())
                        .append(", \"pk\": ").append(a.pk())
                        .append(", \"constraint\": ").append(str(a.constraint()))
                        .append(", \"enumValues\": ").append(array(a.enumValues()))
                        .append(", \"ref\": ").append(str(a.hasFk() ? a.refTable() + "." + a.refColumn() : ""))
                        .append(", \"onDelete\": ").append(str(a.onDelete()))
                        .append(", \"default\": ").append(str(a.defaultSql()))
                        .append(", \"encrypted\": ").append(a.encrypted())
                        .append(", \"description\": ").append(str(a.description()));
                sb.append(j + 1 < attrs.size() ? "},\n" : "}\n");
            }
            sb.append("      ]\n");
            sb.append(i + 1 < entries.size() ? "    },\n" : "    }\n");
        }
        sb.append("  ]\n}\n");
        return sb.toString();
    }

    private static StringBuilder field(StringBuilder sb, String name, String value) {
        return sb.append("      \"").append(name).append("\": ").append(str(value));
    }

    private static String array(List<String> values) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) {
                sb.append(", ");
            }
            sb.append(str(values.get(i)));
        }
        return sb.append(']').toString();
    }

    static String str(String s) {
        if (s == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }
}
