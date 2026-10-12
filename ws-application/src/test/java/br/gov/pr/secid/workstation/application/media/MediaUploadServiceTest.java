package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScan;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.Mockito.mock;

/** Upload ponta a ponta com fakes: quarentena, dedupe por dono, prefixo restricted/, OwnMedia e URL assinada curta. */
class MediaUploadServiceTest {
    final Map<String, byte[]> blobs = new HashMap<>();
    final Map<UUID, MediaObject> rows = new HashMap<>();
    final Map<UUID, MediaScan> scans = new HashMap<>();
    final Viewer owner = Viewer.user(UUID.randomUUID());
    final Viewer stranger = Viewer.user(UUID.randomUUID());
    final Viewer admin = new Viewer(UUID.randomUUID(), Role.ADMIN, ProfileType.EMPREGADO, null, null, Map.of());
    final ResourceAuthorizer authorizer = new ResourceAuthorizer(mock(UserRepositoryPort.class), Optional.empty());

    final MediaStoragePort storage = new MediaStoragePort() {
        public void put(String key, byte[] content, String mime) {
            assertThat(MediaKeys.isValid(key)).as("chave sempre no formato").isTrue();
            blobs.put(key, content);
        }

        public byte[] read(String key) {
            return blobs.get(key);
        }

        public void delete(String key) {
            blobs.remove(key);
        }

        @Override
        public Optional<URI> signedReadUrl(String key, Duration ttl) {
            return Optional.of(URI.create("https://storage.local/" + key + "?ttl=" + ttl.toSeconds()));
        }
    };

    final MediaObjectRepositoryPort repo = new MediaObjectRepositoryPort() {
        public Optional<MediaObject> findById(UUID id) {
            return Optional.ofNullable(rows.get(id));
        }

        public Optional<MediaObject> findByOwnerAndSha256(UUID ownerId, String sha256) {
            return rows.values().stream().filter(m -> m.ownerId().equals(ownerId) && m.sha256().equals(sha256)).findFirst();
        }

        public MediaObject save(MediaObject media) {
            rows.put(media.id(), media);
            return media;
        }

        public Optional<MediaScan> findScan(UUID mediaId) {
            return Optional.ofNullable(scans.get(mediaId));
        }

        public MediaScan saveScan(MediaScan scan) {
            scans.put(scan.mediaId(), scan);
            return scan;
        }
    };

    MediaUploadService service(AntivirusPort av, boolean requireAv) {
        MediaUploadProperties props = new MediaUploadProperties(0, 0, 0, 0, 0, 1, requireAv, 30, null);
        return new MediaUploadService(new MediaUploadInspector(props), Optional.ofNullable(av), storage, repo, authorizer, props, null,
                Clock.systemUTC());
    }

    static MediaUploadInspector.UploadCandidate png(String name) {
        return new MediaUploadInspector.UploadCandidate(Fixtures.png(32, 32), name, "image/png", null);
    }

    @Test
    void sigilosoVaiParaRestrictedESoDonoOuAdminLeem() {
        MediaUploadService s = service(null, false);
        MediaUploadService.Stored st = s.upload(owner, png("planta.png"), AccessClassification.SIGILOSO, true);
        assertThat(st.media().objectKey()).startsWith("restricted/" + owner.userId() + "/");
        assertThat(st.media().accessClass()).isEqualTo(MediaAccessClass.RESTRICTED);
        assertThat(st.scanStatus()).isEqualTo(MediaScanStatus.NAO_VERIFICADO);
        assertThat(st.media().bucket()).isEqualTo("ws-media");

        MediaUploadService.ReadGrant g = s.authorizeRead(owner, st.media().id(), false);
        assertThat(g.signedUrl()).hasValueSatisfying(u -> assertThat(u.toString()).contains("ttl=30"));
        assertThat(s.read(g)).isEqualTo(Fixtures.png(32, 32));
        assertThat(s.authorizeRead(admin, st.media().id(), false).media().id()).isEqualTo(st.media().id());

        ApiException e = catchThrowableOfType(ApiException.class, () -> s.authorizeRead(stranger, st.media().id(), true));
        assertThat(e.status()).as("mesmo vendo o recurso-pai, RESTRICTED é só do dono").isEqualTo(404);
        ApiException missing = catchThrowableOfType(ApiException.class, () -> s.authorizeRead(stranger, UUID.randomUUID(), true));
        assertThat(missing.getMessage()).as("404 idêntico ao inexistente").isEqualTo(e.getMessage());
    }

    @Test
    void dedupePorDonoNaoReaproveitaArquivoDeOutraPessoa() {
        MediaUploadService s = service(null, false);
        MediaUploadService.Stored first = s.upload(owner, png("a.png"), AccessClassification.INTERNO, false);
        MediaUploadService.Stored again = s.upload(owner, png("b.png"), AccessClassification.INTERNO, false);
        assertThat(again.deduplicated()).isTrue();
        assertThat(again.media().id()).isEqualTo(first.media().id());
        assertThat(again.safeName()).isEqualTo("b.png");
        MediaUploadService.Stored other = s.upload(stranger, png("a.png"), AccessClassification.INTERNO, false);
        assertThat(other.deduplicated()).isFalse();
        assertThat(other.media().id()).isNotEqualTo(first.media().id());
        assertThat(rows).hasSize(2);
        assertThat(first.media().objectKey()).startsWith("private/");
        assertThat(s.authorizeRead(stranger, first.media().id(), true).media().id()).as("PRIVATE: quem vê o pai lê").isEqualTo(first.media().id());
    }

    @Test
    void infectadoNuncaEGravadoEPendenteFicaEmQuarentena() {
        MediaUploadService infected = service((c, t) -> AntivirusPort.Verdict.infected("clamav", "Eicar-Test-Signature"), false);
        ApiException e = catchThrowableOfType(ApiException.class, () -> infected.upload(owner, png("x.png"), AccessClassification.INTERNO, false));
        assertThat(e.code()).isEqualTo(MediaUploadService.INFECTADO);
        assertThat(blobs).isEmpty();
        assertThat(rows).isEmpty();

        MediaUploadService pending = service((c, t) -> new AntivirusPort.Verdict(MediaScanStatus.PENDENTE, "async", null), false);
        MediaUploadService.Stored st = pending.upload(owner, png("y.png"), AccessClassification.INTERNO, false);
        ApiException q = catchThrowableOfType(ApiException.class, () -> pending.authorizeRead(owner, st.media().id(), false));
        assertThat(q.status()).isEqualTo(423);
        assertThat(q.code()).isEqualTo(MediaUploadService.QUARENTENA);
        assertThat(scans.get(st.media().id()).scannedAt()).isNull();

        MediaUploadService clean = service((c, t) -> AntivirusPort.Verdict.clean("clamav"), true);
        MediaUploadService.Stored ok = clean.upload(owner, new MediaUploadInspector.UploadCandidate(Fixtures.pdf(), "a.pdf", null, null),
                AccessClassification.PUBLICO, true);
        assertThat(ok.media().accessClass()).isEqualTo(MediaAccessClass.PUBLIC);
        assertThat(scans.get(ok.media().id()).servable(true)).isTrue();
        assertThat(clean.authorizeRead(stranger, ok.media().id(), false).media().id()).isEqualTo(ok.media().id());
    }

    @Test
    void antivirusObrigatorioSemMotorNaoServeNada() {
        MediaUploadService s = service(null, true);
        MediaUploadService.Stored st = s.upload(owner, png("z.png"), AccessClassification.INTERNO, false);
        assertThat(catchThrowableOfType(ApiException.class, () -> s.authorizeRead(owner, st.media().id(), false)).status()).isEqualTo(423);
        assertThat(MediaScanStatus.NAO_VERIFICADO.servable(false)).isTrue();
        assertThat(MediaScanStatus.INFECTADO.servable(false)).isFalse();
        assertThat(AntivirusPort.NO_OP.scan(new byte[] {1}, DetectedType.PNG).status()).isEqualTo(MediaScanStatus.NAO_VERIFICADO);
    }

    @Test
    void uploadInvalidoNaoTocaOStorage() {
        MediaUploadService s = service(null, false);
        ApiException e = catchThrowableOfType(ApiException.class, () -> s.upload(owner, png("foto.jpg"), AccessClassification.INTERNO, false));
        assertThat(e.code()).isEqualTo(MediaUploadInspector.TIPO_DIVERGENTE);
        assertThat(blobs).isEmpty();
    }
}
