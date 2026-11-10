package br.gov.pr.secid.workstation.domain.connectors;

import br.gov.pr.secid.workstation.domain.acervo.LinkMode;
import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Conta conectada (ciclo ATIVO → EXPIRADO → reconexão), estado OAuth (uso único, 10 min, returnTo interno) e tarefa importada. */
class ConnectorDomainTest {
    static final Instant NOW = Instant.parse("2026-11-09T12:00:00Z");
    final UUID owner = UUID.randomUUID();

    ConnectorAccount account() {
        return ConnectorAccount.connect(owner, ConnectorProvider.GOOGLE, "1098765", "ana@exemplo.gov.br", Set.of("openid", "drive.readonly"),
                "ctk:v1:access", "ctk:v1:refresh", NOW.plusSeconds(3600), NOW);
    }

    @Test
    void contaNasceAtivaRenovaExpiraEReconecta() {
        ConnectorAccount a = account();
        assertThat(a.status()).isEqualTo(ConnectionStatus.ATIVO);
        assertThat(a.accessFresh(NOW)).isTrue();
        assertThat(a.accessFresh(NOW.plusSeconds(3600 - 30))).as("dentro da folga de 60 s já renova").isFalse();
        assertThat(a.ownedBy(owner)).isTrue();
        assertThat(a.ownedBy(UUID.randomUUID())).isFalse();

        ConnectorAccount refreshed = a.refreshed("ctk:v1:access2", null, NOW.plusSeconds(7200));
        assertThat(refreshed.refreshTokenSealed()).as("sem refresh novo mantém o anterior").isEqualTo("ctk:v1:refresh");
        assertThat(refreshed.accessTokenSealed()).isEqualTo("ctk:v1:access2");
        assertThat(a.refreshed("x", "ctk:v1:rotated", NOW).refreshTokenSealed()).isEqualTo("ctk:v1:rotated");

        ConnectorAccount failed = refreshed.failed("PROVEDOR_INDISPONIVEL");
        assertThat(failed.status()).isEqualTo(ConnectionStatus.ERRO);
        assertThat(failed.status().usable()).isTrue();
        assertThat(failed.used(NOW).status()).isEqualTo(ConnectionStatus.ATIVO);
        assertThat(failed.used(NOW).lastError()).isNull();
        assertThat(failed.used(NOW).lastUsedAt()).isEqualTo(NOW);

        ConnectorAccount expired = refreshed.expired("invalid_grant");
        assertThat(expired.status()).isEqualTo(ConnectionStatus.EXPIRADO);
        assertThat(expired.status().usable()).isFalse();
        assertThat(expired.accessTokenSealed()).isNull();
        assertThat(expired.refreshTokenSealed()).isNull();
        assertThat(expired.accessFresh(NOW)).isFalse();

        ConnectorAccount back = expired.reconnected("ana@exemplo.gov.br", Set.of("openid"), "a3", "r3", NOW.plusSeconds(60), NOW.plusSeconds(10));
        assertThat(back.status()).isEqualTo(ConnectionStatus.ATIVO);
        assertThat(back.connectedAt()).isEqualTo(NOW.plusSeconds(10));
        assertThat(back.lastError()).isNull();
        assertThat(back.refreshTokenSealed()).isEqualTo("r3");
        assertThat(a.reconnected(null, null, "a4", null, null, NOW).refreshTokenSealed()).isEqualTo("ctk:v1:refresh");
        assertThat(ConnectionStatus.REVOGADO.usable()).isFalse();
    }

    @Test
    void contaRecusaProvedorSemOauthEDadosInvalidosENaoVazaTokens() {
        assertThatThrownBy(() -> ConnectorAccount.connect(owner, ConnectorProvider.APPLE_ICLOUD, "x", null, null, null, null, null, NOW))
                .hasMessageContaining("OAuth");
        assertThatThrownBy(() -> ConnectorAccount.connect(null, ConnectorProvider.GOOGLE, "x", null, null, null, null, null, NOW))
                .hasMessageContaining("dono");
        assertThatThrownBy(() -> ConnectorAccount.connect(owner, ConnectorProvider.GOOGLE, " ", null, null, null, null, null, NOW))
                .hasMessageContaining("externalSubject");
        assertThatThrownBy(() -> ConnectorAccount.connect(owner, ConnectorProvider.GOOGLE, "x".repeat(129), null, null, null, null, null, NOW))
                .hasMessageContaining("externalSubject");
        assertThatThrownBy(() -> ConnectorAccount.connect(owner, ConnectorProvider.GOOGLE, "x", null, null, null, null, null, null))
                .hasMessageContaining("connectedAt");
        ConnectorAccount a = account();
        assertThat(a.toString()).doesNotContain("ctk:v1").doesNotContain("ana@").contains("GOOGLE");
        assertThat(a.failed("E".repeat(80)).lastError()).hasSize(60);
        assertThat(new ConnectorAccount(null, owner, ConnectorProvider.MICROSOFT, "oid", null, null, null, null, null, null, NOW, null, null)
                .status()).isEqualTo(ConnectionStatus.ATIVO);
    }

    @Test
    void estadoOauthValeDezMinutosEVoltaSoParaCaminhoInterno() {
        String hash = "a".repeat(64);
        ConnectorOAuthState s = ConnectorOAuthState.issue(owner, ConnectorProvider.MICROSOFT, hash, "ctk:v1:verifier", null, NOW);
        assertThat(s.returnTo()).isEqualTo(ConnectorOAuthState.DEFAULT_RETURN_TO);
        assertThat(s.expiresAt()).isEqualTo(NOW.plus(ConnectorOAuthState.TTL));
        assertThat(s.expired(NOW.plusSeconds(599))).isFalse();
        assertThat(s.expired(NOW.plusSeconds(600))).isTrue();
        assertThat(ConnectorOAuthState.issue(owner, ConnectorProvider.GOOGLE, hash, "v", "/tasks/new", NOW).returnTo()).isEqualTo("/tasks/new");

        for (String ok : List.of("/tasks/new", "/settings?tab=conectores", "/", "/tasks/123/edit?from=x&y=1", "/a-b_c.d~e",
                "/tasks/new?importar=conta", "/x?next=%2Ftasks%2F1&q=a+b")) {
            assertThat(ConnectorOAuthState.safeReturnTo(ok)).as(ok).contains(ok);
        }
        for (String bad : List.of("https://evil.com", "//evil.com", "/\\evil.com", "evil.com", "/tasks#x", "/a/../b", "/a\nb", "/%2F%2Fevil",
                "/%2e%2e/x", "javascript:alert(1)", "/" + "a".repeat(200), "/tasks/new?x=<script>", "/x?a=b c")) {
            assertThat(ConnectorOAuthState.safeReturnTo(bad)).as(bad).isEmpty();
        }
        assertThat(ConnectorOAuthState.safeReturnTo("  ")).contains(ConnectorOAuthState.DEFAULT_RETURN_TO);
        assertThatThrownBy(() -> ConnectorOAuthState.issue(owner, ConnectorProvider.GOOGLE, hash, "v", "https://evil.com", NOW))
                .hasMessageContaining("returnTo");
        assertThatThrownBy(() -> ConnectorOAuthState.issue(owner, ConnectorProvider.GOOGLE, "nao-hex", "v", null, NOW))
                .hasMessageContaining("stateHash");
        assertThatThrownBy(() -> ConnectorOAuthState.issue(owner, ConnectorProvider.APPLE_ICLOUD, hash, "v", null, NOW))
                .hasMessageContaining("provedor OAuth");
        assertThatThrownBy(() -> ConnectorOAuthState.issue(owner, ConnectorProvider.GOOGLE, hash, " ", null, NOW))
                .hasMessageContaining("PKCE");
        assertThatThrownBy(() -> new ConnectorOAuthState(UUID.randomUUID(), hash, owner, ConnectorProvider.GOOGLE, "v", "/", null))
                .hasMessageContaining("expiresAt");
    }

    @Test
    void provedoresEModos() {
        assertThat(ConnectorProvider.GOOGLE.oauth()).isTrue();
        assertThat(ConnectorProvider.APPLE_ICLOUD.mode()).isEqualTo(ConnectorMode.LINK);
        assertThat(ConnectorProvider.parse("microsoft")).contains(ConnectorProvider.MICROSOFT);
        assertThat(ConnectorProvider.parse("apple-icloud")).contains(ConnectorProvider.APPLE_ICLOUD);
        assertThat(ConnectorProvider.parse("dropbox")).isEmpty();
        assertThat(ConnectorProvider.parse(null)).isEmpty();
        assertThat(ConnectorProvider.parse("x".repeat(30))).isEmpty();
    }

    @Test
    void vinculoExternoValidaOIdDoProvedor() {
        UUID task = UUID.randomUUID();
        TaskExternalLink link = new TaskExternalLink(task, null, ConnectorProvider.MICROSOFT, "b!AbC-_9~01BYE5RZ!54927", "m".repeat(300),
                LinkMode.VINCULADO, "v".repeat(250), NOW);
        assertThat(link.mimeType()).hasSize(255);
        assertThat(link.remoteVersion()).hasSize(200);
        assertThat(TaskExternalLink.validExternalId("1AbC_-x")).isTrue();
        for (String bad : List.of("../etc", "a/b", "a?b", "a b", "", "x".repeat(301))) {
            assertThat(TaskExternalLink.validExternalId(bad)).as(bad).isFalse();
        }
        assertThat(TaskExternalLink.validExternalId(null)).isFalse();
        assertThatThrownBy(() -> new TaskExternalLink(task, null, ConnectorProvider.GOOGLE, "a/b", null, LinkMode.COPIADO, null, NOW))
                .hasMessageContaining("externalId");
        assertThatThrownBy(() -> new TaskExternalLink(task, null, null, "abc", null, LinkMode.COPIADO, null, NOW))
                .hasMessageContaining("provedor");
    }

    @Test
    void tarefaImportadaGuardaFonteReferenciaEModo() {
        TaskItem t = TaskItem.fromSource(owner, null, "Relatório", null, TaskType.DOCUMENTO, "gdoc", SourceKind.GOOGLE_DOCS,
                "https://docs.google.com/document/d/1/edit", LinkMode.VINCULADO, AccessClassification.INTERNO, Visibility.PRIVADA);
        assertThat(t.state()).isEqualTo(TaskState.RASCUNHO);
        assertThat(t.sourceKind()).isEqualTo(SourceKind.GOOGLE_DOCS);
        assertThat(t.linkMode()).isEqualTo(LinkMode.VINCULADO);
        assertThat(t.sourceRef()).startsWith("https://docs.google.com/");
        assertThat(t.format()).isEqualTo("gdoc");
        assertThat(t.ownerId()).isEqualTo(owner);
        // edição preserva a origem
        assertThat(t.withDetails("Outro", null, TaskType.APRESENTACAO, null, t.priority(), null, null, t.accessClass(), t.visibility())
                .sourceRef()).isEqualTo(t.sourceRef());
        assertThatThrownBy(() -> TaskItem.fromSource(owner, null, "x", null, TaskType.DOCUMENTO, null, SourceKind.MANUAL, null,
                LinkMode.VINCULADO, AccessClassification.INTERNO, Visibility.PRIVADA)).hasMessageContaining("sourceKind");
        assertThatThrownBy(() -> TaskItem.fromSource(owner, null, "x", null, TaskType.DOCUMENTO, null, SourceKind.LINK, null, null,
                AccessClassification.INTERNO, Visibility.PRIVADA)).hasMessageContaining("linkMode");
        assertThatThrownBy(() -> TaskItem.fromSource(owner, null, "x", null, TaskType.DOCUMENTO, null, SourceKind.LINK, "h".repeat(501),
                LinkMode.VINCULADO, AccessClassification.INTERNO, Visibility.PRIVADA)).hasMessageContaining("sourceRef");
        assertThatThrownBy(() -> TaskItem.fromSource(owner, null, "x", null, TaskType.DOCUMENTO, "f".repeat(21), SourceKind.LINK, null,
                LinkMode.VINCULADO, AccessClassification.INTERNO, Visibility.PRIVADA)).hasMessageContaining("format");
    }
}
