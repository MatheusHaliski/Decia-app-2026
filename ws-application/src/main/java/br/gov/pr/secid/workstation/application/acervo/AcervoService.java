package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.StoredTask;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.TaskIndexRow;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Acervo de Tarefas do próprio usuário (RF41.CA01/CA04/CA09): sub-filtros, ordenação, página e contadores sobre o índice leve das
 * tarefas do dono ({@link TaskRepositoryPort#indexByOwner}); só as tarefas da página são lidas por completo. Regras puras em
 * {@link AcervoQueries}. Lê no máximo {@link #MAX_SCAN} tarefas do dono (as mais recentes); acima disso o resumo marca {@code truncated}.
 * Busca e contadores em OpenSearch/Redis seguem planejados (RF41 §5).
 */
@Service
public class AcervoService {
    static final int MAX_SCAN = 5_000;

    private final TaskRepositoryPort tasks;
    private final TaskService taskService;
    private final ResourceAuthorizer authorizer;
    private final Clock clock;

    public AcervoService(TaskRepositoryPort tasks, TaskService taskService, ResourceAuthorizer authorizer, Clock clock) {
        this.tasks = tasks;
        this.taskService = taskService;
        this.authorizer = authorizer;
        this.clock = clock;
    }

    LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), AcervoQueries.ZONE);
    }

    /** Página das minhas tarefas com os filtros pedidos. */
    public List<TaskView> list(CurrentUser actor, AcervoQuery query) {
        Viewer viewer = authorizer.viewer(actor);
        List<TaskIndexRow> rows = tasks.indexByOwner(actor.id(), MAX_SCAN);
        AcervoQueries.Page page = AcervoQueries.page(rows, query, today());
        if (page.items().isEmpty()) {
            return List.of();
        }
        Map<UUID, StoredTask> full = tasks.findAllById(page.items().stream().map(TaskIndexRow::id).toList()).stream()
                .collect(Collectors.toMap(s -> s.task().id(), Function.identity(), (a, b) -> a));
        return page.items().stream().map(r -> full.get(r.id())).filter(Objects::nonNull).map(s -> taskService.toView(viewer, s)).toList();
    }

    /** Total, contadores por opção e alertas de prazo legal das minhas tarefas. */
    public AcervoSummary summary(CurrentUser actor, AcervoQuery query) {
        authorizer.viewer(actor);
        List<TaskIndexRow> rows = tasks.indexByOwner(actor.id(), MAX_SCAN + 1);
        boolean truncated = rows.size() > MAX_SCAN;
        return AcervoQueries.summary(truncated ? rows.subList(0, MAX_SCAN) : rows, query, today(), truncated);
    }
}
