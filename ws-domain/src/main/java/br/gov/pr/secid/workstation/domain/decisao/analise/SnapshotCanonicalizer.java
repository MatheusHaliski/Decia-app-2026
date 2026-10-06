package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.common.MiniJson;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

/**
 * JSON canônico do snapshot e o seu SHA-256 (§6.12, G7), byte a byte igual ao {@code json.dumps(obj, sort_keys=True, separators=(",", ":"),
 * ensure_ascii=False)} do oráculo: chaves ordenadas por ponto de código, sem espaços, UTF-8, caracteres não ASCII literais, escapes curtos
 * ({@code \" \\ \n \r \t \b \f}) e escape unicode de 4 dígitos hexadecimais minúsculos para os demais de controle. Números: inteiros
 * ({@code Integer}, {@code Long}, {@code BigInteger}, {@code BigDecimal} de escala 0) sem ".0"; os demais como o {@code repr(float)} do
 * Python (dígitos mínimos, notação científica fora de 1e-4 ≤ |x| &lt; 1e16). Aceita {@code Map} (chaves String), {@code Collection},
 * {@code String}, {@code Number}, {@code Boolean}, {@code Enum} (nome) e {@code null}.
 */
public final class SnapshotCanonicalizer {

    private static final int SCI_LOW = -4;
    private static final int SCI_HIGH = 16;

    private SnapshotCanonicalizer() {
    }

    public static String canonical(Object value) {
        StringBuilder sb = new StringBuilder();
        write(sb, value);
        return sb.toString();
    }

    /** Re-canoniza um texto JSON (lido pelo {@link MiniJson}). */
    public static String canonicalizeJson(String json) {
        return canonical(MiniJson.parse(json));
    }

    public static String sha256(String canonical) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(canonical.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível na JVM", e);
        }
    }

    private static void write(StringBuilder sb, Object v) {
        if (v == null) {
            sb.append("null");
        } else if (v instanceof String s) {
            string(sb, s);
        } else if (v instanceof Boolean b) {
            sb.append(b ? "true" : "false");
        } else if (v instanceof Enum<?> e) {
            string(sb, e.name());
        } else if (v instanceof Number n) {
            sb.append(number(n));
        } else if (v instanceof Map<?, ?> m) {
            object(sb, m);
        } else if (v instanceof Collection<?> c) {
            sb.append('[');
            boolean first = true;
            for (Object o : c) {
                if (!first) {
                    sb.append(',');
                }
                first = false;
                write(sb, o);
            }
            sb.append(']');
        } else {
            throw new IllegalArgumentException("tipo sem forma canônica: " + v.getClass().getName());
        }
    }

    private static void object(StringBuilder sb, Map<?, ?> m) {
        List<String> keys = new ArrayList<>();
        for (Object k : m.keySet()) {
            if (!(k instanceof String s)) {
                throw new IllegalArgumentException("chave de objeto deve ser String: " + k);
            }
            keys.add(s);
        }
        keys.sort(SnapshotCanonicalizer::compareCodePoints);
        sb.append('{');
        for (int i = 0; i < keys.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            string(sb, keys.get(i));
            sb.append(':');
            write(sb, m.get(keys.get(i)));
        }
        sb.append('}');
    }

    /** Ordem de ponto de código (a do {@code sorted} do Python), não de unidade UTF-16. */
    static int compareCodePoints(String a, String b) {
        int i = 0;
        int j = 0;
        while (i < a.length() && j < b.length()) {
            int ca = a.codePointAt(i);
            int cb = b.codePointAt(j);
            if (ca != cb) {
                return Integer.compare(ca, cb);
            }
            i += Character.charCount(ca);
            j += Character.charCount(cb);
        }
        return Integer.compare(a.length() - i, b.length() - j);
    }

    private static void string(StringBuilder sb, String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        sb.append('"');
    }

    static String number(Number n) {
        if (n instanceof Integer || n instanceof Long || n instanceof Short || n instanceof Byte || n instanceof BigInteger) {
            return n.toString();
        }
        if (n instanceof BigDecimal bd) {
            if (bd.scale() == 0) {
                return bd.toPlainString();   // "70" no JSON de entrada é inteiro no Python
            }
            return pythonFloat(bd.doubleValue());
        }
        return pythonFloat(n.doubleValue());
    }

    /** {@code repr(float)} do Python: menor representação que volta ao mesmo double (o {@code Double.toString} do JDK 19+ também é mínimo). */
    static String pythonFloat(double d) {
        if (Double.isNaN(d) || Double.isInfinite(d)) {
            throw new IllegalArgumentException("JSON canônico não aceita NaN/Infinito");
        }
        if (d == 0) {
            return (1 / d < 0) ? "-0.0" : "0.0";
        }
        BigDecimal exact = new BigDecimal(Double.toString(Math.abs(d))).stripTrailingZeros();
        String digits = exact.unscaledValue().toString();
        int exp = digits.length() - 1 - exact.scale();     // d = digits[0].digits[1:] × 10^exp
        StringBuilder sb = new StringBuilder(d < 0 ? "-" : "");
        if (exp >= SCI_LOW && exp < SCI_HIGH) {
            if (exp >= 0) {
                String intPart = digits.length() > exp + 1 ? digits.substring(0, exp + 1) : digits + "0".repeat(exp + 1 - digits.length());
                String frac = digits.length() > exp + 1 ? digits.substring(exp + 1) : "0";
                sb.append(intPart).append('.').append(frac);
            } else {
                sb.append("0.").append("0".repeat(-exp - 1)).append(digits);
            }
        } else {
            sb.append(digits.charAt(0));
            if (digits.length() > 1) {
                sb.append('.').append(digits, 1, digits.length());
            }
            sb.append('e').append(exp < 0 ? '-' : '+');
            int a = Math.abs(exp);
            sb.append(a < 10 ? "0" + a : Integer.toString(a));
        }
        return sb.toString();
    }
}
