package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Criterion;
import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Deliverable;
import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Reference;
import br.gov.pr.secid.workstation.application.common.ApiException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Validação e (de)serialização das listas do briefing. Limites conservadores para manter o card legível e impedir abuso de
 * armazenamento; texto puro (o front nunca renderiza como HTML). URL de referência só http(s) com host.
 */
final class TaskBriefJson {
    static final int MAX_DELIVERABLES = 20;
    static final int MAX_CRITERIA = 30;
    static final int MAX_REFERENCES = 20;
    static final int MAX_EXTENSIONS = 12;
    static final int MAX_TEXT = 300;
    static final int MAX_URL = 500;
    private static final Pattern EXTENSION_KEY = Pattern.compile("^[a-z][a-zA-Z0-9]{1,30}$");
    private static final ObjectMapper JSON = JsonMapper.builder().build();

    private TaskBriefJson() {
    }

    static String deliverables(List<Deliverable> items, Map<String, Object> errors) {
        if (items == null || items.isEmpty()) {
            return null;
        }
        if (items.size() > MAX_DELIVERABLES) {
            errors.put("deliverables", "No máximo " + MAX_DELIVERABLES + " entregáveis.");
            return null;
        }
        List<Deliverable> clean = new ArrayList<>();
        for (Deliverable d : items) {
            String t = text(d == null ? null : d.text());
            if (t == null) {
                errors.put("deliverables", "Cada entregável precisa de texto (até " + MAX_TEXT + " caracteres).");
                return null;
            }
            clean.add(new Deliverable(t));
        }
        return write(clean);
    }

    static String criteria(List<Criterion> items, Map<String, Object> errors) {
        if (items == null || items.isEmpty()) {
            return null;
        }
        if (items.size() > MAX_CRITERIA) {
            errors.put("acceptanceCriteria", "No máximo " + MAX_CRITERIA + " critérios.");
            return null;
        }
        List<Criterion> clean = new ArrayList<>();
        for (Criterion c : items) {
            String t = text(c == null ? null : c.text());
            if (t == null) {
                errors.put("acceptanceCriteria", "Cada critério precisa de texto (até " + MAX_TEXT + " caracteres).");
                return null;
            }
            clean.add(new Criterion(t, c.done()));
        }
        return write(clean);
    }

    static String references(List<Reference> items, Map<String, Object> errors) {
        if (items == null || items.isEmpty()) {
            return null;
        }
        if (items.size() > MAX_REFERENCES) {
            errors.put("references", "No máximo " + MAX_REFERENCES + " referências.");
            return null;
        }
        List<Reference> clean = new ArrayList<>();
        for (Reference r : items) {
            String url = r == null || r.url() == null ? null : r.url().trim();
            if (!validUrl(url)) {
                errors.put("references", "Cada referência precisa de um endereço http(s) válido (até " + MAX_URL + " caracteres).");
                return null;
            }
            String label = text(r.label());
            clean.add(new Reference(label == null ? url : label, url));
        }
        return write(clean);
    }

    static String extensions(Map<String, String> items, Map<String, Object> errors) {
        if (items == null || items.isEmpty()) {
            return null;
        }
        if (items.size() > MAX_EXTENSIONS) {
            errors.put("extensions", "No máximo " + MAX_EXTENSIONS + " campos da área.");
            return null;
        }
        Map<String, String> clean = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : items.entrySet()) {
            if (e.getKey() == null || !EXTENSION_KEY.matcher(e.getKey()).matches()) {
                errors.put("extensions", "Nome de campo da área inválido.");
                return null;
            }
            String v = e.getValue() == null ? null : e.getValue().strip();
            if (v == null || v.isEmpty()) {
                continue;
            }
            if (v.length() > MAX_URL) {
                errors.put("extensions", "Cada campo da área tem até " + MAX_URL + " caracteres.");
                return null;
            }
            clean.put(e.getKey(), v);
        }
        return clean.isEmpty() ? null : write(clean);
    }

    static List<Deliverable> readDeliverables(String json) {
        return read(json, new TypeReference<List<Deliverable>>() { });
    }

    static List<Criterion> readCriteria(String json) {
        return read(json, new TypeReference<List<Criterion>>() { });
    }

    static List<Reference> readReferences(String json) {
        return read(json, new TypeReference<List<Reference>>() { });
    }

    static Map<String, String> readExtensions(String json) {
        Map<String, String> m = json == null ? null : JSON.readValue(json, new TypeReference<LinkedHashMap<String, String>>() { });
        return m == null ? Map.of() : m;
    }

    private static <T> List<T> read(String json, TypeReference<List<T>> type) {
        List<T> out = json == null ? null : JSON.readValue(json, type);
        return out == null ? List.of() : out;
    }

    private static String text(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.strip();
        return t.isEmpty() || t.length() > MAX_TEXT ? null : t;
    }

    private static boolean validUrl(String url) {
        if (url == null || url.isEmpty() || url.length() > MAX_URL) {
            return false;
        }
        try {
            URI u = URI.create(url);
            String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase(Locale.ROOT);
            return (scheme.equals("https") || scheme.equals("http")) && u.getHost() != null;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static String write(Object value) {
        return JSON.writeValueAsString(value);
    }

    static ApiException invalid(Map<String, Object> errors) {
        return ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.", Map.of("fields", errors));
    }
}
