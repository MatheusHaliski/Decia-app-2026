package br.gov.pr.secid.workstation.application.media;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * RF41.CA06 (LGPD): a foto enviada perde EXIF/GPS, XMP, IPTC, comentário e imagens secundárias do MPF sem reprocessar os pixels; o tipo e
 * as dimensões continuam legíveis pelo inspetor. Estrutura irreconhecível volta como chegou.
 */
public class ImageMetadataTest {

    static void be16(ByteArrayOutputStream o, int v) {
        o.write((v >> 8) & 0xFF);
        o.write(v & 0xFF);
    }

    static void be32(ByteArrayOutputStream o, int v) {
        be16(o, (v >> 16) & 0xFFFF);
        be16(o, v & 0xFFFF);
    }

    static void le32(ByteArrayOutputStream o, int v) {
        o.write(v & 0xFF);
        o.write((v >> 8) & 0xFF);
        o.write((v >> 16) & 0xFF);
        o.write((v >> 24) & 0xFF);
    }

    static void segment(ByteArrayOutputStream o, int marker, byte[] payload) {
        o.write(0xFF);
        o.write(marker);
        be16(o, payload.length + 2);
        o.writeBytes(payload);
    }

    static byte[] ascii(String s) {
        return s.getBytes(StandardCharsets.ISO_8859_1);
    }

    /** JPEG com APP1 (EXIF com GPS), XMP, ICC, MPF, comentário, dados entrópicos com FF00/RST e uma imagem secundária depois do EOI. */
    public static byte[] jpegWithGps(int w, int h, int seed) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xD8});
        segment(o, 0xE0, new byte[] {'J', 'F', 'I', 'F', 0, 1, 1, 0, 0, 1, 0, 1, 0, 0});
        segment(o, 0xE1, ascii("Exif\0\0GPSLatitude=-25.4284;GPSLongitude=-49.2733"));
        segment(o, 0xE1, ascii("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>GPS</x:xmpmeta>"));
        segment(o, 0xE2, ascii("ICC_PROFILE\0\1\1perfil"));
        segment(o, 0xE2, ascii("MPF\0II*\0segunda-imagem"));
        segment(o, 0xED, ascii("Photoshop 3.0\08BIM"));
        segment(o, 0xFE, ascii("comentario do aparelho"));
        ByteArrayOutputStream sof = new ByteArrayOutputStream();
        sof.write(8);
        be16(sof, h);
        be16(sof, w);
        sof.writeBytes(new byte[] {3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1});
        segment(o, 0xC0, sof.toByteArray());
        segment(o, 0xDA, new byte[] {1, 1, 0, 0, 0x3F, 0});
        o.writeBytes(new byte[] {0x12, 0x34, (byte) 0xFF, 0x00, 0x56, (byte) 0xFF, (byte) 0xD0, 0x78, (byte) seed});
        o.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xD9});
        o.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xD8});
        segment(o, 0xE1, ascii("Exif\0\0GPS-da-imagem-secundaria"));
        o.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xD9});
        return o.toByteArray();
    }

    static void pngChunk(ByteArrayOutputStream o, String type, byte[] data) {
        be32(o, data.length);
        o.writeBytes(ascii(type));
        o.writeBytes(data);
        be32(o, 0);
    }

    /** PNG com IHDR, eXIf, tEXt, iTXt, IDAT (conteúdo variável) e IEND. */
    public static byte[] pngWithText(int w, int h, int seed) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A});
        ByteArrayOutputStream ihdr = new ByteArrayOutputStream();
        be32(ihdr, w);
        be32(ihdr, h);
        ihdr.writeBytes(new byte[] {8, 6, 0, 0, 0});
        pngChunk(o, "IHDR", ihdr.toByteArray());
        pngChunk(o, "eXIf", ascii("MM\0*GPS"));
        pngChunk(o, "tEXt", ascii("Location\0-25.4284,-49.2733"));
        pngChunk(o, "iTXt", ascii("XML:com.adobe.xmp\0\0\0\0\0GPS"));
        pngChunk(o, "IDAT", new byte[] {1, 2, 3, (byte) seed});
        pngChunk(o, "IEND", new byte[0]);
        o.writeBytes(ascii("lixo depois do IEND com GPS"));
        return o.toByteArray();
    }

    static void webpChunk(ByteArrayOutputStream o, String fourcc, byte[] data) {
        o.writeBytes(ascii(fourcc));
        le32(o, data.length);
        o.writeBytes(data);
        if ((data.length & 1) == 1) {
            o.write(0);
        }
    }

    static byte[] webpWithExif(int w, int h) {
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        byte[] vp8x = new byte[10];
        vp8x[0] = 0x0C;
        vp8x[4] = (byte) ((w - 1) & 0xFF);
        vp8x[5] = (byte) (((w - 1) >> 8) & 0xFF);
        vp8x[7] = (byte) ((h - 1) & 0xFF);
        vp8x[8] = (byte) (((h - 1) >> 8) & 0xFF);
        webpChunk(body, "VP8X", vp8x);
        webpChunk(body, "VP8L", new byte[] {0x2F, 0, 0, 0, 0, 1, 2, 3, 4, 5});
        webpChunk(body, "EXIF", ascii("GPS-1"));
        webpChunk(body, "XMP ", ascii("<GPS/>"));
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes(ascii("RIFF"));
        le32(o, 4 + body.size());
        o.writeBytes(ascii("WEBP"));
        o.writeBytes(body.toByteArray());
        return o.toByteArray();
    }

    static String text(byte[] b) {
        return new String(b, StandardCharsets.ISO_8859_1);
    }

    @Test
    void jpegPerdeExifXmpIptcComentarioEImagemSecundariaMasMantemPixelsEDimensoes() {
        byte[] in = jpegWithGps(640, 480, 7);
        byte[] out = ImageMetadata.strip(DetectedType.JPEG, in);
        assertThat(text(out)).doesNotContain("GPS").doesNotContain("Exif").doesNotContain("MPF").doesNotContain("comentario")
                .doesNotContain("Photoshop").contains("JFIF").contains("ICC_PROFILE");
        assertThat(out.length).isLessThan(in.length);
        assertThat(out[out.length - 2] & 0xFF).isEqualTo(0xFF);
        assertThat(out[out.length - 1] & 0xFF).isEqualTo(0xD9);
        // dados entrópicos (com FF00 e RST) copiados intactos
        assertThat(text(out)).contains(text(new byte[] {0x12, 0x34, (byte) 0xFF, 0x00, 0x56, (byte) 0xFF, (byte) 0xD0, 0x78, 7}));
        assertThat(ImageDimensions.read(DetectedType.JPEG, out)).isEqualTo(Optional.of(new ImageDimensions.Size(640, 480)));
        assertThat(new MediaUploadInspector(MediaUploadProperties.defaults())
                .inspect(new MediaUploadInspector.UploadCandidate(out, "foto.jpg", "image/jpeg", null)).type()).isEqualTo(DetectedType.JPEG);
    }

    @Test
    void pngPerdeChunksDeTextoEExifEOQueVemDepoisDoIend() {
        byte[] out = ImageMetadata.strip(DetectedType.PNG, pngWithText(32, 16, 1));
        assertThat(text(out)).doesNotContain("GPS").doesNotContain("Location").doesNotContain("eXIf").contains("IHDR").contains("IDAT")
                .endsWith("IEND\0\0\0\0");
        assertThat(ImageDimensions.read(DetectedType.PNG, out)).isEqualTo(Optional.of(new ImageDimensions.Size(32, 16)));
    }

    @Test
    void webpPerdeExifEXmpELimpaAsMarcasDoVp8x() {
        byte[] out = ImageMetadata.strip(DetectedType.WEBP, webpWithExif(100, 50));
        assertThat(text(out)).doesNotContain("GPS").doesNotContain("EXIF").doesNotContain("XMP").contains("VP8X").contains("VP8L");
        int riff = (out[4] & 0xFF) | (out[5] & 0xFF) << 8 | (out[6] & 0xFF) << 16 | (out[7] & 0xFF) << 24;
        assertThat(riff).isEqualTo(out.length - 8);
        assertThat(out[20] & 0x0C).isZero();
        assertThat(ImageDimensions.read(DetectedType.WEBP, out)).isEqualTo(Optional.of(new ImageDimensions.Size(100, 50)));
    }

    @Test
    void outrosTiposEEstruturaIrreconhecivelVoltamComoChegaram() {
        byte[] pdf = ascii("%PDF-1.7 GPS no texto do documento");
        assertThat(ImageMetadata.strip(DetectedType.PDF, pdf)).isSameAs(pdf);
        byte[] truncated = java.util.Arrays.copyOf(jpegWithGps(10, 10, 1), 30);
        assertThat(ImageMetadata.strip(DetectedType.JPEG, truncated)).isSameAs(truncated);
        byte[] notPng = ascii("nao e png");
        assertThat(ImageMetadata.strip(DetectedType.PNG, notPng)).isSameAs(notPng);
        assertThat(ImageMetadata.strip(null, pdf)).isSameAs(pdf);
    }
}
