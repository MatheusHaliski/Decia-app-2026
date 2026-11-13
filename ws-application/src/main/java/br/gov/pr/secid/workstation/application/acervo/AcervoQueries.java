package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.DeadlineFilter;
import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.SortOrder;
import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.WorkFilter;
import br.gov.pr.secid.workstation.application.acervo.AcervoSummary.LegalAlert;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.TaskIndexRow;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.common.Priority;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Regras puras do Acervo (RF41.CA01/CA04/CA09), espelhadas em {@code lib/tasks/acervo.ts}: filtro, ordenação, página, contadores por
 * opção e alertas de prazo legal sobre o índice leve das tarefas do dono. Sem Spring, sem banco — testadas em {@code AcervoQueriesTest}.
 *
 * <p>Prazo efetivo = o mais próximo entre o prazo da tarefa ({@code dueAt}) e o prazo legal ({@code legalDueAt}). Só as tarefas abertas
 * (rascunho, a realizar, em andamento, bloqueada) estão "vencendo" ou "atrasadas": concluída, arquivada ou publicada não cobra prazo.
 */
public final class AcervoQueries {
    /** "Hoje" das contas de prazo: o fuso do produto (SECID-PR). */
    public static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    /** Janela de "vencendo" e dos alertas de prazo legal. */
    public static final int DUE_SOON_DAYS = 7;
    /** Quantos alertas de prazo legal o resumo traz (o total vem à parte). */
    public static final int MAX_ALERTS = 10;

    /** Contador que ignora o próprio filtro. */
    enum Facet {
        NONE, WORK, CATEGORY, PRIORITY, DEADLINE
    }

    /** Página pedida e quantas tarefas casam com todos os filtros. */
    public record Page(List<TaskIndexRow> items, int total) {
    }

    private AcervoQueries() {
    }

    public static boolean open(TaskState s) {
        return s == TaskState.RASCUNHO || s == TaskState.DISPONIVEL || s == TaskState.EM_USO || s == TaskState.BLOQUEADA;
    }

    public static LocalDate effectiveDue(LocalDate dueAt, LocalDate legalDueAt) {
        if (dueAt == null) {
            return legalDueAt;
        }
        if (legalDueAt == null) {
            return dueAt;
        }
        return legalDueAt.isBefore(dueAt) ? legalDueAt : dueAt;
    }

    static LocalDate effectiveDue(TaskIndexRow r) {
        return effectiveDue(r.dueAt(), r.legalDueAt());
    }

    public static boolean matchesDeadline(TaskIndexRow r, DeadlineFilter f, LocalDate today) {
        LocalDate due = effectiveDue(r);
        return switch (f) {
            case COM_PRAZO_LEGAL -> r.legalDueAt() != null;
            case VENCE_7_DIAS -> open(r.state()) && due != null && !due.isBefore(today) && !due.isAfter(today.plusDays(DUE_SOON_DAYS));
            case ATRASADAS -> open(r.state()) && due != null && due.isBefore(today);
        };
    }

    static boolean matches(TaskIndexRow r, AcervoQuery q, LocalDate today, Facet ignore) {
        if (ignore != Facet.WORK && q.filtro() != null && WorkFilter.of(r.state()) != q.filtro()) {
            return false;
        }
        if (ignore != Facet.CATEGORY && q.categoria() != null && r.category() != q.categoria()) {
            return false;
        }
        Priority p = r.priority() == null ? Priority.MEDIA : r.priority();
        if (ignore != Facet.PRIORITY && q.prioridade() != null && p != q.prioridade()) {
            return false;
        }
        return ignore == Facet.DEADLINE || q.prazo() == null || matchesDeadline(r, q.prazo(), today);
    }

    /** Comparador da ordenação; empates caem na última atualização e no id (ordem estável entre páginas). */
    static Comparator<TaskIndexRow> order(SortOrder o) {
        Comparator<TaskIndexRow> recentUpdate = Comparator.comparing(TaskIndexRow::updatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
        Comparator<TaskIndexRow> stable = Comparator.comparing(r -> r.id().toString());
        Comparator<TaskIndexRow> byDue = Comparator.comparing(AcervoQueries::effectiveDue, Comparator.nullsLast(Comparator.naturalOrder()));
        return switch (o) {
            case CRIACAO -> Comparator.comparing(TaskIndexRow::createdAt, Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(stable);
            case ATUALIZACAO -> recentUpdate.thenComparing(TaskIndexRow::createdAt, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(stable);
            // abertas com prazo primeiro (mais próximo antes), depois fechadas com prazo, por último sem prazo
            case PRAZO -> Comparator.comparingInt(AcervoQueries::dueGroup).thenComparing(byDue).thenComparing(recentUpdate).thenComparing(stable);
            case PRIORIDADE -> Comparator.comparingInt((TaskIndexRow r) -> -rank(r.priority())).thenComparing(byDue).thenComparing(recentUpdate)
                    .thenComparing(stable);
        };
    }

    private static int dueGroup(TaskIndexRow r) {
        if (effectiveDue(r) == null) {
            return 2;
        }
        return open(r.state()) ? 0 : 1;
    }

    static int rank(Priority p) {
        return (p == null ? Priority.MEDIA : p).ordinal();
    }

    public static Page page(List<TaskIndexRow> rows, AcervoQuery q, LocalDate today) {
        List<TaskIndexRow> matching = rows.stream().filter(r -> matches(r, q, today, Facet.NONE)).sorted(order(q.ordem())).toList();
        int from = Math.min(matching.size(), (q.page() - 1) * q.size());
        int to = Math.min(matching.size(), from + q.size());
        return new Page(matching.subList(from, to), matching.size());
    }

    public static AcervoSummary summary(List<TaskIndexRow> rows, AcervoQuery q, LocalDate today, boolean truncated) {
        Map<String, Integer> work = zeros(WorkFilter.values());
        Map<String, Integer> priority = zeros(Priority.values());
        Map<String, Integer> category = zeros(TaskCategory.values());
        Map<String, Integer> deadline = zeros(DeadlineFilter.values());
        int total = 0;
        for (TaskIndexRow r : rows) {
            if (matches(r, q, today, Facet.NONE)) {
                total++;
            }
            if (matches(r, q, today, Facet.WORK)) {
                work.merge(WorkFilter.of(r.state()).name(), 1, Integer::sum);
            }
            if (matches(r, q, today, Facet.PRIORITY)) {
                priority.merge((r.priority() == null ? Priority.MEDIA : r.priority()).name(), 1, Integer::sum);
            }
            if (r.category() != null && matches(r, q, today, Facet.CATEGORY)) {
                category.merge(r.category().name(), 1, Integer::sum);
            }
            if (matches(r, q, today, Facet.DEADLINE)) {
                for (DeadlineFilter f : DeadlineFilter.values()) {
                    if (matchesDeadline(r, f, today)) {
                        deadline.merge(f.name(), 1, Integer::sum);
                    }
                }
            }
        }
        List<LegalAlert> alerts = rows.stream()
                .filter(r -> open(r.state()) && r.legalDueAt() != null && !r.legalDueAt().isAfter(today.plusDays(DUE_SOON_DAYS)))
                .sorted(Comparator.comparing(TaskIndexRow::legalDueAt).thenComparing(r -> r.id().toString()))
                .map(r -> new LegalAlert(r.id(), r.title(), r.state(), r.legalDueAt(), ChronoUnit.DAYS.between(today, r.legalDueAt())))
                .toList();
        return new AcervoSummary(total, rows.size(), truncated, today, work, priority, category, deadline,
                alerts.subList(0, Math.min(MAX_ALERTS, alerts.size())), alerts.size());
    }

    private static Map<String, Integer> zeros(Enum<?>[] values) {
        Map<String, Integer> out = new LinkedHashMap<>();
        for (Enum<?> v : values) {
            out.put(v.name(), 0);
        }
        return out;
    }
}
