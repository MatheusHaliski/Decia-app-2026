package br.gov.pr.secid.workstation.infrastructure.mysql.social;

import br.gov.pr.secid.workstation.application.notifications.NotificationRepositoryPort;
import br.gov.pr.secid.workstation.application.notifications.NotificationRepositoryPort.StoredNotification;
import br.gov.pr.secid.workstation.domain.social.Notification;
import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.NotificationEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.social.repository.NotificationRepository;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Adaptador JPA da {@link NotificationRepositoryPort} ({@code notifications}, RF27); marcações em lote por JPQL, sempre presas ao destinatário. */
@Configuration
public class JpaNotificationAdapter {

    @Bean
    NotificationRepositoryPort notificationRepositoryPort(NotificationRepository repo, EntityManager em) {
        return new NotificationRepositoryPort() {
            @Override
            @Transactional
            public void insert(Notification n, Instant createdAt) {
                NotificationEntity e = new NotificationEntity();
                e.setId(n.id());
                e.setRecipientId(n.recipientId());
                e.setActorId(n.actorId());
                e.setType(n.type());
                e.setCategory(n.category());
                e.setResourceType(n.resourceType());
                e.setResourceId(n.resourceId());
                e.setTitle(n.title());
                e.setBody(n.body());
                e.setPayloadJson(n.payloadJson());
                e.setGroupKey(n.groupKey());
                e.setIsRead(n.read());
                e.setReadAt(n.readAt());
                e.setDeliveredChannelsJson(n.deliveredChannels());
                e.setCreatedAt(createdAt);
                repo.save(e);
            }

            @Override
            public Optional<StoredNotification> findById(UUID id) {
                return repo.findById(id).map(JpaNotificationAdapter::stored);
            }

            @Override
            public List<StoredNotification> findByRecipient(UUID recipientId, int limit) {
                return em.createQuery("select n from NotificationEntity n where n.recipientId = :r order by n.createdAt desc, n.id desc",
                                NotificationEntity.class)
                        .setParameter("r", recipientId).setMaxResults(limit).getResultList().stream().map(JpaNotificationAdapter::stored).toList();
            }

            @Override
            public long countUnread(UUID recipientId) {
                return em.createQuery("select count(n) from NotificationEntity n where n.recipientId = :r and n.isRead = false", Long.class)
                        .setParameter("r", recipientId).getSingleResult();
            }

            @Override
            @Transactional
            public boolean markRead(UUID recipientId, UUID id, Instant at) {
                return em.createQuery("update NotificationEntity n set n.isRead = true, n.readAt = :at "
                                + "where n.id = :id and n.recipientId = :r and n.isRead = false")
                        .setParameter("at", at).setParameter("id", id).setParameter("r", recipientId).executeUpdate() > 0;
            }

            @Override
            @Transactional
            public int markAllRead(UUID recipientId, Instant at) {
                return em.createQuery("update NotificationEntity n set n.isRead = true, n.readAt = :at where n.recipientId = :r and n.isRead = false")
                        .setParameter("at", at).setParameter("r", recipientId).executeUpdate();
            }
        };
    }

    static StoredNotification stored(NotificationEntity e) {
        return new StoredNotification(new Notification(e.getId(), e.getRecipientId(), e.getActorId(), e.getType(), e.getCategory(), e.getResourceType(),
                e.getResourceId(), e.getTitle(), e.getBody(), e.getPayloadJson(), e.getGroupKey(), e.isIsRead(), e.getReadAt(),
                e.getDeliveredChannelsJson()), e.getCreatedAt());
    }
}
