package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.domain.acervo.DeliveryFormats;
import br.gov.pr.secid.workstation.domain.acervo.FormatFamily;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** V71 — formato do anexo pelo tipo REAL (magic bytes) e detalhes extraídos com segurança; o que não dá para extrair fica de fora. */
class DetectedFormatTest {

    @Test
    void imagensTrazemLarguraEAlturaDoCabecalho() {
        DetectedFormat.Result png = DetectedFormat.of(DetectedType.PNG, Fixtures.png(640, 480));
        assertThat(png.family()).isEqualTo(FormatFamily.IMAGEM);
        assertThat(png.variant()).isEqualTo("PNG");
        assertThat(png.details()).containsEntry("width", "640").containsEntry("height", "480");
        assertThat(DetectedFormat.of(DetectedType.JPEG, Fixtures.jpeg(10, 20)).variant()).isEqualTo("JPG");
        // GIF não tem código no catálogo: família sem variante
        DetectedFormat.Result gif = DetectedFormat.of(DetectedType.GIF, Fixtures.gif(3, 4));
        assertThat(gif.family()).isEqualTo(FormatFamily.IMAGEM);
        assertThat(gif.variant()).isNull();
        assertThat(gif.details()).containsEntry("width", "3");
    }

    @Test
    void pdfContaPaginasCamadaDeTextoECifraSemInterpretarConteudo() {
        String pdf = "%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>"
                + " endobj\n3 0 obj << /Type /Page /Resources << /Font << /F1 6 0 R >> >> >> endobj\ntrailer << >>\n%%EOF\n";
        DetectedFormat.Result r = DetectedFormat.of(DetectedType.PDF, pdf.getBytes(StandardCharsets.ISO_8859_1));
        assertThat(r.family()).isEqualTo(FormatFamily.DOCUMENTO);
        assertThat(r.variant()).isEqualTo("PDF");
        assertThat(r.details()).containsEntry("pages", "3").containsEntry("textLayer", "true").containsEntry("encrypted", "false");

        String scan = "%PDF-1.4\n1 0 obj << /Type /Page /Resources << /XObject << /Im0 2 0 R >> >> >> endobj\n%%EOF\n";
        assertThat(DetectedFormat.of(DetectedType.PDF, scan.getBytes(StandardCharsets.ISO_8859_1)).details())
                .containsEntry("pages", "1").containsEntry("textLayer", "false");
        // sem árvore de páginas visível (object streams) e cifrado: páginas e camada de texto ficam de fora
        assertThat(DetectedFormat.of(DetectedType.PDF, "%PDF-1.7\n/ObjStm /Encrypt 9 0 R\n".getBytes(StandardCharsets.ISO_8859_1)).details())
                .doesNotContainKeys("pages", "textLayer").containsEntry("encrypted", "true");
    }

    @Test
    void officeEZipContamAbasSlidesEEntradasPelosNomes() {
        Map<String, byte[]> xlsx = new LinkedHashMap<>();
        xlsx.put("[Content_Types].xml", "<Types/>".getBytes(StandardCharsets.UTF_8));
        xlsx.put("xl/workbook.xml", "<workbook/>".getBytes(StandardCharsets.UTF_8));
        xlsx.put("xl/worksheets/sheet1.xml", "<x/>".getBytes(StandardCharsets.UTF_8));
        xlsx.put("xl/worksheets/sheet2.xml", "<x/>".getBytes(StandardCharsets.UTF_8));
        DetectedFormat.Result sheet = DetectedFormat.of(DetectedType.XLSX, Fixtures.zip(xlsx));
        assertThat(sheet.family()).isEqualTo(FormatFamily.PLANILHA);
        assertThat(sheet.details()).containsEntry("sheets", "2");
        assertThat(DetectedFormat.of(DetectedType.PPTX, Fixtures.office("ppt/slides/slide1.xml")).details()).containsEntry("slides", "1");
        assertThat(DetectedFormat.of(DetectedType.ZIP, Fixtures.zip(Map.of("a.txt", new byte[1], "b.txt", new byte[1]))).details())
                .containsEntry("entries", "2");
        assertThat(DetectedFormat.of(DetectedType.DOCX, Fixtures.docx()).variant()).isEqualTo("DOCX");
        // ZIP corrompido: nada extraído, nada lançado
        assertThat(DetectedFormat.of(DetectedType.ZIP, new byte[]{'P', 'K', 3, 4, 0}).details()).doesNotContainKey("entries");
    }

    @Test
    void cadTrazAVersaoDoDwgETodaVarianteExisteNoCatalogo() {
        assertThat(DetectedFormat.of(DetectedType.DWG, Fixtures.dwg()).details()).containsEntry("cadVersion", "AC1032");
        assertThat(DetectedFormat.of(DetectedType.IFC, Fixtures.ifc()).variant()).isEqualTo("IFC");
        for (DetectedType t : DetectedType.values()) {
            DetectedFormat.Result r = DetectedFormat.of(t, new byte[0]);
            if (r.variant() != null) {
                assertThat(DeliveryFormats.variant(r.family(), r.variant())).as(t.name()).isPresent();
            }
            assertThat(DeliveryFormats.DETECTED_KEYS).containsAll(r.details().keySet());
        }
        assertThat(DetectedFormat.ofStoredMime("application/pdf").variant()).isEqualTo("PDF");
        assertThat(DetectedFormat.ofStoredMime("text/html").family()).isEqualTo(FormatFamily.OUTRO);
    }
}
