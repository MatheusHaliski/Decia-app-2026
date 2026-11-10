package br.gov.pr.secid.workstation.infrastructure.platform.connectors;

import br.gov.pr.secid.workstation.application.connectors.ConnectorsProperties;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort;
import br.gov.pr.secid.workstation.application.connectors.ProviderException;
import br.gov.pr.secid.workstation.application.connectors.ProviderException.Kind;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import br.gov.pr.secid.workstation.domain.connectors.TaskExternalLink;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Drive API v3, só leitura ({@code drive.readonly}): {@code files.list} (busca por nome, mais recentes primeiro, inclui unidades
 * compartilhadas), {@code files.get} (metadados), {@code files.export?mimeType=application/pdf} para Docs/Sheets/Slides/Drawings (limite
 * de 10 MB do Google) e {@code files.get?alt=media} para os demais arquivos.
 */
public class GoogleDriveAdapter implements ExternalDocPort {
    static final String FIELDS = "id,name,mimeType,webViewLink,modifiedTime,size,headRevisionId,version";
    static final String FOLDER = "application/vnd.google-apps.folder";

    private final ConnectorsProperties.Google cfg;
    private final ConnectorHttp http;

    GoogleDriveAdapter(ConnectorsProperties.Google cfg, ConnectorHttp http) {
        this.cfg = cfg;
        this.http = http;
    }

    @Override
    public ConnectorProvider provider() {
        return ConnectorProvider.GOOGLE;
    }

    @Override
    public RemotePage list(String accessToken, String query, String pageToken, int pageSize) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("q", driveQuery(query));
        q.put("pageSize", String.valueOf(pageSize));
        q.put("orderBy", "modifiedTime desc");
        q.put("fields", "nextPageToken,files(" + FIELDS + ")");
        q.put("spaces", "drive");
        q.put("supportsAllDrives", "true");
        q.put("includeItemsFromAllDrives", "true");
        if (pageToken != null && !pageToken.isBlank()) {
            q.put("pageToken", pageToken);
        }
        JsonNode json = http.getJson(cfg.driveUrl() + "/files?" + ConnectorHttp.form(q), accessToken);
        List<RemoteItem> items = new ArrayList<>();
        for (JsonNode f : json.path("files").values()) {
            RemoteItem item = item(f);
            if (item != null) {
                items.add(item);
            }
        }
        return new RemotePage(items, ConnectorHttp.text(json, "nextPageToken"));
    }

    @Override
    public RemoteItem get(String accessToken, String externalId) {
        JsonNode f = http.getJson(cfg.driveUrl() + "/files/" + id(externalId) + "?fields=" + ConnectorHttp.enc(FIELDS) + "&supportsAllDrives=true",
                accessToken);
        RemoteItem item = item(f);
        if (item == null) {
            throw new ProviderException(Kind.UNAVAILABLE, 200, "metadados do Drive sem id");
        }
        return item;
    }

    @Override
    public RemoteContent download(String accessToken, RemoteItem item, boolean asPdf, long maxBytes) {
        String url = asPdf ? cfg.driveUrl() + "/files/" + id(item.externalId()) + "/export?mimeType=" + ConnectorHttp.enc("application/pdf")
                : cfg.driveUrl() + "/files/" + id(item.externalId()) + "?alt=media&supportsAllDrives=true";
        ConnectorHttp.Downloaded d = http.download(url, accessToken, maxBytes);
        return new RemoteContent(d.bytes(), asPdf ? "application/pdf" : d.contentType());
    }

    /** {@code trashed = false} e, com busca, {@code name contains '<texto>'} (aspas e barra invertida escapadas). */
    static String driveQuery(String query) {
        String base = "trashed = false";
        if (query == null || query.isBlank()) {
            return base;
        }
        String escaped = query.strip().replace("\\", "\\\\").replace("'", "\\'");
        return base + " and name contains '" + escaped + "'";
    }

    static RemoteItem item(JsonNode f) {
        String id = ConnectorHttp.text(f, "id");
        if (id == null || !TaskExternalLink.validExternalId(id)) {
            return null;
        }
        String mime = ConnectorHttp.text(f, "mimeType");
        String version = ConnectorHttp.text(f, "headRevisionId");
        if (version == null) {
            Long v = ConnectorHttp.number(f, "version");
            version = v == null ? ConnectorHttp.text(f, "modifiedTime") : "v" + v;
        }
        return new RemoteItem(id, ConnectorHttp.text(f, "name"), mime, ConnectorHttp.text(f, "webViewLink"),
                ConnectorHttp.instant(f, "modifiedTime"), ConnectorHttp.number(f, "size"), FOLDER.equals(mime), null, version);
    }

    /** O id já foi validado ({@code [A-Za-z0-9_-]} no Drive): nunca muda o caminho da URL. */
    private static String id(String externalId) {
        if (!TaskExternalLink.validExternalId(externalId)) {
            throw new ProviderException(Kind.REJECTED, 0, "id externo inválido");
        }
        return externalId;
    }
}
