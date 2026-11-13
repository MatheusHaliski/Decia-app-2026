package br.gov.pr.secid.workstation.domain.acervo;

import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Prazo legal (RF20.CA11, RF41.CA04): os casos de {@code acervo/prazos-legais-casos.csv} e os feriados de {@code acervo/feriados-nacionais.csv}
 * são os MESMOS que {@code lib/tasks/legalDeadline.test.ts} confere na implementação do front — as duas contas não podem divergir.
 */
class LegalDeadlineCalendarTest {

    static List<String[]> rows(String resource) throws IOException {
        InputStream in = Objects.requireNonNull(LegalDeadlineCalendarTest.class.getResourceAsStream(resource), resource);
        List<String[]> out = new ArrayList<>();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            for (String line = r.readLine(); line != null; line = r.readLine()) {
                if (!line.isBlank() && !line.startsWith("#")) {
                    out.add(line.split(";"));
                }
            }
        }
        return out;
    }

    @Test
    void casosCompartilhadosComOFront() throws IOException {
        List<String[]> cases = rows("/acervo/prazos-legais-casos.csv");
        assertThat(cases).hasSizeGreaterThan(20);
        for (String[] c : cases) {
            LocalDate start = LocalDate.parse(c[0]);
            LocalDate due = LegalDeadlineCalendar.dueDate(start, Integer.parseInt(c[1]), Boolean.parseBoolean(c[2]));
            assertThat(due).as(String.join(";", c)).isEqualTo(LocalDate.parse(c[3]));
        }
    }

    @Test
    void feriadosNacionaisFixosEPaixaoPelaPascoa() throws IOException {
        for (String[] row : rows("/acervo/feriados-nacionais.csv")) {
            int year = Integer.parseInt(row[0]);
            List<LocalDate> expected = Arrays.stream(row[1].split(",")).map(LocalDate::parse).toList();
            assertThat(LegalDeadlineCalendar.nationalHolidays(year)).as("feriados de " + year).containsExactlyElementsOf(expected);
        }
        assertThat(LegalDeadlineCalendar.easterSunday(2024)).isEqualTo(LocalDate.of(2024, 3, 31));
        assertThat(LegalDeadlineCalendar.easterSunday(2026)).isEqualTo(LocalDate.of(2026, 4, 5));
        assertThat(LegalDeadlineCalendar.easterSunday(2038)).isEqualTo(LocalDate.of(2038, 4, 25));
        assertThat(LegalDeadlineCalendar.easterSunday(2285)).isEqualTo(LocalDate.of(2285, 3, 22));
        // Carnaval e Corpus Christi são ponto facultativo: contam como dia útil
        assertThat(LegalDeadlineCalendar.isBusinessDay(LocalDate.of(2026, 2, 16))).isTrue();
        assertThat(LegalDeadlineCalendar.isBusinessDay(LocalDate.of(2026, 6, 4))).isTrue();
        assertThat(LegalDeadlineCalendar.isBusinessDay(LocalDate.of(2026, 11, 20))).isFalse();
        assertThat(LegalDeadlineCalendar.isBusinessDay(LocalDate.of(2023, 11, 20))).isTrue();
    }

    @Test
    void diasForaDaFaixaSaoRecusados() {
        LocalDate start = LocalDate.of(2026, 11, 12);
        assertThatThrownBy(() -> LegalDeadlineCalendar.dueDate(start, 0, false)).hasMessageContaining("VALIDACAO");
        assertThatThrownBy(() -> LegalDeadlineCalendar.dueDate(start, LegalDeadlineCalendar.MAX_DAYS + 1, true)).hasMessageContaining("VALIDACAO");
        assertThatThrownBy(() -> LegalDeadlineCalendar.dueDate(null, 5, true)).isInstanceOf(NullPointerException.class);
        assertThat(LegalDeadlineCalendar.dueDate(start, LegalDeadlineCalendar.MAX_DAYS, true)).isAfter(start.plusYears(10));
    }

    @Test
    void tarefaGravaRegraInicioEVencimentoJuntos() {
        TaskItem t = TaskItem.create(UUID.randomUUID(), null, "Responder pedido LAI", null, TaskType.DOCUMENTO, TaskCategory.OFICIO_MEMORANDO,
                null, null, null, null, null);
        UUID rule = UUID.randomUUID();
        LocalDate start = LocalDate.of(2026, 11, 12);
        TaskItem withLegal = t.withLegalDeadline(rule, start, LegalDeadlineCalendar.dueDate(start, 20, false));
        assertThat(withLegal.legalDeadlineRuleId()).isEqualTo(rule);
        assertThat(withLegal.legalDeadlineBaseDate()).isEqualTo(start);
        assertThat(withLegal.legalDueAt()).isEqualTo(LocalDate.of(2026, 12, 2));
        assertThat(withLegal.title()).isEqualTo(t.title());
        TaskItem cleared = withLegal.withLegalDeadline(null, null, null);
        assertThat(cleared.legalDeadlineRuleId()).isNull();
        assertThat(cleared.legalDueAt()).isNull();
        assertThatThrownBy(() -> t.withLegalDeadline(rule, null, null)).hasMessageContaining("VALIDACAO");
        assertThatThrownBy(() -> t.withLegalDeadline(rule, start, start.minusDays(1))).hasMessageContaining("VALIDACAO");
    }
}
