package br.gov.pr.secid.workstation.application.media;

import java.util.List;
import java.util.Locale;

/**
 * Tipo REAL do binário, decidido por assinatura (magic bytes) e, nos formatos ZIP, pelo conteúdo do arquivo — nunca pela extensão nem
 * pelo {@code Content-Type} (D-67). Cada tipo traz o MIME canônico, as extensões aceitas para o nome declarado e a categoria que define
 * o limite de tamanho padrão.
 */
public enum DetectedType {
    PNG("image/png", Category.IMAGE, List.of("png")),
    JPEG("image/jpeg", Category.IMAGE, List.of("jpg", "jpeg", "jpe")),
    GIF("image/gif", Category.IMAGE, List.of("gif")),
    WEBP("image/webp", Category.IMAGE, List.of("webp")),
    PDF("application/pdf", Category.DOCUMENT, List.of("pdf")),
    DOCX("application/vnd.openxmlformats-officedocument.wordprocessingml.document", Category.OFFICE, List.of("docx")),
    XLSX("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Category.OFFICE, List.of("xlsx")),
    PPTX("application/vnd.openxmlformats-officedocument.presentationml.presentation", Category.OFFICE, List.of("pptx")),
    ZIP("application/zip", Category.ARCHIVE, List.of("zip")),
    /** AutoCAD DWG (RF34): {@code AC1012}…{@code AC1032}. */
    DWG("image/vnd.dwg", Category.CAD, List.of("dwg")),
    /** DXF ASCII (grupo 0 + SECTION) ou binário ({@code AutoCAD Binary DXF}). */
    DXF("image/vnd.dxf", Category.CAD, List.of("dxf")),
    /** IFC/STEP (ISO 10303-21). */
    IFC("application/x-step", Category.CAD, List.of("ifc")),
    /** glTF binário 2.0. */
    GLB("model/gltf-binary", Category.CAD, List.of("glb"));

    /** Categoria → limite padrão de tamanho e regras extras (pixels para imagem, zip-bomb para OFFICE/ARCHIVE). */
    public enum Category {
        IMAGE, DOCUMENT, OFFICE, ARCHIVE, CAD
    }

    private final String mime;
    private final Category category;
    private final List<String> extensions;

    DetectedType(String mime, Category category, List<String> extensions) {
        this.mime = mime;
        this.category = category;
        this.extensions = extensions;
    }

    public String mime() {
        return mime;
    }

    public Category category() {
        return category;
    }

    public List<String> extensions() {
        return extensions;
    }

    /** Extensão canônica (a primeira): o nome salvo sempre termina nela. */
    public String canonicalExtension() {
        return extensions.get(0);
    }

    public boolean isImage() {
        return category == Category.IMAGE;
    }

    /** Formatos que são um ZIP por dentro e passam pelo guarda de zip-bomb. */
    public boolean isZipBased() {
        return category == Category.OFFICE || category == Category.ARCHIVE;
    }

    public boolean acceptsExtension(String ext) {
        return ext != null && extensions.contains(ext.toLowerCase(Locale.ROOT));
    }

    /** O {@code Content-Type} declarado bate com o tipo real? Aliases históricos aceitos (image/jpg, image/pjpeg, x-zip). */
    public boolean acceptsDeclaredMime(String declared) {
        String d = declared.toLowerCase(Locale.ROOT).trim();
        int semi = d.indexOf(';');
        if (semi >= 0) {
            d = d.substring(0, semi).trim();
        }
        if (d.equals(mime)) {
            return true;
        }
        return switch (this) {
            case JPEG -> d.equals("image/jpg") || d.equals("image/pjpeg");
            case ZIP -> d.equals("application/x-zip-compressed") || d.equals("application/x-zip");
            case DWG -> d.equals("application/acad") || d.equals("application/x-dwg") || d.equals("image/x-dwg");
            case DXF -> d.equals("application/dxf") || d.equals("image/x-dxf") || d.equals("text/plain");
            case IFC -> d.equals("application/ifc") || d.equals("model/ifc") || d.equals("text/plain");
            default -> false;
        };
    }
}
