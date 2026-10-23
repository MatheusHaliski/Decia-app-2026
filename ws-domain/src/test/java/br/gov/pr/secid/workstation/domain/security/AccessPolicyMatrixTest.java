package br.gov.pr.secid.workstation.domain.security;

import br.gov.pr.secid.workstation.domain.acervo.CoverMode;
import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskOrigin;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.CreationMode;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.Decision;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionKind;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRole;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.projetos.ProjectCoverMode;
import br.gov.pr.secid.workstation.domain.projetos.ProjectPhase;
import br.gov.pr.secid.workstation.domain.projetos.ProjectScheme;
import br.gov.pr.secid.workstation.domain.projetos.ProjectStatus;
import br.gov.pr.secid.workstation.domain.projetos.SchemeOrigin;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Teste-matriz das políticas (D-65/D-66/D-67): recurso × visibilidade × classificação × ação × perfil de quem pede → ALLOW (A),
 * FORBIDDEN (F = 403) ou NOT_FOUND (N = 404, sem vazar existência). Cada linha falharia se a regra correspondente sumisse.
 */
class AccessPolicyMatrixTest {
    static final UUID C1 = UUID.randomUUID();
    static final UUID C2 = UUID.randomUUID();
    static final UUID D1 = UUID.randomUUID();
    static final UUID D2 = UUID.randomUUID();
    static final UUID D3 = UUID.randomUUID();

    static final Viewer OWNER = new Viewer(UUID.randomUUID(), Role.USER, ProfileType.EMPREGADO, C1, D1, Map.of());
    static final Viewer COLLAB = new Viewer(UUID.randomUUID(), Role.USER, ProfileType.EMPREGADO, C2, D3, Map.of());
    static final Viewer DEPT = new Viewer(UUID.randomUUID(), Role.USER, ProfileType.EMPREGADO, C1, D1, Map.of(D1, DeptRole.MEMBRO));
    static final Viewer CHEFE = new Viewer(UUID.randomUUID(), Role.USER, ProfileType.CHEFE_DEPARTAMENTO, C1, D2, Map.of(D1, DeptRole.CHEFE));
    static final Viewer COMPANY = new Viewer(UUID.randomUUID(), Role.USER, ProfileType.EMPRESA, C1, D2, Map.of());
    static final Viewer OUTSIDER = new Viewer(UUID.randomUUID(), Role.USER, ProfileType.EMPREGADO, C2, D3, Map.of());
    static final Viewer ADMIN = new Viewer(UUID.randomUUID(), Role.ADMIN, ProfileType.EMPREGADO, C2, D3, Map.of());
    static final List<Viewer> PERSONAS = List.of(OWNER, COLLAB, DEPT, CHEFE, COMPANY, OUTSIDER, ADMIN);

    static AccessDecision code(char c) {
        return switch (c) {
            case 'A' -> AccessDecision.ALLOW;
            case 'F' -> AccessDecision.FORBIDDEN;
            case 'N' -> AccessDecision.NOT_FOUND;
            default -> throw new IllegalArgumentException("código " + c);
        };
    }

    static ScopedResource resource(ScopedResource.Kind kind, Visibility v, AccessClassification c) {
        return new ScopedResource(kind, UUID.randomUUID(), OWNER.userId(), C1, D1, v, c, Set.of(COLLAB.userId()));
    }

    /** Colunas: dono, colaborador, mesmo depto, CHEFE do depto, mesma empresa, outra empresa, ADMIN. */
    @ParameterizedTest(name = "{0} {1} {2} {3} → {4}")
    @CsvSource({
            "TASK, PRIVADA, INTERNO, VIEW, AANNNNA",
            "TASK, PRIVADA, INTERNO, EDIT, AANNNNA",
            "TASK, PRIVADA, INTERNO, DELETE, AFNNNNA",
            "TASK, PRIVADA, INTERNO, MANAGE, AFNNNNA",
            "TASK, PRIVADA, INTERNO, ASSESS, FFNNNNF",
            "TASK, DEPARTAMENTO, INTERNO, VIEW, AAAANNA",
            "TASK, DEPARTAMENTO, INTERNO, EDIT, AAFFNNA",
            "TASK, DEPARTAMENTO, INTERNO, DELETE, AFFFNNA",
            "TASK, DEPARTAMENTO, INTERNO, MANAGE, AFFANNA",
            "TASK, EMPRESA, INTERNO, VIEW, AAAAANA",
            "TASK, EMPRESA, INTERNO, EDIT, AAFFFNA",
            "TASK, EMPRESA, INTERNO, MANAGE, AFFAFNA",
            "TASK, PUBLICA, PUBLICO, VIEW, AAAAAAA",
            "TASK, PUBLICA, PUBLICO, EDIT, AAFFFFA",
            "TASK, PUBLICA, PUBLICO, DECIDE, FFFFFFF",
            "TASK, PUBLICA, RESTRITO, VIEW, AAAANNA",
            "TASK, EMPRESA, RESTRITO, VIEW, AAAANNA",
            "TASK, EMPRESA, SIGILOSO, VIEW, AANNNNN",
            "TASK, DEPARTAMENTO, SIGILOSO, MANAGE, AFNNNNN",
            "PROJECT, DEPARTAMENTO, INTERNO, VIEW, AAAANNA",
            "PROJECT, EMPRESA, INTERNO, DELETE, AFFFFNA",
            "PROJECT, PUBLICA, INTERNO, MANAGE, AFFAFFA",
            "MEDIA, PRIVADA, SIGILOSO, VIEW, AANNNNN",   // D-139: ADMIN sem acesso implícito a SIGILOSO
    })
    void matrizGenerica(ScopedResource.Kind kind, Visibility v, AccessClassification c, ResourceAction action, String expected) {
        ScopedResource r = resource(kind, v, c);
        List<AccessDecision> got = new ArrayList<>();
        for (Viewer p : PERSONAS) {
            got.add(AccessPolicy.decide(p, r, action));
        }
        List<AccessDecision> want = expected.chars().mapToObj(ch -> code((char) ch)).toList();
        assertThat(got).as("%s %s %s %s", kind, v, c, action).containsExactlyElementsOf(want);
    }

    @Test
    void semViewerOuSemRecursoNadaEVisivel() {
        assertThat(AccessPolicy.visible(null, resource(ScopedResource.Kind.TASK, Visibility.PUBLICA, AccessClassification.PUBLICO))).isFalse();
        assertThat(AccessPolicy.visible(OWNER, null)).isFalse();
        assertThat(AccessPolicy.effectiveVisibility(null, AccessClassification.PUBLICO)).isEqualTo(Visibility.PRIVADA);
        assertThat(AccessPolicy.effectiveVisibility(Visibility.DEPARTAMENTO, AccessClassification.RESTRITO)).isEqualTo(Visibility.DEPARTAMENTO);
        ScopedResource noScope = new ScopedResource(ScopedResource.Kind.TASK, UUID.randomUUID(), OWNER.userId(), null, null, Visibility.EMPRESA, null,
                null);
        assertThat(AccessPolicy.decide(COMPANY, noScope, ResourceAction.VIEW)).as("EMPRESA sem empresa no recurso não abre").isEqualTo(
                AccessDecision.NOT_FOUND);
        assertThat(noScope.classification()).isEqualTo(AccessClassification.INTERNO);
        assertThat(Viewer.user(UUID.randomUUID()).memberOf(null)).isFalse();
        assertThat(ScopedResource.Kind.DECISION.label()).isEqualTo("Decisão");
    }

    // ------------------------------------------------------------------------------------------------ fábricas por agregado

    @Test
    void tarefaUsaDonoDepartamentoClassificacaoEResponsavelComoColaborador() {
        UUID responsible = UUID.randomUUID();
        TaskItem t = new TaskItem(UUID.randomUUID(), OWNER.userId(), D1, "Ofício 12", null, null, TaskType.DOCUMENTO, null, null, null, null,
                AccessClassification.RESTRITO, "pdf", null, null, BigDecimal.ZERO, TaskOrigin.INTERNA, SourceKind.ARQUIVO, null, null, null,
                responsible, null, null, null, null, null, Priority.MEDIA, TaskState.DISPONIVEL, null, null, null, null, null, null, null, null,
                Visibility.EMPRESA, false, false, false, null, null, null, null, CoverMode.AUTO, null, null, null, null, null, null, 0, 0, 0, 0, 0, 0,
                0, 0, null);
        ScopedResource r = ScopedResource.of(t, C1);
        assertThat(r.kind()).isEqualTo(ScopedResource.Kind.TASK);
        assertThat(r.collaborators()).containsExactly(responsible);
        assertThat(AccessPolicy.decide(Viewer.user(responsible), r, ResourceAction.EDIT)).isEqualTo(AccessDecision.ALLOW);
        assertThat(AccessPolicy.decide(COMPANY, r, ResourceAction.VIEW)).as("RESTRITO não passa do departamento").isEqualTo(AccessDecision.NOT_FOUND);
        assertThat(AccessPolicy.decide(DEPT, r, ResourceAction.VIEW)).isEqualTo(AccessDecision.ALLOW);
    }

    @Test
    void projetoUsaEmpresaDepartamentoEVisibilidade() {
        ProjectScheme p = new ProjectScheme(UUID.randomUUID(), OWNER.userId(), C1, D1, "Pavimentação", null, null, null, null, null, null,
                CreationMode.MANUAL, SchemeOrigin.CRIAR_PROJETO, null, null, null, ProjectStatus.RASCUNHO, ProjectPhase.EXECUCAO, Priority.MEDIA,
                Visibility.EMPRESA, 2026, null, null, null, null, ProjectCoverMode.MOSAICO, null, null, null, null, BigDecimal.ZERO, false, null, null,
                null, null, null, false, false, null, 0, 0, 0, 0, 0, 0, null, null);
        ScopedResource r = ScopedResource.of(p);
        assertThat(AccessPolicy.decide(COMPANY, r, ResourceAction.VIEW)).isEqualTo(AccessDecision.ALLOW);
        assertThat(AccessPolicy.decide(OUTSIDER, r, ResourceAction.VIEW)).isEqualTo(AccessDecision.NOT_FOUND);
        UUID member = UUID.randomUUID();
        assertThat(AccessPolicy.decide(Viewer.user(member), r.withCollaborators(Set.of(member)), ResourceAction.EDIT)).isEqualTo(AccessDecision.ALLOW);
    }

    // ------------------------------------------------------------------------------------------------ decisão (DACI, §8)

    static Decision decision(Visibility v, AccessClassification c) {
        return new Decision(UUID.randomUUID(), "Nuvem da API", "Qual provedor de nuvem usar para a API?", null, null, null, null, null, null, null,
                null, OWNER.userId(), OWNER.userId(), C1, D1, null, null, null, null, DecisionLifecycle.AGUARDANDO_DECISAO, DecisionComplexity.PADRAO,
                DecisionKind.TATICA, DecisionLevel.ALTO, DecisionLevel.MEDIO, v, c, true, true, null, null, null, null, null, null);
    }

    record Participant(Viewer viewer, DecisionRole role, boolean delegated) {
    }

    static final List<Participant> DACI = List.of(
            new Participant(OWNER, null, false),
            new Participant(Viewer.user(UUID.randomUUID()), DecisionRole.CONDUTOR, false),
            new Participant(Viewer.user(UUID.randomUUID()), DecisionRole.APROVADOR, false),
            new Participant(Viewer.user(UUID.randomUUID()), DecisionRole.APROVADOR, true),
            new Participant(Viewer.user(UUID.randomUUID()), DecisionRole.CONTRIBUIDOR, false),
            new Participant(Viewer.user(UUID.randomUUID()), DecisionRole.INFORMADO, false),
            new Participant(DEPT, null, false),
            new Participant(OUTSIDER, null, false),
            new Participant(ADMIN, null, false));

    /** Colunas: responsável, CONDUTOR, APROVADOR, APROVADOR com delegação, CONTRIBUIDOR, INFORMADO, mesmo depto, outra empresa, ADMIN. */
    @ParameterizedTest(name = "decisão {0} {1} {2} → {3}")
    @CsvSource({
            "PRIVADA, INTERNO, VIEW, AAAAAANNA",
            "PRIVADA, INTERNO, EDIT_STRUCTURE, AAAAFFNNF",
            "PRIVADA, INTERNO, EDIT, AAAAFFNNF",
            "PRIVADA, INTERNO, ASSESS, AAAAAFNNF",
            "PRIVADA, INTERNO, DECIDE, AFFAFFNNF",
            "PRIVADA, INTERNO, REOPEN, AFFAFFNNF",
            "PRIVADA, INTERNO, DELETE, AFFFFFNNA",
            "DEPARTAMENTO, INTERNO, VIEW, AAAAAAANA",
            "DEPARTAMENTO, INTERNO, ASSESS, AAAAAFFNF",
            "EMPRESA, SIGILOSO, VIEW, AAAAAANNN",   // D-139: ADMIN fora de SIGILOSO também na decisão
            "PUBLICA, RESTRITO, VIEW, AAAAAAANA",
            "PUBLICA, INTERNO, MANAGE, AFFFFFFFA",
    })
    void matrizDaDecisao(Visibility v, AccessClassification c, ResourceAction action, String expected) {
        Decision d = decision(v, c);
        List<AccessDecision> got = new ArrayList<>();
        for (Participant p : DACI) {
            got.add(DecisionAccessPolicy.decide(p.viewer(), d, p.role(), p.delegated(), action));
        }
        List<AccessDecision> want = expected.chars().mapToObj(ch -> code((char) ch)).toList();
        assertThat(got).as("decisão %s %s %s", v, c, action).containsExactlyElementsOf(want);
        assertThat(DecisionAccessPolicy.decide(null, d, null, false, action)).isEqualTo(AccessDecision.NOT_FOUND);
    }

    // ------------------------------------------------------------------------------------------------ mídia (OwnMedia)

    static MediaObject media(MediaAccessClass cls) {
        return new MediaObject(UUID.randomUUID(), OWNER.userId(), "ws-media", "k/" + UUID.randomUUID(), "image/png", 10, "0".repeat(64), cls, null);
    }

    /** Colunas: dono, quem vê o recurso-pai, estranho, ADMIN. */
    @ParameterizedTest(name = "mídia {0} {1} → {2}")
    @CsvSource({
            "RESTRICTED, VIEW, ANNA",
            "RESTRICTED, DELETE, ANNA",
            "PRIVATE, VIEW, AANA",
            "PRIVATE, EDIT, AFNA",
            "PUBLIC, VIEW, AAAA",
            "PUBLIC, DELETE, AFFA",
            "PUBLIC, MANAGE, FFFF",
    })
    void matrizDaMidia(MediaAccessClass cls, ResourceAction action, String expected) {
        MediaObject m = media(cls);
        List<AccessDecision> got = List.of(
                MediaAccessPolicy.decide(OWNER, m, false, action),
                MediaAccessPolicy.decide(DEPT, m, true, action),
                MediaAccessPolicy.decide(OUTSIDER, m, false, action),
                MediaAccessPolicy.decide(ADMIN, m, false, action));
        assertThat(got).containsExactlyElementsOf(expected.chars().mapToObj(ch -> code((char) ch)).toList());
    }

    @Test
    void restritoESigilosoSempreVaoParaRestrictedENuloEPrivado() {
        assertThat(MediaAccessPolicy.storageClassFor(AccessClassification.SIGILOSO, true)).isEqualTo(MediaAccessClass.RESTRICTED);
        assertThat(MediaAccessPolicy.storageClassFor(AccessClassification.RESTRITO, false)).isEqualTo(MediaAccessClass.RESTRICTED);
        assertThat(MediaAccessPolicy.storageClassFor(AccessClassification.INTERNO, true)).isEqualTo(MediaAccessClass.PRIVATE);
        assertThat(MediaAccessPolicy.storageClassFor(AccessClassification.PUBLICO, true)).isEqualTo(MediaAccessClass.PUBLIC);
        assertThat(MediaAccessPolicy.storageClassFor(AccessClassification.PUBLICO, false)).isEqualTo(MediaAccessClass.PRIVATE);
        MediaObject legacy = new MediaObject(UUID.randomUUID(), OWNER.userId(), "b", "k", "image/png", 1, "0".repeat(64), null, null);
        assertThat(MediaAccessPolicy.decide(OUTSIDER, legacy, false, ResourceAction.VIEW)).as("classe nula = PRIVATE").isEqualTo(AccessDecision.NOT_FOUND);
        assertThat(MediaAccessPolicy.decide(null, legacy, true, ResourceAction.VIEW)).isEqualTo(AccessDecision.NOT_FOUND);
    }
}
