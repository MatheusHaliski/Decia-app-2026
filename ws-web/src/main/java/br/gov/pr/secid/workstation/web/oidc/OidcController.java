package br.gov.pr.secid.workstation.web.oidc;

import br.gov.pr.secid.workstation.application.identity.OidcService;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.Session;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * RF2.CA03/CA12 — login institucional. O BFF (Bloco 4) conduz o Authorization Code + PKCE ({@code state}, {@code nonce},
 * {@code code_verifier}) e troca o código no IdP; a API recebe o {@code id_token}, valida assinatura/iss/aud/exp/nonce e
 * vincula a conta ({@code OidcAccountLinker}). Com {@code ws.oidc.enabled=false} responde {@code 404 OIDC_DESLIGADO}.
 */
@RestController
@Tag(name = "RF2 Autenticação")
public class OidcController {
    private final OidcService oidc;

    public OidcController(OidcService oidc) {
        this.oidc = oidc;
    }

    public record OidcLoginRequest(@NotBlank @Size(max = 8192) String idToken, @NotBlank @Size(max = 256) String nonce,
                                   @Size(max = 120) String deviceName) {
    }

    @Operation(summary = "RF2.CA03/CA12 Login institucional: valida o id_token (iss/aud/exp/nonce) e vincula a conta existente só com "
            + "email_verified=true; 404 OIDC_DESLIGADO sem a flag")
    @PostMapping("/api/auth/oidc/login")
    public Session login(@Valid @RequestBody OidcLoginRequest body, RequestContext ctx) {
        return oidc.login(body.idToken(), body.nonce(), body.deviceName(), ctx);
    }
}
