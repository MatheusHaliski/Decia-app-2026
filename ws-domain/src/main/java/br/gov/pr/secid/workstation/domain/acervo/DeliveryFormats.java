package br.gov.pr.secid.workstation.domain.acervo;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Catálogo família → variante → campos próprios do formato de entrega (docs/produto/FORMATOS_E_VARIANTES.md). Espelha
 * {@code FORMAT_FAMILY_FIELDS}/{@code FORMAT_VARIANTS} de lib/tasks/formats.ts (mesmos códigos, chaves e limites) — mudar um exige mudar o
 * outro. Puro e sem dependências: a camada de aplicação lê o JSON dos detalhes e chama {@link #validate}.
 * <p>
 * Os detalhes guardam texto ({@code "true"/"false"} nos booleanos), como no front. Fora da tarefa (anexos e evidências) os detalhes são
 * extraídos pelo servidor do binário e usam as chaves de {@link #DETECTED_KEYS}.
 */
public final class DeliveryFormats {

    /** Teto do JSON canônico dos detalhes ({@code format_details_json}). */
    public static final int MAX_DETAILS_JSON = 2000;
    /** Teto de cada valor de texto. */
    public static final int MAX_TEXT = 200;
    private static final Pattern CODE = Pattern.compile("[A-Z0-9_]{2,10}");

    public enum Kind { BOOL, SELECT, NUMBER, TEXT }

    /** Campo de detalhe: {@code options} só em SELECT; {@code min}/{@code max} só em NUMBER. */
    public record Field(String key, Kind kind, List<String> options, int min, int max) {
        public Field {
            options = options == null ? List.of() : List.copyOf(options);
        }

        /** Valor vazio é aceito (campo opcional); o resto conforme o tipo. */
        public boolean accepts(String value) {
            if (value == null || value.isEmpty()) {
                return true;
            }
            return switch (kind) {
                case BOOL -> value.equals("true") || value.equals("false");
                case SELECT -> options.contains(value);
                case NUMBER -> {
                    try {
                        int n = Integer.parseInt(value);
                        yield n >= min && n <= max;
                    } catch (NumberFormatException e) {
                        yield false;
                    }
                }
                case TEXT -> value.length() <= MAX_TEXT;
            };
        }
    }

    public record Variant(String code, FormatFamily family, List<Field> fields) {
        public Variant {
            fields = List.copyOf(fields);
        }
    }

    /**
     * Chaves que o servidor preenche ao detectar o tipo real de um anexo/evidência (nunca digitadas): páginas e camada de texto do PDF,
     * largura × altura da imagem, abas da planilha (XLSX/ODS), slides da apresentação (PPTX/ODP), páginas do ODT, versão do DWG, entradas
     * do ZIP; nos textos (CSV, TSV, TXT, MD, JSON, XML) codificação ({@code UTF8}, {@code UTF8BOM}, {@code WINDOWS1252}), quebra de linha
     * ({@code LF}, {@code CRLF}, {@code CR}, {@code MIXED}), linhas e — CSV/TSV — delimitador ({@code COMMA}, {@code SEMICOLON}, {@code TAB},
     * {@code PIPE}), colunas e cabeçalho ({@code headerRow}).
     */
    public static final Set<String> DETECTED_KEYS = Set.of("pages", "textLayer", "width", "height", "sheets", "slides", "cadVersion", "entries",
            "encrypted", "encoding", "lineEnding", "lines", "delimiter", "columns", "headerRow");

    private static final Field ENCODING = sel("encoding", "UTF8", "UTF8BOM", "LATIN1");
    private static final Field DELIMITER = sel("delimiter", "SEMICOLON", "COMMA", "TAB", "PIPE");
    private static final Field DECIMAL = sel("decimal", "COMMA", "DOT");
    private static final Field CAD_VERSION = sel("cadVersion", "AC1032", "AC1027", "AC1024", "AC1021");
    private static final List<Field> SHEET_OFFICE = List.of(text("sheets"), bool("formulas"), bool("protected"));

    private static final Map<FormatFamily, List<Field>> FAMILY_FIELDS = familyFields();
    private static final List<Variant> VARIANTS = variants();

    private DeliveryFormats() {
    }

    public static List<Variant> variants(FormatFamily family) {
        return VARIANTS.stream().filter(v -> v.family() == family).toList();
    }

    public static Optional<Variant> variant(FormatFamily family, String code) {
        if (family == null || code == null) {
            return Optional.empty();
        }
        return VARIANTS.stream().filter(v -> v.family() == family && v.code().equals(code)).findFirst();
    }

    /** Campos que valem: os da família e depois os da variante, sem repetir chave. */
    public static List<Field> fieldsFor(FormatFamily family, String code) {
        if (family == null) {
            return List.of();
        }
        Map<String, Field> out = new LinkedHashMap<>();
        FAMILY_FIELDS.get(family).forEach(f -> out.putIfAbsent(f.key(), f));
        variant(family, code).ifPresent(v -> v.fields().forEach(f -> out.putIfAbsent(f.key(), f)));
        return List.copyOf(out.values());
    }

    /**
     * Confere a escolha (família, variante, detalhes) e devolve os erros por campo ({@code formatVariant}, {@code formatDetails.<chave>});
     * vazio = válida. Variante de outra família, chave desconhecida para a variante e valor fora do campo são erros.
     */
    public static Map<String, String> validate(FormatFamily family, String code, Map<String, String> details) {
        Map<String, String> errors = new LinkedHashMap<>();
        Map<String, String> d = details == null ? Map.of() : details;
        if (family == null) {
            if (code != null) {
                errors.put("formatVariant", "Escolha a família antes da variante.");
            }
            if (!d.isEmpty()) {
                errors.put("formatDetailsJson", "Detalhes do formato exigem a família.");
            }
            return errors;
        }
        if (code != null && (!CODE.matcher(code).matches() || variant(family, code).isEmpty())) {
            errors.put("formatVariant", "A variante " + safe(code) + " não pertence à família " + family + ".");
            return errors;
        }
        Map<String, Field> fields = new LinkedHashMap<>();
        fieldsFor(family, code).forEach(f -> fields.put(f.key(), f));
        for (Map.Entry<String, String> e : d.entrySet()) {
            Field f = fields.get(e.getKey());
            if (f == null) {
                errors.put("formatDetails." + safe(e.getKey()), "Campo desconhecido para este formato.");
            } else if (!f.accepts(e.getValue())) {
                errors.put("formatDetails." + f.key(), "Valor inválido para " + f.key() + ".");
            }
        }
        return errors;
    }

    /** Variantes que existem em mais de uma família (PDF de documento, de apresentação e de prancha; CSV de planilha e de dados). */
    public static Set<String> sharedCodes() {
        Set<String> seen = new LinkedHashSet<>();
        Set<String> shared = new LinkedHashSet<>();
        VARIANTS.forEach(v -> {
            if (!seen.add(v.code())) {
                shared.add(v.code());
            }
        });
        return shared;
    }

    private static String safe(String s) {
        String v = Objects.toString(s, "");
        return v.length() > 40 ? v.substring(0, 40) : v;
    }

    // ------------------------------------------------------------------------------------------------ catálogo

    private static Field bool(String key) {
        return new Field(key, Kind.BOOL, List.of(), 0, 0);
    }

    private static Field num(String key, int min, int max) {
        return new Field(key, Kind.NUMBER, List.of(), min, max);
    }

    private static Field sel(String key, String... options) {
        return new Field(key, Kind.SELECT, List.of(options), 0, 0);
    }

    private static Field text(String key) {
        return new Field(key, Kind.TEXT, List.of(), 0, 0);
    }

    private static Map<FormatFamily, List<Field>> familyFields() {
        Map<FormatFamily, List<Field>> m = new EnumMap<>(FormatFamily.class);
        m.put(FormatFamily.PLANILHA, List.of(bool("headerRow")));
        m.put(FormatFamily.DOCUMENTO, List.of(num("pages", 1, 5000)));
        m.put(FormatFamily.APRESENTACAO, List.of(num("slides", 1, 500)));
        m.put(FormatFamily.IMAGEM, List.of(num("minWidth", 1, 20000), num("minHeight", 1, 20000)));
        m.put(FormatFamily.DESENHO_TECNICO, List.of(sel("unit", "MM", "CM", "M", "IN", "FT"), text("scale")));
        m.put(FormatFamily.DADOS, List.of(ENCODING));
        m.put(FormatFamily.AUDIO_VIDEO, List.of(num("durationMin", 1, 600)));
        m.put(FormatFamily.PACOTE, List.of(text("contents")));
        m.put(FormatFamily.LINK, List.of(bool("linkAccess")));
        m.put(FormatFamily.OUTRO, List.of(text("description")));
        return java.util.Collections.unmodifiableMap(m);
    }

    private static List<Variant> variants() {
        List<Variant> v = new ArrayList<>();
        FormatFamily p = FormatFamily.PLANILHA;
        v.add(new Variant("XLSX", p, SHEET_OFFICE));
        v.add(new Variant("XLS", p, SHEET_OFFICE));
        v.add(new Variant("XLSM", p, SHEET_OFFICE));
        v.add(new Variant("ODS", p, SHEET_OFFICE));
        v.add(new Variant("CSV", p, List.of(DELIMITER, ENCODING, DECIMAL)));
        v.add(new Variant("TSV", p, List.of(ENCODING, DECIMAL)));
        FormatFamily d = FormatFamily.DOCUMENTO;
        v.add(new Variant("DOCX", d, List.of(text("template"), bool("trackChanges"))));
        v.add(new Variant("DOC", d, List.of(text("template"))));
        v.add(new Variant("ODT", d, List.of(text("template"), bool("trackChanges"))));
        v.add(new Variant("PDF", d, List.of(bool("signed"), bool("textLayer"))));
        v.add(new Variant("PDF_A", d, List.of(sel("pdfaLevel", "1B", "2B", "3B"), bool("signed"), bool("textLayer"))));
        v.add(new Variant("RTF", d, List.of()));
        v.add(new Variant("MD", d, List.of(ENCODING)));
        v.add(new Variant("TXT", d, List.of(ENCODING)));
        v.add(new Variant("HTML", d, List.of(ENCODING)));
        FormatFamily a = FormatFamily.APRESENTACAO;
        v.add(new Variant("PPTX", a, List.of(text("template"))));
        v.add(new Variant("ODP", a, List.of(text("template"))));
        v.add(new Variant("PDF", a, List.of()));
        FormatFamily i = FormatFamily.IMAGEM;
        v.add(new Variant("PNG", i, List.of(bool("transparency"))));
        v.add(new Variant("JPG", i, List.of()));
        v.add(new Variant("SVG", i, List.of(bool("transparency"))));
        v.add(new Variant("WEBP", i, List.of(bool("transparency"))));
        FormatFamily t = FormatFamily.DESENHO_TECNICO;
        v.add(new Variant("DWG", t, List.of(CAD_VERSION)));
        v.add(new Variant("DXF", t, List.of(CAD_VERSION)));
        v.add(new Variant("IFC", t, List.of(sel("ifcSchema", "IFC2X3", "IFC4", "IFC4X3"))));
        v.add(new Variant("GLB", t, List.of()));
        v.add(new Variant("PDF", t, List.of(sel("paper", "A0", "A1", "A2", "A3", "A4"), bool("signed"))));
        FormatFamily x = FormatFamily.DADOS;
        v.add(new Variant("JSON", x, List.of(text("schemaUrl"))));
        v.add(new Variant("XML", x, List.of(text("schemaUrl"))));
        v.add(new Variant("CSV", x, List.of(DELIMITER, bool("headerRow"), DECIMAL)));
        FormatFamily av = FormatFamily.AUDIO_VIDEO;
        v.add(new Variant("MP3", av, List.of(bool("transcript"))));
        v.add(new Variant("WAV", av, List.of(bool("transcript"))));
        v.add(new Variant("M4A", av, List.of(bool("transcript"))));
        v.add(new Variant("MP4", av, List.of(bool("captions"))));
        v.add(new Variant("WEBM", av, List.of(bool("captions"))));
        v.add(new Variant("MOV", av, List.of(bool("captions"))));
        v.add(new Variant("ZIP", FormatFamily.PACOTE, List.of(num("maxFiles", 1, 10000))));
        v.add(new Variant("URL", FormatFamily.LINK, List.of(text("platform"))));
        return List.copyOf(v);
    }
}
