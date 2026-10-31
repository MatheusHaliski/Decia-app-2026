package br.gov.pr.secid.workstation.infrastructure.mysql.mensageria;

import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.messaging.ConversationRepositoryPort;
import br.gov.pr.secid.workstation.application.messaging.ConversationRepositoryPort.StoredConversation;
import br.gov.pr.secid.workstation.application.messaging.ConversationRepositoryPort.UnreadTotals;
import br.gov.pr.secid.workstation.application.notifications.NotificationRepositoryPort;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.mensageria.ConversationKind;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversationParticipant;
import br.gov.pr.secid.workstation.domain.mensageria.DirectMessageRecord;
import br.gov.pr.secid.workstation.domain.social.Notification;
import br.gov.pr.secid.workstation.domain.social.NotificationCategory;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import br.gov.pr.secid.workstation.infrastructure.mysql.identity.JpaIdentityAdapters;
import br.gov.pr.secid.workstation.infrastructure.mysql.social.JpaNotificationAdapter;
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
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Mensagens diretas (V20 + V59, RF46) contra MySQL 8.4 real: criar conversa e participantes, par 1:1 único (INSERT IGNORE), carimbo
 * crescente sob a trava da conversa, texto cifrado em repouso, cursor, leitura incremental, última mensagem, não lidas por participante,
 * notificações agrupadas, anonimização e CASCADE da conversa. Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = ConversationPersistenceIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class ConversationPersistenceIT {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class, JpaNotificationAdapter.class,
            JpaConversationAdapter.class})
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
    ConversationRepositoryPort repo;
    @Autowired
    NotificationRepositoryPort notifications;
    @Autowired
    UserRepositoryPort users;
    @Autowired
    EmailHasher emailHasher;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    TransactionTemplate tx;

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

    private DirectMessageRecord message(UUID conv, UUID author, String body) {
        Instant at = tx.execute(s -> repo.reserveSentAt(conv, Instant.now().truncatedTo(ChronoUnit.MICROS)));
        DirectMessageRecord m = new DirectMessageRecord(UUID.randomUUID(), conv, author, body, at, null, null, at);
        repo.insertMessage(m);
        return m;
    }

    @Test
    void conversaParUnicoCarimboCrescenteCursorNaoLidasEAnonimizacao() {
        UUID empresa = company("dm-empresa");
        User ana = person("dm.ana", empresa);
        User bruno = person("dm.bruno", empresa);
        User carla = person("dm.carla", empresa);
        Instant t0 = Instant.now().truncatedTo(ChronoUnit.MICROS);

        StoredConversation direta = repo.create(empresa, ConversationKind.DIRETA, null, ana.getId(), List.of(ana.getId(), bruno.getId()), t0);
        UUID conv = direta.conversation().id();
        assertThat(repo.findById(conv)).hasValueSatisfying(c -> {
            assertThat(c.conversation().kind()).isEqualTo(ConversationKind.DIRETA);
            assertThat(c.conversation().companyId()).isEqualTo(empresa);
            assertThat(c.conversation().lastMessageAt()).isNull();
        });
        assertThat(repo.participants(List.of(conv))).extracting(DirectConversationParticipant::userId)
                .containsExactlyInAnyOrder(ana.getId(), bruno.getId());

        // par 1:1: o segundo registro perde sem erro e a leitura com trava devolve o primeiro
        String key = "par-" + ana.getId() + ":" + bruno.getId();
        assertThat(repo.pairConversation(key, false)).isEmpty();
        assertThat(repo.claimPair(key, conv)).isTrue();
        StoredConversation duplicada = repo.create(empresa, ConversationKind.DIRETA, null, bruno.getId(), List.of(bruno.getId(), ana.getId()), t0);
        assertThat(repo.claimPair(key, duplicada.conversation().id())).isFalse();
        repo.delete(duplicada.conversation().id());
        assertThat(repo.findById(duplicada.conversation().id())).as("desfeita com os participantes").isEmpty();
        assertThat(repo.participants(List.of(duplicada.conversation().id()))).isEmpty();
        Optional<UUID> winner = tx.execute(s -> repo.pairConversation(key, true));
        assertThat(winner).contains(conv);

        // carimbo: mesmo "agora" três vezes → três instantes diferentes e crescentes
        Instant same = Instant.now().truncatedTo(ChronoUnit.MICROS);
        Instant a = tx.execute(s -> repo.reserveSentAt(conv, same));
        Instant b = tx.execute(s -> repo.reserveSentAt(conv, same));
        Instant c = tx.execute(s -> repo.reserveSentAt(conv, same.minusSeconds(60)));
        assertThat(a).isEqualTo(same);
        assertThat(b).isEqualTo(same.plus(1, ChronoUnit.MICROS));
        assertThat(c).as("relógio atrasado não volta no tempo").isEqualTo(same.plus(2, ChronoUnit.MICROS));
        assertThat(repo.findById(conv).orElseThrow().conversation().lastMessageAt()).isEqualTo(c);

        DirectMessageRecord m1 = message(conv, ana.getId(), "primeira, sigilosa");
        DirectMessageRecord m2 = message(conv, bruno.getId(), "segunda");
        DirectMessageRecord m3 = message(conv, ana.getId(), "terceira <b>texto</b>");
        String raw = jdbc.queryForObject("SELECT body_enc FROM direct_messages WHERE id = ?", String.class, (Object) bytes(m1.id()));
        assertThat(raw).as("cifrado em repouso").isNotNull().doesNotContain("sigilosa");
        assertThat(repo.findMessage(m1.id())).hasValueSatisfying(m -> assertThat(m.body()).isEqualTo("primeira, sigilosa"));

        // cursor: mais recentes primeiro
        List<DirectMessageRecord> p1 = repo.page(conv, null, 2);
        assertThat(p1).extracting(DirectMessageRecord::id).containsExactly(m3.id(), m2.id());
        assertThat(repo.page(conv, p1.get(1).sentAt(), 2)).extracting(DirectMessageRecord::id).containsExactly(m1.id());
        assertThat(repo.lastMessages(List.of(conv))).containsOnlyKeys(conv).extractingByKey(conv)
                .satisfies(m -> assertThat(m.id()).isEqualTo(m3.id()));

        // não lidas por participante (Bruno: m1 e m3; Ana: m2)
        assertThat(repo.unreadCounts(bruno.getId(), List.of(conv))).isEqualTo(Map.of(conv, 2L));
        assertThat(repo.unreadTotals(ana.getId())).isEqualTo(new UnreadTotals(1, 1));
        DirectConversationParticipant pb = repo.participant(conv, bruno.getId()).orElseThrow();
        repo.saveParticipant(new DirectConversationParticipant(pb.id(), conv, bruno.getId(), pb.joinedAt(), null, m1.sentAt()));
        assertThat(repo.unreadCounts(bruno.getId(), List.of(conv))).isEqualTo(Map.of(conv, 1L));

        // edição e leitura incremental por changedAt
        Instant since = Instant.now().truncatedTo(ChronoUnit.MICROS);
        Instant later = since.plusSeconds(1);
        repo.updateMessage(new DirectMessageRecord(m2.id(), conv, bruno.getId(), "segunda (editada)", m2.sentAt(), later, null, later));
        assertThat(repo.changedSince(conv, since, 10)).singleElement().satisfies(m -> {
            assertThat(m.body()).isEqualTo("segunda (editada)");
            assertThat(m.editedAt()).isEqualTo(later);
        });

        // ordem por atividade: o grupo com a mensagem mais recente vem antes da direta
        StoredConversation grupo = repo.create(empresa, ConversationKind.GRUPO, "Equipe", carla.getId(),
                List.of(carla.getId(), ana.getId(), bruno.getId()), t0);
        message(grupo.conversation().id(), carla.getId(), "oi equipe");
        assertThat(repo.activeOf(ana.getId(), 10)).extracting(s -> s.conversation().id()).containsExactly(grupo.conversation().id(), conv);

        // notificações agrupadas: só a não lida do mesmo remetente e conversa conta
        String group = "conversation:" + conv;
        notifications.insert(new Notification(UUID.randomUUID(), bruno.getId(), ana.getId(), NotificationType.MENSAGEM_DIRETA,
                NotificationCategory.SOCIAL, "conversation", conv, "Nova mensagem direta", null, "{}", group, false, null, null), t0);
        assertThat(repo.hasUnreadMessageNotification(bruno.getId(), ana.getId(), group)).isTrue();
        assertThat(repo.hasUnreadMessageNotification(bruno.getId(), carla.getId(), group)).isFalse();
        assertThat(repo.hasUnreadMessageNotification(ana.getId(), bruno.getId(), group)).isFalse();
        assertThat(repo.markMessageNotificationsRead(bruno.getId(), group, later)).isEqualTo(1);
        assertThat(repo.hasUnreadMessageNotification(bruno.getId(), ana.getId(), group)).isFalse();

        // anonimização da Ana: texto zerado, marca de apagada, fora das conversas; o histórico do Bruno fica
        assertThat(repo.eraseMessagesOf(ana.getId(), later)).isEqualTo(2);
        assertThat(repo.findMessage(m3.id())).hasValueSatisfying(m -> {
            assertThat(m.body()).isNull();
            assertThat(m.deletedAt()).isEqualTo(later);
        });
        assertThat(jdbc.queryForObject("SELECT body_enc FROM direct_messages WHERE id = ?", String.class, (Object) bytes(m1.id()))).isNull();
        assertThat(repo.findMessage(m2.id()).orElseThrow().body()).isEqualTo("segunda (editada)");
        assertThat(repo.leaveAll(ana.getId(), later)).isEqualTo(2);
        assertThat(repo.activeOf(ana.getId(), 10)).isEmpty();
        assertThat(repo.unreadCounts(bruno.getId(), List.of(conv))).as("apagadas não contam").isEmpty();

        // a conversa leva participantes, mensagens e o par junto (CASCADE)
        repo.delete(conv);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM direct_messages WHERE conversation_id = ?", Long.class, (Object) bytes(conv))).isZero();
        assertThat(repo.pairConversation(key, false)).isEmpty();
    }

    private static byte[] bytes(UUID id) {
        return JpaConversationAdapter.bytes(id);
    }
}
