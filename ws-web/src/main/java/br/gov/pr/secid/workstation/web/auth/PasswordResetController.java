package br.gov.pr.secid.workstation.web.auth;

import br.gov.pr.secid.workstation.application.identity.PasswordResetService;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** RF2.CA08 — redefinição de senha por e-mail (resposta idêntica exista ou não a conta; token de 1 uso). */
@RestController
@RequestMapping("/api/auth/password-reset")
@Tag(name = "RF2 Autenticação")
public class PasswordResetController {
    private final PasswordResetService reset;

    public PasswordResetController(PasswordResetService reset) {
        this.reset = reset;
    }

    public record RequestBodyDto(@NotBlank @Size(max = 320) String email) {
    }

    public record ConfirmBodyDto(@NotBlank @Size(max = 256) String token, @NotBlank @Size(max = 128) String newPassword,
                                 @NotBlank @Size(max = 128) String confirmPassword) {
    }

    @Operation(summary = "RF2.CA08 Pede a redefinição: 202 idêntico exista ou não o e-mail; 5 pedidos/h por pessoa (silencioso)")
    @PostMapping("/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> request(@Valid @RequestBody RequestBodyDto body, RequestContext ctx) {
        reset.request(body.email(), ctx);
        return Map.of("status", "SE_O_EMAIL_EXISTIR_ENVIAMOS_INSTRUCOES");
    }

    @Operation(summary = "RF2.CA08 Confirma com o token (hash, 1 uso, 30 min): troca a senha, tira a conta do bloqueio e encerra as sessões; "
            + "422 LINK_INVALIDO")
    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirm(@Valid @RequestBody ConfirmBodyDto body, RequestContext ctx) {
        reset.confirm(body.token(), body.newPassword(), body.confirmPassword(), ctx);
    }
}
