package br.gov.pr.secid.workstation.web.auth;

import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.IdentityService;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.Session;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * RF2 — sessão: login, refresh com rotação, logout e troca de senha. O refresh token volta no corpo SÓ para o BFF
 * (Bloco 4), que o guarda no cookie {@code ws_rt} HttpOnly; o navegador nunca o vê. Limites por IP e bulkhead ficam
 * no {@code AuthRateLimitFilter}, antes do Spring Security.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "RF2 Autenticação")
public class AuthController {
    private final IdentityService identity;

    public AuthController(IdentityService identity) {
        this.identity = identity;
    }

    /** {@code rememberMe} é opcional (ausente = false): wrapper para o contrato não depender do Jackson aceitar primitivo faltando. */
    public record LoginRequest(@NotBlank @Size(max = 320) String identifier, @NotBlank @Size(max = 128) String password,
                               Boolean rememberMe, @Size(max = 120) String deviceName, @Size(max = 12) String twoFactorCode) {
        boolean remember() {
            return Boolean.TRUE.equals(rememberMe);
        }
    }

    public record RefreshRequest(@NotBlank @Size(max = 256) String refreshToken) {
    }

    public record ChangePasswordRequest(@NotBlank @Size(max = 128) String currentPassword, @NotBlank @Size(max = 128) String newPassword,
                                        @NotBlank @Size(max = 128) String confirmPassword) {
    }

    @Operation(summary = "RF2.CA01/CA02/CA07/CA08 Login com username ou e-mail e senha; 401 CREDENCIAIS_INVALIDAS único para "
            + "conta inexistente, senha errada e conta bloqueada; 403 CONTA_INDISPONIVEL e 401 DOIS_FATORES_NECESSARIO só após a senha certa")
    @PostMapping("/login")
    public Session login(@Valid @RequestBody LoginRequest body, RequestContext ctx) {
        return identity.login(new IdentityService.LoginCommand(body.identifier(), body.password(), body.remember(),
                body.deviceName(), body.twoFactorCode()), ctx);
    }

    @Operation(summary = "RF2.CA04 Refresh com rotação por família; reuso de token rotacionado revoga a família (401 SESSAO_INVALIDA)")
    @PostMapping("/refresh")
    public Session refresh(@Valid @RequestBody RefreshRequest body, RequestContext ctx) {
        return identity.refresh(body.refreshToken(), ctx);
    }

    @Operation(summary = "RF2.CA05 Logout: revoga a família da sessão atual (sid); o access token deixa de valer no SessionActiveFilter")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(CurrentUser user, RequestContext ctx) {
        identity.logout(user, ctx);
    }

    @Operation(summary = "RF2.CA05/CA09 Troca de senha com reconferência da atual no mesmo bloqueio (6º erro → 429 MUITAS_TENTATIVAS); "
            + "encerra as outras sessões")
    @PutMapping("/password")
    public ResponseEntity<Map<String, Object>> changePassword(CurrentUser user, @Valid @RequestBody ChangePasswordRequest body,
                                                              RequestContext ctx) {
        int ended = identity.changePassword(user, body.currentPassword(), body.newPassword(), body.confirmPassword(), ctx);
        return ResponseEntity.ok(Map.of("sessionsEnded", ended));
    }
}
