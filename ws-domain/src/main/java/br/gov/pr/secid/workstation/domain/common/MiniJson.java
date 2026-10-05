package br.gov.pr.secid.workstation.domain.common;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Leitor JSON mínimo e sem dependências para os campos {@code *Json} que o domínio precisa inspecionar (checklist de critérios,
 * motivos de recusa). Devolve {@code Map<String,Object>} / {@code List<Object>} / {@code String} / {@code BigDecimal} / {@code Boolean} /
 * {@code null}; entrada malformada lança {@link IllegalArgumentException} {@code JSON_INVALIDO}. Não substitui o Jackson do
 * {@code ws-web}: é só para invariantes de domínio em records imutáveis.
 */
public final class MiniJson {

    private final String s;
    private int i;

    private MiniJson(String s) {
        this.s = s;
    }

    public static Object parse(String json) {
        if (json == null) {
            throw new IllegalArgumentException("JSON_INVALIDO: texto nulo");
        }
        MiniJson p = new MiniJson(json);
        Object v = p.value();
        p.ws();
        if (p.i != p.s.length()) {
            throw p.error("conteúdo depois do valor");
        }
        return v;
    }

    /** Atalho: lista (ou lança se o JSON não for um array). */
    public static List<Object> parseArray(String json) {
        Object v = parse(json);
        if (!(v instanceof List<?> list)) {
            throw new IllegalArgumentException("JSON_INVALIDO: esperado array");
        }
        List<Object> out = new ArrayList<>(list.size());
        out.addAll(list);
        return out;
    }

    private Object value() {
        ws();
        if (i >= s.length()) {
            throw error("fim inesperado");
        }
        char c = s.charAt(i);
        return switch (c) {
            case '{' -> object();
            case '[' -> array();
            case '"' -> string();
            case 't' -> literal("true", Boolean.TRUE);
            case 'f' -> literal("false", Boolean.FALSE);
            case 'n' -> literal("null", null);
            default -> number();
        };
    }

    private Map<String, Object> object() {
        Map<String, Object> m = new LinkedHashMap<>();
        i++;
        ws();
        if (peek('}')) {
            i++;
            return m;
        }
        while (true) {
            ws();
            if (!peek('"')) {
                throw error("chave esperada");
            }
            String k = string();
            ws();
            expect(':');
            m.put(k, value());
            ws();
            if (peek(',')) {
                i++;
                continue;
            }
            expect('}');
            return m;
        }
    }

    private List<Object> array() {
        List<Object> l = new ArrayList<>();
        i++;
        ws();
        if (peek(']')) {
            i++;
            return l;
        }
        while (true) {
            l.add(value());
            ws();
            if (peek(',')) {
                i++;
                continue;
            }
            expect(']');
            return l;
        }
    }

    private String string() {
        StringBuilder sb = new StringBuilder();
        i++;
        while (i < s.length()) {
            char c = s.charAt(i++);
            if (c == '"') {
                return sb.toString();
            }
            if (c == '\\') {
                if (i >= s.length()) {
                    break;
                }
                char e = s.charAt(i++);
                switch (e) {
                    case '"' -> sb.append('"');
                    case '\\' -> sb.append('\\');
                    case '/' -> sb.append('/');
                    case 'b' -> sb.append('\b');
                    case 'f' -> sb.append('\f');
                    case 'n' -> sb.append('\n');
                    case 'r' -> sb.append('\r');
                    case 't' -> sb.append('\t');
                    case 'u' -> {
                        if (i + 4 > s.length()) {
                            throw error("\\u incompleto");
                        }
                        sb.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
                        i += 4;
                    }
                    default -> throw error("escape inválido \\" + e);
                }
            } else if (c < 0x20) {
                throw error("caractere de controle dentro de string");
            } else {
                sb.append(c);
            }
        }
        throw error("string sem fechamento");
    }

    private Object literal(String word, Object v) {
        if (!s.startsWith(word, i)) {
            throw error("literal inválido");
        }
        i += word.length();
        return v;
    }

    private BigDecimal number() {
        int start = i;
        while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) {
            i++;
        }
        if (start == i) {
            throw error("valor inesperado '" + s.charAt(i) + "'");
        }
        try {
            return new BigDecimal(s.substring(start, i));
        } catch (NumberFormatException ex) {
            throw error("número inválido");
        }
    }

    private void ws() {
        while (i < s.length() && Character.isWhitespace(s.charAt(i))) {
            i++;
        }
    }

    private boolean peek(char c) {
        return i < s.length() && s.charAt(i) == c;
    }

    private void expect(char c) {
        if (!peek(c)) {
            throw error("esperado '" + c + "'");
        }
        i++;
    }

    private IllegalArgumentException error(String what) {
        return new IllegalArgumentException("JSON_INVALIDO: " + what + " na posição " + i);
    }
}
