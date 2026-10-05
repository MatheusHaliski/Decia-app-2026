package br.gov.pr.secid.workstation.application.identity;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Normalização e regras do {@code username} (RF1.CA10/CA26): minúsculas, sem acento, {@code [a-z0-9._]} (3–30),
 * nomes reservados e prefixos de conta sintética ({@code demo_}, {@code e2e_}) recusados com {@code 422 NOME_RESERVADO}.
 */
public final class Usernames {
    public static final Set<String> RESERVED = Set.of("admin", "root", "suporte", "secid", "decia", "workstation",
            "administrador", "administrator", "sistema", "system", "api", "null", "undefined");
    public static final List<String> RESERVED_PREFIXES = List.of("demo_", "e2e_");
    public static final int MIN = 3;
    public static final int MAX = 30;
    private static final Pattern VALID = Pattern.compile("^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$");

    private Usernames() {
    }

    /** Minúsculas, sem acentos, espaços e {@code @} inicial fora; o resultado ainda pode ser inválido ({@link #problem}). */
    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw.trim();
        if (s.startsWith("@")) {
            s = s.substring(1);
        }
        s = Normalizer.normalize(s, Normalizer.Form.NFKD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
        return s.replaceAll("\\s+", "");
    }

    public static boolean reserved(String normalized) {
        if (RESERVED.contains(normalized)) {
            return true;
        }
        return RESERVED_PREFIXES.stream().anyMatch(normalized::startsWith);
    }

    /** {@code null} se válido; senão o código do problema: {@code FORMATO} ou {@code RESERVADO}. */
    public static String problem(String normalized) {
        if (normalized == null || normalized.length() < MIN || normalized.length() > MAX || !VALID.matcher(normalized).matches()) {
            return "FORMATO";
        }
        return reserved(normalized) ? "RESERVADO" : null;
    }

    /** Base para sugestões: só o que sobrevive à normalização e ao formato ({@code maria.silva} → {@code maria.silva}). */
    public static String baseFrom(String nameOrUsername) {
        String s = normalize(nameOrUsername == null ? "" : nameOrUsername.replace(' ', '.'));
        s = s.replaceAll("[^a-z0-9._]", "").replaceAll("[._]{2,}", ".").replaceAll("^[._]+|[._]+$", "");
        if (s.length() > MAX - 4) {
            s = s.substring(0, MAX - 4);
        }
        return s.length() < MIN ? "usuario" : s;
    }
}
