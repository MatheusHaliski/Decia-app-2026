package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.media.CaptureMetadata.Capture;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector.UploadCandidate;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proveniência: os metadados de CAPTURA (data original, GPS, câmera) são lidos do EXIF real (TIFF) ANTES do strip, que continua apagando-os
 * do binário guardado; o hash do original difere do hash do guardado. EXIF malformado não derruba nada.
 */
public class CaptureMetadataTest {

    /** EXIF (TIFF) com Make/Model, DateTimeOriginal + OffsetTimeOriginal e GPS (25°25'42.24"S, 49°16'23.88"W). */
    public static byte[] tiff(boolean little) {
        ByteOrder order = little ? ByteOrder.LITTLE_ENDIAN : ByteOrder.BIG_ENDIAN;
        // layout: cabeçalho(8) | IFD0 (4 entradas) | EXIF IFD (2) | GPS IFD (4) | dados
        int ifd0 = 8;
        int ifd0Size = 2 + 4 * 12 + 4;
        int exif = ifd0 + ifd0Size;
        int exifSize = 2 + 2 * 12 + 4;
        int gps = exif + exifSize;
        int gpsSize = 2 + 4 * 12 + 4;
        int data = gps + gpsSize;
        ByteBuffer d = ByteBuffer.allocate(512).order(order);
        List<byte[]> blobs = new ArrayList<>();
        int[] cursor = {data};
        java.util.function.Function<byte[], Integer> put = bytes -> {
            int at = cursor[0];
            blobs.add(bytes);
            cursor[0] += bytes.length;
            return at;
        };
        byte[] make = "Fabricante\0".getBytes(StandardCharsets.US_ASCII);
        byte[] model = "Modelo X 12\0".getBytes(StandardCharsets.US_ASCII);
        byte[] date = "2026:11:12 13:15:30\0".getBytes(StandardCharsets.US_ASCII);
        byte[] offset = "-03:00\0".getBytes(StandardCharsets.US_ASCII);
        byte[] lat = rationals(order, 25, 1, 25, 1, 4224, 100);
        byte[] lon = rationals(order, 49, 1, 16, 1, 2388, 100);
        int makeAt = put.apply(make);
        int modelAt = put.apply(model);
        int dateAt = put.apply(date);
        int offsetAt = put.apply(offset);
        int latAt = put.apply(lat);
        int lonAt = put.apply(lon);

        d.put(little ? (byte) 'I' : (byte) 'M').put(little ? (byte) 'I' : (byte) 'M').putShort((short) 42).putInt(ifd0);
        d.putShort((short) 4);
        entry(d, 0x010F, 2, make.length, makeAt);
        entry(d, 0x0110, 2, model.length, modelAt);
        entry(d, 0x8769, 4, 1, exif);
        entry(d, 0x8825, 4, 1, gps);
        d.putInt(0);
        d.putShort((short) 2);
        entry(d, 0x9003, 2, date.length, dateAt);
        entry(d, 0x9011, 2, offset.length, offsetAt);
        d.putInt(0);
        d.putShort((short) 4);
        inlineAscii(d, 1, "S");
        entry(d, 2, 5, 3, latAt);
        inlineAscii(d, 3, "W");
        entry(d, 4, 5, 3, lonAt);
        d.putInt(0);
        for (byte[] b : blobs) {
            d.put(b);
        }
        return Arrays.copyOf(d.array(), d.position());
    }

    private static void entry(ByteBuffer d, int tag, int type, int count, int value) {
        d.putShort((short) tag).putShort((short) type).putInt(count).putInt(value);
    }

    private static void inlineAscii(ByteBuffer d, int tag, String v) {
        d.putShort((short) tag).putShort((short) 2).putInt(2);
        d.put(v.getBytes(StandardCharsets.US_ASCII)[0]).put((byte) 0).put((byte) 0).put((byte) 0);
    }

    private static byte[] rationals(ByteOrder order, int... v) {
        ByteBuffer b = ByteBuffer.allocate(v.length * 4).order(order);
        for (int x : v) {
            b.putInt(x);
        }
        return b.array();
    }

    /** JPEG mínimo (SOF 8×8) com APP1 Exif real. */
    public static byte[] jpegWithExif() {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xD8});
        byte[] tiff = tiff(true);
        byte[] app1 = new byte[6 + tiff.length];
        System.arraycopy("Exif\0\0".getBytes(StandardCharsets.ISO_8859_1), 0, app1, 0, 6);
        System.arraycopy(tiff, 0, app1, 6, tiff.length);
        ImageMetadataTest.segment(o, 0xE1, app1);
        ByteArrayOutputStream sof = new ByteArrayOutputStream();
        sof.write(8);
        ImageMetadataTest.be16(sof, 8);
        ImageMetadataTest.be16(sof, 8);
        sof.writeBytes(new byte[] {3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1});
        ImageMetadataTest.segment(o, 0xC0, sof.toByteArray());
        ImageMetadataTest.segment(o, 0xDA, new byte[] {1, 1, 0, 0, 0x3F, 0});
        o.writeBytes(new byte[] {0x12, 0x34, 0x56});
        o.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xD9});
        return o.toByteArray();
    }

    @Test
    void leDataGpsECameraDoExifNasDuasOrdensDeBytes() {
        for (boolean little : new boolean[] {true, false}) {
            Capture c = CaptureMetadata.parseTiff(tiff(little));
            assertThat(c).as(little ? "II" : "MM").isNotNull();
            assertThat(c.takenAt()).isEqualTo("2026-11-12T13:15:30-03:00");
            assertThat(c.latitude()).isEqualTo("-25.4284");
            assertThat(c.longitude()).isEqualTo("-49.2733");
            assertThat(c.cameraMake()).isEqualTo("Fabricante");
            assertThat(c.cameraModel()).isEqualTo("Modelo X 12");
        }
    }

    @Test
    void jpegComExifRealCapturaAntesDoStripEOHashDoOriginalDifere() {
        byte[] jpeg = jpegWithExif();
        assertThat(CaptureMetadata.read(DetectedType.JPEG, jpeg)).hasValueSatisfying(c -> assertThat(c.latitude()).isEqualTo("-25.4284"));

        PreparedUpload p = PreparedUpload.prepare(new MediaUploadInspector(MediaUploadProperties.defaults()),
                new UploadCandidate(jpeg, "obra.jpg", "image/jpeg", null));
        assertThat(p.capture()).isNotNull();
        assertThat(p.originalSha256()).isEqualTo(MediaUploadInspector.sha256(jpeg)).isNotEqualTo(p.sha256());
        assertThat(p.sha256()).isEqualTo(MediaUploadInspector.sha256(p.clean()));
        assertThat(CaptureMetadata.read(DetectedType.JPEG, p.clean())).as("o binário guardado não tem mais EXIF").isEmpty();
        assertThat(new String(p.clean(), StandardCharsets.ISO_8859_1)).doesNotContain("Fabricante");
        assertThat(p.format().variant()).isEqualTo("JPG");
        assertThat(p.format().details()).containsEntry("width", "8").containsEntry("height", "8");
        // JSON canônico (cifrado pelo adaptador) e leitura de volta
        String json = p.captureJson();
        assertThat(json).contains("\"latitude\":\"-25.4284\"").contains("\"cameraModel\":\"Modelo X 12\"");
        assertThat(PreparedUpload.readCapture(json)).isEqualTo(p.capture());
        assertThat(PreparedUpload.readCapture("{quebrado")).isNull();
        assertThat(PreparedUpload.readCapture(null)).isNull();
    }

    @Test
    void pngComChunkExifEArquivoSemExif() {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes(new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
        ByteArrayOutputStream ihdr = new ByteArrayOutputStream();
        ImageMetadataTest.be32(ihdr, 4);
        ImageMetadataTest.be32(ihdr, 4);
        ihdr.writeBytes(new byte[] {8, 2, 0, 0, 0});
        ImageMetadataTest.pngChunk(o, "IHDR", ihdr.toByteArray());
        ImageMetadataTest.pngChunk(o, "eXIf", tiff(false));
        ImageMetadataTest.pngChunk(o, "IEND", new byte[0]);
        assertThat(CaptureMetadata.read(DetectedType.PNG, o.toByteArray())).hasValueSatisfying(c -> assertThat(c.cameraMake()).isEqualTo("Fabricante"));

        assertThat(CaptureMetadata.read(DetectedType.PNG, Fixtures.png(4, 4))).isEmpty();
        assertThat(CaptureMetadata.read(DetectedType.PDF, "%PDF-1.7".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        // PDF passa pelo preparo sem strip: o hash do original é o do guardado
        PreparedUpload pdf = PreparedUpload.prepare(new MediaUploadInspector(MediaUploadProperties.defaults()),
                new UploadCandidate(Fixtures.pdf(), "laudo.pdf", "application/pdf", null));
        assertThat(pdf.originalSha256()).isEqualTo(pdf.sha256());
        assertThat(pdf.capture()).isNull();
        assertThat(pdf.captureJson()).isNull();
    }

    @Test
    void exifMalformadoNaoDerrubaNemInventaDados() {
        byte[] t = tiff(true);
        assertThat(CaptureMetadata.parseTiff(Arrays.copyOf(t, 20))).as("cortado").isNull();
        byte[] bad = t.clone();
        bad[2] = 0;   // não é 42
        assertThat(CaptureMetadata.parseTiff(bad)).isNull();
        assertThat(CaptureMetadata.read(DetectedType.JPEG, new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE1, 0x7F, 0x7F})).isEmpty();
        assertThat(CaptureMetadata.read(DetectedType.JPEG, null)).isEmpty();
        assertThat(CaptureMetadata.takenAt("0000:00:00 00:00:00", null)).isNull();
        assertThat(CaptureMetadata.takenAt("2026:11:12 13:15:30", "lixo")).isEqualTo("2026-11-12T13:15:30");
        assertThat(new Capture(null, null, null, null, null).isEmpty()).isTrue();
        assertThat(Capture.fromMap(Map.of("takenAt", "x")).takenAt()).isEqualTo("x");
    }
}
