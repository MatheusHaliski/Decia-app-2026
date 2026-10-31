package br.gov.pr.secid.workstation.web.account;

import br.gov.pr.secid.workstation.application.account.PublicationService;
import br.gov.pr.secid.workstation.application.account.PublicationService.PublicationView;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RF3 — especialidades e controle de publicação do perfil público (auditoria Onda 1, 31/10/2026). Só a própria conta. A regra de quem
 * vê vale no servidor em perfil, foto, tarefas e seguir ({@code ResourceAuthorizer.requireProfileVisible}).
 */
@RestController
@Tag(name = "RF3 Conta")
public class PublicationController {
    private final PublicationService publication;

    public PublicationController(PublicationService publication) {
        this.publication = publication;
    }

    /** Campos ausentes não mudam; {@code specialties: []} limpa. */
    public record PublicationRequest(@Size(max = 30) List<@Size(max = 200) String> specialties, @Size(max = 20) String profileVisibility) {
    }

    @Operation(summary = "RF3 Minhas especialidades e quem vê meu perfil público (AUTENTICADOS | EMPRESA)")
    @GetMapping("/api/me/publication")
    public PublicationView mine(CurrentUser user) {
        return publication.mine(user);
    }

    @Operation(summary = "RF3 Altera especialidades (até 10, 2–40 caracteres, sem repetir) e quem vê o perfil público; 422 VALIDACAO por campo")
    @PutMapping("/api/me/publication")
    public PublicationView update(CurrentUser user, @Valid @RequestBody PublicationRequest body, RequestContext ctx) {
        return publication.update(user, new PublicationService.PublicationUpdate(body.specialties(), body.profileVisibility()), ctx);
    }
}
