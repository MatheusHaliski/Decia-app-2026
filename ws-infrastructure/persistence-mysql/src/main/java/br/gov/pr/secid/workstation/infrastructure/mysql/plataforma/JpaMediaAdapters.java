package br.gov.pr.secid.workstation.infrastructure.mysql.plataforma;

import br.gov.pr.secid.workstation.application.media.MediaObjectRepositoryPort;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScan;
import br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.entity.MediaObjectEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.entity.MediaScanEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.repository.MediaObjectRepository;
import br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.repository.MediaScanRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Optional;
import java.util.UUID;

/**
 * Adaptador JPA da {@link MediaObjectRepositoryPort} ({@code media_objects} V2 + {@code media_scans} V24). Entrou com a primeira rota de
 * upload (foto de perfil, RF3.CA05). Dedupe só entre objetos do MESMO dono (D-67).
 */
@Configuration
public class JpaMediaAdapters {

    @Bean
    MediaObjectRepositoryPort mediaObjectRepositoryPort(MediaObjectRepository objects, MediaScanRepository scans, Clock clock) {
        return new MediaObjectRepositoryPort() {
            @Override
            public Optional<MediaObject> findById(UUID id) {
                return objects.findById(id).map(JpaMediaAdapters::toDomain);
            }

            @Override
            public Optional<MediaObject> findByOwnerAndSha256(UUID ownerId, String sha256) {
                return objects.findFirstByOwnerIdAndSha256(ownerId, sha256).map(JpaMediaAdapters::toDomain);
            }

            @Override
            @Transactional
            public MediaObject save(MediaObject m) {
                MediaObjectEntity e = objects.findById(m.id()).orElseGet(() -> {
                    MediaObjectEntity n = new MediaObjectEntity();
                    n.setId(m.id());
                    n.setCreatedAt(clock.instant());
                    return n;
                });
                e.setOwnerId(m.ownerId());
                e.setBucket(m.bucket());
                e.setObjectKey(m.objectKey());
                e.setMimeType(m.mimeType());
                e.setSizeBytes(m.sizeBytes());
                e.setSha256(m.sha256());
                e.setAccessClass(m.accessClass());
                e.setVariantsJson(m.variantsJson());
                return toDomain(objects.saveAndFlush(e));
            }

            @Override
            public Optional<MediaScan> findScan(UUID mediaId) {
                return scans.findByMediaId(mediaId).map(JpaMediaAdapters::toDomain);
            }

            @Override
            @Transactional
            public MediaScan saveScan(MediaScan s) {
                MediaScanEntity e = scans.findByMediaId(s.mediaId()).orElseGet(() -> {
                    MediaScanEntity n = new MediaScanEntity();
                    n.setId(s.id());
                    n.setMediaId(s.mediaId());
                    n.setCreatedAt(clock.instant());
                    return n;
                });
                e.setStatus(s.status());
                e.setDetectedType(s.detectedType());
                e.setEngine(s.engine());
                e.setThreatName(s.threatName());
                e.setScannedAt(s.scannedAt());
                return toDomain(scans.saveAndFlush(e));
            }

            @Override
            @Transactional
            public void delete(UUID id) {
                objects.deleteById(id);
                objects.flush();
            }
        };
    }

    static MediaObject toDomain(MediaObjectEntity e) {
        return new MediaObject(e.getId(), e.getOwnerId(), e.getBucket(), e.getObjectKey(), e.getMimeType(), e.getSizeBytes(), e.getSha256(),
                e.getAccessClass(), e.getVariantsJson());
    }

    static MediaScan toDomain(MediaScanEntity e) {
        return new MediaScan(e.getId(), e.getMediaId(), e.getStatus(), e.getDetectedType(), e.getEngine(), e.getThreatName(), e.getScannedAt());
    }
}
