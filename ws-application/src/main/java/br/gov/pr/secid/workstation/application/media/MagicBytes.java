package br.gov.pr.secid.workstation.application.media;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Detecção do tipo real pelas primeiras bytes (assinaturas públicas de cada formato), sem biblioteca externa (D-67). Formatos ZIP
 * (DOCX/XLSX/PPTX/ZIP) voltam como {@link DetectedType#ZIP}: o subtipo é decidido pelo {@link ZipInspector} olhando o conteúdo.
 */
public final class MagicBytes {
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] ZIP_LOCAL = {'P', 'K', 0x03, 0x04};
    private static final byte[] DXF_BINARY = "AutoCAD Binary DXF\r\n\u001a\u0000".getBytes(StandardCharsets.ISO_8859_1);
    private static final int TEXT_PROBE = 4096;

    private MagicBytes() {
    }

    public static Optional<DetectedType> sniff(byte[] b) {
        if (b == null || b.length < 4) {
            return Optional.empty();
        }
        if (startsWith(b, 0, PNG)) {
            return Optional.of(DetectedType.PNG);
        }
        if (u8(b, 0) == 0xFF && u8(b, 1) == 0xD8 && u8(b, 2) == 0xFF) {
            return Optional.of(DetectedType.JPEG);
        }
        if (ascii(b, 0, "GIF87a") || ascii(b, 0, "GIF89a")) {
            return Optional.of(DetectedType.GIF);
        }
        if (ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) {
            return Optional.of(DetectedType.WEBP);
        }
        if (ascii(b, 0, "%PDF-")) {
            return Optional.of(DetectedType.PDF);
        }
        if (startsWith(b, 0, ZIP_LOCAL)) {
            return Optional.of(DetectedType.ZIP);
        }
        if (isDwg(b)) {
            return Optional.of(DetectedType.DWG);
        }
        if (ascii(b, 0, "glTF") && b.length >= 12 && le32(b, 4) == 2) {
            return Optional.of(DetectedType.GLB);
        }
        if (startsWith(b, 0, DXF_BINARY)) {
            return Optional.of(DetectedType.DXF);
        }
        return sniffText(b);
    }

    /** DWG: {@code AC10} + dois dígitos (R13 = AC1012 … 2018+ = AC1032). */
    private static boolean isDwg(byte[] b) {
        return b.length >= 6 && ascii(b, 0, "AC10") && Character.isDigit(b[4]) && Character.isDigit(b[5]);
    }

    /** Formatos texto (DXF ASCII, IFC): só se o começo é texto puro (sem NUL), para não aceitar binário disfarçado. */
    private static Optional<DetectedType> sniffText(byte[] b) {
        int n = Math.min(b.length, TEXT_PROBE);
        for (int i = 0; i < n; i++) {
            if (b[i] == 0) {
                return Optional.empty();
            }
        }
        String head = new String(b, 0, n, StandardCharsets.ISO_8859_1);
        if (head.startsWith("ï»¿")) {
            head = head.substring(3);              // BOM UTF-8
        }
        String trimmed = head.stripLeading();
        if (trimmed.startsWith("ISO-10303-21;")) {
            return Optional.of(DetectedType.IFC);
        }
        // DXF ASCII: pares (código de grupo, valor) em linhas; começa por "0" / "SECTION" (ou comentário 999)
        String[] lines = trimmed.split("\r?\n", 4);
        if (lines.length >= 2 && lines[0].strip().equals("0") && lines[1].strip().equals("SECTION")) {
            return Optional.of(DetectedType.DXF);
        }
        if (lines.length >= 4 && lines[0].strip().equals("999") && lines[2].strip().equals("0") && lines[3].strip().startsWith("SECTION")) {
            return Optional.of(DetectedType.DXF);
        }
        return Optional.empty();
    }

    static boolean startsWith(byte[] b, int off, byte[] sig) {
        if (b.length < off + sig.length) {
            return false;
        }
        for (int i = 0; i < sig.length; i++) {
            if (b[off + i] != sig[i]) {
                return false;
            }
        }
        return true;
    }

    static boolean ascii(byte[] b, int off, String s) {
        return startsWith(b, off, s.getBytes(StandardCharsets.US_ASCII));
    }

    static int u8(byte[] b, int i) {
        return i < b.length ? b[i] & 0xFF : -1;
    }

    static long le32(byte[] b, int i) {
        return (b[i] & 0xFFL) | (b[i + 1] & 0xFFL) << 8 | (b[i + 2] & 0xFFL) << 16 | (b[i + 3] & 0xFFL) << 24;
    }
}
