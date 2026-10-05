package br.gov.pr.secid.workstation.domain.catalog;

/** Regra ON DELETE da FK (SEGURANCA §2 / D-23): dono → CASCADE; catálogo e trilha → RESTRICT; filho válido sem pai → SET NULL. */
public enum OnDelete {
    NONE(""), CASCADE("CASCADE"), RESTRICT("RESTRICT"), SET_NULL("SET NULL");

    private final String sql;

    OnDelete(String sql) {
        this.sql = sql;
    }

    public String sql() {
        return sql;
    }
}
