package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.decisao.AssumptionStatus;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointStatus;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.TriggerStatus;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Frescor (§6.11), só em DECIDIDA/EM_EXECUCAO/RESOLVIDA. VENCIDA: checkpoint PERDIDO, gatilho DISPARADO sem tratamento ou premissa crítica
 * INVALIDADA depois da decisão. REVISAO_DEVIDA: checkpoint AGENDADO que vence em ≤ 7 dias (inclusive já vencido e ainda não marcado PERDIDO),
 * evidência ligada depois do snapshot ou {@code reviewEveryDays} excedido desde a última revisão (decisão ou checkpoint concluído). Resto
 * FRESCA. O relógio é injetado.
 */
public final class Freshness {

    static final Duration DUE_SOON = Duration.ofDays(7);

    private final Clock clock;

    public Freshness(Clock clock) {
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    public enum Level { FRESCA, REVISAO_DEVIDA, VENCIDA }

    public record Checkpoint(CheckpointStatus status, Instant dueAt, Instant completedAt) {
    }

    /** {@code handled} = o disparo já foi tratado (checkpoint de gatilho concluído, reabertura…). */
    public record Trigger(TriggerStatus status, boolean handled) {
    }

    public record Assumption(DecisionLevel importance, AssumptionStatus status, Instant validatedAt) {
    }

    /**
     * Fatos do registro.
     *
     * @param status               estado atual da decisão
     * @param decidedAt            momento da decisão
     * @param snapshotTakenAt      momento do último snapshot
     * @param lastEvidenceLinkedAt momento da evidência/ligação mais recente (nulo = nenhuma)
     * @param reviewEveryDays      revisar a cada N dias (nulo = sem revisão periódica)
     */
    public record Input(DecisionLifecycle status, Instant decidedAt, Instant snapshotTakenAt, Instant lastEvidenceLinkedAt, Integer reviewEveryDays,
                        List<Checkpoint> checkpoints, List<Trigger> triggers, List<Assumption> assumptions) {
        public Input {
            checkpoints = List.copyOf(checkpoints);
            triggers = List.copyOf(triggers);
            assumptions = List.copyOf(assumptions);
        }
    }

    /** Vazio quando o frescor não se aplica ao estado. */
    public Optional<Level> evaluate(Input in) {
        if (in.status() == null || !in.status().tracksFreshness()) {
            return Optional.empty();
        }
        Instant now = clock.instant();
        boolean expired = in.checkpoints().stream().anyMatch(c -> c.status() == CheckpointStatus.PERDIDO)
                || in.triggers().stream().anyMatch(t -> t.status() == TriggerStatus.DISPARADO && !t.handled())
                || in.assumptions().stream().anyMatch(a -> a.importance() == DecisionLevel.CRITICO && a.status() == AssumptionStatus.INVALIDADA
                        && (in.decidedAt() == null || a.validatedAt() == null || a.validatedAt().isAfter(in.decidedAt())));
        if (expired) {
            return Optional.of(Level.VENCIDA);
        }
        boolean checkpointSoon = in.checkpoints().stream()
                .anyMatch(c -> c.status() == CheckpointStatus.AGENDADO && c.dueAt() != null && !c.dueAt().isAfter(now.plus(DUE_SOON)));
        boolean newEvidence = in.lastEvidenceLinkedAt() != null && in.snapshotTakenAt() != null && in.lastEvidenceLinkedAt().isAfter(in.snapshotTakenAt());
        boolean reviewOverdue = false;
        if (in.reviewEveryDays() != null) {
            Instant last = in.decidedAt();
            for (Checkpoint c : in.checkpoints()) {
                if (c.status() == CheckpointStatus.CONCLUIDO && c.completedAt() != null && (last == null || c.completedAt().isAfter(last))) {
                    last = c.completedAt();
                }
            }
            reviewOverdue = last != null && now.isAfter(last.plus(Duration.ofDays(in.reviewEveryDays())));
        }
        return Optional.of(checkpointSoon || newEvidence || reviewOverdue ? Level.REVISAO_DEVIDA : Level.FRESCA);
    }
}
