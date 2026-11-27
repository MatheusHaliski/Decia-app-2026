package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.TaskService;
import br.gov.pr.secid.workstation.application.acervo.TaskService.SourcedTaskInput;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.media.MediaUploadService;
import br.gov.pr.secid.workstation.application.media.PreparedUpload;
import br.gov.pr.secid.workstation.domain.acervo.AntivirusStatus;
import br.gov.pr.secid.workstation.domain.acervo.OcrStatus;
import br.gov.pr.secid.workstation.domain.acervo.TaskAttachment;
import br.gov.pr.secid.workstation.domain.acervo.UploadChannel;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import br.gov.pr.secid.workstation.domain.connectors.TaskExternalLink;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

/**
 * Parte transacional da importação (conectores): numa transação só, a tarefa ({@link TaskService#createFromSource}), o anexo com a cópia
 * (modo COPIADO — o binário já passou pelo pipeline de mídia) e a origem externa ({@code task_external_links}). As chamadas de rede
 * (provedor) acontecem antes, fora da transação, no {@link ConnectorService}. O anexo da cópia tem o mesmo tratamento do upload direto
 * ({@link PreparedUpload}): formato e detalhes pelo tipo real do binário limpo, hash do original, captura do EXIF cifrada, quem importou e
 * por qual provedor ({@code uploadedVia}).
 */
@Service
public class ConnectorImportWriter {
    private final TaskService tasks;
    private final TaskAttachmentRepositoryPort attachments;
    private final TaskExternalLinkRepositoryPort links;
    private final Clock clock;

    public ConnectorImportWriter(TaskService tasks, TaskAttachmentRepositoryPort attachments, TaskExternalLinkRepositoryPort links, Clock clock) {
        this.tasks = tasks;
        this.attachments = attachments;
        this.links = links;
        this.clock = clock;
    }

    /** Cópia já guardada pelo pipeline de mídia e a preparação que a gerou (hashes, captura, formato). */
    public record Copy(MediaUploadService.Stored stored, PreparedUpload prepared) {
    }

    /** Item de onde a tarefa veio por conta conectada (nulo na importação por link). */
    public record ExternalOrigin(UUID accountId, ConnectorProvider provider, String externalId, String mimeType, String remoteVersion) {
    }

    @Transactional
    public TaskView write(CurrentUser actor, SourcedTaskInput task, Copy copy, ExternalOrigin origin, RequestContext ctx) {
        TaskView view = tasks.createFromSource(actor, task, ctx);
        if (copy != null) {
            MediaUploadService.Stored s = copy.stored();
            PreparedUpload p = copy.prepared();
            attachments.insert(new TaskAttachment(null, view.id(), s.media().id(), s.safeName(), s.media().mimeType(),
                    s.media().sizeBytes(), s.media().sha256(), antivirus(s.scanStatus()), OcrStatus.PENDENTE, null, true, 0,
                    p.format().family(), p.format().variant(), p.formatDetailsJson(), p.originalSha256(), actor.id(), channel(origin),
                    p.captureJson()));
        }
        if (origin != null) {
            links.insert(new TaskExternalLink(view.id(), origin.accountId(), origin.provider(), origin.externalId(), origin.mimeType(),
                    task.linkMode(), origin.remoteVersion(), clock.instant()));
        }
        return view;
    }

    /** Provedor da conta conectada → canal de entrada (mesmos nomes); sem origem (não acontece com cópia) → DIRETO. */
    static UploadChannel channel(ExternalOrigin origin) {
        return origin == null || origin.provider() == null ? UploadChannel.DIRETO : UploadChannel.valueOf(origin.provider().name());
    }

    /** Quarentena da mídia → situação do anexo: só LIMPO libera; sem motor (NAO_VERIFICADO) fica PENDENTE (D-67). */
    static AntivirusStatus antivirus(MediaScanStatus scan) {
        if (scan == MediaScanStatus.LIMPO) {
            return AntivirusStatus.LIMPO;
        }
        return scan == MediaScanStatus.INFECTADO ? AntivirusStatus.INFECTADO : AntivirusStatus.PENDENTE;
    }
}
