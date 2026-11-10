package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.application.acervo.TaskService;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ConnectorAccountView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ConnectorProviderView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ExternalItemView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ExternalItemsPage;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ImportInput;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.LinkImportInput;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort.RemoteItem;
import br.gov.pr.secid.workstation.application.connectors.OAuthClientPort.TokenGrant;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.media.DetectedType;
import br.gov.pr.secid.workstation.application.media.MediaUploadService;
import br.gov.pr.secid.workstation.application.media.MemoryMedia;
import br.gov.pr.secid.workstation.application.notifications.MemoryNotifications;
import br.gov.pr.secid.workstation.application.notifications.NotificationService;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.AntivirusStatus;
import br.gov.pr.secid.workstation.domain.acervo.LinkMode;
import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.connectors.ConnectionStatus;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorAccount;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorMode;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorOAuthState;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import br.gov.pr.secid.workstation.domain.connectors.TaskExternalLink;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Conectores no serviço com portas falsas: provedores e desligamento, OAuth 2.0 + PKCE com state de uso único (10 min, ligado ao
 * usuário), tokens selados, renovação/expiração, BOLA, busca, importação VINCULADO/COPIADO (pipeline de mídia real em memória), importação
 * por link e desconexão com revogação.
 */
class ConnectorServiceTest {
    static final Instant NOW = Instant.parse("2026-11-09T12:00:00Z");
    static final RequestContext CTX = new RequestContext("127.0.0.1", "teste");
    static final String CALLBACK = "https://api.example/api/connectors/oauth/callback";
    static final String DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    /** Relógio que o teste avança (validade do state e do access token). */
    static final class TestClock extends Clock {
        Instant now = NOW;

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    final TestClock clock = new TestClock();
    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final ResourceAuthorizer authorizer;
    final List<AuditEvent> audits = new ArrayList<>();
    final ConnectorFakes.Tasks tasks = new ConnectorFakes.Tasks();
    final ConnectorFakes.Attachments attachments = new ConnectorFakes.Attachments();
    final ConnectorFakes.Links links = new ConnectorFakes.Links();
    final ConnectorFakes.Accounts accounts = new ConnectorFakes.Accounts();
    final ConnectorFakes.States states = new ConnectorFakes.States();
    final ConnectorFakes.Cipher cipher = new ConnectorFakes.Cipher();
    final ConnectorFakes.OAuth google = new ConnectorFakes.OAuth(ConnectorProvider.GOOGLE, "google-sub-1",
            Set.of("openid", "https://www.googleapis.com/auth/userinfo.email", ConnectorScopes.GOOGLE_DRIVE_READONLY));
    final ConnectorFakes.OAuth microsoft = new ConnectorFakes.OAuth(ConnectorProvider.MICROSOFT, "ms-oid-1",
            Set.of("openid", "email", "Files.Read", "User.Read"));
    final ConnectorFakes.Docs drive = new ConnectorFakes.Docs(ConnectorProvider.GOOGLE);
    final ConnectorFakes.Docs graph = new ConnectorFakes.Docs(ConnectorProvider.MICROSOFT);
    final MemoryMedia media = new MemoryMedia();
    ConnectorsProperties props = enabled();
    final User me;
    final User other;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        authorizer = new ResourceAuthorizer(users, Optional.empty());
        UUID company = UUID.randomUUID();
        me = person(company);
        other = person(company);
        drive.items.put("doc1", new RemoteItem("doc1", "Relatório anual", "application/vnd.google-apps.document",
                "https://docs.google.com/document/d/doc1/edit", NOW, null, false, null, "rev-1"));
        drive.items.put("pdf1", new RemoteItem("pdf1", "Edital.pdf", "application/pdf", "https://drive.google.com/file/d/pdf1/view", NOW, 900L,
                false, null, "rev-2"));
        drive.items.put("pasta", new RemoteItem("pasta", "Projeto", "application/vnd.google-apps.folder",
                "https://drive.google.com/drive/folders/pasta", NOW, null, true, null, "v1"));
        drive.items.put("form1", new RemoteItem("form1", "Pesquisa", "application/vnd.google-apps.form", "javascript:alert(1)", NOW, null, false,
                null, "v2"));
        graph.items.put("b!drv~01GRANDE", new RemoteItem("b!drv~01GRANDE", "Ofício.docx", DOCX_MIME,
                "https://contoso-my.sharepoint.com/personal/ana/Documents/Oficio.docx", NOW, 5_000_000L, false, null, "ctag-1"));
        graph.items.put("b!drv~01PEQUENO", new RemoteItem("b!drv~01PEQUENO", "Memorando.docx", DOCX_MIME,
                "https://contoso-my.sharepoint.com/personal/ana/Documents/Memorando.docx", NOW, 10_000L, false, null, "ctag-2"));
        graph.originals.put("b!drv~01GRANDE", ConnectorFakes.docx());
        graph.originals.put("b!drv~01PEQUENO", ConnectorFakes.docx());
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    static ConnectorsProperties enabled() {
        return new ConnectorsProperties(true, "chave", "https://app.example/", null, 0,
                new ConnectorsProperties.Google("g-client", "g-secret", CALLBACK, null, null, null, null, null),
                new ConnectorsProperties.Microsoft("m-client", "m-secret", CALLBACK, null, null, null, 0));
    }

    User person(UUID company) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setRole(Role.USER);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setCompanyId(company);
        u.setStatus(AccountStatus.ACTIVE);
        people.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    ConnectorService service() {
        DefaultListableBeanFactory beans = new DefaultListableBeanFactory();
        beans.registerSingleton("cipher", cipher);
        beans.registerSingleton("google", google);
        beans.registerSingleton("microsoft", microsoft);
        beans.registerSingleton("drive", drive);
        beans.registerSingleton("graph", graph);
        TaskService taskService = new TaskService(tasks, users, authorizer, audits::add,
                new NotificationService(new MemoryNotifications(), users, authorizer, clock), clock);
        MediaUploadService mediaService = new MediaUploadService(media.inspector, Optional.empty(), media.storage, media.repo, authorizer,
                media.props, "ws-media", clock);
        return new ConnectorService(props, accounts, states, beans.getBeanProvider(TokenCipherPort.class),
                beans.getBeanProvider(OAuthClientPort.class), beans.getBeanProvider(ExternalDocPort.class), authorizer,
                new ConnectorImportWriter(taskService, attachments, links, clock), mediaService, audits::add, clock);
    }

    static Map<String, String> query(String url) {
        Map<String, String> out = new LinkedHashMap<>();
        for (String kv : URI.create(url).getRawQuery().split("&")) {
            String[] p = kv.split("=", 2);
            out.put(p[0], p.length > 1 ? p[1] : "");
        }
        return out;
    }

    /** Fluxo completo: authorize → (provedor) → callback; devolve o destino do 302. */
    String connect(ConnectorService s, User u, ConnectorProvider p, String returnTo, String code) {
        String url = s.authorize(cu(u), p.name(), returnTo).url();
        return s.callback(query(url).get("state"), code, null, CTX);
    }

    ConnectorAccount onlyAccount(User u, ConnectorProvider p) {
        return accounts.rows.values().stream().filter(a -> a.ownerId().equals(u.getId()) && a.provider() == p).findFirst().orElseThrow();
    }

    static ApiException api(Runnable r) {
        try {
            r.run();
        } catch (ApiException e) {
            return e;
        }
        throw new AssertionError("esperava ApiException");
    }

    // ------------------------------------------------------------------------------------------------ provedores

    @Test
    void provedoresDesligadosPorPadraoEICloudSempreViaLink() {
        props = ConnectorsProperties.disabled();
        Map<ConnectorProvider, ConnectorProviderView> v = new LinkedHashMap<>();
        service().providers().forEach(p -> v.put(p.provider(), p));
        assertThat(v.get(ConnectorProvider.GOOGLE).enabled()).isFalse();
        assertThat(v.get(ConnectorProvider.GOOGLE).mode()).isEqualTo(ConnectorMode.OAUTH);
        assertThat(v.get(ConnectorProvider.GOOGLE).scopes()).containsExactly("openid", "email", ConnectorScopes.GOOGLE_DRIVE_READONLY);
        assertThat(v.get(ConnectorProvider.MICROSOFT).enabled()).isFalse();
        assertThat(v.get(ConnectorProvider.MICROSOFT).scopes()).containsExactly("openid", "email", "offline_access", "User.Read", "Files.Read");
        assertThat(v.get(ConnectorProvider.APPLE_ICLOUD).enabled()).isTrue();
        assertThat(v.get(ConnectorProvider.APPLE_ICLOUD).mode()).isEqualTo(ConnectorMode.LINK);
        assertThat(v.get(ConnectorProvider.APPLE_ICLOUD).scopes()).isEmpty();

        props = enabled();
        assertThat(service().providers()).allMatch(ConnectorProviderView::enabled);
        cipher.available = false;   // sem chave de cifra: nunca texto puro, conector desabilitado
        assertThat(service().enabled(ConnectorProvider.GOOGLE)).isFalse();
        cipher.available = true;
        props = new ConnectorsProperties(true, "k", null, null, 0, new ConnectorsProperties.Google("g", "", CALLBACK, null, null, null, null, null),
                null);
        assertThat(service().enabled(ConnectorProvider.GOOGLE)).as("sem segredo").isFalse();
        assertThat(service().enabled(ConnectorProvider.MICROSOFT)).as("sem client id").isFalse();
    }

    @Test
    void authorizeValidaProvedorDestinoEDesligamento() {
        ConnectorService s = service();
        assertThat(api(() -> s.authorize(cu(me), "dropbox", null)).status()).isEqualTo(400);
        ApiException apple = api(() -> s.authorize(cu(me), "APPLE_ICLOUD", null));
        assertThat(apple.code()).isEqualTo(ApiException.VALIDACAO);
        assertThat(apple.details()).containsKey("fields");
        assertThat(api(() -> s.authorize(cu(me), "google", "https://evil.com")).code()).isEqualTo(ApiException.VALIDACAO);
        assertThat(api(() -> s.authorize(cu(me), "google", "//evil.com")).status()).isEqualTo(400);
        assertThat(states.rows).isEmpty();

        String url = s.authorize(cu(me), "google", "/tasks/new?importar=conta").url();
        Map<String, String> q = query(url);
        assertThat(q.get("state")).matches("[A-Za-z0-9_-]{43}");
        ConnectorOAuthState st = states.rows.values().iterator().next();
        assertThat(st.stateHash()).isEqualTo(Pkce.sha256Hex(q.get("state"))).doesNotContain(q.get("state"));
        assertThat(st.ownerId()).isEqualTo(me.getId());
        assertThat(st.returnTo()).isEqualTo("/tasks/new?importar=conta");
        assertThat(st.expiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(10)));
        String verifier = cipher.open(st.codeVerifierSealed(), ConnectorService.verifierContext(st.stateHash()));
        assertThat(Pkce.challenge(verifier)).isEqualTo(q.get("code_challenge"));

        props = ConnectorsProperties.disabled();
        ApiException off = api(() -> service().authorize(cu(me), "google", null));
        assertThat(off.code()).isEqualTo(ConnectorErrors.CONECTOR_DESABILITADO);
        assertThat(off.status()).isEqualTo(503);
    }

    // ------------------------------------------------------------------------------------------------ callback

    @Test
    void callbackTrocaOCodigoComPkceSelaOsTokensEVoltaAoFront() {
        ConnectorService s = service();
        String url = s.authorize(cu(me), "GOOGLE", "/tasks/new?importar=conta").url();
        String state = query(url).get("state");
        String challenge = query(url).get("code_challenge");

        String back = s.callback(state, "codigo-1", null, CTX);
        assertThat(back).isEqualTo("https://app.example/tasks/new?importar=conta&conector=ok");
        String exchange = google.calls.get(0);
        assertThat(exchange).startsWith("exchange:codigo-1:");
        assertThat(Pkce.challenge(exchange.substring("exchange:codigo-1:".length()))).isEqualTo(challenge);

        ConnectorAccount a = onlyAccount(me, ConnectorProvider.GOOGLE);
        assertThat(a.status()).isEqualTo(ConnectionStatus.ATIVO);
        assertThat(a.externalSubject()).isEqualTo("google-sub-1");
        assertThat(a.accessTokenSealed()).startsWith("sealed:").doesNotContain("access-codigo-1");
        assertThat(cipher.open(a.accessTokenSealed(), ConnectorService.tokenContext(me.getId(), ConnectorProvider.GOOGLE, "access")))
                .isEqualTo("access-codigo-1");
        assertThat(cipher.open(a.refreshTokenSealed(), ConnectorService.tokenContext(me.getId(), ConnectorProvider.GOOGLE, "refresh")))
                .isEqualTo("refresh-codigo-1");
        assertThat(a.accessExpiresAt()).isEqualTo(NOW.plusSeconds(3600));
        AuditEvent ok = audits.stream().filter(e -> e.action().equals(AuditActions.CONNECTOR_CONNECTED)).findFirst().orElseThrow();
        assertThat(ok.actorId()).isEqualTo(me.getId());
        assertThat(ok.metadata().toString()).doesNotContain("access-codigo-1").doesNotContain("pessoa@");

        // uso único: o mesmo state de novo não conecta nada
        assertThat(s.callback(state, "codigo-1", null, CTX)).isEqualTo("https://app.example/settings?tab=conectores&conector=erro&motivo=ESTADO_INVALIDO");

        List<ConnectorAccountView> mine = s.accounts(cu(me));
        assertThat(mine).singleElement().satisfies(v -> {
            assertThat(v.accountEmail()).isEqualTo("pessoa@exemplo.gov.br");
            assertThat(v.scopes()).contains(ConnectorScopes.GOOGLE_DRIVE_READONLY).isSorted();
            assertThat(v.status()).isEqualTo(ConnectionStatus.ATIVO);
        });
        assertThat(s.accounts(cu(other))).isEmpty();
    }

    @Test
    void callbackRecusadoVoltaComMotivoSemConectar() {
        ConnectorService s = service();
        assertThat(s.callback(null, "x", null, CTX)).endsWith("/settings?tab=conectores&conector=erro&motivo=ESTADO_INVALIDO");
        assertThat(s.callback("curto", "x", null, CTX)).endsWith("motivo=ESTADO_INVALIDO");

        String denied = query(s.authorize(cu(me), "google", null).url()).get("state");
        assertThat(s.callback(denied, null, "access_denied", CTX)).isEqualTo("https://app.example/settings?tab=conectores&conector=erro&motivo=ACESSO_NEGADO");
        assertThat(audits).anyMatch(e -> e.action().equals(AuditActions.CONNECTOR_CONNECT_FAILED) && e.result().equals(AuditEvent.FALHA));
        String providerError = query(s.authorize(cu(me), "google", null).url()).get("state");
        assertThat(s.callback(providerError, null, "server_error", CTX)).endsWith("motivo=PROVEDOR_INDISPONIVEL");
        String noCode = query(s.authorize(cu(me), "google", null).url()).get("state");
        assertThat(s.callback(noCode, " ", null, CTX)).endsWith("motivo=ESTADO_INVALIDO");

        String late = query(s.authorize(cu(me), "google", null).url()).get("state");
        clock.now = NOW.plus(Duration.ofMinutes(10));
        assertThat(s.callback(late, "c", null, CTX)).as("vencido em 10 min").endsWith("motivo=ESTADO_INVALIDO");
        clock.now = NOW;

        google.onExchange = code -> new TokenGrant("acc", "ref", 3600, Set.of("openid", "email"));
        String noDrive = query(s.authorize(cu(me), "google", null).url()).get("state");
        assertThat(s.callback(noDrive, "c", null, CTX)).endsWith("motivo=ESCOPO_INSUFICIENTE");
        assertThat(google.revoked).containsExactly("ref");

        google.onExchange = code -> {
            throw new ProviderException(ProviderException.Kind.INVALID_GRANT, 400, "invalid_grant");
        };
        String reused = query(s.authorize(cu(me), "google", null).url()).get("state");
        assertThat(s.callback(reused, "c", null, CTX)).endsWith("motivo=ESTADO_INVALIDO");
        google.onExchange = code -> {
            throw new ProviderException(ProviderException.Kind.UNAVAILABLE, 503, "fora");
        };
        String down = query(s.authorize(cu(me), "google", null).url()).get("state");
        assertThat(s.callback(down, "c", null, CTX)).endsWith("motivo=PROVEDOR_INDISPONIVEL");
        google.onExchange = code -> {
            throw new IllegalStateException("bug");
        };
        String bug = query(s.authorize(cu(me), "google", null).url()).get("state");
        assertThat(s.callback(bug, "c", null, CTX)).endsWith("motivo=ERRO_INTERNO");

        String suspended = query(s.authorize(cu(other), "google", null).url()).get("state");
        other.setStatus(AccountStatus.SUSPENDED);
        assertThat(s.callback(suspended, "c", null, CTX)).endsWith("motivo=ESTADO_INVALIDO");

        String offLater = query(s.authorize(cu(me), "microsoft", "/tasks/new").url()).get("state");
        props = new ConnectorsProperties(false, "chave", "https://app.example", null, 0, null, null);   // desligado entre ida e volta
        assertThat(service().callback(offLater, "c", null, CTX)).isEqualTo("https://app.example/tasks/new?conector=erro&motivo=CONECTOR_DESABILITADO");
        assertThat(accounts.rows).isEmpty();
    }

    @Test
    void reconectarAMesmaContaReaproveitaALinhaEVoltaAAtivo() {
        ConnectorService s = service();
        connect(s, me, ConnectorProvider.MICROSOFT, null, "c1");
        ConnectorAccount first = onlyAccount(me, ConnectorProvider.MICROSOFT);
        accounts.save(first.expired("RENOVACAO_RECUSADA"));
        clock.now = NOW.plusSeconds(60);
        assertThat(connect(s, me, ConnectorProvider.MICROSOFT, null, "c2")).endsWith("conector=ok");
        assertThat(accounts.rows).hasSize(1);
        ConnectorAccount again = onlyAccount(me, ConnectorProvider.MICROSOFT);
        assertThat(again.id()).isEqualTo(first.id());
        assertThat(again.status()).isEqualTo(ConnectionStatus.ATIVO);
        assertThat(again.connectedAt()).isEqualTo(NOW.plusSeconds(60));
    }

    // ------------------------------------------------------------------------------------------------ BOLA e itens

    @Test
    void contaDeOutraPessoaResponde404ComoInexistente() {
        ConnectorService s = service();
        connect(s, other, ConnectorProvider.GOOGLE, null, "c");
        UUID alheia = onlyAccount(other, ConnectorProvider.GOOGLE).id();
        for (Runnable r : List.<Runnable>of(() -> s.items(cu(me), alheia, null, null, null),
                () -> s.importItem(cu(me), alheia, new ImportInput("doc1", "VINCULADO", null), CTX),
                () -> s.disconnect(cu(me), alheia, CTX), () -> s.items(cu(me), UUID.randomUUID(), null, null, null))) {
            AuthorizationTrail.clear();
            ApiException e = api(r);
            assertThat(e.status()).isEqualTo(404);
            assertThat(e.code()).isEqualTo(ApiException.NAO_ENCONTRADO);
            assertThat(AuthorizationTrail.last()).isEqualTo("CONNECTOR");
        }
        assertThat(accounts.rows).containsKey(alheia);
        assertThat(drive.tokens).isEmpty();
    }

    @Test
    void itensClassificadosComOsFormatosQueOServidorCopia() {
        ConnectorService s = service();
        connect(s, me, ConnectorProvider.GOOGLE, null, "c");
        UUID acc = onlyAccount(me, ConnectorProvider.GOOGLE).id();
        ExternalItemsPage page = s.items(cu(me), acc, null, null, null);
        Map<String, ExternalItemView> byId = new LinkedHashMap<>();
        page.items().forEach(i -> byId.put(i.externalId(), i));
        assertThat(byId.get("doc1").sourceKind()).isEqualTo(SourceKind.GOOGLE_DOCS);
        assertThat(byId.get("doc1").taskType()).isEqualTo(TaskType.DOCUMENTO);
        assertThat(byId.get("doc1").exportFormats()).containsExactly("PDF");
        assertThat(byId.get("pdf1").exportFormats()).containsExactly("PDF");
        assertThat(byId.get("pdf1").sizeBytes()).isEqualTo(900L);
        assertThat(byId.get("pasta").taskType()).isEqualTo(TaskType.PASTA);
        assertThat(byId.get("pasta").exportFormats()).isEmpty();
        assertThat(byId.get("form1").exportFormats()).isEmpty();
        assertThat(byId.get("form1").webUrl()).as("só https vai à tela").isNull();
        assertThat(page.items()).allMatch(ExternalItemView::linkable);
        assertThat(drive.tokens).containsOnly("access-c");
        assertThat(onlyAccount(me, ConnectorProvider.GOOGLE).lastUsedAt()).isEqualTo(NOW);

        assertThat(s.items(cu(me), acc, "relat", null, 1).items()).extracting(ExternalItemView::externalId).containsExactly("doc1");
        assertThat(s.items(cu(me), acc, null, null, 1).nextPageToken()).isEqualTo("pagina-2");
        assertThat(s.items(cu(me), acc, null, null, 500).items()).hasSize(4);
        assertThat(api(() -> s.items(cu(me), acc, "x".repeat(101), null, null)).code()).isEqualTo(ApiException.VALIDACAO);
        assertThat(api(() -> s.items(cu(me), acc, null, "com espaço", null)).status()).isEqualTo(400);

        connect(s, me, ConnectorProvider.MICROSOFT, null, "m");
        UUID ms = onlyAccount(me, ConnectorProvider.MICROSOFT).id();
        Map<String, ExternalItemView> graphItems = new LinkedHashMap<>();
        s.items(cu(me), ms, null, null, null).items().forEach(i -> graphItems.put(i.externalId(), i));
        assertThat(graphItems.get("b!drv~01GRANDE").sourceKind()).isEqualTo(SourceKind.MS_WORD);
        assertThat(graphItems.get("b!drv~01GRANDE").exportFormats()).as("acima de 2 MB não converte em PDF").containsExactly("DOCX");
        assertThat(graphItems.get("b!drv~01PEQUENO").exportFormats()).containsExactly("PDF", "DOCX");

        props = ConnectorsProperties.disabled();
        assertThat(api(() -> service().items(cu(me), acc, null, null, null)).code()).isEqualTo(ConnectorErrors.CONECTOR_DESABILITADO);
    }

    // ------------------------------------------------------------------------------------------------ tokens

    @Test
    void renovaOTokenVencidoERepeteUmaVezNa401() {
        ConnectorService s = service();
        connect(s, me, ConnectorProvider.MICROSOFT, null, "c");
        UUID acc = onlyAccount(me, ConnectorProvider.MICROSOFT).id();
        clock.now = NOW.plus(Duration.ofHours(2));
        s.items(cu(me), acc, null, null, null);
        assertThat(microsoft.calls).contains("refresh:refresh-c");
        ConnectorAccount renewed = onlyAccount(me, ConnectorProvider.MICROSOFT);
        assertThat(cipher.open(renewed.refreshTokenSealed(), ConnectorService.tokenContext(me.getId(), ConnectorProvider.MICROSOFT, "refresh")))
                .as("a Microsoft gira o refresh token").isEqualTo("refresh-girado");
        assertThat(graph.tokens).containsExactly("access-renovado-1");

        // 401 uma vez: renova e repete
        graph.failure = token -> token.equals("access-renovado-1")
                ? new ProviderException(ProviderException.Kind.UNAUTHORIZED, 401, "token recusado") : null;
        assertThat(s.items(cu(me), acc, null, null, null).items()).isNotEmpty();
        assertThat(graph.tokens).endsWith("access-renovado-1", "access-renovado-2");
        assertThat(onlyAccount(me, ConnectorProvider.MICROSOFT).status()).isEqualTo(ConnectionStatus.ATIVO);
    }

    @Test
    void renovacaoRecusadaExpiraAContaEDevolve409() {
        ConnectorService s = service();
        connect(s, me, ConnectorProvider.GOOGLE, null, "c");
        UUID acc = onlyAccount(me, ConnectorProvider.GOOGLE).id();
        google.onRefresh = rt -> {
            throw new ProviderException(ProviderException.Kind.INVALID_GRANT, 400, "invalid_grant");
        };
        clock.now = NOW.plus(Duration.ofHours(2));
        ApiException e = api(() -> s.items(cu(me), acc, null, null, null));
        assertThat(e.code()).isEqualTo(ConnectorErrors.CONECTOR_EXPIRADO);
        assertThat(e.status()).isEqualTo(409);
        ConnectorAccount expired = onlyAccount(me, ConnectorProvider.GOOGLE);
        assertThat(expired.status()).isEqualTo(ConnectionStatus.EXPIRADO);
        assertThat(expired.accessTokenSealed()).isNull();
        assertThat(expired.refreshTokenSealed()).isNull();
        int calls = google.calls.size();
        assertThat(api(() -> s.items(cu(me), acc, null, null, null)).code()).isEqualTo(ConnectorErrors.CONECTOR_EXPIRADO);
        assertThat(google.calls).as("expirada nem chama o provedor").hasSize(calls);
        assertThat(s.accounts(cu(me))).singleElement().extracting(ConnectorAccountView::lastError).isEqualTo("RENOVACAO_RECUSADA");
    }

    @Test
    void falhasDoProvedorViramCodigosDoContrato() {
        ConnectorService s = service();
        connect(s, me, ConnectorProvider.GOOGLE, null, "c");
        UUID acc = onlyAccount(me, ConnectorProvider.GOOGLE).id();
        drive.failure = token -> new ProviderException(ProviderException.Kind.UNAVAILABLE, 503, "fora");
        ApiException down = api(() -> s.items(cu(me), acc, null, null, null));
        assertThat(down.code()).isEqualTo(ConnectorErrors.PROVEDOR_INDISPONIVEL);
        assertThat(down.status()).isEqualTo(502);
        assertThat(onlyAccount(me, ConnectorProvider.GOOGLE).status()).isEqualTo(ConnectionStatus.ERRO);
        drive.failure = token -> new ProviderException(ProviderException.Kind.FORBIDDEN, 403, "negado");
        assertThat(api(() -> s.items(cu(me), acc, null, null, null)).code()).isEqualTo(ApiException.ACESSO_NEGADO);
        drive.failure = token -> null;
        assertThat(s.items(cu(me), acc, null, null, null).items()).isNotEmpty();
        assertThat(onlyAccount(me, ConnectorProvider.GOOGLE).status()).as("sucesso limpa o erro").isEqualTo(ConnectionStatus.ATIVO);
        assertThat(api(() -> s.importItem(cu(me), acc, new ImportInput("sumiu", "VINCULADO", null), CTX)).status()).isEqualTo(404);
        // dois 401 seguidos: renova uma vez e, se persistir, a conta expira
        drive.failure = token -> new ProviderException(ProviderException.Kind.UNAUTHORIZED, 401, "x");
        assertThat(api(() -> s.items(cu(me), acc, null, null, null)).code()).isEqualTo(ConnectorErrors.CONECTOR_EXPIRADO);
    }

    @Test
    void tokenSeladoParaOutraPessoaNaoAbreNoutraLinha() {
        ConnectorService s = service();
        connect(s, me, ConnectorProvider.GOOGLE, null, "c");
        connect(s, other, ConnectorProvider.GOOGLE, null, "d");
        ConnectorAccount mine = onlyAccount(me, ConnectorProvider.GOOGLE);
        ConnectorAccount theirs = onlyAccount(other, ConnectorProvider.GOOGLE);
        // alguém com acesso ao banco copia o token selado de uma conta para a outra: não abre (contexto = dono + provedor)
        accounts.save(new ConnectorAccount(theirs.id(), theirs.ownerId(), theirs.provider(), theirs.externalSubject(), null, theirs.scopes(),
                ConnectionStatus.ATIVO, mine.accessTokenSealed(), mine.refreshTokenSealed(), NOW.plusSeconds(3600), NOW, null, null));
        assertThat(api(() -> s.items(cu(other), theirs.id(), null, null, null)).code()).isEqualTo(ConnectorErrors.CONECTOR_EXPIRADO);
        assertThat(drive.tokens).doesNotContain("access-c");
        ConnectorAccount burned = onlyAccount(other, ConnectorProvider.GOOGLE);
        assertThat(burned.status()).as("token que não abre: a conta expira e pede reconexão").isEqualTo(ConnectionStatus.EXPIRADO);
        assertThat(burned.lastError()).isEqualTo("TOKEN_ILEGIVEL");
        assertThat(onlyAccount(me, ConnectorProvider.GOOGLE).status()).isEqualTo(ConnectionStatus.ATIVO);
    }

    // ------------------------------------------------------------------------------------------------ importação

    @Test
    void importaVinculadoGuardaAReferenciaEAOrigemExterna() {
        ConnectorService s = service();
        connect(s, me, ConnectorProvider.GOOGLE, null, "c");
        UUID acc = onlyAccount(me, ConnectorProvider.GOOGLE).id();
        TaskView v = s.importItem(cu(me), acc, new ImportInput("doc1", "vinculado", null), CTX);
        assertThat(v.sourceKind()).isEqualTo(SourceKind.GOOGLE_DOCS);
        assertThat(v.linkMode()).isEqualTo(LinkMode.VINCULADO);
        assertThat(v.sourceRef()).isEqualTo("https://docs.google.com/document/d/doc1/edit");
        assertThat(v.type()).isEqualTo(TaskType.DOCUMENTO);
        assertThat(v.title()).isEqualTo("Relatório anual");
        assertThat(v.state()).isEqualTo(TaskState.DISPONIVEL);
        assertThat(v.ownerId()).isEqualTo(me.getId());
        assertThat(v.references()).singleElement().satisfies(r -> {
            assertThat(r.label()).isEqualTo("Google Docs");
            assertThat(r.url()).isEqualTo(v.sourceRef());
        });
        assertThat(tasks.rows.get(v.id()).task().format()).isEqualTo("gdoc");
        TaskExternalLink link = links.rows.get(v.id());
        assertThat(link.accountId()).isEqualTo(acc);
        assertThat(link.externalId()).isEqualTo("doc1");
        assertThat(link.remoteVersion()).isEqualTo("rev-1");
        assertThat(link.linkMode()).isEqualTo(LinkMode.VINCULADO);
        assertThat(attachments.rows).isEmpty();
        assertThat(drive.downloads).isEmpty();
        assertThat(audits).extracting(AuditEvent::action).contains(AuditActions.TASK_CREATED, AuditActions.CONNECTOR_IMPORTED);
        AuditEvent imported = audits.stream().filter(e -> e.action().equals(AuditActions.CONNECTOR_IMPORTED)).findFirst().orElseThrow();
        assertThat(imported.metadata()).containsEntry("linkMode", "VINCULADO").containsEntry("sourceKind", "GOOGLE_DOCS");
        assertThat(tasks.logs).extracting(l -> l.toState()).containsExactly(TaskState.RASCUNHO, TaskState.DISPONIVEL);
    }

    @Test
    void importaCopiadoExportaPdfOuOriginalEGuardaComoAnexo() {
        ConnectorService s = service();
        connect(s, me, ConnectorProvider.GOOGLE, null, "c");
        UUID acc = onlyAccount(me, ConnectorProvider.GOOGLE).id();
        TaskView doc = s.importItem(cu(me), acc, new ImportInput("doc1", "COPIADO", "  Meu título  "), CTX);
        assertThat(doc.title()).isEqualTo("Meu título");
        assertThat(doc.linkMode()).isEqualTo(LinkMode.COPIADO);
        assertThat(drive.downloads).containsExactly("pdf:doc1");
        assertThat(attachments.findByTask(doc.id())).singleElement().satisfies(a -> {
            assertThat(a.mimeType()).isEqualTo("application/pdf");
            assertThat(a.fileName()).isEqualTo("Relatório anual.pdf");
            assertThat(a.isPrimary()).isTrue();
            assertThat(a.antivirusStatus()).as("sem antivírus configurado fica em quarentena").isEqualTo(AntivirusStatus.PENDENTE);
            assertThat(media.rows).containsKey(a.mediaObjectId());
        });
        assertThat(tasks.rows.get(doc.id()).task().format()).isEqualTo("pdf");
        assertThat(media.blobs).hasSize(1);

        connect(s, me, ConnectorProvider.MICROSOFT, null, "m");
        UUID ms = onlyAccount(me, ConnectorProvider.MICROSOFT).id();
        TaskView big = s.importItem(cu(me), ms, new ImportInput("b!drv~01GRANDE", "COPIADO", null), CTX);
        assertThat(graph.downloads).containsExactly("original:b!drv~01GRANDE");
        assertThat(big.sourceKind()).isEqualTo(SourceKind.MS_WORD);
        assertThat(big.title()).isEqualTo("Ofício");
        assertThat(attachments.findByTask(big.id())).singleElement().extracting(a -> a.mimeType()).isEqualTo(DetectedType.DOCX.mime());
        assertThat(tasks.rows.get(big.id()).task().format()).isEqualTo("docx");

        graph.pdfRejected = true;   // conversão do Graph recusada → cai para o original
        TaskView small = s.importItem(cu(me), ms, new ImportInput("b!drv~01PEQUENO", "COPIADO", null), CTX);
        assertThat(graph.downloads).endsWith("pdf:b!drv~01PEQUENO", "original:b!drv~01PEQUENO");
        assertThat(attachments.findByTask(small.id())).singleElement().extracting(a -> a.fileName()).isEqualTo("Memorando.docx");
    }

    @Test
    void importacaoRecusaEntradaInvalidaEItemQueNaoDaParaCopiar() {
        ConnectorService s = service();
        connect(s, me, ConnectorProvider.GOOGLE, null, "c");
        UUID acc = onlyAccount(me, ConnectorProvider.GOOGLE).id();
        assertThat(api(() -> s.importItem(cu(me), acc, new ImportInput("../etc", "VINCULADO", null), CTX)).code()).isEqualTo(ApiException.VALIDACAO);
        assertThat(api(() -> s.importItem(cu(me), acc, new ImportInput("doc1", "MOVER", null), CTX)).status()).isEqualTo(400);
        assertThat(api(() -> s.importItem(cu(me), acc, new ImportInput("doc1", null, null), CTX)).status()).isEqualTo(400);
        assertThat(api(() -> s.importItem(cu(me), acc, new ImportInput("doc1", "COPIADO", "t".repeat(201)), CTX)).status()).isEqualTo(400);
        assertThat(api(() -> s.importItem(cu(me), acc, null, CTX)).status()).isEqualTo(400);
        assertThat(api(() -> s.importItem(cu(me), acc, new ImportInput("pasta", "COPIADO", null), CTX)).code()).isEqualTo(ApiException.VALIDACAO);
        assertThat(api(() -> s.importItem(cu(me), acc, new ImportInput("form1", "COPIADO", null), CTX)).code()).isEqualTo(ApiException.VALIDACAO);
        // pasta e formulário podem ser VINCULADOS
        assertThat(s.importItem(cu(me), acc, new ImportInput("pasta", "VINCULADO", null), CTX).type()).isEqualTo(TaskType.PASTA);
        TaskView form = s.importItem(cu(me), acc, new ImportInput("form1", "VINCULADO", null), CTX);
        assertThat(form.sourceRef()).as("sem URL https, a referência é provedor:id").isEqualTo("google:form1");
        assertThat(form.references()).isEmpty();

        drive.pdf = "não é PDF".getBytes(java.nio.charset.StandardCharsets.UTF_8);   // o pipeline de mídia confere o tipo real
        ApiException rejected = api(() -> s.importItem(cu(me), acc, new ImportInput("doc1", "COPIADO", null), CTX));
        assertThat(rejected.status()).isEqualTo(400);
        assertThat(rejected.code()).isEqualTo(ApiException.VALIDACAO);
        assertThat(rejected.details()).containsEntry("reason", "TIPO_NAO_PERMITIDO");
        assertThat(attachments.rows).isEmpty();
    }

    @Test
    void importacaoPorLinkFuncionaSemConectorEOResteERecusado() {
        props = ConnectorsProperties.disabled();   // link não chama provedor: funciona com os conectores desligados
        ConnectorService s = service();
        TaskView v = s.linkImport(cu(me), new LinkImportInput(" https://docs.google.com/document/d/1AbC/edit ", null), CTX);
        assertThat(v.sourceKind()).isEqualTo(SourceKind.GOOGLE_DOCS);
        assertThat(v.linkMode()).isEqualTo(LinkMode.VINCULADO);
        assertThat(v.sourceRef()).isEqualTo("https://docs.google.com/document/d/1AbC/edit");
        assertThat(v.title()).isEqualTo("Google Docs (link)");
        assertThat(tasks.rows.get(v.id()).task().format()).isEqualTo("url");
        assertThat(links.rows).isEmpty();
        TaskView keynote = s.linkImport(cu(me), new LinkImportInput("https://www.icloud.com/keynote/0abc#Apresentacao", "Aula 3"), CTX);
        assertThat(keynote.sourceKind()).isEqualTo(SourceKind.APPLE_KEYNOTE);
        assertThat(keynote.type()).isEqualTo(TaskType.APRESENTACAO);
        assertThat(keynote.title()).isEqualTo("Aula 3");
        TaskView page = s.linkImport(cu(me), new LinkImportInput("https://contoso.sharepoint.com/sites/obras/SitePages/Inicio.aspx", null), CTX);
        assertThat(page.sourceKind()).isEqualTo(SourceKind.MS_SHAREPOINT_PAGE);
        assertThat(page.type()).isEqualTo(TaskType.PAGINA_WEB);
        assertThat(audits).filteredOn(e -> e.action().equals(AuditActions.CONNECTOR_IMPORTED)).hasSize(3)
                .allSatisfy(e -> assertThat(e.metadata()).containsEntry("via", "LINK"));

        for (String bad : List.of("http://docs.google.com/document/d/1", "https://exemplo.gov.br/doc", "https://user:pw@drive.google.com/file/d/1",
                "https://drive.google.com/" + "a".repeat(500), "")) {
            assertThat(api(() -> s.linkImport(cu(me), new LinkImportInput(bad, null), CTX)).code()).as(bad).isEqualTo(ApiException.VALIDACAO);
        }
        assertThat(api(() -> s.linkImport(cu(me), null, CTX)).status()).isEqualTo(400);
        assertThat(api(() -> s.linkImport(cu(me), new LinkImportInput("https://drive.google.com/file/d/1", "t".repeat(201)), CTX)).status())
                .isEqualTo(400);
    }

    // ------------------------------------------------------------------------------------------------ desconexão

    @Test
    void desconectarRevogaNoGoogleTiraOsTokensEApaga() {
        ConnectorService s = service();
        connect(s, me, ConnectorProvider.GOOGLE, null, "c");
        ConnectorAccount a = onlyAccount(me, ConnectorProvider.GOOGLE);
        s.disconnect(cu(me), a.id(), CTX);
        assertThat(google.revoked).containsExactly("refresh-c");
        assertThat(accounts.rows).doesNotContainKey(a.id());
        assertThat(accounts.history).anySatisfy(h -> {
            assertThat(h.status()).as("tokens saem antes da revogação").isEqualTo(ConnectionStatus.REVOGADO);
            assertThat(h.accessTokenSealed()).isNull();
            assertThat(h.refreshTokenSealed()).isNull();
        });
        assertThat(audits).filteredOn(e -> e.action().equals(AuditActions.CONNECTOR_DISCONNECTED)).singleElement()
                .satisfies(e -> assertThat(e.metadata()).containsEntry("revokedAtProvider", true).containsEntry("provider", "GOOGLE"));

        connect(s, me, ConnectorProvider.MICROSOFT, null, "m");
        ConnectorAccount m = onlyAccount(me, ConnectorProvider.MICROSOFT);
        s.disconnect(cu(me), m.id(), CTX);
        assertThat(accounts.rows).isEmpty();
        assertThat(audits).filteredOn(e -> e.action().equals(AuditActions.CONNECTOR_DISCONNECTED)).last()
                .satisfies(e -> assertThat(e.metadata()).containsEntry("revokedAtProvider", false));

        // revogação falhou (provedor fora): a conta some mesmo assim
        connect(s, me, ConnectorProvider.GOOGLE, null, "d");
        ConnectorAccount again = onlyAccount(me, ConnectorProvider.GOOGLE);
        ConnectorFakes.OAuth failing = google;
        failing.revoked.clear();
        props = ConnectorsProperties.disabled();   // sem gateway: não há como revogar, mas apaga
        service().disconnect(cu(me), again.id(), CTX);
        assertThat(accounts.rows).isEmpty();
        assertThat(failing.revoked).isEmpty();
    }

    @Test
    void criarDeFonteJuntaOsErrosNumUnico400EIgnoraFormatoLongo() {
        TaskService taskService = new TaskService(tasks, users, authorizer, audits::add,
                new NotificationService(new MemoryNotifications(), users, authorizer, clock), clock);
        ApiException e = api(() -> taskService.createFromSource(cu(me), new TaskService.SourcedTaskInput(" ", null, null, SourceKind.MANUAL,
                "x".repeat(501), null, "d".repeat(20_001), List.of(new br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Reference(
                        "x", "ftp://x"))), CTX));
        assertThat(e.status()).isEqualTo(400);
        assertThat(e.code()).isEqualTo(ApiException.VALIDACAO);
        assertThat(e.details().get("fields")).asString().contains("title", "source", "sourceRef", "descriptionMd", "references");
        assertThat(tasks.rows).isEmpty();

        TaskView v = taskService.createFromSource(cu(me), new TaskService.SourcedTaskInput("Planta", TaskType.DESENHO_TECNICO, "f".repeat(21),
                SourceKind.MS_ONEDRIVE, null, LinkMode.VINCULADO, "  descrição  ", null), CTX);
        assertThat(tasks.rows.get(v.id()).task().format()).as("formato acima de 20 é descartado").isNull();
        assertThat(v.descriptionMd()).isEqualTo("descrição");
        assertThat(v.visibility()).isEqualTo(br.gov.pr.secid.workstation.domain.common.Visibility.PRIVADA);
        assertThat(v.accessClass()).isEqualTo(br.gov.pr.secid.workstation.domain.common.AccessClassification.INTERNO);
    }

    // ------------------------------------------------------------------------------------------------ apoio

    @Test
    void pkceSegueARfc7636EStateTemFormatoFixo() {
        // vetor do apêndice B da RFC 7636
        assertThat(Pkce.challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).isEqualTo("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
        String a = Pkce.randomToken();
        assertThat(a).hasSize(43).matches("[A-Za-z0-9_-]+").isNotEqualTo(Pkce.randomToken());
        assertThat(Pkce.wellFormed(a)).isTrue();
        assertThat(Pkce.wellFormed(a + "x")).isFalse();
        assertThat(Pkce.wellFormed(null)).isFalse();
        assertThat(Pkce.sha256Hex("abc")).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    @Test
    void escoposPropriedadesEApoio() {
        assertThat(ConnectorScopes.parse("openid https://graph.microsoft.com/Files.Read https://graph.microsoft.com/User.Read email"))
                .containsExactly("openid", "Files.Read", "User.Read", "email");
        assertThat(ConnectorScopes.satisfied(ConnectorProvider.MICROSOFT, Set.of("files.read.all"))).isTrue();
        assertThat(ConnectorScopes.satisfied(ConnectorProvider.MICROSOFT, Set.of("User.Read"))).isFalse();
        assertThat(ConnectorScopes.satisfied(ConnectorProvider.GOOGLE, Set.of())).as("sem scope = os pedidos (RFC 6749 §5.1)").isTrue();
        assertThat(ConnectorScopes.satisfied(ConnectorProvider.APPLE_ICLOUD, Set.of("x"))).isFalse();
        assertThat(ConnectorScopes.requested(ConnectorProvider.APPLE_ICLOUD)).isEmpty();
        assertThat(ConnectorScopes.parse(null)).isEmpty();

        ConnectorsProperties p = enabled();
        assertThat(p.frontendBaseUrl()).isEqualTo("https://app.example");
        assertThat(p.maxImportBytes()).isEqualTo(50L * 1024 * 1024);
        assertThat(p.httpTimeout()).isEqualTo(Duration.ofSeconds(20));
        assertThat(p.microsoft().tokenEndpoint()).isEqualTo("https://login.microsoftonline.com/common/oauth2/v2.0/token");
        assertThat(p.microsoft().pdfConversionMaxBytes()).isEqualTo(2L * 1024 * 1024);
        assertThat(p.google().driveUrl()).isEqualTo("https://www.googleapis.com/drive/v3");
        assertThat(p.toString()).doesNotContain("g-secret").doesNotContain("m-secret").doesNotContain("chave");
        assertThat(new ConnectorsProperties.Microsoft(null, null, null, "evil/../x", null, null, 0).tenant()).isEqualTo("common");
        assertThat(new ConnectorsProperties.Microsoft(null, null, null, "contoso.onmicrosoft.com", "https://login.example/", null, 0)
                .authorizeEndpoint()).isEqualTo("https://login.example/contoso.onmicrosoft.com/oauth2/v2.0/authorize");
        assertThat(p.configured(ConnectorProvider.APPLE_ICLOUD)).isFalse();

        assertThat(ConnectorImportWriter.antivirus(MediaScanStatus.LIMPO)).isEqualTo(AntivirusStatus.LIMPO);
        assertThat(ConnectorImportWriter.antivirus(MediaScanStatus.INFECTADO)).isEqualTo(AntivirusStatus.INFECTADO);
        assertThat(ConnectorImportWriter.antivirus(MediaScanStatus.NAO_VERIFICADO)).isEqualTo(AntivirusStatus.PENDENTE);
        assertThat(ConnectorService.fileName("Planilha", DetectedType.XLSX)).isEqualTo("Planilha.xlsx");
        assertThat(ConnectorService.fileName("relatorio.docx", DetectedType.PDF)).isEqualTo("relatorio.pdf");
        assertThat(ConnectorService.fileName(null, DetectedType.PDF)).isEqualTo("documento.pdf");
        assertThat(ConnectorService.copyableType("text/plain", "notas.txt")).as("alias genérico não vale").isNull();
        assertThat(ConnectorService.copyableType("image/png", "sem-extensao")).isEqualTo(DetectedType.PNG);
        assertThat(ConnectorService.safeWebUrl("javascript:alert(1)")).isNull();
        assertThat(ConnectorService.safeWebUrl("http://x.example/a")).isNull();
        assertThat(ConnectorService.titleFromName(".gitignore")).isEqualTo(".gitignore");
        assertThat(ConnectorService.titleFromName("x".repeat(300))).hasSize(200);
        TokenGrant grant = new TokenGrant("segredo-a", "segredo-r", 1, null);
        assertThat(grant.toString()).doesNotContain("segredo");
        assertThat(new OAuthClientPort.ExternalProfile("s", "e@x").toString()).doesNotContain("e@x");
        assertThat(TokenCipherPort.UNAVAILABLE.available()).isFalse();
        assertThatThrownBy(() -> TokenCipherPort.UNAVAILABLE.seal("x", "c")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> TokenCipherPort.UNAVAILABLE.open("x", "c")).isInstanceOf(IllegalStateException.class);
    }
}
