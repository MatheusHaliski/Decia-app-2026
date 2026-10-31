package br.gov.pr.secid.workstation.web.people;

import br.gov.pr.secid.workstation.application.acervo.TaskService;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.people.PeopleService;
import br.gov.pr.secid.workstation.application.people.PeopleService.PersonView;
import br.gov.pr.secid.workstation.application.people.PeopleService.PublicProfileView;
import br.gov.pr.secid.workstation.application.social.FollowService;
import br.gov.pr.secid.workstation.application.social.FollowService.FollowView;
import br.gov.pr.secid.workstation.web.security.AuthorizedBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * RF4/RF10/RF16 — pessoas: busca na própria empresa (responsável, atribuição) e perfil público por nome de usuário com as tarefas
 * que o viewer pode ver (auditoria 17/10/2026). Recusa uniforme 404 para conta inexistente ou não ativa.
 */
@RestController
@Tag(name = "RF16 Pessoas")
public class PeopleController {
    private final PeopleService people;
    private final TaskService tasks;
    private final FollowService follows;

    public PeopleController(PeopleService people, TaskService tasks, FollowService follows) {
        this.people = people;
        this.tasks = tasks;
        this.follows = follows;
    }

    @Operation(summary = "RF4/RF10 Buscar pessoas da minha empresa (≥ 2 caracteres; só contas ativas)")
    @GetMapping("/api/people")
    public List<PersonView> search(CurrentUser user, @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "10") int limit) {
        return people.search(user, q, limit);
    }

    @Operation(summary = "RF16.CA01 Perfil público por nome de usuário")
    @GetMapping("/api/people/by-username/{username}")
    @AuthorizedBy("requireProfileVisible")
    public PublicProfileView byUsername(CurrentUser user, @PathVariable String username) {
        return people.byUsername(user, username);
    }

    @Operation(summary = "RF16/RF17 Tarefas de uma pessoa que eu posso ver")
    @GetMapping("/api/people/{id}/tasks")
    @AuthorizedBy("requireProfileVisible")
    public List<TaskView> tasksOf(CurrentUser user, @PathVariable UUID id, @RequestParam(defaultValue = "50") int limit) {
        people.visibleById(user, id);
        return tasks.listOf(user, id, limit);
    }

    @Operation(summary = "RF16.CA01 Sigo esta pessoa? Quantos a seguem e quantas ela segue")
    @GetMapping("/api/people/{id}/follow")
    @AuthorizedBy("requireProfileVisible")
    public FollowView followStatus(CurrentUser user, @PathVariable UUID id) {
        return follows.status(user, id);
    }

    @Operation(summary = "RF16.CA01 Seguir (idempotente; 422 SEGUIR_A_SI_MESMO; conta não ativa → 404)")
    @PutMapping("/api/people/{id}/follow")
    @AuthorizedBy("requireProfileVisible")
    public FollowView follow(CurrentUser user, @PathVariable UUID id) {
        return follows.follow(user, id);
    }

    @Operation(summary = "RF16.CA01 Deixar de seguir (idempotente)")
    @DeleteMapping("/api/people/{id}/follow")
    @AuthorizedBy("requireProfileVisible")
    public FollowView unfollow(CurrentUser user, @PathVariable UUID id) {
        return follows.unfollow(user, id);
    }
}
