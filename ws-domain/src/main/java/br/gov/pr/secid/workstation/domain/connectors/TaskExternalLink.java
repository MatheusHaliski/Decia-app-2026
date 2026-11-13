package br.gov.pr.secid.workstation.domain.connectors;

import br.gov.pr.secid.workstation.domain.acervo.LinkMode;
import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Origem externa de uma tarefa importada por conector (RF20.CA07; conectores, V61). Complementa {@code tasks.source_ref} (a URL web,
 * que a interface mostra): aqui ficam o id no provedor, a conta usada e a versão remota vista na importação — o que o job
 * {@code SYNC_EXTERNO} precisa para atualizar um item VINCULADO. Some com a tarefa; desconectar a conta não apaga o vínculo
 * ({@code account_id} vira nulo e o item pede reconexão).
 */
@DomainEntity(context = "2 Acervo de Tarefas", table = "task_external_links", rfs = {"RF20", "RF8", "RF23"}, migration = 61,
        audit = Audit.CREATED, pk = "task_id",
        doc = "Id no provedor, conta usada e versão remota de uma tarefa importada por conector (para o SYNC_EXTERNO). Tarefa → CASCADE; "
                + "conta desconectada → SET NULL.",
        indexes = {"account_id", "provider, external_id"})
public record TaskExternalLink(
        @Attr(value = "tarefa", ref = "tasks", onDelete = OnDelete.CASCADE) UUID taskId,
        @Attr(value = "conta conectada usada", opt = true, ref = "connector_accounts", onDelete = OnDelete.SET_NULL) UUID accountId,
        @Attr("provedor") ConnectorProvider provider,
        @Attr(value = "id no provedor (Drive: fileId; Graph: driveId~itemId)", len = 300) String externalId,
        @Attr(value = "tipo MIME no provedor", opt = true, len = 255) String mimeType,
        @Attr("vinculado ou copiado") LinkMode linkMode,
        @Attr(value = "versão remota na importação (headRevisionId, eTag ou modifiedTime)", opt = true, len = 200) String remoteVersion,
        @Attr("importada/sincronizada em") Instant syncedAt) {

    /** Ids de Drive ({@code [A-Za-z0-9_-]}) e do Graph ({@code b!…}, {@code …!123}) unidos por {@code ~}; nada que mude um caminho de URL. */
    public static final Pattern EXTERNAL_ID = Pattern.compile("^[A-Za-z0-9_\\-!~.]{1,300}$");

    public TaskExternalLink {
        if (taskId == null || provider == null || linkMode == null || syncedAt == null) {
            throw new IllegalArgumentException("VALIDACAO: vínculo externo exige tarefa, provedor, modo e data");
        }
        if (externalId == null || !EXTERNAL_ID.matcher(externalId).matches()) {
            throw new IllegalArgumentException("VALIDACAO: externalId inválido");
        }
        mimeType = mimeType == null || mimeType.length() <= 255 ? mimeType : mimeType.substring(0, 255);
        remoteVersion = remoteVersion == null || remoteVersion.length() <= 200 ? remoteVersion : remoteVersion.substring(0, 200);
    }

    public static boolean validExternalId(String externalId) {
        return externalId != null && EXTERNAL_ID.matcher(externalId).matches();
    }
}
