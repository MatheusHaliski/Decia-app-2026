package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScan;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Pipeline de mídia em memória para testes de outros serviços (foto de perfil, anonimização). */
public final class MemoryMedia {
    public final Map<String, byte[]> blobs = new HashMap<>();
    public final Map<UUID, MediaObject> rows = new HashMap<>();
    public final Map<UUID, MediaScan> scans = new HashMap<>();
    public final MediaUploadProperties props = MediaUploadProperties.defaults();
    public final MediaUploadInspector inspector = new MediaUploadInspector(props);

    public final MediaStoragePort storage = new MediaStoragePort() {
        @Override
        public void put(String key, byte[] content, String mime) {
            blobs.put(key, content);
        }

        @Override
        public byte[] read(String key) {
            return blobs.get(key);
        }

        @Override
        public void delete(String key) {
            blobs.remove(key);
        }
    };

    public final MediaObjectRepositoryPort repo = new MediaObjectRepositoryPort() {
        @Override
        public Optional<MediaObject> findById(UUID id) {
            return Optional.ofNullable(rows.get(id));
        }

        @Override
        public Optional<MediaObject> findByOwnerAndSha256(UUID ownerId, String sha256) {
            return rows.values().stream().filter(m -> m.ownerId().equals(ownerId) && m.sha256().equals(sha256)).findFirst();
        }

        @Override
        public MediaObject save(MediaObject media) {
            rows.put(media.id(), media);
            return media;
        }

        @Override
        public Optional<MediaScan> findScan(UUID mediaId) {
            return Optional.ofNullable(scans.get(mediaId));
        }

        @Override
        public MediaScan saveScan(MediaScan scan) {
            scans.put(scan.mediaId(), scan);
            return scan;
        }

        @Override
        public void delete(UUID id) {
            rows.remove(id);
            scans.remove(id);
        }
    };

    public MediaUploadService service(ResourceAuthorizer authorizer) {
        return new MediaUploadService(inspector, Optional.empty(), storage, repo, authorizer, props, "ws-media", Clock.systemUTC());
    }
}
