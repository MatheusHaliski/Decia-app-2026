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
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEventType;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceNature;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceStance;
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
        assertThat(decided.events()).extracting(DecisionView.Event::type).contains(DecisionEventType.DECISAO_FINALIZADA);
        assertThat(jdbc.queryForObject("SELECT status FROM decisions WHERE id = ?", String.class, (Object) bytes(id))).isEqualTo("DECIDIDA");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE resource_id = ?", Integer.class, id.toString())).isGreaterThanOrEqualTo(3);

        DecisionView reopened = service.apply(cu(ana), id, decided.decision().version(), List.of(DecisionCommand.reopen("Novo preço")), CTX);
        assertThat(reopened.decision().status()).isEqualTo(DecisionLifecycle.REABERTA);
        assertThat(reopened.snapshots()).extracting(DecisionView.Snapshot::kind).containsExactly(SnapshotKind.DECISAO, SnapshotKind.REABERTURA);
        // trilha em ordem estável (carimbos crescentes por µs) e sem texto livre no payload
        List<DecisionView.Event> events = service.get(cu(ana), id).events();
        assertThat(events.get(0).type()).isEqualTo(DecisionEventType.DECISAO_CRIADA);
        assertThat(events.get(events.size() - 1).type()).isEqualTo(DecisionEventType.ESTADO_ALTERADO);
        assertThat(events).allSatisfy(e -> assertThat(e.payload().toString()).doesNotContain("Novo preço", "Cotação"));
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
