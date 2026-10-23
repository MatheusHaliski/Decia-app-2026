package br.gov.pr.secid.workstation.application.people;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.Usernames;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Pessoas (RF4 responsável, RF10 atribuição, RF16 perfil de terceiros; auditoria 17/10/2026). A busca é limitada à empresa da
 * própria conta e a contas ATIVAS; o perfil público expõe só o que a pessoa publica de si (nome, usuário, cargo, foto, bio),
 * nunca e-mail, telefone ou flags internas. Contagens de produção ficam com os serviços de cada recurso, filtradas por ACL.
 */
@Service
public class PeopleService {
    static final int MAX_RESULTS = 20;
    static final int MIN_QUERY = 2;

    private final UserRepositoryPort users;
    private final ResourceAuthorizer authorizer;

    public PeopleService(UserRepositoryPort users, ResourceAuthorizer authorizer) {
        this.users = users;
        this.authorizer = authorizer;
    }

    /** Projeção mínima para seletores (responsável, destinatário). */
    public record PersonView(UUID id, String username, String name, String jobTitle, String avatarUrl, UUID departmentId) {
        static PersonView of(User u) {
            return new PersonView(u.getId(), u.getUsername(), displayName(u), u.getJobTitle(), u.getAvatarUrl(), u.getDepartmentId());
        }
    }

    /** Perfil público (RF16.CA01): identidade profissional e vínculo institucional, sem dados de contato. */
    public record PublicProfileView(UUID id, String username, String name, String fullName, String profileType, String jobTitle, String bio,
                                    String avatarUrl, String coverUrl, boolean verified, UUID companyId, UUID departmentId, boolean self) {
        static PublicProfileView of(User u, boolean self) {
            String profileType = u.getProfileType() == null ? null : u.getProfileType().name();
            return new PublicProfileView(u.getId(), u.getUsername(), displayName(u), u.getFullName(), profileType,
                    u.getJobTitle(), u.getBio(), u.getAvatarUrl(), u.getCoverUrl(), u.isVerified(), u.getCompanyId(), u.getDepartmentId(), self);
        }
    }

    static String displayName(User u) {
        return u.getDisplayName() == null || u.getDisplayName().isBlank() ? u.getFullName() : u.getDisplayName();
    }

    /** Busca na própria empresa; consulta curta devolve vazio em vez de listar a empresa inteira. */
    public List<PersonView> search(CurrentUser actor, String query, int limit) {
        Viewer viewer = authorizer.viewer(actor);
        String q = query == null ? "" : query.strip();
        if (q.length() < MIN_QUERY || viewer.companyId() == null) {
            return List.of();
        }
        int size = Math.max(1, Math.min(limit, MAX_RESULTS));
        // pede um a mais: a própria pessoa sai do resultado depois da consulta e não pode encurtar a página
        return users.searchInCompany(viewer.companyId(), q, size + 1).stream()
                .filter(u -> !u.getId().equals(actor.id())).limit(size).map(PersonView::of).toList();
    }

    /** Perfil por nome de usuário; inexistente, pendente ou suspenso respondem o mesmo 404. */
    public PublicProfileView byUsername(CurrentUser actor, String username) {
        String normalized = Usernames.normalize(username == null ? "" : username);
        User target = users.findByUsername(normalized).orElse(null);
        authorizer.requireProfileVisible(actor, target);
        return PublicProfileView.of(target, target.getId().equals(actor.id()));
    }

    /** Conta ATIVA pelo id, com a mesma recusa uniforme (para rotas aninhadas, ex.: tarefas de uma pessoa). */
    public User visibleById(CurrentUser actor, UUID id) {
        User target = users.findById(id).orElse(null);
        authorizer.requireProfileVisible(actor, target);
        if (target.getStatus() != AccountStatus.ACTIVE) {
            throw ApiException.notFound("Perfil");
        }
        return target;
    }
}
