package br.gov.pr.secid.workstation.application.media;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

/**
 * Armazenamento do binário (disco local por padrão, S3/MinIO com {@code ws.storage.type=s3}). A chave vem SEMPRE de {@link MediaKeys}
 * (nunca do nome enviado); o adaptador recusa chave fora do formato. URL assinada curta só depois da autorização (D-67).
 */
public interface MediaStoragePort {

    void put(String key, byte[] content, String mime);

    byte[] read(String key);

    void delete(String key);

    /** URL de leitura assinada e curta, se o adaptador suportar (S3 presign); vazio = servir pelo backend após autorizar. */
    default Optional<URI> signedReadUrl(String key, Duration ttl) {
        return Optional.empty();
    }
}
