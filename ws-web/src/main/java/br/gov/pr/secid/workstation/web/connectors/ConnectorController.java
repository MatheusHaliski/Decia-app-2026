package br.gov.pr.secid.workstation.web.connectors;

import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ConnectorAccountView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ConnectorAuthorizeView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ConnectorConfirmView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ConnectorProviderView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ExternalItemsPage;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ImportInput;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.LinkImportInput;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.web.security.AuthorizationExempt;
import br.gov.pr.secid.workstation.web.security.AuthorizedBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Conectores de fontes externas (RF4, RF20.CA07, RF23, RF34) — contrato do {@code docs/arquitetura/CONECTORES.md}. Toda regra (escopo,
 * PKCE, state de uso único, cifra dos tokens, dono da conta) fica no {@link ConnectorService}; aqui só o HTTP. O callback do OAuth é a
 * única rota pública (a navegação vinda do provedor não leva o token da API) e responde sempre {@code 302} para o front, que conclui a
 * conexão na sessão de quem iniciou ({@code POST /api/connectors/oauth/confirm}). Erros: {@code VALIDACAO} 400, {@code NAO_ENCONTRADO}
 * 404, {@code CONECTOR_EXPIRADO} 409, {@code CONECTOR_DESABILITADO} 503, {@code PROVEDOR_INDISPONIVEL} 502.
 */
@RestController
@Tag(name = "RF20 Conectores")
public class ConnectorController {
    private final ConnectorService connectors;

    public ConnectorController(ConnectorService connectors) {
        this.connectors = connectors;
    }

    /** Começo da conexão: caminho interno para onde o callback devolve a pessoa (padrão {@code /settings?tab=conectores}). */
    public record ConnectorAuthorizeRequest(@Schema(maxLength = 200, example = "/tasks/new") String returnTo) {
    }

    /** Conclusão da conexão: o segredo que o callback pôs na URL do front ({@code pedido}). */
    public record ConnectorConfirmRequest(@Schema(maxLength = 64, description = "valor do parâmetro pedido da URL de retorno") String confirmation) {
    }

    /** Importar um item da conta conectada: {@code COPIADO} guarda uma cópia (anexo); {@code VINCULADO}, a referência para sincronizar. */
    public record ConnectorImportRequest(@Schema(maxLength = 300) String externalId,
                                         @Schema(allowableValues = {"COPIADO", "VINCULADO"}) String linkMode,
                                         @Schema(maxLength = 200) String title) {
        ImportInput toInput() {
            return new ImportInput(externalId, linkMode, title);
        }
    }

    /** Importar colando um link https de Google Docs/Drive/Sites, OneDrive/SharePoint ou iCloud (o servidor não busca o endereço). */
    public record LinkImportRequest(@Schema(maxLength = 500, example = "https://docs.google.com/document/d/ID/edit") String url,
                                    @Schema(maxLength = 200) String title) {
        LinkImportInput toInput() {
            return new LinkImportInput(url, title);
        }
    }

    @Operation(summary = "Conectores: provedores, se estão habilitados neste ambiente, o modo (OAUTH ou LINK) e os escopos pedidos")
    @GetMapping("/api/connectors/providers")
    public List<ConnectorProviderView> providers() {
        return connectors.providers();
    }

    @Operation(summary = "Conectores: minhas contas conectadas (nunca devolve token)")
    @GetMapping("/api/connectors")
    public List<ConnectorAccountView> accounts(CurrentUser user) {
        return connectors.accounts(user);
    }

    @Operation(summary = "Conectores: começa a conexão OAuth 2.0 + PKCE e devolve a URL de autorização do provedor (400 provedor sem OAuth; "
            + "503 CONECTOR_DESABILITADO)")
    @PostMapping("/api/connectors/{provider}/authorize")
    @AuthorizationExempt(reason = "{provider} é o nome de um provedor (GOOGLE/MICROSOFT), não um recurso; o pedido nasce para quem está autenticado")
    public ConnectorAuthorizeView authorize(CurrentUser user, @PathVariable String provider,
                                            @RequestBody(required = false) ConnectorAuthorizeRequest body) {
        return connectors.authorize(user, provider, body == null ? null : body.returnTo());
    }

    @Operation(summary = "Conectores: retorno do provedor (rota pública; state de uso único; não troca o code). Sempre 302 para o front com "
            + "conector=confirmar&pedido=<segredo de uso único, 5 min> ou "
            + "conector=erro&motivo=ESTADO_INVALIDO|ACESSO_NEGADO|CONECTOR_DESABILITADO|PROVEDOR_INDISPONIVEL|ERRO_INTERNO")
    @ApiResponse(responseCode = "302", description = "Redireciona para {frontendBaseUrl}{returnTo} com o resultado da conexão")
    @GetMapping("/api/connectors/oauth/callback")
    public ResponseEntity<Void> callback(@RequestParam(required = false) String state, @RequestParam(required = false) String code,
                                         @RequestParam(required = false) String error, RequestContext ctx) {
        String target = connectors.callback(state, code, error, ctx);
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(target)).header("Cache-Control", "no-store")
                .header("Referrer-Policy", "no-referrer").build();
    }

    @Operation(summary = "Conectores: conclui a conexão na sessão de quem a iniciou (troca o code com PKCE e grava a conta). Sempre 200 com "
            + "status=ok ou status=erro e "
            + "reason=ESTADO_INVALIDO|OUTRA_CONTA|ESCOPO_INSUFICIENTE|CONECTOR_DESABILITADO|PROVEDOR_INDISPONIVEL|ERRO_INTERNO "
            + "(OUTRA_CONTA: o pedido foi iniciado por outra conta e foi descartado sem tocar no provedor)")
    @PostMapping("/api/connectors/oauth/confirm")
    public ConnectorConfirmView confirm(CurrentUser user, @RequestBody(required = false) ConnectorConfirmRequest body, RequestContext ctx) {
        return connectors.confirm(user, body == null ? null : body.confirmation(), ctx);
    }

    @Operation(summary = "Conectores: desconecta (revoga no Google; a Microsoft não revoga por API) e apaga a conta e os tokens")
    @DeleteMapping("/api/connectors/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @AuthorizedBy("requireOwnConnector")
    public void disconnect(CurrentUser user, @PathVariable UUID id, RequestContext ctx) {
        connectors.disconnect(user, id, ctx);
    }

    @Operation(summary = "Conectores: busca itens da conta conectada (q no nome; pageSize ≤ 50; pageToken da página anterior)")
    @GetMapping("/api/connectors/{id}/items")
    @AuthorizedBy("requireOwnConnector")
    public ExternalItemsPage items(CurrentUser user, @PathVariable UUID id, @RequestParam(required = false) String q,
                                   @RequestParam(required = false) String pageToken, @RequestParam(required = false) Integer pageSize) {
        return connectors.items(user, id, q, pageToken, pageSize);
    }

    @Operation(summary = "Conectores: importa um item como tarefa (COPIADO guarda cópia; VINCULADO guarda a referência; 409 CONECTOR_EXPIRADO)")
    @PostMapping("/api/connectors/{id}/import")
    @ResponseStatus(HttpStatus.CREATED)
    @AuthorizedBy("requireOwnConnector")
    public TaskView importItem(CurrentUser user, @PathVariable UUID id, @RequestBody ConnectorImportRequest body, RequestContext ctx) {
        return connectors.importItem(user, id, body == null ? null : body.toInput(), ctx);
    }

    @Operation(summary = "Conectores: importa colando um link (Google Docs/Drive/Sites, OneDrive/SharePoint, iCloud) como tarefa VINCULADA")
    @PostMapping("/api/connectors/link-import")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskView linkImport(CurrentUser user, @RequestBody LinkImportRequest body, RequestContext ctx) {
        return connectors.linkImport(user, body == null ? null : body.toInput(), ctx);
    }
}
