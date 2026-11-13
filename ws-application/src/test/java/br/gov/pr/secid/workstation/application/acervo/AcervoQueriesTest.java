package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.DeadlineFilter;
import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.SortOrder;
import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.WorkFilter;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.TaskIndexRow;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.Priority;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** RF41.CA01/CA04/CA09 — sub-filtros, ordenação, página, contadores por opção e alertas de prazo legal (regras puras). */
class AcervoQueriesTest {
    static final LocalDate TODAY = LocalDate.of(2026, 11, 12);
    static final Instant T = Instant.parse("2026-11-01T12:00:00Z");

    static TaskIndexRow row(String title, TaskState state, Priority p, TaskCategory c, LocalDate due, LocalDate legal, int createdMin, int updatedMin) {
        return new TaskIndexRow(UUID.nameUUIDFromBytes(title.getBytes()), title, TaskType.DOCUMENTO, c, p, state, due, legal,
                T.plusSeconds(createdMin * 60L), T.plusSeconds(updatedMin * 60L));
    }

    static List<String> titles(List<TaskIndexRow> rows) {
        return rows.stream().map(TaskIndexRow::title).toList();
    }

    final List<TaskIndexRow> rows = List.of(
            row("lai-atrasada", TaskState.EM_USO, Priority.ALTA, TaskCategory.OFICIO_MEMORANDO, null, TODAY.minusDays(2), 1, 50),
            row("parecer-hoje", TaskState.DISPONIVEL, Priority.CRITICA, TaskCategory.PARECER_TECNICO, null, TODAY, 2, 40),
            row("etp-semana", TaskState.BLOQUEADA, Priority.MEDIA, TaskCategory.ETP, TODAY.plusDays(5), null, 3, 30),
            row("recurso-mes", TaskState.RASCUNHO, Priority.BAIXA, TaskCategory.OUTRO, TODAY.plusDays(20), TODAY.plusDays(30), 4, 20),
            row("concluida-vencida", TaskState.CONCLUIDA, Priority.ALTA, TaskCategory.ETP, TODAY.minusDays(9), TODAY.minusDays(9), 5, 10),
            row("modelo", TaskState.MODELO_PUBLICO, Priority.MEDIA, null, null, null, 6, 60),
            row("arquivada", TaskState.ARQUIVADA, Priority.BAIXA, TaskCategory.ATA, TODAY.minusDays(1), null, 7, 5));

    @Test
    void prazoEfetivoEOMaisProximoEntrePrazoEPrazoLegal() {
        assertThat(AcervoQueries.effectiveDue(TODAY, TODAY.plusDays(3))).isEqualTo(TODAY);
        assertThat(AcervoQueries.effectiveDue(TODAY.plusDays(3), TODAY)).isEqualTo(TODAY);
        assertThat(AcervoQueries.effectiveDue(null, TODAY)).isEqualTo(TODAY);
        assertThat(AcervoQueries.effectiveDue(TODAY, null)).isEqualTo(TODAY);
        assertThat(AcervoQueries.effectiveDue(null, null)).isNull();
    }

    @Test
    void filtrosDePrazoSoCobramAsAbertas() {
        AcervoQuery atrasadas = new AcervoQuery(null, null, null, DeadlineFilter.ATRASADAS, SortOrder.PRAZO, 1, 20);
        assertThat(titles(AcervoQueries.page(rows, atrasadas, TODAY).items())).containsExactly("lai-atrasada");
        AcervoQuery semana = new AcervoQuery(null, null, null, DeadlineFilter.VENCE_7_DIAS, SortOrder.PRAZO, 1, 20);
        assertThat(titles(AcervoQueries.page(rows, semana, TODAY).items())).containsExactly("parecer-hoje", "etp-semana");
        AcervoQuery legal = new AcervoQuery(null, null, null, DeadlineFilter.COM_PRAZO_LEGAL, SortOrder.CRIACAO, 1, 20);
        assertThat(titles(AcervoQueries.page(rows, legal, TODAY).items()))
                .containsExactly("concluida-vencida", "recurso-mes", "parecer-hoje", "lai-atrasada");
    }

    @Test
    void estadoDeTrabalhoCategoriaEPrioridadeCombinam() {
        AcervoQuery aRealizar = new AcervoQuery(WorkFilter.A_REALIZAR, null, null, null, null, 1, 20);
        assertThat(titles(AcervoQueries.page(rows, aRealizar, TODAY).items())).containsExactly("recurso-mes", "parecer-hoje");
        AcervoQuery publicado = new AcervoQuery(WorkFilter.PUBLICADO, null, null, null, null, 1, 20);
        assertThat(titles(AcervoQueries.page(rows, publicado, TODAY).items())).containsExactly("modelo");
        AcervoQuery etpAlta = new AcervoQuery(null, TaskCategory.ETP, Priority.ALTA, null, null, 1, 20);
        assertThat(titles(AcervoQueries.page(rows, etpAlta, TODAY).items())).containsExactly("concluida-vencida");
        AcervoQuery nada = new AcervoQuery(WorkFilter.BLOQUEADO, TaskCategory.ATA, null, null, null, 1, 20);
        assertThat(AcervoQueries.page(rows, nada, TODAY).total()).isZero();
    }

    @Test
    void ordenacoes() {
        assertThat(titles(AcervoQueries.page(rows, AcervoQuery.firstPage(20), TODAY).items()))
                .containsExactly("arquivada", "modelo", "concluida-vencida", "recurso-mes", "etp-semana", "parecer-hoje", "lai-atrasada");
        AcervoQuery update = new AcervoQuery(null, null, null, null, SortOrder.ATUALIZACAO, 1, 20);
        assertThat(titles(AcervoQueries.page(rows, update, TODAY).items()))
                .containsExactly("modelo", "lai-atrasada", "parecer-hoje", "etp-semana", "recurso-mes", "concluida-vencida", "arquivada");
        // prazo: abertas com prazo (mais próximo antes) → fechadas com prazo → sem prazo
        AcervoQuery prazo = new AcervoQuery(null, null, null, null, SortOrder.PRAZO, 1, 20);
        assertThat(titles(AcervoQueries.page(rows, prazo, TODAY).items()))
                .containsExactly("lai-atrasada", "parecer-hoje", "etp-semana", "recurso-mes", "concluida-vencida", "arquivada", "modelo");
        // prioridade: crítica → baixa; empate pelo prazo mais próximo
        AcervoQuery prioridade = new AcervoQuery(null, null, null, null, SortOrder.PRIORIDADE, 1, 20);
        assertThat(titles(AcervoQueries.page(rows, prioridade, TODAY).items()))
                .containsExactly("parecer-hoje", "concluida-vencida", "lai-atrasada", "etp-semana", "modelo", "arquivada", "recurso-mes");
    }

    @Test
    void paginaDe20ETotal() {
        List<TaskIndexRow> many = new ArrayList<>();
        for (int i = 0; i < 45; i++) {
            many.add(row("t" + i, TaskState.DISPONIVEL, Priority.MEDIA, null, null, null, i, i));
        }
        AcervoQuery p3 = new AcervoQuery(null, null, null, null, SortOrder.CRIACAO, 3, AcervoQuery.DEFAULT_SIZE);
        AcervoQueries.Page page = AcervoQueries.page(many, p3, TODAY);
        assertThat(page.total()).isEqualTo(45);
        assertThat(titles(page.items())).containsExactly("t4", "t3", "t2", "t1", "t0");
        assertThat(AcervoQueries.page(many, new AcervoQuery(null, null, null, null, null, 9, 20), TODAY).items()).isEmpty();
        assertThat(new AcervoQuery(null, null, null, null, null, 0, 500)).extracting(AcervoQuery::page, AcervoQuery::size).containsExactly(1, 100);
    }

    @Test
    void contadoresIgnoramOProprioFiltroERespeitamOsDemais() {
        AcervoQuery q = new AcervoQuery(WorkFilter.A_REALIZAR, null, Priority.CRITICA, null, null, 1, 20);
        AcervoSummary s = AcervoQueries.summary(rows, q, TODAY, false);
        assertThat(s.total()).isEqualTo(1);
        // por prioridade: dentro de "A realizar" (ignora a prioridade escolhida)
        assertThat(s.byPriority()).containsEntry("CRITICA", 1).containsEntry("BAIXA", 1).containsEntry("ALTA", 0).containsEntry("MEDIA", 0);
        // por estado: dentro de "Crítica" (ignora o estado escolhido)
        assertThat(s.byWorkStatus()).containsEntry("A_REALIZAR", 1).containsEntry("EM_ANDAMENTO", 0).hasSize(WorkFilter.values().length);
        assertThat(s.byCategory()).containsEntry("PARECER_TECNICO", 1).containsEntry("ETP", 0).hasSize(TaskCategory.values().length);
        assertThat(s.byDeadline()).containsEntry("VENCE_7_DIAS", 1).containsEntry("COM_PRAZO_LEGAL", 1).containsEntry("ATRASADAS", 0);
        assertThat(s.today()).isEqualTo(TODAY);
        assertThat(s.scanned()).isEqualTo(rows.size());
    }

    @Test
    void alertasDePrazoLegalIndependemDosFiltros() {
        AcervoQuery filtrando = new AcervoQuery(WorkFilter.CONCLUIDO, null, null, null, null, 1, 20);
        AcervoSummary s = AcervoQueries.summary(rows, filtrando, TODAY, false);
        // abertas com prazo legal vencido, hoje ou em até 7 dias; a concluída vencida não alerta; a de 30 dias ainda não
        assertThat(s.legalAlerts()).extracting(AcervoSummary.LegalAlert::title).containsExactly("lai-atrasada", "parecer-hoje");
        assertThat(s.legalAlerts()).extracting(AcervoSummary.LegalAlert::daysLeft).containsExactly(-2L, 0L);
        assertThat(s.legalAlertCount()).isEqualTo(2);

        List<TaskIndexRow> many = new ArrayList<>();
        for (int i = 0; i < 14; i++) {
            many.add(row("legal" + i, TaskState.EM_USO, Priority.MEDIA, null, null, TODAY.plusDays(i % 8), i, i));
        }
        AcervoSummary capped = AcervoQueries.summary(many, AcervoQuery.firstPage(20), TODAY, true);
        assertThat(capped.legalAlerts()).hasSize(AcervoQueries.MAX_ALERTS);
        assertThat(capped.legalAlertCount()).isEqualTo(14);
        assertThat(capped.truncated()).isTrue();
        assertThat(capped.legalAlerts().get(0).daysLeft()).isZero();
    }
}
