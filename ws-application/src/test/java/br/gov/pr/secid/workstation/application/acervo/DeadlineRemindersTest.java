package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.DeadlineReminders.Notice;
import br.gov.pr.secid.workstation.application.acervo.DeadlineReminders.Prefs;
import br.gov.pr.secid.workstation.application.acervo.DeadlineReminders.Source;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** RF41.CA04 — regras puras do aviso diário de prazo: quando avisa, qual prazo vale, chave de idempotência e preferências. */
class DeadlineRemindersTest {
    static final UUID ID = UUID.fromString("00000000-0000-4000-8000-0000000000aa");
    static final LocalDate TODAY = LocalDate.of(2026, 11, 24);
    static final List<Integer> N = DeadlineReminders.DEFAULT_NEAR_DAYS;

    Optional<Notice> eval(TaskState s, LocalDate due, LocalDate legal) {
        return DeadlineReminders.evaluate(ID, s, due, legal, TODAY, N);
    }

    @Test
    void avisaSoNosDiasConfiguradosENoDiaDoVencimento() {
        assertThat(eval(TaskState.EM_USO, TODAY.plusDays(3), null)).hasValueSatisfying(n -> {
            assertThat(n.type()).isEqualTo(NotificationType.PRAZO_PROXIMO);
            assertThat(n.days()).isEqualTo(3);
            assertThat(n.source()).isEqualTo(Source.TAREFA);
            assertThat(n.groupKey()).isEqualTo("prazo:" + ID + ":PRAZO_PROXIMO:2026-11-24");
        });
        assertThat(eval(TaskState.EM_USO, TODAY.plusDays(1), null)).hasValueSatisfying(n -> assertThat(n.days()).isEqualTo(1));
        assertThat(eval(TaskState.EM_USO, TODAY, null)).as("vence hoje").hasValueSatisfying(n -> {
            assertThat(n.type()).isEqualTo(NotificationType.PRAZO_PROXIMO);
            assertThat(n.days()).isZero();
        });
        assertThat(eval(TaskState.EM_USO, TODAY.plusDays(2), null)).as("2 dias não está na lista 3,1").isEmpty();
        assertThat(eval(TaskState.EM_USO, TODAY.plusDays(4), null)).isEmpty();
    }

    @Test
    void vencidaAvisaUmaVezPorVencimentoDentroDaJanela() {
        Notice a = eval(TaskState.BLOQUEADA, TODAY.minusDays(1), null).orElseThrow();
        assertThat(a.type()).isEqualTo(NotificationType.PRAZO_VENCIDO);
        assertThat(a.days()).isEqualTo(-1);
        assertThat(a.groupKey()).as("chave pelo dia do vencimento, não pelo de hoje").isEqualTo("prazo:" + ID + ":PRAZO_VENCIDO:2026-11-23");
        Notice later = DeadlineReminders.evaluate(ID, TaskState.BLOQUEADA, TODAY.minusDays(1), null, TODAY.plusDays(2), N).orElseThrow();
        assertThat(later.groupKey()).as("rodada perdida: o dia seguinte gera a MESMA chave").isEqualTo(a.groupKey());
        assertThat(eval(TaskState.EM_USO, TODAY.minusDays(DeadlineReminders.OVERDUE_LOOKBACK_DAYS), null)).isPresent();
        assertThat(eval(TaskState.EM_USO, TODAY.minusDays(DeadlineReminders.OVERDUE_LOOKBACK_DAYS + 1L), null)).isEmpty();
    }

    @Test
    void prazoEfetivoEhOMaisProximoEntreOdaTarefaEOLegal() {
        assertThat(eval(TaskState.DISPONIVEL, TODAY.plusDays(10), TODAY.plusDays(1))).hasValueSatisfying(n -> {
            assertThat(n.source()).isEqualTo(Source.LEGAL);
            assertThat(n.due()).isEqualTo(TODAY.plusDays(1));
        });
        assertThat(eval(TaskState.DISPONIVEL, TODAY.plusDays(3), TODAY.plusDays(20))).hasValueSatisfying(n -> assertThat(n.source()).isEqualTo(Source.TAREFA));
        assertThat(eval(TaskState.DISPONIVEL, TODAY.plusDays(1), TODAY.plusDays(1))).as("empate = legal")
                .hasValueSatisfying(n -> assertThat(n.source()).isEqualTo(Source.LEGAL));
        assertThat(eval(TaskState.RASCUNHO, null, TODAY.minusDays(2))).hasValueSatisfying(n -> assertThat(n.source()).isEqualTo(Source.LEGAL));
    }

    @Test
    void tarefaFechadaOuSemPrazoNaoAvisa() {
        for (TaskState s : List.of(TaskState.CONCLUIDA, TaskState.ARQUIVADA, TaskState.MODELO_PUBLICO, TaskState.OFERECIDA)) {
            assertThat(eval(s, TODAY, null)).as(s.name()).isEmpty();
        }
        assertThat(eval(TaskState.EM_USO, null, null)).isEmpty();
        assertThat(DeadlineReminders.evaluate(null, TaskState.EM_USO, TODAY, null, TODAY, N)).isEmpty();
    }

    @Test
    void diasConfiguraveis() {
        assertThat(DeadlineReminders.parseNearDays("1, 3,7")).containsExactly(7, 3, 1);
        assertThat(DeadlineReminders.parseNearDays("")).isEqualTo(N);
        assertThat(DeadlineReminders.parseNearDays("abc,0,-2,99")).as("tudo inválido → padrão").isEqualTo(N);
        assertThat(DeadlineReminders.evaluate(ID, TaskState.EM_USO, TODAY.plusDays(7), null, TODAY, List.of(7))).isPresent();
        assertThat(DeadlineReminders.evaluate(ID, TaskState.EM_USO, TODAY.plusDays(3), null, TODAY, List.of(7))).isEmpty();
    }

    @Test
    void preferenciasInterruptorHorarioEFuso() {
        assertThat(DeadlineReminders.prefs(null, null)).isEqualTo(Prefs.DEFAULT);
        assertThat(DeadlineReminders.prefs("{\"email\":true}", "America/Sao_Paulo").enabled()).as("ausente = ligado").isTrue();
        assertThat(DeadlineReminders.prefs("{\"deadlines\":false}", null).enabled()).isFalse();
        Prefs p = DeadlineReminders.prefs("{\"dailyTaskAt\":\"07:30\",\"deadlines\":true}", "Europe/Lisbon");
        assertThat(p.at()).isEqualTo(LocalTime.of(7, 30));
        assertThat(p.zone()).isEqualTo(ZoneId.of("Europe/Lisbon"));
        assertThat(DeadlineReminders.prefs("{\"dailyTaskAt\":\"25:00\"}", "Fuso/Inexistente")).isEqualTo(Prefs.DEFAULT);
        assertThat(DeadlineReminders.prefs("{nao é json", null)).isEqualTo(Prefs.DEFAULT);

        Prefs sp = Prefs.DEFAULT;   // 08:00 em São Paulo (UTC−3)
        assertThat(sp.reached(Instant.parse("2026-11-24T10:59:00Z"))).isFalse();
        assertThat(sp.reached(Instant.parse("2026-11-24T11:00:00Z"))).isTrue();
        assertThat(sp.today(Instant.parse("2026-11-25T02:00:00Z"))).as("23h em São Paulo ainda é dia 24").isEqualTo(TODAY);
    }
}
