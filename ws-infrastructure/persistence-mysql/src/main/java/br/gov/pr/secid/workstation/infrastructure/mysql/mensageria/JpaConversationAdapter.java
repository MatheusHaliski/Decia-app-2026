package br.gov.pr.secid.workstation.infrastructure.mysql.mensageria;

import br.gov.pr.secid.workstation.application.messaging.ConversationRepositoryPort;
import br.gov.pr.secid.workstation.application.messaging.ConversationRepositoryPort.StoredConversation;
import br.gov.pr.secid.workstation.application.messaging.ConversationRepositoryPort.UnreadTotals;
import br.gov.pr.secid.workstation.domain.mensageria.ConversationKind;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversation;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversationParticipant;
import br.gov.pr.secid.workstation.domain.mensageria.DirectMessageRecord;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity.DirectConversationEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity.DirectConversationPairEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity.DirectConversationParticipantEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity.DirectMessageRecordEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.repository.DirectConversationRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.nio.ByteBuffer;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Adaptador JPA da {@link ConversationRepositoryPort} (RF46): conversas e participantes da V20, mensagens e par 1:1 da V59. Consultas por
 * JPQL com {@code getResultList} (nunca stream fora de transação); duas operações nativas do MySQL: o carimbo da próxima mensagem sob a
 * trava da linha da conversa ({@code UPDATE … CASE}) e o registro do par com {@code INSERT IGNORE} (perde a corrida sem erro).
 */
@Configuration
public class JpaConversationAdapter {

    @Bean
    ConversationRepositoryPort conversationRepositoryPort(DirectConversationRepository conversations, EntityManager em) {
        return new ConversationRepositoryPort() {
            // ---------------------------------------------------------------------------------------- conversas

            @Override
            @Transactional
            public StoredConversation create(UUID companyId, ConversationKind kind, String title, UUID createdBy, List<UUID> participantIds,
                                             Instant at) {
                DirectConversationEntity c = new DirectConversationEntity();
                c.setCompanyId(companyId);
                c.setKind(kind);
                c.setTitle(title);
                c.setCreatedBy(createdBy);
                DirectConversationEntity saved = conversations.saveAndFlush(c);
                for (UUID userId : participantIds) {
                    DirectConversationParticipantEntity p = new DirectConversationParticipantEntity();
                    p.setId(UUID.randomUUID());
                    p.setConversationId(saved.getId());
                    p.setUserId(userId);
                    p.setJoinedAt(at);
                    em.persist(p);
                }
                em.flush();
                return stored(saved);
            }

            @Override
            public Optional<StoredConversation> findById(UUID id) {
                return conversations.findById(id).map(JpaConversationAdapter::stored);
            }

            @Override
            @Transactional
            public void delete(UUID id) {
                em.flush();
                em.createQuery("delete from DirectConversationEntity c where c.id = :id").setParameter("id", id).executeUpdate();
            }

            @Override
            @Transactional
            public Optional<UUID> pairConversation(String pairKey, boolean latest) {
                var q = em.createQuery("select p from DirectConversationPairEntity p where p.pairKey = :k", DirectConversationPairEntity.class)
                        .setParameter("k", pairKey);
                if (latest) {
                    q.setLockMode(LockModeType.PESSIMISTIC_READ);
                }
                return q.getResultList().stream().findFirst().map(DirectConversationPairEntity::getConversationId);
            }

            @Override
            @Transactional
            public boolean claimPair(String pairKey, UUID conversationId) {
                em.flush();
                return em.createNativeQuery("insert ignore into direct_conversation_pairs (pair_key, conversation_id) values (:k, :c)")
                        .setParameter("k", pairKey).setParameter("c", bytes(conversationId)).executeUpdate() == 1;
            }

            @Override
            @Transactional
            public Instant reserveSentAt(UUID conversationId, Instant now) {
                em.createNativeQuery("update direct_conversations set last_message_at = case "
                                + "when last_message_at is null or last_message_at < :now then :now "
                                + "else last_message_at + interval 1 microsecond end where id = :id")
                        .setParameter("now", now).setParameter("id", bytes(conversationId)).executeUpdate();
                return em.createQuery("select c.lastMessageAt from DirectConversationEntity c where c.id = :id", Instant.class)
                        .setParameter("id", conversationId).getSingleResult();
            }

            @Override
            public List<StoredConversation> activeOf(UUID userId, int limit) {
                return em.createQuery("select c from DirectConversationEntity c where c.id in (select p.conversationId from "
                                + "DirectConversationParticipantEntity p where p.userId = :u and p.leftAt is null) "
                                + "order by coalesce(c.lastMessageAt, c.createdAt) desc, c.id desc", DirectConversationEntity.class)
                        .setParameter("u", userId).setMaxResults(limit).getResultList().stream().map(JpaConversationAdapter::stored).toList();
            }

            // ---------------------------------------------------------------------------------------- participantes

            @Override
            public List<DirectConversationParticipant> participants(Collection<UUID> conversationIds) {
                if (conversationIds.isEmpty()) {
                    return List.of();
                }
                return em.createQuery("select p from DirectConversationParticipantEntity p where p.conversationId in :ids",
                                DirectConversationParticipantEntity.class)
                        .setParameter("ids", conversationIds).getResultList().stream().map(JpaConversationAdapter::participant).toList();
            }

            @Override
            public Optional<DirectConversationParticipant> participant(UUID conversationId, UUID userId) {
                return em.createQuery("select p from DirectConversationParticipantEntity p where p.conversationId = :c and p.userId = :u",
                                DirectConversationParticipantEntity.class)
                        .setParameter("c", conversationId).setParameter("u", userId).setMaxResults(1).getResultList().stream().findFirst()
                        .map(JpaConversationAdapter::participant);
            }

            @Override
            @Transactional
            public void saveParticipant(DirectConversationParticipant p) {
                DirectConversationParticipantEntity e = em.find(DirectConversationParticipantEntity.class, p.id());
                if (e == null) {
                    return;
                }
                e.setLastReadAt(p.lastReadAt());
                e.setLeftAt(p.leftAt());
                em.flush();
            }

            // ---------------------------------------------------------------------------------------- mensagens

            @Override
            @Transactional
            public void insertMessage(DirectMessageRecord m) {
                DirectMessageRecordEntity e = new DirectMessageRecordEntity();
                e.setId(m.id());
                copy(m, e);
                em.persist(e);
                em.flush();
            }

            @Override
            public Optional<DirectMessageRecord> findMessage(UUID id) {
                return Optional.ofNullable(em.find(DirectMessageRecordEntity.class, id)).map(JpaConversationAdapter::message);
            }

            @Override
            @Transactional
            public void updateMessage(DirectMessageRecord m) {
                DirectMessageRecordEntity e = em.find(DirectMessageRecordEntity.class, m.id());
                if (e == null) {
                    return;
                }
                copy(m, e);
                em.flush();
            }

            @Override
            public List<DirectMessageRecord> page(UUID conversationId, Instant before, int limit) {
                String where = before == null ? "" : " and m.sentAt < :before";
                var q = em.createQuery("select m from DirectMessageRecordEntity m where m.conversationId = :c" + where
                        + " order by m.sentAt desc", DirectMessageRecordEntity.class).setParameter("c", conversationId);
                if (before != null) {
                    q.setParameter("before", before);
                }
                return q.setMaxResults(limit).getResultList().stream().map(JpaConversationAdapter::message).toList();
            }

            @Override
            public List<DirectMessageRecord> changedSince(UUID conversationId, Instant since, int limit) {
                return em.createQuery("select m from DirectMessageRecordEntity m where m.conversationId = :c and m.changedAt > :since "
                                + "order by m.changedAt asc, m.sentAt asc", DirectMessageRecordEntity.class)
                        .setParameter("c", conversationId).setParameter("since", since).setMaxResults(limit).getResultList().stream()
                        .map(JpaConversationAdapter::message).toList();
            }

            @Override
            public Map<UUID, DirectMessageRecord> lastMessages(Collection<UUID> conversationIds) {
                Map<UUID, DirectMessageRecord> out = new HashMap<>();
                if (conversationIds.isEmpty()) {
                    return out;
                }
                em.createQuery("select m from DirectMessageRecordEntity m where m.conversationId in :ids and m.sentAt = "
                                + "(select max(m2.sentAt) from DirectMessageRecordEntity m2 where m2.conversationId = m.conversationId)",
                                DirectMessageRecordEntity.class)
                        .setParameter("ids", conversationIds).getResultList()
                        .forEach(e -> out.put(e.getConversationId(), message(e)));
                return out;
            }

            @Override
            public Map<UUID, Long> unreadCounts(UUID userId, Collection<UUID> conversationIds) {
                Map<UUID, Long> out = new HashMap<>();
                if (conversationIds.isEmpty()) {
                    return out;
                }
                em.createQuery("select m.conversationId, count(m) " + UNREAD + " and m.conversationId in :ids group by m.conversationId",
                                Object[].class)
                        .setParameter("u", userId).setParameter("ids", conversationIds).getResultList()
                        .forEach(r -> out.put((UUID) r[0], ((Number) r[1]).longValue()));
                return out;
            }

            @Override
            public UnreadTotals unreadTotals(UUID userId) {
                Object[] r = em.createQuery("select count(distinct m.conversationId), count(m) " + UNREAD, Object[].class)
                        .setParameter("u", userId).getSingleResult();
                return new UnreadTotals(((Number) r[0]).longValue(), ((Number) r[1]).longValue());
            }

            // ---------------------------------------------------------------------------------------- notificações agrupadas

            @Override
            public boolean hasUnreadMessageNotification(UUID recipientId, UUID actorId, String groupKey) {
                return em.createQuery("select count(n) from NotificationEntity n where n.recipientId = :r and n.actorId = :a and n.type = :t "
                                + "and n.groupKey = :g and n.isRead = false", Long.class)
                        .setParameter("r", recipientId).setParameter("a", actorId).setParameter("t", NotificationType.MENSAGEM_DIRETA)
                        .setParameter("g", groupKey).getSingleResult() > 0;
            }

            @Override
            @Transactional
            public int markMessageNotificationsRead(UUID recipientId, String groupKey, Instant at) {
                return em.createQuery("update NotificationEntity n set n.isRead = true, n.readAt = :at where n.recipientId = :r and n.type = :t "
                                + "and n.groupKey = :g and n.isRead = false")
                        .setParameter("at", at).setParameter("r", recipientId).setParameter("t", NotificationType.MENSAGEM_DIRETA)
                        .setParameter("g", groupKey).executeUpdate();
            }

            // ---------------------------------------------------------------------------------------- anonimização

            @Override
            @Transactional
            public int eraseMessagesOf(UUID authorId, Instant at) {
                em.flush();
                return em.createQuery("update DirectMessageRecordEntity m set m.bodyEnc = null, m.deletedAt = :at, m.changedAt = :at "
                                + "where m.authorId = :u and m.deletedAt is null")
                        .setParameter("at", at).setParameter("u", authorId).executeUpdate();
            }

            @Override
            @Transactional
            public int leaveAll(UUID userId, Instant at) {
                em.flush();
                return em.createQuery("update DirectConversationParticipantEntity p set p.leftAt = :at where p.userId = :u and p.leftAt is null")
                        .setParameter("at", at).setParameter("u", userId).executeUpdate();
            }
        };
    }

    /** Não lidas: de outra pessoa, não apagadas, depois da última leitura (ou da entrada), em conversa da qual a pessoa não saiu. */
    private static final String UNREAD = "from DirectMessageRecordEntity m, DirectConversationParticipantEntity p "
            + "where p.conversationId = m.conversationId and p.userId = :u and p.leftAt is null and m.authorId <> :u and m.deletedAt is null "
            + "and m.sentAt > coalesce(p.lastReadAt, p.joinedAt)";

    static StoredConversation stored(DirectConversationEntity e) {
        return new StoredConversation(new DirectConversation(e.getId(), e.getCompanyId(), e.getKind(), e.getTitle(), e.getCreatedBy(),
                e.getLastMessageAt(), e.getMessagingTtlDays()), e.getCreatedAt());
    }

    static DirectConversationParticipant participant(DirectConversationParticipantEntity e) {
        return new DirectConversationParticipant(e.getId(), e.getConversationId(), e.getUserId(), e.getJoinedAt(), e.getLeftAt(), e.getLastReadAt());
    }

    static DirectMessageRecord message(DirectMessageRecordEntity e) {
        return new DirectMessageRecord(e.getId(), e.getConversationId(), e.getAuthorId(), e.getBodyEnc(), e.getSentAt(), e.getEditedAt(),
                e.getDeletedAt(), e.getChangedAt());
    }

    static void copy(DirectMessageRecord m, DirectMessageRecordEntity e) {
        e.setConversationId(m.conversationId());
        e.setAuthorId(m.authorId());
        e.setBodyEnc(m.body());
        e.setSentAt(m.sentAt());
        e.setEditedAt(m.editedAt());
        e.setDeletedAt(m.deletedAt());
        e.setChangedAt(m.changedAt());
    }

    /** UUID como os 16 bytes do BINARY(16) (mesma ordem do mapeamento do Hibernate), para as consultas nativas. */
    static byte[] bytes(UUID id) {
        return ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits()).array();
    }
}
