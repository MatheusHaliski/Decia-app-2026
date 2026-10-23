package br.gov.pr.secid.workstation.web.account;

import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.TwoFactorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * RF2.CA02 / RF3 — verificação em duas etapas da própria conta (D-144). Sem id no caminho: o recurso é sempre a conta do token,
 * conferida pelo {@code ResourceAuthorizer} no serviço. Ações que ligam ou desligam pedem a senha atual (mesmo bloqueio do login).
 */
@RestController
@Tag(name = "RF2 Autenticação")
public class TwoFactorController {
    private final TwoFactorService twoFactor;

    public TwoFactorController(TwoFactorService twoFactor) {
        this.twoFactor = twoFactor;
    }

    public record PasswordBody(@NotBlank @Size(max = 128) String currentPassword) {
    }

    public record CodeBody(@NotBlank @Size(max = 12) String code) {
    }

    public record PasswordAndCodeBody(@NotBlank @Size(max = 128) String currentPassword, @NotBlank @Size(max = 12) String code) {
    }

    @Operation(summary = "RF2.CA02 Situação do 2FA (ativo, desde quando, códigos de recuperação restantes, configuração pendente)")
    @GetMapping("/api/me/2fa")
    public TwoFactorService.Status status(CurrentUser user) {
        return twoFactor.status(user);
    }

    @Operation(summary = "RF2.CA02 Começa a ativação: senha atual → segredo e URI otpauth:// para o aplicativo autenticador (409 DOIS_FATORES_JA_ATIVO)")
    @PostMapping("/api/me/2fa/setup")
    public TwoFactorService.Setup setup(CurrentUser user, @Valid @RequestBody PasswordBody body, RequestContext ctx) {
        return twoFactor.setup(user, body.currentPassword(), ctx);
    }

    @Operation(summary = "RF2.CA02 Confirma com o primeiro código do aplicativo: liga o 2FA, devolve 10 códigos de recuperação uma única vez "
            + "e encerra as outras sessões (422 DOIS_FATORES_INVALIDO)")
    @PostMapping("/api/me/2fa/enable")
    public TwoFactorService.RecoveryCodes enable(CurrentUser user, @Valid @RequestBody CodeBody body, RequestContext ctx) {
        return twoFactor.enable(user, body.code(), ctx);
    }

    @Operation(summary = "RF2.CA02 Desliga o 2FA: senha atual + código do aplicativo ou de recuperação")
    @PostMapping("/api/me/2fa/disable")
    public TwoFactorService.Status disable(CurrentUser user, @Valid @RequestBody PasswordAndCodeBody body, RequestContext ctx) {
        return twoFactor.disable(user, body.currentPassword(), body.code(), ctx);
    }

    @Operation(summary = "RF2.CA02 Gera novos códigos de recuperação (os antigos deixam de valer): senha atual + código do aplicativo")
    @PostMapping("/api/me/2fa/recovery-codes")
    public TwoFactorService.RecoveryCodes regenerate(CurrentUser user, @Valid @RequestBody PasswordAndCodeBody body, RequestContext ctx) {
        return twoFactor.regenerateRecoveryCodes(user, body.currentPassword(), body.code(), ctx);
    }
}
