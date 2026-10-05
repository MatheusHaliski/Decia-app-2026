package br.gov.pr.secid.workstation.web.auth;

import br.gov.pr.secid.workstation.application.identity.AuthenticatedUser;
import br.gov.pr.secid.workstation.application.identity.IdentityService;
import br.gov.pr.secid.workstation.application.identity.LoginCommand;
import br.gov.pr.secid.workstation.application.identity.TokenIssuerPort;
import br.gov.pr.secid.workstation.web.support.ClientIpResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Autenticação local (RF1/RF2 — Bloco 3). Antes deste controller rodam o {@code AuthRateLimitFilter} (limite por IP e
 * teto de hashes) e, dentro do {@link IdentityService}, o bloqueio por conta e o login sem oráculo. A resposta nunca
 * é cacheada ({@code Cache-Control: no-store}).
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "auth", description = "Cadastro local e sessão (RF1/RF2)")
public class AuthController {
    private final IdentityService identity;
    private final TokenIssuerPort tokens;
    private final ClientIpResolver clientIp;

    public AuthController(IdentityService identity, TokenIssuerPort tokens, ClientIpResolver clientIp) {
        this.identity = identity;
        this.tokens = tokens;
        this.clientIp = clientIp;
    }

    @PostMapping("/login")
    @Operation(summary = "SEG.CA01–CA04 — login local sem oráculo: 401 genérico para conta inexistente, senha errada ou "
            + "conta bloqueada (5 tentativas em 15 min, reserva atômica antes do hash); 403/2FA só após a senha certa; "
            + "429 por IP (30 em 10 min) e 503 com Retry-After quando o teto de hashes é atingido")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        String ip = clientIp.resolve(request);
        AuthenticatedUser user = identity.login(new LoginCommand(body.identifier(), body.password()), ip,
                request.getHeader("User-Agent"));
        UUID familyId = UUID.randomUUID();      // RF2: vira a família do refresh token
        String token = tokens.issueAccessToken(user, familyId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new LoginResponse(token, "Bearer", tokens.accessTokenTtl().toSeconds(), LoginResponse.UserCard.of(user)));
    }
}
