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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.InputStream;
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
    private static final Logger log = LoggerFactory.getLogger(MediaUploadService.class);

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

    /**
     * Inspeção + hash do original + captura do EXIF + strip + formato ({@link PreparedUpload}) com o mesmo inspetor deste serviço: o
     * caminho comum do upload direto e da cópia por conector antes do {@link #upload}.
     */
    public PreparedUpload prepare(MediaUploadInspector.UploadCandidate candidate) {
        return PreparedUpload.prepare(inspector, candidate);
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
        // transação desfeita depois do put (ex.: falha ao gravar o vínculo): o binário recém-gravado não pode ficar órfão no storage
        cleanupOnRollback(owner.userId(), ok.sha256(), key);
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

    /**
     * Situação da varredura do objeto (sem registro = PENDENTE), sem autorização: para o chamador que já autorizou o recurso-pai mostrar
     * "em verificação"/"não verificado" na lista (ex.: anexos de uma tarefa visível, RF41.CA06).
     */
    public MediaScanStatus scanStatus(UUID mediaId) {
        return mediaId == null ? MediaScanStatus.PENDENTE : repository.findScan(mediaId).map(MediaScan::status).orElse(MediaScanStatus.PENDENTE);
    }

    /** O objeto com esta varredura pode ser servido agora? (mesma regra de {@link #authorizeRead}) */
    public boolean servable(MediaScanStatus status) {
        return status != null && status.servable(props.requireAntivirus());
    }

    /** Metadados por id, sem autorização: só para o chamador que já conferiu o vínculo (ex.: a foto atual de uma conta). */
    public Optional<MediaObject> find(UUID mediaId) {
        return mediaId == null ? Optional.empty() : repository.findById(mediaId);
    }

    /**
     * Apaga metadados e binário de um objeto que o chamador já conferiu (ex.: foto substituída do próprio dono, RF3.CA05). Os metadados
     * saem na transação do chamador; o binário só depois do COMMIT ({@link TransactionSynchronization#afterCommit}): se a transação for
     * desfeita, o arquivo continua lá para os metadados que voltaram. Sem transação ativa (testes, rotinas), apaga na hora. Falha ao apagar
     * depois do commit só deixa um binário órfão (registrado no log, sem a chave), nunca um metadado apontando para o vazio.
     */
    public void delete(MediaObject media) {
        repository.delete(media.id());
        String key = media.objectKey();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deleteQuietly(key);
                }
            });
        } else {
            storage.delete(key);
        }
    }

    /** Rollback depois do put: apaga o binário, a menos que outra transação já tenha gravado o mesmo objeto (mesmo dono e SHA-256). */
    private void cleanupOnRollback(UUID ownerId, String sha256, String key) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_ROLLED_BACK) {
                    return;
                }
                try {
                    if (repository.findByOwnerAndSha256(ownerId, sha256).filter(m -> key.equals(m.objectKey())).isEmpty()) {
                        deleteQuietly(key);
                    }
                } catch (RuntimeException e) {
                    log.warn("Limpeza do binário depois do rollback não conferida ({})", e.getClass().getSimpleName());
                }
            }
        });
    }

    private void deleteQuietly(String key) {
        try {
            storage.delete(key);
        } catch (RuntimeException e) {
            log.warn("Binário de mídia não apagado do storage depois da transação ({}); fica órfão até a limpeza", e.getClass().getSimpleName());
        }
    }

    /** Bytes de uma leitura já autorizada por {@link #authorizeRead}. */
    public byte[] read(ReadGrant grant) {
        return storage.read(grant.media().objectKey());
    }

    /** Fluxo de uma leitura já autorizada por {@link #authorizeRead} (download em streaming); quem chama fecha. */
    public InputStream open(ReadGrant grant) {
        return storage.open(grant.media().objectKey());
    }
}
