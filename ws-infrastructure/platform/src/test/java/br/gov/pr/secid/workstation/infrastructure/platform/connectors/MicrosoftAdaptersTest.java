package br.gov.pr.secid.workstation.infrastructure.platform.connectors;

import br.gov.pr.secid.workstation.application.connectors.ConnectorsProperties;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort.RemoteContent;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort.RemoteItem;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort.RemotePage;
import br.gov.pr.secid.workstation.application.connectors.OAuthClientPort.TokenGrant;
import br.gov.pr.secid.workstation.application.connectors.ProviderException.Kind;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import br.gov.pr.secid.workstation.infrastructure.platform.connectors.LocalProvider.Hit;
import br.gov.pr.secid.workstation.infrastructure.platform.connectors.LocalProvider.Reply;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

import static br.gov.pr.secid.workstation.infrastructure.platform.connectors.GoogleAdaptersTest.kind;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * OAuth v2.0 da Microsoft identity platform e Graph v1.0 contra provedores falsos em 127.0.0.1: tenant no caminho, escopos delegados,
 * giro do refresh token, {@code /me}, itens e busca do OneDrive, página seguinte só para a base do Graph e o 302 do {@code /content}
 * seguido SEM o token para outra origem.
 */
class MicrosoftAdaptersTest {
    final LocalProvider login;
    final LocalProvider graph;
    final LocalProvider files;
    final ConnectorsProperties.Microsoft cfg;
    final ConnectorHttp http = new ConnectorHttp(Duration.ofSeconds(5));
    final MicrosoftOAuthAdapter oauth;
    final MicrosoftGraphAdapter docs;

    MicrosoftAdaptersTest() throws IOException {
        login = new LocalProvider();
        graph = new LocalProvider();
        files = new LocalProvider();
        cfg = new ConnectorsProperties.Microsoft("app-id", "segredo-ms", "https://api.example/api/connectors/oauth/callback", "organizations",
                login.base(), graph.base() + "/v1.0", 0);
        oauth = new MicrosoftOAuthAdapter(cfg, http);
        docs = new MicrosoftGraphAdapter(cfg, http);
    }

    @AfterEach
    void stop() {
        login.close();
        graph.close();
        files.close();
    }

    @Test
    void autorizacaoTrocaERenovacaoNoEndpointV2DoTenant() {
        String url = oauth.authorizationUrl("st", "ch");
        assertThat(url).startsWith(login.base() + "/organizations/oauth2/v2.0/authorize?");
        Map<String, String> q = LocalProvider.decode(URI.create(url).getRawQuery());
        assertThat(q).containsEntry("scope", "openid email offline_access User.Read Files.Read").containsEntry("response_mode", "query")
                .containsEntry("code_challenge_method", "S256").containsEntry("state", "st").containsEntry("client_id", "app-id")
                .containsEntry("prompt", "select_account");

        login.on("POST /organizations/oauth2/v2.0/token", hit -> Reply.json(200, "{\"token_type\":\"Bearer\",\"scope\":"
                + "\"openid email https://graph.microsoft.com/Files.Read https://graph.microsoft.com/User.Read\",\"expires_in\":4523,"
                + "\"access_token\":\"eyJ.acc." + hit.form().get("grant_type") + "\",\"refresh_token\":\"0.AR-novo\"}"));
        TokenGrant g = oauth.exchange("M.C1", "verif");
        Hit token = login.last();
        assertThat(token.form()).containsEntry("grant_type", "authorization_code").containsEntry("code", "M.C1")
                .containsEntry("code_verifier", "verif").containsEntry("client_secret", "segredo-ms")
                .containsEntry("scope", "openid email offline_access User.Read Files.Read");
        assertThat(g.scopes()).contains("Files.Read", "User.Read");
        assertThat(g.expiresInSeconds()).isEqualTo(4523);
        TokenGrant r = oauth.refresh("0.AR-velho");
        assertThat(login.last().form()).containsEntry("grant_type", "refresh_token").containsEntry("refresh_token", "0.AR-velho")
                .containsKey("scope");
        assertThat(r.refreshToken()).as("a Microsoft gira o refresh token").isEqualTo("0.AR-novo");
        assertThat(r.accessToken()).isEqualTo("eyJ.acc.refresh_token");

        login.on("POST /organizations/oauth2/v2.0/token", Reply.json(400, "{\"error\":\"invalid_grant\",\"error_description\":\"AADSTS70008\"}"));
        assertThat(kind(() -> oauth.refresh("x"))).isEqualTo(Kind.INVALID_GRANT);
        assertThat(oauth.revoke("x")).as("sem revogação por API").isFalse();
        assertThat(oauth.provider()).isEqualTo(ConnectorProvider.MICROSOFT);
    }

    @Test
    void perfilPeloMeComUpnQuandoNaoHaMail() {
        graph.on("GET /v1.0/me", Reply.json(200, "{\"id\":\"oid-1\",\"mail\":null,\"userPrincipalName\":\"ana@contoso.onmicrosoft.com\"}"));
        var me = oauth.profile("eyJ.acc");
        assertThat(me.subject()).isEqualTo("oid-1");
        assertThat(me.email()).isEqualTo("ana@contoso.onmicrosoft.com");
        assertThat(graph.last().params()).containsEntry("$select", "id,mail,userPrincipalName");
        assertThat(graph.last().header("authorization")).isEqualTo("Bearer eyJ.acc");
        graph.on("GET /v1.0/me", Reply.json(200, "{\"id\":\"oid-1\",\"mail\":\"ana@contoso.gov.br\"}"));
        assertThat(oauth.profile("t").email()).isEqualTo("ana@contoso.gov.br");
        graph.on("GET /v1.0/me", Reply.json(401, "{\"error\":{\"code\":\"InvalidAuthenticationToken\"}}"));
        assertThat(kind(() -> oauth.profile("t"))).isEqualTo(Kind.UNAUTHORIZED);
    }

    @Test
    void listaBuscaEPaginaSoDentroDoGraph() {
        String next = graph.base() + "/v1.0/me/drive/root/children?$top=2&$skiptoken=XYZ";
        graph.on("GET /v1.0/me/drive/root/children", hit -> hit.params().containsKey("$skiptoken")
                ? Reply.json(200, "{\"value\":[]}")
                : Reply.json(200, """
                        {"@odata.nextLink":"%s","value":[
                         {"id":"01ABC","name":"Ofício.docx","webUrl":"https://contoso-my.sharepoint.com/personal/ana/Documents/Oficio.docx",
                          "lastModifiedDateTime":"2026-11-08T10:00:00Z","size":12345,"cTag":"\\"c:{X},2\\"","eTag":"\\"{X},2\\"",
                          "file":{"mimeType":"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
                          "parentReference":{"driveId":"b!Drv-1_x"}},
                         {"id":"01PASTA","name":"Projeto","folder":{"childCount":3},"parentReference":{"driveId":"b!Drv-1_x"}},
                         {"id":"01NOTE","name":"Caderno","package":{"type":"oneNote"},"parentReference":{"driveId":"b!Drv-1_x"}},
                         {"id":"bad/id","name":"x"}]}""".formatted(next)));
        RemotePage page = docs.list("eyJ", "", null, 2);
        assertThat(graph.last().params()).containsEntry("$top", "2").containsKey("$select");
        assertThat(page.items()).extracting(RemoteItem::externalId).containsExactly("b!Drv-1_x~01ABC", "b!Drv-1_x~01PASTA", "b!Drv-1_x~01NOTE");
        RemoteItem word = page.items().get(0);
        assertThat(word.mimeType()).startsWith("application/vnd.openxmlformats");
        assertThat(word.sizeBytes()).isEqualTo(12345L);
        assertThat(word.version()).isEqualTo("\"c:{X},2\"");
        assertThat(page.items().get(1).folder()).isTrue();
        assertThat(page.items().get(2).packageType()).isEqualTo("oneNote");
        assertThat(new String(Base64.getUrlDecoder().decode(page.nextPageToken()), StandardCharsets.UTF_8)).isEqualTo(next);

        assertThat(docs.list("eyJ", null, page.nextPageToken(), 2).items()).isEmpty();
        assertThat(graph.last().params()).containsEntry("$skiptoken", "XYZ");
        String foreign = Base64.getUrlEncoder().encodeToString("http://169.254.169.254/latest/meta-data".getBytes(StandardCharsets.UTF_8));
        assertThat(kind(() -> docs.list("eyJ", null, foreign, 2))).as("página seguinte fora do Graph: recusada (SSRF)").isEqualTo(Kind.REJECTED);
        assertThat(kind(() -> docs.list("eyJ", null, "%%%", 2))).isEqualTo(Kind.REJECTED);

        graph.on("GET /v1.0/me/drive/root/search*", Reply.json(200, "{\"value\":[]}"));
        docs.list("eyJ", "O'Brien relatório", null, 10);
        // aspas dobradas (OData) e o termo codificado no caminho, sem "+" no lugar do espaço
        assertThat(graph.last().path()).isEqualTo("/v1.0/me/drive/root/search(q='O%27%27Brien%20relat%C3%B3rio')");
    }

    @Test
    void metadadosEConteudoPelo302SemOTokenNoutraOrigem() {
        graph.on("GET /v1.0/drives/b!Drv-1_x/items/01ABC", Reply.json(200,
                "{\"id\":\"01ABC\",\"name\":\"Ofício.docx\",\"file\":{\"mimeType\":\"x\"},\"parentReference\":{\"driveId\":\"b!Drv-1_x\"}}"));
        RemoteItem item = docs.get("eyJ", "b!Drv-1_x~01ABC");
        assertThat(item.externalId()).isEqualTo("b!Drv-1_x~01ABC");
        graph.on("GET /v1.0/me/drive/items/01SOLO", Reply.json(200, "{\"id\":\"01SOLO\",\"name\":\"a.txt\"}"));
        assertThat(docs.get("eyJ", "01SOLO").externalId()).isEqualTo("01SOLO");
        assertThat(kind(() -> docs.get("eyJ", "a~b~c"))).isEqualTo(Kind.REJECTED);
        assertThat(kind(() -> docs.get("eyJ", "~b"))).isEqualTo(Kind.REJECTED);
        assertThat(kind(() -> docs.get("eyJ", "../x"))).isEqualTo(Kind.REJECTED);

        byte[] original = {9, 8, 7};
        files.on("GET /download/abc", Reply.bytes(200, "application/octet-stream", original));
        graph.on("GET /v1.0/drives/b!Drv-1_x/items/01ABC/content", hit -> Reply.redirect(files.base() + "/download/abc"));
        RemoteContent content = docs.download("eyJ.segredo", item, false, 1024);
        assertThat(content.bytes()).containsExactly(9, 8, 7);
        assertThat(graph.last().header("authorization")).isEqualTo("Bearer eyJ.segredo");
        assertThat(files.last().header("authorization")).as("URL pré-autenticada de outra origem: sem token").isNull();

        files.on("GET /download/pdf", Reply.bytes(200, "application/pdf", "%PDF-1.7".getBytes(StandardCharsets.US_ASCII)));
        graph.on("GET /v1.0/drives/b!Drv-1_x/items/01ABC/content", hit -> "pdf".equals(hit.params().get("format"))
                ? Reply.redirect(files.base() + "/download/pdf") : Reply.json(500, "{}"));
        RemoteContent pdf = docs.download("eyJ", item, true, 1024);
        assertThat(pdf.mimeType()).isEqualTo("application/pdf");
        assertThat(new String(pdf.bytes(), StandardCharsets.US_ASCII)).startsWith("%PDF");

        graph.on("GET /v1.0/drives/b!Drv-1_x/items/01ABC/content", Reply.json(406, "{\"error\":{\"code\":\"notSupported\"}}"));
        assertThat(kind(() -> docs.download("eyJ", item, true, 1024))).as("conversão recusada → o serviço cai para o original")
                .isEqualTo(Kind.REJECTED);
        graph.on("GET /v1.0/drives/b!Drv-1_x/items/01ABC/content", hit -> Reply.redirect("ftp://exemplo/x"));
        assertThat(kind(() -> docs.download("eyJ", item, false, 1024))).isEqualTo(Kind.UNAVAILABLE);
        graph.on("GET /v1.0/drives/b!Drv-1_x/items/01ABC/content", hit -> Reply.redirect(graph.base() + "/v1.0/drives/b!Drv-1_x/items/01ABC/content"));
        assertThat(kind(() -> docs.download("eyJ", item, false, 1024))).as("laço de redirecionamento").isEqualTo(Kind.UNAVAILABLE);
        files.on("GET /download/grande", Reply.bytes(200, "application/octet-stream", new byte[5000]));
        graph.on("GET /v1.0/drives/b!Drv-1_x/items/01ABC/content", hit -> Reply.redirect(files.base() + "/download/grande"));
        assertThat(kind(() -> docs.download("eyJ", item, false, 1000))).isEqualTo(Kind.TOO_LARGE);
        graph.on("GET /v1.0/drives/b!Drv-1_x/items/01ABC/content", Reply.json(403, "{\"error\":{\"code\":\"accessDenied\"}}"));
        assertThat(kind(() -> docs.download("eyJ", item, false, 1000))).isEqualTo(Kind.FORBIDDEN);
        graph.on("GET /v1.0/drives/b!Drv-1_x/items/01ABC/content", Reply.json(503, "{\"error\":{\"code\":\"serviceNotAvailable\"}}"));
        assertThat(kind(() -> docs.download("eyJ", item, false, 1000))).isEqualTo(Kind.UNAVAILABLE);
        assertThat(docs.provider()).isEqualTo(ConnectorProvider.MICROSOFT);
    }

    @Test
    void mesmaOrigemComparaEsquemaHostEPorta() {
        assertThat(ConnectorHttp.sameOrigin(URI.create("https://graph.microsoft.com/v1.0/a"), URI.create("https://GRAPH.microsoft.com:443/b")))
                .isTrue();
        assertThat(ConnectorHttp.sameOrigin(URI.create("https://graph.microsoft.com/a"), URI.create("https://contoso.sharepoint.com/b"))).isFalse();
        assertThat(ConnectorHttp.sameOrigin(URI.create("http://127.0.0.1:1/a"), URI.create("http://127.0.0.1:2/a"))).isFalse();
        assertThat(ConnectorHttp.sameOrigin(URI.create("https://x/a"), URI.create("http://x/a"))).isFalse();
        assertThat(ConnectorHttp.safe("invalid_client\r\nX: y")).isEqualTo("invalid_clientX:y");
        assertThat(ConnectorHttp.safe(null)).isEqualTo("-");
        assertThat(ConnectorHttp.apiReason("lixo".getBytes(StandardCharsets.UTF_8))).isEmpty();
        assertThat(ConnectorHttp.oauthError(null)).isEmpty();
    }
}
