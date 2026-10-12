package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScan;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
import br.gov.pr.secid.workstation.domain.security.MediaAccessPolicy;
import br.gov.pr.secid.workstation.domain.security.ResourceAction;
import br.gov.pr.secid.workstation.domain.security.ScopedResource;
import br.gov.pr.secid.workstation.domain.security.Viewer;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Upload e leitura de mídia com os controles do Bloco 5 (D-67): inspeção ({@link MediaUploadInspector}) → antivírus/quarentena
 * ({@link AntivirusPort}) → dedupe por dono (SHA-256) → chave {@code restricted/} para RESTRITO/SIGILOSO ({@link MediaKeys}) → storage →
 * metadados + {@code media_scans}. A leitura passa pelo {@link ResourceAuthorizer#requireMedia} (OwnMedia) e pela quarentena, e só então
 * devolve URL assinada curta (quando o adaptador suporta) ou os bytes.
 *
 * <p>Não é bean de propósito: os adaptadores de metadados ({@link MediaObjectRepositoryPort}) chegam com a primeira rota de upload de
 * cada onda de RF, que registra este serviço com {@code @Bean} — até lá nenhuma rota recebe arquivo.
 */
public class MediaUploadService {
    public static final String INFECTADO = "ARQUIVO_INFECTADO";
    public static final String QUARENTENA = "MIDIA_EM_QUARENTENA";

    private final MediaUploadInspector inspector;
    private final AntivirusPort antivirus;
    private final MediaStoragePort storage;
    private final MediaObjectRepositoryPort repository;
    private final ResourceAuthorizer authorizer;
    private final MediaUploadProperties props;
    private final String bucket;
    private final Clock clock;

    public MediaUploadService(MediaUploadInspector inspector, Optional<AntivirusPort> antivirus, MediaStoragePort storage,
                              MediaObjectRepositoryPort repository, ResourceAuthorizer authorizer, MediaUploadProperties props, String bucket,
                              Clock clock) {
        this.inspector = inspector;
        this.antivirus = antivirus == null ? AntivirusPort.NO_OP : antivirus.orElse(AntivirusPort.NO_OP);
        this.storage = storage;
        this.repository = repository;
        this.authorizer = authorizer;
        this.props = props == null ? MediaUploadProperties.defaults() : props;
        this.bucket = bucket == null || bucket.isBlank() ? "ws-media" : bucket;
        this.clock = clock;
    }

    /** Objeto gravado (ou reaproveitado pelo dedupe) e a situação da varredura. */
    public record Stored(MediaObject media, MediaScanStatus scanStatus, String safeName, boolean deduplicated) {
    }

    /** Autorização concedida para ler: URL assinada (se houver) ou o caller lê os bytes por {@link #read}. */
    public record ReadGrant(MediaObject media, Optional<URI> signedUrl, Duration ttl) {
    }

    public Stored upload(Viewer owner, MediaUploadInspector.UploadCandidate candidate, AccessClassification classification, boolean publicAsset) {
        MediaUploadInspector.InspectedUpload ok = inspector.inspect(candidate);
        AntivirusPort.Verdict verdict = antivirus.scan(candidate.content(), ok.type());
        if (verdict.status() == MediaScanStatus.INFECTADO) {
            throw ApiException.unprocessable(INFECTADO, "O arquivo foi recusado pelo antivírus.", Map.of("engine", verdict.engine()));
        }
        MediaAccessClass cls = MediaAccessPolicy.storageClassFor(classification, publicAsset);
        Optional<MediaObject> existing = repository.findByOwnerAndSha256(owner.userId(), ok.sha256())
                .filter(m -> m.accessClass() == cls);
        if (existing.isPresent()) {
            MediaScanStatus st = repository.findScan(existing.get().id()).map(MediaScan::status).orElse(verdict.status());
            return new Stored(existing.get(), st, ok.safeName(), true);
        }
        String key = MediaKeys.objectKey(owner.userId(), cls, ok.sha256(), ok.type());
        storage.put(key, candidate.content(), ok.mime());
        MediaObject media = repository.save(new MediaObject(UUID.randomUUID(), owner.userId(), bucket, key, ok.mime(), ok.sizeBytes(), ok.sha256(),
                cls, null));
        boolean scanned = verdict.status() == MediaScanStatus.LIMPO || verdict.status() == MediaScanStatus.INFECTADO;
        repository.saveScan(new MediaScan(UUID.randomUUID(), media.id(), verdict.status(), ok.type().name(), verdict.engine(), verdict.threatName(),
                scanned ? clock.instant() : null));
        return new Stored(media, verdict.status(), ok.safeName(), false);
    }

    /**
     * Autoriza a leitura: id inexistente e mídia invisível respondem o MESMO 404; quarentena (PENDENTE/INFECTADO, ou NAO_VERIFICADO com
     * antivírus obrigatório) → {@code 423 MIDIA_EM_QUARENTENA}, só depois da autorização (não vaza estado para quem não vê).
     */
    public ReadGrant authorizeRead(Viewer viewer, UUID mediaId, boolean parentVisible) {
        MediaObject media = repository.findById(mediaId).orElseThrow(() -> ResourceAuthorizer.notFound(ScopedResource.Kind.MEDIA));
        authorizer.requireMedia(viewer, media, parentVisible, ResourceAction.VIEW);
        MediaScanStatus st = repository.findScan(media.id()).map(MediaScan::status).orElse(MediaScanStatus.PENDENTE);
        if (!st.servable(props.requireAntivirus())) {
            throw new ApiException(QUARENTENA, 423, "Arquivo em verificação. Tente novamente em instantes.", Map.of("status", st.name()));
        }
        Duration ttl = Duration.ofSeconds(props.signedUrlTtlSeconds());
        return new ReadGrant(media, storage.signedReadUrl(media.objectKey(), ttl), ttl);
    }

    /** Bytes de uma leitura já autorizada por {@link #authorizeRead}. */
    public byte[] read(ReadGrant grant) {
        return storage.read(grant.media().objectKey());
    }
}
