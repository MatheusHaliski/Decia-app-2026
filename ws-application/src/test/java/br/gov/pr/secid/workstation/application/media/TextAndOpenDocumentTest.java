package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.domain.acervo.DeliveryFormats;
import br.gov.pr.secid.workstation.domain.acervo.FormatFamily;
import org.junit.jupiter.api.Test;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/**
 * Variedade de arquivos: OpenDocument (ODT/ODS/ODP pela entrada {@code mimetype}) e textos (CSV, TSV, TXT, MD, JSON, XML) por heurística
 * segura — UTF-8 ou Windows-1252 sem NUL, JSON/XML bem formados, SVG/HTML fora — com os detalhes extraídos (abas, slides, páginas;
 * codificação, quebra de linha, delimitador, cabeçalho).
 */
class TextAndOpenDocumentTest {
    final MediaUploadInspector inspector = new MediaUploadInspector(MediaUploadProperties.defaults());

    private MediaUploadInspector.InspectedUpload ok(byte[] b, String name, String ct) {
        return inspector.inspect(new MediaUploadInspector.UploadCandidate(b, name, ct, null));
    }

    private ApiException fail(byte[] b, String name, String ct) {
        return catchThrowableOfType(ApiException.class, () -> ok(b, name, ct));
    }

    static byte[] odf(String mimetype, String contentXml, String metaXml) {
        Map<String, byte[]> e = new LinkedHashMap<>();
        e.put("mimetype", mimetype.getBytes(StandardCharsets.US_ASCII));
        e.put("META-INF/manifest.xml", "<manifest/>".getBytes(StandardCharsets.UTF_8));
        e.put("content.xml", contentXml.getBytes(StandardCharsets.UTF_8));
        if (metaXml != null) {
            e.put("meta.xml", metaXml.getBytes(StandardCharsets.UTF_8));
        }
        return Fixtures.zip(e);
    }

    private static byte[] utf8(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
    }

    // ------------------------------------------------------------------------------------------------ OpenDocument

    @Test
    void openDocumentPeloMimetypeComAbasSlidesEPaginas() {
        byte[] odt = odf("application/vnd.oasis.opendocument.text", "<office:document-content><office:body><office:text/></office:body>"
                + "</office:document-content>", "<office:meta><meta:document-statistic meta:page-count=\"7\" meta:word-count=\"900\"/></office:meta>");
        byte[] ods = odf("application/vnd.oasis.opendocument.spreadsheet", "<office:spreadsheet><table:table table:name=\"Custos\">"
                + "</table:table><table:table table:name=\"Prazos\"></table:table><table:table-column/></office:spreadsheet>", null);
        byte[] odp = odf("application/vnd.oasis.opendocument.presentation", "<office:presentation><draw:page draw:name=\"1\"/><draw:page "
                + "draw:name=\"2\"/><draw:page draw:name=\"3\"/><draw:page-thumbnail/></office:presentation>", null);

        assertThat(ok(odt, "relatorio.odt", "application/vnd.oasis.opendocument.text").type()).isEqualTo(DetectedType.ODT);
        assertThat(ok(ods, "planilha.ods", null).type()).isEqualTo(DetectedType.ODS);
        assertThat(ok(odp, "slides.odp", "application/octet-stream").type()).isEqualTo(DetectedType.ODP);

        assertThat(DetectedFormat.of(DetectedType.ODT, odt)).satisfies(r -> {
            assertThat(r.family()).isEqualTo(FormatFamily.DOCUMENTO);
            assertThat(r.variant()).isEqualTo("ODT");
            assertThat(r.details()).containsExactlyEntriesOf(Map.of("pages", "7"));
        });
        assertThat(DetectedFormat.of(DetectedType.ODS, ods).details()).as("table:table-column não é aba").containsEntry("sheets", "2");
        assertThat(DetectedFormat.of(DetectedType.ODS, ods).family()).isEqualTo(FormatFamily.PLANILHA);
        assertThat(DetectedFormat.of(DetectedType.ODP, odp).details()).as("draw:page-thumbnail não é slide").containsEntry("slides", "3");
        assertThat(DetectedFormat.of(DetectedType.ODP, odp).variant()).isEqualTo("ODP");
        assertThat(DetectedFormat.ofStoredMime("application/vnd.oasis.opendocument.spreadsheet").variant()).isEqualTo("ODS");
    }

    @Test
    void zipComMimetypeEstranhoOuSemContentXmlContinuaZipEExtensaoDivergenteERecusada() {
        byte[] template = odf("application/vnd.oasis.opendocument.text-template", "<x/>", null);
        assertThat(ok(template, "modelo.zip", null).type()).isEqualTo(DetectedType.ZIP);
        Map<String, byte[]> semContent = new LinkedHashMap<>();
        semContent.put("mimetype", utf8("application/vnd.oasis.opendocument.text"));
        assertThat(ok(Fixtures.zip(semContent), "x.zip", null).type()).isEqualTo(DetectedType.ZIP);
        // ODS chamado de .xlsx: o conteúdo manda
        byte[] ods = odf("application/vnd.oasis.opendocument.spreadsheet", "<table:table/>", null);
        assertThat(fail(ods, "planilha.xlsx", null).code()).isEqualTo(MediaUploadInspector.TIPO_DIVERGENTE);
        // mimetype fora da raiz não conta
        Map<String, byte[]> aninhado = new LinkedHashMap<>();
        aninhado.put("pasta/mimetype", utf8("application/vnd.oasis.opendocument.text"));
        aninhado.put("content.xml", utf8("<x/>"));
        assertThat(ok(Fixtures.zip(aninhado), "x.zip", null).type()).isEqualTo(DetectedType.ZIP);
    }

    // ------------------------------------------------------------------------------------------------ textos

    @Test
    void csvComPontoEVirgulaCrlfEWindows1252() {
        byte[] csv = "Município;Valor;Data\r\nCuritiba;1.234,56;2026-11-01\r\nLondrina;99,00;2026-11-02\r\n"
                .getBytes(Charset.forName("windows-1252"));
        MediaUploadInspector.InspectedUpload u = ok(csv, "custos.csv", "application/vnd.ms-excel");
        assertThat(u.type()).isEqualTo(DetectedType.CSV);
        assertThat(u.mime()).isEqualTo("text/csv");
        DetectedFormat.Result r = DetectedFormat.of(DetectedType.CSV, csv);
        assertThat(r.family()).isEqualTo(FormatFamily.PLANILHA);
        assertThat(r.variant()).isEqualTo("CSV");
        assertThat(r.details()).containsEntry("encoding", "WINDOWS1252").containsEntry("lineEnding", "CRLF").containsEntry("delimiter", "SEMICOLON")
                .containsEntry("columns", "3").containsEntry("headerRow", "true").containsEntry("lines", "3");
        assertThat(DeliveryFormats.DETECTED_KEYS).containsAll(r.details().keySet());
    }

    @Test
    void csvUtf8ComBomVirgulaEAspasSemCabecalho() {
        byte[] csv = utf8("﻿1,\"a, b\",3\n4,\"c \"\"d\"\"\",6\n");
        assertThat(ok(csv, "dados.csv", "text/csv; charset=utf-8").type()).isEqualTo(DetectedType.CSV);
        assertThat(DetectedFormat.of(DetectedType.CSV, csv).details()).containsEntry("encoding", "UTF8BOM").containsEntry("lineEnding", "LF")
                .containsEntry("delimiter", "COMMA").containsEntry("columns", "3").containsEntry("headerRow", "false");
        // colunas inconsistentes: é CSV (texto), mas sem delimitador afirmado
        byte[] torto = utf8("a,b\nc\nd,e,f\n");
        assertThat(ok(torto, "x.csv", null).type()).isEqualTo(DetectedType.CSV);
        assertThat(DetectedFormat.of(DetectedType.CSV, torto).details()).doesNotContainKeys("delimiter", "columns", "headerRow");
    }

    @Test
    void tsvTxtMdJsonXml() {
        byte[] tsv = utf8("nome\tidade\nAna\t30\n");
        assertThat(ok(tsv, "p.tsv", "text/tab-separated-values").type()).isEqualTo(DetectedType.TSV);
        assertThat(DetectedFormat.of(DetectedType.TSV, tsv).details()).containsEntry("delimiter", "TAB").containsEntry("headerRow", "true");

        byte[] txt = utf8("Ata da reunião\rlinha 2\nlinha 3");
        assertThat(ok(txt, "ata.txt", "text/plain").type()).isEqualTo(DetectedType.TXT);
        assertThat(DetectedFormat.of(DetectedType.TXT, txt)).satisfies(r -> {
            assertThat(r.family()).isEqualTo(FormatFamily.DOCUMENTO);
            assertThat(r.details()).containsEntry("lineEnding", "MIXED").containsEntry("encoding", "UTF8").containsEntry("lines", "3");
        });
        assertThat(ok(utf8("# Título\n\n- item\n"), "LEIAME.md", "text/markdown").type()).isEqualTo(DetectedType.MD);

        byte[] json = utf8("{\"obra\": \"Ponte\", \"itens\": [1, 2, {\"x\": null}]}");
        assertThat(ok(json, "dados.json", "application/json").type()).isEqualTo(DetectedType.JSON);
        assertThat(DetectedFormat.of(DetectedType.JSON, json).family()).isEqualTo(FormatFamily.DADOS);
        assertThat(DetectedFormat.of(DetectedType.JSON, json).details()).doesNotContainKey("lineEnding");

        byte[] xml = utf8("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<nfe><item valor=\"1&amp;2\">Cimento</item></nfe>\n");
        assertThat(ok(xml, "nota.xml", "text/xml").type()).isEqualTo(DetectedType.XML);
        assertThat(DetectedFormat.of(DetectedType.XML, xml).variant()).isEqualTo("XML");
    }

    @Test
    void jsonEXmlMalformadosDoctypeSvgEHtmlSaoRecusados() {
        assertThat(fail(utf8("{\"a\": 1,}"), "x.json", null).code()).isEqualTo(MediaUploadInspector.TEXTO_MALFORMADO);
        assertThat(fail(utf8("{\"a\": 1} {\"b\": 2}"), "x.json", null).details()).containsEntry("reason", "json_conteudo_extra");
        assertThat(fail(utf8("<a><b></a>"), "x.xml", null).code()).isEqualTo(MediaUploadInspector.TEXTO_MALFORMADO);
        // XXE / bomba de entidades: DOCTYPE recusado antes de qualquer expansão
        ApiException xxe = fail(utf8("<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY e SYSTEM \"file:///etc/passwd\">]><r>&e;</r>"), "x.xml", null);
        assertThat(xxe.code()).isEqualTo(MediaUploadInspector.TEXTO_MALFORMADO);
        // SVG e XHTML ficam de fora, pela extensão ou pela raiz
        assertThat(fail(utf8("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>"), "desenho.xml", null).status())
                .isEqualTo(415);
        assertThat(fail(utf8("<svg/>"), "desenho.svg", "image/svg+xml").code()).isEqualTo(MediaUploadInspector.TIPO_NAO_PERMITIDO);
        assertThat(fail(utf8("<html><body>oi</body></html>"), "pagina.xml", null).details()).containsEntry("detected", "HTML");
        assertThat(fail(utf8("<p>oi</p>"), "pagina.html", "text/html").code()).isEqualTo(MediaUploadInspector.TIPO_NAO_PERMITIDO);
        // texto com nome de outro tipo, ou script
        assertThat(fail(utf8("console.log(1)"), "app.js", null).code()).isEqualTo(MediaUploadInspector.TIPO_NAO_PERMITIDO);
    }

    @Test
    void binarioDisfarcadoDeTextoERecusado() {
        assertThat(fail(new byte[] {'a', 'b', 0, 'c'}, "x.txt", null).status()).isEqualTo(415);
        assertThat(fail(new byte[] {'a', 'b', 0x07, 'c', 'd'}, "x.csv", null).code()).as("controle C0").isEqualTo(MediaUploadInspector.TIPO_NAO_PERMITIDO);
        // não é UTF-8 e tem byte indefinido no Windows-1252
        assertThat(fail(new byte[] {'a', 'b', 'c', (byte) 0x81, 'd'}, "x.txt", null).code()).isEqualTo(MediaUploadInspector.TIPO_NAO_PERMITIDO);
        // começo de texto, binário depois do trecho sondado: o arquivo inteiro é conferido
        byte[] longo = new byte[10_000];
        java.util.Arrays.fill(longo, (byte) 'a');
        longo[9_000] = 0;
        assertThat(fail(longo, "x.txt", null).code()).isEqualTo(MediaUploadInspector.TIPO_NAO_PERMITIDO);
        assertThat(TextInspector.decode(new byte[0])).isEmpty();
        assertThat(TextInspector.lineEnding("sem quebra")).isNull();
        assertThat(TextInspector.split("a;\"b;c\";d", ';')).containsExactly("a", "b;c", "d");
        assertThat(TextInspector.looksLikeHeader(java.util.List.of("a", "A"))).as("repetido").isFalse();
    }
}
