package br.gov.pr.secid.workstation.infrastructure.mysql.acervo;

import br.gov.pr.secid.workstation.application.acervo.EvidenceRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.EvidenceRepositoryPort.StoredEvidence;
import br.gov.pr.secid.workstation.application.acervo.LegalDeadlineRuleRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentRepositoryPort.TitledAttachment;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.StoredTask;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.TaskIndexRow;
import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.media.MediaObjectRepositoryPort;
import br.gov.pr.secid.workstation.domain.acervo.AntivirusStatus;
import br.gov.pr.secid.workstation.domain.acervo.Evidence;
import br.gov.pr.secid.workstation.domain.acervo.LegalDeadlineCalendar;
import br.gov.pr.secid.workstation.domain.acervo.LegalDeadlineRule;
import br.gov.pr.secid.workstation.domain.acervo.OcrStatus;
import br.gov.pr.secid.workstation.domain.acervo.StudioStatus;
import br.gov.pr.secid.workstation.domain.acervo.TaskAttachment;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.infrastructure.mysql.identity.JpaIdentityAdapters;
import br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.JpaMediaAdapters;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.ByteBuffer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Acervo (RF41.CA04/CA06/CA09) contra MySQL 8.4 real: regras padrão da V69, índice leve do Acervo, prazo legal gravado na tarefa, anexos
 * (lista, dono, contagem por mídia, remoção) e evidências com a geolocalização cifrada no banco. Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = AcervoAdaptersIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class AcervoAdaptersIT {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class, JpaAcervoAdapters.class,
            JpaMediaAdapters.class})
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
    TaskAttachmentRepositoryPort attachments;
    @Autowired
    EvidenceRepositoryPort evidences;
    @Autowired
    LegalDeadlineRuleRepositoryPort rules;
    @Autowired
    MediaObjectRepositoryPort media;
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

    private MediaObject mediaOf(User u, String sha) {
        return media.save(new MediaObject(UUID.randomUUID(), u.getId(), "ws-media", "private/" + u.getId() + "/" + sha + ".png", "image/png", 10,
                sha, MediaAccessClass.PRIVATE, null));
    }

    @Test
    void regrasPadraoDaV69ComBaseLegalEContagem() {
        List<LegalDeadlineRule> defaults = rules.findActive(null);
        assertThat(defaults).hasSize(10).allSatisfy(r -> {
            assertThat(r.companyId()).isNull();
            assertThat(r.legalBasis()).matches("Lei nº (12\\.527/2011|9\\.784/1999).*");
            assertThat(r.days()).isBetween(1, LegalDeadlineCalendar.MAX_DAYS);
        });
        LegalDeadlineRule lai = rules.findById(UUID.fromString("6c0e0069-0000-4000-8000-000000000001")).orElseThrow();
        assertThat(lai).extracting(LegalDeadlineRule::days, LegalDeadlineRule::businessDays, LegalDeadlineRule::category)
                .containsExactly(20, false, TaskCategory.OFICIO_MEMORANDO);
        assertThat(lai.legalBasis()).contains("art. 11");
        assertThat(defaults).filteredOn(LegalDeadlineRule::businessDays).singleElement()
                .satisfies(r -> assertThat(r.legalBasis()).isEqualTo("Lei nº 9.784/1999, art. 62"));
        assertThat(rules.findActive(UUID.randomUUID())).hasSize(10);
    }

    @Test
    void indicePrazoLegalAnexosEEvidenciasCifradas() {
        User u = owner("acervo.it");
        TaskItem draft = TaskItem.create(u.getId(), null, "Responder pedido LAI", null, TaskType.DOCUMENTO, TaskCategory.OFICIO_MEMORANDO,
                Priority.ALTA, LocalDate.of(2026, 11, 20), null, AccessClassification.INTERNO, Visibility.PRIVADA);
        StoredTask created = tasks.insert(draft, null);
        UUID lai = UUID.fromString("6c0e0069-0000-4000-8000-000000000001");
        LocalDate start = LocalDate.of(2026, 11, 12);
        StoredTask legal = tasks.update(created.task().withLegalDeadline(lai, start, LegalDeadlineCalendar.dueDate(start, 20, false)), created.brief(),
                created.version());
        assertThat(tasks.findById(legal.task().id()).orElseThrow().task().legalDueAt()).isEqualTo(LocalDate.of(2026, 12, 2));

        List<TaskIndexRow> index = tasks.indexByOwner(u.getId(), 10);
        assertThat(index).singleElement().satisfies(r -> {
            assertThat(r.title()).isEqualTo("Responder pedido LAI");
            assertThat(r.priority()).isEqualTo(Priority.ALTA);
            assertThat(r.category()).isEqualTo(TaskCategory.OFICIO_MEMORANDO);
            assertThat(r.legalDueAt()).isEqualTo(LocalDate.of(2026, 12, 2));
            assertThat(r.dueAt()).isEqualTo(LocalDate.of(2026, 11, 20));
            assertThat(r.updatedAt()).isNotNull();
        });
        assertThat(tasks.findAllById(List.of(legal.task().id(), UUID.randomUUID()))).extracting(s -> s.task().title())
                .containsExactly("Responder pedido LAI");

        UUID taskId = legal.task().id();
        MediaObject m = mediaOf(u, "a".repeat(64));
        TaskAttachment a = attachments.insert(new TaskAttachment(null, taskId, m.id(), "planta.png", "image/png", 10, m.sha256(),
                AntivirusStatus.PENDENTE, OcrStatus.PENDENTE, null, true, 0));
        assertThat(attachments.listByTask(taskId)).singleElement().satisfies(s -> assertThat(s.createdAt()).isNotNull());
        assertThat(attachments.findById(a.id())).isPresent();
        assertThat(attachments.countByMedia(m.id())).isEqualTo(1);
        assertThat(attachments.listByTaskOwner(u.getId(), 10)).extracting(TitledAttachment::taskTitle).containsExactly("Responder pedido LAI");
        assertThat(attachments.listByTaskOwner(UUID.randomUUID(), 10)).isEmpty();

        StoredEvidence e = evidences.insert(new Evidence(null, u.getId(), m.id(), Instant.parse("2026-11-12T13:15:00Z"), "-25.4284", "-49.2733",
                "Fissura", taskId, null, StudioStatus.ORIGINAL, null));
        String rawLatitude = jdbc.queryForObject("SELECT latitude_enc FROM evidences WHERE id = ?", String.class, (Object) bytes(e.evidence().id()));
        assertThat(rawLatitude).isNotBlank().doesNotContain("25.4284");
        assertThat(evidences.findByTask(taskId)).singleElement().satisfies(s -> {
            assertThat(s.evidence().latitude()).isEqualTo("-25.4284");
            assertThat(s.evidence().longitude()).isEqualTo("-49.2733");
            assertThat(s.evidence().caption()).isEqualTo("Fissura");
        });
        assertThat(evidences.findByTasks(List.of(taskId))).hasSize(1);
        assertThat(evidences.countByMedia(m.id())).isEqualTo(1);

        evidences.delete(e.evidence().id());
        attachments.delete(a.id());
        assertThat(evidences.countByMedia(m.id())).isZero();
        assertThat(attachments.countByMedia(m.id())).isZero();
        media.delete(m.id());
        assertThat(media.findById(m.id())).isEmpty();
    }

    private static byte[] bytes(UUID id) {
        return ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits()).array();
    }
}
