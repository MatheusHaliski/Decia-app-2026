package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.DeadlineReminders.Notice;
import br.gov.pr.secid.workstation.application.acervo.DeadlineReminders.Prefs;
import br.gov.pr.secid.workstation.application.identity.UserPreferencesRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.jobs.JobLockPort;
import br.gov.pr.secid.workstation.application.notifications.NotificationService;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.security.ScopedResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Aviso diário de prazo próximo e vencido (RF41.CA04; RF27 central de notificações; RF44.CA10 horário e fuso da pessoa). Roda a cada
 * {@code ws.jobs.deadlines.every} (padrão 15 min) e, com a trava entre instâncias ({@link JobLockPort}, tabela da V70), varre as tarefas
 * abertas com prazo da tarefa ou prazo legal numa janela curta em torno de hoje. Para o dono e o responsável de cada uma: interruptor de
 * prazos desligado → nada; antes do horário da pessoa ({@code dailyTaskAt}, no fuso dela) → fica para a próxima rodada; senão aplica
 * {@link DeadlineReminders#evaluate} e grava a notificação, idempotente por tarefa + tipo + dia ({@code group_key}). Assim a pessoa recebe
 * o aviso uma vez por dia, no horário dela, e uma rodada perdida é recuperada na seguinte. Nada de título nem de pessoa no log: só contagens.
 */
@Service
public class DeadlineReminderJob {
    private static final Logger log = LoggerFactory.getLogger(DeadlineReminderJob.class);
    static final String LOCK = "prazos-diarios";
    static final int PAGE = 500;
    /** Teto de tarefas por rodada (proteção; o resto fica para a próxima rodada, que recomeça do início e pula o que já foi avisado). */
    static final int MAX_PER_RUN = 20_000;

    private final DeadlineScanPort scan;
    private final JobLockPort locks;
    private final UserRepositoryPort users;
    private final UserPreferencesRepositoryPort preferences;
    private final NotificationService notifications;
    private final Clock clock;
    private final List<Integer> nearDays;
    private final Duration lockFor;
    private final String holder;

    public DeadlineReminderJob(DeadlineScanPort scan, JobLockPort locks, UserRepositoryPort users, UserPreferencesRepositoryPort preferences,
                               NotificationService notifications, Clock clock,
                               @Value("${ws.jobs.deadlines.near-days:3,1}") String nearDays,
                               @Value("${ws.jobs.deadlines.lock-for:PT10M}") Duration lockFor) {
        this.scan = scan;
        this.locks = locks;
        this.users = users;
        this.preferences = preferences;
        this.notifications = notifications;
        this.clock = clock;
        this.nearDays = DeadlineReminders.parseNearDays(nearDays);
        this.lockFor = lockFor == null || lockFor.isNegative() || lockFor.isZero() ? Duration.ofMinutes(10) : lockFor;
        this.holder = host() + "/" + UUID.randomUUID();
    }

    /** Resultado de uma rodada: se obteve a trava, quantas tarefas olhou e quantos avisos gravou. */
    public record Run(boolean locked, int tasks, int sent) {
    }

    @Scheduled(initialDelayString = "${ws.jobs.deadlines.initial-delay:PT3M}", fixedDelayString = "${ws.jobs.deadlines.every:PT15M}")
    public void run() {
        Run r = runOnce();
        if (r.sent() > 0) {
            log.info("Avisos de prazo: {} gravado(s) em {} tarefa(s) com prazo na janela", r.sent(), r.tasks());
        }
    }

    public Run runOnce() {
        Instant now = clock.instant();
        if (!locks.tryAcquire(LOCK, holder, now, now.plus(lockFor))) {
            return new Run(false, 0, 0);
        }
        try {
            return sweep(now);
        } finally {
            locks.release(LOCK, holder, clock.instant());
        }
    }

    private Run sweep(Instant now) {
        // janela em UTC com folga de um dia para os fusos: vencidas até OVERDUE_LOOKBACK_DAYS atrás e próximas até o maior N
        LocalDate utc = now.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate from = utc.minusDays(DeadlineReminders.OVERDUE_LOOKBACK_DAYS + 1L);
        LocalDate to = utc.plusDays(nearDays.get(0) + 1L);
        Map<UUID, Prefs> prefsCache = new HashMap<>();
        Map<UUID, Optional<UUID>> companyCache = new HashMap<>();
        int seen = 0;
        int sent = 0;
        UUID after = null;
        while (seen < MAX_PER_RUN) {
            List<TaskItem> page = scan.openWithDeadlineBetween(from, to, after, PAGE);
            for (TaskItem t : page) {
                seen++;
                sent += notify(t, now, prefsCache, companyCache);
            }
            if (page.size() < PAGE) {
                break;
            }
            after = page.get(page.size() - 1).id();
        }
        return new Run(true, seen, sent);
    }

    private int notify(TaskItem t, Instant now, Map<UUID, Prefs> prefsCache, Map<UUID, Optional<UUID>> companyCache) {
        Set<UUID> recipients = new LinkedHashSet<>();
        recipients.add(t.ownerId());
        if (t.responsibleId() != null) {
            recipients.add(t.responsibleId());
        }
        ScopedResource resource = null;
        int sent = 0;
        for (UUID r : recipients) {
            if (r == null) {
                continue;
            }
            Prefs p = prefsCache.computeIfAbsent(r, this::prefsOf);
            if (!p.enabled() || !p.reached(now)) {
                continue;
            }
            Optional<Notice> notice = DeadlineReminders.evaluate(t.id(), t.state(), t.dueAt(), t.legalDueAt(), p.today(now), nearDays);
            if (notice.isEmpty()) {
                continue;
            }
            if (resource == null) {
                UUID company = companyCache.computeIfAbsent(t.ownerId(), id -> users.findById(id).map(User::getCompanyId)).orElse(null);
                resource = ScopedResource.of(t, company);
            }
            Notice n = notice.get();
            try {
                if (notifications.deadlineNotice(r, resource, t, n.type(), n.due(), n.days(), n.source() == DeadlineReminders.Source.LEGAL,
                        n.groupKey())) {
                    sent++;
                }
            } catch (RuntimeException e) {
                // uma falha não derruba a rodada; sem dado da tarefa nem da pessoa no log
                log.warn("Aviso de prazo não gravado ({})", e.getClass().getSimpleName());
            }
        }
        return sent;
    }

    private Prefs prefsOf(UUID userId) {
        return preferences.findByUserId(userId).map(p -> DeadlineReminders.prefs(p.getNotificationPrefsJson(), p.getTimezone()))
                .orElse(Prefs.DEFAULT);
    }

    private static String host() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return "ws";
        }
    }
}
