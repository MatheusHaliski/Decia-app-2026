package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.common.ApiException;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Guarda de zip-bomb e zip-slip para formatos que são ZIP por dentro (DOCX/XLSX/PPTX/ZIP — D-67). Lê TODO o conteúdo descompactado
 * contando bytes de verdade (os tamanhos do cabeçalho mentem numa bomba) e para no primeiro limite estourado:
 * <ul>
 *   <li>número de entradas ({@code maxEntries}), somando as dos ZIPs aninhados;</li>
 *   <li>total descompactado ({@code maxUncompressedBytes});</li>
 *   <li>razão total descompactado ÷ tamanho do arquivo ({@code maxRatio}) — só acima de 1 MiB, para não punir arquivo minúsculo;</li>
 *   <li>profundidade de ZIP dentro de ZIP ({@code maxDepth}; 1 = permite planilha embutida num DOCX, não permite ZIP dentro dela);</li>
 *   <li>nome de entrada com {@code ..}, absoluto, com {@code \} ou NUL (zip-slip) → recusado.</li>
 * </ul>
 * Também decide o subtipo Office pelo conteúdo ({@code [Content_Types].xml} + {@code word/}, {@code xl/}, {@code ppt/}).
 */
public final class ZipInspector {
    static final String CODE = "ARQUIVO_SUSPEITO";
    private static final long RATIO_FLOOR = 1L << 20;
    private static final byte[] ZIP_LOCAL = {'P', 'K', 0x03, 0x04};

    /** Limites do guarda. */
    public record Limits(int maxEntries, long maxUncompressedBytes, int maxRatio, int maxDepth) {
    }

    /** O que foi visto: subtipo, entradas e bytes descompactados (somando aninhados). */
    public record Report(DetectedType type, int entries, long uncompressedBytes) {
    }

    private ZipInspector() {
    }

    public static Report inspect(byte[] data, Limits limits) {
        Counter c = new Counter(limits, data.length);
        Set<String> rootNames = new HashSet<>();
        try {
            walk(new ByteArrayInputStream(data), 0, c, rootNames);
        } catch (IOException | IllegalArgumentException e) {
            throw suspicious("ZIP ilegível ou cifrado.", "zip_invalido");
        }
        if (c.entries == 0) {
            throw suspicious("ZIP vazio.", "zip_vazio");
        }
        return new Report(officeType(rootNames), c.entries, c.total);
    }

    private static void walk(InputStream in, int depth, Counter c, Set<String> names) throws IOException {
        try (ZipInputStream zip = new ZipInputStream(in)) {
            ZipEntry e;
            byte[] buf = new byte[8192];
            while ((e = zip.getNextEntry()) != null) {
                c.entry();
                String name = e.getName();
                checkName(name);
                if (names != null) {
                    names.add(name);
                }
                if (e.isDirectory()) {
                    continue;
                }
                ByteArrayOutputStream nested = null;
                int head = 0;
                byte[] first = new byte[4];
                int n;
                while ((n = zip.read(buf)) > 0) {
                    c.add(n);
                    if (head < 4) {
                        int copy = Math.min(4 - head, n);
                        System.arraycopy(buf, 0, first, head, copy);
                        head += copy;
                        if (head == 4 && MagicBytes.startsWith(first, 0, ZIP_LOCAL)) {
                            if (depth + 1 > c.limits.maxDepth()) {
                                throw suspicious("ZIP aninhado além do permitido.", "zip_aninhado");
                            }
                            nested = new ByteArrayOutputStream();
                        }
                    }
                    if (nested != null) {
                        nested.write(buf, 0, n);
                    }
                }
                if (nested != null) {
                    walk(new ByteArrayInputStream(nested.toByteArray()), depth + 1, c, null);
                }
            }
        }
    }

    static void checkName(String name) {
        if (name == null || name.isEmpty() || name.indexOf('\0') >= 0 || name.indexOf('\\') >= 0 || name.startsWith("/")
                || name.matches("^[A-Za-z]:.*")) {
            throw suspicious("Entrada de ZIP com caminho inválido.", "zip_slip");
        }
        for (String part : name.split("/")) {
            if (part.equals("..")) {
                throw suspicious("Entrada de ZIP com caminho inválido.", "zip_slip");
            }
        }
    }

    private static DetectedType officeType(Set<String> names) {
        if (!names.contains("[Content_Types].xml")) {
            return DetectedType.ZIP;
        }
        Set<String> lower = new HashSet<>();
        names.forEach(n -> lower.add(n.toLowerCase(Locale.ROOT)));
        if (lower.contains("word/document.xml")) {
            return DetectedType.DOCX;
        }
        if (lower.contains("xl/workbook.xml")) {
            return DetectedType.XLSX;
        }
        if (lower.contains("ppt/presentation.xml")) {
            return DetectedType.PPTX;
        }
        return DetectedType.ZIP;
    }

    static ApiException suspicious(String message, String reason) {
        return ApiException.unprocessable(CODE, message, Map.of("reason", reason));
    }

    /** Contadores compartilhados entre o ZIP e os aninhados. */
    private static final class Counter {
        final Limits limits;
        final long compressed;
        int entries;
        long total;

        Counter(Limits limits, long compressed) {
            this.limits = limits;
            this.compressed = Math.max(1, compressed);
        }

        void entry() {
            if (++entries > limits.maxEntries()) {
                throw suspicious("ZIP com entradas demais.", "zip_entradas");
            }
        }

        void add(int n) {
            total += n;
            if (total > limits.maxUncompressedBytes()) {
                throw suspicious("Conteúdo descompactado grande demais.", "zip_tamanho");
            }
            if (total > RATIO_FLOOR && total / compressed > limits.maxRatio()) {
                throw suspicious("Taxa de compressão suspeita (zip-bomb).", "zip_razao");
            }
        }
    }
}
