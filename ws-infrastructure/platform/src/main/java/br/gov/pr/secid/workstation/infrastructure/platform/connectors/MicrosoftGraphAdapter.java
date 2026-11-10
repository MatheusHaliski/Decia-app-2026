package br.gov.pr.secid.workstation.infrastructure.platform.connectors;

import br.gov.pr.secid.workstation.application.connectors.ConnectorsProperties;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort;
import br.gov.pr.secid.workstation.application.connectors.ProviderException;
import br.gov.pr.secid.workstation.application.connectors.ProviderException.Kind;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import br.gov.pr.secid.workstation.domain.connectors.TaskExternalLink;
import tools.jackson.databind.JsonNode;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * Microsoft Graph v1.0, OneDrive/SharePoint só leitura ({@code Files.Read}): itens da raiz do OneDrive ({@code /me/drive/root/children}),
 * busca ({@code /me/drive/root/search(q='…')}), metadados ({@code /drives/{driveId}/items/{itemId}}) e conteúdo ({@code /content}, que
 * responde 302 para uma URL pré-autenticada — seguida SEM o token; {@code ?format=pdf} converte em PDF até o limite documentado). O id
 * externo é {@code driveId~itemId} (itens de outras bibliotecas também abrem). A página seguinte ({@code @odata.nextLink}) volta ao front
 * em base64url e só é aceita de volta se apontar para a base configurada do Graph (sem SSRF).
 */
public class MicrosoftGraphAdapter implements ExternalDocPort {
    static final String SELECT = "$select=id,name,file,folder,package,webUrl,lastModifiedDateTime,size,parentReference,eTag,cTag";
    static final char SEP = '~';

    private final ConnectorsProperties.Microsoft cfg;
    private final ConnectorHttp http;

    MicrosoftGraphAdapter(ConnectorsProperties.Microsoft cfg, ConnectorHttp http) {
        this.cfg = cfg;
        this.http = http;
    }

    @Override
    public ConnectorProvider provider() {
        return ConnectorProvider.MICROSOFT;
    }

    @Override
    public RemotePage list(String accessToken, String query, String pageToken, int pageSize) {
        String url;
        if (pageToken != null && !pageToken.isBlank()) {
            url = nextLink(pageToken);
        } else if (query == null || query.isBlank()) {
            url = cfg.graphUrl() + "/me/drive/root/children?$top=" + pageSize + "&" + SELECT;
        } else {
            String term = query.strip().replace("'", "''");
            url = cfg.graphUrl() + "/me/drive/root/search(q='" + URLEncoder.encode(term, StandardCharsets.UTF_8).replace("+", "%20") + "')?$top="
                    + pageSize + "&" + SELECT;
        }
        JsonNode json = http.getJson(url, accessToken);
        List<RemoteItem> items = new ArrayList<>();
        for (JsonNode i : json.path("value").values()) {
            RemoteItem item = item(i);
            if (item != null) {
                items.add(item);
            }
        }
        String next = ConnectorHttp.text(json, "@odata.nextLink");
        return new RemotePage(items, next == null ? null : Base64.getUrlEncoder().withoutPadding()
                .encodeToString(next.getBytes(StandardCharsets.UTF_8)));
    }

    @Override
    public RemoteItem get(String accessToken, String externalId) {
        RemoteItem item = item(http.getJson(itemUrl(externalId) + "?" + SELECT, accessToken));
        if (item == null) {
            throw new ProviderException(Kind.UNAVAILABLE, 200, "metadados do Graph sem id");
        }
        return item;
    }

    @Override
    public RemoteContent download(String accessToken, RemoteItem item, boolean asPdf, long maxBytes) {
        ConnectorHttp.Downloaded d = http.download(itemUrl(item.externalId()) + "/content" + (asPdf ? "?format=pdf" : ""), accessToken, maxBytes);
        return new RemoteContent(d.bytes(), asPdf ? "application/pdf" : d.contentType());
    }

    /** {@code driveId~itemId} → {@code /drives/{driveId}/items/{itemId}}; só o itemId → {@code /me/drive/items/{itemId}}. */
    String itemUrl(String externalId) {
        if (!TaskExternalLink.validExternalId(externalId)) {
            throw new ProviderException(Kind.REJECTED, 0, "id externo inválido");
        }
        int cut = externalId.indexOf(SEP);
        if (cut < 0) {
            return cfg.graphUrl() + "/me/drive/items/" + externalId;
        }
        String drive = externalId.substring(0, cut);
        String id = externalId.substring(cut + 1);
        if (drive.isEmpty() || id.isEmpty() || id.indexOf(SEP) >= 0) {
            throw new ProviderException(Kind.REJECTED, 0, "id externo inválido");
        }
        return cfg.graphUrl() + "/drives/" + drive + "/items/" + id;
    }

    /** Página seguinte: base64url do {@code @odata.nextLink}, aceito só se começar pela base do Graph configurada. */
    String nextLink(String pageToken) {
        String link;
        try {
            link = new String(Base64.getUrlDecoder().decode(pageToken), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            throw new ProviderException(Kind.REJECTED, 0, "página inválida");
        }
        if (!link.startsWith(cfg.graphUrl() + "/") || link.chars().anyMatch(c -> c < 0x21 || c > 0x7E)) {
            throw new ProviderException(Kind.REJECTED, 0, "página inválida");
        }
        return link;
    }

    static RemoteItem item(JsonNode i) {
        String id = ConnectorHttp.text(i, "id");
        if (id == null || id.isBlank()) {
            return null;
        }
        String drive = ConnectorHttp.text(i.path("parentReference"), "driveId");
        String externalId = drive == null || drive.isBlank() ? id : drive + SEP + id;
        if (!TaskExternalLink.validExternalId(externalId)) {
            return null;
        }
        String version = ConnectorHttp.text(i, "cTag");
        if (version == null) {
            version = ConnectorHttp.text(i, "eTag");
        }
        return new RemoteItem(externalId, ConnectorHttp.text(i, "name"), ConnectorHttp.text(i.path("file"), "mimeType"),
                ConnectorHttp.text(i, "webUrl"), ConnectorHttp.instant(i, "lastModifiedDateTime"), ConnectorHttp.number(i, "size"),
                i.has("folder"), ConnectorHttp.text(i.path("package"), "type"), version);
    }
}
