package br.gov.pr.secid.workstation.web.auth;

import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.SessionService;
import br.gov.pr.secid.workstation.web.security.AuthorizedBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * RF2.CA05 — "Sessões" em Configurações (Bloco 4, D-62): lista os dispositivos com sessão viva, encerra um ou todos os outros. Exige
 * token com {@code sid} vivo (cadeia padrão do {@code SecurityConfig}); a autorização de recurso fica no {@link SessionService}.
 */
@RestController
@RequestMapping("/api/auth/sessions")
@Tag(name = "RF2 Autenticação")
public class SessionsController {
    private final SessionService sessions;

    public SessionsController(SessionService sessions) {
        this.sessions = sessions;
    }

    @Operation(summary = "RF2.CA05 Minhas sessões vivas (dispositivo, última atividade, expiração; a atual marcada com current=true)")
    @GetMapping
    public List<SessionService.SessionView> list(CurrentUser user) {
        return sessions.list(user);
    }

    @Operation(summary = "RF2.CA05 Encerra uma sessão minha: revoga a família do refresh token; sessão de outra pessoa → 404 NAO_ENCONTRADO")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @AuthorizedBy("requireOwnSession")
    public void revoke(CurrentUser user, @PathVariable("id") UUID id, RequestContext ctx) {
        sessions.revoke(user, id, ctx);
    }

    @Operation(summary = "RF2.CA05 Sai de todos os outros dispositivos (mantém a sessão atual)")
    @DeleteMapping
    public Map<String, Object> revokeOthers(CurrentUser user, RequestContext ctx) {
        return Map.of("sessionsEnded", sessions.revokeOthers(user, ctx));
    }
}
