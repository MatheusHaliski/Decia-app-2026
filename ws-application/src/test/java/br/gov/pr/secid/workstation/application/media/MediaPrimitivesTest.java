package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** Peças do pipeline de upload isoladas: assinaturas, dimensões, ZIP, nomes e chaves. */
class MediaPrimitivesTest {
    static final ZipInspector.Limits LIMITS = new ZipInspector.Limits(100, 10L << 20, 100, 1);

    @Test
    void assinaturasDesconhecidasOuCurtasNaoViramTipo() {
        assertThat(MagicBytes.sniff(null)).isEmpty();
        assertThat(MagicBytes.sniff(new byte[] {1, 2})).isEmpty();
        assertThat(MagicBytes.sniff("hello world".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        assertThat(MagicBytes.sniff("glTF\u0001\u0000\u0000\u0000xxxx".getBytes(StandardCharsets.ISO_8859_1))).as("glTF 1.0 não").isEmpty();
        assertThat(MagicBytes.sniff("ACAD".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        assertThat(MagicBytes.sniff("\u00EF\u00BB\u00BFISO-10303-21;".getBytes(StandardCharsets.ISO_8859_1))).contains(DetectedType.IFC);
        assertThat(MagicBytes.sniff("999\nfeito no CAD\n0\nSECTION\n".getBytes(StandardCharsets.US_ASCII))).contains(DetectedType.DXF);
        assertThat(MagicBytes.sniff("AutoCAD Binary DXF\r\n\u001a\u0000rest".getBytes(StandardCharsets.ISO_8859_1))).contains(DetectedType.DXF);
        byte[] binaryWithText = "  0\nSECTION\n\u0000".getBytes(StandardCharsets.ISO_8859_1);
        assertThat(MagicBytes.sniff(binaryWithText)).as("texto com NUL não é DXF ASCII").isEmpty();
    }

    @Test
    void dimensoesDeCadaFormato() {
        assertThat(ImageDimensions.read(DetectedType.PNG, Fixtures.png(640, 480))).contains(new ImageDimensions.Size(640, 480));
        assertThat(ImageDimensions.read(DetectedType.JPEG, Fixtures.jpeg(1024, 768))).contains(new ImageDimensions.Size(1024, 768));
        assertThat(ImageDimensions.read(DetectedType.GIF, Fixtures.gif(32, 16))).contains(new ImageDimensions.Size(32, 16));
        assertThat(ImageDimensions.read(DetectedType.WEBP, Fixtures.webpVp8x(300, 200))).contains(new ImageDimensions.Size(300, 200));
        assertThat(ImageDimensions.read(DetectedType.WEBP, Fixtures.webpVp8(120, 90))).contains(new ImageDimensions.Size(120, 90));
        assertThat(ImageDimensions.read(DetectedType.WEBP, Fixtures.webpVp8l(77, 55))).contains(new ImageDimensions.Size(77, 55));
        assertThat(ImageDimensions.read(DetectedType.PDF, Fixtures.pdf())).isEmpty();
        assertThat(ImageDimensions.read(DetectedType.PNG, Fixtures.png(0, 10))).isEmpty();
        assertThat(ImageDimensions.read(DetectedType.JPEG, new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9})).isEmpty();
        assertThat(ImageDimensions.read(DetectedType.JPEG, new byte[] {(byte) 0xFF, (byte) 0xD8, 0x00, 0x00, 0, 0})).isEmpty();
        assertThat(ImageDimensions.read(DetectedType.GIF, new byte[] {'G', 'I', 'F'})).isEmpty();
        assertThat(ImageDimensions.read(DetectedType.WEBP, new byte[40])).isEmpty();
        assertThat(new ImageDimensions.Size(50_000, 50_000).pixels()).isEqualTo(2_500_000_000L);
    }

    @Test
    void zipSlipEZipVazioEIlegivelSaoRecusados() {
        for (String bad : new String[] {"../evil.sh", "a/../../b", "/etc/passwd", "C:/win.ini"}) {
            ApiException e = catchThrowableOfType(ApiException.class, () -> ZipInspector.inspect(Fixtures.zip(Map.of(bad, new byte[] {1})), LIMITS));
            assertThat(e).as(bad).isNotNull();
            assertThat(e.details()).containsEntry("reason", "zip_slip");
        }
        assertThatThrownBy(() -> ZipInspector.checkName("a\\b")).isInstanceOf(ApiException.class);
        assertThat(catchThrowableOfType(ApiException.class, () -> ZipInspector.inspect(Fixtures.zip(Map.of()), LIMITS)).details())
                .containsEntry("reason", "zip_vazio");
        byte[] truncated = new byte[] {'P', 'K', 3, 4, 20, 0, 0, 0, 99, 0};
        assertThat(catchThrowableOfType(ApiException.class, () -> ZipInspector.inspect(truncated, LIMITS)).details()).containsKey("reason");
    }

    @Test
    void zipComTotalDescompactadoAcimaDoTetoERecusadoMesmoSemRazaoAlta() {
        ZipInspector.Limits tiny = new ZipInspector.Limits(100, 1000, 1_000_000, 1);
        Map<String, byte[]> m = new LinkedHashMap<>();
        m.put("a", new byte[600]);
        m.put("b", new byte[600]);
        assertThat(catchThrowableOfType(ApiException.class, () -> ZipInspector.inspect(Fixtures.zip(m), tiny)).details())
                .containsEntry("reason", "zip_tamanho");
    }

    @Test
    void docxComPlanilhaEmbutidaPassaComProfundidadeUm() {
        Map<String, byte[]> m = new LinkedHashMap<>();
        m.put("[Content_Types].xml", "<Types/>".getBytes(StandardCharsets.UTF_8));
        m.put("word/document.xml", "<w/>".getBytes(StandardCharsets.UTF_8));
        m.put("word/embeddings/planilha.xlsx", Fixtures.office("xl/workbook.xml"));
        m.put("word/media/", new byte[0]);
        ZipInspector.Report r = ZipInspector.inspect(Fixtures.zip(m), LIMITS);
        assertThat(r.type()).isEqualTo(DetectedType.DOCX);
        assertThat(r.entries()).isGreaterThanOrEqualTo(6);
        assertThat(r.uncompressedBytes()).isPositive();
        assertThat(ZipInspector.inspect(Fixtures.office("ppt/other.xml"), LIMITS).type()).as("Content_Types sem parte conhecida").isEqualTo(DetectedType.ZIP);
        ZipInspector.Limits flat = new ZipInspector.Limits(100, 10L << 20, 100, 0);
        assertThat(catchThrowableOfType(ApiException.class, () -> ZipInspector.inspect(Fixtures.zip(m), flat)).details())
                .containsEntry("reason", "zip_aninhado");
    }

    @Test
    void nomesSaneados() {
        assertThat(FileNames.sanitize("../../x.png", DetectedType.PNG)).isEqualTo("x.png");
        assertThat(FileNames.sanitize("..\\..\\boot.ini", DetectedType.PDF)).isEqualTo("boot.pdf");
        assertThat(FileNames.sanitize(".htaccess", DetectedType.PDF)).isEqualTo("arquivo.pdf");
        assertThat(FileNames.sanitize("CON.png", DetectedType.PNG)).isEqualTo("CON_.png");
        assertThat(FileNames.sanitize(null, DetectedType.GIF)).isEqualTo("arquivo.gif");
        assertThat(FileNames.sanitize("a<b>c|d?.png", DetectedType.PNG)).isEqualTo("a_b_c_d_.png");
        assertThat(FileNames.sanitize("foto.php.png", DetectedType.PNG)).isEqualTo("foto.php.png");
        assertThat(FileNames.sanitize("planilha final...", DetectedType.XLSX)).isEqualTo("planilha final.xlsx");
        String longName = "x".repeat(300) + ".pdf";
        assertThat(FileNames.sanitize(longName, DetectedType.PDF)).hasSize(FileNames.MAX).endsWith(".pdf");
        assertThat(FileNames.sanitize("Ação\u0301.pdf", DetectedType.PDF)).isEqualTo("Ação\u0301.pdf".replace("o\u0301", "ó"));
        assertThat(FileNames.extension("a.TAR.GZ")).isEqualTo("gz");
        assertThat(FileNames.extension("semextensao")).isEmpty();
        assertThat(FileNames.extension("ponto.")).isEmpty();
        assertThat(FileNames.extension(null)).isEmpty();
    }

    @Test
    void chavesRestritasEFormatoValidado() {
        UUID owner = UUID.randomUUID();
        String sha = "ab" + "0".repeat(62);
        String key = MediaKeys.objectKey(owner, MediaAccessClass.RESTRICTED, sha, DetectedType.PDF);
        assertThat(key).isEqualTo("restricted/" + owner + "/ab/" + sha + ".pdf");
        assertThat(MediaKeys.isRestricted(key)).isTrue();
        assertThat(MediaKeys.isValid(key)).isTrue();
        assertThat(MediaKeys.objectKey(owner, MediaAccessClass.PUBLIC, sha, DetectedType.PNG)).startsWith("public/");
        assertThat(MediaKeys.objectKey(owner, null, sha.toUpperCase(), DetectedType.JPEG)).startsWith("private/").endsWith(".jpg");
        assertThat(MediaKeys.isValid("restricted/../../etc/passwd")).isFalse();
        assertThat(MediaKeys.isValid(null)).isFalse();
        assertThat(MediaKeys.isRestricted(null)).isFalse();
        assertThatThrownBy(() -> MediaKeys.objectKey(owner, MediaAccessClass.PRIVATE, "../x", DetectedType.PNG))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aliasesDeContentType() {
        assertThat(DetectedType.DWG.acceptsDeclaredMime("image/x-dwg")).isTrue();
        assertThat(DetectedType.IFC.acceptsDeclaredMime("model/ifc")).isTrue();
        assertThat(DetectedType.ZIP.acceptsDeclaredMime("application/x-zip")).isTrue();
        assertThat(DetectedType.JPEG.acceptsDeclaredMime("image/pjpeg")).isTrue();
        assertThat(DetectedType.PNG.acceptsDeclaredMime("image/jpeg")).isFalse();
        assertThat(DetectedType.DOCX.isZipBased()).isTrue();
        assertThat(DetectedType.PDF.isZipBased()).isFalse();
        assertThat(DetectedType.PDF.acceptsExtension(null)).isFalse();
    }
}
