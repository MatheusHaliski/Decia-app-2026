package br.gov.pr.secid.workstation.domain.connectors;

import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** Regras das fontes externas: tabela fonte → tipo/provedor, classificação Drive/Graph e a tabela de hosts da importação por link. */
class ExternalSourcesTest {

    @Test
    void todaFonteDeAplicativoTemProvedorTipoENomeEContatoNaoExiste() {
        List<SourceKind> apps = Arrays.stream(SourceKind.values())
                .filter(k -> k.name().startsWith("GOOGLE_") || k.name().startsWith("MS_") || k.name().startsWith("APPLE_")).toList();
        assertThat(apps).hasSize(58);
        for (SourceKind k : apps) {
            assertThat(ExternalSources.defaultTaskType(k)).as(k.name()).isPresent();
            assertThat(ExternalSources.appName(k)).as(k.name()).isPresent();
            assertThat(ExternalSources.providerOf(k)).as(k.name()).isPresent();
            assertThat(k.name()).hasSizeLessThanOrEqualTo(20);
        }
        assertThat(Arrays.stream(SourceKind.values()).map(Enum::name)).doesNotContain("GOOGLE_CONTACTS", "MS_CONTACTS", "APPLE_CONTACTS");
        assertThat(ExternalSources.providerOf(SourceKind.MS_TEAMS)).contains(ConnectorProvider.MICROSOFT);
        assertThat(ExternalSources.providerOf(SourceKind.GOOGLE)).contains(ConnectorProvider.GOOGLE);
        assertThat(ExternalSources.providerOf(SourceKind.APPLE_NOTES)).contains(ConnectorProvider.APPLE_ICLOUD);
        assertThat(ExternalSources.providerOf(SourceKind.MANUAL)).isEmpty();
        assertThat(ExternalSources.defaultTaskType(SourceKind.COLAR)).isEmpty();
        assertThat(ExternalSources.defaultTaskType(null)).isEmpty();
    }

    @Test
    void tabelaDaPesquisaUsaOsTiposNovos() {
        assertThat(ExternalSources.defaultTaskType(SourceKind.GOOGLE_SLIDES)).contains(TaskType.APRESENTACAO);
        assertThat(ExternalSources.defaultTaskType(SourceKind.GOOGLE_DRAWINGS)).contains(TaskType.DIAGRAMA);
        assertThat(ExternalSources.defaultTaskType(SourceKind.MS_WHITEBOARD)).contains(TaskType.QUADRO_BRANCO);
        assertThat(ExternalSources.defaultTaskType(SourceKind.APPLE_NOTES)).contains(TaskType.NOTA);
        assertThat(ExternalSources.defaultTaskType(SourceKind.MS_OUTLOOK_CALENDAR)).contains(TaskType.EVENTO_AGENDA);
        assertThat(ExternalSources.defaultTaskType(SourceKind.MS_PLANNER)).contains(TaskType.LISTA_TAREFAS);
        assertThat(ExternalSources.defaultTaskType(SourceKind.GOOGLE_MEET)).contains(TaskType.GRAVACAO_REUNIAO);
        assertThat(ExternalSources.defaultTaskType(SourceKind.MS_TEAMS)).contains(TaskType.MENSAGEM_CHAT);
        assertThat(ExternalSources.defaultTaskType(SourceKind.MS_SHAREPOINT_PAGE)).contains(TaskType.PAGINA_WEB);
        assertThat(ExternalSources.defaultTaskType(SourceKind.GOOGLE_YOUTUBE)).contains(TaskType.VIDEO);
        assertThat(ExternalSources.defaultTaskType(SourceKind.APPLE_VOICE_MEMOS)).contains(TaskType.AUDIO);
        assertThat(ExternalSources.defaultTaskType(SourceKind.MS_POWER_BI)).contains(TaskType.PAINEL_DADOS);
        assertThat(ExternalSources.defaultTaskType(SourceKind.GOOGLE_APPS_SCRIPT)).contains(TaskType.CODIGO);
        assertThat(ExternalSources.defaultTaskType(SourceKind.GOOGLE_MY_MAPS)).contains(TaskType.MAPA);
        assertThat(ExternalSources.defaultTaskType(SourceKind.GOOGLE_CLASSROOM)).contains(TaskType.ATIVIDADE_CURSO);
        assertThat(ExternalSources.defaultTaskType(SourceKind.MS_PROJECT)).contains(TaskType.CRONOGRAMA);
        // os 16 tipos novos aparecem na tabela (nenhum ficou órfão)
        List<TaskType> novos = Arrays.asList(TaskType.values()).subList(15, TaskType.values().length);
        assertThat(novos).hasSize(16);
        assertThat(ExternalSources.defaultTypes().values()).containsAll(novos.stream().filter(t -> t != TaskType.TRANSCRICAO).toList());
    }

    @Test
    void driveNativosExportamEmPdfEOsDemaisSoVinculam() {
        SourceClassification doc = ExternalSources.classifyGoogle("application/vnd.google-apps.document", "Relatório");
        assertThat(doc).isEqualTo(new SourceClassification(SourceKind.GOOGLE_DOCS, TaskType.DOCUMENTO, "gdoc", false, true, false));
        assertThat(ExternalSources.classifyGoogle("application/vnd.google-apps.spreadsheet", "x").sourceKind()).isEqualTo(SourceKind.GOOGLE_SHEETS);
        assertThat(ExternalSources.classifyGoogle("application/vnd.google-apps.presentation", "x").taskType()).isEqualTo(TaskType.APRESENTACAO);
        assertThat(ExternalSources.classifyGoogle("application/vnd.google-apps.drawing", "x").pdfExport()).isTrue();
        SourceClassification form = ExternalSources.classifyGoogle("application/vnd.google-apps.form", "Pesquisa");
        assertThat(form.sourceKind()).isEqualTo(SourceKind.GOOGLE_FORMS);
        assertThat(form.pdfExport() || form.originalDownload()).isFalse();
        SourceClassification folder = ExternalSources.classifyGoogle("application/vnd.google-apps.folder", "Projeto");
        assertThat(folder.folder()).isTrue();
        assertThat(folder.taskType()).isEqualTo(TaskType.PASTA);
        assertThat(ExternalSources.classifyGoogle("application/vnd.google-apps.jam", "Quadro").taskType()).isEqualTo(TaskType.QUADRO_BRANCO);
        assertThat(ExternalSources.classifyGoogle("application/vnd.google-apps.script", "x").sourceKind()).isEqualTo(SourceKind.GOOGLE_APPS_SCRIPT);
        assertThat(ExternalSources.classifyGoogle("application/vnd.google-apps.unknown", "x").sourceKind()).isEqualTo(SourceKind.GOOGLE_DRIVE);
        SourceClassification pdf = ExternalSources.classifyGoogle("application/pdf", "Edital.PDF");
        assertThat(pdf).isEqualTo(new SourceClassification(SourceKind.GOOGLE_DRIVE, TaskType.DOCUMENTO, "pdf", false, false, true));
        assertThat(ExternalSources.classifyGoogle("video/mp4", "reuniao.mp4").taskType()).isEqualTo(TaskType.VIDEO);
        assertThat(ExternalSources.classifyGoogle("image/vnd.dwg", "planta.dwg").taskType()).isEqualTo(TaskType.DESENHO_TECNICO);
        assertThat(ExternalSources.classifyGoogle(null, null).sourceKind()).isEqualTo(SourceKind.GOOGLE_DRIVE);
    }

    @Test
    void graphPelaExtensaoEPacoteDoOneNote() {
        SourceClassification word = ExternalSources.classifyMicrosoft("Ofício.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                false, null);
        assertThat(word).isEqualTo(new SourceClassification(SourceKind.MS_WORD, TaskType.DOCUMENTO, "docx", false, true, true));
        assertThat(ExternalSources.classifyMicrosoft("Orçamento.xlsx", null, false, null).sourceKind()).isEqualTo(SourceKind.MS_EXCEL);
        assertThat(ExternalSources.classifyMicrosoft("Aula.pptx", null, false, null).taskType()).isEqualTo(TaskType.APRESENTACAO);
        assertThat(ExternalSources.classifyMicrosoft("Fluxo.vsdx", null, false, null).pdfExport()).isFalse();
        assertThat(ExternalSources.classifyMicrosoft("Ideias.whiteboard", null, false, null).taskType()).isEqualTo(TaskType.QUADRO_BRANCO);
        assertThat(ExternalSources.classifyMicrosoft("Painel.pbix", null, false, null).sourceKind()).isEqualTo(SourceKind.MS_POWER_BI);
        assertThat(ExternalSources.classifyMicrosoft("Obra.mpp", null, false, null).taskType()).isEqualTo(TaskType.CRONOGRAMA);
        assertThat(ExternalSources.classifyMicrosoft("Home.aspx", "text/html", false, null).sourceKind()).isEqualTo(SourceKind.MS_SHAREPOINT_PAGE);
        assertThat(ExternalSources.classifyMicrosoft("Gravação.mp4", "video/mp4", false, null).sourceKind()).isEqualTo(SourceKind.MS_STREAM);
        assertThat(ExternalSources.classifyMicrosoft("Componente.loop", null, false, null).sourceKind()).isEqualTo(SourceKind.MS_LOOP);
        SourceClassification notebook = ExternalSources.classifyMicrosoft("Caderno", null, false, "oneNote");
        assertThat(notebook.sourceKind()).isEqualTo(SourceKind.MS_ONENOTE);
        assertThat(notebook.originalDownload()).isFalse();
        assertThat(ExternalSources.classifyMicrosoft("Pasta", null, true, null).taskType()).isEqualTo(TaskType.PASTA);
        SourceClassification png = ExternalSources.classifyMicrosoft("foto.png", "image/png", false, null);
        assertThat(png.sourceKind()).isEqualTo(SourceKind.MS_ONEDRIVE);
        assertThat(png.taskType()).isEqualTo(TaskType.IMAGEM_EDITADA);
        assertThat(png.pdfExport()).isFalse();
        assertThat(ExternalSources.classifyMicrosoft("Ata.eml", "message/rfc822", false, null).taskType()).isEqualTo(TaskType.EMAIL);
    }

    @Test
    void tipoDeArquivoGenericoPeloMimeEExtensao() {
        assertThat(ExternalSources.taskTypeForFile("audio/mpeg", "a.mp3")).isEqualTo(TaskType.AUDIO);
        assertThat(ExternalSources.taskTypeForFile("text/csv", "dados.csv")).isEqualTo(TaskType.PLANILHA);
        assertThat(ExternalSources.taskTypeForFile("application/vnd.apple.keynote", "slides.key")).isEqualTo(TaskType.APRESENTACAO);
        assertThat(ExternalSources.taskTypeForFile("text/calendar", "evento.ics")).isEqualTo(TaskType.EVENTO_AGENDA);
        assertThat(ExternalSources.taskTypeForFile(null, "rota.kml")).isEqualTo(TaskType.MAPA);
        assertThat(ExternalSources.taskTypeForFile("text/html", "pagina.html")).isEqualTo(TaskType.PAGINA_WEB);
        assertThat(ExternalSources.taskTypeForFile("application/zip", "lote.zip")).isEqualTo(TaskType.PASTA);
        assertThat(ExternalSources.taskTypeForFile("application/pdf", "x.pdf")).isEqualTo(TaskType.DOCUMENTO);
        assertThat(ExternalSources.extension("sem-extensao")).isEmpty();
        assertThat(ExternalSources.extension("ponto.")).isEmpty();
        assertThat(ExternalSources.extension("estranho.a b")).isEmpty();
        assertThat(ExternalSources.extension(null)).isEmpty();
    }

    @Test
    void linksAceitosPelaTabelaDoContrato() {
        assertThat(kind("https://docs.google.com/document/d/1AbC/edit")).contains(SourceKind.GOOGLE_DOCS);
        assertThat(kind("https://docs.google.com/spreadsheets/d/1AbC/edit#gid=0")).contains(SourceKind.GOOGLE_SHEETS);
        assertThat(kind("https://docs.google.com/presentation/d/1AbC/edit")).contains(SourceKind.GOOGLE_SLIDES);
        assertThat(kind("https://docs.google.com/forms/d/e/1FAI/viewform")).contains(SourceKind.GOOGLE_FORMS);
        assertThat(kind("https://docs.google.com/drawings/d/1AbC/edit")).contains(SourceKind.GOOGLE_DRAWINGS);
        assertThat(kind("https://docs.google.com/a/pr.gov.br/document/d/1AbC/edit")).contains(SourceKind.GOOGLE_DOCS);
        assertThat(kind("https://drive.google.com/file/d/1AbC/view")).contains(SourceKind.GOOGLE_DRIVE);
        assertThat(kind("https://sites.google.com/view/intranet")).contains(SourceKind.GOOGLE_SITES);
        assertThat(kind("https://onedrive.live.com/redir?resid=ABC!123")).contains(SourceKind.MS_ONEDRIVE);
        assertThat(kind("https://1drv.ms/w/s!Abc")).contains(SourceKind.MS_ONEDRIVE);
        assertThat(kind("https://contoso.sharepoint.com/sites/obras/SitePages/Inicio.aspx")).contains(SourceKind.MS_SHAREPOINT_PAGE);
        assertThat(kind("https://contoso-my.sharepoint.com/:w:/g/personal/ana/EAbc")).contains(SourceKind.MS_ONEDRIVE);
        assertThat(kind("https://www.icloud.com/pages/0abcDEF#Relatorio")).contains(SourceKind.APPLE_PAGES);
        assertThat(kind("https://www.icloud.com/numbers/0abc")).contains(SourceKind.APPLE_NUMBERS);
        assertThat(kind("https://www.icloud.com/keynote/0abc")).contains(SourceKind.APPLE_KEYNOTE);
        assertThat(kind("https://www.icloud.com/iclouddrive/0abc#arquivo")).contains(SourceKind.APPLE_ICLOUD_DRIVE);
        assertThat(kind("https://www.icloud.com/freeform/0abc")).contains(SourceKind.APPLE_FREEFORM);
        assertThat(kind("https://www.icloud.com/notes/0abc")).contains(SourceKind.APPLE_NOTES);

        // tipo pela fonte, como no catálogo do front (pasta do Drive colada continua GOOGLE_DRIVE → DOCUMENTO)
        LinkTarget folder = ExternalSources.classifyLink("https://drive.google.com/drive/folders/1AbC").orElseThrow();
        assertThat(folder.taskType()).isEqualTo(TaskType.DOCUMENTO);
        assertThat(kind("https://contoso.sharepoint.com/sites/x/sitepages/home.aspx")).contains(SourceKind.MS_SHAREPOINT_PAGE);
        LinkTarget slides = ExternalSources.classifyLink("  https://docs.google.com/presentation/d/1/edit  ").orElseThrow();
        assertThat(slides.provider()).isEqualTo(ConnectorProvider.GOOGLE);
        assertThat(slides.taskType()).isEqualTo(TaskType.APRESENTACAO);
        assertThat(slides.appName()).isEqualTo("Google Slides");
        assertThat(slides.url()).isEqualTo("https://docs.google.com/presentation/d/1/edit");
        assertThat(ExternalSources.classifyLink("https://www.icloud.com/keynote/0abc").orElseThrow().provider())
                .isEqualTo(ConnectorProvider.APPLE_ICLOUD);
    }

    @Test
    void restoERecusado() {
        for (String bad : List.of("http://docs.google.com/document/d/1", "https://docs.google.com/spreadsheets-falso/d/1",
                "https://docs.google.com/", "https://evil.com/docs.google.com/document", "https://docs.google.com.evil.com/document/d/1",
                "https://sharepoint.com/sites/x", "https://contoso.sharepoint.com.evil.net/x", "https://www.icloud.com/mail/0abc",
                "https://icloud.com/pages/0abc", "https://user:senha@drive.google.com/file/d/1", "https://drive.google.com:8443/file/d/1",
                "javascript:alert(1)", "ftp://drive.google.com/x", "https://exemplo.gov.br/doc", "nao é url", "", "   ")) {
            assertThat(ExternalSources.classifyLink(bad)).as(bad).isEmpty();
        }
        assertThat(ExternalSources.classifyLink(null)).isEmpty();
        assertThat(ExternalSources.classifyLink("https://drive.google.com/" + "a".repeat(2100))).isEmpty();
    }

    private static Optional<SourceKind> kind(String url) {
        return ExternalSources.classifyLink(url).map(LinkTarget::sourceKind);
    }
}
