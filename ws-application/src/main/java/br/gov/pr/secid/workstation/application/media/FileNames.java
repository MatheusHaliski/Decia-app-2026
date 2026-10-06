package br.gov.pr.secid.workstation.application.media;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

/**
 * Nome de arquivo seguro para exibir e baixar (D-67). O nome NUNCA vira caminho no storage (a chave é {@code <classe>/<dono>/<sha>}),
 * mas aparece em {@code Content-Disposition}, listas e logs: sem diretórios ({@code ../}, {@code C:\}), sem caracteres de controle,
 * sem nomes reservados do Windows, sem ponto inicial, NFC, até 120 caracteres e SEMPRE com a extensão canônica do tipo real.
 */
public final class FileNames {
    static final int MAX = 120;
    private static final Set<String> RESERVED = Set.of("con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "com5", "com6", "com7",
            "com8", "com9", "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9");
    private static final String FALLBACK = "arquivo";

    private FileNames() {
    }

    /** Extensão declarada (minúscula, sem ponto) ou vazia — usada para comparar com o tipo real. */
    public static String extension(String rawName) {
        String base = baseName(rawName == null ? "" : rawName);
        int dot = base.lastIndexOf('.');
        return dot < 0 || dot == base.length() - 1 ? "" : base.substring(dot + 1).toLowerCase(Locale.ROOT).strip();
    }

    public static String sanitize(String rawName, DetectedType type) {
        String base = baseName(rawName == null ? "" : rawName);
        base = Normalizer.normalize(base, Normalizer.Form.NFC);
        int dot = base.lastIndexOf('.');
        String stem = dot > 0 ? base.substring(0, dot) : (dot == 0 ? "" : base);
        StringBuilder sb = new StringBuilder(stem.length());
        stem.codePoints().forEach(cp -> {
            if (Character.isLetterOrDigit(cp) || cp == ' ' || cp == '-' || cp == '_' || cp == '.' || cp == '(' || cp == ')') {
                sb.appendCodePoint(cp);
            } else if (!Character.isISOControl(cp) && Character.getType(cp) != Character.FORMAT) {
                sb.append('_');
            }
        });
        String clean = sb.toString().replaceAll("\\.{2,}", ".").replaceAll("_{2,}", "_").replaceAll("^[.\\s_]+", "").strip();
        clean = clean.replaceAll("[.\\s]+$", "");
        if (clean.isEmpty() || RESERVED.contains(clean.toLowerCase(Locale.ROOT))) {
            clean = clean.isEmpty() ? FALLBACK : clean + "_";
        }
        String ext = "." + type.canonicalExtension();
        int room = MAX - ext.length();
        if (clean.codePointCount(0, clean.length()) > room) {
            clean = clean.substring(0, clean.offsetByCodePoints(0, room)).strip();
        }
        return clean + ext;
    }

    /** Último segmento depois de {@code /} ou {@code \} (nomes vindos de Windows/zip). */
    private static String baseName(String raw) {
        String s = raw.strip();
        int cut = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
        return cut >= 0 ? s.substring(cut + 1) : s;
    }
}
