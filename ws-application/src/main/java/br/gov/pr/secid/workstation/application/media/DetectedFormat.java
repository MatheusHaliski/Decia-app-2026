package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.domain.acervo.FormatFamily;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Formato de entrega (família → variante, V71) de um binário a partir do tipo REAL detectado pelo pipeline ({@link DetectedType},
 * magic bytes — D-67): nunca pelo nome nem pelo {@code Content-Type} do cliente. Os detalhes são só o que dá para extrair com segurança e
 * barato, sem executar nada: largura × altura da imagem (cabeçalho), páginas, camada de texto e cifra do PDF (varredura dos dicionários,
 * sem interpretar conteúdo), abas da planilha e slides da apresentação (nomes das entradas do ZIP — o pipeline já passou o guarda de
 * zip-bomb), entradas do ZIP e versão do DWG (cabeçalho). O que não der para extrair fica de fora (nulo).
 */
public final class DetectedFormat {
    /** Teto de bytes varridos no PDF (o upload já é limitado a 15 MB). */
    static final int PDF_SCAN = 16 * 1024 * 1024;
    static final int MAX_ZIP_ENTRIES = 10_000;
    private static final Pattern PDF_PAGE = Pattern.compile("/Type\\s*/Page(?![a-zA-Z])");
    private static final Pattern PDF_COUNT = Pattern.compile("/Type\\s*/Pages\\b[^>]*?/Count\\s+(\\d{1,6})|/Count\\s+(\\d{1,6})[^>]*?/Type\\s*/Pages\\b");
    private static final Pattern SHEET = Pattern.compile("xl/worksheets/sheet\\d+\\.xml");
    private static final Pattern SLIDE = Pattern.compile("ppt/slides/slide\\d+\\.xml");
    private static final Pattern DWG_VERSION = Pattern.compile("AC10\\d\\d");

    /** Família e variante (códigos de {@code DeliveryFormats}); variante nula quando o catálogo não tem código para o tipo (GIF). */
    public record Result(FormatFamily family, String variant, Map<String, String> details) {
        public Result {
            details = details == null ? Map.of() : Map.copyOf(details);
        }
    }

    private DetectedFormat() {
    }

    public static Result of(DetectedType type, byte[] content) {
        if (type == null) {
            return new Result(FormatFamily.OUTRO, null, Map.of());
        }
        byte[] b = content == null ? new byte[0] : content;
        Map<String, String> d = new TreeMap<>();
        return switch (type) {
            case PNG -> image("PNG", type, b, d);
            case JPEG -> image("JPG", type, b, d);
            case WEBP -> image("WEBP", type, b, d);
            case GIF -> image(null, type, b, d);
            case PDF -> {
                pdf(b, d);
                yield new Result(FormatFamily.DOCUMENTO, "PDF", d);
            }
            case DOCX -> new Result(FormatFamily.DOCUMENTO, "DOCX", d);
            case XLSX -> {
                zipCount(b, SHEET, "sheets", d);
                yield new Result(FormatFamily.PLANILHA, "XLSX", d);
            }
            case PPTX -> {
                zipCount(b, SLIDE, "slides", d);
                yield new Result(FormatFamily.APRESENTACAO, "PPTX", d);
            }
            case ZIP -> {
                zipCount(b, null, "entries", d);
                yield new Result(FormatFamily.PACOTE, "ZIP", d);
            }
            case DWG -> {
                String head = new String(b, 0, Math.min(6, b.length), StandardCharsets.US_ASCII);
                if (DWG_VERSION.matcher(head).matches()) {
                    d.put("cadVersion", head);
                }
                yield new Result(FormatFamily.DESENHO_TECNICO, "DWG", d);
            }
            case DXF -> new Result(FormatFamily.DESENHO_TECNICO, "DXF", d);
            case IFC -> new Result(FormatFamily.DESENHO_TECNICO, "IFC", d);
            case GLB -> new Result(FormatFamily.DESENHO_TECNICO, "GLB", d);
        };
    }

    /**
     * Família e variante a partir do MIME canônico que o pipeline gravou na mídia (sempre o do tipo detectado, nunca o declarado), quando
     * os bytes já não estão à mão; sem detalhes.
     */
    public static Result ofStoredMime(String detectedMime) {
        for (DetectedType t : DetectedType.values()) {
            if (t.mime().equals(detectedMime)) {
                Result r = of(t, new byte[0]);
                return new Result(r.family(), r.variant(), Map.of());
            }
        }
        return new Result(FormatFamily.OUTRO, null, Map.of());
    }

    private static Result image(String variant, DetectedType type, byte[] b, Map<String, String> d) {
        ImageDimensions.read(type, b).ifPresent(s -> {
            d.put("width", Integer.toString(s.width()));
            d.put("height", Integer.toString(s.height()));
        });
        return new Result(FormatFamily.IMAGEM, variant, d);
    }

    /**
     * Varredura textual (ISO-8859-1, byte a byte) dos dicionários: {@code /Count} da árvore de páginas (ou, sem ele, os objetos
     * {@code /Type /Page}), {@code /Font} como sinal de camada de texto e {@code /Encrypt}. Em PDF com object streams comprimidos os
     * dicionários podem não estar visíveis: aí o campo fica de fora.
     */
    static void pdf(byte[] b, Map<String, String> d) {
        String s = new String(b, 0, Math.min(b.length, PDF_SCAN), StandardCharsets.ISO_8859_1);
        int count = -1;
        Matcher m = PDF_COUNT.matcher(s);
        while (m.find()) {
            String g = m.group(1) != null ? m.group(1) : m.group(2);
            count = Math.max(count, Integer.parseInt(g));
        }
        if (count <= 0) {
            int pages = 0;
            Matcher p = PDF_PAGE.matcher(s);
            while (p.find()) {
                pages++;
            }
            count = pages;
        }
        if (count > 0) {
            d.put("pages", Integer.toString(count));
        }
        boolean encrypted = s.contains("/Encrypt");
        d.put("encrypted", Boolean.toString(encrypted));
        if (s.contains("/Font")) {
            d.put("textLayer", "true");
        } else if (!encrypted && !s.contains("/ObjStm")) {
            d.put("textLayer", "false");
        }
    }

    /** Conta entradas do ZIP (todas, ou as que casam com {@code pattern}) só pelos nomes; conteúdo nunca é interpretado. */
    static void zipCount(byte[] b, Pattern pattern, String key, Map<String, String> d) {
        int n = 0;
        int seen = 0;
        try (ZipInputStream zin = new ZipInputStream(new ByteArrayInputStream(b))) {
            ZipEntry e;
            while ((e = zin.getNextEntry()) != null && seen++ < MAX_ZIP_ENTRIES) {
                if (!e.isDirectory() && (pattern == null || pattern.matcher(e.getName()).matches())) {
                    n++;
                }
            }
        } catch (IOException | IllegalArgumentException e) {
            return;
        }
        if (seen > 0) {
            d.put(key, Integer.toString(n));
        }
    }
}
