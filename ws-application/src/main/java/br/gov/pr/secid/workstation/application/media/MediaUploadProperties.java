package br.gov.pr.secid.workstation.application.media;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;

/**
 * {@code ws.upload.*} (D-67; variáveis só por nome em {@code .env.example}): teto de pixels ({@code WS_UPLOAD_MAX_IMAGE_PIXELS}),
 * lado máximo ({@code WS_UPLOAD_MAX_IMAGE_SIDE}), guarda de ZIP ({@code WS_UPLOAD_ZIP_MAX_ENTRIES}, {@code WS_UPLOAD_ZIP_MAX_BYTES},
 * {@code WS_UPLOAD_ZIP_MAX_RATIO}, {@code WS_UPLOAD_ZIP_MAX_DEPTH}), antivírus obrigatório ({@code WS_UPLOAD_REQUIRE_ANTIVIRUS}) e TTL da
 * URL assinada de mídia restrita ({@code WS_MEDIA_SIGNED_URL_TTL_SECONDS}). Limite de tamanho por categoria ({@code max-bytes.IMAGE} …).
 */
@ConfigurationProperties(prefix = "ws.upload")
public record MediaUploadProperties(long maxImagePixels, int maxImageSide, int zipMaxEntries, long zipMaxBytes, int zipMaxRatio, int zipMaxDepth,
                                    boolean requireAntivirus, int signedUrlTtlSeconds, Map<String, Long> maxBytes) {
    static final long MIB = 1024L * 1024L;

    public MediaUploadProperties {
        maxImagePixels = maxImagePixels > 0 ? maxImagePixels : 40_000_000L;
        maxImageSide = maxImageSide > 0 ? maxImageSide : 16_384;
        zipMaxEntries = zipMaxEntries > 0 ? zipMaxEntries : 2_000;
        zipMaxBytes = zipMaxBytes > 0 ? zipMaxBytes : 200 * MIB;
        zipMaxRatio = zipMaxRatio > 0 ? zipMaxRatio : 100;
        zipMaxDepth = zipMaxDepth >= 0 ? zipMaxDepth : 1;
        signedUrlTtlSeconds = signedUrlTtlSeconds > 0 ? Math.min(signedUrlTtlSeconds, 900) : 60;
        maxBytes = maxBytes == null ? Map.of() : Map.copyOf(maxBytes);
    }

    public static MediaUploadProperties defaults() {
        return new MediaUploadProperties(0, 0, 0, 0, 0, -1, false, 0, Map.of());
    }

    /** Limite padrão por categoria; {@code ws.upload.max-bytes.<CATEGORIA>} sobrepõe (nunca acima de 1 GiB). */
    public long maxBytesFor(DetectedType type) {
        Map<DetectedType.Category, Long> defaults = new EnumMap<>(DetectedType.Category.class);
        defaults.put(DetectedType.Category.IMAGE, 15 * MIB);
        defaults.put(DetectedType.Category.DOCUMENT, 50 * MIB);
        defaults.put(DetectedType.Category.OFFICE, 50 * MIB);
        defaults.put(DetectedType.Category.ARCHIVE, 100 * MIB);
        defaults.put(DetectedType.Category.CAD, 200 * MIB);
        Long override = maxBytes.get(type.category().name());
        if (override == null) {
            override = maxBytes.get(type.category().name().toLowerCase(Locale.ROOT));
        }
        long v = override != null && override > 0 ? override : defaults.get(type.category());
        return Math.min(v, 1024 * MIB);
    }

    /** Maior limite entre as categorias — corte antes de detectar o tipo. */
    public long hardCap() {
        long max = 0;
        for (DetectedType t : DetectedType.values()) {
            max = Math.max(max, maxBytesFor(t));
        }
        return max;
    }

    public ZipInspector.Limits zipLimits() {
        return new ZipInspector.Limits(zipMaxEntries, zipMaxBytes, zipMaxRatio, zipMaxDepth);
    }
}
