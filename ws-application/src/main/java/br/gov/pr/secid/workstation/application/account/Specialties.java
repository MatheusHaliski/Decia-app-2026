package br.gov.pr.secid.workstation.application.account;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Especialidades da pessoa (RF3; auditoria Onda 1): até {@value #MAX} rótulos de {@value #MIN_LENGTH}–{@value #MAX_LENGTH} caracteres.
 * Normaliza (NFC, espaços nas pontas e repetidos), descarta vazios e repetidos sem diferenciar caixa nem acento (a primeira grafia
 * fica) e recusa caracteres de controle ou marcação. Função pura, sem estado.
 */
public final class Specialties {
    public static final int MAX = 10;
    public static final int MIN_LENGTH = 2;
    public static final int MAX_LENGTH = 40;
    /** Letras e números de qualquer idioma, espaço e a pontuação comum em nomes de área (C++, C#, BIM/CAD, P&amp;D, Node.js). */
    private static final Pattern ALLOWED = Pattern.compile("[\\p{L}\\p{N} .,+#&/()'’-]+");
    private static final Pattern SPACES = Pattern.compile("\\s+");
    private static final Pattern MARKS = Pattern.compile("\\p{M}+");

    private Specialties() {
    }

    /** Resultado: a lista limpa ou a mensagem do primeiro problema (para {@code 422 VALIDACAO details.fields.specialties}). */
    public record Result(List<String> values, Optional<String> problem) {
        static Result ok(List<String> values) {
            return new Result(List.copyOf(values), Optional.empty());
        }

        static Result fail(String message) {
            return new Result(List.of(), Optional.of(message));
        }
    }

    public static Result normalize(List<String> raw) {
        if (raw == null) {
            return Result.ok(List.of());
        }
        List<String> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String item : raw) {
            if (item == null) {
                continue;
            }
            String v = SPACES.matcher(Normalizer.normalize(item, Normalizer.Form.NFC)).replaceAll(" ").strip();
            if (v.isEmpty()) {
                continue;
            }
            int length = v.codePointCount(0, v.length());
            if (length < MIN_LENGTH || length > MAX_LENGTH) {
                return Result.fail("Cada especialidade precisa ter de " + MIN_LENGTH + " a " + MAX_LENGTH + " caracteres.");
            }
            if (!ALLOWED.matcher(v).matches()) {
                return Result.fail("Use só letras, números, espaços e . , + # & / ( ) ' - nas especialidades.");
            }
            if (seen.add(key(v))) {
                out.add(v);
            }
        }
        if (out.size() > MAX) {
            return Result.fail("Use até " + MAX + " especialidades.");
        }
        return Result.ok(out);
    }

    /** Chave de comparação: sem acento e sem caixa ("Gestão" = "gestao"). */
    static String key(String label) {
        return MARKS.matcher(Normalizer.normalize(label, Normalizer.Form.NFD)).replaceAll("").toLowerCase(Locale.ROOT);
    }
}
