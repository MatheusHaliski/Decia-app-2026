package br.gov.pr.secid.workstation.web.acervo;

import br.gov.pr.secid.workstation.application.acervo.AcervoQuery;
import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.DeadlineFilter;
import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.SortOrder;
import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.WorkFilter;
import br.gov.pr.secid.workstation.application.acervo.AcervoService;
import br.gov.pr.secid.workstation.application.acervo.AcervoSummary;
import br.gov.pr.secid.workstation.application.acervo.LegalDeadlineService;
import br.gov.pr.secid.workstation.application.acervo.LegalDeadlineService.LegalDeadlineInput;
import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Criterion;
import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Deliverable;
import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Reference;
import br.gov.pr.secid.workstation.application.acervo.TaskService;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskInput;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TransitionInput;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.acervo.WorkArea;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.web.security.AuthorizedBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * RF4/RF12/RF41 — criador, edição e estados das tarefas do próprio acervo (auditoria 17/10/2026), sub-filtros/ordenação/página e contadores
 * do Acervo e o prazo legal da tarefa (12/11/2026). Autorização de recurso no serviço ({@code ResourceAuthorizer.require}, VIEW/EDIT); o
 * invisível responde 404 igual a inexistente. Os limites de tamanho e formato das listas do briefing são validados no serviço e voltam
 * juntos em 422 VALIDACAO; filtro com valor fora da lista responde 400 PARAMETRO_INVALIDO.
 */
@RestController
@Tag(name = "RF4 Tarefas")
public class TaskController {
    private final TaskService tasks;
    private final AcervoService acervo;
    private final LegalDeadlineService legal;

    public TaskController(TaskService tasks, AcervoService acervo, LegalDeadlineService legal) {
        this.tasks = tasks;
        this.acervo = acervo;
        this.legal = legal;
    }

    /** Corpo do criador/edição; {@code version} só é exigido na edição. */
    public record TaskRequest(@Size(max = 200) String title, @Size(max = 20000) String descriptionMd, TaskType type, TaskCategory category,
                              Priority priority, LocalDate dueAt, UUID responsibleId, AccessClassification accessClass, Visibility visibility,
                              @Size(max = 500) String objective, WorkArea area, List<Deliverable> deliverables, List<Criterion> acceptanceCriteria,
                              List<Reference> references, Map<String, String> extensions, Boolean draft, Long version) {
        TaskInput toInput() {
            return new TaskInput(title, descriptionMd, type, category, priority, dueAt, responsibleId, accessClass, visibility, objective, area,
                    deliverables, acceptanceCriteria, references, extensions, draft);
        }
    }

    public record TransitionRequest(@NotNull TaskState to, @Size(max = 500) String reason, UUID blockedByTaskId, UUID blockedByUserId,
                                    @NotNull Long version) {
    }

    /** Prazo legal da tarefa: regra do catálogo e data de início (ciência/recebimento); {@code ruleId} nulo limpa. O vencimento é calculado. */
    public record LegalDeadlineRequest(UUID ruleId, LocalDate startDate, @NotNull Long version) {
    }

    @Operation(summary = "RF4.CA01 Criar tarefa (campos comuns + briefing por área)")
    @PostMapping("/api/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskView create(CurrentUser user, @Valid @RequestBody TaskRequest body, RequestContext ctx) {
        return tasks.create(user, body.toInput(), ctx);
    }

    @Operation(summary = "RF41.CA01/CA09 Minhas tarefas com sub-filtros (estado de trabalho, categoria, prioridade, prazo), ordenação e página "
            + "(sem filtros: mais recentes primeiro; limit = itens sem page; size padrão 20 com page)")
    @GetMapping("/api/tasks")
    public List<TaskView> mine(CurrentUser user, @RequestParam(defaultValue = "50") int limit,
                               @RequestParam(required = false) WorkFilter filtro, @RequestParam(required = false) TaskCategory categoria,
                               @RequestParam(required = false) Priority prioridade, @RequestParam(required = false) DeadlineFilter prazo,
                               @RequestParam(required = false) SortOrder ordem, @RequestParam(required = false) Integer page,
                               @RequestParam(required = false) Integer size) {
        return acervo.list(user, query(limit, filtro, categoria, prioridade, prazo, ordem, page, size));
    }

    @Operation(summary = "RF41.CA01/CA04 Contadores do Acervo para os mesmos filtros (cada contador ignora o próprio filtro) e alertas de "
            + "prazo legal (vencidos, hoje e em até 7 dias)")
    @GetMapping("/api/tasks/summary")
    public AcervoSummary acervoSummary(CurrentUser user, @RequestParam(required = false) WorkFilter filtro,
                                             @RequestParam(required = false) TaskCategory categoria, @RequestParam(required = false) Priority prioridade,
                                       @RequestParam(required = false) DeadlineFilter prazo) {
        return acervo.summary(user, new AcervoQuery(filtro, categoria, prioridade, prazo, SortOrder.CRIACAO, 1, AcervoQuery.DEFAULT_SIZE));
    }

    /** Página e tamanho validados (400 PARAMETRO_INVALIDO); sem page, o antigo {@code limit} (1–100) define quantos itens vêm. */
    static AcervoQuery query(int limit, WorkFilter filtro, TaskCategory categoria, Priority prioridade, DeadlineFilter prazo, SortOrder ordem,
                             Integer page, Integer size) {
        if (page != null && page < 1) {
            throw invalidParam("page");
        }
        if (size != null && (size < 1 || size > AcervoQuery.MAX_SIZE)) {
            throw invalidParam("size");
        }
        int pageSize = size != null ? size : page != null ? AcervoQuery.DEFAULT_SIZE : Math.max(1, Math.min(limit, AcervoQuery.MAX_SIZE));
        return new AcervoQuery(filtro, categoria, prioridade, prazo, ordem, page == null ? 1 : page, pageSize);
    }

    private static ApiException invalidParam(String name) {
        return ApiException.badRequest("PARAMETRO_INVALIDO", "Parâmetro ausente ou inválido: " + name + ".", Map.of("parameter", name));
    }

    @Operation(summary = "RF12.CA01 Abrir tarefa")
    @GetMapping("/api/tasks/{id}")
    @AuthorizedBy("require")
    public TaskView get(CurrentUser user, @PathVariable UUID id) {
        return tasks.get(user, id);
    }

    @Operation(summary = "RF12.CA02 Editar tarefa (versão obrigatória; 409 EDICAO_CONCORRENTE)")
    @PutMapping("/api/tasks/{id}")
    @AuthorizedBy("require")
    public TaskView update(CurrentUser user, @PathVariable UUID id, @Valid @RequestBody TaskRequest body, RequestContext ctx) {
        if (body.version() == null) {
            throw ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.",
                    Map.of("fields", Map.of("version", "Versão obrigatória para editar.")));
        }
        return tasks.update(user, id, body.toInput(), body.version(), ctx);
    }

    @Operation(summary = "RF41.CA02 Mudar estado da tarefa (tabela do TaskState; bloqueio exige causa e motivo)")
    @PostMapping("/api/tasks/{id}/transitions")
    @AuthorizedBy("require")
    public TaskView transition(CurrentUser user, @PathVariable UUID id, @Valid @RequestBody TransitionRequest body, RequestContext ctx) {
        return tasks.transition(user, id, new TransitionInput(body.to(), body.reason(), body.blockedByTaskId(), body.blockedByUserId(),
                body.version()), ctx);
    }

    @Operation(summary = "RF41.CA04/RF20.CA11 Define ou limpa o prazo legal (regra do catálogo + data de início; o vencimento é calculado em "
            + "dias corridos ou úteis com os feriados nacionais; 409 TAREFA_BLOQUEADA, 409 EDICAO_CONCORRENTE, 422 VALIDACAO)")
    @PutMapping("/api/tasks/{id}/legal-deadline")
    @AuthorizedBy("require")
    public TaskView setLegalDeadline(CurrentUser user, @PathVariable UUID id, @Valid @RequestBody LegalDeadlineRequest body,
                                     RequestContext ctx) {
        return legal.apply(user, id, new LegalDeadlineInput(body.ruleId(), body.startDate(), body.version()), ctx);
    }
}
