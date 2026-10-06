package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;

import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Chave do objeto no storage (D-67): {@code <classe>/<dono>/<sha[0..2]>/<sha>.<ext>} — {@code restricted/} para conteúdo RESTRITO/SIGILOSO,
 * {@code private/} e {@code public/} para o resto. O nome enviado pelo cliente nunca entra na chave (sem path traversal); a política de
 * bucket/IAM pode negar {@code restricted/*} a qualquer leitor que não seja a API.
 */
public final class MediaKeys {
    public static final String RESTRICTED_PREFIX = "restricted/";
    /** Formato aceito pelos adaptadores — qualquer outra chave é recusada antes de tocar o disco/bucket. */
    public static final Pattern FORMAT = Pattern.compile("^(public|private|restricted)/[0-9a-f-]{36}/[0-9a-f]{2}/[0-9a-f]{64}\\.[a-z0-9]{1,5}$");

    private MediaKeys() {
    }

    public static String objectKey(UUID ownerId, MediaAccessClass cls, String sha256, DetectedType type) {
        Objects.requireNonNull(ownerId, "ownerId");
        String sha = sha256 == null ? "" : sha256.toLowerCase(Locale.ROOT);
        if (!sha.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("sha256 inválido");
        }
        String prefix = switch (cls == null ? MediaAccessClass.PRIVATE : cls) {
            case RESTRICTED -> RESTRICTED_PREFIX;
            case PUBLIC -> "public/";
            case PRIVATE -> "private/";
        };
        return prefix + ownerId + "/" + sha.substring(0, 2) + "/" + sha + "." + type.canonicalExtension();
    }

    public static boolean isRestricted(String key) {
        return key != null && key.startsWith(RESTRICTED_PREFIX);
    }

    public static boolean isValid(String key) {
        return key != null && FORMAT.matcher(key).matches();
    }
}
