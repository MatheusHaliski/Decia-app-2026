package br.gov.pr.secid.workstation.application.notifications;

import br.gov.pr.secid.workstation.domain.social.Notification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** {@link NotificationRepositoryPort} em memória para os testes de serviço. */
public class MemoryNotifications implements NotificationRepositoryPort {
    public final List<StoredNotification> rows = new ArrayList<>();

    @Override
    public void insert(Notification notification, Instant createdAt) {
        rows.add(new StoredNotification(notification, createdAt));
    }

    @Override
    public Optional<StoredNotification> findById(UUID id) {
        return rows.stream().filter(s -> s.notification().id().equals(id)).findFirst();
    }

    @Override
    public List<StoredNotification> findByRecipient(UUID recipientId, int limit) {
        return rows.stream().filter(s -> s.notification().recipientId().equals(recipientId))
                .sorted(Comparator.comparing(StoredNotification::createdAt).reversed()).limit(limit).toList();
    }

    @Override
    public long countUnread(UUID recipientId) {
        return rows.stream().filter(s -> s.notification().recipientId().equals(recipientId) && !s.notification().read()).count();
    }

    @Override
    public boolean markRead(UUID recipientId, UUID id, Instant at) {
        for (int i = 0; i < rows.size(); i++) {
            Notification n = rows.get(i).notification();
            if (n.id().equals(id) && n.recipientId().equals(recipientId) && !n.read()) {
                rows.set(i, new StoredNotification(read(n, at), rows.get(i).createdAt()));
                return true;
            }
        }
        return false;
    }

    @Override
    public int markAllRead(UUID recipientId, Instant at) {
        int changed = 0;
        for (int i = 0; i < rows.size(); i++) {
            Notification n = rows.get(i).notification();
            if (n.recipientId().equals(recipientId) && !n.read()) {
                rows.set(i, new StoredNotification(read(n, at), rows.get(i).createdAt()));
                changed++;
            }
        }
        return changed;
    }

    public List<Notification> of(UUID recipientId) {
        return rows.stream().map(StoredNotification::notification).filter(n -> n.recipientId().equals(recipientId)).toList();
    }

    private static Notification read(Notification n, Instant at) {
        return new Notification(n.id(), n.recipientId(), n.actorId(), n.type(), n.category(), n.resourceType(), n.resourceId(), n.title(),
                n.body(), n.payloadJson(), n.groupKey(), true, at, n.deliveredChannels());
    }
}
