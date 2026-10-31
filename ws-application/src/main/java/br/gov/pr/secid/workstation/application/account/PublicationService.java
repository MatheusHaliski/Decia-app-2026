package br.gov.pr.secid.workstation.application.account;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.Guard;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.ProfileVisibility;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * RF3 — especialidades e controle de publicação do perfil público (auditoria Onda 1, 31/10/2026). Só a própria conta lê e altera
 * ({@code /api/me/publication}); a regra de quem vê é aplicada no servidor por {@link ResourceAuthorizer#requireProfileVisible} em perfil,
 * foto, tarefas e seguir. Alterar grava {@code AuditLog PROFILE_UPDATED} com os nomes dos campos (sem valores).
 */
@Service
public class PublicationService {
    private final UserRepositoryPort users;
    private final ResourceAuthorizer authorizer;
    private final AuditLogPort audit;

    public PublicationService(UserRepositoryPort users, ResourceAuthorizer authorizer, AuditLogPort audit) {
        this.users = users;
        this.authorizer = authorizer;
        this.audit = audit;
    }

    /** Especialidades e quem vê o perfil público ({@code AUTENTICADOS} | {@code EMPRESA}). */
    public record PublicationView(List<String> specialties, String profileVisibility) {
        static PublicationView of(User u) {
            ProfileVisibility pv = u.getProfileVisibility() == null ? ProfileVisibility.AUTENTICADOS : u.getProfileVisibility();
            return new PublicationView(List.copyOf(u.getSpecialties()), pv.name());
        }
    }

    /** Campos nulos não mudam. */
    public record PublicationUpdate(List<String> specialties, String profileVisibility) {
    }

    public PublicationView mine(CurrentUser actor) {
        return PublicationView.of(authorizer.ownAccount(actor));
    }

    @Transactional
    public PublicationView update(CurrentUser actor, PublicationUpdate cmd, RequestContext ctx) {
        User u = authorizer.ownAccount(actor);
        Guard.requireNotDeletionScheduled(u);
        Map<String, Object> fields = new LinkedHashMap<>();
        List<String> changed = new ArrayList<>();
        if (cmd.specialties() != null) {
            Specialties.Result r = Specialties.normalize(cmd.specialties());
            if (r.problem().isPresent()) {
                fields.put("specialties", r.problem().get());
            } else if (!r.values().equals(u.getSpecialties())) {
                u.setSpecialties(r.values());
                changed.add("specialties");
            }
        }
        if (cmd.profileVisibility() != null) {
            try {
                ProfileVisibility pv = ProfileVisibility.valueOf(cmd.profileVisibility().strip().toUpperCase(Locale.ROOT));
                if (pv != u.getProfileVisibility()) {
                    u.setProfileVisibility(pv);
                    changed.add("profileVisibility");
                }
            } catch (IllegalArgumentException e) {
                fields.put("profileVisibility", "Use AUTENTICADOS ou EMPRESA.");
            }
        }
        if (!fields.isEmpty()) {
            throw ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.", Map.of("fields", fields));
        }
        if (!changed.isEmpty()) {
            users.save(u);
            RequestContext c = ctx == null ? RequestContext.NONE : ctx;
            audit.record(AuditEvent.of(u.getId(), AuditActions.PROFILE_UPDATED, "user", u.getId().toString(), AuditEvent.OK, c.ip(),
                    c.userAgent(), Map.of("fields", changed)));
        }
        return PublicationView.of(u);
    }
}
