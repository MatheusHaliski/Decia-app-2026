package br.gov.pr.secid.workstation.infrastructure.mysql.schema;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Política de integridade referencial por domínio (Bloco 2, D-23): toda FK do schema tem uma entrada aqui com a regra
 * de {@code ON DELETE} esperada, e o {@code ForeignKeyPolicyTest} compara esta lista com o que o MySQL realmente tem
 * (INFORMATION_SCHEMA) depois de rodar todas as migrations. FK no banco sem entrada, entrada sem FK ou regra diferente
 * quebram o {@code mvn verify} — a política nasce junto com a tabela, nunca é "arrumada depois".
 *
 * <p>Regras (comentário do {@code V2__baseline_dominio_base.sql}): dado de quem é dono → {@code CASCADE}; catálogo
 * institucional → {@code RESTRICT}; filho que continua válido sem o pai → {@code SET NULL} (só nesse caso); trilhas
 * append-only ({@code audit_log}, {@code ai_inference_log}) → {@code RESTRICT}; conta REAL é anonimizada, não apagada.
 *
 * <p>Cada migration que cria ou altera uma FK acrescenta/ajusta a linha correspondente em {@link #POLICY} no mesmo commit.
 */
public final class ForeignKeyPolicy {

    private static final Pattern IDENT = Pattern.compile("[a-z][a-z0-9_]{0,63}");
    private static final Set<String> ON_DELETE = Set.of("CASCADE", "RESTRICT", "SET NULL");
    private static final int MAX_CONSTRAINT_NAME = 64;

    private static final String READ_SQL = """
            SELECT k.TABLE_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, r.DELETE_RULE
              FROM information_schema.KEY_COLUMN_USAGE k
              JOIN information_schema.REFERENTIAL_CONSTRAINTS r
                ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
               AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
               AND r.TABLE_NAME = k.TABLE_NAME
             WHERE k.TABLE_SCHEMA = ?
               AND k.REFERENCED_TABLE_NAME IS NOT NULL
             ORDER BY k.TABLE_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME
            """;

    private ForeignKeyPolicy() {
    }

    /**
     * Uma chave estrangeira de uma coluna: {@code table.column → refTable.refColumn ON DELETE onDelete}.
     * Identificadores só em minúsculas, dígitos e sublinhado (≤ 64, como o MySQL); {@code NO ACTION} é normalizado para
     * {@code RESTRICT} porque no InnoDB os dois são checados na hora e são a mesma coisa.
     */
    public record Fk(String table, String column, String refTable, String refColumn, String onDelete) {

        public Fk {
            for (String s : new String[] {table, column, refTable, refColumn}) {
                if (s == null || !IDENT.matcher(s).matches()) {
                    throw new IllegalArgumentException("identificador inválido: " + s);
                }
            }
            onDelete = normalizeRule(onDelete);
            if (!ON_DELETE.contains(onDelete)) {
                throw new IllegalArgumentException("ON DELETE inválido: " + onDelete + " (esperado CASCADE, RESTRICT ou SET NULL)");
            }
        }

        /** Atalho para a forma mais comum: referência à coluna {@code id} do pai. */
        public Fk(String table, String column, String refTable, String onDelete) {
            this(table, column, refTable, "id", onDelete);
        }

        /** Nome da constraint pela convenção do projeto: {@code fk_<tabela>__<coluna>} (cabe nos 64 do MySQL). */
        public String constraintName() {
            String name = "fk_" + table + "__" + column;
            if (name.length() > MAX_CONSTRAINT_NAME) {
                throw new IllegalStateException("nome de constraint maior que 64: " + name);
            }
            return name;
        }

        /** Identidade da FK sem a regra: é por ela que a política e o banco são casados. */
        public String key() {
            return table + "." + column + "->" + refTable + "." + refColumn;
        }

        @Override
        public String toString() {
            return table + "." + column + " → " + refTable + "." + refColumn + " ON DELETE " + onDelete;
        }
    }

    /** Entrada presente nos dois lados com regra diferente. */
    public record Divergence(Fk expected, Fk actual) {
        @Override
        public String toString() {
            return expected.key() + ": política " + expected.onDelete() + " × banco " + actual.onDelete();
        }
    }

    /**
     * Resultado de {@link #compare(List, List)}: {@code missing} está na política e não no banco; {@code extra} está no
     * banco e não na política; {@code divergent} está nos dois com regra diferente.
     */
    public record Diff(List<Fk> missing, List<Fk> extra, List<Divergence> divergent) {

        public Diff {
            missing = List.copyOf(missing);
            extra = List.copyOf(extra);
            divergent = List.copyOf(divergent);
        }

        public boolean isEmpty() {
            return missing.isEmpty() && extra.isEmpty() && divergent.isEmpty();
        }

        /** Texto pronto para a mensagem de falha do teste. */
        public String describe() {
            if (isEmpty()) {
                return "política e banco iguais";
            }
            StringBuilder sb = new StringBuilder();
            if (!missing.isEmpty()) {
                sb.append("FK na POLICY ausente no banco: ").append(missing).append('\n');
            }
            if (!extra.isEmpty()) {
                sb.append("FK no banco sem entrada na POLICY: ").append(extra).append('\n');
            }
            if (!divergent.isEmpty()) {
                sb.append("regra ON DELETE diferente: ").append(divergent).append('\n');
            }
            return sb.toString().trim();
        }
    }

    /**
     * Todas as FKs do schema, agrupadas pela tabela referenciada. Deve espelhar 1:1 as migrations aplicadas
     * ({@code V2__baseline_dominio_base.sql} hoje).
     */
    public static final List<Fk> POLICY = List.of(
            // → users (dono dos dados: CASCADE; trilhas append-only: RESTRICT)
            new Fk("user_preferences", "user_id", "users", "CASCADE"),
            new Fk("refresh_tokens", "user_id", "users", "CASCADE"),
            new Fk("media_objects", "owner_id", "users", "CASCADE"),
            new Fk("audit_log", "actor_id", "users", "RESTRICT"),
            new Fk("ai_inference_log", "user_id", "users", "RESTRICT"),
            new Fk("ai_inference_log", "reviewed_by", "users", "RESTRICT"),
            // → refresh_tokens (o token rotacionado continua válido sem o anterior)
            new Fk("refresh_tokens", "rotated_from_id", "refresh_tokens", "SET NULL")
    );

    /**
     * Lê as FKs reais do schema corrente da conexão ({@link Connection#getCatalog()}) em INFORMATION_SCHEMA.
     * {@code NO ACTION} vira {@code RESTRICT}. FKs compostas aparecem com uma entrada por coluna.
     */
    public static List<Fk> read(Connection connection) throws SQLException {
        String schema = connection.getCatalog();
        if (schema == null || schema.isBlank()) {
            throw new SQLException("conexão sem schema corrente (catalog); use uma URL JDBC com o banco");
        }
        List<Fk> out = new ArrayList<>();
        try (PreparedStatement ps = connection.prepareStatement(READ_SQL)) {
            ps.setString(1, schema);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.add(new Fk(lower(rs.getString(1)), lower(rs.getString(2)), lower(rs.getString(3)),
                            lower(rs.getString(4)), rs.getString(5)));
                }
            }
        }
        return List.copyOf(out);
    }

    /** Casa as duas listas pela identidade {@link Fk#key()} e devolve faltantes, extras e divergentes (ordem estável). */
    public static Diff compare(List<Fk> policy, List<Fk> actual) {
        Map<String, Fk> wanted = indexByKey(policy, "POLICY");
        Map<String, Fk> found = indexByKey(actual, "banco");
        List<Fk> missing = new ArrayList<>();
        List<Fk> extra = new ArrayList<>();
        List<Divergence> divergent = new ArrayList<>();
        wanted.forEach((key, fk) -> {
            Fk real = found.get(key);
            if (real == null) {
                missing.add(fk);
            } else if (!real.onDelete().equals(fk.onDelete())) {
                divergent.add(new Divergence(fk, real));
            }
        });
        found.forEach((key, fk) -> {
            if (!wanted.containsKey(key)) {
                extra.add(fk);
            }
        });
        return new Diff(missing, extra, divergent);
    }

    static String normalizeRule(String rule) {
        String r = rule == null ? "" : rule.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", " ");
        return "NO ACTION".equals(r) ? "RESTRICT" : r;
    }

    private static Map<String, Fk> indexByKey(List<Fk> fks, String side) {
        Map<String, Fk> byKey = new LinkedHashMap<>();
        for (Fk fk : fks) {
            if (byKey.put(fk.key(), fk) != null) {
                throw new IllegalArgumentException("FK repetida em " + side + ": " + fk.key());
            }
        }
        return byKey;
    }

    private static String lower(String s) {
        return s == null ? null : s.toLowerCase(Locale.ROOT);
    }
}
