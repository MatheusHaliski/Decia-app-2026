package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.domain.acervo.DeliveryFormats;
import br.gov.pr.secid.workstation.domain.acervo.FormatFamily;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.Map;
import java.util.TreeMap;

/**
 * Detalhes do formato de entrega (V71): JSON pequeno com texto por chave, validado contra {@link DeliveryFormats}. Erros de forma (não é
 * objeto JSON de textos) respondem {@code 400 FORMATO_DETALHES_INVALIDO}; variante de outra família, chave desconhecida ou valor fora do
 * campo entram no {@code 422 VALIDACAO} junto com os outros campos. Gravado em forma canônica (chaves ordenadas, sem vazios).
 */
final class TaskFormatJson {
    static final String INVALID = "FORMATO_DETALHES_INVALIDO";
    private static final ObjectMapper JSON = JsonMapper.builder().build();
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {
    };

    private TaskFormatJson() {
    }

    /** Valida e devolve o JSON canônico (ou nulo sem detalhes); erros de campo vão para {@code errors}. */
    static String details(FormatFamily family, String variant, String raw, Map<String, Object> errors) {
        Map<String, String> parsed = parse(raw);
        Map<String, String> fieldErrors = DeliveryFormats.validate(family, variant, parsed);
        errors.putAll(fieldErrors);
        if (!fieldErrors.isEmpty() || parsed.isEmpty()) {
            return null;
        }
        String json = write(parsed);
        if (json.length() > DeliveryFormats.MAX_DETAILS_JSON) {
            errors.put("formatDetailsJson", "Detalhes do formato com até " + DeliveryFormats.MAX_DETAILS_JSON + " caracteres.");
            return null;
        }
        return json;
    }

    /** Objeto JSON de textos (vazios descartados); outra forma → 400. */
    static Map<String, String> parse(String raw) {
        Map<String, String> out = new TreeMap<>();
        if (raw == null || raw.isBlank()) {
            return out;
        }
        if (raw.length() > DeliveryFormats.MAX_DETAILS_JSON * 2) {
            throw shape();
        }
        Map<String, Object> m;
        try {
            m = JSON.readValue(raw, MAP);
        } catch (RuntimeException e) {
            throw shape();
        }
        if (m == null) {
            return out;
        }
        for (Map.Entry<String, Object> e : m.entrySet()) {
            if (!(e.getValue() instanceof String v)) {
                throw shape();
            }
            if (!v.isBlank()) {
                out.put(e.getKey(), v.strip());
            }
        }
        return out;
    }

    /** Forma canônica (chaves ordenadas) — também usada para os detalhes que o servidor extrai dos anexos. */
    static String write(Map<String, String> details) {
        return details == null || details.isEmpty() ? null : JSON.writeValueAsString(new TreeMap<>(details));
    }

    private static ApiException shape() {
        return ApiException.badRequest(INVALID, "Os detalhes do formato precisam ser um objeto JSON com textos.",
                Map.of("parameter", "formatDetailsJson"));
    }
}
