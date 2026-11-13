package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.LegalDeadlineService.LegalDeadlineInput;
import br.gov.pr.secid.workstation.application.acervo.LegalDeadlineService.LegalDeadlineRuleView;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.notifications.MemoryNotifications;
import br.gov.pr.secid.workstation.application.notifications.NotificationService;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.LegalDeadlineRule;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** RF41.CA04/RF20.CA11 — catálogo de prazos legais e prazo legal da tarefa: cálculo no servidor, BOLA, versão e regra da empresa. */
class LegalDeadlineServiceTest {
    static final RequestContext CTX = new RequestContext("127.0.0.1", "test");

    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final List<AuditEvent> audits = new ArrayList<>();
    final AcervoFakes.Tasks tasks = new AcervoFakes.Tasks();
    final AcervoFakes.Rules rules = new AcervoFakes.Rules();
    final UUID company = UUID.randomUUID();
    final UUID otherCompany = UUID.randomUUID();
    final LegalDeadlineService service;

    final LegalDeadlineRule lai = rules.add(new LegalDeadlineRule(UUID.randomUUID(), null, TaskCategory.OFICIO_MEMORANDO, "Pedido LAI", 20, false,
            "Lei nº 12.527/2011, art. 11, § 1º", "Resposta ao pedido", true, null, null));
    final LegalDeadlineRule alegacoes = rules.add(new LegalDeadlineRule(UUID.randomUUID(), null, TaskCategory.OUTRO, "Alegações", 5, true,
            "Lei nº 9.784/1999, art. 62", null, true, null, null));
    final LegalDeadlineRule daEmpresa = rules.add(new LegalDeadlineRule(UUID.randomUUID(), company, TaskCategory.OUTRO, "Regra local", 3, true,
            "Decreto municipal", null, true, null, null));
    final LegalDeadlineRule deOutra = rules.add(new LegalDeadlineRule(UUID.randomUUID(), otherCompany, TaskCategory.OUTRO, "Outra empresa", 3, true,
            "Decreto de outro município", null, true, null, null));
    final LegalDeadlineRule inativa = rules.add(new LegalDeadlineRule(UUID.randomUUID(), null, TaskCategory.OUTRO, "Revogada", 10, false,
            "Lei revogada", null, false, null, null));
    final LegalDeadlineRule vencida = rules.add(new LegalDeadlineRule(UUID.randomUUID(), null, TaskCategory.OUTRO, "Até 2020", 10, false,
            "Lei antiga", null, true, null, LocalDate.of(2020, 12, 31)));

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        ResourceAuthorizer authorizer = new ResourceAuthorizer(users, Optional.empty());
        Clock clock = Clock.fixed(AcervoFakes.T0, ZoneOffset.UTC);
        TaskService taskService = new TaskService(tasks, users, authorizer, audits::add,
                new NotificationService(new MemoryNotifications(), users, authorizer, clock), clock);
        service = new LegalDeadlineService(rules, tasks, taskService, authorizer, audits::add, clock);
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User person(UUID companyId) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setRole(Role.USER);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setCompanyId(companyId);
        u.setStatus(AccountStatus.ACTIVE);
        people.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    TaskItem taskOf(User owner, TaskState state, Visibility visibility, AccessClassification access) {
        TaskItem t = AcervoFakes.task(owner.getId(), "Responder pedido", state, Priority.ALTA, TaskCategory.OFICIO_MEMORANDO, null, null, access,
                visibility, null);
        tasks.put(t, AcervoFakes.T0, AcervoFakes.T0);
        return t;
    }

    @Test
    void catalogoTrazPadraoEDaPropriaEmpresaAtivasEVigentes() {
        User me = person(company);
        List<LegalDeadlineRuleView> list = service.rules(cu(me));
        assertThat(list).extracting(LegalDeadlineRuleView::id).containsExactlyInAnyOrder(lai.id(), alegacoes.id(), daEmpresa.id());
        assertThat(list).filteredOn(LegalDeadlineRuleView::companyRule).extracting(LegalDeadlineRuleView::id).containsExactly(daEmpresa.id());
        assertThat(service.rules(cu(person(null)))).extracting(LegalDeadlineRuleView::id).containsExactlyInAnyOrder(lai.id(), alegacoes.id());
    }

    @Test
    void gravaRegraInicioEVencimentoCalculadoNoServidor() {
        User me = person(company);
        TaskItem t = taskOf(me, TaskState.EM_USO, Visibility.PRIVADA, AccessClassification.INTERNO);
        TaskView v = service.apply(cu(me), t.id(), new LegalDeadlineInput(lai.id(), LocalDate.of(2026, 11, 12), 0), CTX);
        assertThat(v.legalDeadlineRuleId()).isEqualTo(lai.id());
        assertThat(v.legalDeadlineBaseDate()).isEqualTo(LocalDate.of(2026, 11, 12));
        assertThat(v.legalDueAt()).isEqualTo(LocalDate.of(2026, 12, 2));
        assertThat(v.version()).isEqualTo(1);
        // dias úteis: 20/11 (Consciência Negra) não conta
        TaskView uteis = service.apply(cu(me), t.id(), new LegalDeadlineInput(alegacoes.id(), LocalDate.of(2026, 11, 18), 1), CTX);
        assertThat(uteis.legalDueAt()).isEqualTo(LocalDate.of(2026, 11, 26));
        // regra da própria empresa vale
        assertThat(service.apply(cu(me), t.id(), new LegalDeadlineInput(daEmpresa.id(), LocalDate.of(2026, 11, 12), 2), CTX).legalDueAt())
                .isEqualTo(LocalDate.of(2026, 11, 17));
        // limpar
        TaskView limpo = service.apply(cu(me), t.id(), new LegalDeadlineInput(null, null, 3), CTX);
        assertThat(limpo.legalDeadlineRuleId()).isNull();
        assertThat(limpo.legalDueAt()).isNull();
        assertThat(audits).extracting(AuditEvent::action).containsOnly("TASK_LEGAL_DEADLINE_SET").hasSize(4);
        assertThat(audits.get(0).metadata()).containsEntry("legalDueAt", "2026-12-02");
        assertThat(AuthorizationTrail.checked()).isTrue();
    }

    @Test
    void validaRegraEDataComErrosPorCampo() {
        User me = person(company);
        TaskItem t = taskOf(me, TaskState.DISPONIVEL, Visibility.PRIVADA, AccessClassification.INTERNO);
        for (UUID bad : List.of(deOutra.id(), inativa.id(), UUID.randomUUID())) {
            assertThatThrownBy(() -> service.apply(cu(me), t.id(), new LegalDeadlineInput(bad, LocalDate.of(2026, 11, 12), 0), CTX))
                    .isInstanceOfSatisfying(ApiException.class, e -> {
                        assertThat(e.status()).isEqualTo(422);
                        assertThat(e.details().toString()).contains("ruleId");
                    });
        }
        assertThatThrownBy(() -> service.apply(cu(me), t.id(), new LegalDeadlineInput(lai.id(), null, 0), CTX))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.details().toString()).contains("startDate"));
        assertThatThrownBy(() -> service.apply(cu(me), t.id(), new LegalDeadlineInput(lai.id(), LocalDate.of(2001, 1, 1), 0), CTX))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.details().toString()).contains("startDate"));
        assertThatThrownBy(() -> service.apply(cu(me), t.id(), new LegalDeadlineInput(vencida.id(), LocalDate.of(2026, 11, 12), 0), CTX))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.details().toString()).contains("não vale"));
        assertThat(tasks.rows.get(t.id()).task().legalDueAt()).isNull();
    }

    @Test
    void bolaVersaoEEstadoSomenteLeitura() {
        User me = person(company);
        User colega = person(company);
        User estranho = person(otherCompany);
        TaskItem empresa = taskOf(me, TaskState.EM_USO, Visibility.EMPRESA, AccessClassification.INTERNO);
        LegalDeadlineInput in = new LegalDeadlineInput(lai.id(), LocalDate.of(2026, 11, 12), 0);
        // colega vê (EMPRESA) mas não edita → 403; outra empresa não vê → 404 igual a inexistente
        assertThatThrownBy(() -> service.apply(cu(colega), empresa.id(), in, CTX)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.status()).isEqualTo(403));
        assertThatThrownBy(() -> service.apply(cu(estranho), empresa.id(), in, CTX)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.status()).isEqualTo(404));
        assertThatThrownBy(() -> service.apply(cu(me), UUID.randomUUID(), in, CTX)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.status()).isEqualTo(404));
        // versão superada
        assertThatThrownBy(() -> service.apply(cu(me), empresa.id(), new LegalDeadlineInput(lai.id(), LocalDate.of(2026, 11, 12), 7), CTX))
                .isInstanceOf(OptimisticLockingFailureException.class);
        // concluída: somente leitura
        TaskItem fechada = taskOf(me, TaskState.CONCLUIDA, Visibility.PRIVADA, AccessClassification.INTERNO);
        assertThatThrownBy(() -> service.apply(cu(me), fechada.id(), in, CTX)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("TAREFA_BLOQUEADA"));
        assertThat(audits).isEmpty();
    }
}
