package br.gov.pr.secid.workstation.application.decisao;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.decisao.DecisionService.NewDecision;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEventType;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRole;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceNature;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceStance;
import br.gov.pr.secid.workstation.domain.decisao.OutcomeResult;
import br.gov.pr.secid.workstation.domain.decisao.RelevanceLevel;
import br.gov.pr.secid.workstation.domain.decisao.SnapshotKind;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.OptimisticLockingFailureException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Fase 7 do DECIA — serviço da decisão: criação, BOLA (404 uniforme), BFLA por papel DACI (403), comandos, guarda, snapshot e versão. */
class DecisionServiceTest {
    static final Instant NOW = Instant.parse("2026-11-24T12:00:00Z");
    static final RequestContext CTX = new RequestContext("127.0.0.1", "test");

    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final AuditLogPort audit = mock(AuditLogPort.class);
    final MemoryDecisions repo = new MemoryDecisions();
    final UUID company = UUID.randomUUID();
    final UUID dept = UUID.randomUUID();
    final DecisionService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        service = new DecisionService(repo, new ResourceAuthorizer(users, Optional.empty()), audit, Clock.fixed(NOW, ZoneOffset.UTC));
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
        u.setDepartmentId(dept);
        u.setStatus(AccountStatus.ACTIVE);
        people.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    static NewDecision quick(String q, List<String> criteria) {
        return new NewDecision(q, DecisionComplexity.RAPIDA, DecisionLevel.MEDIO, null, null, null, null, criteria);
    }

    static ApiException api(Runnable r) {
        try {
            r.run();
        } catch (ApiException e) {
            return e;
        }
        throw new AssertionError("esperava ApiException");
    }

    @Test
    void criaComResponsavelCondutorCriteriosETrilha() {
        User me = person(company);
        DecisionView v = service.create(cu(me), new NewDecision("Qual fornecedor de nuvem contratar?", DecisionComplexity.PROFUNDA,
                DecisionLevel.ALTO, null, null, "fornecedor", null, List.of("Custo", "Prazo")), CTX);
        assertThat(v.decision().status()).isEqualTo(DecisionLifecycle.RASCUNHO);
        assertThat(v.decision().title()).isEqualTo("Qual fornecedor de nuvem contratar");
        assertThat(v.decision().ownerUserId()).isEqualTo(me.getId());
        assertThat(v.decision().companyId()).isEqualTo(company);
        assertThat(v.decision().visibility()).isEqualTo(Visibility.PRIVADA);
        assertThat(v.decision().weightingEnabled()).isTrue();
        assertThat(v.participants()).singleElement().satisfies(p -> assertThat(p.role()).isEqualTo(DecisionRole.CONDUTOR));
        assertThat(v.criteria()).extracting(DecisionView.DecisionCriterionView::name).containsExactly("Custo", "Prazo");
        assertThat(v.events()).extracting(DecisionView.DecisionEventView::type)
                .containsExactly(DecisionEventType.DECISAO_CRIADA, DecisionEventType.CRITERIO_ATUALIZADO);
        assertThat(v.permissions().editStructure()).isTrue();
        assertThat(v.permissions().decide()).isTrue();
        ArgumentCaptor<AuditEvent> cap = ArgumentCaptor.forClass(AuditEvent.class);
        verify(audit).record(cap.capture());
        assertThat(cap.getValue().action()).isEqualTo(AuditActions.DECISION_CREATED);
        // nada de pergunta ou título na auditoria
        assertThat(cap.getValue().metadata().toString()).doesNotContain("fornecedor de nuvem");
    }

    @Test
    void criacaoValidaCamposEExigeEmpresa() {
        User me = person(company);
        ApiException e = api(() -> service.create(cu(me), new NewDecision("curta", null, null, null, null, "Modelo!", null,
                List.of("A", "a")), CTX));
        assertThat(e.status()).isEqualTo(422);
        assertThat(e.code()).isEqualTo("VALIDACAO");
        @SuppressWarnings("unchecked")
        Map<String, Object> fields = (Map<String, Object>) e.details().get("fields");
        assertThat(fields).containsKeys("question", "complexity", "impact", "templateKey", "criteria");

        User loose = person(null);
        ApiException noCompany = api(() -> service.create(cu(loose), quick("Qual caminho seguir agora?", List.of()), CTX));
        assertThat(noCompany.code()).isEqualTo("DECISAO_SEM_EMPRESA");
        assertThat(noCompany.status()).isEqualTo(422);
    }

    @Test
    void invisivelEInexistenteRespondemOMesmo404EListaFiltra() {
        User owner = person(company);
        User colleague = person(company);
        User stranger = person(UUID.randomUUID());
        DecisionView v = service.create(cu(owner), quick("Qual caminho seguir agora?", List.of()), CTX);
        UUID id = v.decision().id();

        ApiException hidden = api(() -> service.get(cu(stranger), id));
        ApiException missing = api(() -> service.get(cu(stranger), UUID.randomUUID()));
        assertThat(hidden.status()).isEqualTo(404);
        assertThat(hidden.getMessage()).isEqualTo(missing.getMessage());
        assertThat(api(() -> service.get(cu(colleague), id)).status()).isEqualTo(404);
        assertThat(api(() -> service.apply(cu(colleague), id, 0, List.of(DecisionCommand.addCriterion(null, "Custo")), CTX)).status())
                .isEqualTo(404);
        assertThat(service.list(cu(colleague), 50)).isEmpty();
        assertThat(service.list(cu(owner), 50)).hasSize(1);

        // na empresa: o colega vê, mas não edita (403 — BFLA)
        repo.setVisibility(id, Visibility.EMPRESA);
        assertThat(service.get(cu(colleague), id).permissions().editStructure()).isFalse();
        assertThat(service.list(cu(colleague), 50)).hasSize(1);
        assertThat(service.list(cu(stranger), 50)).isEmpty();
        ApiException forbidden = api(() -> service.apply(cu(colleague), id, 0, List.of(DecisionCommand.addCriterion(null, "Custo")), CTX));
        assertThat(forbidden.status()).isEqualTo(403);
        assertThat(api(() -> service.get(cu(stranger), id)).status()).isEqualTo(404);
    }

    @Test
    void loteCriaAlternativasComRefDaNotasEDecideComSnapshotIntegro() {
        User me = person(company);
        DecisionView v = service.create(cu(me), quick("Qual caminho seguir agora?", List.of("Custo")), CTX);
        UUID id = v.decision().id();
        String crit = v.criteria().get(0).id().toString();
        DecisionView after = service.apply(cu(me), id, v.decision().version(), List.of(
                DecisionCommand.addAlternative("tmp-a", "Contratar", false),
                DecisionCommand.addAlternative("tmp-b", "Não agir", true),
                DecisionCommand.setScore("tmp-a", crit, 5),
                DecisionCommand.setScore("tmp-b", crit, 2),
                DecisionCommand.addEvidence("Cotação oficial", EvidenceNature.FATO, "Portal de compras", RelevanceLevel.ALTA, "tmp-a",
                        EvidenceStance.SUSTENTA)), CTX);
        assertThat(after.decision().version()).isEqualTo(v.decision().version() + 1);
        assertThat(after.alternatives()).extracting(DecisionView.DecisionAlternativeView::label).containsExactly("A", "B");
        assertThat(after.alternatives().get(1).doNothing()).isTrue();
        assertThat(after.assessments()).hasSize(2);
        assertThat(after.evidence()).singleElement().satisfies(e -> assertThat(e.sourceLabel()).isEqualTo("Portal de compras"));
        assertThat(after.evidenceLinks()).singleElement()
                .satisfies(l -> assertThat(l.targetId()).isEqualTo(after.alternatives().get(0).id()));

        String alt = after.alternatives().get(0).id().toString();
        DecisionView decided = service.apply(cu(me), id, after.decision().version(),
                List.of(DecisionCommand.decide(alt, "Menor custo total e evidência oficial.", 70, false)), CTX);
        assertThat(decided.decision().status()).isEqualTo(DecisionLifecycle.DECIDIDA);
        assertThat(decided.decision().decisionConfidencePct()).isEqualTo(70);
        assertThat(decided.decision().selectedAlternativeId()).hasToString(alt);
        assertThat(decided.snapshots()).singleElement().satisfies(s -> {
            assertThat(s.kind()).isEqualTo(SnapshotKind.DECISAO);
            assertThat(s.versionNumber()).isEqualTo(1);
            assertThat(s.selectedAlternativeLabel()).isEqualTo("A");
        });
        assertThat(repo.snapshots.get(0).isIntact()).isTrue();
        // caminho explícito RASCUNHO → ENQUADRAMENTO → COMPARACAO → AGUARDANDO_DECISAO → DECIDIDA, tudo na trilha
        List<DecisionEventType> tail = decided.events().stream().map(DecisionView.DecisionEventView::type).toList();
        assertThat(tail.subList(tail.size() - 5, tail.size())).containsExactly(DecisionEventType.ESTADO_ALTERADO, DecisionEventType.ESTADO_ALTERADO,
                DecisionEventType.ESTADO_ALTERADO, DecisionEventType.DECISAO_FINALIZADA, DecisionEventType.ESTADO_ALTERADO);
        assertThat(decided.permissions().editStructure()).isFalse();
        assertThat(decided.permissions().reopen()).isTrue();
        verify(audit, atLeastOnce()).record(any(AuditEvent.class));
    }

    @Test
    void versaoAntigaRecebeConflitoSemGravarNada() {
        User me = person(company);
        DecisionView v = service.create(cu(me), quick("Qual caminho seguir agora?", List.of()), CTX);
        int events = repo.events.size();
        assertThatThrownBy(() -> service.apply(cu(me), v.decision().id(), v.decision().version() + 7,
                List.of(DecisionCommand.addAlternative(null, "A", false)), CTX)).isInstanceOf(OptimisticLockingFailureException.class);
        assertThat(repo.alternatives).isEmpty();
        assertThat(repo.events).hasSize(events);
    }

    @Test
    void guardaBloqueiaEPedeConfirmacaoDosAvisos() {
        User me = person(company);
        DecisionView v = service.create(cu(me), new NewDecision("Qual arquitetura adotar no portal?", DecisionComplexity.PADRAO, DecisionLevel.ALTO,
                null, null, null, null, List.of("Custo", "Segurança")), CTX);
        UUID id = v.decision().id();
        DecisionView with = service.apply(cu(me), id, v.decision().version(), List.of(DecisionCommand.addAlternative("a", "Monólito", false),
                DecisionCommand.addAlternative("b", "Microsserviços", false)), CTX);
        String alt = with.alternatives().get(0).id().toString();
        ApiException incomplete = api(() -> service.apply(cu(me), id, with.decision().version(),
                List.of(DecisionCommand.decide(alt, "curto", null, true)), CTX));
        assertThat(incomplete.code()).isEqualTo("DECISAO_INCOMPLETA");
        assertThat(incomplete.status()).isEqualTo(422);
        assertThat(incomplete.details().get("blocking")).asString().contains("MOTIVO_VAZIO");

        ApiException warn = api(() -> service.apply(cu(me), id, with.decision().version(),
                List.of(DecisionCommand.decide(alt, "Motivo suficiente para decidir.", null, false)), CTX));
        assertThat(warn.code()).isEqualTo("DECISAO_AVISOS_NAO_CONFIRMADOS");
        assertThat(warn.details().get("warnings")).asString().contains("PRONTIDAO_INCOMPLETA");
        // nada foi gravado pela tentativa recusada (a transação desfaz no banco; aqui a raiz não mudou)
        assertThat(repo.findById(id).orElseThrow().decision().status()).isEqualTo(DecisionLifecycle.RASCUNHO);

        DecisionView ok = service.apply(cu(me), id, with.decision().version(),
                List.of(DecisionCommand.decide(alt, "Motivo suficiente para decidir.", 60, true)), CTX);
        assertThat(ok.decision().status()).isEqualTo(DecisionLifecycle.DECIDIDA);
        assertThat(ok.events().stream().filter(e -> e.type() == DecisionEventType.DECISAO_FINALIZADA).findFirst().orElseThrow().payload()
                .get("warnings")).asString().contains("PRONTIDAO_INCOMPLETA");
    }

    @Test
    void papeisDaciLimitamComandosEReaberturaESoDoResponsavel() {
        User owner = person(company);
        User contributor = person(company);
        User informed = person(company);
        DecisionView v = service.create(cu(owner), quick("Qual caminho seguir agora?", List.of("Custo")), CTX);
        UUID id = v.decision().id();
        repo.join(id, contributor.getId(), DecisionRole.CONTRIBUIDOR);
        repo.join(id, informed.getId(), DecisionRole.INFORMADO);
        DecisionView with = service.apply(cu(owner), id, v.decision().version(), List.of(DecisionCommand.addAlternative("a", "Sim", false),
                DecisionCommand.addAlternative("b", "Não", true)), CTX);
        String alt = with.alternatives().get(0).id().toString();
        String crit = with.criteria().get(0).id().toString();

        // participante vê mesmo com a decisão PRIVADA; CONTRIBUIDOR avalia, não muda a estrutura nem decide
        assertThat(service.get(cu(informed), id).permissions().assess()).isFalse();
        DecisionView scored = service.apply(cu(contributor), id, with.decision().version(), List.of(DecisionCommand.setScore(alt, crit, 4)), CTX);
        assertThat(scored.assessments()).singleElement().satisfies(a -> assertThat(a.assessorUserId()).isEqualTo(contributor.getId()));
        long ver = scored.decision().version();
        assertThat(api(() -> service.apply(cu(contributor), id, ver, List.of(DecisionCommand.addAlternative(null, "C", false)), CTX)).status())
                .isEqualTo(403);
        assertThat(api(() -> service.apply(cu(contributor), id, ver, List.of(DecisionCommand.decide(alt, "Motivo suficiente aqui.", null, true)),
                CTX)).status()).isEqualTo(403);
        assertThat(api(() -> service.apply(cu(informed), id, ver, List.of(DecisionCommand.setScore(alt, crit, 2)), CTX)).status())
                .isEqualTo(403);
        // nota removida com score nulo
        DecisionView removed = service.apply(cu(contributor), id, ver, List.of(DecisionCommand.setScore(alt, crit, null)), CTX);
        assertThat(removed.assessments()).isEmpty();

        DecisionView decided = service.apply(cu(owner), id, removed.decision().version(), List.of(DecisionCommand.setScore(alt, crit, 5),
                DecisionCommand.setScore(with.alternatives().get(1).id().toString(), crit, 1),
                DecisionCommand.decide(alt, "Motivo suficiente aqui.", 80, true)), CTX);
        long dv = decided.decision().version();
        // depois de decidir a estrutura trava (409) e só o responsável reabre (403 para os demais)
        ApiException locked = api(() -> service.apply(cu(owner), id, dv, List.of(DecisionCommand.addAlternative(null, "C", false)), CTX));
        assertThat(locked.status()).isEqualTo(409);
        assertThat(locked.code()).isEqualTo("DECISAO_CICLO_TRANSICAO_INVALIDA");
        assertThat(api(() -> service.apply(cu(contributor), id, dv, List.of(DecisionCommand.reopen("rever")), CTX)).status()).isEqualTo(403);
        DecisionView reopened = service.apply(cu(owner), id, dv, List.of(DecisionCommand.transition(DecisionLifecycle.REABERTA)), CTX);
        assertThat(reopened.decision().status()).isEqualTo(DecisionLifecycle.REABERTA);
        assertThat(reopened.snapshots()).extracting(DecisionView.DecisionSnapshotView::kind).containsExactly(SnapshotKind.DECISAO, SnapshotKind.REABERTURA);
        assertThat(reopened.snapshots().get(1).versionNumber()).isEqualTo(2);
    }

    @Test
    void transicoesInvalidasIdsDeOutraDecisaoEResultadoUnico() {
        User me = person(company);
        DecisionView a = service.create(cu(me), quick("Qual caminho seguir agora?", List.of("Custo")), CTX);
        DecisionView b = service.create(cu(me), quick("Qual outro caminho seguir?", List.of("Prazo")), CTX);
        UUID id = a.decision().id();
        ApiException direct = api(() -> service.apply(cu(me), id, 0, List.of(DecisionCommand.transition(DecisionLifecycle.DECIDIDA)), CTX));
        assertThat(direct.status()).isEqualTo(409);
        assertThat(direct.code()).isEqualTo("DECISAO_EXIGE_GUARDA");
        ApiException skip = api(() -> service.apply(cu(me), id, 0, List.of(DecisionCommand.transition(DecisionLifecycle.RESOLVIDA)), CTX));
        assertThat(skip.code()).isEqualTo("DECISAO_CICLO_TRANSICAO_INVALIDA");
        ApiException noTo = api(() -> service.apply(cu(me), id, 0, List.of(DecisionCommand.transition(null)), CTX));
        assertThat(noTo.status()).isEqualTo(422);
        assertThat(api(() -> service.apply(cu(me), id, 0, List.of(), CTX)).status()).isEqualTo(422);

        // critério de OUTRA decisão não serve aqui (422, nunca escrita cruzada)
        DecisionView withAlt = service.apply(cu(me), id, 0, List.of(DecisionCommand.addAlternative("x", "Sim", false)), CTX);
        String foreign = b.criteria().get(0).id().toString();
        ApiException cross = api(() -> service.apply(cu(me), id, withAlt.decision().version(),
                List.of(DecisionCommand.setScore("x-inexistente", foreign, 3)), CTX));
        assertThat(cross.status()).isEqualTo(422);
        ApiException crossCrit = api(() -> service.apply(cu(me), id, withAlt.decision().version(),
                List.of(DecisionCommand.setScore(withAlt.alternatives().get(0).id().toString(), foreign, 3)), CTX));
        assertThat(crossCrit.details().get("fields")).asString().contains("criterionId");
        ApiException badScore = api(() -> service.apply(cu(me), id, withAlt.decision().version(),
                List.of(DecisionCommand.setScore(withAlt.alternatives().get(0).id().toString(), a.criteria().get(0).id().toString(), 9)), CTX));
        assertThat(badScore.status()).isEqualTo(422);
        ApiException badWeight = api(() -> service.apply(cu(me), id, withAlt.decision().version(),
                List.of(DecisionCommand.setWeight(a.criteria().get(0).id().toString(), 120.0)), CTX));
        assertThat(badWeight.status()).isEqualTo(422);
        DecisionView weighted = service.apply(cu(me), id, withAlt.decision().version(),
                List.of(DecisionCommand.setWeight(a.criteria().get(0).id().toString(), 100.0)), CTX);
        assertThat(weighted.criteria().get(0).weightPct()).isEqualTo(100.0);

        DecisionView withB = service.apply(cu(me), id, weighted.decision().version(), List.of(DecisionCommand.addAlternative(null, "Não", true),
                DecisionCommand.decide(withAlt.alternatives().get(0).id().toString(), "Motivo suficiente aqui.", null, true),
                DecisionCommand.recordOutcome(OutcomeResult.SUCESSO, "Entregue no prazo.")), CTX);
        assertThat(withB.decision().status()).isEqualTo(DecisionLifecycle.RESOLVIDA);
        assertThat(withB.outcome().result()).isEqualTo(OutcomeResult.SUCESSO);
        ApiException again = api(() -> service.apply(cu(me), id, withB.decision().version(),
                List.of(DecisionCommand.recordOutcome(OutcomeResult.PARCIAL, "De novo.")), CTX));
        assertThat(again.code()).isEqualTo("DECISAO_RESULTADO_JA_REGISTRADO");
        DecisionView archived = service.apply(cu(me), id, withB.decision().version(), List.of(DecisionCommand.transition(DecisionLifecycle.REVISADA),
                DecisionCommand.transition(DecisionLifecycle.ARQUIVADA)), CTX);
        assertThat(archived.events().get(archived.events().size() - 1).type()).isEqualTo(DecisionEventType.DECISAO_ARQUIVADA);
    }

    @Test
    void rotulosSeguemAlfabetoDepoisDoZ() {
        assertThat(DecisionService.labelFor(0)).isEqualTo("A");
        assertThat(DecisionService.labelFor(25)).isEqualTo("Z");
        assertThat(DecisionService.labelFor(26)).isEqualTo("AA");
        assertThat(DecisionService.editable(DecisionLifecycle.DECIDIDA)).isFalse();
        assertThat(DecisionService.editable(DecisionLifecycle.REABERTA)).isTrue();
    }
}
