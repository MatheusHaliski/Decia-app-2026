package br.gov.pr.secid.workstation.application.notifications;

import br.gov.pr.secid.workstation.domain.social.Notification;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Acesso a {@code notifications} (RF27, central e sino); adaptador JPA em persistence-mysql. */
public interface NotificationRepositoryPort {

    /** Notificação persistida com o carimbo de criação do banco. */
    record StoredNotification(Notification notification, Instant createdAt) {
    }

    void insert(Notification notification, Instant createdAt);

    Optional<StoredNotification> findById(UUID id);

    /** Do destinatário, mais recentes primeiro. */
    List<StoredNotification> findByRecipient(UUID recipientId, int limit);

    long countUnread(UUID recipientId);

    /** Marca como lida só se for do destinatário e ainda não lida; devolve se mudou. */
    boolean markRead(UUID recipientId, UUID id, Instant at);

    /** Marca todas as não lidas do destinatário; devolve quantas mudaram. */
    int markAllRead(UUID recipientId, Instant at);
}
