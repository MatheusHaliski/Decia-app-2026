package br.gov.pr.secid.workstation.domain.acervo;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Contagem do prazo legal de uma tarefa (RF20.CA11, RF41.CA04) — função pura, espelhada em {@code lib/tasks/legalDeadline.ts} e conferida
 * pelos MESMOS casos ({@code src/test/resources/acervo/prazos-legais-casos.csv}, lido pelos dois testes).
 *
 * <p>Regra de contagem da Lei nº 9.784/1999, art. 66: exclui-se o dia do começo e inclui-se o do vencimento. Prazo em dias corridos conta
 * de modo contínuo (§ 2º) e, se vencer em dia sem expediente, prorroga-se até o primeiro dia útil seguinte (§ 1º). Prazo em dias úteis
 * conta só os dias úteis depois do início.
 *
 * <p>Dia útil = segunda a sexta que não seja feriado nacional. Fixos: 1º/1, 21/4, 1º/5, 7/9, 2/11, 15/11 e 25/12 (Lei nº 662/1949, redação
 * da Lei nº 10.607/2002), 12/10 (Lei nº 6.802/1980) e 20/11 a partir de 2024 (Lei nº 14.759/2023). Móvel: Sexta-feira da Paixão (Páscoa
 * − 2), que o calendário anual do governo federal trata como feriado nacional. Carnaval e Corpus Christi são ponto facultativo e
 * feriados estaduais e municipais não entram: ficam para a regra da empresa. A data calculada é apoio e deve ser conferida — o sistema não
 * substitui a contagem oficial do órgão.
 */
public final class LegalDeadlineCalendar {
    /** Teto de dias de uma regra (10 anos corridos): acima disso é erro de cadastro, não prazo. */
    public static final int MAX_DAYS = 3650;

    private static final Map<Integer, Set<LocalDate>> HOLIDAYS = new ConcurrentHashMap<>();

    private LegalDeadlineCalendar() {
    }

    /**
     * Vencimento a partir da data de início (ciência/recebimento).
     *
     * @param start        dia do começo (excluído da contagem)
     * @param days         quantidade de dias da regra (1..{@link #MAX_DAYS})
     * @param businessDays {@code true} conta só dias úteis; {@code false} conta dias corridos e prorroga o vencimento em dia sem expediente
     */
    public static LocalDate dueDate(LocalDate start, int days, boolean businessDays) {
        Objects.requireNonNull(start, "start");
        if (days < 1 || days > MAX_DAYS) {
            throw new IllegalArgumentException("VALIDACAO: days entre 1 e " + MAX_DAYS);
        }
        if (businessDays) {
            LocalDate d = start;
            int counted = 0;
            while (counted < days) {
                d = d.plusDays(1);
                if (isBusinessDay(d)) {
                    counted++;
                }
            }
            return d;
        }
        LocalDate d = start.plusDays(days);
        while (!isBusinessDay(d)) {
            d = d.plusDays(1);
        }
        return d;
    }

    /** Segunda a sexta, fora dos feriados nacionais. */
    public static boolean isBusinessDay(LocalDate d) {
        DayOfWeek w = d.getDayOfWeek();
        return w != DayOfWeek.SATURDAY && w != DayOfWeek.SUNDAY && !isNationalHoliday(d);
    }

    public static boolean isNationalHoliday(LocalDate d) {
        return holidays(d.getYear()).contains(d);
    }

    /** Feriados nacionais do ano, em ordem de data. */
    public static List<LocalDate> nationalHolidays(int year) {
        return holidays(year).stream().sorted().toList();
    }

    private static Set<LocalDate> holidays(int year) {
        return HOLIDAYS.computeIfAbsent(year, LegalDeadlineCalendar::computeHolidays);
    }

    private static Set<LocalDate> computeHolidays(int year) {
        HashSet<LocalDate> out = new HashSet<>();
        out.add(LocalDate.of(year, Month.JANUARY, 1));
        out.add(easterSunday(year).minusDays(2));
        out.add(LocalDate.of(year, Month.APRIL, 21));
        out.add(LocalDate.of(year, Month.MAY, 1));
        out.add(LocalDate.of(year, Month.SEPTEMBER, 7));
        out.add(LocalDate.of(year, Month.OCTOBER, 12));
        out.add(LocalDate.of(year, Month.NOVEMBER, 2));
        out.add(LocalDate.of(year, Month.NOVEMBER, 15));
        if (year >= 2024) {
            out.add(LocalDate.of(year, Month.NOVEMBER, 20));
        }
        out.add(LocalDate.of(year, Month.DECEMBER, 25));
        return Set.copyOf(out);
    }

    /** Domingo de Páscoa no calendário gregoriano (algoritmo anônimo de Meeus/Jones/Butcher). */
    public static LocalDate easterSunday(int year) {
        int a = year % 19;
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31;
        int day = ((h + l - 7 * m + 114) % 31) + 1;
        return LocalDate.of(year, month, day);
    }
}
