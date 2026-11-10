package br.gov.pr.secid.workstation.infrastructure.platform.connectors;

import br.gov.pr.secid.workstation.application.connectors.ConnectorScopes;
import br.gov.pr.secid.workstation.application.connectors.ConnectorsProperties;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort.RemoteContent;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort.RemoteItem;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort.RemotePage;
import br.gov.pr.secid.workstation.application.connectors.OAuthClientPort.ExternalProfile;
import br.gov.pr.secid.workstation.application.connectors.OAuthClientPort.TokenGrant;
import br.gov.pr.secid.workstation.application.connectors.ProviderException;
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
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** OAuth do Google e Drive API v3 contra um provedor falso em 127.0.0.1: parâmetros enviados, respostas lidas e erros classificados. */
class GoogleAdaptersTest {
    final LocalProvider google;
    final ConnectorsProperties.Google cfg;
    final ConnectorHttp http = new ConnectorHttp(Duration.ofSeconds(5));
    final GoogleOAuthAdapter oauth;
    final GoogleDriveAdapter drive;

    GoogleAdaptersTest() throws IOException {
        google = new LocalProvider();
        String b = google.base();
        cfg = new ConnectorsProperties.Google("cliente-123", "segredo-xyz", "https://api.example/api/connectors/oauth/callback", b + "/o/oauth2/v2/auth",
                b + "/token", b + "/revoke", b + "/v1/userinfo", b + "/drive/v3");
        oauth = new GoogleOAuthAdapter(cfg, http);
        drive = new GoogleDriveAdapter(cfg, http);
    }

    @AfterEach
    void stop() {
        google.close();
    }

    @Test
    void urlDeAutorizacaoTemPkceOfflineEOsEscoposMinimos() {
        String url = oauth.authorizationUrl("estado-1", "desafio-1");
        assertThat(url).startsWith(google.base() + "/o/oauth2/v2/auth?");
        Map<String, String> q = LocalProvider.decode(URI.create(url).getRawQuery());
        assertThat(q).containsEntry("response_type", "code").containsEntry("client_id", "cliente-123")
                .containsEntry("redirect_uri", "https://api.example/api/connectors/oauth/callback")
                .containsEntry("scope", "openid email " + ConnectorScopes.GOOGLE_DRIVE_READONLY).containsEntry("state", "estado-1")
                .containsEntry("code_challenge", "desafio-1").containsEntry("code_challenge_method", "S256")
                .containsEntry("access_type", "offline").containsEntry("prompt", "consent");
        assertThat(url).doesNotContain("segredo-xyz");
        assertThat(oauth.provider()).isEqualTo(ConnectorProvider.GOOGLE);
    }

    @Test
    void trocaRenovaLePerfilERevoga() {
        google.on("POST /token", hit -> hit.form().get("grant_type").equals("authorization_code")
                ? Reply.json(200, "{\"access_token\":\"ya29.a\",\"refresh_token\":\"1//r\",\"expires_in\":3599,\"token_type\":\"Bearer\","
                        + "\"scope\":\"openid https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email\"}")
                : Reply.json(200, "{\"access_token\":\"ya29.b\",\"expires_in\":\"3600\"}"));
        TokenGrant g = oauth.exchange("codigo-4/0A", "verificador-xyz");
        Hit token = google.last();
        assertThat(token.header("content-type")).startsWith("application/x-www-form-urlencoded");
        assertThat(token.form()).containsEntry("code", "codigo-4/0A").containsEntry("code_verifier", "verificador-xyz")
                .containsEntry("client_secret", "segredo-xyz").containsEntry("redirect_uri", cfg.redirectUri());
        assertThat(g.accessToken()).isEqualTo("ya29.a");
        assertThat(g.refreshToken()).isEqualTo("1//r");
        assertThat(g.expiresInSeconds()).isEqualTo(3599);
        assertThat(g.scopes()).contains(ConnectorScopes.GOOGLE_DRIVE_READONLY);

        TokenGrant r = oauth.refresh("1//r");
        assertThat(google.last().form()).containsEntry("grant_type", "refresh_token").containsEntry("refresh_token", "1//r");
        assertThat(r.accessToken()).isEqualTo("ya29.b");
        assertThat(r.refreshToken()).isNull();
        assertThat(r.expiresInSeconds()).isEqualTo(3600);

        google.on("GET /v1/userinfo", Reply.json(200, "{\"sub\":\"1098\",\"email\":\"ana@exemplo.gov.br\",\"email_verified\":true}"));
        ExternalProfile me = oauth.profile("ya29.a");
        assertThat(google.last().header("authorization")).isEqualTo("Bearer ya29.a");
        assertThat(me.subject()).isEqualTo("1098");
        assertThat(me.email()).isEqualTo("ana@exemplo.gov.br");
        google.on("GET /v1/userinfo", Reply.json(200, "{\"email\":\"x@y\"}"));
        assertThat(kind(() -> oauth.profile("t"))).isEqualTo(Kind.UNAVAILABLE);

        google.on("POST /revoke", Reply.json(200, "{}"));
        assertThat(oauth.revoke("1//r")).isTrue();
        assertThat(google.last().form()).containsEntry("token", "1//r");
        assertThat(google.last().query()).as("o token vai no corpo, não na URL").isNull();
        google.on("POST /revoke", Reply.json(400, "{\"error\":\"invalid_token\"}"));
        assertThat(oauth.revoke("velho")).as("token já inválido conta como revogado").isTrue();
        google.on("POST /revoke", Reply.json(503, "{}"));
        assertThat(kind(() -> oauth.revoke("x"))).isEqualTo(Kind.UNAVAILABLE);
    }

    @Test
    void errosDoEndpointDeTokenSaoClassificados() {
        google.on("POST /token", Reply.json(400, "{\"error\":\"invalid_grant\",\"error_description\":\"Token has been expired or revoked.\"}"));
        ProviderException grant = catching(() -> oauth.refresh("r"));
        assertThat(grant.kind()).isEqualTo(Kind.INVALID_GRANT);
        assertThat(grant.getMessage()).doesNotContain("Token has been");
        google.on("POST /token", Reply.json(401, "{\"error\":\"invalid_client\"}"));
        assertThat(kind(() -> oauth.refresh("r"))).as("configuração do servidor, não da pessoa").isEqualTo(Kind.UNAVAILABLE);
        google.on("POST /token", Reply.json(400, "{\"error\":\"invalid_request\"}"));
        assertThat(kind(() -> oauth.exchange("c", "v"))).isEqualTo(Kind.REJECTED);
        google.on("POST /token", Reply.json(500, "erro interno"));
        assertThat(kind(() -> oauth.exchange("c", "v"))).isEqualTo(Kind.UNAVAILABLE);
        google.on("POST /token", Reply.json(200, "não é json"));
        assertThat(kind(() -> oauth.exchange("c", "v"))).isEqualTo(Kind.UNAVAILABLE);
        google.on("POST /token", Reply.json(200, "{\"token_type\":\"Bearer\"}"));
        assertThat(kind(() -> oauth.exchange("c", "v"))).isEqualTo(Kind.UNAVAILABLE);
    }

    @Test
    void driveListaBuscaPaginaELeMetadados() {
        google.on("GET /drive/v3/files", Reply.json(200, """
                {"nextPageToken":"~!!~AI9","files":[
                 {"id":"1AbC","name":"Relatório","mimeType":"application/vnd.google-apps.document","webViewLink":"https://docs.google.com/document/d/1AbC/edit",
                  "modifiedTime":"2026-11-08T10:00:00.000Z","version":"12"},
                 {"id":"2DeF","name":"Edital.pdf","mimeType":"application/pdf","webViewLink":"https://drive.google.com/file/d/2DeF/view",
                  "modifiedTime":"2026-11-07T10:00:00Z","size":"2048","headRevisionId":"0B-rev"},
                 {"id":"../fora","name":"inválido"},
                 {"name":"sem id"}]}"""));
        RemotePage page = drive.list("ya29.a", "O'Brien \\ x", "pagina-1", 25);
        Hit hit = google.last();
        assertThat(hit.header("authorization")).isEqualTo("Bearer ya29.a");
        assertThat(hit.params()).containsEntry("q", "trashed = false and name contains 'O\\'Brien \\\\ x'").containsEntry("pageSize", "25")
                .containsEntry("pageToken", "pagina-1").containsEntry("orderBy", "modifiedTime desc").containsEntry("supportsAllDrives", "true")
                .containsEntry("includeItemsFromAllDrives", "true");
        assertThat(hit.params().get("fields")).contains("nextPageToken", "webViewLink", "headRevisionId");
        assertThat(page.nextPageToken()).isEqualTo("~!!~AI9");
        assertThat(page.items()).extracting(RemoteItem::externalId).containsExactly("1AbC", "2DeF");
        RemoteItem doc = page.items().get(0);
        assertThat(doc.version()).isEqualTo("v12");
        assertThat(doc.modifiedAt()).isEqualTo(Instant.parse("2026-11-08T10:00:00Z"));
        assertThat(doc.sizeBytes()).isNull();
        assertThat(page.items().get(1).sizeBytes()).isEqualTo(2048L);
        assertThat(page.items().get(1).version()).isEqualTo("0B-rev");

        drive.list("t", " ", null, 10);
        assertThat(google.last().params()).containsEntry("q", "trashed = false").doesNotContainKey("pageToken");

        google.on("GET /drive/v3/files/1AbC", Reply.json(200, "{\"id\":\"1AbC\",\"name\":\"Projeto\",\"mimeType\":\"application/vnd.google-apps.folder\"}"));
        RemoteItem folder = drive.get("t", "1AbC");
        assertThat(folder.folder()).isTrue();
        assertThat(google.last().params()).containsEntry("supportsAllDrives", "true");
        assertThat(kind(() -> drive.get("t", "../../etc"))).isEqualTo(Kind.REJECTED);
        assertThat(kind(() -> drive.get("t", "naoexiste"))).isEqualTo(Kind.NOT_FOUND);
    }

    @Test
    void driveExportaPdfBaixaOriginalEClassificaFalhas() {
        byte[] pdf = "%PDF-1.7 conteudo".getBytes(StandardCharsets.US_ASCII);
        google.on("GET /drive/v3/files/1AbC/export", Reply.bytes(200, "application/pdf", pdf));
        RemoteItem doc = new RemoteItem("1AbC", "Relatório", "application/vnd.google-apps.document", null, null, null, false, null, null);
        RemoteContent exported = drive.download("ya29.a", doc, true, 1024);
        assertThat(exported.bytes()).isEqualTo(pdf);
        assertThat(exported.mimeType()).isEqualTo("application/pdf");
        assertThat(google.last().params()).containsEntry("mimeType", "application/pdf");
        assertThat(google.last().header("authorization")).isEqualTo("Bearer ya29.a");

        google.on("GET /drive/v3/files/2DeF", hit -> "media".equals(hit.params().get("alt"))
                ? Reply.bytes(200, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", new byte[] {1, 2, 3})
                : Reply.json(500, "{}"));
        RemoteItem docx = new RemoteItem("2DeF", "Ofício.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", null, null,
                3L, false, null, null);
        RemoteContent original = drive.download("t", docx, false, 1024);
        assertThat(original.bytes()).containsExactly(1, 2, 3);
        assertThat(original.mimeType()).startsWith("application/vnd.openxmlformats");

        assertThat(kind(() -> drive.download("t", doc, true, 4))).as("acima do teto: interrompe, nunca trunca").isEqualTo(Kind.TOO_LARGE);
        google.on("GET /drive/v3/files/1AbC/export",
                Reply.json(403, "{\"error\":{\"code\":403,\"errors\":[{\"reason\":\"exportSizeLimitExceeded\"}],\"message\":\"too large\"}}"));
        assertThat(kind(() -> drive.download("t", doc, true, 1024))).isEqualTo(Kind.TOO_LARGE);
        google.on("GET /drive/v3/files/1AbC/export", Reply.json(403, "{\"error\":{\"errors\":[{\"reason\":\"userRateLimitExceeded\"}]}}"));
        assertThat(kind(() -> drive.download("t", doc, true, 1024))).isEqualTo(Kind.UNAVAILABLE);
        google.on("GET /drive/v3/files/1AbC/export", Reply.json(403, "{\"error\":{\"errors\":[{\"reason\":\"insufficientFilePermissions\"}]}}"));
        assertThat(kind(() -> drive.download("t", doc, true, 1024))).isEqualTo(Kind.FORBIDDEN);
        google.on("GET /drive/v3/files/1AbC/export", Reply.json(403, "{\"error\":{\"errors\":[{\"reason\":\"fileNotDownloadable\"}]}}"));
        assertThat(kind(() -> drive.download("t", doc, true, 1024))).isEqualTo(Kind.REJECTED);
        google.on("GET /drive/v3/files/1AbC/export", Reply.json(401, "{\"error\":{\"code\":401}}"));
        assertThat(kind(() -> drive.download("t", doc, true, 1024))).isEqualTo(Kind.UNAUTHORIZED);
        google.on("GET /drive/v3/files/1AbC/export", Reply.json(429, "{}"));
        assertThat(kind(() -> drive.download("t", doc, true, 1024))).isEqualTo(Kind.UNAVAILABLE);
        google.on("GET /drive/v3/files/1AbC/export", Reply.json(415, "{\"error\":{\"code\":415}}"));
        assertThat(kind(() -> drive.download("t", doc, true, 1024))).isEqualTo(Kind.REJECTED);
        assertThat(drive.provider()).isEqualTo(ConnectorProvider.GOOGLE);
    }

    @Test
    void semRespostaViraIndisponivel() {
        int port = URI.create(google.base()).getPort();
        google.close();
        ConnectorsProperties.Google gone = new ConnectorsProperties.Google("c", "s", "r", null, "http://127.0.0.1:" + port + "/token", null,
                null, "http://127.0.0.1:" + port + "/drive/v3");
        ProviderException e = catching(() -> new GoogleOAuthAdapter(gone, http).refresh("r"));
        assertThat(e.kind()).isEqualTo(Kind.UNAVAILABLE);
        assertThat(e.status()).isZero();
        assertThat(kind(() -> new GoogleDriveAdapter(gone, http).list("t", null, null, 5))).isEqualTo(Kind.UNAVAILABLE);
    }

    static Kind kind(Runnable r) {
        return catching(r).kind();
    }

    static ProviderException catching(Runnable r) {
        try {
            r.run();
        } catch (ProviderException e) {
            return e;
        }
        throw new AssertionError("esperava ProviderException");
    }

    @Test
    void consultaDoDriveEscapaAspasEBarra() {
        assertThat(GoogleDriveAdapter.driveQuery(null)).isEqualTo("trashed = false");
        assertThat(GoogleDriveAdapter.driveQuery("a'b")).isEqualTo("trashed = false and name contains 'a\\'b'");
        assertThatThrownBy(() -> drive.download("t", new RemoteItem("a/b", "x", null, null, null, null, false, null, null), false, 1))
                .isInstanceOf(ProviderException.class);
    }
}
