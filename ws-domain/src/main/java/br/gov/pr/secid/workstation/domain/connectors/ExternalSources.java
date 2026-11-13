package br.gov.pr.secid.workstation.domain.connectors;

import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Collections;
import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Regras puras das fontes externas (pesquisa de 09/11/2026: {@code contracts/connectors/sources.json}): de que provedor é cada
 * {@link SourceKind}, o tipo de tarefa padrão de cada fonte, a classificação de itens do Google Drive e do OneDrive/SharePoint pelo MIME
 * e pela extensão, e a tabela de hosts aceitos na importação por link (o resto é recusado — o servidor nunca busca o endereço colado).
 */
public final class ExternalSources {

    static final String GOOGLE_APPS = "application/vnd.google-apps.";
    static final String GOOGLE_FOLDER = GOOGLE_APPS + "folder";

    private static final Map<SourceKind, TaskType> DEFAULT_TYPE = new EnumMap<>(SourceKind.class);
    private static final Map<SourceKind, String> APP_NAME = new EnumMap<>(SourceKind.class);

    /** Extensões que o Graph converte em PDF ({@code /content?format=pdf}); fora delas baixa-se o original. */
    static final Set<String> GRAPH_PDF_SOURCES = Set.of("csv", "doc", "docx", "docm", "dot", "dotx", "eml", "epub", "htm", "html", "md", "msg",
            "odp", "ods", "odt", "pps", "ppsx", "ppt", "pptx", "rtf", "tif", "tiff", "xls", "xlsm", "xlsx", "loop", "fluid", "whiteboard", "wbtx");

    private static final Set<String> WORD = Set.of("docx", "doc", "docm", "dot", "dotx", "dotm", "odt", "rtf");
    private static final Set<String> EXCEL = Set.of("xlsx", "xls", "xlsm", "xlsb", "xltx", "ods", "csv");
    private static final Set<String> POWERPOINT = Set.of("pptx", "ppt", "pptm", "pps", "ppsx", "pot", "potx", "odp");
    private static final Set<String> VISIO = Set.of("vsdx", "vsd", "vssx", "vstx", "vsdm");
    private static final Set<String> WHITEBOARD = Set.of("whiteboard", "wbtx");
    private static final Set<String> LOOP = Set.of("loop", "fluid", "page");
    private static final Set<String> ONENOTE = Set.of("one", "onetoc2", "onepkg");
    private static final Set<String> POWER_BI = Set.of("pbix", "pbip");
    private static final Set<String> CAD = Set.of("dwg", "dxf", "ifc", "rvt", "glb");
    private static final Set<String> SPREADSHEET = Set.of("xlsx", "xls", "xlsm", "xlsb", "xltx", "ods", "csv", "tsv", "numbers");
    private static final Set<String> PRESENTATION = Set.of("pptx", "ppt", "pptm", "pps", "ppsx", "pot", "potx", "odp", "key");
    private static final Set<String> ARCHIVE = Set.of("zip", "7z", "rar", "tar", "gz");
    private static final Set<String> MAP = Set.of("kml", "kmz", "gpx", "geojson", "shp");
    private static final Set<String> WEB = Set.of("htm", "html", "aspx");
    private static final Set<String> MAIL = Set.of("eml", "msg", "mbox");

    static {
        put(SourceKind.GOOGLE_DOCS, TaskType.DOCUMENTO, "Google Docs");
        put(SourceKind.GOOGLE_SHEETS, TaskType.PLANILHA, "Google Sheets");
        put(SourceKind.GOOGLE_SLIDES, TaskType.APRESENTACAO, "Google Slides");
        put(SourceKind.GOOGLE_FORMS, TaskType.FORMULARIO, "Google Forms");
        put(SourceKind.GOOGLE_DRAWINGS, TaskType.DIAGRAMA, "Google Drawings");
        put(SourceKind.GOOGLE_SITES, TaskType.PAGINA_WEB, "Google Sites");
        put(SourceKind.GOOGLE_DRIVE, TaskType.DOCUMENTO, "Google Drive");
        put(SourceKind.GOOGLE_KEEP, TaskType.NOTA, "Google Keep");
        put(SourceKind.GOOGLE_GMAIL, TaskType.EMAIL, "Gmail");
        put(SourceKind.GOOGLE_CALENDAR, TaskType.EVENTO_AGENDA, "Google Agenda");
        put(SourceKind.GOOGLE_TASKS, TaskType.LISTA_TAREFAS, "Google Tarefas");
        put(SourceKind.GOOGLE_MEET, TaskType.GRAVACAO_REUNIAO, "Google Meet");
        put(SourceKind.GOOGLE_CHAT, TaskType.MENSAGEM_CHAT, "Google Chat");
        put(SourceKind.GOOGLE_CLASSROOM, TaskType.ATIVIDADE_CURSO, "Google Classroom");
        put(SourceKind.GOOGLE_APPS_SCRIPT, TaskType.CODIGO, "Google Apps Script");
        put(SourceKind.GOOGLE_LOOKER_STUDIO, TaskType.PAINEL_DADOS, "Looker Studio");
        put(SourceKind.GOOGLE_YOUTUBE, TaskType.VIDEO, "YouTube");
        put(SourceKind.GOOGLE_PHOTOS, TaskType.IMAGEM_EDITADA, "Google Fotos");
        put(SourceKind.GOOGLE_VIDS, TaskType.VIDEO, "Google Vids");
        put(SourceKind.GOOGLE_NOTEBOOKLM, TaskType.DOCUMENTO, "NotebookLM");
        put(SourceKind.GOOGLE_MY_MAPS, TaskType.MAPA, "Google My Maps");
        put(SourceKind.MS_WORD, TaskType.DOCUMENTO, "Microsoft Word");
        put(SourceKind.MS_EXCEL, TaskType.PLANILHA, "Microsoft Excel");
        put(SourceKind.MS_POWERPOINT, TaskType.APRESENTACAO, "Microsoft PowerPoint");
        put(SourceKind.MS_ONENOTE, TaskType.NOTA, "Microsoft OneNote");
        put(SourceKind.MS_OUTLOOK_MAIL, TaskType.EMAIL, "Outlook");
        put(SourceKind.MS_OUTLOOK_CALENDAR, TaskType.EVENTO_AGENDA, "Calendário do Outlook");
        put(SourceKind.MS_TODO, TaskType.LISTA_TAREFAS, "Microsoft To Do");
        put(SourceKind.MS_PLANNER, TaskType.LISTA_TAREFAS, "Microsoft Planner");
        put(SourceKind.MS_TEAMS, TaskType.MENSAGEM_CHAT, "Microsoft Teams");
        put(SourceKind.MS_FORMS, TaskType.FORMULARIO, "Microsoft Forms");
        put(SourceKind.MS_VISIO, TaskType.DIAGRAMA, "Microsoft Visio");
        put(SourceKind.MS_WHITEBOARD, TaskType.QUADRO_BRANCO, "Microsoft Whiteboard");
        put(SourceKind.MS_LOOP, TaskType.DOCUMENTO, "Microsoft Loop");
        put(SourceKind.MS_SHAREPOINT_PAGE, TaskType.PAGINA_WEB, "SharePoint");
        put(SourceKind.MS_LISTS, TaskType.PLANILHA, "Microsoft Lists");
        put(SourceKind.MS_ONEDRIVE, TaskType.DOCUMENTO, "OneDrive");
        put(SourceKind.MS_STREAM, TaskType.VIDEO, "Microsoft Stream");
        put(SourceKind.MS_POWER_BI, TaskType.PAINEL_DADOS, "Power BI");
        put(SourceKind.MS_CLIPCHAMP, TaskType.VIDEO, "Clipchamp");
        put(SourceKind.MS_PROJECT, TaskType.CRONOGRAMA, "Microsoft Project");
        put(SourceKind.MS_STICKY_NOTES, TaskType.NOTA, "Sticky Notes");
        put(SourceKind.MS_ASSIGNMENTS, TaskType.ATIVIDADE_CURSO, "Teams Assignments");
        put(SourceKind.APPLE_PAGES, TaskType.DOCUMENTO, "Pages");
        put(SourceKind.APPLE_NUMBERS, TaskType.PLANILHA, "Numbers");
        put(SourceKind.APPLE_KEYNOTE, TaskType.APRESENTACAO, "Keynote");
        put(SourceKind.APPLE_NOTES, TaskType.NOTA, "Notas do iCloud");
        put(SourceKind.APPLE_REMINDERS, TaskType.LISTA_TAREFAS, "Lembretes");
        put(SourceKind.APPLE_CALENDAR, TaskType.EVENTO_AGENDA, "Calendário do iCloud");
        put(SourceKind.APPLE_MAIL, TaskType.EMAIL, "Mail do iCloud");
        put(SourceKind.APPLE_FREEFORM, TaskType.QUADRO_BRANCO, "Freeform");
        put(SourceKind.APPLE_IMOVIE, TaskType.VIDEO, "iMovie");
        put(SourceKind.APPLE_FINAL_CUT, TaskType.VIDEO, "Final Cut Pro");
        put(SourceKind.APPLE_ICLOUD_DRIVE, TaskType.DOCUMENTO, "iCloud Drive");
        put(SourceKind.APPLE_PHOTOS, TaskType.IMAGEM_EDITADA, "Fotos do iCloud");
        put(SourceKind.APPLE_GARAGEBAND, TaskType.AUDIO, "GarageBand");
        put(SourceKind.APPLE_LOGIC_PRO, TaskType.AUDIO, "Logic Pro");
        put(SourceKind.APPLE_VOICE_MEMOS, TaskType.AUDIO, "Gravador");
        // legado genérico (antes dos conectores) e o link comum
        put(SourceKind.GOOGLE, TaskType.DOCUMENTO, "Google");
        put(SourceKind.MICROSOFT, TaskType.DOCUMENTO, "Microsoft");
        put(SourceKind.LINK, TaskType.LINK, "Link");
    }

    private ExternalSources() {
    }

    private static void put(SourceKind kind, TaskType type, String app) {
        DEFAULT_TYPE.put(kind, type);
        APP_NAME.put(kind, app);
    }

    /** Fontes com tipo padrão (as de aplicativos externos, o legado GOOGLE/MICROSOFT e LINK). */
    public static Map<SourceKind, TaskType> defaultTypes() {
        return Collections.unmodifiableMap(DEFAULT_TYPE);
    }

    /** Tipo de tarefa padrão da fonte (tabela da pesquisa); vazio para fontes internas (MANUAL, COLAR, DECIA…). */
    public static Optional<TaskType> defaultTaskType(SourceKind kind) {
        return Optional.ofNullable(kind == null ? null : DEFAULT_TYPE.get(kind));
    }

    /** Nome do aplicativo (título padrão de um link importado). */
    public static Optional<String> appName(SourceKind kind) {
        return Optional.ofNullable(kind == null ? null : APP_NAME.get(kind));
    }

    /** Provedor da fonte: {@code GOOGLE*} → GOOGLE, {@code MS_*}/MICROSOFT → MICROSOFT, {@code APPLE_*} → APPLE_ICLOUD; o resto, vazio. */
    public static Optional<ConnectorProvider> providerOf(SourceKind kind) {
        if (kind == null) {
            return Optional.empty();
        }
        String n = kind.name();
        if (n.equals("GOOGLE") || n.startsWith("GOOGLE_")) {
            return Optional.of(ConnectorProvider.GOOGLE);
        }
        if (n.equals("MICROSOFT") || n.startsWith("MS_")) {
            return Optional.of(ConnectorProvider.MICROSOFT);
        }
        if (n.startsWith("APPLE_")) {
            return Optional.of(ConnectorProvider.APPLE_ICLOUD);
        }
        return Optional.empty();
    }

    /** Extensão em minúsculas (sem ponto) do nome, ou vazia; só letras e dígitos, até 10 caracteres. */
    public static String extension(String name) {
        if (name == null) {
            return "";
        }
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return "";
        }
        String ext = name.substring(dot + 1).toLowerCase(Locale.ROOT).strip();
        return ext.length() <= 10 && ext.chars().allMatch(Character::isLetterOrDigit) ? ext : "";
    }

    /**
     * Tipo de tarefa de um arquivo genérico (Drive, OneDrive, iCloud Drive) pelo MIME real e pela extensão: CAD → DESENHO_TECNICO;
     * imagem → IMAGEM_EDITADA; vídeo → VIDEO; áudio → AUDIO; planilha → PLANILHA; apresentação → APRESENTACAO; e-mail → EMAIL; agenda →
     * EVENTO_AGENDA; mapa → MAPA; página → PAGINA_WEB; compactado → PASTA; o resto (PDF, texto, Word…) → DOCUMENTO.
     */
    public static TaskType taskTypeForFile(String mimeType, String name) {
        String mime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT);
        String ext = extension(name);
        if (CAD.contains(ext)) {
            return TaskType.DESENHO_TECNICO;
        }
        if (mime.startsWith("image/")) {
            return TaskType.IMAGEM_EDITADA;
        }
        if (mime.startsWith("video/")) {
            return TaskType.VIDEO;
        }
        if (mime.startsWith("audio/")) {
            return TaskType.AUDIO;
        }
        if (SPREADSHEET.contains(ext) || mime.contains("spreadsheet") || mime.contains("ms-excel") || mime.equals("text/csv")) {
            return TaskType.PLANILHA;
        }
        if (PRESENTATION.contains(ext) || mime.contains("presentation") || mime.contains("powerpoint")) {
            return TaskType.APRESENTACAO;
        }
        if (MAIL.contains(ext) || mime.equals("message/rfc822")) {
            return TaskType.EMAIL;
        }
        if (ext.equals("ics") || mime.equals("text/calendar")) {
            return TaskType.EVENTO_AGENDA;
        }
        if (MAP.contains(ext)) {
            return TaskType.MAPA;
        }
        if (WEB.contains(ext) || mime.equals("text/html")) {
            return TaskType.PAGINA_WEB;
        }
        if (ARCHIVE.contains(ext) || mime.equals("application/zip")) {
            return TaskType.PASTA;
        }
        return TaskType.DOCUMENTO;
    }

    /**
     * Item do Google Drive pelo {@code mimeType}: os tipos nativos ({@code application/vnd.google-apps.*}) viram a fonte do aplicativo —
     * Docs, Sheets, Slides e Drawings saem em PDF pelo {@code files.export}; Forms, Sites, Apps Script, My Maps, Vids, Jamboard e atalhos
     * não exportam (só VINCULADO). Pasta → GOOGLE_DRIVE/PASTA. Arquivo comum → GOOGLE_DRIVE com o tipo pelo MIME e download do original.
     */
    public static SourceClassification classifyGoogle(String mimeType, String name) {
        String mime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT).strip();
        if (!mime.startsWith(GOOGLE_APPS)) {
            return new SourceClassification(SourceKind.GOOGLE_DRIVE, taskTypeForFile(mime, name), fileFormat(name), false, false, true);
        }
        return switch (mime.substring(GOOGLE_APPS.length())) {
            case "document" -> nativeGoogle(SourceKind.GOOGLE_DOCS, TaskType.DOCUMENTO, "gdoc", true);
            case "spreadsheet" -> nativeGoogle(SourceKind.GOOGLE_SHEETS, TaskType.PLANILHA, "gsheet", true);
            case "presentation" -> nativeGoogle(SourceKind.GOOGLE_SLIDES, TaskType.APRESENTACAO, "gslides", true);
            case "drawing" -> nativeGoogle(SourceKind.GOOGLE_DRAWINGS, TaskType.DIAGRAMA, "gdraw", true);
            case "form" -> nativeGoogle(SourceKind.GOOGLE_FORMS, TaskType.FORMULARIO, "gform", false);
            case "site" -> nativeGoogle(SourceKind.GOOGLE_SITES, TaskType.PAGINA_WEB, "gsite", false);
            case "script", "script+json" -> nativeGoogle(SourceKind.GOOGLE_APPS_SCRIPT, TaskType.CODIGO, "gs", false);
            case "map" -> nativeGoogle(SourceKind.GOOGLE_MY_MAPS, TaskType.MAPA, "gmap", false);
            case "vid" -> nativeGoogle(SourceKind.GOOGLE_VIDS, TaskType.VIDEO, "gvid", false);
            case "jam" -> nativeGoogle(SourceKind.GOOGLE_DRIVE, TaskType.QUADRO_BRANCO, "gjam", false);
            case "folder" -> new SourceClassification(SourceKind.GOOGLE_DRIVE, TaskType.PASTA, null, true, false, false);
            case "shortcut" -> nativeGoogle(SourceKind.GOOGLE_DRIVE, TaskType.LINK, null, false);
            default -> nativeGoogle(SourceKind.GOOGLE_DRIVE, TaskType.DOCUMENTO, null, false);
        };
    }

    private static SourceClassification nativeGoogle(SourceKind kind, TaskType type, String format, boolean pdf) {
        return new SourceClassification(kind, type, format, false, pdf, false);
    }

    /**
     * Item do OneDrive/SharePoint (Graph {@code driveItem}): pasta → MS_ONEDRIVE/PASTA; caderno do OneNote ({@code package.type = oneNote})
     * → MS_ONENOTE/NOTA (só VINCULADO); pela extensão, o aplicativo do Microsoft 365 (Word, Excel, PowerPoint, Visio, Whiteboard, Loop,
     * OneNote, Power BI, Project, página do SharePoint); vídeo → MS_STREAM; o resto → MS_ONEDRIVE com o tipo pelo MIME. O Graph converte
     * em PDF as extensões de {@link #GRAPH_PDF_SOURCES} (o limite de tamanho da conversão é decidido na aplicação).
     */
    public static SourceClassification classifyMicrosoft(String name, String mimeType, boolean folder, String packageType) {
        if (folder) {
            return new SourceClassification(SourceKind.MS_ONEDRIVE, TaskType.PASTA, null, true, false, false);
        }
        if (packageType != null && packageType.equalsIgnoreCase("oneNote")) {
            return new SourceClassification(SourceKind.MS_ONENOTE, TaskType.NOTA, "onenote", false, false, false);
        }
        String ext = extension(name);
        String mime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT);
        boolean pdf = GRAPH_PDF_SOURCES.contains(ext);
        String format = fileFormat(name);
        SourceKind kind;
        TaskType type;
        if (WORD.contains(ext)) {
            kind = SourceKind.MS_WORD;
            type = TaskType.DOCUMENTO;
        } else if (EXCEL.contains(ext)) {
            kind = SourceKind.MS_EXCEL;
            type = TaskType.PLANILHA;
        } else if (POWERPOINT.contains(ext)) {
            kind = SourceKind.MS_POWERPOINT;
            type = TaskType.APRESENTACAO;
        } else if (VISIO.contains(ext)) {
            kind = SourceKind.MS_VISIO;
            type = TaskType.DIAGRAMA;
        } else if (WHITEBOARD.contains(ext)) {
            kind = SourceKind.MS_WHITEBOARD;
            type = TaskType.QUADRO_BRANCO;
        } else if (LOOP.contains(ext)) {
            kind = SourceKind.MS_LOOP;
            type = TaskType.DOCUMENTO;
        } else if (ONENOTE.contains(ext)) {
            kind = SourceKind.MS_ONENOTE;
            type = TaskType.NOTA;
        } else if (POWER_BI.contains(ext)) {
            kind = SourceKind.MS_POWER_BI;
            type = TaskType.PAINEL_DADOS;
        } else if (ext.equals("mpp")) {
            kind = SourceKind.MS_PROJECT;
            type = TaskType.CRONOGRAMA;
        } else if (ext.equals("aspx")) {
            kind = SourceKind.MS_SHAREPOINT_PAGE;
            type = TaskType.PAGINA_WEB;
        } else if (mime.startsWith("video/")) {
            kind = SourceKind.MS_STREAM;
            type = TaskType.VIDEO;
        } else {
            kind = SourceKind.MS_ONEDRIVE;
            type = taskTypeForFile(mime, name);
        }
        return new SourceClassification(kind, type, format, false, pdf, true);
    }

    private static String fileFormat(String name) {
        String ext = extension(name);
        return ext.isEmpty() ? null : ext;
    }

    /**
     * Link colado → fonte, pela tabela do contrato dos conectores (só {@code https}, sem usuário/senha na URL, porta padrão):
     * {@code docs.google.com} ({@code /document}, {@code /spreadsheets}, {@code /presentation}, {@code /forms}, {@code /drawings}; aceita o
     * prefixo {@code /a/<domínio>} do Workspace), {@code drive.google.com}, {@code sites.google.com},
     * {@code onedrive.live.com}, {@code 1drv.ms}, {@code *.sharepoint.com} ({@code /SitePages/} → página) e {@code www.icloud.com}
     * ({@code /pages/}, {@code /numbers/}, {@code /keynote/}, {@code /iclouddrive/}, {@code /freeform/}, {@code /notes/}); {@code /SitePages/}
     * sem diferenciar maiúsculas. O tipo de tarefa é o padrão da fonte. O resto → vazio.
     */
    public static Optional<LinkTarget> classifyLink(String raw) {
        if (raw == null || raw.isBlank() || raw.length() > 2048) {
            return Optional.empty();
        }
        String url = raw.strip();
        URI u;
        try {
            u = new URI(url);
        } catch (URISyntaxException e) {
            return Optional.empty();
        }
        if (!"https".equalsIgnoreCase(u.getScheme()) || u.getHost() == null || u.getRawUserInfo() != null
                || (u.getPort() != -1 && u.getPort() != 443)) {
            return Optional.empty();
        }
        String host = u.getHost().toLowerCase(Locale.ROOT);
        String path = u.getPath() == null ? "" : u.getPath().toLowerCase(Locale.ROOT);
        SourceKind kind = switch (host) {
            case "docs.google.com" -> googleDocsPath(path);
            case "drive.google.com" -> SourceKind.GOOGLE_DRIVE;
            case "sites.google.com" -> SourceKind.GOOGLE_SITES;
            case "onedrive.live.com", "1drv.ms" -> SourceKind.MS_ONEDRIVE;
            case "www.icloud.com" -> icloudPath(path);
            default -> sharepoint(host, path);
        };
        if (kind == null) {
            return Optional.empty();
        }
        // tipo pela fonte (tabela da pesquisa, igual ao catálogo do front): o mesmo que a tela mostra antes de importar
        ConnectorProvider provider = providerOf(kind).orElseThrow();
        return Optional.of(new LinkTarget(provider, kind, DEFAULT_TYPE.get(kind), APP_NAME.get(kind), url));
    }

    private static SourceKind googleDocsPath(String path) {
        String p = path;
        if (p.startsWith("/a/")) {
            int next = p.indexOf('/', 3);
            p = next < 0 ? "" : p.substring(next);
        }
        if (segment(p, "/document")) {
            return SourceKind.GOOGLE_DOCS;
        }
        if (segment(p, "/spreadsheets")) {
            return SourceKind.GOOGLE_SHEETS;
        }
        if (segment(p, "/presentation")) {
            return SourceKind.GOOGLE_SLIDES;
        }
        if (segment(p, "/forms")) {
            return SourceKind.GOOGLE_FORMS;
        }
        if (segment(p, "/drawings")) {
            return SourceKind.GOOGLE_DRAWINGS;
        }
        return null;
    }

    private static SourceKind icloudPath(String path) {
        if (segment(path, "/pages")) {
            return SourceKind.APPLE_PAGES;
        }
        if (segment(path, "/numbers")) {
            return SourceKind.APPLE_NUMBERS;
        }
        if (segment(path, "/keynote")) {
            return SourceKind.APPLE_KEYNOTE;
        }
        if (segment(path, "/iclouddrive")) {
            return SourceKind.APPLE_ICLOUD_DRIVE;
        }
        if (segment(path, "/freeform")) {
            return SourceKind.APPLE_FREEFORM;
        }
        if (segment(path, "/notes")) {
            return SourceKind.APPLE_NOTES;
        }
        return null;
    }

    private static SourceKind sharepoint(String host, String path) {
        // *.sharepoint.com com ao menos um rótulo antes (contoso.sharepoint.com, contoso-my.sharepoint.com); nunca o domínio puro
        if (!host.endsWith(".sharepoint.com") || host.length() <= ".sharepoint.com".length()) {
            return null;
        }
        return path.contains("/sitepages/") ? SourceKind.MS_SHAREPOINT_PAGE : SourceKind.MS_ONEDRIVE;
    }

    /** O caminho é exatamente o segmento ou começa com ele seguido de barra ({@code /documentos} não casa com {@code /document}). */
    private static boolean segment(String path, String prefix) {
        return path.equals(prefix) || path.startsWith(prefix + "/");
    }
}
