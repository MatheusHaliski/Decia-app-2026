package br.gov.pr.secid.workstation.web.account;

import br.gov.pr.secid.workstation.application.account.AccountService;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserView;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * RF3 — a própria conta. Todo endpoint exige papel conhecido (USER/ADMIN) e {@code sid} vivo; {@code GET /api/users/{id}}
 * passa pelo {@code Guard.ownerOrAdmin} (403 ACESSO_NEGADO para terceiros). Step-ups ({@code /sensitive}, {@code /deletion})
 * pedem a senha atual no mesmo bloqueio do login (6º erro → 429 MUITAS_TENTATIVAS + Retry-After).
 */
@RestController
@Tag(name = "RF3 Conta")
public class MeController {
    private final AccountService account;

    public MeController(AccountService account) {
        this.account = account;
    }

    public record ProfileRequest(@Size(max = 160) String fullName, @Size(max = 80) String displayName, @Size(max = 120) String jobTitle,
                                 @Size(max = 1000) String bio, @Size(max = 500) String avatarUrl, @Size(max = 500) String coverUrl,
                                 @Size(max = 20) String hypeVisibility, Boolean rankingOptOut) {
    }

    public record SensitiveRequest(@NotBlank @Size(max = 128) String currentPassword, @Size(max = 320) String email, @Size(max = 32) String phone) {
    }

    public record DeletionBody(@NotBlank @Size(max = 128) String currentPassword, @Size(max = 500) String reason) {
    }

    public record PreferencesRequest(String theme, String language, String density, BigDecimal fontScale, Boolean reduceMotion, String deskSkin,
                                     String defaultCardSkin, String notificationPrefsJson, String timezone, Integer wipLimit,
                                     String dashboardLayoutJson, String aiModeDefault) {
        UserPreferences toDomain() {
            UserPreferences p = new UserPreferences();
            p.setTheme(theme);
            p.setLanguage(language);
            p.setDensity(density);
            p.setFontScale(fontScale);
            p.setReduceMotion(Boolean.TRUE.equals(reduceMotion));
            p.setDeskSkin(deskSkin);
            p.setDefaultCardSkin(defaultCardSkin);
            p.setNotificationPrefsJson(notificationPrefsJson);
            p.setTimezone(timezone);
            p.setWipLimit(wipLimit == null ? 0 : wipLimit);
            p.setDashboardLayoutJson(dashboardLayoutJson);
            p.setAiModeDefault(aiModeDefault);
            return p;
        }
    }

    @Operation(summary = "RF3.CA01 Minha conta (projeção sem hash)")
    @GetMapping("/api/me")
    public UserView me(CurrentUser user) {
        return account.me(user);
    }

    @Operation(summary = "RF3.CA01 Perfil por id — só o dono ou ADMIN (Guard.ownerOrAdmin → 403 ACESSO_NEGADO)")
    @GetMapping("/api/users/{id}")
    public UserView profile(CurrentUser user, @PathVariable UUID id) {
        return account.profile(user, id);
    }

    @Operation(summary = "RF3.CA01/CA04/CA06 Edita campos não sensíveis (422 VALIDACAO por campo); 403 EXCLUSAO_AGENDADA durante o prazo")
    @PatchMapping("/api/me")
    public UserView update(CurrentUser user, @Valid @RequestBody ProfileRequest body, RequestContext ctx) {
        return account.update(user, new AccountService.ProfileUpdate(body.fullName(), body.displayName(), body.jobTitle(), body.bio(),
                body.avatarUrl(), body.coverUrl(), body.hypeVisibility(), body.rankingOptOut()), ctx);
    }

    @Operation(summary = "RF3.CA02/CA08 E-mail/telefone com step-up da senha atual no mesmo bloqueio do login (401 REAUTENTICACAO_FALHOU, "
            + "6º erro → 429 MUITAS_TENTATIVAS); e-mail novo volta a 'não confirmado' e recebe código")
    @PatchMapping("/api/me/sensitive")
    public UserView sensitive(CurrentUser user, @Valid @RequestBody SensitiveRequest body, RequestContext ctx) {
        return account.updateSensitive(user, new AccountService.SensitiveUpdate(body.currentPassword(), body.email(), body.phone()), ctx);
    }

    @Operation(summary = "RF3.CA19 Pede a exclusão (senha atual com bloqueio): DELETION_SCHEDULED por 30 dias, cancelável; "
            + "a anonimização é o job do bloco LGPD C")
    @PostMapping("/api/me/deletion")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AccountService.DeletionReceipt requestDeletion(CurrentUser user, @Valid @RequestBody DeletionBody body, RequestContext ctx) {
        return account.requestDeletion(user, new AccountService.DeletionRequest(body.currentPassword(), body.reason()), ctx);
    }

    @Operation(summary = "RF3.CA19/CA20 Cancela a exclusão agendada (409 EXCLUSAO_NAO_AGENDADA se não houver)")
    @DeleteMapping("/api/me/deletion")
    public AccountService.DeletionReceipt cancelDeletion(CurrentUser user, RequestContext ctx) {
        return account.cancelDeletion(user, ctx);
    }

    @Operation(summary = "RF3.CA03 Preferências (padrões do V2 quando ainda não gravadas)")
    @GetMapping("/api/me/preferences")
    public UserPreferences preferences(CurrentUser user) {
        return account.preferences(user);
    }

    @Operation(summary = "RF3.CA03 Salva as preferências (valores validados contra os CHECKs do V2; 422 VALIDACAO por campo)")
    @PutMapping("/api/me/preferences")
    public UserPreferences updatePreferences(CurrentUser user, @Valid @RequestBody PreferencesRequest body, RequestContext ctx) {
        return account.updatePreferences(user, body.toDomain(), ctx);
    }
}
