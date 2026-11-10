package br.gov.pr.secid.workstation.infrastructure.mysql.connectors;

import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.StoredTask;
import br.gov.pr.secid.workstation.application.connectors.ConnectorAccountRepositoryPort;
import br.gov.pr.secid.workstation.application.connectors.ConnectorOAuthStateRepositoryPort;
import br.gov.pr.secid.workstation.application.connectors.TaskExternalLinkRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.domain.acervo.AntivirusStatus;
import br.gov.pr.secid.workstation.domain.acervo.LinkMode;
import br.gov.pr.secid.workstation.domain.acervo.OcrStatus;
import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskAttachment;
import br.gov.pr.secid.workstation.domain.acervo.TaskBrief;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.connectors.ConnectionStatus;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorAccount;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorOAuthState;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import br.gov.pr.secid.workstation.domain.connectors.TaskExternalLink;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.JpaAcervoAdapters;
import br.gov.pr.secid.workstation.infrastructure.mysql.identity.JpaIdentityAdapters;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.ByteBuffer;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Conectores contra MySQL 8.4 real (V60 + V61): os CHECKs ampliados aceitam os TaskType/SourceKind novos e recusam lixo; conta conectada
 * com e-mail cifrado em repouso e tokens só selados; estado OAuth de uso único (consumo atômico) e limpeza dos vencidos; origem externa
 * da tarefa com SET NULL ao desconectar e CASCADE ao apagar a tarefa; anexo da cópia. Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = ConnectorPersistenceIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class ConnectorPersistenceIT {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class, JpaAcervoAdapters.class,
            JpaConnectorAdapters.class})
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
    ConnectorAccountRepositoryPort accounts;
    @Autowired
    ConnectorOAuthStateRepositoryPort states;
    @Autowired
    TaskExternalLinkRepositoryPort links;
    @Autowired
    TaskRepositoryPort tasks;
    @Autowired
    TaskAttachmentRepositoryPort attachments;
    @Autowired
    UserRepositoryPort users;
    @Autowired
    EmailHasher emailHasher;
    @Autowired
    JdbcTemplate jdbc;

    private User owner(String username) {
        User u = new User();
        u.setUsername(username);
        u.setFullName("Pessoa " + username);
        u.setEmail(username + "@exemplo.gov.br");
        u.setEmailHash(emailHasher.hash(EmailHasher.normalize(username + "@exemplo.gov.br")));
        u.setPasswordHash("argon2-placeholder-" + UUID.randomUUID());
        u.setProfileType(ProfileType.EMPREGADO);
        return users.save(u);
    }

    private static byte[] bin(UUID id) {
        return ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits()).array();
    }

    private StoredTask importedTask(User u, SourceKind kind, TaskType type) {
        TaskItem t = TaskItem.fromSource(u.getId(), null, "Importada", null, type, "gdoc", kind, "https://docs.google.com/document/d/1/edit",
                LinkMode.VINCULADO, AccessClassification.INTERNO, Visibility.PRIVADA);
        return tasks.insert(t, new TaskBrief(null, null, null, null, null, null, null));
    }

    @Test
    void checksAmpliadosAceitamOsValoresNovosERecusamLixo() {
        User u = owner("conector.enum");
        StoredTask s = importedTask(u, SourceKind.GOOGLE_LOOKER_STUDIO, TaskType.ATIVIDADE_CURSO);
        StoredTask reopened = tasks.findById(s.task().id()).orElseThrow();
        assertThat(reopened.task().sourceKind()).isEqualTo(SourceKind.GOOGLE_LOOKER_STUDIO);
        assertThat(reopened.task().type()).isEqualTo(TaskType.ATIVIDADE_CURSO);
        assertThat(reopened.task().linkMode()).isEqualTo(LinkMode.VINCULADO);
        assertThat(reopened.task().sourceRef()).isEqualTo("https://docs.google.com/document/d/1/edit");
        for (SourceKind k : SourceKind.values()) {
            jdbc.update("UPDATE tasks SET source_kind = ? WHERE id = ?", k.name(), bin(s.task().id()));
        }
        for (TaskType t : TaskType.values()) {
            jdbc.update("UPDATE tasks SET type = ? WHERE id = ?", t.name(), bin(s.task().id()));
        }
        // MySQL 3819 (CHECK violado) chega como DataAccessException genérica: o que importa é a constraint que recusou
        assertThatThrownBy(() -> jdbc.update("UPDATE tasks SET source_kind = 'GOOGLE_CONTACTS' WHERE id = ?", bin(s.task().id())))
                .as("contato não vira tarefa").isInstanceOf(DataAccessException.class).hasMessageContaining("ck_tasks_source_kind");
        assertThatThrownBy(() -> jdbc.update("UPDATE tasks SET type = 'QUALQUER' WHERE id = ?", bin(s.task().id())))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("ck_tasks_type");
        String expected = jdbc.queryForObject("SELECT CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()"
                + " AND CONSTRAINT_NAME = 'ck_compliance_items_expected_type'", String.class);
        assertThat(expected).contains("APRESENTACAO", "ATIVIDADE_CURSO");
    }

    @Test
    void contaConectadaGuardaEmailCifradoETokensSoSelados() {
        User u = owner("conector.conta");
        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
        ConnectorAccount saved = accounts.save(ConnectorAccount.connect(u.getId(), ConnectorProvider.GOOGLE, "1098765", "ana@gmail.com",
                Set.of("openid", "https://www.googleapis.com/auth/drive.readonly"), "ctk:v1:aaa:bbb", "ctk:v1:ccc:ddd", now.plusSeconds(3600), now));
        assertThat(saved.id()).isNotNull();
        ConnectorAccount back = accounts.findById(saved.id()).orElseThrow();
        assertThat(back.accountEmail()).isEqualTo("ana@gmail.com");
        assertThat(back.scopes()).containsExactlyInAnyOrder("openid", "https://www.googleapis.com/auth/drive.readonly");
        assertThat(back.accessTokenSealed()).isEqualTo("ctk:v1:aaa:bbb");
        assertThat(back.status()).isEqualTo(ConnectionStatus.ATIVO);
        String rawEmail = jdbc.queryForObject("SELECT account_email_enc FROM connector_accounts WHERE id = ?", String.class, bin(saved.id()));
        assertThat(rawEmail).as("e-mail cifrado em repouso").startsWith("enc:v1:").doesNotContain("ana@");

        assertThat(accounts.findByOwnerAndSubject(u.getId(), ConnectorProvider.GOOGLE, "1098765")).contains(back);
        assertThat(accounts.findByOwnerAndSubject(u.getId(), ConnectorProvider.MICROSOFT, "1098765")).isEmpty();
        ConnectorAccount expired = accounts.save(back.expired("RENOVACAO_RECUSADA"));
        assertThat(accounts.findById(expired.id()).orElseThrow().accessTokenSealed()).isNull();
        assertThat(accounts.findByOwner(u.getId())).singleElement().extracting(ConnectorAccount::status).isEqualTo(ConnectionStatus.EXPIRADO);
        // a mesma conta externa duas vezes para o mesmo dono: a unicidade recusa (o serviço reaproveita a linha)
        assertThatThrownBy(() -> accounts.save(ConnectorAccount.connect(u.getId(), ConnectorProvider.GOOGLE, "1098765", null, null, null, null,
                null, now))).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void estadoOauthEDeUsoUnicoEOsVencidosSaem() {
        User u = owner("conector.estado");
        Instant now = Instant.now();
        String hash = HexFormat.of().formatHex(new byte[32]).replace('0', 'a');
        states.insert(ConnectorOAuthState.issue(u.getId(), ConnectorProvider.MICROSOFT, hash, "ctk:v1:verif", "/tasks/new?importar=conta", now));
        ConnectorOAuthState once = states.consume(hash).orElseThrow();
        assertThat(once.ownerId()).isEqualTo(u.getId());
        assertThat(once.returnTo()).isEqualTo("/tasks/new?importar=conta");
        assertThat(once.codeVerifierSealed()).isEqualTo("ctk:v1:verif");
        assertThat(states.consume(hash)).as("segundo uso do mesmo state").isEmpty();

        String old = "b".repeat(64);
        states.insert(ConnectorOAuthState.issue(u.getId(), ConnectorProvider.GOOGLE, old, "v", null, now.minusSeconds(3600)));
        String fresh = "c".repeat(64);
        states.insert(ConnectorOAuthState.issue(u.getId(), ConnectorProvider.GOOGLE, fresh, "v", null, now));
        assertThat(states.purgeExpired(now)).isEqualTo(1);
        assertThat(states.consume(old)).isEmpty();
        assertThat(states.consume(fresh)).isPresent();
    }

    @Test
    void origemExternaPerdeAContaAoDesconectarESomeComATarefa() {
        User u = owner("conector.link");
        StoredTask s = importedTask(u, SourceKind.MS_WORD, TaskType.DOCUMENTO);
        ConnectorAccount acc = accounts.save(ConnectorAccount.connect(u.getId(), ConnectorProvider.MICROSOFT, "oid-1", null, null, "a", "r",
                Instant.now().plusSeconds(60), Instant.now()));
        links.insert(new TaskExternalLink(s.task().id(), acc.id(), ConnectorProvider.MICROSOFT, "b!Drv-1_x~01ABC", "application/pdf",
                LinkMode.VINCULADO, "\"c:{X},2\"", Instant.now()));
        assertThat(links.findByTask(s.task().id()).orElseThrow().accountId()).isEqualTo(acc.id());

        accounts.delete(acc.id());
        TaskExternalLink orphan = links.findByTask(s.task().id()).orElseThrow();
        assertThat(orphan.accountId()).as("desconectar não apaga o vínculo: só tira a conta").isNull();
        assertThat(orphan.externalId()).isEqualTo("b!Drv-1_x~01ABC");

        jdbc.update("DELETE FROM task_briefs WHERE task_id = ?", bin(s.task().id()));
        jdbc.update("DELETE FROM task_state_log WHERE task_id = ?", bin(s.task().id()));
        jdbc.update("DELETE FROM tasks WHERE id = ?", bin(s.task().id()));
        assertThat(links.findByTask(s.task().id())).isEmpty();
    }

    @Test
    void anexoDaCopiaApontaParaAMidia() {
        User u = owner("conector.anexo");
        StoredTask s = importedTask(u, SourceKind.GOOGLE_DOCS, TaskType.DOCUMENTO);
        UUID media = UUID.randomUUID();
        jdbc.update("INSERT INTO media_objects (id, owner_id, bucket, object_key, mime_type, size_bytes, sha256, access_class) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                bin(media), bin(u.getId()), "ws-media", "private/" + u.getId() + "/ab/" + "a".repeat(64) + ".pdf", "application/pdf", 10,
                "a".repeat(64), MediaAccessClass.PRIVATE.name());
        TaskAttachment saved = attachments.insert(new TaskAttachment(null, s.task().id(), media, "Relatório.pdf", "application/pdf", 10, "a".repeat(64),
                AntivirusStatus.PENDENTE, OcrStatus.PENDENTE, null, true, 0));
        assertThat(saved.id()).isNotNull();
        assertThat(attachments.findByTask(s.task().id())).singleElement().satisfies(a -> {
            assertThat(a.mediaObjectId()).isEqualTo(media);
            assertThat(a.isPrimary()).isTrue();
            assertThat(a.fileName()).isEqualTo("Relatório.pdf");
        });
    }
}
