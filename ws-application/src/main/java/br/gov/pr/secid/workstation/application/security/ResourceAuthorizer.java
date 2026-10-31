package br.gov.pr.secid.workstation.application.security;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.domain.decisao.Decision;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRole;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.ProfileVisibility;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.security.AccessDecision;
import br.gov.pr.secid.workstation.domain.security.AccessPolicy;
import br.gov.pr.secid.workstation.domain.security.DecisionAccessPolicy;
import br.gov.pr.secid.workstation.domain.security.MediaAccessPolicy;
import br.gov.pr.secid.workstation.domain.security.ResourceAction;
import br.gov.pr.secid.workstation.domain.security.ScopedResource;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Ponto único de autorização por recurso (BOLA/BFLA, D-65/D-66), aplicado no SERVIÇO, nunca no controller. Relê o papel do banco
 * (o claim do token só reduz: ADMIN exige ADMIN no token E no banco), monta o {@link Viewer} com empresa/departamento/lotações e
 * traduz a decisão das políticas puras de ws-domain em HTTP:
 * <ul>
 *   <li>{@link AccessDecision#NOT_FOUND} → {@code 404 NAO_ENCONTRADO} com a MESMA mensagem de um id inexistente ({@link #notFound});</li>
 *   <li>{@link AccessDecision#FORBIDDEN} → {@code 403 ACESSO_NEGADO}.</li>
 * </ul>
 * Toda verificação marca o {@link AuthorizationTrail}; um handler com id no caminho que não passou por aqui é recusado pelo ws-web.
 */
@Component
public class ResourceAuthorizer {
    private final UserRepositoryPort users;
    private final Optional<MembershipPort> memberships;

    public ResourceAuthorizer(UserRepositoryPort users, Optional<MembershipPort> memberships) {
        this.users = users;
        this.memberships = memberships == null ? Optional.empty() : memberships;
    }

    // ------------------------------------------------------------------------------------------------ quem pede

    /** A própria conta de quem está autenticado (rotas {@code /api/me*}): 404 se a conta sumiu; marca a trilha. */
    public User ownAccount(CurrentUser actor) {
        if (actor == null) {
            throw ApiException.unauthorized("Faça login para continuar.");
        }
        User u = users.findById(actor.id()).orElseThrow(() -> notFound(ScopedResource.Kind.USER));
        AuthorizationTrail.record("SELF");
        return u;
    }

    /** Confirma que a conta carregada por outro caminho (reautenticação) é a de quem pede, e marca a trilha. */
    public User confirmOwn(CurrentUser actor, User loaded) {
        if (actor == null || loaded == null || !actor.id().equals(loaded.getId())) {
            throw Guard.denied();
        }
        AuthorizationTrail.record("SELF");
        return loaded;
    }

    /** Monta o {@link Viewer} relendo papel, perfil e lotação do banco (D-66). */
    public Viewer viewer(CurrentUser actor) {
        if (actor == null) {
            throw ApiException.unauthorized("Faça login para continuar.");
        }
        User u = users.findById(actor.id()).orElseThrow(() -> ApiException.unauthorized("Sessão inválida. Faça login novamente."));
        Role effective = actor.role() == Role.ADMIN && u.getRole() == Role.ADMIN ? Role.ADMIN : Role.USER;
        return viewerFrom(u, effective);
    }

    /**
     * {@link Viewer} de outra conta ATIVA, sem sessão (ex.: destinatário de uma notificação, RF27): papel, perfil e lotação lidos do banco.
     * Conta inexistente ou não ativa → vazio (não recebe nada).
     */
    public Optional<Viewer> viewerOf(UUID userId) {
        return users.findById(userId).filter(u -> u.getStatus() == AccountStatus.ACTIVE).map(u -> viewerFrom(u, u.getRole()));
    }

    private Viewer viewerFrom(User u, Role effective) {
        Map<UUID, DeptRole> roles = memberships.map(m -> m.activeRoles(u.getId())).orElse(Map.of());
        return new Viewer(u.getId(), effective, u.getProfileType(), u.getCompanyId(), u.getDepartmentId(), roles);
    }

    // ------------------------------------------------------------------------------------------------ perfis de pessoa

    /**
     * Projeção completa da conta de outra pessoa ({@code GET /api/users/{id}}): só a própria pessoa ou ADMIN (papel do banco). A recusa é
     * {@code 403} uniforme, exista ou não o id — a existência de contas já é pública pelo nome de usuário (D-65).
     */
    public Viewer requireSelfOrAdmin(CurrentUser actor, UUID targetUserId) {
        Viewer v = viewer(actor);
        AuthorizationTrail.record("USER:" + targetUserId);
        if (targetUserId == null || (!v.isAdmin() && !v.is(targetUserId))) {
            throw Guard.denied();
        }
        return v;
    }

    /**
     * Perfil público de outra pessoa ({@code GET /api/people/by-username/{username}}, RF16.CA01): qualquer conta autenticada vê a
     * projeção pública de uma conta ATIVA; conta inexistente, pendente, suspensa ou em exclusão responde o MESMO 404 (não enumera).
     * O controle de publicação da pessoa (RF3, {@link ProfileVisibility}) vale aqui: perfil "só minha empresa" visto de fora da empresa
     * também responde esse 404 — e, como perfil, foto, tarefas e seguir passam por este método, a regra vale em todas essas rotas.
     * O que a pessoa produziu continua filtrado item a item pela {@code AccessPolicy}.
     */
    public Viewer requireProfileVisible(CurrentUser actor, User target) {
        Viewer v = viewer(actor);
        AuthorizationTrail.record("PROFILE:" + (target == null ? "?" : target.getId()));
        if (target == null || target.getStatus() != AccountStatus.ACTIVE || !profileVisibleTo(v, target)) {
            throw ApiException.notFound("Perfil");
        }
        return v;
    }

    /**
     * Regra pura do controle de publicação (RF3): a própria pessoa sempre se vê; {@code AUTENTICADOS} → qualquer conta; {@code EMPRESA} →
     * só quem tem a mesma {@code users.company_id} (sem empresa, só a própria pessoa). Não marca a trilha: serve para filtrar listas
     * (ex.: equipe de um departamento) depois que o recurso-pai já foi autorizado.
     */
    public static boolean profileVisibleTo(Viewer viewer, User target) {
        if (viewer == null || target == null) {
            return false;
        }
        if (viewer.is(target.getId()) || target.getProfileVisibility() != ProfileVisibility.EMPRESA) {
            return true;
        }
        return target.getCompanyId() != null && target.getCompanyId().equals(viewer.companyId());
    }

    // ------------------------------------------------------------------------------------------------ institucional (RF14, RF15)

    /**
     * Página pública de departamento ({@code /api/departments/{slug}}, RF14.CA01): qualquer conta autenticada vê um departamento ATIVO de
     * empresa visível; inexistente, inativo, ambíguo ou de empresa inativa responde o MESMO 404.
     */
    public void requireDepartmentVisible(Viewer viewer, boolean visible) {
        AuthorizationTrail.record("DEPARTMENT");
        if (viewer == null) {
            throw ApiException.unauthorized("Faça login para continuar.");
        }
        if (!visible) {
            throw ApiException.notFound("Departamento");
        }
    }

    /**
     * Página pública de empresa ({@code /api/companies/{slug}}, RF15.CA01): qualquer conta autenticada vê empresa ATIVA cuja conta dona
     * está ATIVA; inexistente, suspensa, encerrada ou com a dona pendente responde o MESMO 404.
     */
    public void requireCompanyVisible(Viewer viewer, boolean visible) {
        AuthorizationTrail.record("COMPANY");
        if (viewer == null) {
            throw ApiException.unauthorized("Faça login para continuar.");
        }
        if (!visible) {
            throw ApiException.notFound("Empresa");
        }
    }

    // ------------------------------------------------------------------------------------------------ sessões (RF2.CA05)

    /**
     * Sessão (família de refresh token) da própria pessoa ({@code DELETE /api/auth/sessions/{id}}, Bloco 4). A sessão de outra pessoa é
     * invisível: responde o MESMO {@code 404} de um id inexistente ({@code sessionOwnerId} nulo), nunca 403 — não confirma que o id existe.
     */
    public void requireOwnSession(CurrentUser actor, UUID sessionOwnerId) {
        if (actor == null) {
            throw ApiException.unauthorized("Faça login para continuar.");
        }
        AuthorizationTrail.record("SESSION");
        if (sessionOwnerId == null || !sessionOwnerId.equals(actor.id())) {
            throw notFound(ScopedResource.Kind.SESSION);
        }
    }

    // ------------------------------------------------------------------------------------------------ notificações (RF27)

    /**
     * Notificação da própria pessoa ({@code POST /api/notifications/{id}/read}). A de outra pessoa é invisível: responde o MESMO
     * {@code 404} de um id inexistente ({@code recipientId} nulo), nunca 403.
     */
    public void requireOwnNotification(CurrentUser actor, UUID recipientId) {
        if (actor == null) {
            throw ApiException.unauthorized("Faça login para continuar.");
        }
        AuthorizationTrail.record("NOTIFICATION");
        if (recipientId == null || !recipientId.equals(actor.id())) {
            throw ApiException.notFound("Notificação");
        }
    }

    // ------------------------------------------------------------------------------------------------ mensagens diretas (RF46)

    /**
     * Conversa direta ({@code /api/conversations/{id}…}, RF46): só quem participa (e não saiu), na empresa da conversa, lê e escreve. Quem
     * não participa recebe o MESMO {@code 404} de um id inexistente, nunca 403 — não confirma que a conversa existe.
     */
    public void requireConversationParticipant(CurrentUser actor, boolean participant) {
        if (actor == null) {
            throw ApiException.unauthorized("Faça login para continuar.");
        }
        AuthorizationTrail.record("CONVERSATION");
        if (!participant) {
            throw ApiException.notFound("Conversa");
        }
    }

    // ------------------------------------------------------------------------------------------------ recursos

    public void require(Viewer viewer, ScopedResource resource, ResourceAction action) {
        AuthorizationTrail.record(resource.kind() + ":" + action);
        enforce(AccessPolicy.decide(viewer, resource, action), resource.kind());
    }

    public void require(CurrentUser actor, ScopedResource resource, ResourceAction action) {
        require(viewer(actor), resource, action);
    }

    /** Decisão estruturada: papéis DACI do §8 (participantRole nulo = não participa). */
    public void requireDecision(Viewer viewer, Decision decision, DecisionRole participantRole, boolean delegatedApprover, ResourceAction action) {
        AuthorizationTrail.record("DECISION:" + action);
        enforce(DecisionAccessPolicy.decide(viewer, decision, participantRole, delegatedApprover, action), ScopedResource.Kind.DECISION);
    }

    /** Mídia (OwnMedia): RESTRICTED só dono/ADMIN; PRIVATE também quem vê o recurso-pai. */
    public void requireMedia(Viewer viewer, MediaObject media, boolean parentVisible, ResourceAction action) {
        AuthorizationTrail.record("MEDIA:" + action);
        enforce(MediaAccessPolicy.decide(viewer, media, parentVisible, action), ScopedResource.Kind.MEDIA);
    }

    // ------------------------------------------------------------------------------------------------ BFLA (função)

    /** Função restrita a um papel global (ex.: painel ADMIN) — papel relido do banco. */
    public void requireRole(Viewer viewer, Role role) {
        AuthorizationTrail.record("ROLE:" + role);
        if (viewer == null || viewer.role() != role) {
            throw Guard.denied();
        }
    }

    /** Função restrita a tipos de perfil (ex.: validar lotação só CHEFE_DEPARTAMENTO); ADMIN passa. */
    public void requireProfile(Viewer viewer, ProfileType... allowed) {
        AuthorizationTrail.record("PROFILE:" + Arrays.toString(allowed));
        if (viewer == null || (!viewer.isAdmin() && !Arrays.asList(allowed).contains(viewer.profileType()))) {
            throw Guard.denied();
        }
    }

    // ------------------------------------------------------------------------------------------------ tradução

    /** 404 idêntico para "não existe" e "existe mas você não vê" — use este método também quando o repositório não acha o id. */
    public static ApiException notFound(ScopedResource.Kind kind) {
        return ApiException.notFound(kind.label());
    }

    static void enforce(AccessDecision decision, ScopedResource.Kind kind) {
        switch (decision) {
            case ALLOW -> {
                // permitido
            }
            case NOT_FOUND -> throw notFound(kind);
            case FORBIDDEN -> throw Guard.denied();
            default -> throw Guard.denied();
        }
    }
}
