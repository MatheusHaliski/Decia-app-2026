package br.gov.pr.secid.workstation.application.messaging;

import br.gov.pr.secid.workstation.application.notifications.MemoryNotifications;
import br.gov.pr.secid.workstation.application.notifications.NotificationRepositoryPort.StoredNotification;
import br.gov.pr.secid.workstation.domain.mensageria.ConversationKind;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversation;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversationParticipant;
import br.gov.pr.secid.workstation.domain.mensageria.DirectMessageRecord;
import br.gov.pr.secid.workstation.domain.social.Notification;
import br.gov.pr.secid.workstation.domain.social.NotificationType;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * {@link ConversationRepositoryPort} em memória com as mesmas regras do adaptador JPA: par 1:1 único, {@code sentAt} crescente por conversa,
 * participante único por conversa, ordem por atividade. As notificações agrupadas são lidas e marcadas no {@link MemoryNotifications}.
 */
public class MemoryConversations implements ConversationRepositoryPort {
    public final Map<UUID, StoredConversation> conversations = new LinkedHashMap<>();
    public final Map<UUID, DirectConversationParticipant> participants = new LinkedHashMap<>();
    public final Map<UUID, DirectMessageRecord> messages = new LinkedHashMap<>();
    public final Map<String, UUID> pairs = new HashMap<>();
    private final MemoryNotifications notifications;

    public MemoryConversations(MemoryNotifications notifications) {
        this.notifications = notifications;
    }

    @Override
    public StoredConversation create(UUID companyId, ConversationKind kind, String title, UUID createdBy, List<UUID> participantIds, Instant at) {
        UUID id = UUID.randomUUID();
        StoredConversation c = new StoredConversation(new DirectConversation(id, companyId, kind, title, createdBy, null, null), at);
        conversations.put(id, c);
        for (UUID u : participantIds) {
            UUID pid = UUID.randomUUID();
            participants.put(pid, new DirectConversationParticipant(pid, id, u, at, null, null));
        }
        return c;
    }

    @Override
    public Optional<StoredConversation> findById(UUID id) {
        return Optional.ofNullable(conversations.get(id));
    }

    @Override
    public void delete(UUID id) {
        conversations.remove(id);
        participants.values().removeIf(p -> p.conversationId().equals(id));
        messages.values().removeIf(m -> m.conversationId().equals(id));
        pairs.values().removeIf(id::equals);
    }

    @Override
    public Optional<UUID> pairConversation(String pairKey, boolean latest) {
        return Optional.ofNullable(pairs.get(pairKey));
    }

    @Override
    public boolean claimPair(String pairKey, UUID conversationId) {
        return pairs.putIfAbsent(pairKey, conversationId) == null;
    }

    @Override
    public Instant reserveSentAt(UUID conversationId, Instant now) {
        StoredConversation s = conversations.get(conversationId);
        DirectConversation c = s.conversation();
        Instant last = c.lastMessageAt();
        Instant next = last == null || last.isBefore(now) ? now : last.plus(1, ChronoUnit.MICROS);
        conversations.put(conversationId, new StoredConversation(
                new DirectConversation(c.id(), c.companyId(), c.kind(), c.title(), c.createdBy(), next, c.messagingPolicy()), s.createdAt()));
        return next;
    }

    @Override
    public List<StoredConversation> activeOf(UUID userId, int limit) {
        return participants.values().stream().filter(p -> p.userId().equals(userId) && p.leftAt() == null)
                .map(p -> conversations.get(p.conversationId()))
                .sorted(Comparator.comparing(StoredConversation::lastActivityAt).reversed()).limit(limit).toList();
    }

    @Override
    public List<DirectConversationParticipant> participants(Collection<UUID> conversationIds) {
        return participants.values().stream().filter(p -> conversationIds.contains(p.conversationId())).toList();
    }

    @Override
    public Optional<DirectConversationParticipant> participant(UUID conversationId, UUID userId) {
        return participants.values().stream().filter(p -> p.conversationId().equals(conversationId) && p.userId().equals(userId)).findFirst();
    }

    @Override
    public void saveParticipant(DirectConversationParticipant participant) {
        participants.put(participant.id(), participant);
    }

    @Override
    public void insertMessage(DirectMessageRecord message) {
        messages.put(message.id(), message);
    }

    @Override
    public Optional<DirectMessageRecord> findMessage(UUID id) {
        return Optional.ofNullable(messages.get(id));
    }

    @Override
    public void updateMessage(DirectMessageRecord message) {
        messages.put(message.id(), message);
    }

    @Override
    public List<DirectMessageRecord> page(UUID conversationId, Instant before, int limit) {
        return messages.values().stream().filter(m -> m.conversationId().equals(conversationId) && (before == null || m.sentAt().isBefore(before)))
                .sorted(Comparator.comparing(DirectMessageRecord::sentAt).reversed()).limit(limit).toList();
    }

    @Override
    public List<DirectMessageRecord> changedSince(UUID conversationId, Instant since, int limit) {
        return messages.values().stream().filter(m -> m.conversationId().equals(conversationId) && m.changedAt().isAfter(since))
                .sorted(Comparator.comparing(DirectMessageRecord::changedAt).thenComparing(DirectMessageRecord::sentAt)).limit(limit).toList();
    }

    @Override
    public Map<UUID, DirectMessageRecord> lastMessages(Collection<UUID> conversationIds) {
        Map<UUID, DirectMessageRecord> out = new HashMap<>();
        for (DirectMessageRecord m : messages.values()) {
            if (conversationIds.contains(m.conversationId())) {
                out.merge(m.conversationId(), m, (a, b) -> a.sentAt().isAfter(b.sentAt()) ? a : b);
            }
        }
        return out;
    }

    @Override
    public Map<UUID, Long> unreadCounts(UUID userId, Collection<UUID> conversationIds) {
        Map<UUID, Long> out = new HashMap<>();
        for (DirectConversationParticipant p : participants.values()) {
            if (!p.userId().equals(userId) || p.leftAt() != null || !conversationIds.contains(p.conversationId())) {
                continue;
            }
            Instant from = p.lastReadAt() != null ? p.lastReadAt() : p.joinedAt();
            long n = messages.values().stream().filter(m -> m.conversationId().equals(p.conversationId()) && !m.authorId().equals(userId)
                    && !m.deleted() && m.sentAt().isAfter(from)).count();
            if (n > 0) {
                out.put(p.conversationId(), n);
            }
        }
        return out;
    }

    @Override
    public UnreadTotals unreadTotals(UUID userId) {
        Map<UUID, Long> all = unreadCounts(userId, conversations.keySet());
        return new UnreadTotals(all.size(), all.values().stream().mapToLong(Long::longValue).sum());
    }

    @Override
    public boolean hasUnreadMessageNotification(UUID recipientId, UUID actorId, String groupKey) {
        return notifications.rows.stream().map(StoredNotification::notification).anyMatch(n -> n.recipientId().equals(recipientId)
                && actorId.equals(n.actorId()) && n.type() == NotificationType.MENSAGEM_DIRETA && groupKey.equals(n.groupKey()) && !n.read());
    }

    @Override
    public int markMessageNotificationsRead(UUID recipientId, String groupKey, Instant at) {
        int changed = 0;
        for (int i = 0; i < notifications.rows.size(); i++) {
            StoredNotification s = notifications.rows.get(i);
            Notification n = s.notification();
            if (n.recipientId().equals(recipientId) && n.type() == NotificationType.MENSAGEM_DIRETA && groupKey.equals(n.groupKey()) && !n.read()) {
                notifications.rows.set(i, new StoredNotification(new Notification(n.id(), n.recipientId(), n.actorId(), n.type(), n.category(),
                        n.resourceType(), n.resourceId(), n.title(), n.body(), n.payloadJson(), n.groupKey(), true, at, n.deliveredChannels()),
                        s.createdAt()));
                changed++;
            }
        }
        return changed;
    }

    @Override
    public int eraseMessagesOf(UUID authorId, Instant at) {
        int n = 0;
        for (DirectMessageRecord m : messages.values().toArray(DirectMessageRecord[]::new)) {
            if (m.authorId().equals(authorId) && !m.deleted()) {
                messages.put(m.id(), new DirectMessageRecord(m.id(), m.conversationId(), m.authorId(), null, m.sentAt(), m.editedAt(), at, at));
                n++;
            }
        }
        return n;
    }

    @Override
    public int leaveAll(UUID userId, Instant at) {
        int n = 0;
        for (DirectConversationParticipant p : participants.values().toArray(DirectConversationParticipant[]::new)) {
            if (p.userId().equals(userId) && p.leftAt() == null) {
                participants.put(p.id(), new DirectConversationParticipant(p.id(), p.conversationId(), p.userId(), p.joinedAt(), at, p.lastReadAt()));
                n++;
            }
        }
        return n;
    }
}
