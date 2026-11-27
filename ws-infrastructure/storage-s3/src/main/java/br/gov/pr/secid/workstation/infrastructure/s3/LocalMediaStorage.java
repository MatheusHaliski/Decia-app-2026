package br.gov.pr.secid.workstation.infrastructure.s3;

import br.gov.pr.secid.workstation.application.media.MediaKeys;
import br.gov.pr.secid.workstation.application.media.MediaStoragePort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * {@link MediaStoragePort} em disco ({@code ws.storage.type=local}, padrão; diretório {@code WS_STORAGE_LOCAL_DIR}). Hooks do Bloco 5
 * (D-67): só aceita chave no formato de {@link MediaKeys} (o nome enviado nunca vira caminho), resolve dentro do diretório-base e
 * confere que o caminho normalizado não escapou dele, grava em arquivo temporário + {@code move} atômico. Não emite URL assinada:
 * a leitura passa pelo backend depois do {@code ResourceAuthorizer}, em fluxo ({@link #open}). Em contêiner, o diretório precisa ser um
 * volume ({@code VOLUME /data/media} no Dockerfile.backend): sem ele os anexos somem a cada deploy.
 */
@Component
@ConditionalOnProperty(prefix = "ws.storage", name = "type", havingValue = "local", matchIfMissing = true)
public class LocalMediaStorage implements MediaStoragePort {
    private final Path base;

    public LocalMediaStorage(@Value("${ws.storage.local-dir:./data/media}") String dir) {
        this.base = Path.of(dir).toAbsolutePath().normalize();
    }

    Path resolve(String key) {
        if (!MediaKeys.isValid(key)) {
            throw new IllegalArgumentException("chave de mídia fora do formato");
        }
        Path p = base.resolve(key).normalize();
        if (!p.startsWith(base)) {
            throw new IllegalArgumentException("chave de mídia fora do diretório-base");
        }
        return p;
    }

    @Override
    public void put(String key, byte[] content, String mime) {
        Path target = resolve(key);
        Path parent = target.getParent();
        if (parent == null) {
            throw new IllegalArgumentException("chave de mídia sem diretório");
        }
        try {
            Files.createDirectories(parent);
            Path tmp = Files.createTempFile(parent, ".upload-", ".tmp");
            try {
                Files.write(tmp, content);
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(tmp);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("falha ao gravar mídia", e);
        }
    }

    @Override
    public byte[] read(String key) {
        try {
            return Files.readAllBytes(resolve(key));
        } catch (NoSuchFileException e) {
            throw new IllegalStateException("mídia ausente no storage", e);
        } catch (IOException e) {
            throw new UncheckedIOException("falha ao ler mídia", e);
        }
    }

    /** Fluxo direto do arquivo (download em streaming, sem carregar tudo na memória). */
    @Override
    public InputStream open(String key) {
        try {
            return Files.newInputStream(resolve(key));
        } catch (NoSuchFileException e) {
            throw new IllegalStateException("mídia ausente no storage", e);
        } catch (IOException e) {
            throw new UncheckedIOException("falha ao ler mídia", e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException e) {
            throw new UncheckedIOException("falha ao apagar mídia", e);
        }
    }
}
