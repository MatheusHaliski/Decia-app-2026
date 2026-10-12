package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.common.ApiException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** D-67: tipo real por magic bytes, limite por formato, teto de pixels, zip-bomb, nome saneado — com binários fabricados. */
class MediaUploadInspectorTest {
    final MediaUploadInspector inspector = new MediaUploadInspector(MediaUploadProperties.defaults());

    private MediaUploadInspector.InspectedUpload ok(byte[] b, String name, String ct) {
        return inspector.inspect(new MediaUploadInspector.UploadCandidate(b, name, ct, null));
    }

    private ApiException fail(byte[] b, String name, String ct) {
        return catchThrowableOfType(ApiException.class, () -> ok(b, name, ct));
    }

    @Test
    void cadaFormatoDoRf34EDetectadoPelaAssinatura() {
        assertThat(ok(Fixtures.png(10, 10), "a.png", "image/png").type()).isEqualTo(DetectedType.PNG);
        assertThat(ok(Fixtures.jpeg(10, 20), "a.jpeg", "image/jpg").type()).isEqualTo(DetectedType.JPEG);
        assertThat(ok(Fixtures.gif(3, 4), "a.gif", null).type()).isEqualTo(DetectedType.GIF);
        assertThat(ok(Fixtures.webpVp8x(5, 6), "a.webp", "image/webp").type()).isEqualTo(DetectedType.WEBP);
        assertThat(ok(Fixtures.pdf(), "a.pdf", "application/pdf; charset=binary").type()).isEqualTo(DetectedType.PDF);
        assertThat(ok(Fixtures.docx(), "a.docx", "application/octet-stream").type()).isEqualTo(DetectedType.DOCX);
        assertThat(ok(Fixtures.office("xl/workbook.xml"), "a.xlsx", null).type()).isEqualTo(DetectedType.XLSX);
        assertThat(ok(Fixtures.office("ppt/presentation.xml"), "a.pptx", null).type()).isEqualTo(DetectedType.PPTX);
        assertThat(ok(Fixtures.zip(Map.of("x.txt", new byte[] {1})), "a.zip", "application/x-zip-compressed").type()).isEqualTo(DetectedType.ZIP);
        assertThat(ok(Fixtures.dwg(), "planta.dwg", "application/acad").type()).isEqualTo(DetectedType.DWG);
        assertThat(ok(Fixtures.dxf(), "planta.dxf", "text/plain").type()).isEqualTo(DetectedType.DXF);
        assertThat(ok(Fixtures.ifc(), "modelo.ifc", null).type()).isEqualTo(DetectedType.IFC);
        assertThat(ok(Fixtures.glb(), "modelo.glb", "model/gltf-binary").type()).isEqualTo(DetectedType.GLB);
    }

    @Test
    void pngRenomeadoParaJpgERecusadoComTipoDivergente() {
        ApiException e = fail(Fixtures.png(10, 10), "foto.jpg", "image/jpeg");
        assertThat(e.status()).isEqualTo(415);
        assertThat(e.code()).isEqualTo(MediaUploadInspector.TIPO_DIVERGENTE);
        assertThat(e.details()).containsEntry("detected", "PNG").containsEntry("field", "extensao");
        // extensão certa, Content-Type mentiroso também é recusado
        assertThat(fail(Fixtures.png(10, 10), "foto.png", "image/jpeg").details()).containsEntry("field", "contentType");
        // docx que na verdade é um zip qualquer
        assertThat(fail(Fixtures.zip(Map.of("a", new byte[] {1})), "contrato.docx", null).code()).isEqualTo(MediaUploadInspector.TIPO_DIVERGENTE);
    }

    @Test
    void executavelOuTextoQualquerNaoEhAceitoMesmoComExtensaoDeImagem() {
        ApiException e = fail("MZ\u0090\u0000 este programa".getBytes(StandardCharsets.ISO_8859_1), "foto.png", "image/png");
        assertThat(e.status()).isEqualTo(415);
        assertThat(e.code()).isEqualTo(MediaUploadInspector.TIPO_NAO_PERMITIDO);
        assertThat(fail("<svg onload=alert(1)>".getBytes(StandardCharsets.UTF_8), "x.svg", "image/svg+xml").code())
                .isEqualTo(MediaUploadInspector.TIPO_NAO_PERMITIDO);
        assertThat(fail(new byte[0], "a.png", null).code()).isEqualTo(MediaUploadInspector.VAZIO);
        assertThat(fail(null, "a.png", null).code()).isEqualTo(MediaUploadInspector.VAZIO);
    }

    @Test
    void casoDeUsoRestringeOsTiposAceitos() {
        ApiException e = catchThrowableOfType(ApiException.class, () -> inspector.inspect(
                new MediaUploadInspector.UploadCandidate(Fixtures.pdf(), "a.pdf", null, Set.of(DetectedType.PNG, DetectedType.JPEG))));
        assertThat(e.status()).isEqualTo(415);
        assertThat(e.details()).containsEntry("detected", "PDF");
    }

    @Test
    void tetoDePixelsRecusaBombaDeDescompressaoAntesDeDecodificar() {
        ApiException e = fail(Fixtures.png(50_000, 50_000), "bomba.png", "image/png");
        assertThat(e.status()).isEqualTo(422);
        assertThat(e.code()).isEqualTo(MediaUploadInspector.IMAGEM_GRANDE);
        assertThat(fail(Fixtures.jpeg(20_000, 10), "tira.jpg", null).code()).as("lado máximo").isEqualTo(MediaUploadInspector.IMAGEM_GRANDE);
        assertThat(fail(Fixtures.gif(40_000, 40_000), "g.gif", null).code()).isEqualTo(MediaUploadInspector.IMAGEM_GRANDE);
        assertThat(fail(Fixtures.webpVp8x(16_384, 16_384), "w.webp", null).code()).isEqualTo(MediaUploadInspector.IMAGEM_GRANDE);
        MediaUploadInspector.InspectedUpload fine = ok(Fixtures.png(4000, 3000), "ok.png", null);
        assertThat(fine.width()).isEqualTo(4000);
        assertThat(fine.height()).isEqualTo(3000);
        byte[] broken = new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 'X', 'X', 'X', 'X'};
        assertThat(fail(broken, "x.png", null).code()).isEqualTo(MediaUploadInspector.IMAGEM_INVALIDA);
    }

    @Test
    void limitePorFormatoEConfiguravelPorCategoria() {
        MediaUploadInspector small = new MediaUploadInspector(new MediaUploadProperties(0, 0, 0, 0, 0, 1, false, 0, Map.of("DOCUMENT", 32L)));
        ApiException e = catchThrowableOfType(ApiException.class,
                () -> small.inspect(new MediaUploadInspector.UploadCandidate(Fixtures.pdf(), "a.pdf", null, null)));
        assertThat(e.status()).isEqualTo(413);
        assertThat(e.code()).isEqualTo(MediaUploadInspector.GRANDE);
        assertThat(e.details()).containsEntry("maxBytes", 32L);
        assertThat(small.inspect(new MediaUploadInspector.UploadCandidate(Fixtures.png(1, 1), "a.png", null, null)).type()).isEqualTo(DetectedType.PNG);
        MediaUploadProperties d = MediaUploadProperties.defaults();
        assertThat(d.maxBytesFor(DetectedType.PNG)).isEqualTo(15 * MediaUploadProperties.MIB);
        assertThat(d.maxBytesFor(DetectedType.DWG)).isEqualTo(200 * MediaUploadProperties.MIB);
        assertThat(d.hardCap()).isEqualTo(200 * MediaUploadProperties.MIB);
        assertThat(new MediaUploadProperties(0, 0, 0, 0, 0, 1, false, 0, Map.of("image", 5L)).maxBytesFor(DetectedType.GIF)).isEqualTo(5L);
        assertThat(new MediaUploadProperties(0, 0, 0, 0, 0, 1, false, 5000, null).signedUrlTtlSeconds()).as("TTL nunca passa de 15 min")
                .isEqualTo(900);
    }

    @Test
    void zipBombaEAninhadoSaoRecusados() {
        ApiException bomb = fail(Fixtures.zipBomb(20), "pacote.zip", null);
        assertThat(bomb.status()).isEqualTo(422);
        assertThat(bomb.code()).isEqualTo(MediaUploadInspector.SUSPEITO);
        assertThat(bomb.details()).containsEntry("reason", "zip_razao");

        byte[] inner = Fixtures.zip(Map.of("bomb.zip", Fixtures.zipBomb(1)));
        byte[] nested = Fixtures.zip(Map.of("inner.zip", inner));
        assertThat(fail(nested, "pacote.zip", null).details()).as("ZIP dentro de ZIP dentro de ZIP").containsEntry("reason", "zip_aninhado");
    }

    @Test
    void nomeSalvoESaneadoEComExtensaoCanonica() {
        assertThat(ok(Fixtures.png(1, 1), "../../etc/passwd.png", null).safeName()).isEqualTo("passwd.png");
        assertThat(ok(Fixtures.jpeg(1, 1), "C:\\Users\\x\\foto.JPEG", null).safeName()).isEqualTo("foto.jpg");
        assertThat(ok(Fixtures.pdf(), "relatório\u0000\u202e.pdf", null).safeName()).isEqualTo("relatório.pdf");
        MediaUploadInspector.InspectedUpload u = ok(Fixtures.pdf(), "a.pdf", null);
        assertThat(u.sha256()).hasSize(64).isEqualTo(MediaUploadInspector.sha256(Fixtures.pdf()));
        assertThat(u.mime()).isEqualTo("application/pdf");
        assertThat(u.width()).isNull();
    }

    @Test
    void zipComMuitasEntradasERecusado() {
        Map<String, byte[]> many = new LinkedHashMap<>();
        for (int i = 0; i < 30; i++) {
            many.put("f" + i, new byte[] {1});
        }
        MediaUploadInspector strict = new MediaUploadInspector(new MediaUploadProperties(0, 0, 10, 0, 0, 1, false, 0, null));
        ApiException e = catchThrowableOfType(ApiException.class,
                () -> strict.inspect(new MediaUploadInspector.UploadCandidate(Fixtures.zip(many), "a.zip", null, null)));
        assertThat(e.details()).containsEntry("reason", "zip_entradas");
    }
}
