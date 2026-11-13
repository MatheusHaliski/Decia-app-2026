package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.StoredTask;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.LegalDeadlineCalendar;
import br.gov.pr.secid.workstation.domain.acervo.LegalDeadlineRule;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.security.ResourceAction;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Prazos legais (RF20.CA11, RF41.CA04): catálogo de regras ({@code GET /api/legal-deadlines}: padrão sem empresa + as da empresa de quem
 * pede, ativas e vigentes hoje) e o prazo legal da tarefa ({@code PUT /api/tasks/{id}/legal-deadline}): regra, data de início e vencimento
 * calculado pelo {@link LegalDeadlineCalendar} — o cliente nunca manda o vencimento. Editar exige {@code EDIT} na tarefa (BOLA pelo
 * {@link TaskService#authorized}), tarefa aberta (409 TAREFA_BLOQUEADA) e a versão atual (409 EDICAO_CONCORRENTE).
 */
@Service
public class LegalDeadlineService {
    /** Data de início aceita: até 10 anos para trás ou para a frente de hoje. */
    static final int MAX_YEARS = 10;

    private final LegalDeadlineRuleRepositoryPort rules;
    private final TaskRepositoryPort tasks;
    private final TaskService taskService;
    private final ResourceAuthorizer authorizer;
    private final AuditLogPort audit;
    private final Clock clock;

    public LegalDeadlineService(LegalDeadlineRuleRepositoryPort rules, TaskRepositoryPort tasks, TaskService taskService,
                                ResourceAuthorizer authorizer, AuditLogPort audit, Clock clock) {
        this.rules = rules;
        this.tasks = tasks;
        this.taskService = taskService;
        this.authorizer = authorizer;
        this.audit = audit;
        this.clock = clock;
    }

    /**
     * Regra do catálogo como a API mostra.
     *
     * @param companyRule regra própria da empresa (as padrão têm {@code false})
     */
    public record LegalDeadlineRuleView(UUID id, TaskCategory category, String subcategory, int days, boolean businessDays, String legalBasis,
                                        String description, boolean companyRule, LocalDate validFrom, LocalDate validTo) {
        static LegalDeadlineRuleView of(LegalDeadlineRule r) {
            return new LegalDeadlineRuleView(r.id(), r.category(), r.subcategory(), r.days(), r.businessDays(), r.legalBasis(), r.description(),
                    r.companyId() != null, r.validFrom(), r.validTo());
        }
    }

    /** Pedido: {@code ruleId} nulo limpa o prazo legal; com regra, a data de início é obrigatória. */
    public record LegalDeadlineInput(UUID ruleId, LocalDate startDate, long version) {
    }

    LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), AcervoQueries.ZONE);
    }

    public List<LegalDeadlineRuleView> rules(CurrentUser actor) {
        Viewer viewer = authorizer.viewer(actor);
        LocalDate today = today();
        return rules.findActive(viewer.companyId()).stream()
                .filter(r -> usable(r, viewer) && validOn(r, today))
                .sorted(Comparator.comparing(LegalDeadlineRule::legalBasis).thenComparing(LegalDeadlineRule::days)
                        .thenComparing(r -> r.id().toString()))
                .map(LegalDeadlineRuleView::of).toList();
    }

    @Transactional
    public TaskView apply(CurrentUser actor, UUID taskId, LegalDeadlineInput in, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = taskService.authorized(viewer, taskId, ResourceAction.EDIT);
        TaskItem current = stored.task();
        TaskService.requireWritable(current);
        TaskItem next;
        String ruleRef = "-";
        String dueRef = "-";
        if (in.ruleId() == null) {
            next = current.withLegalDeadline(null, null, null);
        } else {
            Map<String, Object> errors = new LinkedHashMap<>();
            LegalDeadlineRule rule = rules.findById(in.ruleId()).filter(r -> usable(r, viewer)).orElse(null);
            if (rule == null) {
                errors.put("ruleId", "Escolha uma regra do catálogo de prazos legais.");
            }
            LocalDate start = in.startDate();
            LocalDate today = today();
            if (start == null) {
                errors.put("startDate", "Informe a data de início (ciência ou recebimento).");
            } else if (start.isBefore(today.minusYears(MAX_YEARS)) || start.isAfter(today.plusYears(MAX_YEARS))) {
                errors.put("startDate", "Data de início fora do intervalo aceito (até " + MAX_YEARS + " anos de hoje).");
            } else if (rule != null && !validOn(rule, start)) {
                errors.put("startDate", "A regra escolhida não vale para esta data de início.");
            }
            if (!errors.isEmpty()) {
                throw TaskBriefJson.invalid(errors);
            }
            LegalDeadlineRule ok = Objects.requireNonNull(rule);
            LocalDate due = LegalDeadlineCalendar.dueDate(Objects.requireNonNull(start), ok.days(), ok.businessDays());
            next = current.withLegalDeadline(ok.id(), start, due);
            ruleRef = ok.id().toString();
            dueRef = due.toString();
        }
        StoredTask saved = tasks.update(next, stored.brief(), in.version());
        audit.record(AuditEvent.of(actor.id(), AuditActions.TASK_LEGAL_DEADLINE_SET, "task", taskId.toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("rule", ruleRef, "legalDueAt", dueRef, "version", saved.version())));
        return taskService.toView(viewer, saved);
    }

    /** Padrão (sem empresa) ou da empresa de quem pede; ativa e com dias dentro do teto do calendário. */
    static boolean usable(LegalDeadlineRule r, Viewer viewer) {
        boolean scope = r.companyId() == null || r.companyId().equals(viewer.companyId());
        return scope && r.active() && r.days() >= 1 && r.days() <= LegalDeadlineCalendar.MAX_DAYS;
    }

    static boolean validOn(LegalDeadlineRule r, LocalDate date) {
        return (r.validFrom() == null || !date.isBefore(r.validFrom())) && (r.validTo() == null || !date.isAfter(r.validTo()));
    }
}
