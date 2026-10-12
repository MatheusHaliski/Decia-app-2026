package br.gov.pr.secid.workstation.web.auth;

import br.gov.pr.secid.workstation.application.identity.RegistrationService;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.Session;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import br.gov.pr.secid.workstation.web.security.AuthorizationExempt;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** RF1 — cadastro, verificação de e-mail e consulta de username. Todas públicas e limitadas por IP (AuthRateLimitFilter). */
@RestController
@Tag(name = "RF1 Cadastro")
public class RegistrationController {
    private final RegistrationService registration;

    public RegistrationController(RegistrationService registration) {
        this.registration = registration;
    }

    public record RegisterRequest(@Size(max = 30) String profileType, @Size(max = 160) String fullName, @Size(max = 80) String username,
                                  @Size(max = 320) String email, @Size(max = 128) String password, @Size(max = 128) String confirmPassword,
                                  @Size(max = 32) String phone, Boolean acceptTerms) {
    }

    public record ConfirmRequest(@NotBlank @Size(max = 320) String email, @NotBlank @Size(max = 12) String code,
                                 @Size(max = 120) String deviceName) {
    }

    public record EmailRequest(@NotBlank @Size(max = 320) String email) {
    }

    @Operation(summary = "RF1.CA01/CA03/CA04/CA10/CA15/CA22 Cadastro: 422 VALIDACAO por campo (acceptTerms obrigatório), 422 NOME_RESERVADO, "
            + "409 USERNAME_EM_USO; e-mail já cadastrado recebe a MESMA resposta 202 (sem oráculo) e um e-mail de conta existente")
    @PostMapping("/api/auth/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public RegistrationService.Receipt register(@Valid @RequestBody RegisterRequest body, RequestContext ctx) {
        return registration.register(new RegistrationService.RegisterCommand(body.profileType(), body.fullName(), body.username(),
                body.email(), body.password(), body.confirmPassword(), body.phone(), body.acceptTerms()), ctx);
    }

    @Operation(summary = "RF1.CA04/CA05/CA11 Confirma o código do e-mail (≤ 5 tentativas por código, 10/h por pessoa → 429 MUITAS_TENTATIVAS); "
            + "EMPREGADO → ACTIVE, EMPRESA/CHEFE → PENDING_VALIDATION; devolve a sessão")
    @PostMapping("/api/auth/email-verification/confirm")
    public Session confirm(@Valid @RequestBody ConfirmRequest body, RequestContext ctx) {
        return registration.confirmEmail(body.email(), body.code(), body.deviceName(), ctx);
    }

    @Operation(summary = "RF1.CA04 Reenvia o código de verificação; resposta 202 idêntica exista ou não a conta (5/h por pessoa)")
    @PostMapping("/api/auth/email-verification/resend")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> resend(@Valid @RequestBody EmailRequest body, RequestContext ctx) {
        registration.resendVerification(body.email(), ctx);
        return Map.of("status", "VERIFICACAO_ENVIADA");
    }

    @Operation(summary = "RF1.CA02/CA26 Disponibilidade do username normalizado (FORMATO | RESERVADO | EM_USO) com sugestões")
    @GetMapping("/api/usernames/{username}/availability")
    @AuthorizationExempt(reason = "Disponibilidade pública de nome de usuário (RF1.CA03): só diz livre/ocupado, limitada por IP; não lê recurso de ninguém")
    public RegistrationService.Availability availability(@PathVariable @Size(max = 80) String username) {
        return registration.availability(username);
    }

    @Operation(summary = "RF1.CA02 Sugestões de username livres a partir do nome ou do username desejado")
    @GetMapping("/api/auth/username-suggestions")
    public Map<String, List<String>> suggestions(@RequestParam(name = "base", defaultValue = "") @Size(max = 160) String base) {
        return Map.of("suggestions", registration.suggestions(base));
    }
}
