package br.gov.pr.secid.workstation.infrastructure.mysql.decisao;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand;
import br.gov.pr.secid.workstation.application.decisao.DecisionService;
import br.gov.pr.secid.workstation.application.decisao.DecisionService.NewDecision;
import br.gov.pr.secid.workstation.application.decisao.DecisionView;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.common.Visibility;
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
import br.gov.pr.secid.workstation.domain.decisao.CheckpointAction;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointStatus;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEventType;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceNature;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceStance;
import br.gov.pr.secid.workstation.domain.decisao.ForecastResolution;
import br.gov.pr.secid.workstation.domain.decisao.Likelihood;
import br.gov.pr.secid.workstation.domain.decisao.OutcomeResult;
import br.gov.pr.secid.workstation.domain.decisao.ProcessQuality;
import br.gov.pr.secid.workstation.domain.decisao.RecommendationSource;
import br.gov.pr.secid.workstation.domain.decisao.RecommendationStatus;
import br.gov.pr.secid.workstation.domain.decisao.ScenarioCase;
import br.gov.pr.secid.workstation.domain.decisao.TriggerStatus;
import br.gov.pr.secid.workstation.domain.decisao.WorkLinkTarget;
import br.gov.pr.secid.workstation.domain.decisao.RelevanceLevel;
import br.gov.pr.secid.workstation.domain.decisao.SnapshotKind;
import br.gov.pr.secid.workstation.domain.decisao.analise.SnapshotCanonicalizer;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.infrastructure.mysql.identity.JpaIdentityAdapters;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.ByteBuffer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * API de decisões (fase 7 do DECIA) contra MySQL 8.4 real, pelo serviço com o adaptador JPA: criar, lote com refs, CHECKs da V22, decidir com
 * snapshot íntegro no banco, versão otimista (cópia antiga recusada), rollback do lote inteiro quando um comando falha, 404 entre empresas,
 * listagem por visibilidade e reabertura com snapshot REABERTURA. Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = DecisionApiPersistenceIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class DecisionApiPersistenceIT {
    static final RequestContext CTX = new RequestContext("127.0.0.1", "it");

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class, JpaDecisionAdapters.class,
            ResourceAuthorizer.class, DecisionService.class})
    static class App {
        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }
    }

    @Container
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4").withDatabaseName("workstation")
            .withUsername("workstation").withPassword("test-only-" + System.nanoTime());

    @Autowired
    DecisionService service;
    @Autowired
    UserRepositoryPort users;
    @Autowired
    EmailHasher emailHasher;
    @Autowired
    JdbcTemplate jdbc;

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    private static byte[] bytes(UUID id) {
        return ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits()).array();
    }

    private User person(String username, UUID company) {
        User u = new User();
        u.setUsername(username);
        u.setFullName("Pessoa " + username);
        u.setEmail(username + "@exemplo.gov.br");
        u.setEmailHash(emailHasher.hash(EmailHasher.normalize(username + "@exemplo.gov.br")));
        u.setPasswordHash("argon2-placeholder-" + UUID.randomUUID());
        u.setProfileType(ProfileType.EMPREGADO);
        u = users.save(u);
        if (company != null) {
            jdbc.update("UPDATE users SET company_id = ? WHERE id = ?", (Object) bytes(company), (Object) bytes(u.getId()));
        }
        return u;
    }

    private UUID company(String slug) {
        User owner = person(slug + ".dono", null);
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO companies (id, owner_user_id, legal_name, slug) VALUES (?, ?, ?, ?)", bytes(id), bytes(owner.getId()),
                "Empresa " + slug, slug);
        return id;
    }

    private static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), Role.USER, UUID.randomUUID());
    }

    @Test
    void criaAplicaLoteDecideEReabreComSnapshotsNoBanco() {
        UUID empresa = company("dec-a");
        User ana = person("dec.ana", empresa);
        User bia = person("dec.bia", empresa);
        User fora = person("dec.fora", company("dec-b"));

        DecisionView v = service.create(cu(ana), new NewDecision("Qual fornecedor de nuvem contratar?", DecisionComplexity.RAPIDA, DecisionLevel.ALTO,
                null, null, "fornecedor", Visibility.EMPRESA, List.of("Custo", "Prazo")), CTX);
        UUID id = v.decision().id();
        assertThat(v.participants()).hasSize(1);
        assertThat(v.criteria()).hasSize(2);
        String custo = v.criteria().get(0).id().toString();

        DecisionView lote = service.apply(cu(ana), id, v.decision().version(), List.of(
                DecisionCommand.addAlternative("a", "Nuvem pública", false),
                DecisionCommand.addAlternative("b", "Não migrar", true),
                DecisionCommand.setWeight(custo, 60.5),
                DecisionCommand.setScore("a", custo, 5),
                DecisionCommand.setScore("b", custo, 2),
                DecisionCommand.addEvidence("Cotação oficial", EvidenceNature.FATO, "Portal", RelevanceLevel.ALTA, "a", EvidenceStance.SUSTENTA)), CTX);
        assertThat(lote.decision().version()).isGreaterThan(v.decision().version());
        assertThat(lote.criteria().get(0).weightPct()).isEqualTo(60.5);
        assertThat(lote.assessments()).hasSize(2);
        assertThat(lote.evidenceLinks()).hasSize(1);

        // a cópia antiga é recusada (409) e não grava nada
        assertThatThrownBy(() -> service.apply(cu(ana), id, v.decision().version(), List.of(DecisionCommand.addAlternative(null, "C", false)), CTX))
                .isInstanceOf(OptimisticLockingFailureException.class);

        // lote com comando inválido no fim: nada do começo fica (rollback)
        int before = jdbc.queryForObject("SELECT COUNT(*) FROM decision_alternatives WHERE decision_id = ?", Integer.class, (Object) bytes(id));
        assertThatThrownBy(() -> service.apply(cu(ana), id, lote.decision().version(), List.of(DecisionCommand.addAlternative(null, "C", false),
                DecisionCommand.setScore("x", custo, 9)), CTX)).isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM decision_alternatives WHERE decision_id = ?", Integer.class, (Object) bytes(id)))
                .isEqualTo(before);

        // BOLA: outra empresa recebe 404; colega da empresa vê (EMPRESA) mas não muda a estrutura (403)
        assertThat(((ApiException) catchThrowable(() -> service.get(cu(fora), id))).status()).isEqualTo(404);
        assertThat(service.list(cu(fora), 50)).isEmpty();
        assertThat(service.list(cu(bia), 50)).extracting(x -> x.decision().id()).contains(id);
        assertThat(((ApiException) catchThrowable(() -> service.apply(cu(bia), id, lote.decision().version(),
                List.of(DecisionCommand.addAlternative(null, "C", false)), CTX))).status()).isEqualTo(403);

        String alt = lote.alternatives().get(0).id().toString();
        DecisionView decided = service.apply(cu(ana), id, lote.decision().version(),
                List.of(DecisionCommand.decide(alt, "Menor custo e evidência oficial.", 75, true)), CTX);
        assertThat(decided.decision().status()).isEqualTo(DecisionLifecycle.DECIDIDA);
        Map<String, Object> row = jdbc.queryForMap("SELECT content_json, content_sha256, kind, version_number FROM decision_snapshots"
                + " WHERE decision_id = ?", (Object) bytes(id));
        assertThat(row.get("kind")).isEqualTo("DECISAO");
        assertThat(SnapshotCanonicalizer.sha256((String) row.get("content_json"))).isEqualTo(row.get("content_sha256"));
        assertThat((String) row.get("content_json")).doesNotContain("Pessoa dec.ana");
        assertThat(decided.events()).extracting(DecisionView.DecisionEventView::type).contains(DecisionEventType.DECISAO_FINALIZADA);
        assertThat(jdbc.queryForObject("SELECT status FROM decisions WHERE id = ?", String.class, (Object) bytes(id))).isEqualTo("DECIDIDA");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE resource_id = ?", Integer.class, id.toString())).isGreaterThanOrEqualTo(3);

        DecisionView reopened = service.apply(cu(ana), id, decided.decision().version(), List.of(DecisionCommand.reopen("Novo preço")), CTX);
        assertThat(reopened.decision().status()).isEqualTo(DecisionLifecycle.REABERTA);
        assertThat(reopened.snapshots()).extracting(DecisionView.DecisionSnapshotView::kind).containsExactly(SnapshotKind.DECISAO, SnapshotKind.REABERTURA);
        // trilha em ordem estável (carimbos crescentes por µs) e sem texto livre no payload
        List<DecisionView.DecisionEventView> events = service.get(cu(ana), id).events();
        assertThat(events.get(0).type()).isEqualTo(DecisionEventType.DECISAO_CRIADA);
        assertThat(events.get(events.size() - 1).type()).isEqualTo(DecisionEventType.ESTADO_ALTERADO);
        assertThat(events).allSatisfy(e -> assertThat(e.payload().toString()).doesNotContain("Novo preço", "Cotação"));
    }

    /**
     * Fase 7b: premissas, riscos, cenários, previsões, recomendações, gatilhos, checkpoints, vínculos e retrospectiva contra as tabelas da V22
     * (CHECKs, JSON, DECIMAL, FK de pessoas) e a listagem por item de trabalho com o acesso real da tarefa e do projeto.
     */
    @Test
    void registrosDaFase7bVoltamDoBancoEVinculosRespeitamOAcessoDoAlvo() {
        UUID empresa = company("dec-c");
        User ana = person("dec7b.ana", empresa);
        User fora = person("dec7b.fora", company("dec-d"));
        UUID task = UUID.randomUUID();
        jdbc.update("INSERT INTO tasks (id, owner_id, title, type, source_kind) VALUES (?, ?, ?, 'TEXTO_MANUAL', 'MANUAL')", bytes(task),
                bytes(ana.getId()), "Levantar preços");
        UUID foreignTask = UUID.randomUUID();
        jdbc.update("INSERT INTO tasks (id, owner_id, title, type, source_kind) VALUES (?, ?, ?, 'TEXTO_MANUAL', 'MANUAL')", bytes(foreignTask),
                bytes(fora.getId()), "Tarefa de outra empresa");
        UUID project = UUID.randomUUID();
        jdbc.update("INSERT INTO project_schemes (id, owner_id, company_id, title, visibility) VALUES (?, ?, ?, ?, 'EMPRESA')", bytes(project),
                bytes(ana.getId()), bytes(empresa), "Portal novo");

        DecisionView v = service.create(cu(ana), new NewDecision("Aprovar a saída da fase do Portal novo?", DecisionComplexity.RAPIDA,
                DecisionLevel.ALTO, null, null, "portao", null, List.of("Custo"), project), CTX);
        UUID id = v.decision().id();
        assertThat(v.decision().projectId()).isEqualTo(project);
        assertThat(v.workLinks()).singleElement().satisfies(l -> assertThat(l.targetType()).isEqualTo(WorkLinkTarget.PROJETO));

        Instant due = Instant.now().plus(30, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MICROS);
        DecisionView lote = service.apply(cu(ana), id, v.decision().version(), List.of(
                DecisionCommand.addAlternative("a", "Avançar", false),
                DecisionCommand.addAlternative("b", "Suspender", true),
                DecisionCommand.item(Type.PUT_ASSUMPTION, "p1", null, new DecisionAssumptionInput("O orçamento sai em janeiro.", DecisionLevel.CRITICO,
                        75, null, ana.getId(), "a", null)),
                DecisionCommand.item(Type.PUT_RISK, null, null, new DecisionRiskInput("Atraso", "Fornecedor único", "a", Likelihood.QUASE_CERTA,
                        DecisionLevel.CRITICO, "Contrato com multa", ana.getId(), null, null)),
                DecisionCommand.item(Type.PUT_SCENARIO, null, null, new DecisionScenarioInput("a", ScenarioCase.PIOR, "Tudo atrasa", Likelihood.RARA,
                        List.of("p1"), "Seis meses de atraso")),
                DecisionCommand.item(Type.PUT_FORECAST, null, null, new DecisionForecastInput(null, "Entra em produção até março?", 70,
                        LocalDate.now().plusMonths(4), null)),
                DecisionCommand.item(Type.PUT_RECOMMENDATION, null, null, new DecisionRecommendationInput("a", RecommendationSource.MODELO,
                        "A lidera.", List.of("Custo menor"), List.of("Pouca evidência"), List.of("p1"), "Um critério só.", "Nova cotação.", null)),
                DecisionCommand.item(Type.PUT_TRIGGER, null, null, new DecisionTriggerInput("Custo acima do teto", "custo_total", ">=", 1234.5678,
                        null)),
                DecisionCommand.item(Type.PUT_CHECKPOINT, null, null, new DecisionCheckpointInput(due, null, null, null, null, null, null, null,
                        null)),
                DecisionCommand.item(Type.LINK_WORK, null, null, new DecisionWorkLinkInput(WorkLinkTarget.TAREFA, task))), CTX);

        DecisionView read = service.get(cu(ana), id);
        assertThat(read.assumptions()).singleElement().satisfies(a -> {
            assertThat(a.confidencePct()).isEqualTo(75);
            assertThat(a.alternativeId()).isEqualTo(lote.alternatives().get(0).id());
        });
        assertThat(read.risks()).singleElement().satisfies(r -> assertThat(r.severity()).isEqualTo(DecisionLevel.CRITICO));
        assertThat(read.scenarios()).singleElement().satisfies(x -> assertThat(x.assumptionIds())
                .containsExactly(read.assumptions().get(0).id().toString()));
        assertThat(read.forecasts()).singleElement().satisfies(f -> assertThat(f.probabilityPct()).isEqualTo(70));
        assertThat(read.recommendations()).singleElement().satisfies(r -> {
            assertThat(r.supporting()).containsExactly("Custo menor");
            assertThat(r.createdAt()).isNotNull();
        });
        assertThat(read.triggers()).singleElement().satisfies(t -> assertThat(t.threshold()).isEqualTo(1234.5678));
        assertThat(read.checkpoints()).singleElement().satisfies(c -> assertThat(c.dueAt()).isEqualTo(due));
        assertThat(read.workLinks()).extracting(DecisionView.DecisionWorkLinkView::targetType)
                .containsExactlyInAnyOrder(WorkLinkTarget.PROJETO, WorkLinkTarget.TAREFA);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM decision_work_links WHERE decision_id = ?", Integer.class, (Object) bytes(id)))
                .isEqualTo(2);

        // listagem por item de trabalho: a dona vê; outra empresa recebe vazio; tarefa de outra empresa não pode ser ligada (422)
        assertThat(service.listLinked(cu(ana), WorkLinkTarget.TAREFA, task, 20)).extracting(x -> x.decision().id()).containsExactly(id);
        assertThat(service.listLinked(cu(fora), WorkLinkTarget.TAREFA, task, 20)).isEmpty();
        assertThat(service.listLinked(cu(ana), WorkLinkTarget.PROJETO, project, 20)).hasSize(1);
        assertThat(((ApiException) catchThrowable(() -> service.apply(cu(ana), id, lote.decision().version(), List.of(DecisionCommand.item(
                Type.LINK_WORK, null, null, new DecisionWorkLinkInput(WorkLinkTarget.TAREFA, foreignTask))), CTX))).status()).isEqualTo(422);

        // resolver, aceitar, concluir checkpoint, disparar gatilho; decidir, resultado e retrospectiva
        String alt = lote.alternatives().get(0).id().toString();
        DecisionView after = service.apply(cu(ana), id, lote.decision().version(), List.of(
                DecisionCommand.item(Type.PUT_FORECAST, null, read.forecasts().get(0).id().toString(), new DecisionForecastInput(null, null, null, null,
                        ForecastResolution.NAO_OCORREU)),
                DecisionCommand.item(Type.PUT_RECOMMENDATION, null, read.recommendations().get(0).id().toString(), new DecisionRecommendationInput(null,
                        null, null, null, null, null, null, null, RecommendationStatus.ACEITA)),
                DecisionCommand.item(Type.PUT_TRIGGER, null, read.triggers().get(0).id().toString(), new DecisionTriggerInput("Custo acima do teto",
                        null, null, null, TriggerStatus.DISPARADO)),
                DecisionCommand.item(Type.PUT_CHECKPOINT, null, read.checkpoints().get(0).id().toString(), new DecisionCheckpointInput(null, null,
                        CheckpointStatus.CONCLUIDO, true, false, true, 80, CheckpointAction.MANTER, null)),
                DecisionCommand.decide(alt, "Critérios de saída atendidos.", 80, true),
                DecisionCommand.recordOutcome(OutcomeResult.SUCESSO, "Fase concluída.")), CTX);
        assertThat(after.forecasts().get(0).resolvedAt()).isNotNull();
        assertThat(after.checkpoints().get(0).completedByUserId()).isEqualTo(ana.getId());
        assertThat(after.triggers().get(0).firedAt()).isNotNull();
        DecisionView reviewed = service.apply(cu(ana), id, after.decision().version(), List.of(DecisionCommand.item(Type.PUT_RETROSPECTIVE, null,
                null, new DecisionRetrospectiveInput("Concluída.", "No prazo.", "Critérios claros.", "Nada relevante.", List.of(
                        read.assumptions().get(0).id().toString()), ProcessQuality.ADEQUADA, "Manter o checklist de saída.", false))), CTX);
        assertThat(reviewed.retrospective().outcomeId()).isNotNull();
        assertThat(reviewed.retrospective().failedAssumptionIds()).hasSize(1);
        // remoções em cascata pelo banco não deixam órfãos; payloads da trilha sem texto livre
        DecisionView cleaned = service.apply(cu(ana), id, reviewed.decision().version(), List.of(
                DecisionCommand.item(Type.REMOVE_TRIGGER, null, read.triggers().get(0).id().toString(), null),
                DecisionCommand.item(Type.UNLINK_WORK, null, read.workLinks().stream().filter(l -> l.targetType() == WorkLinkTarget.TAREFA)
                        .findFirst().orElseThrow().id().toString(), null)), CTX);
        assertThat(cleaned.triggers()).isEmpty();
        assertThat(cleaned.workLinks()).hasSize(1);
        assertThat(cleaned.events()).allSatisfy(e -> assertThat(e.payload().toString()).doesNotContain("orçamento", "Atraso", "Custo acima"));
    }

    private static Throwable catchThrowable(Runnable r) {
        try {
            r.run();
        } catch (RuntimeException e) {
            return e;
        }
        throw new AssertionError("esperava exceção");
    }
}
