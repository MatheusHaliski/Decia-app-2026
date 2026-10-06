package br.gov.pr.secid.workstation.application.ai;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Mascaramento de dados pessoais ANTES de qualquer chamada a provedor externo (RF43.CA02, LGPD — D-69): e-mail, CNPJ, CPF e telefone
 * brasileiro viram marcadores ({@code [EMAIL]}, {@code [CNPJ]}, {@code [CPF]}, {@code [TELEFONE]}). Erra para o lado de mascarar demais
 * (uma sequência de 11 dígitos vira CPF mesmo sem dígito verificador válido). O que foi mascarado vai, só em contagem, para
 * {@code ai_inference_log.masked_fields_json} — o valor original nunca é registrado.
 */
public final class PersonalDataMasker {
    private static final Map<String, Pattern> PATTERNS = new LinkedHashMap<>();

    static {
        PATTERNS.put("EMAIL", Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"));
        PATTERNS.put("CNPJ", Pattern.compile("(?<!\\d)\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}(?!\\d)"));
        PATTERNS.put("CPF", Pattern.compile("(?<!\\d)\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}(?!\\d)"));
        PATTERNS.put("TELEFONE", Pattern.compile("(?<![\\d+])(?:\\+?55[\\s-]?)?(?:\\(?\\d{2}\\)?[\\s-]?)?9?\\d{4}[\\s-]?\\d{4}(?!\\d)"));
    }

    /** Texto mascarado + contagem por tipo (só tipos com ≥ 1 ocorrência). */
    public record Masked(String text, Map<String, Integer> counts) {
        public Masked {
            counts = Map.copyOf(counts);
        }

        public int total() {
            return counts.values().stream().mapToInt(Integer::intValue).sum();
        }

        /** JSON da contagem para {@code masked_fields_json}, em ordem estável. */
        public String countsJson() {
            StringBuilder sb = new StringBuilder("{");
            PATTERNS.keySet().stream().filter(counts::containsKey).forEach(k -> {
                if (sb.length() > 1) {
                    sb.append(',');
                }
                sb.append('"').append(k).append("\":").append(counts.get(k));
            });
            return sb.append('}').toString();
        }
    }

    private PersonalDataMasker() {
    }

    public static Masked mask(String text) {
        if (text == null || text.isEmpty()) {
            return new Masked(text == null ? "" : text, Map.of());
        }
        String out = text;
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Map.Entry<String, Pattern> e : PATTERNS.entrySet()) {
            Matcher m = e.getValue().matcher(out);
            int n = 0;
            StringBuilder sb = new StringBuilder();
            while (m.find()) {
                n++;
                m.appendReplacement(sb, Matcher.quoteReplacement("[" + e.getKey() + "]"));
            }
            m.appendTail(sb);
            if (n > 0) {
                counts.put(e.getKey(), n);
                out = sb.toString();
            }
        }
        return new Masked(out, counts);
    }
}
