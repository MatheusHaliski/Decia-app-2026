package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.common.ApiException;
import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Pipeline de validação de upload (D-67), na ordem em que cada passo é mais barato que o seguinte:
 * <ol>
 *   <li>vazio → {@code 422 ARQUIVO_VAZIO}; maior que o maior limite → {@code 413 ARQUIVO_GRANDE_DEMAIS} (antes de olhar o conteúdo);</li>
 *   <li>tipo real por magic bytes ({@link MagicBytes}); desconhecido ou fora da lista aceita pelo caso de uso → {@code 415 TIPO_NAO_PERMITIDO};</li>
 *   <li>ZIP: guarda de zip-bomb/zip-slip e subtipo Office pelo conteúdo ({@link ZipInspector}) → {@code 422 ARQUIVO_SUSPEITO};</li>
 *   <li>limite por categoria → {@code 413};</li>
 *   <li>extensão do nome e {@code Content-Type} declarados precisam bater com o tipo real (PNG chamado de .jpg é recusado) →
 *       {@code 415 TIPO_DIVERGENTE};</li>
 *   <li>imagem: dimensões do cabeçalho, teto de pixels e de lado (bomba de descompressão) → {@code 422 IMAGEM_GRANDE_DEMAIS};
 *       cabeçalho ilegível → {@code 422 IMAGEM_INVALIDA};</li>
 *   <li>SHA-256 (dedupe) e nome saneado ({@link FileNames}) com a extensão canônica.</li>
 * </ol>
 */
@Component
public class MediaUploadInspector {
    public static final String VAZIO = "ARQUIVO_VAZIO";
    public static final String GRANDE = "ARQUIVO_GRANDE_DEMAIS";
    public static final String TIPO_NAO_PERMITIDO = "TIPO_NAO_PERMITIDO";
    public static final String TIPO_DIVERGENTE = "TIPO_DIVERGENTE";
    public static final String IMAGEM_GRANDE = "IMAGEM_GRANDE_DEMAIS";
    public static final String IMAGEM_INVALIDA = "IMAGEM_INVALIDA";
    public static final String SUSPEITO = ZipInspector.CODE;

    private final MediaUploadProperties props;

    public MediaUploadInspector(MediaUploadProperties props) {
        this.props = props == null ? MediaUploadProperties.defaults() : props;
    }

    /** O que chega do cliente: bytes, nome e Content-Type DECLARADOS (não confiáveis) e os tipos que o caso de uso aceita. */
    public record UploadCandidate(byte[] content, String declaredName, String declaredContentType, Set<DetectedType> accepted) {
        public UploadCandidate {
            accepted = accepted == null || accepted.isEmpty() ? Set.of(DetectedType.values()) : Set.copyOf(accepted);
        }
    }

    /** Resultado aprovado: tipo real, MIME canônico, tamanho, dimensões (imagem), SHA-256 e nome saneado. */
    public record InspectedUpload(DetectedType type, String mime, long sizeBytes, Integer width, Integer height, String sha256, String safeName) {
    }

    public InspectedUpload inspect(UploadCandidate c) {
        byte[] b = c.content();
        if (b == null || b.length == 0) {
            throw ApiException.unprocessable(VAZIO, "O arquivo está vazio.", Map.of());
        }
        if (b.length > props.hardCap()) {
            throw tooLarge(props.hardCap());
        }
        DetectedType sniffed = MagicBytes.sniff(b).orElseThrow(() -> unsupported("desconhecido", c.accepted()));
        final DetectedType type = sniffed == DetectedType.ZIP ? ZipInspector.inspect(b, props.zipLimits()).type() : sniffed;
        if (!c.accepted().contains(type)) {
            throw unsupported(type.name(), c.accepted());
        }
        long max = props.maxBytesFor(type);
        if (b.length > max) {
            throw tooLarge(max);
        }
        String ext = FileNames.extension(c.declaredName());
        if (!type.acceptsExtension(ext)) {
            throw divergent(type, "extensao", ext);
        }
        String declaredMime = c.declaredContentType();
        if (declaredMime != null && !declaredMime.isBlank() && !declaredMime.toLowerCase(Locale.ROOT).startsWith("application/octet-stream")
                && !type.acceptsDeclaredMime(declaredMime)) {
            throw divergent(type, "contentType", declaredMime);
        }
        Integer width = null;
        Integer height = null;
        if (type.isImage()) {
            ImageDimensions.Size size = ImageDimensions.read(type, b)
                    .orElseThrow(() -> ApiException.unprocessable(IMAGEM_INVALIDA, "Imagem com cabeçalho inválido.", Map.of("type", type.name())));
            if (size.pixels() > props.maxImagePixels() || size.width() > props.maxImageSide() || size.height() > props.maxImageSide()) {
                throw ApiException.unprocessable(IMAGEM_GRANDE, "Imagem com dimensões acima do permitido.", Map.of("width", size.width(),
                        "height", size.height(), "maxPixels", props.maxImagePixels(), "maxSide", props.maxImageSide()));
            }
            width = size.width();
            height = size.height();
        }
        return new InspectedUpload(type, type.mime(), b.length, width, height, sha256(b), FileNames.sanitize(c.declaredName(), type));
    }

    public static String sha256(byte[] b) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }

    private static ApiException tooLarge(long max) {
        return new ApiException(GRANDE, 413, "Arquivo acima do tamanho permitido.", Map.of("maxBytes", max));
    }

    private static ApiException unsupported(String detected, Set<DetectedType> accepted) {
        List<String> names = accepted.stream().map(Enum::name).sorted().toList();
        return new ApiException(TIPO_NAO_PERMITIDO, 415, "Tipo de arquivo não permitido.", Map.of("detected", detected, "accepted", names));
    }

    private static ApiException divergent(DetectedType type, String field, String declared) {
        return new ApiException(TIPO_DIVERGENTE, 415, "O conteúdo do arquivo não corresponde ao tipo declarado.",
                Map.of("detected", type.name(), "field", field, "declared", declared.length() > 60 ? declared.substring(0, 60) : declared));
    }
}
