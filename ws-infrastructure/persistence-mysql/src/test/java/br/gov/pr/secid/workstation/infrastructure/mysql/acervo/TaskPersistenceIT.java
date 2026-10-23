package br.gov.pr.secid.workstation.infrastructure.mysql.acervo;

import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.StoredTask;
import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.domain.acervo.TaskBrief;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskStateLog;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.acervo.WorkArea;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.infrastructure.mysql.identity.JpaIdentityAdapters;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tarefa + briefing (V11 + V36) contra MySQL 8.4 real: salvar, reabrir, editar só o briefing (versão sobe), cópia antiga recusada,
 * trilha de estado e CASCADE do briefing. Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = TaskPersistenceIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class TaskPersistenceIT {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class, JpaAcervoAdapters.class})
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
    TaskRepositoryPort tasks;
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

    private static TaskBrief brief(UUID id, String objective) {
        return new TaskBrief(id, objective, WorkArea.DESIGN, "[{\"text\":\"Peça 1080x1080\"}]", "[{\"text\":\"Aprovada\",\"done\":false}]",
                "[{\"label\":\"Manual\",\"url\":\"https://example.org\"}]", "{\"format\":\"1080x1080\"}");
    }

    @Test
    void salvaReabreEditaOBriefingESobeAVersao() {
        User u = owner("tarefa.it");
        TaskItem draft = TaskItem.create(u.getId(), null, "Peça de campanha", "Descrição", TaskType.IMAGEM_EDITADA, null, Priority.ALTA,
                LocalDate.of(2026, 11, 10), null, AccessClassification.INTERNO, Visibility.EMPRESA);
        StoredTask created = tasks.insert(draft, brief(null, "Divulgar o serviço"));
        UUID id = created.task().id();
        assertThat(id).isNotNull();
        assertThat(created.brief().taskId()).isEqualTo(id);

        StoredTask reopened = tasks.findById(id).orElseThrow();
        assertThat(reopened.task().title()).isEqualTo("Peça de campanha");
        assertThat(reopened.task().state()).isEqualTo(TaskState.RASCUNHO);
        assertThat(reopened.brief().objective()).isEqualTo("Divulgar o serviço");
        assertThat(reopened.brief().extensionsJson()).contains("1080x1080");

        // só o briefing muda: a versão da tarefa sobe mesmo assim (PESSIMISTIC_FORCE_INCREMENT)
        StoredTask edited = tasks.update(reopened.task(), brief(id, "Novo objetivo"), reopened.version());
        assertThat(edited.version()).isGreaterThan(reopened.version());
        assertThat(tasks.findById(id).orElseThrow().brief().objective()).isEqualTo("Novo objetivo");
        // a versão devolvida é a mesma relida depois do commit: o cliente consegue editar de novo com ela
        assertThat(tasks.findById(id).orElseThrow().version()).isEqualTo(edited.version());

        // cópia antiga é recusada sem sobrescrever
        assertThatThrownBy(() -> tasks.update(reopened.task().withDetails("Sobrescrita", null, TaskType.DOCUMENTO, null, Priority.BAIXA,
                null, null, AccessClassification.INTERNO, Visibility.PRIVADA), null, reopened.version()))
                .isInstanceOf(OptimisticLockingFailureException.class);
        assertThat(tasks.findById(id).orElseThrow().task().title()).isEqualTo("Peça de campanha");

        StoredTask available = tasks.update(edited.task().transition(TaskState.DISPONIVEL), edited.brief(), edited.version());
        tasks.appendStateLog(new TaskStateLog(UUID.randomUUID(), id, TaskState.RASCUNHO, TaskState.DISPONIVEL, u.getId(), null, null, null,
                Instant.now()));
        assertThat(available.task().state()).isEqualTo(TaskState.DISPONIVEL);
        assertThat(tasks.findById(id).orElseThrow().version()).isEqualTo(available.version());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM task_state_log WHERE task_id = ?", Integer.class, bytes(id))).isEqualTo(1);
        assertThat(tasks.findByOwner(u.getId(), 10)).extracting(s -> s.task().id()).containsExactly(id);

        jdbc.update("DELETE FROM tasks WHERE id = ?", (Object) bytes(id));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM task_briefs WHERE task_id = ?", Integer.class, bytes(id))).isZero();
    }

    private static byte[] bytes(UUID id) {
        return ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits()).array();
    }
}
