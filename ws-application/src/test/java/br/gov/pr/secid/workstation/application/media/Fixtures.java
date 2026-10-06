package br.gov.pr.secid.workstation.application.media;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** Binários fabricados byte a byte para os testes de upload (cabeçalhos reais de cada formato, conteúdo mínimo). */
final class Fixtures {
    private Fixtures() {
    }

    static byte[] png(int w, int h) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A});
        be32(o, 13);
        o.writeBytes("IHDR".getBytes(StandardCharsets.US_ASCII));
        be32(o, w);
        be32(o, h);
        o.writeBytes(new byte[] {8, 6, 0, 0, 0});
        be32(o, 0);                                            // CRC (não conferido — só lemos o cabeçalho)
        o.writeBytes(new byte[64]);
        return o.toByteArray();
    }

    static byte[] jpeg(int w, int h) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xD8});
        o.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0, 1, 1, 0, 0, 1, 0, 1, 0, 0});
        o.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xFF});   // preenchimento antes do marcador
        o.writeBytes(new byte[] {(byte) 0xC0, 0x00, 0x11, 0x08});
        be16(o, h);
        be16(o, w);
        o.writeBytes(new byte[] {3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1});
        o.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xD9});
        return o.toByteArray();
    }

    static byte[] gif(int w, int h) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes("GIF89a".getBytes(StandardCharsets.US_ASCII));
        le16(o, w);
        le16(o, h);
        o.writeBytes(new byte[] {0, 0, 0, ';'});
        return o.toByteArray();
    }

    static byte[] webpVp8x(int w, int h) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes("RIFF".getBytes(StandardCharsets.US_ASCII));
        le32(o, 22);
        o.writeBytes("WEBPVP8X".getBytes(StandardCharsets.US_ASCII));
        le32(o, 10);
        o.writeBytes(new byte[] {0, 0, 0, 0});
        le24(o, w - 1);
        le24(o, h - 1);
        return o.toByteArray();
    }

    static byte[] webpVp8(int w, int h) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes("RIFF".getBytes(StandardCharsets.US_ASCII));
        le32(o, 30);
        o.writeBytes("WEBPVP8 ".getBytes(StandardCharsets.US_ASCII));
        le32(o, 18);
        o.writeBytes(new byte[] {0, 0, 0, (byte) 0x9D, 0x01, 0x2A});
        le16(o, w);
        le16(o, h);
        o.writeBytes(new byte[8]);
        return o.toByteArray();
    }

    static byte[] webpVp8l(int w, int h) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes("RIFF".getBytes(StandardCharsets.US_ASCII));
        le32(o, 30);
        o.writeBytes("WEBPVP8L".getBytes(StandardCharsets.US_ASCII));
        le32(o, 10);
        o.write(0x2F);
        int a = w - 1;
        int b = h - 1;
        long bits = (a & 0x3FFFL) | (b & 0x3FFFL) << 14;
        o.write((int) (bits & 0xFF));
        o.write((int) (bits >> 8 & 0xFF));
        o.write((int) (bits >> 16 & 0xFF));
        o.write((int) (bits >> 24 & 0xFF));
        o.writeBytes(new byte[8]);
        return o.toByteArray();
    }

    static byte[] pdf() {
        return "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer << >>\n%%EOF\n".getBytes(StandardCharsets.US_ASCII);
    }

    static byte[] dwg() {
        byte[] b = new byte[128];
        System.arraycopy("AC1032".getBytes(StandardCharsets.US_ASCII), 0, b, 0, 6);
        return b;
    }

    static byte[] dxf() {
        return "  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n  0\nEOF\n".getBytes(StandardCharsets.US_ASCII);
    }

    static byte[] ifc() {
        return "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition'),'2;1');\nENDSEC;\nEND-ISO-10303-21;\n".getBytes(StandardCharsets.US_ASCII);
    }

    static byte[] glb() {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes("glTF".getBytes(StandardCharsets.US_ASCII));
        le32(o, 2);
        le32(o, 12);
        return o.toByteArray();
    }

    static byte[] zip(Map<String, byte[]> entries) {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(bos)) {
            for (Map.Entry<String, byte[]> e : entries.entrySet()) {
                z.putNextEntry(new ZipEntry(e.getKey()));
                z.write(e.getValue());
                z.closeEntry();
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return bos.toByteArray();
    }

    static byte[] docx() {
        Map<String, byte[]> m = new LinkedHashMap<>();
        m.put("[Content_Types].xml", "<Types/>".getBytes(StandardCharsets.UTF_8));
        m.put("_rels/.rels", "<Relationships/>".getBytes(StandardCharsets.UTF_8));
        m.put("word/document.xml", "<w:document/>".getBytes(StandardCharsets.UTF_8));
        return zip(m);
    }

    static byte[] office(String mainPart) {
        Map<String, byte[]> m = new LinkedHashMap<>();
        m.put("[Content_Types].xml", "<Types/>".getBytes(StandardCharsets.UTF_8));
        m.put(mainPart, "<x/>".getBytes(StandardCharsets.UTF_8));
        return zip(m);
    }

    /** {@code mib} MiB de zeros num único item: comprime ~1000:1. */
    static byte[] zipBomb(int mib) {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(bos)) {
            z.putNextEntry(new ZipEntry("zeros.bin"));
            byte[] chunk = new byte[1 << 20];
            for (int i = 0; i < mib; i++) {
                z.write(chunk);
            }
            z.closeEntry();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return bos.toByteArray();
    }

    private static void be32(ByteArrayOutputStream o, int v) {
        o.write(v >>> 24 & 0xFF);
        o.write(v >>> 16 & 0xFF);
        o.write(v >>> 8 & 0xFF);
        o.write(v & 0xFF);
    }

    private static void be16(ByteArrayOutputStream o, int v) {
        o.write(v >>> 8 & 0xFF);
        o.write(v & 0xFF);
    }

    private static void le16(ByteArrayOutputStream o, int v) {
        o.write(v & 0xFF);
        o.write(v >>> 8 & 0xFF);
    }

    private static void le24(ByteArrayOutputStream o, int v) {
        o.write(v & 0xFF);
        o.write(v >>> 8 & 0xFF);
        o.write(v >>> 16 & 0xFF);
    }

    private static void le32(ByteArrayOutputStream o, int v) {
        le16(o, v & 0xFFFF);
        le16(o, v >>> 16 & 0xFFFF);
    }
}
