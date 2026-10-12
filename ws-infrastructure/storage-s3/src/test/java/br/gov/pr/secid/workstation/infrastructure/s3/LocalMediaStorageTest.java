package br.gov.pr.secid.workstation.infrastructure.s3;

import br.gov.pr.secid.workstation.application.media.DetectedType;
import br.gov.pr.secid.workstation.application.media.MediaKeys;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** D-67: chave só no formato de MediaKeys, nada fora do diretório-base, gravação atômica, sem URL assinada no disco local. */
class LocalMediaStorageTest {

    @TempDir
    Path dir;

    @Test
    void gravaLeEApagaDentroDoDiretorioBase() throws Exception {
        LocalMediaStorage s = new LocalMediaStorage(dir.toString());
        String key = MediaKeys.objectKey(UUID.randomUUID(), MediaAccessClass.RESTRICTED, "a".repeat(64), DetectedType.PDF);
        s.put(key, new byte[] {1, 2, 3}, "application/pdf");
        assertThat(Files.exists(dir.resolve(key))).isTrue();
        assertThat(s.read(key)).containsExactly(1, 2, 3);
        s.put(key, new byte[] {9}, "application/pdf");
        assertThat(s.read(key)).containsExactly(9);
        try (var files = Files.list(dir.resolve(key).getParent())) {
            assertThat(files.map(p -> p.getFileName().toString())).as("sem temporário sobrando").allMatch(n -> !n.endsWith(".tmp"));
        }
        assertThat(s.signedReadUrl(key, Duration.ofSeconds(30))).isEmpty();
        s.delete(key);
        assertThat(Files.exists(dir.resolve(key))).isFalse();
        assertThatThrownBy(() -> s.read(key)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void chaveForaDoFormatoOuComTraversalERecusadaAntesDeTocarODisco() {
        LocalMediaStorage s = new LocalMediaStorage(dir.toString());
        for (String bad : new String[] {"../../etc/passwd", "restricted/../../x", "private/" + UUID.randomUUID() + "/aa/foto.png", "/abs/path", ""}) {
            assertThatThrownBy(() -> s.put(bad, new byte[] {1}, "image/png")).as(bad).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> s.read(bad)).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> s.delete(bad)).isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(dir.toFile().list()).isEmpty();
    }
}
