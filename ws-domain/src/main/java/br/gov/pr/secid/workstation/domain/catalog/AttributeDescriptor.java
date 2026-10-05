package br.gov.pr.secid.workstation.domain.catalog;

import java.util.List;

/**
 * Um atributo do catálogo (uma linha da planilha).
 *
 * @param name        nome do componente Java (camelCase)
 * @param type        tipo lógico (UUID, String, Instant, LocalDate, boolean, int, long, BigDecimal, JSON, nome do enum, Set&lt;Enum&gt;)
 * @param column      coluna no banco (snake_case)
 * @param sqlType     tipo SQL (BINARY(16), VARCHAR(n), TIMESTAMP(6), DATE, BOOLEAN, INT, BIGINT, DECIMAL, JSON, TEXT)
 * @param nullable    aceita NULL
 * @param enumValues  valores permitidos (CHECK) quando enum; vazio caso contrário
 * @param refTable    tabela referenciada pela FK; vazio sem FK
 * @param refColumn   coluna referenciada
 * @param onDelete    regra ON DELETE da FK; vazio sem FK
 * @param defaultSql  literal DEFAULT em SQL; vazio sem default
 * @param unique      unicidade simples
 * @param pk          é a chave primária
 * @param encrypted   cifrado AES-GCM (LGPD)
 * @param description descrição curta
 * @param javaType    tipo Java do componente (para os geradores)
 */
public record AttributeDescriptor(String name, String type, String column, String sqlType, boolean nullable, List<String> enumValues,
                                  String refTable, String refColumn, String onDelete, String defaultSql, boolean unique, boolean pk,
                                  boolean encrypted, String description, Class<?> javaType) {

    public AttributeDescriptor {
        enumValues = List.copyOf(enumValues);
    }

    public boolean hasFk() {
        return !refTable.isEmpty();
    }

    public boolean isEnum() {
        return !enumValues.isEmpty() && javaType != null && javaType.isEnum();
    }

    /** Texto da restrição para a planilha: valores do enum, FK ou vazio. */
    public String constraint() {
        if (!enumValues.isEmpty()) {
            return String.join(" · ", enumValues);
        }
        if (hasFk()) {
            return "FK " + refTable + "." + refColumn + " ON DELETE " + onDelete;
        }
        return unique ? "UNIQUE" : "";
    }
}
