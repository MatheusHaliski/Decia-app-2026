package br.gov.pr.secid.workstation.application.decisao;

import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand.DecisionAssumptionInput;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand.DecisionCheckpointInput;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand.DecisionForecastInput;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand.DecisionRecommendationInput;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand.DecisionRetrospectiveInput;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand.DecisionRiskInput;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand.DecisionScenarioInput;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand.DecisionTriggerInput;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand.DecisionWorkLinkInput;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand.Type;
import br.gov.pr.secid.workstation.application.decisao.DecisionService.NewDecision;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.AssumptionStatus;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointAction;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointKind;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointStatus;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEventType;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRole;
import br.gov.pr.secid.workstation.domain.decisao.ForecastResolution;
import br.gov.pr.secid.workstation.domain.decisao.Likelihood;
import br.gov.pr.secid.workstation.domain.decisao.OutcomeResult;
import br.gov.pr.secid.workstation.domain.decisao.ProcessQuality;
import br.gov.pr.secid.workstation.domain.decisao.RecommendationSource;
import br.gov.pr.secid.workstation.domain.decisao.RecommendationStatus;
import br.gov.pr.secid.workstation.domain.decisao.RiskStatus;
import br.gov.pr.secid.workstation.domain.decisao.ScenarioCase;
import br.gov.pr.secid.workstation.domain.decisao.TriggerStatus;
import br.gov.pr.secid.workstation.domain.decisao.WorkLinkTarget;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.security.ScopedResource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Fase 7b do DECIA — premissas, riscos, cenários, previsões, recomendações, gatilhos, checkpoints, vínculos de trabalho e retrospectiva pela
 * API de comandos: refs no lote, severidade calculada, BFLA por papel DACI (403), alvo de vínculo invisível = 422 sem oráculo, trilha só
 * com ids/enums.
 */
class DecisionRecordCommandsTest {
    static final Instant NOW = Instant.parse("2026-11-24T12:00:00Z");
    static final RequestContext CTX = new RequestContext("127.0.0.1", "test");

    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final MemoryDecisions repo = new MemoryDecisions();
    final UUID company = UUID.randomUUID();
    final UUID dept = UUID.randomUUID();
    final DecisionService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        service = new DecisionService(repo, new ResourceAuthorizer(users, Optional.empty()), mock(AuditLogPort.class),
                Clock.fixed(NOW, ZoneOffset.UTC));
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

    static ApiException api(Runnable r) {
        try {
            r.run();
        } catch (ApiException e) {
            return e;
        }
        throw new AssertionError("esperava ApiException");
    }

    DecisionView fresh(User owner) {
        return service.create(cu(owner), new NewDecision("Qual caminho seguir agora?", DecisionComplexity.RAPIDA, DecisionLevel.MEDIO, null, null,
                null, null, List.of("Custo")), CTX);
    }

    static DecisionAssumptionInput assumption(String text, DecisionLevel importance) {
        return new DecisionAssumptionInput(text, importance, 70, null, null, null, null);
    }

    @Test
    void loteGravaRegistrosComRefsESeveridadeCalculada() {
        User me = person(company);
        DecisionView v = fresh(me);
        UUID id = v.decision().id();
        DecisionView after = service.apply(cu(me), id, v.decision().version(), List.of(
                DecisionCommand.addAlternative("alt-a", "Contratar", false),
                DecisionCommand.item(Type.PUT_ASSUMPTION, "p1", null, assumption("O orçamento será aprovado.", DecisionLevel.CRITICO)),
                DecisionCommand.item(Type.PUT_RISK, "r1", null, new DecisionRiskInput("Atraso na entrega", null, "alt-a", Likelihood.PROVAVEL,
                        DecisionLevel.ALTO, "Multa contratual", me.getId(), null, null)),
                DecisionCommand.item(Type.PUT_SCENARIO, null, null, new DecisionScenarioInput("alt-a", ScenarioCase.BASE, "Entrega no prazo",
                        Likelihood.POSSIVEL, List.of("p1"), "Serviço em produção em março")),
                DecisionCommand.item(Type.PUT_FORECAST, null, null, new DecisionForecastInput("alt-a", "Entrega até março?", 65,
                        LocalDate.of(2027, 3, 31), null)),
                DecisionCommand.item(Type.PUT_TRIGGER, "g1", null, new DecisionTriggerInput("Custo passar de 1 milhão", "custo_total", ">", 1_000_000.0,
                        null)),
                DecisionCommand.item(Type.PUT_CHECKPOINT, null, null, new DecisionCheckpointInput(NOW.plusSeconds(86_400 * 30), null, null, null,
                        null, null, null, null, null)),
                DecisionCommand.item(Type.PUT_RECOMMENDATION, null, null, new DecisionRecommendationInput("alt-a", RecommendationSource.MODELO,
                        "A lidera a matriz.", List.of("Nota maior em custo"), List.of("Evidência fraca"), List.of("p1"), "Só um critério.",
                        "Uma cotação menor em B.", null))), CTX);

        assertThat(after.assumptions()).singleElement().satisfies(a -> {
            assertThat(a.importance()).isEqualTo(DecisionLevel.CRITICO);
            assertThat(a.validationStatus()).isEqualTo(AssumptionStatus.NAO_VALIDADA);
        });
        UUID assumptionId = after.assumptions().get(0).id();
        UUID altId = after.alternatives().get(0).id();
        assertThat(after.risks()).singleElement().satisfies(r -> {
            assertThat(r.alternativeId()).isEqualTo(altId);
            assertThat(r.severity()).isEqualTo(DecisionLevel.ALTO);
            assertThat(r.ownerUserId()).isEqualTo(me.getId());
        });
        assertThat(after.scenarios()).singleElement().satisfies(s -> assertThat(s.assumptionIds()).containsExactly(assumptionId.toString()));
        assertThat(after.forecasts()).singleElement().satisfies(f -> {
            assertThat(f.forecasterUserId()).isEqualTo(me.getId());
            assertThat(f.resolution()).isEqualTo(ForecastResolution.PENDENTE);
        });
        assertThat(after.triggers()).singleElement().satisfies(t -> assertThat(t.threshold()).isEqualTo(1_000_000.0));
        assertThat(after.checkpoints()).singleElement().satisfies(c -> assertThat(c.kind()).isEqualTo(CheckpointKind.PROGRAMADO));
        assertThat(after.recommendations()).singleElement().satisfies(r -> {
            assertThat(r.status()).isEqualTo(RecommendationStatus.SUGERIDA);
            assertThat(r.criticalAssumptionIds()).containsExactly(assumptionId.toString());
            assertThat(r.modelVersion()).isEqualTo("decia-scoring-v1");
        });
        assertThat(after.permissions().editRecords()).isTrue();
        // trilha só com ids/enums/números — nenhum enunciado
        assertThat(after.events()).extracting(DecisionView.DecisionEventView::type).contains(DecisionEventType.PREMISSA_ATUALIZADA,
                DecisionEventType.RISCO_ALTERADO, DecisionEventType.RECOMENDACAO_GERADA, DecisionEventType.CHECKPOINT_VENCENDO);
        assertThat(after.events()).allSatisfy(e -> assertThat(e.payload().toString()).doesNotContain("orçamento", "Atraso", "Custo passar"));

        // atualizar pelo itemId, aceitar a recomendação, disparar o gatilho e remover a premissa (o cenário perde a referência no cliente)
        UUID riskId = after.risks().get(0).id();
        UUID triggerId = after.triggers().get(0).id();
        DecisionView changed = service.apply(cu(me), id, after.decision().version(), List.of(
                DecisionCommand.item(Type.PUT_RISK, null, riskId.toString(), new DecisionRiskInput("Atraso na entrega", null, null, Likelihood.RARA,
                        DecisionLevel.ALTO, null, null, null, RiskStatus.MITIGADO)),
                DecisionCommand.item(Type.PUT_RECOMMENDATION, null, after.recommendations().get(0).id().toString(),
                        new DecisionRecommendationInput(null, null, null, null, null, null, null, null, RecommendationStatus.ACEITA)),
                DecisionCommand.item(Type.PUT_TRIGGER, null, triggerId.toString(), new DecisionTriggerInput("Custo passar de 1 milhão", null, null, null,
                        TriggerStatus.DISPARADO)),
                DecisionCommand.item(Type.PUT_ASSUMPTION, null, assumptionId.toString(), new DecisionAssumptionInput("O orçamento será aprovado.",
                        DecisionLevel.CRITICO, 90, AssumptionStatus.VALIDADA, null, null, "Ofício recebido"))), CTX);
        assertThat(changed.risks().get(0).status()).isEqualTo(RiskStatus.MITIGADO);
        assertThat(changed.risks().get(0).severity()).isEqualTo(DecisionLevel.MEDIO);
        assertThat(changed.recommendations().get(0).status()).isEqualTo(RecommendationStatus.ACEITA);
        assertThat(changed.triggers().get(0).firedAt()).isEqualTo(NOW);
        assertThat(changed.assumptions().get(0).validatedAt()).isEqualTo(NOW);
        assertThat(changed.events()).extracting(DecisionView.DecisionEventView::type).contains(DecisionEventType.SUGESTAO_IA_ACEITA,
                DecisionEventType.GATILHO_DISPARADO);
        // a recomendação já respondida não muda de novo
        ApiException again = api(() -> service.apply(cu(me), id, changed.decision().version(), List.of(DecisionCommand.item(Type.PUT_RECOMMENDATION,
                null, changed.recommendations().get(0).id().toString(), new DecisionRecommendationInput(null, null, null, null, null, null, null, null,
                        RecommendationStatus.DESCARTADA))), CTX));
        assertThat(again.code()).isEqualTo("RECOMENDACAO_ESTADO_INVALIDO");

        DecisionView removed = service.apply(cu(me), id, changed.decision().version(), List.of(
                DecisionCommand.item(Type.REMOVE_TRIGGER, null, triggerId.toString(), null),
                DecisionCommand.item(Type.REMOVE_RISK, null, riskId.toString(), null)), CTX);
        assertThat(removed.triggers()).isEmpty();
        assertThat(removed.risks()).isEmpty();
    }

    @Test
    void validaCamposEIdsDeOutraDecisao() {
        User me = person(company);
        DecisionView a = fresh(me);
        DecisionView b = fresh(me);
        DecisionView withB = service.apply(cu(me), b.decision().id(), b.decision().version(), List.of(
                DecisionCommand.item(Type.PUT_ASSUMPTION, null, null, assumption("Premissa da outra decisão.", DecisionLevel.BAIXO))), CTX);
        String foreign = withB.assumptions().get(0).id().toString();
        UUID id = a.decision().id();
        long ver = a.decision().version();

        assertThat(api(() -> service.apply(cu(me), id, ver, List.of(DecisionCommand.item(Type.REMOVE_ASSUMPTION, null, foreign, null)), CTX))
                .status()).isEqualTo(422);
        assertThat(api(() -> service.apply(cu(me), id, ver, List.of(DecisionCommand.item(Type.PUT_ASSUMPTION, null, null, null)), CTX))
                .details().get("fields")).asString().contains("assumption");
        assertThat(api(() -> service.apply(cu(me), id, ver, List.of(DecisionCommand.item(Type.PUT_ASSUMPTION, null, null,
                new DecisionAssumptionInput("x", DecisionLevel.ALTO, 33, null, null, null, null))), CTX)).details().get("fields"))
                .asString().contains("confidencePct");
        // dono de premissa precisa ser da decisão (nunca uma conta qualquer)
        User stranger = person(company);
        assertThat(api(() -> service.apply(cu(me), id, ver, List.of(DecisionCommand.item(Type.PUT_ASSUMPTION, null, null,
                new DecisionAssumptionInput("x", DecisionLevel.ALTO, null, null, stranger.getId(), null, null))), CTX)).details().get("fields"))
                .asString().contains("ownerUserId");
        assertThat(api(() -> service.apply(cu(me), id, ver, List.of(DecisionCommand.item(Type.PUT_FORECAST, null, null,
                new DecisionForecastInput(null, "Vai chover?", 97, LocalDate.of(2027, 1, 1), null))), CTX)).details().get("fields"))
                .asString().contains("probabilityPct");
        assertThat(api(() -> service.apply(cu(me), id, ver, List.of(DecisionCommand.item(Type.PUT_TRIGGER, null, null,
                new DecisionTriggerInput("Condição", null, "=>", null, null))), CTX)).details().get("fields")).asString().contains("comparator");
        // recomendação de IA não entra pelo cliente; MODELO sem o que contradiz é incompleta (§7)
        assertThat(api(() -> service.apply(cu(me), id, ver, List.of(DecisionCommand.item(Type.PUT_RECOMMENDATION, null, null,
                new DecisionRecommendationInput(null, RecommendationSource.IA, "r", List.of("s"), List.of("c"), List.of(), "l", "w", null))), CTX))
                .details().get("fields")).asString().contains("source");
        ApiException echo = api(() -> service.apply(cu(me), id, ver, List.of(DecisionCommand.item(Type.PUT_RECOMMENDATION, null, null,
                new DecisionRecommendationInput(null, RecommendationSource.MODELO, "r", List.of("s"), List.of(), List.of(), "l", "w", null))), CTX));
        assertThat(echo.code()).isEqualTo("RECOMENDACAO_INCOMPLETA");
        assertThat(echo.status()).isEqualTo(422);
        // checkpoint novo nasce AGENDADO; retrospectiva só depois do resultado
        assertThat(api(() -> service.apply(cu(me), id, ver, List.of(DecisionCommand.item(Type.PUT_CHECKPOINT, null, null,
                new DecisionCheckpointInput(NOW, null, CheckpointStatus.CONCLUIDO, true, false, false, 80, CheckpointAction.MANTER, null))), CTX))
                .status()).isEqualTo(422);
        ApiException early = api(() -> service.apply(cu(me), id, ver, List.of(DecisionCommand.item(Type.PUT_RETROSPECTIVE, null, null,
                retro())), CTX));
        assertThat(early.code()).isEqualTo("DECISAO_SEM_RESULTADO");
    }

    static DecisionRetrospectiveInput retro() {
        return new DecisionRetrospectiveInput("Entregou com atraso.", "No prazo.", "Fornecedor bom.", "Prazo otimista.", List.of(),
                ProcessQuality.PARCIAL, "Prever folga.", true);
    }

    @Test
    void papeisDaciLimitamRegistros() {
        User owner = person(company);
        User contributor = person(company);
        User informed = person(company);
        DecisionView v = fresh(owner);
        UUID id = v.decision().id();
        repo.join(id, contributor.getId(), DecisionRole.CONTRIBUIDOR);
        repo.join(id, informed.getId(), DecisionRole.INFORMADO);
        long ver = v.decision().version();

        // CONTRIBUIDOR prevê (ASSESS), mas não mexe em premissas/riscos nem resolve previsão; INFORMADO nem prevê
        assertThat(api(() -> service.apply(cu(contributor), id, ver, List.of(DecisionCommand.item(Type.PUT_ASSUMPTION, null, null,
                assumption("Premissa.", DecisionLevel.ALTO))), CTX)).status()).isEqualTo(403);
        assertThat(api(() -> service.apply(cu(informed), id, ver, List.of(DecisionCommand.item(Type.PUT_FORECAST, null, null,
                new DecisionForecastInput(null, "Entrega em março?", 60, LocalDate.of(2027, 3, 1), null))), CTX)).status()).isEqualTo(403);
        DecisionView predicted = service.apply(cu(contributor), id, ver, List.of(DecisionCommand.item(Type.PUT_FORECAST, null, null,
                new DecisionForecastInput(null, "Entrega em março?", 60, LocalDate.of(2027, 3, 1), null))), CTX);
        assertThat(predicted.permissions().editRecords()).isFalse();
        String forecast = predicted.forecasts().get(0).id().toString();
        long ver2 = predicted.decision().version();
        assertThat(api(() -> service.apply(cu(contributor), id, ver2, List.of(DecisionCommand.item(Type.PUT_FORECAST, null, forecast,
                new DecisionForecastInput(null, null, null, null, ForecastResolution.OCORREU))), CTX)).status()).isEqualTo(403);
        // o responsável não reescreve a previsão de outra pessoa, mas resolve (uma vez só)
        assertThat(api(() -> service.apply(cu(owner), id, ver2, List.of(DecisionCommand.item(Type.PUT_FORECAST, null, forecast,
                new DecisionForecastInput(null, "Outra coisa?", 90, LocalDate.of(2027, 3, 1), null))), CTX)).status()).isEqualTo(403);
        DecisionView resolved = service.apply(cu(owner), id, ver2, List.of(DecisionCommand.item(Type.PUT_FORECAST, null, forecast,
                new DecisionForecastInput(null, null, null, null, ForecastResolution.OCORREU))), CTX);
        assertThat(resolved.forecasts().get(0).resolution()).isEqualTo(ForecastResolution.OCORREU);
        assertThat(resolved.forecasts().get(0).resolvedAt()).isEqualTo(NOW);
        assertThat(api(() -> service.apply(cu(owner), id, resolved.decision().version(), List.of(DecisionCommand.item(Type.PUT_FORECAST, null,
                forecast, new DecisionForecastInput(null, null, null, null, ForecastResolution.ANULADA))), CTX)).code())
                .isEqualTo("DECISAO_PREVISAO_JA_RESOLVIDA");
        assertThat(api(() -> service.apply(cu(contributor), id, resolved.decision().version(), List.of(DecisionCommand.item(Type.PUT_CHECKPOINT, null,
                null, new DecisionCheckpointInput(NOW, null, null, null, null, null, null, null, null))), CTX)).status()).isEqualTo(403);
    }

    @Test
    void vinculoDeTrabalhoExigeAlvoVisivelEListaPorAlvo() {
        User owner = person(company);
        User other = person(UUID.randomUUID());
        UUID visibleTask = UUID.randomUUID();
        UUID hiddenTask = UUID.randomUUID();
        repo.targets.put(visibleTask, new ScopedResource(ScopedResource.Kind.TASK, visibleTask, owner.getId(), company, dept, Visibility.PRIVADA,
                AccessClassification.INTERNO, Set.of()));
        repo.targets.put(hiddenTask, new ScopedResource(ScopedResource.Kind.TASK, hiddenTask, other.getId(), other.getCompanyId(), null,
                Visibility.PRIVADA, AccessClassification.INTERNO, Set.of()));
        DecisionView v = fresh(owner);
        UUID id = v.decision().id();

        ApiException hidden = api(() -> service.apply(cu(owner), id, v.decision().version(), List.of(DecisionCommand.item(Type.LINK_WORK, null, null,
                new DecisionWorkLinkInput(WorkLinkTarget.TAREFA, hiddenTask))), CTX));
        ApiException missing = api(() -> service.apply(cu(owner), id, v.decision().version(), List.of(DecisionCommand.item(Type.LINK_WORK, null,
                null, new DecisionWorkLinkInput(WorkLinkTarget.TAREFA, UUID.randomUUID()))), CTX));
        assertThat(hidden.status()).isEqualTo(422);
        assertThat(hidden.details()).isEqualTo(missing.details());

        DecisionView linked = service.apply(cu(owner), id, v.decision().version(), List.of(
                DecisionCommand.item(Type.LINK_WORK, null, null, new DecisionWorkLinkInput(WorkLinkTarget.TAREFA, visibleTask)),
                DecisionCommand.item(Type.LINK_WORK, null, null, new DecisionWorkLinkInput(WorkLinkTarget.TAREFA, visibleTask))), CTX);
        assertThat(linked.workLinks()).singleElement().satisfies(l -> {
            assertThat(l.targetId()).isEqualTo(visibleTask);
            assertThat(l.createdByUserId()).isEqualTo(owner.getId());
        });
        assertThat(linked.events()).extracting(DecisionView.DecisionEventView::type).contains(DecisionEventType.TRABALHO_VINCULADO);
        assertThat(service.listLinked(cu(owner), WorkLinkTarget.TAREFA, visibleTask, 20)).extracting(x -> x.decision().id()).containsExactly(id);
        // quem não vê a tarefa recebe lista vazia (sem dizer se a tarefa existe)
        assertThat(service.listLinked(cu(other), WorkLinkTarget.TAREFA, visibleTask, 20)).isEmpty();

        DecisionView unlinked = service.apply(cu(owner), id, linked.decision().version(), List.of(DecisionCommand.item(Type.UNLINK_WORK, null,
                linked.workLinks().get(0).id().toString(), null)), CTX);
        assertThat(unlinked.workLinks()).isEmpty();
        assertThat(service.listLinked(cu(owner), WorkLinkTarget.TAREFA, visibleTask, 20)).isEmpty();
    }

    @Test
    void criacaoComProjetoVisivelGravaProjetoEVinculo() {
        User owner = person(company);
        UUID project = UUID.randomUUID();
        repo.targets.put(project, new ScopedResource(ScopedResource.Kind.PROJECT, project, owner.getId(), company, dept, Visibility.EMPRESA,
                AccessClassification.INTERNO, Set.of()));
        DecisionView v = service.create(cu(owner), new NewDecision("Aprovar a saída da fase do projeto?", DecisionComplexity.PADRAO,
                DecisionLevel.ALTO, null, null, "portao", null, List.of(), project), CTX);
        assertThat(v.decision().projectId()).isEqualTo(project);
        assertThat(v.workLinks()).singleElement().satisfies(l -> assertThat(l.targetType()).isEqualTo(WorkLinkTarget.PROJETO));
        ApiException unknown = api(() -> service.create(cu(owner), new NewDecision("Aprovar a saída da fase do projeto?", DecisionComplexity.PADRAO,
                DecisionLevel.ALTO, null, null, null, null, List.of(), UUID.randomUUID()), CTX));
        assertThat(unknown.details().get("fields")).asString().contains("projectId");
    }

    @Test
    void retrospectivaDepoisDoResultado() {
        User me = person(company);
        DecisionView v = fresh(me);
        UUID id = v.decision().id();
        DecisionView alt = service.apply(cu(me), id, v.decision().version(), List.of(DecisionCommand.addAlternative("a", "Sim", false),
                DecisionCommand.addAlternative("b", "Não", true)), CTX);
        DecisionView done = service.apply(cu(me), id, alt.decision().version(), List.of(
                DecisionCommand.decide(alt.alternatives().get(0).id().toString(), "Motivo suficiente aqui.", null, true),
                DecisionCommand.recordOutcome(OutcomeResult.PARCIAL, "Entregue com atraso.")), CTX);
        DecisionView reviewed = service.apply(cu(me), id, done.decision().version(), List.of(DecisionCommand.item(Type.PUT_RETROSPECTIVE, null, null,
                retro())), CTX);
        assertThat(reviewed.retrospective()).isNotNull();
        assertThat(reviewed.retrospective().processQuality()).isEqualTo(ProcessQuality.PARCIAL);
        assertThat(reviewed.retrospective().shareAsLesson()).isTrue();
        assertThat(reviewed.retrospective().reviewedByUserId()).isEqualTo(me.getId());
        assertThat(reviewed.events()).extracting(DecisionView.DecisionEventView::type).contains(DecisionEventType.REVISAO_CONCLUIDA);
        // depois de decidir, premissas e riscos continuam editáveis (EDIT_STRUCTURE), a matriz não
        DecisionView risk = service.apply(cu(me), id, reviewed.decision().version(), List.of(DecisionCommand.item(Type.PUT_RISK, null, null,
                new DecisionRiskInput("Reincidência", null, null, Likelihood.POSSIVEL, DecisionLevel.BAIXO, null, null, null, null))), CTX);
        assertThat(risk.risks()).hasSize(1);
        assertThat(risk.permissions().editStructure()).isFalse();
        assertThat(risk.permissions().editRecords()).isTrue();
    }
}
