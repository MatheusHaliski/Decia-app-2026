package br.gov.pr.secid.workstation.domain.catalog;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Gera, a partir do {@link DomainCatalog}: (1) as migrations {@code V10+__*.sql} em {@code persistence-mysql}; (2) o bloco gerado da
 * {@code ForeignKeyPolicy.POLICY}; (3) as entidades JPA e repositórios Spring Data por contexto. Uso (raiz do repositório como argumento):
 * {@code java -cp ws-domain/target/classes:ws-domain/target/test-classes br.gov.pr.secid.workstation.domain.catalog.SchemaGenerator .}
 * — com {@code --jpa-only} reemite só entidades/repositórios (migrations já aplicadas nunca são regeneradas).
 *
 * <p>Fica em test-scope de propósito: não é código de produção e roda uma vez por mudança de domínio; os artefatos gerados são commitados
 * e guardados por {@code EntityCatalogTest}, {@code ForeignKeyPolicyUnitTest} e {@code CatalogSchemaConsistencyTest}.
 */
public final class SchemaGenerator {

    static final String GEN_START = "    // >>> gerado pelo SchemaGenerator (ws-domain) a partir do DomainCatalog — não edite à mão";
    static final String GEN_END = "    // <<< gerado";
    private static final String MYSQL = "ws-infrastructure/persistence-mysql";
    private static final String MIGRATIONS = MYSQL + "/src/main/resources/db/migration";
    private static final String INFRA_PKG = "br.gov.pr.secid.workstation.infrastructure.mysql";
    private static final int NAME_W = 24;
    private static final int TYPE_W = 16;
    private static final int MAX_IDENT = 64;

    private SchemaGenerator() {
    }

    public static void main(String[] args) throws IOException {
        Path root = Path.of(args.length > 0 ? args[0] : ".").toAbsolutePath().normalize();
        boolean jpaOnly = List.of(args).contains("--jpa-only");   // migrations já aplicadas nunca são regeneradas (D-40)
        Map<Integer, String> sql = jpaOnly ? Map.of() : renderMigrations();
        for (Map.Entry<Integer, String> e : sql.entrySet()) {
            Path file = root.resolve(MIGRATIONS).resolve("V" + e.getKey() + "__" + DomainCatalog.MIGRATIONS.get(e.getKey()) + ".sql");
            Files.writeString(file, e.getValue(), StandardCharsets.UTF_8);
            System.out.println("migration: " + file.getFileName());
        }
        if (!jpaOnly) {
            Path policy = root.resolve(MYSQL + "/src/main/java/br/gov/pr/secid/workstation/infrastructure/mysql/schema/ForeignKeyPolicy.java");
            String src = Files.readString(policy, StandardCharsets.UTF_8);
            int a = src.indexOf(GEN_START);
            int b = src.indexOf(GEN_END);
            if (a < 0 || b < 0) {
                throw new IllegalStateException("marcadores do bloco gerado não encontrados em ForeignKeyPolicy.java");
            }
            Files.writeString(policy, src.substring(0, a) + renderPolicyBlock() + src.substring(b), StandardCharsets.UTF_8);
            System.out.println("policy: " + policy.getFileName());
        }
        int n = 0;
        for (EntityDescriptor e : DomainCatalog.entries()) {
            if (!e.generatesSql()) {
                continue;
            }
            String ctx = contextPackage(e);
            Path dir = root.resolve(MYSQL + "/src/main/java/" + INFRA_PKG.replace('.', '/') + "/" + ctx);
            Files.createDirectories(dir.resolve("entity"));
            Files.createDirectories(dir.resolve("repository"));
            Files.writeString(dir.resolve("entity/" + e.entity() + "Entity.java"), renderEntity(e, ctx), StandardCharsets.UTF_8);
            Files.writeString(dir.resolve("repository/" + e.entity() + "Repository.java"), renderRepository(e, ctx), StandardCharsets.UTF_8);
            n++;
        }
        System.out.println("entidades JPA: " + n);
    }

    // ------------------------------------------------------------------------------------------------------------ SQL

    /** Uma migration por versão, na ordem; FKs para tabelas criadas depois viram ALTER TABLE na migration da tabela-pai. */
    public static Map<Integer, String> renderMigrations() {
        Map<Integer, StringBuilder> bodies = new TreeMap<>();
        Map<Integer, List<String>> deferred = new TreeMap<>();
        Map<String, Integer> created = new LinkedHashMap<>();          // tabela → migration
        for (String t : DomainCatalog.PRE_EXISTING_TABLES) {
            created.put(t, 2);
        }
        List<EntityDescriptor> entries = DomainCatalog.entries().stream().filter(EntityDescriptor::generatesSql).toList();
        for (EntityDescriptor e : entries) {
            if (created.containsKey(e.table())) {
                throw new IllegalStateException("tabela repetida no catálogo: " + e.table());
            }
            created.put(e.table(), e.migration());
        }
        Set<String> createdSoFar = new LinkedHashSet<>(DomainCatalog.PRE_EXISTING_TABLES);
        for (EntityDescriptor e : entries) {
            StringBuilder sb = bodies.computeIfAbsent(e.migration(), v -> new StringBuilder(header(v)));
            List<String> inlineFks = new ArrayList<>();
            for (AttributeDescriptor a : e.attributes()) {
                if (!a.hasFk()) {
                    continue;
                }
                Integer refMigration = created.get(a.refTable());
                if (refMigration == null) {
                    throw new IllegalStateException(e.table() + "." + a.column() + " referencia tabela desconhecida " + a.refTable());
                }
                String fk = fkClause(e.table(), a);
                if (createdSoFar.contains(a.refTable()) || a.refTable().equals(e.table())) {
                    inlineFks.add("    " + fk + ",");
                } else {
                    deferred.computeIfAbsent(refMigration, v -> new ArrayList<>())
                            .add("ALTER TABLE " + e.table() + " ADD " + fk + ";");
                }
            }
            sb.append(createTable(e, inlineFks));
            createdSoFar.add(e.table());
        }
        for (DomainCatalog.ExtraFk x : DomainCatalog.EXTRA_FKS) {
            deferred.computeIfAbsent(x.migration(), v -> new ArrayList<>()).add("ALTER TABLE " + x.table() + " ADD CONSTRAINT fk_" + x.table()
                    + "__" + x.column() + " FOREIGN KEY (" + x.column() + ") REFERENCES " + x.refTable() + " (" + x.refColumn() + ")\n    ON DELETE "
                    + x.onDelete() + " ON UPDATE RESTRICT;");
        }
        Map<Integer, String> out = new TreeMap<>();
        for (Map.Entry<Integer, StringBuilder> b : bodies.entrySet()) {
            StringBuilder sb = b.getValue();
            List<String> alters = deferred.get(b.getKey());
            if (alters != null) {
                sb.append("-- ").append("-".repeat(111)).append('\n');
                sb.append("-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.\n");
                sb.append("-- ").append("-".repeat(111)).append('\n');
                for (String alter : alters) {
                    sb.append(alter).append("\n\n");
                }
            }
            out.put(b.getKey(), sb.toString().stripTrailing() + "\n");
        }
        return out;
    }

    private static String header(int version) {
        String name = DomainCatalog.MIGRATIONS.get(version);
        List<String> contexts = DomainCatalog.entries().stream().filter(e -> e.generatesSql() && e.migration() == version)
                .map(EntityDescriptor::context).distinct().toList();
        return "-- V" + version + " — " + name + " (" + String.join(" · ", contexts) + "). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.\n"
                + "-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de\n"
                + "-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK\n"
                + "-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.\n"
                + "-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai\n"
                + "-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.\n\n";
    }

    private static String createTable(EntityDescriptor e, List<String> inlineFks) {
        StringBuilder sb = new StringBuilder();
        sb.append("-- ").append("-".repeat(111)).append('\n');
        sb.append("-- ").append(e.table()).append(" (").append(e.entity()).append(" — ").append(e.context()).append("; ")
                .append(String.join(", ", e.rfs())).append(")\n");
        for (String line : wrap(e.doc(), 110)) {
            sb.append("-- ").append(line).append('\n');
        }
        sb.append("-- ").append("-".repeat(111)).append('\n');
        sb.append("CREATE TABLE ").append(e.table()).append(" (\n");
        for (AttributeDescriptor a : e.attributes()) {
            sb.append("    ").append(pad(a.column(), NAME_W)).append(pad(a.sqlType(), TYPE_W)).append(a.nullable() ? "NULL" : "NOT NULL");
            if (!a.defaultSql().isEmpty()) {
                sb.append(" DEFAULT ").append(a.defaultSql());
            }
            sb.append(",\n");
        }
        sb.append("    PRIMARY KEY (").append(e.pk()).append("),\n");
        for (AttributeDescriptor a : e.attributes()) {
            if (a.unique() && !a.pk()) {
                sb.append("    CONSTRAINT ").append(shortIdent("ux_" + e.table() + "_" + a.column())).append(" UNIQUE (").append(a.column()).append("),\n");
            }
        }
        for (String u : e.uniques()) {
            sb.append("    CONSTRAINT ").append(shortIdent("ux_" + e.table() + "_" + cols(u))).append(" UNIQUE (").append(u).append("),\n");
        }
        for (String fk : inlineFks) {
            sb.append(fk).append('\n');
        }
        for (AttributeDescriptor a : e.attributes()) {
            if (a.isEnum()) {
                String in = String.join(", ", a.enumValues().stream().map(v -> "'" + v + "'").toList());
                sb.append("    CONSTRAINT ").append(shortIdent("ck_" + e.table() + "_" + a.column())).append(" CHECK (");
                if (a.nullable()) {
                    sb.append(a.column()).append(" IS NULL OR ");
                }
                sb.append(a.column()).append(" IN (").append(in).append(")),\n");
            }
        }
        int n = 1;
        for (String c : e.checks()) {
            sb.append("    CONSTRAINT ").append(shortIdent("ck_" + e.table() + "_c" + n++)).append(" CHECK (").append(c).append("),\n");
        }
        for (String ix : e.indexes()) {
            sb.append("    INDEX ").append(shortIdent("ix_" + e.table() + "_" + cols(ix))).append(" (").append(ix).append("),\n");
        }
        int last = sb.lastIndexOf(",\n");
        sb.setLength(last);
        sb.append("\n) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;\n\n");
        return sb.toString();
    }

    private static String fkClause(String table, AttributeDescriptor a) {
        return "CONSTRAINT " + ident("fk_" + table + "__" + a.column()) + " FOREIGN KEY (" + a.column() + ") REFERENCES " + a.refTable() + " ("
                + a.refColumn() + ")\n        ON DELETE " + a.onDelete() + " ON UPDATE RESTRICT";
    }

    private static String cols(String list) {
        StringBuilder sb = new StringBuilder();
        for (String c : list.split(",")) {
            String s = c.trim();
            if (s.endsWith("_id") && s.length() > 3) {
                s = s.substring(0, s.length() - 3);
            }
            if (sb.length() > 0) {
                sb.append('_');
            }
            sb.append(s);
        }
        return sb.toString();
    }

    private static String ident(String name) {
        if (name.length() > MAX_IDENT) {
            throw new IllegalStateException("identificador maior que 64: " + name);
        }
        return name;
    }

    /** Índices/unicidades/checks: nome legível, encurtado com sufixo estável quando passa de 64 (FKs nunca são encurtadas). */
    private static String shortIdent(String name) {
        if (name.length() <= MAX_IDENT) {
            return name;
        }
        String suffix = Integer.toHexString(name.hashCode());
        return name.substring(0, MAX_IDENT - suffix.length() - 1) + "_" + suffix;
    }

    private static String pad(String s, int w) {
        return s.length() >= w ? s + " " : s + " ".repeat(w - s.length());
    }

    private static List<String> wrap(String text, int width) {
        List<String> lines = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        for (String w : text.split("\\s+")) {
            if (cur.length() + w.length() + 1 > width && cur.length() > 0) {
                lines.add(cur.toString());
                cur.setLength(0);
            }
            if (cur.length() > 0) {
                cur.append(' ');
            }
            cur.append(w);
        }
        if (cur.length() > 0) {
            lines.add(cur.toString());
        }
        return lines;
    }

    // --------------------------------------------------------------------------------------------------------- POLICY

    /** Campo Java {@code GENERATED} com uma linha {@code new Fk(...)} por FK das migrations geradas, agrupadas por migration. */
    public static String renderPolicyBlock() {
        StringBuilder sb = new StringBuilder(GEN_START).append('\n');
        sb.append("    private static final List<Fk> GENERATED = List.of(\n");
        Map<Integer, List<String>> byMigration = new TreeMap<>();
        for (EntityDescriptor e : DomainCatalog.entries()) {
            if (!e.generatesSql()) {
                continue;
            }
            for (AttributeDescriptor a : e.attributes()) {
                if (a.hasFk()) {
                    byMigration.computeIfAbsent(e.migration(), v -> new ArrayList<>())
                            .add(fkLine(e.table(), a.column(), a.refTable(), a.refColumn(), a.onDelete()));
                }
            }
        }
        for (DomainCatalog.ExtraFk x : DomainCatalog.EXTRA_FKS) {
            byMigration.computeIfAbsent(x.migration(), v -> new ArrayList<>()).add(fkLine(x.table(), x.column(), x.refTable(), x.refColumn(), x.onDelete()));
        }
        List<String> all = new ArrayList<>();
        for (Map.Entry<Integer, List<String>> m : byMigration.entrySet()) {
            all.add("// V" + m.getKey() + " — " + DomainCatalog.MIGRATIONS.get(m.getKey()));
            all.addAll(m.getValue());
        }
        for (int i = 0; i < all.size(); i++) {
            String line = all.get(i);
            boolean last = i == all.size() - 1;
            sb.append("            ").append(line).append(line.startsWith("//") || last ? "" : ",").append('\n');
        }
        sb.append("    );\n");
        return sb.toString();
    }

    private static String fkLine(String table, String column, String refTable, String refColumn, String onDelete) {
        return "id".equals(refColumn)
                ? "new Fk(\"" + table + "\", \"" + column + "\", \"" + refTable + "\", \"" + onDelete + "\")"
                : "new Fk(\"" + table + "\", \"" + column + "\", \"" + refTable + "\", \"" + refColumn + "\", \"" + onDelete + "\")";
    }

    // ------------------------------------------------------------------------------------------------------------ JPA

    static String contextPackage(EntityDescriptor e) {
        String pkg = e.type().getPackageName();
        return pkg.substring(pkg.lastIndexOf('.') + 1);
    }

    static String renderEntity(EntityDescriptor e, String ctx) {
        boolean inherits = e.audit() == Audit.FULL && "id".equals(e.pk());
        Set<String> imports = new TreeMap<String, Boolean>().keySet();
        imports = new java.util.TreeSet<>();
        imports.add("jakarta.persistence.Column");
        imports.add("jakarta.persistence.Entity");
        imports.add("jakarta.persistence.Table");
        if (inherits) {
            imports.add("br.gov.pr.secid.workstation.domain.common.AuditableEntity");
        } else {
            imports.add("jakarta.persistence.Id");
        }
        if (e.versioned()) {
            imports.add("jakarta.persistence.Version");
        }
        StringBuilder fields = new StringBuilder();
        StringBuilder accessors = new StringBuilder();
        for (AttributeDescriptor a : e.attributes()) {
            if (inherits && (a.pk() || a.column().equals("created_at") || a.column().equals("updated_at"))) {
                continue;
            }
            if (a.column().equals("version") && e.versioned()) {
                continue;
            }
            String javaType = jpaType(a, imports);
            String field = camel(a.column());
            if (a.pk()) {
                fields.append("    @Id\n");
            }
            if (a.isEnum()) {
                imports.add("jakarta.persistence.EnumType");
                imports.add("jakarta.persistence.Enumerated");
                fields.append("    @Enumerated(EnumType.STRING)\n");
            }
            if (a.encrypted()) {
                // LGPD: só o cifrado vai ao banco (AES-GCM, WS_DATA_ENCRYPTION_KEY) — mesmo conversor de users.email_enc (Bloco 3)
                imports.add("jakarta.persistence.Convert");
                imports.add(INFRA_PKG + ".crypto.AesGcmStringConverter");
                fields.append("    @Convert(converter = AesGcmStringConverter.class)\n");
            }
            fields.append("    @Column(name = \"").append(a.column()).append('"');
            if (!a.nullable()) {
                fields.append(", nullable = false");
            }
            if (a.pk() || a.column().equals("created_at")) {
                fields.append(", updatable = false");
            }
            if (a.javaType() == java.util.UUID.class) {
                fields.append(", columnDefinition = \"BINARY(16)\"");
            } else if ("JSON".equals(a.sqlType())) {
                fields.append(", columnDefinition = \"JSON\"");
            } else if (a.sqlType().endsWith("TEXT")) {
                fields.append(", columnDefinition = \"").append(a.sqlType()).append('"');
            }
            fields.append(")\n");
            fields.append("    private ").append(javaType).append(' ').append(field).append(";\n\n");
            String cap = Character.toUpperCase(field.charAt(0)) + field.substring(1);
            String getter = ("boolean".equals(javaType) ? "is" : "get") + cap;
            accessors.append("    public ").append(javaType).append(' ').append(getter).append("() {\n        return ").append(field).append(";\n    }\n\n");
            accessors.append("    public void set").append(cap).append('(').append(javaType).append(' ').append(field).append(") {\n        this.")
                    .append(field).append(" = ").append(field).append(";\n    }\n\n");
        }
        if (e.versioned()) {
            fields.append("    @Version\n    @Column(name = \"version\", nullable = false)\n    private long version;\n\n");
            accessors.append("    public long getVersion() {\n        return version;\n    }\n\n");
        }
        StringBuilder sb = new StringBuilder();
        sb.append("package ").append(INFRA_PKG).append('.').append(ctx).append(".entity;\n\n");
        for (String imp : imports) {
            sb.append("import ").append(imp).append(";\n");
        }
        sb.append("\n/**\n");
        for (String line : wrap("Entidade JPA de {@code " + e.table() + "} (" + e.type().getSimpleName() + " — " + e.context() + "; "
                + String.join(", ", e.rfs()) + "). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio; "
                + "UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.", 120)) {
            sb.append(" * ").append(line).append('\n');
        }
        sb.append(" */\n");
        sb.append("@Entity\n@Table(name = \"").append(e.table()).append("\")\n");
        sb.append("public class ").append(e.entity()).append("Entity").append(inherits ? " extends AuditableEntity" : "").append(" {\n\n");
        sb.append(fields).append(accessors);
        int last = sb.lastIndexOf("\n\n");
        sb.setLength(last + 1);
        sb.append("}\n");
        return sb.toString();
    }

    private static String jpaType(AttributeDescriptor a, Set<String> imports) {
        Class<?> t = a.javaType();
        if ("JSON".equals(a.sqlType())) {
            return "String";
        }
        if (t.isEnum()) {
            imports.add(t.getName());
            return t.getSimpleName();
        }
        if (t == java.util.UUID.class || t == java.time.Instant.class || t == java.time.LocalDate.class || t == java.math.BigDecimal.class) {
            imports.add(t.getName());
            return t.getSimpleName();
        }
        return t.getSimpleName();
    }

    static String renderRepository(EntityDescriptor e, String ctx) {
        AttributeDescriptor pk = e.attribute(e.pk());
        String idType = pk.javaType() == java.util.UUID.class ? "UUID" : pk.javaType().getSimpleName();
        StringBuilder sb = new StringBuilder();
        sb.append("package ").append(INFRA_PKG).append('.').append(ctx).append(".repository;\n\n");
        sb.append("import ").append(INFRA_PKG).append('.').append(ctx).append(".entity.").append(e.entity()).append("Entity;\n");
        sb.append("import org.springframework.data.jpa.repository.JpaRepository;\n");
        if ("UUID".equals(idType)) {
            sb.append("\nimport java.util.UUID;\n");
        }
        sb.append("\n/**\n");
        for (String line : wrap("Repositório Spring Data de {@code " + e.table() + "} (" + String.join(", ", e.rfs())
                + "). Gerado pelo SchemaGenerator; consultas específicas entram por RF.", 120)) {
            sb.append(" * ").append(line).append('\n');
        }
        sb.append(" */\n");
        sb.append("public interface ").append(e.entity()).append("Repository extends JpaRepository<").append(e.entity()).append("Entity, ")
                .append(idType).append("> {\n}\n");
        return sb.toString();
    }

    static String camel(String snake) {
        StringBuilder sb = new StringBuilder();
        boolean up = false;
        for (char c : snake.toCharArray()) {
            if (c == '_') {
                up = true;
            } else {
                sb.append(up ? Character.toUpperCase(c) : c);
                up = false;
            }
        }
        return sb.toString().toLowerCase(Locale.ROOT).isEmpty() ? snake : sb.toString();
    }
}
