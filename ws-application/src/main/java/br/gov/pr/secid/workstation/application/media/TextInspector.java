package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.common.ApiException;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.io.StringReader;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Arquivos de TEXTO (CSV, TSV, TXT, MD, JSON, XML) — não têm assinatura binária, então a decisão é por heurística SEGURA sobre o conteúdo
 * inteiro, nunca pelo nome sozinho (D-67):
 * <ol>
 *   <li>é texto: nenhum NUL nem caractere de controle além de TAB/LF/CR/FF, e decodifica sem erro como UTF-8 (com ou sem BOM) ou, se não,
 *       como Windows-1252 (bytes indefinidos 0x81/0x8D/0x8F/0x90/0x9D recusam);</li>
 *   <li>a extensão declarada escolhe o tipo de texto e o conteúdo precisa sustentá-la: JSON e XML bem formados (XML sem DOCTYPE — sem XXE
 *       nem bomba de entidades); texto com extensão que não é de texto ({@code foto.png}, {@code app.js}) → {@code 415 TIPO_NAO_PERMITIDO};</li>
 *   <li>SVG fica de fora (XML que o navegador executa): extensão {@code .svg} ou raiz {@code <svg>} → {@code 415 TIPO_NAO_PERMITIDO};
 *       XHTML (raiz {@code <html>}) idem.</li>
 * </ol>
 * Detalhes extraídos ({@link #details}): {@code encoding} (UTF8, UTF8BOM, WINDOWS1252), {@code lineEnding} (LF, CRLF, CR, MIXED; ausente sem
 * quebra), {@code lines}; CSV/TSV também {@code delimiter} (COMMA, SEMICOLON, TAB, PIPE — quando o mesmo número de separadores se repete
 * nas linhas), {@code columns} e {@code headerRow} (primeira linha só com rótulos não numéricos e distintos).
 */
public final class TextInspector {
    /** Linhas olhadas para decidir delimitador e cabeçalho. */
    static final int SAMPLE_LINES = 200;
    private static final Set<Integer> WIN1252_UNDEFINED = Set.of(0x81, 0x8D, 0x8F, 0x90, 0x9D);
    private static final Charset WIN1252 = Charset.forName("windows-1252");
    private static final ObjectMapper JSON = JsonMapper.builder().build();
    private static final Map<Character, String> DELIMITERS = delimiters();

    /** Texto decodificado e como estava gravado. */
    public record Decoded(String text, String encoding) {
    }

    private TextInspector() {
    }

    /** Decodifica se for texto aceitável (ver classe); binário ou codificação inválida → vazio. */
    public static Optional<Decoded> decode(byte[] b) {
        if (b == null || b.length == 0) {
            return Optional.empty();
        }
        for (byte x : b) {
            int c = x & 0xFF;
            if (c < 0x20 && c != '\t' && c != '\n' && c != '\r' && c != '\f') {
                return Optional.empty();
            }
            if (c == 0x7F) {
                return Optional.empty();
            }
        }
        boolean bom = b.length >= 3 && (b[0] & 0xFF) == 0xEF && (b[1] & 0xFF) == 0xBB && (b[2] & 0xFF) == 0xBF;
        try {
            String s = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(b, bom ? 3 : 0, b.length - (bom ? 3 : 0))).toString();
            return Optional.of(new Decoded(s, bom ? "UTF8BOM" : "UTF8"));
        } catch (CharacterCodingException e) {
            // não é UTF-8: tenta Windows-1252 (planilhas exportadas pelo Excel no Brasil)
        }
        for (byte x : b) {
            if (WIN1252_UNDEFINED.contains(x & 0xFF)) {
                return Optional.empty();
            }
        }
        return Optional.of(new Decoded(new String(b, WIN1252), "WINDOWS1252"));
    }

    /**
     * Tipo de texto pelo conteúdo + extensão declarada. Recusa: não é texto → {@code 415 TIPO_NAO_PERMITIDO}; SVG/XHTML →
     * {@code 415 TIPO_NAO_PERMITIDO}; JSON/XML malformado → {@code 422 TEXTO_MALFORMADO}.
     */
    public static DetectedType refine(byte[] b, String extension) {
        Decoded d = decode(b).orElseThrow(() -> notAllowed("binario"));
        String ext = extension == null ? "" : extension.toLowerCase(Locale.ROOT);
        if (ext.equals("svg") || ext.equals("svgz") || ext.equals("html") || ext.equals("htm") || ext.equals("xhtml")) {
            throw notAllowed(ext.startsWith("svg") ? "SVG" : "HTML");
        }
        for (DetectedType t : List.of(DetectedType.TXT, DetectedType.CSV, DetectedType.TSV, DetectedType.MD, DetectedType.JSON, DetectedType.XML)) {
            if (t.acceptsExtension(ext)) {
                if (t == DetectedType.JSON) {
                    requireJson(d.text());
                } else if (t == DetectedType.XML) {
                    requireXml(d.text());
                }
                return t;
            }
        }
        // texto com nome de outro tipo (foto.png, laudo.pdf, script.js…): não é o que diz ser nem um texto aceito
        throw notAllowed("texto");
    }

    /** Detalhes do texto (ver classe); vazio se o conteúdo não decodificar. */
    public static Map<String, String> details(DetectedType type, byte[] b) {
        Map<String, String> d = new LinkedHashMap<>();
        Optional<Decoded> decoded = decode(b);
        if (decoded.isEmpty()) {
            return d;
        }
        String text = decoded.get().text();
        d.put("encoding", decoded.get().encoding());
        String ending = lineEnding(text);
        if (ending != null) {
            d.put("lineEnding", ending);
        }
        List<String> lines = lines(text);
        d.put("lines", Integer.toString(lines.size()));
        if (type == DetectedType.CSV || type == DetectedType.TSV) {
            List<String> sample = lines.stream().filter(l -> !l.isBlank()).limit(SAMPLE_LINES).toList();
            Character delim = type == DetectedType.TSV ? Character.valueOf('\t') : delimiter(sample);
            if (delim != null && consistent(sample, delim)) {
                d.put("delimiter", DELIMITERS.get(delim));
                List<String> header = split(sample.get(0), delim);
                d.put("columns", Integer.toString(header.size()));
                d.put("headerRow", Boolean.toString(sample.size() > 1 && looksLikeHeader(header)));
            }
        }
        return d;
    }

    // ------------------------------------------------------------------------------------------------ JSON / XML

    static void requireJson(String text) {
        try (JsonParser p = JSON.createParser(text)) {
            JsonToken first = p.nextToken();
            if (first == null) {
                throw malformed("json_vazio");
            }
            p.skipChildren();
            if (p.nextToken() != null) {
                throw malformed("json_conteudo_extra");
            }
        } catch (ApiException e) {
            throw e;
        } catch (RuntimeException e) {
            throw malformed("json_invalido");
        }
    }

    static void requireXml(String text) {
        XMLInputFactory f = XMLInputFactory.newFactory();
        f.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        f.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        f.setProperty(XMLInputFactory.IS_REPLACING_ENTITY_REFERENCES, false);
        XMLStreamReader r = null;
        try {
            r = f.createXMLStreamReader(new StringReader(text.startsWith("﻿") ? text.substring(1) : text));
            boolean root = true;
            while (r.hasNext()) {
                int ev = r.next();
                if (ev == XMLStreamConstants.DTD) {
                    throw malformed("xml_doctype");
                }
                if (ev == XMLStreamConstants.START_ELEMENT && root) {
                    root = false;
                    String local = r.getLocalName().toLowerCase(Locale.ROOT);
                    if (local.equals("svg")) {
                        throw notAllowed("SVG");
                    }
                    if (local.equals("html")) {
                        throw notAllowed("HTML");
                    }
                }
            }
            if (root) {
                throw malformed("xml_sem_raiz");
            }
        } catch (XMLStreamException | RuntimeException e) {
            if (e instanceof ApiException api) {
                throw api;
            }
            throw malformed("xml_invalido");
        } finally {
            if (r != null) {
                try {
                    r.close();
                } catch (XMLStreamException ignored) {
                    // leitura em memória: nada a liberar
                }
            }
        }
    }

    // ------------------------------------------------------------------------------------------------ linhas e delimitador

    static String lineEnding(String s) {
        int crlf = 0;
        int lf = 0;
        int cr = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '\r') {
                if (i + 1 < s.length() && s.charAt(i + 1) == '\n') {
                    crlf++;
                    i++;
                } else {
                    cr++;
                }
            } else if (c == '\n') {
                lf++;
            }
        }
        int kinds = (crlf > 0 ? 1 : 0) + (lf > 0 ? 1 : 0) + (cr > 0 ? 1 : 0);
        if (kinds == 0) {
            return null;
        }
        if (kinds > 1) {
            return "MIXED";
        }
        return crlf > 0 ? "CRLF" : lf > 0 ? "LF" : "CR";
    }

    static List<String> lines(String s) {
        List<String> out = new ArrayList<>(List.of(s.split("\r\n|\n|\r", -1)));
        if (!out.isEmpty() && out.get(out.size() - 1).isEmpty()) {
            out.remove(out.size() - 1);   // quebra final não é linha vazia a mais
        }
        return out;
    }

    /** Separador com a mesma contagem (fora de aspas) em todas as linhas da amostra, preferindo o mais frequente. */
    static Character delimiter(List<String> sample) {
        Character best = null;
        int bestCount = 0;
        for (Character c : DELIMITERS.keySet()) {
            if (sample.isEmpty()) {
                return null;
            }
            int n = split(sample.get(0), c).size() - 1;
            if (n > bestCount && consistent(sample, c)) {
                best = c;
                bestCount = n;
            }
        }
        return best;
    }

    static boolean consistent(List<String> sample, char delim) {
        if (sample.isEmpty()) {
            return false;
        }
        int expected = split(sample.get(0), delim).size();
        if (expected < 2) {
            return false;
        }
        for (String l : sample) {
            if (split(l, delim).size() != expected) {
                return false;
            }
        }
        return true;
    }

    /** Campos de uma linha respeitando aspas duplas (RFC 4180; aspas dobradas dentro do campo). */
    static List<String> split(String line, char delim) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    cur.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (c == delim && !quoted) {
                out.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        out.add(cur.toString());
        return out;
    }

    static boolean looksLikeHeader(List<String> cells) {
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (String raw : cells) {
            String c = raw.strip();
            if (c.isEmpty() || c.matches("[-+]?[0-9.,]+%?") || !seen.add(c.toLowerCase(Locale.ROOT))) {
                return false;
            }
        }
        return true;
    }

    private static Map<Character, String> delimiters() {
        Map<Character, String> m = new LinkedHashMap<>();
        m.put(';', "SEMICOLON");
        m.put(',', "COMMA");
        m.put('\t', "TAB");
        m.put('|', "PIPE");
        return m;
    }

    private static ApiException notAllowed(String detected) {
        return new ApiException(MediaUploadInspector.TIPO_NAO_PERMITIDO, 415, "Tipo de arquivo não permitido.", Map.of("detected", detected));
    }

    private static ApiException malformed(String reason) {
        return ApiException.unprocessable(MediaUploadInspector.TEXTO_MALFORMADO, "O conteúdo do arquivo não corresponde ao formato declarado.",
                Map.of("reason", reason));
    }
}
