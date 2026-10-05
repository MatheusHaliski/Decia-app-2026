package br.gov.pr.secid.workstation.domain.catalog;

import java.util.List;

/**
 * Uma entidade do catálogo com seus atributos na ordem de declaração (colunas de auditoria no fim).
 */
public record EntityDescriptor(String context, String entity, String table, List<String> rfs, Store store, String doc, int migration,
                               Audit audit, boolean versioned, String pk, List<String> indexes, List<String> uniques, List<String> checks,
                               List<AttributeDescriptor> attributes, Class<?> type) {

    public EntityDescriptor {
        rfs = List.copyOf(rfs);
        indexes = List.copyOf(indexes);
        uniques = List.copyOf(uniques);
        checks = List.copyOf(checks);
        attributes = List.copyOf(attributes);
    }

    /** Verdadeiro quando a tabela MySQL é criada por uma migration gerada a partir do domínio (V10+). */
    public boolean generatesSql() {
        return store.hasMysqlTable() && migration >= 10;
    }

    public AttributeDescriptor attribute(String column) {
        return attributes.stream().filter(a -> a.column().equals(column)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException(table + " não tem coluna " + column));
    }
}
