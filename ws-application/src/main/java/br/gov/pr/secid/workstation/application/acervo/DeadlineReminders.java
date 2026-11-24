package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.TreeSet;
import java.util.UUID;

/**
 * Regras PURAS do aviso diário de prazo (RF41.CA04; D-12: nada de IA, só datas). Prazo efetivo = o mais próximo entre o prazo da tarefa e
 * o prazo legal ({@link AcervoQueries#effectiveDue}); só tarefa aberta avisa.
 *
 * <ul>
 *   <li><b>PRAZO_PROXIMO</b> quando faltam exatamente N dias para o prazo efetivo, N na lista configurada (padrão 3 e 1), ou quando vence
 *   HOJE. Idempotente por tarefa + tipo + dia local da pessoa: a chave {@code prazo:<tarefa>:PRAZO_PROXIMO:<hoje>}.</li>
 *   <li><b>PRAZO_VENCIDO</b> uma vez por vencimento, nos {@value #OVERDUE_LOOKBACK_DAYS} dias seguintes a ele (se o trabalho não rodou no
 *   primeiro dia, o aviso sai no próximo): chave {@code prazo:<tarefa>:PRAZO_VENCIDO:<dia do vencimento>}. Prazo prorrogado que vence de
 *   novo avisa de novo (outro dia na chave).</li>
 * </ul>
 *
 * Preferências da pessoa ({@code user_preferences.notification_prefs_json} + {@code timezone}): interruptor {@code deadlines} (ausente =
 * ligado; desligado = nenhum aviso de prazo) e o horário {@code dailyTaskAt} (HH:mm, padrão 08:00) no fuso da pessoa — antes dele, nada.
 */
public final class DeadlineReminders {
    public static final List<Integer> DEFAULT_NEAR_DAYS = List.of(3, 1);
    public static final LocalTime DEFAULT_AT = LocalTime.of(8, 0);
    public static final ZoneId DEFAULT_ZONE = AcervoQueries.ZONE;
    public static final int OVERDUE_LOOKBACK_DAYS = 7;
    public static final int MAX_NEAR_DAYS = 30;
    private static final ObjectMapper JSON = JsonMapper.builder().build();

    /** De onde vem o prazo efetivo: o da tarefa ou o legal (empate = legal, que é o que pesa). */
    public enum Source { TAREFA, LEGAL }

    /** Aviso a enviar: tipo, vencimento efetivo, dias (positivo = faltam; negativo = vencido há), origem e chave de idempotência. */
    public record Notice(NotificationType type, LocalDate due, long days, Source source, String groupKey) {
    }

    /** Preferências que o aviso respeita. */
    public record Prefs(boolean enabled, LocalTime at, ZoneId zone) {
        public static final Prefs DEFAULT = new Prefs(true, DEFAULT_AT, DEFAULT_ZONE);

        /** Já passou do horário da pessoa hoje, no fuso dela? */
        public boolean reached(Instant now) {
            return !now.atZone(zone).toLocalTime().isBefore(at);
        }

        public LocalDate today(Instant now) {
            return now.atZone(zone).toLocalDate();
        }
    }

    private DeadlineReminders() {
    }

    /** Avalia uma tarefa para uma pessoa no dia local {@code today}; vazio = nada a avisar. */
    public static Optional<Notice> evaluate(UUID taskId, TaskState state, LocalDate dueAt, LocalDate legalDueAt, LocalDate today,
                                            List<Integer> nearDays) {
        if (taskId == null || state == null || !AcervoQueries.open(state)) {
            return Optional.empty();
        }
        LocalDate due = AcervoQueries.effectiveDue(dueAt, legalDueAt);
        if (due == null) {
            return Optional.empty();
        }
        Source source = legalDueAt != null && legalDueAt.equals(due) ? Source.LEGAL : Source.TAREFA;
        long days = ChronoUnit.DAYS.between(today, due);
        if (days < 0) {
            if (-days > OVERDUE_LOOKBACK_DAYS) {
                return Optional.empty();
            }
            return Optional.of(new Notice(NotificationType.PRAZO_VENCIDO, due, days, source, key(taskId, NotificationType.PRAZO_VENCIDO, due)));
        }
        if (days == 0 || nearDays.contains((int) Math.min(days, Integer.MAX_VALUE))) {
            return Optional.of(new Notice(NotificationType.PRAZO_PROXIMO, due, days, source, key(taskId, NotificationType.PRAZO_PROXIMO, today)));
        }
        return Optional.empty();
    }

    static String key(UUID taskId, NotificationType type, LocalDate day) {
        return "prazo:" + taskId + ":" + type.name() + ":" + day;
    }

    /**
     * Lista "3,1" da configuração → dias distintos entre 1 e {@value #MAX_NEAR_DAYS}, do maior para o menor; vazia ou inválida → o padrão.
     */
    public static List<Integer> parseNearDays(String csv) {
        if (csv == null || csv.isBlank()) {
            return DEFAULT_NEAR_DAYS;
        }
        TreeSet<Integer> out = new TreeSet<>();
        for (String part : csv.split(",")) {
            try {
                int n = Integer.parseInt(part.trim());
                if (n >= 1 && n <= MAX_NEAR_DAYS) {
                    out.add(n);
                }
            } catch (NumberFormatException e) {
                // valor inválido é ignorado; sobrando nada, vale o padrão
            }
        }
        return out.isEmpty() ? DEFAULT_NEAR_DAYS : List.copyOf(new ArrayList<>(out.descendingSet()));
    }

    /** Preferências a partir do JSON gravado e do fuso; qualquer valor ausente ou inválido cai no padrão (aviso ligado, 08:00, São Paulo). */
    public static Prefs prefs(String notificationPrefsJson, String timezone) {
        boolean enabled = true;
        LocalTime at = DEFAULT_AT;
        if (notificationPrefsJson != null && !notificationPrefsJson.isBlank()) {
            try {
                JsonNode n = JSON.readTree(notificationPrefsJson);
                JsonNode d = n == null ? null : n.get("deadlines");
                if (d != null && d.isBoolean()) {
                    enabled = d.booleanValue();
                }
                JsonNode t = n == null ? null : n.get("dailyTaskAt");
                if (t != null && t.isString() && t.stringValue().matches("^([01]\\d|2[0-3]):[0-5]\\d$")) {
                    at = LocalTime.parse(t.stringValue());
                }
            } catch (RuntimeException e) {
                // JSON corrompido: vale o padrão
            }
        }
        ZoneId zone = DEFAULT_ZONE;
        if (timezone != null && !timezone.isBlank()) {
            try {
                zone = ZoneId.of(timezone);
            } catch (DateTimeException e) {
                // fuso inválido: vale o padrão
            }
        }
        return new Prefs(enabled, at, zone);
    }
}
