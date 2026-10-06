package br.gov.pr.secid.workstation.application.ai;

import br.gov.pr.secid.workstation.application.common.ApiException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Orçamento diário de IA por pessoa e por empresa (D-68; valores na Q-50): requisições e tokens (entrada estimada + teto de saída).
 * {@link #reserve} reserva ANTES da chamada, de forma atômica e na ordem pessoa → empresa; se um teto estoura, devolve o que já
 * reservou e responde {@code 429 IA_ORCAMENTO_ESGOTADO} com {@code details.scope} (USER/COMPANY), {@code details.metric}
 * (REQUESTS/TOKENS) e {@code retryAfterSeconds} até a virada do dia no fuso configurado (o handler põe o {@code Retry-After}).
 * {@link #settle} acerta a diferença entre estimado e real; {@link #refund} devolve tudo quando a chamada nem aconteceu.
 */
@Component
public class AiBudget {
    public static final String ESGOTADO = "IA_ORCAMENTO_ESGOTADO";

    private final AiBudgetCounterPort counter;
    private final AiControlProperties.Budget limits;
    private final ZoneId zone;
    private final Clock clock;

    public AiBudget(AiBudgetCounterPort counter, AiControlProperties props, Clock clock) {
        this.counter = counter;
        this.limits = props == null ? AiControlProperties.Budget.defaults() : props.budget();
        this.zone = ZoneId.of(limits.zone());
        this.clock = clock;
    }

    /** O que foi reservado (para acertar/devolver depois). */
    public record Reservation(UUID userId, UUID companyId, long tokens, LocalDate day) {
    }

    private record Slot(String key, long delta, long limit, String scope, String metric) {
    }

    public Reservation reserve(UUID userId, UUID companyId, long estimatedTokens) {
        LocalDate day = LocalDate.now(clock.withZone(zone));
        long tokens = Math.max(1, estimatedTokens);
        List<Slot> slots = new ArrayList<>();
        if (userId != null) {
            slots.add(new Slot(key("user", userId, day, "req"), 1, limits.userDailyRequests(), "USER", "REQUESTS"));
            slots.add(new Slot(key("user", userId, day, "tok"), tokens, limits.userDailyTokens(), "USER", "TOKENS"));
        }
        if (companyId != null) {
            slots.add(new Slot(key("company", companyId, day, "req"), 1, limits.companyDailyRequests(), "COMPANY", "REQUESTS"));
            slots.add(new Slot(key("company", companyId, day, "tok"), tokens, limits.companyDailyTokens(), "COMPANY", "TOKENS"));
        }
        Duration window = untilEndOfDay();
        List<Slot> taken = new ArrayList<>();
        for (Slot s : slots) {
            if (!counter.tryAdd(s.key(), s.delta(), s.limit(), window)) {
                taken.forEach(t -> counter.add(t.key(), -t.delta(), window));
                throw new ApiException(ESGOTADO, 429, "Limite diário de uso da IA atingido.", Map.of("scope", s.scope(), "metric", s.metric(),
                        "limit", s.limit(), "retryAfterSeconds", Math.max(1, window.toSeconds())));
            }
            taken.add(s);
        }
        return new Reservation(userId, companyId, tokens, day);
    }

    /** Acerta tokens reais × estimados (pode passar do teto: a chamada já aconteceu; a próxima é que será barrada). */
    public void settle(Reservation r, long actualTokens) {
        long diff = actualTokens - r.tokens();
        if (diff == 0) {
            return;
        }
        Duration window = untilEndOfDay();
        if (r.userId() != null) {
            counter.add(key("user", r.userId(), r.day(), "tok"), diff, window);
        }
        if (r.companyId() != null) {
            counter.add(key("company", r.companyId(), r.day(), "tok"), diff, window);
        }
    }

    /** A chamada não aconteceu (recusa por classificação, sem provedor): devolve requisição e tokens. */
    public void refund(Reservation r) {
        Duration window = untilEndOfDay();
        if (r.userId() != null) {
            counter.add(key("user", r.userId(), r.day(), "req"), -1, window);
            counter.add(key("user", r.userId(), r.day(), "tok"), -r.tokens(), window);
        }
        if (r.companyId() != null) {
            counter.add(key("company", r.companyId(), r.day(), "req"), -1, window);
            counter.add(key("company", r.companyId(), r.day(), "tok"), -r.tokens(), window);
        }
    }

    static String key(String scope, UUID id, LocalDate day, String metric) {
        return "ai:budget:" + scope + ":" + id + ":" + day + ":" + metric;
    }

    private Duration untilEndOfDay() {
        ZonedDateTime now = ZonedDateTime.now(clock.withZone(zone));
        ZonedDateTime next = now.toLocalDate().plusDays(1).atStartOfDay(zone);
        return Duration.between(now, next).plusSeconds(1);
    }
}
