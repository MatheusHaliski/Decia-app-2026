package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Reference;
import br.gov.pr.secid.workstation.application.acervo.TaskService.SourcedTaskInput;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.connectors.ConnectorImportWriter.ExternalOrigin;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort.RemoteContent;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort.RemoteItem;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort.RemotePage;
import br.gov.pr.secid.workstation.application.connectors.OAuthClientPort.ExternalProfile;
import br.gov.pr.secid.workstation.application.connectors.OAuthClientPort.TokenGrant;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.media.DetectedType;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector.UploadCandidate;
import br.gov.pr.secid.workstation.application.media.MediaUploadService;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.LinkMode;
import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.connectors.ConnectionStatus;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorAccount;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorMode;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorOAuthState;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import br.gov.pr.secid.workstation.domain.connectors.ExternalSources;
import br.gov.pr.secid.workstation.domain.connectors.LinkTarget;
import br.gov.pr.secid.workstation.domain.connectors.SourceClassification;
import br.gov.pr.secid.workstation.domain.connectors.TaskExternalLink;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * Conectores de fontes externas (RF4, RF20.CA07, RF23, RF34): provedores, contas conectadas por OAuth 2.0 + PKCE, busca de itens e
 * importação como tarefa (VINCULADO guarda a referência; COPIADO também guarda o conteúdo pelo pipeline de mídia), e a importação por link
 * (qualquer provedor, inclusive iCloud — o endereço nunca é buscado pelo servidor). Segurança:
 * <ul>
 *   <li>{@code state} aleatório de uso único, 10 min, ligado ao usuário e guardado só como hash, em tabela; {@code code_verifier} selado;
 *       {@code redirect_uri} fixo por configuração; {@code returnTo} só caminho interno;</li>
 *   <li>tokens selados com AES-256-GCM ({@link TokenCipherPort}, contexto = dono + provedor); nunca vão ao front nem ao log; sem chave os
 *       provedores OAuth ficam desabilitados ({@code 503 CONECTOR_DESABILITADO});</li>
 *   <li>BOLA: toda conta tem dono e só ele a vê/usa — a de outra pessoa responde o mesmo 404 de um id inexistente
 *       ({@link ResourceAuthorizer#requireOwnConnector});</li>
 *   <li>auditoria de conectar, falhar no retorno, desconectar e importar, sem token nem e-mail.</li>
 * </ul>
 * As chamadas de rede ficam fora de transação; a gravação da tarefa importada é uma transação só ({@link ConnectorImportWriter}).
 */
@Service
public class ConnectorService {
    private static final Logger log = LoggerFactory.getLogger(ConnectorService.class);
    static final int MAX_PAGE = 50;
    static final int DEFAULT_PAGE = 25;
    static final int MAX_QUERY = 100;
    static final int MAX_TITLE = 200;
    static final int MAX_CODE = 4096;
    /** Token de página opaco do provedor: ASCII visível, sem espaço (o adaptador codifica ou valida o destino antes de usar). */
    private static final Pattern PAGE_TOKEN = Pattern.compile("^[\\x21-\\x7E]{1,4096}$");
    /** Formatos que a cópia (COPIADO) aceita guardar: os do pipeline de mídia (D-67). */
    static final Set<DetectedType> COPYABLE = EnumSet.of(DetectedType.PDF, DetectedType.DOCX, DetectedType.XLSX, DetectedType.PPTX,
            DetectedType.PNG, DetectedType.JPEG, DetectedType.GIF, DetectedType.WEBP, DetectedType.ZIP, DetectedType.DWG, DetectedType.DXF,
            DetectedType.IFC, DetectedType.GLB);
    static final String PDF = "PDF";

    private final ConnectorsProperties props;
    private final ConnectorAccountRepositoryPort accounts;
    private final ConnectorOAuthStateRepositoryPort states;
    private final ObjectProvider<TokenCipherPort> cipher;
    private final ObjectProvider<OAuthClientPort> oauthClients;
    private final ObjectProvider<ExternalDocPort> docClients;
    private final ResourceAuthorizer authorizer;
    private final ConnectorImportWriter writer;
    private final MediaUploadService media;
    private final AuditLogPort audit;
    private final Clock clock;

    public ConnectorService(ConnectorsProperties props, ConnectorAccountRepositoryPort accounts, ConnectorOAuthStateRepositoryPort states,
                            ObjectProvider<TokenCipherPort> cipher, ObjectProvider<OAuthClientPort> oauthClients,
                            ObjectProvider<ExternalDocPort> docClients, ResourceAuthorizer authorizer, ConnectorImportWriter writer,
                            MediaUploadService media, AuditLogPort audit, Clock clock) {
        this.props = props == null ? ConnectorsProperties.disabled() : props;
        this.accounts = accounts;
        this.states = states;
        this.cipher = cipher;
        this.oauthClients = oauthClients;
        this.docClients = docClients;
        this.authorizer = authorizer;
        this.writer = writer;
        this.media = media;
        this.audit = audit;
        this.clock = clock;
    }

    // ------------------------------------------------------------------------------------------------ visões (contrato REST)

    /** {@code GET /api/connectors/providers}: provedor, se está habilitado aqui, o modo e os escopos pedidos (LGPD: a tela mostra). */
    public record ConnectorProviderView(ConnectorProvider provider, boolean enabled, ConnectorMode mode, List<String> scopes) {
    }

    /** Conta conectada como o dono a vê: sem token, nunca. */
    public record ConnectorAccountView(UUID id, ConnectorProvider provider, String accountEmail, ConnectionStatus status, List<String> scopes,
                                       Instant connectedAt, Instant lastUsedAt, String lastError) {
    }

    public record ConnectorAuthorizeView(String url) {
    }

    /**
     * Item do provedor: {@code exportFormats} são os formatos em que ESTE servidor consegue copiar o item (o primeiro é o usado no modo
     * COPIADO; vazio = só VINCULADO); {@code linkable} diz se dá para vincular (sempre, nos provedores OAuth).
     */
    public record ExternalItemView(String externalId, String name, String mimeType, SourceKind sourceKind, TaskType taskType, String webUrl,
                                   Instant modifiedAt, Long sizeBytes, List<String> exportFormats, boolean linkable) {
    }

    public record ExternalItemsPage(List<ExternalItemView> items, String nextPageToken) {
    }

    /** Corpo do import: {@code linkMode} é texto para que um valor inválido responda {@code 400 VALIDACAO}, como o resto do contrato. */
    public record ImportInput(String externalId, String linkMode, String title) {
    }

    public record LinkImportInput(String url, String title) {
    }

    /** Provedor habilitado com os adaptadores e a cifra que vai usar. */
    private record Gateway(OAuthClientPort oauth, ExternalDocPort docs, TokenCipherPort cipher) {
    }

    // ------------------------------------------------------------------------------------------------ provedores e contas

    public List<ConnectorProviderView> providers() {
        return Arrays.stream(ConnectorProvider.values())
                .map(p -> new ConnectorProviderView(p, enabled(p), p.mode(), ConnectorScopes.requested(p))).toList();
    }

    /** OAuth: chave geral + client id/segredo/redirect + chave de cifra + adaptadores. LINK (iCloud) não chama ninguém: sempre habilitado. */
    public boolean enabled(ConnectorProvider provider) {
        return provider.mode() == ConnectorMode.LINK || gateway(provider).isPresent();
    }

    public List<ConnectorAccountView> accounts(CurrentUser actor) {
        authorizer.viewer(actor);
        return accounts.findByOwner(actor.id()).stream().map(ConnectorService::view).toList();
    }

    // ------------------------------------------------------------------------------------------------ OAuth

    /**
     * Começa a conexão: grava o pedido (hash do state, verificador PKCE selado, returnTo) e devolve a URL de autorização do provedor, para a
     * qual o front navega. Provedor desconhecido ou sem OAuth → 400; desabilitado → 503.
     */
    public ConnectorAuthorizeView authorize(CurrentUser actor, String providerName, String returnTo) {
        authorizer.viewer(actor);
        ConnectorProvider provider = ConnectorProvider.parse(providerName)
                .orElseThrow(() -> ConnectorErrors.invalid("provider", "Provedor desconhecido."));
        if (!provider.oauth()) {
            throw ConnectorErrors.invalid("provider", "Este provedor não tem conexão por conta: use a importação por link.");
        }
        String back = ConnectorOAuthState.safeReturnTo(returnTo)
                .orElseThrow(() -> ConnectorErrors.invalid("returnTo", "Use um caminho interno do aplicativo (ex.: /tasks/new)."));
        Gateway g = gateway(provider).orElseThrow(ConnectorErrors::disabled);
        Instant now = clock.instant();
        states.purgeExpired(now);
        String state = Pkce.randomToken();
        String verifier = Pkce.randomToken();
        String hash = Pkce.sha256Hex(state);
        states.insert(ConnectorOAuthState.issue(actor.id(), provider, hash, g.cipher().seal(verifier, verifierContext(hash)), back, now));
        return new ConnectorAuthorizeView(g.oauth().authorizationUrl(state, Pkce.challenge(verifier)));
    }

    /**
     * Retorno do provedor ({@code GET /api/connectors/oauth/callback}, rota pública: a navegação vinda do Google/Microsoft não leva o token
     * da API; quem conecta é o dono do {@code state}). Nunca lança: devolve sempre o endereço do 302 para o front, com {@code conector=ok}
     * ou {@code conector=erro&motivo=<CODIGO>}.
     */
    public String callback(String state, String code, String error, RequestContext ctx) {
        if (!Pkce.wellFormed(state)) {
            return redirect(ConnectorOAuthState.DEFAULT_RETURN_TO, ConnectorErrors.MOTIVO_ESTADO_INVALIDO);
        }
        Optional<ConnectorOAuthState> found;
        try {
            found = states.consume(Pkce.sha256Hex(state));
        } catch (RuntimeException e) {
            log.error("Conectores: falha ao ler o estado OAuth ({})", e.getClass().getSimpleName());
            return redirect(ConnectorOAuthState.DEFAULT_RETURN_TO, ConnectorErrors.MOTIVO_ERRO_INTERNO);
        }
        if (found.isEmpty()) {
            return redirect(ConnectorOAuthState.DEFAULT_RETURN_TO, ConnectorErrors.MOTIVO_ESTADO_INVALIDO);
        }
        ConnectorOAuthState s = found.get();
        try {
            return complete(s, code, error, ctx);
        } catch (RuntimeException e) {
            log.error("Conectores: falha inesperada ao concluir a conexão {} ({})", s.provider(), e.getClass().getSimpleName());
            return fail(s, ConnectorErrors.MOTIVO_ERRO_INTERNO, ctx);
        }
    }

    private String complete(ConnectorOAuthState s, String code, String error, RequestContext ctx) {
        Instant now = clock.instant();
        if (s.expired(now) || authorizer.viewerOf(s.ownerId()).isEmpty()) {
            return fail(s, ConnectorErrors.MOTIVO_ESTADO_INVALIDO, ctx);
        }
        if (error != null && !error.isBlank()) {
            return fail(s, "access_denied".equals(error.strip()) ? ConnectorErrors.MOTIVO_ACESSO_NEGADO : ConnectorErrors.MOTIVO_PROVEDOR, ctx);
        }
        if (code == null || code.isBlank() || code.length() > MAX_CODE) {
            return fail(s, ConnectorErrors.MOTIVO_ESTADO_INVALIDO, ctx);
        }
        Optional<Gateway> maybe = gateway(s.provider());
        if (maybe.isEmpty()) {
            return fail(s, ConnectorErrors.MOTIVO_DESABILITADO, ctx);
        }
        Gateway g = maybe.get();
        String verifier;
        try {
            verifier = g.cipher().open(s.codeVerifierSealed(), verifierContext(s.stateHash()));
        } catch (IllegalStateException e) {
            return fail(s, ConnectorErrors.MOTIVO_ESTADO_INVALIDO, ctx);
        }
        TokenGrant grant;
        ExternalProfile profile;
        try {
            grant = g.oauth().exchange(code.strip(), verifier);
            if (!ConnectorScopes.satisfied(s.provider(), grant.scopes())) {
                revokeQuietly(g, grant.refreshToken() != null ? grant.refreshToken() : grant.accessToken());
                return fail(s, ConnectorErrors.MOTIVO_ESCOPO_INSUFICIENTE, ctx);
            }
            profile = g.oauth().profile(grant.accessToken());
        } catch (ProviderException e) {
            boolean refused = e.kind() == ProviderException.Kind.INVALID_GRANT || e.kind() == ProviderException.Kind.REJECTED;
            log.warn("Conectores: retorno do OAuth {} recusado ({}, HTTP {})", s.provider(), e.kind(), e.status());
            return fail(s, refused ? ConnectorErrors.MOTIVO_ESTADO_INVALIDO : ConnectorErrors.MOTIVO_PROVEDOR, ctx);
        }
        if (profile.subject() == null || profile.subject().isBlank() || profile.subject().length() > ConnectorAccount.MAX_SUBJECT) {
            return fail(s, ConnectorErrors.MOTIVO_PROVEDOR, ctx);
        }
        String sealedAccess = g.cipher().seal(grant.accessToken(), tokenContext(s.ownerId(), s.provider(), "access"));
        String sealedRefresh = grant.refreshToken() == null ? null : g.cipher().seal(grant.refreshToken(),
                tokenContext(s.ownerId(), s.provider(), "refresh"));
        Instant expiresAt = now.plusSeconds(Math.max(0, grant.expiresInSeconds()));
        String email = profile.email() == null || profile.email().length() > 254 ? null : profile.email();
        ConnectorAccount saved = accounts.save(accounts.findByOwnerAndSubject(s.ownerId(), s.provider(), profile.subject())
                .map(a -> a.reconnected(email, grant.scopes(), sealedAccess, sealedRefresh, expiresAt, now))
                .orElseGet(() -> ConnectorAccount.connect(s.ownerId(), s.provider(), profile.subject(), email, grant.scopes(), sealedAccess,
                        sealedRefresh, expiresAt, now)));
        audit.record(AuditEvent.of(s.ownerId(), AuditActions.CONNECTOR_CONNECTED, "connector", String.valueOf(saved.id()), AuditEvent.OK,
                ctx.ip(), ctx.userAgent(), Map.of("provider", s.provider().name(), "offline", sealedRefresh != null)));
        return redirect(s.returnTo(), null);
    }

    private String fail(ConnectorOAuthState s, String motivo, RequestContext ctx) {
        audit.record(AuditEvent.of(s.ownerId(), AuditActions.CONNECTOR_CONNECT_FAILED, "connector", null, AuditEvent.FALHA, ctx.ip(),
                ctx.userAgent(), Map.of("provider", s.provider().name(), "motivo", motivo)));
        return redirect(s.returnTo(), motivo);
    }

    /** {@code {frontendBaseUrl}{returnTo}} com {@code conector=ok} ou {@code conector=erro&motivo=<CODIGO>} (códigos fixos, nunca o texto do provedor). */
    String redirect(String returnTo, String motivo) {
        String path = ConnectorOAuthState.safeReturnTo(returnTo).orElse(ConnectorOAuthState.DEFAULT_RETURN_TO);
        String outcome = motivo == null ? "conector=ok" : "conector=erro&motivo=" + motivo;
        return props.frontendBaseUrl() + path + (path.contains("?") ? "&" : "?") + outcome;
    }

    /**
     * Desconecta: tira os tokens do banco (REVOGADO), revoga no Google ({@code oauth2.googleapis.com/revoke}) e apaga a conta. A Microsoft
     * não revoga refresh token por API: a conta some daqui e a tela orienta remover o consentimento em myapps.microsoft.com. As tarefas
     * importadas ficam (o vínculo perde a conta).
     */
    public void disconnect(CurrentUser actor, UUID accountId, RequestContext ctx) {
        ConnectorAccount a = loadOwned(actor, accountId);
        Gateway g = gateway(a.provider()).orElse(null);
        String token = null;
        if (g != null) {
            token = openQuietly(g, a.refreshTokenSealed(), tokenContext(a.ownerId(), a.provider(), "refresh"));
            if (token == null) {
                token = openQuietly(g, a.accessTokenSealed(), tokenContext(a.ownerId(), a.provider(), "access"));
            }
        }
        accounts.save(a.revoked());
        boolean revoked = g != null && token != null && revokeQuietly(g, token);
        accounts.delete(a.id());
        audit.record(AuditEvent.of(actor.id(), AuditActions.CONNECTOR_DISCONNECTED, "connector", a.id().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("provider", a.provider().name(), "revokedAtProvider", revoked)));
    }

    // ------------------------------------------------------------------------------------------------ itens e importação

    /** {@code GET /api/connectors/{id}/items}: busca no nome ({@code q}) ou recentes; página de até 50. */
    public ExternalItemsPage items(CurrentUser actor, UUID accountId, String q, String pageToken, Integer pageSize) {
        ConnectorAccount a = loadOwned(actor, accountId);
        String query = q == null ? "" : q.strip();
        if (query.length() > MAX_QUERY) {
            throw ConnectorErrors.invalid("q", "Busca com até " + MAX_QUERY + " caracteres.");
        }
        String token = pageToken == null || pageToken.isBlank() ? null : pageToken.strip();
        if (token != null && !PAGE_TOKEN.matcher(token).matches()) {
            throw ConnectorErrors.invalid("pageToken", "Página inválida: recomece a busca.");
        }
        int size = pageSize == null ? DEFAULT_PAGE : Math.max(1, Math.min(pageSize, MAX_PAGE));
        Gateway g = gateway(a.provider()).orElseThrow(ConnectorErrors::disabled);
        RemotePage page = withAccess(a, g, access -> g.docs().list(access, query, token, size));
        return new ExternalItemsPage(page.items().stream().map(i -> itemView(a.provider(), i)).toList(), page.nextPageToken());
    }

    /**
     * {@code POST /api/connectors/{id}/import}: lê o item no provedor e cria a tarefa. VINCULADO guarda a URL web ({@code sourceRef}) e a
     * origem externa (id, conta, versão) para o SYNC_EXTERNO; COPIADO também exporta o conteúdo (PDF do provedor, senão o original) e o
     * guarda como anexo pelo pipeline de mídia (inspeção, antivírus, chave segura). Item sem formato copiável → 400 (só VINCULADO).
     */
    public TaskView importItem(CurrentUser actor, UUID accountId, ImportInput in, RequestContext ctx) {
        ConnectorAccount a = loadOwned(actor, accountId);
        if (in == null) {
            throw ConnectorErrors.invalid("externalId", "Informe o item e o modo de importação.");
        }
        String externalId = in.externalId() == null ? null : in.externalId().strip();
        if (!TaskExternalLink.validExternalId(externalId)) {
            throw ConnectorErrors.invalid("externalId", "Item inválido.");
        }
        LinkMode mode = parseMode(in.linkMode());
        String title = optionalTitle(in.title());
        Viewer viewer = authorizer.viewer(actor);
        Gateway g = gateway(a.provider()).orElseThrow(ConnectorErrors::disabled);
        Fetched f = withAccess(a, g, access -> fetch(g.docs(), a.provider(), access, externalId, mode));
        MediaUploadService.Stored copy = null;
        String format = f.classification().format();
        if (mode == LinkMode.COPIADO) {
            copy = store(viewer, f);
            format = f.copyType().canonicalExtension();
        }
        RemoteItem item = f.item();
        String webUrl = safeWebUrl(item.webUrl());
        SourceKind kind = f.classification().sourceKind();
        String sourceRef = webUrl != null && webUrl.length() <= TaskItem.MAX_SOURCE_REF ? webUrl
                : a.provider().name().toLowerCase(Locale.ROOT) + ":" + item.externalId();
        List<Reference> refs = webUrl != null && webUrl.length() <= TaskItem.MAX_SOURCE_REF
                ? List.of(new Reference(ExternalSources.appName(kind).orElse(a.provider().name()), webUrl)) : List.of();
        SourcedTaskInput task = new SourcedTaskInput(title != null ? title : titleFromName(item.name()), f.classification().taskType(), format,
                kind, sourceRef, mode, null, refs);
        TaskView view = writer.write(actor, task, copy, new ExternalOrigin(a.id(), a.provider(), item.externalId(), item.mimeType(),
                item.version()), ctx);
        audit.record(AuditEvent.of(actor.id(), AuditActions.CONNECTOR_IMPORTED, "task", view.id().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("provider", a.provider().name(), "connector", a.id().toString(), "linkMode", mode.name(),
                        "sourceKind", kind.name())));
        return view;
    }

    /**
     * {@code POST /api/connectors/link-import}: link {@code https} de um host da tabela do contrato vira tarefa VINCULADA (fonte inferida do
     * host/caminho, tipo pela fonte). O servidor NUNCA busca o endereço (sem SSRF); o resto é recusado com 400.
     */
    public TaskView linkImport(CurrentUser actor, LinkImportInput in, RequestContext ctx) {
        authorizer.viewer(actor);
        String url = in == null || in.url() == null ? "" : in.url().strip();
        if (url.isEmpty() || url.length() > TaskItem.MAX_SOURCE_REF) {
            throw ConnectorErrors.invalid("url", "Cole um link https com até " + TaskItem.MAX_SOURCE_REF + " caracteres.");
        }
        LinkTarget target = ExternalSources.classifyLink(url).orElseThrow(() -> ConnectorErrors.invalid("url",
                "Link não aceito: use um link https do Google Docs, Drive ou Sites, do OneDrive ou SharePoint, ou de compartilhamento do iCloud."));
        String title = optionalTitle(in.title());
        SourcedTaskInput task = new SourcedTaskInput(title != null ? title : target.appName() + " (link)", target.taskType(), "url",
                target.sourceKind(), target.url(), LinkMode.VINCULADO, null, List.of(new Reference(target.appName(), target.url())));
        TaskView view = writer.write(actor, task, null, null, ctx);
        audit.record(AuditEvent.of(actor.id(), AuditActions.CONNECTOR_IMPORTED, "task", view.id().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("provider", target.provider().name(), "linkMode", LinkMode.VINCULADO.name(), "via", "LINK",
                        "sourceKind", target.sourceKind().name())));
        return view;
    }

    /**
     * Guarda a cópia pelo pipeline de mídia (D-67: tipo real por magic bytes, limite por tipo, antivírus, dedupe, chave segura). Recusa do
     * pipeline (tipo divergente, tamanho, arquivo suspeito ou infectado) vira {@code 400 VALIDACAO} com o código original em
     * {@code details.reason}; armazenamento fora do ar continua 503.
     */
    private MediaUploadService.Stored store(Viewer viewer, Fetched f) {
        try {
            return media.upload(viewer, new UploadCandidate(f.content().bytes(), f.fileName(), f.copyType().mime(), COPYABLE),
                    AccessClassification.INTERNO, false);
        } catch (ApiException e) {
            if (e.status() >= 500) {
                throw e;
            }
            String message = "A cópia do item foi recusada (" + e.getMessage() + "). Você pode vincular em vez de copiar.";
            throw ApiException.badRequest(ApiException.VALIDACAO, message, Map.of("fields", Map.of("linkMode", message), "reason", e.code()));
        }
    }

    /** Metadados, classificação e (COPIADO) o conteúdo baixado, com o nome que o pipeline de mídia espera. */
    private record Fetched(RemoteItem item, SourceClassification classification, RemoteContent content, DetectedType copyType, String fileName) {
    }

    private Fetched fetch(ExternalDocPort docs, ConnectorProvider provider, String access, String externalId, LinkMode mode) {
        RemoteItem item = docs.get(access, externalId);
        SourceClassification c = classify(provider, item);
        if (mode == LinkMode.VINCULADO) {
            return new Fetched(item, c, null, null, null);
        }
        List<String> formats = exportFormats(provider, c, item);
        if (formats.isEmpty()) {
            throw ConnectorErrors.invalid("linkMode", "Este item não pode ser copiado (pasta, formato sem exportação ou acima do limite): vincule.");
        }
        DetectedType original = copyableType(item.mimeType(), item.name());
        boolean asPdf = c.pdfExport() && PDF.equals(formats.get(0));
        if (asPdf) {
            try {
                RemoteContent pdf = docs.download(access, item, true, props.maxImportBytes());
                return new Fetched(item, c, pdf, DetectedType.PDF, fileName(item.name(), DetectedType.PDF));
            } catch (ProviderException e) {
                // a conversão do provedor recusou (tamanho/tipo): cai para o original, se ele for copiável
                if (e.kind() != ProviderException.Kind.REJECTED || original == null || !c.originalDownload()) {
                    throw e;
                }
            }
        }
        if (original == null) {
            throw ConnectorErrors.invalid("linkMode", "Este item não pode ser copiado neste formato: vincule.");
        }
        RemoteContent content = docs.download(access, item, false, props.maxImportBytes());
        return new Fetched(item, c, content, original, fileName(item.name(), original));
    }

    // ------------------------------------------------------------------------------------------------ tokens

    /**
     * Chama o provedor com um access token válido: renova antes se estiver vencendo; numa recusa (401) renova uma vez e repete. Renovação
     * recusada → conta EXPIRADO + {@code 409 CONECTOR_EXPIRADO}; provedor fora → conta ERRO + {@code 502}. Sucesso marca o último uso.
     */
    private <T> T withAccess(ConnectorAccount account, Gateway g, Function<String, T> call) {
        if (!account.status().usable()) {
            throw ConnectorErrors.expired();
        }
        ConnectorAccount current = account;
        boolean refreshed = false;
        if (!current.accessFresh(clock.instant())) {
            current = refresh(current, g);
            refreshed = true;
        }
        while (true) {
            String access = openOrExpire(current, g, current.accessTokenSealed(), "access");
            try {
                T result = call.apply(access);
                accounts.save(current.used(clock.instant()));
                return result;
            } catch (ProviderException e) {
                if (e.kind() == ProviderException.Kind.UNAUTHORIZED && !refreshed) {
                    current = refresh(current, g);
                    refreshed = true;
                    continue;
                }
                throw translate(current, e);
            }
        }
    }

    private ConnectorAccount refresh(ConnectorAccount a, Gateway g) {
        String refresh = a.refreshTokenSealed() == null ? null : openOrExpire(a, g, a.refreshTokenSealed(), "refresh");
        if (refresh == null) {
            accounts.save(a.expired("SEM_REFRESH_TOKEN"));
            throw ConnectorErrors.expired();
        }
        try {
            TokenGrant grant = g.oauth().refresh(refresh);
            String sealedAccess = g.cipher().seal(grant.accessToken(), tokenContext(a.ownerId(), a.provider(), "access"));
            String sealedRefresh = grant.refreshToken() == null ? null
                    : g.cipher().seal(grant.refreshToken(), tokenContext(a.ownerId(), a.provider(), "refresh"));
            return accounts.save(a.refreshed(sealedAccess, sealedRefresh, clock.instant().plusSeconds(Math.max(0, grant.expiresInSeconds()))));
        } catch (ProviderException e) {
            if (e.kind() == ProviderException.Kind.UNAVAILABLE) {
                accounts.save(a.failed(ConnectorErrors.PROVEDOR_INDISPONIVEL));
                throw ConnectorErrors.unavailable();
            }
            log.info("Conectores: renovação recusada pelo provedor {} ({}); conta {} expirada", a.provider(), e.kind(), a.id());
            accounts.save(a.expired("RENOVACAO_RECUSADA"));
            throw ConnectorErrors.expired();
        }
    }

    private ApiException translate(ConnectorAccount current, ProviderException e) {
        return switch (e.kind()) {
            case UNAUTHORIZED, INVALID_GRANT -> {
                accounts.save(current.expired("ACESSO_RECUSADO"));
                yield ConnectorErrors.expired();
            }
            case FORBIDDEN -> ConnectorErrors.forbidden();
            case NOT_FOUND -> ConnectorErrors.itemNotFound();
            case REJECTED -> ConnectorErrors.invalid("externalId", "O provedor recusou o pedido para este item.");
            case TOO_LARGE -> ConnectorErrors.invalid("linkMode", "Arquivo acima do limite para copiar: vincule em vez de copiar.");
            case UNAVAILABLE -> {
                accounts.save(current.failed(ConnectorErrors.PROVEDOR_INDISPONIVEL));
                yield ConnectorErrors.unavailable();
            }
        };
    }

    /** Token guardado que não abre (chave trocada, dado adulterado ou copiado de outra linha): a conta expira e pede reconexão. */
    private String openOrExpire(ConnectorAccount a, Gateway g, String sealed, String kind) {
        try {
            return g.cipher().open(sealed, tokenContext(a.ownerId(), a.provider(), kind));
        } catch (IllegalStateException e) {
            log.warn("Conectores: token selado da conta {} não abre ({}); conta expirada", a.id(), kind);
            accounts.save(a.expired("TOKEN_ILEGIVEL"));
            throw ConnectorErrors.expired();
        }
    }

    private static String openQuietly(Gateway g, String sealed, String context) {
        if (sealed == null) {
            return null;
        }
        try {
            return g.cipher().open(sealed, context);
        } catch (IllegalStateException e) {
            return null;
        }
    }

    private static boolean revokeQuietly(Gateway g, String token) {
        try {
            return g.oauth().revoke(token);
        } catch (ProviderException e) {
            log.warn("Conectores: revogação no provedor {} falhou ({}); a conta é apagada mesmo assim", g.oauth().provider(), e.kind());
            return false;
        }
    }

    static String tokenContext(UUID ownerId, ConnectorProvider provider, String kind) {
        return "connector:" + ownerId + ":" + provider.name() + ":" + kind;
    }

    static String verifierContext(String stateHash) {
        return "oauth-state:" + stateHash;
    }

    // ------------------------------------------------------------------------------------------------ apoio

    private Optional<Gateway> gateway(ConnectorProvider provider) {
        if (!props.enabled() || !provider.oauth() || !props.configured(provider)) {
            return Optional.empty();
        }
        TokenCipherPort c = cipher.getIfAvailable();
        OAuthClientPort o = oauthClients.orderedStream().filter(x -> x.provider() == provider).findFirst().orElse(null);
        ExternalDocPort d = docClients.orderedStream().filter(x -> x.provider() == provider).findFirst().orElse(null);
        return c == null || !c.available() || o == null || d == null ? Optional.empty() : Optional.of(new Gateway(o, d, c));
    }

    private ConnectorAccount loadOwned(CurrentUser actor, UUID accountId) {
        ConnectorAccount a = accountId == null ? null : accounts.findById(accountId).orElse(null);
        authorizer.requireOwnConnector(actor, a == null ? null : a.ownerId());
        if (a == null) {
            // o autorizador já recusou com 404; a guarda deixa isso explícito para a análise estática
            throw ApiException.notFound("Conector");
        }
        return a;
    }

    private static ConnectorAccountView view(ConnectorAccount a) {
        return new ConnectorAccountView(a.id(), a.provider(), a.accountEmail(), a.status(), a.scopes().stream().sorted().toList(),
                a.connectedAt(), a.lastUsedAt(), a.lastError());
    }

    private ExternalItemView itemView(ConnectorProvider provider, RemoteItem i) {
        SourceClassification c = classify(provider, i);
        return new ExternalItemView(i.externalId(), i.name(), i.mimeType(), c.sourceKind(), c.taskType(), safeWebUrl(i.webUrl()), i.modifiedAt(),
                i.sizeBytes(), exportFormats(provider, c, i), true);
    }

    private static SourceClassification classify(ConnectorProvider provider, RemoteItem i) {
        return provider == ConnectorProvider.GOOGLE ? ExternalSources.classifyGoogle(i.mimeType(), i.name())
                : ExternalSources.classifyMicrosoft(i.name(), i.mimeType(), i.folder(), i.packageType());
    }

    /**
     * Formatos em que este servidor copia o item, na ordem de preferência: PDF gerado pelo provedor (Google: tipos nativos; Graph: até o
     * limite de conversão) e depois o original, se o pipeline de mídia o aceita e cabe no teto de importação.
     */
    List<String> exportFormats(ConnectorProvider provider, SourceClassification c, RemoteItem i) {
        List<String> out = new ArrayList<>();
        Long size = i.sizeBytes();
        if (c.pdfExport() && (provider == ConnectorProvider.GOOGLE || size == null || size <= props.microsoft().pdfConversionMaxBytes())) {
            out.add(PDF);
        }
        if (c.originalDownload() && (size == null || size <= props.maxImportBytes())) {
            DetectedType t = copyableType(i.mimeType(), i.name());
            if (t != null && !out.contains(t.name())) {
                out.add(t.name());
            }
        }
        return List.copyOf(out);
    }

    /** Tipo copiável pelo nome (extensão) ou pelo MIME canônico; nada de aliases genéricos ({@code text/plain}). */
    static DetectedType copyableType(String mimeType, String name) {
        String ext = ExternalSources.extension(name);
        for (DetectedType t : COPYABLE) {
            if (!ext.isEmpty() && t.acceptsExtension(ext)) {
                return t;
            }
        }
        String mime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT).strip();
        for (DetectedType t : COPYABLE) {
            if (t.mime().equals(mime)) {
                return t;
            }
        }
        return null;
    }

    /** Nome com a extensão do tipo que será gravado (o inspetor de mídia confere a extensão contra o tipo real). */
    static String fileName(String name, DetectedType type) {
        String base = name == null || name.isBlank() ? "documento" : name.strip();
        if (type.acceptsExtension(ExternalSources.extension(base))) {
            return base;
        }
        String ext = ExternalSources.extension(base);
        String stem = ext.isEmpty() ? base : base.substring(0, base.length() - ext.length() - 1);
        return (stem.isBlank() ? "documento" : stem) + "." + type.canonicalExtension();
    }

    /** Só {@code https} vai para a tela e para a tarefa (nada de {@code javascript:} vindo de um metadado). */
    static String safeWebUrl(String url) {
        if (url == null || url.isBlank() || url.length() > 2048) {
            return null;
        }
        try {
            URI u = URI.create(url.strip());
            return "https".equalsIgnoreCase(u.getScheme()) && u.getHost() != null ? u.toString() : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    static String titleFromName(String name) {
        String n = name == null || name.isBlank() ? "Documento importado" : name.strip();
        String ext = ExternalSources.extension(n);
        if (!ext.isEmpty() && n.length() > ext.length() + 1) {
            n = n.substring(0, n.length() - ext.length() - 1).strip();
        }
        return n.length() > MAX_TITLE ? n.substring(0, MAX_TITLE).strip() : n;
    }

    private static String optionalTitle(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String t = raw.strip();
        if (t.length() > MAX_TITLE) {
            throw ConnectorErrors.invalid("title", "Título com até " + MAX_TITLE + " caracteres.");
        }
        return t;
    }

    private static LinkMode parseMode(String raw) {
        if (raw != null) {
            for (LinkMode m : LinkMode.values()) {
                if (m.name().equalsIgnoreCase(raw.strip())) {
                    return m;
                }
            }
        }
        throw ConnectorErrors.invalid("linkMode", "Escolha COPIADO (guarda uma cópia) ou VINCULADO (guarda a referência).");
    }
}
