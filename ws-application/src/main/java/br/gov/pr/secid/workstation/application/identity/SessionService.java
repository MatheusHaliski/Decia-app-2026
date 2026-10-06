package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Sessões da própria pessoa (RF2.CA05, Bloco 4, D-62): lista e encerra famílias de refresh token. Sessão = família ({@code sid} do
 * access token); a fonte é o {@link SessionStorePort} (Redis/memória) com o espelho em {@code refresh_tokens} — sem tabela nova.
 * Encerrar uma sessão revoga a família inteira: o refresh token daquele navegador deixa de renovar e o access token vivo cai no
 * {@code SessionActiveFilter} na próxima requisição. Sessão de outra pessoa → {@code 404} igual a id inexistente
 * ({@link ResourceAuthorizer#requireOwnSession}).
 */
@Service
public class SessionService {
    private final SessionStorePort sessions;
    private final RefreshTokenMirrorPort mirror;
    private final ResourceAuthorizer authorizer;
    private final AuditLogPort audit;
    private final Clock clock;

    public SessionService(SessionStorePort sessions, RefreshTokenMirrorPort mirror, ResourceAuthorizer authorizer, AuditLogPort audit,
                          Clock clock) {
        this.sessions = sessions;
        this.mirror = mirror;
        this.authorizer = authorizer;
        this.audit = audit;
        this.clock = clock;
    }

    /**
     * Uma sessão na lista: nunca o hash do token. {@code lastActiveAt} = última emissão (login ou renovação) da família.
     */
    public record SessionView(UUID id, String deviceName, Instant lastActiveAt, Instant expiresAt, boolean persistent, boolean current) {
    }

    /** Sessões vivas de quem pede, a atual primeiro e as demais da mais recente para a mais antiga. */
    public List<SessionView> list(CurrentUser actor) {
        if (actor == null) {
            throw ApiException.unauthorized("Faça login para continuar.");
        }
        Map<UUID, RefreshRecord> latest = new LinkedHashMap<>();
        for (RefreshRecord r : sessions.activeOfUser(actor.id(), clock.instant())) {
            latest.merge(r.familyId(), r, (a, b) -> a.createdAt().isAfter(b.createdAt()) ? a : b);
        }
        return latest.values().stream()
                .map(r -> new SessionView(r.familyId(), r.deviceName(), r.createdAt(), r.expiresAt(), r.persistent(),
                        r.familyId().equals(actor.sessionId())))
                .sorted(Comparator.comparing(SessionView::current).reversed()
                        .thenComparing(SessionView::lastActiveAt, Comparator.reverseOrder()))
                .toList();
    }

    /** Encerra uma sessão da própria pessoa (pode ser a atual — equivale ao logout). 404 para id alheio ou inexistente. */
    @Transactional
    public void revoke(CurrentUser actor, UUID sessionId, RequestContext ctx) {
        UUID owner = actor == null || sessionId == null ? null
                : sessions.activeOfUser(actor.id(), clock.instant()).stream().anyMatch(r -> r.familyId().equals(sessionId)) ? actor.id() : null;
        authorizer.requireOwnSession(actor, owner);
        Instant now = clock.instant();
        sessions.revokeFamily(sessionId, now);
        mirror.familyRevoked(sessionId, now);
        audit.record(AuditEvent.of(actor.id(), AuditActions.SESSION_REVOKED, "session", sessionId.toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("current", sessionId.equals(actor.sessionId()))));
    }

    /** "Sair de todos os outros dispositivos": mantém só a sessão atual. Devolve quantas encerrou. */
    @Transactional
    public int revokeOthers(CurrentUser actor, RequestContext ctx) {
        if (actor == null) {
            throw ApiException.unauthorized("Faça login para continuar.");
        }
        Instant now = clock.instant();
        int ended = sessions.revokeAllOfUser(actor.id(), actor.sessionId(), now);
        mirror.userRevoked(actor.id(), actor.sessionId(), now);
        audit.record(AuditEvent.of(actor.id(), AuditActions.SESSIONS_REVOKED, "session", String.valueOf(actor.sessionId()), AuditEvent.OK,
                ctx.ip(), ctx.userAgent(), Map.of("sessionsEnded", ended, "via", "sessoes")));
        return ended;
    }
}
