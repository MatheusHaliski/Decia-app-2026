package br.gov.pr.secid.workstation.domain.social;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;
import java.util.UUID;

/** Notificação (RF27 e todo RF que notifica) — TAXONOMIA §8.8; Cassandra {@code notifications_by_user} (TTL) + MySQL. */
@DomainEntity(context = "7 Social & Descoberta", table = "notifications", rfs = {"RF27", "RF8", "RF13", "RF15", "RF39", "RF42", "RF46"}, migration = 16,
        audit = Audit.CREATED, store = Store.MYSQL_CASSANDRA,
        doc = "Notificações do destinatário → CASCADE; ator SET NULL. Índice (recipient, read_at) para a central (RF27).",
        indexes = {"recipient_id, is_read, created_at", "recipient_id, read_at", "group_key"})
public record Notification(
        @Attr("identificador") UUID id,
        @Attr(value = "destinatário", ref = "users", onDelete = OnDelete.CASCADE) UUID recipientId,
        @Attr(value = "ator (nulo = sistema)", opt = true, ref = "users", onDelete = OnDelete.SET_NULL) UUID actorId,
        @Attr("tipo") NotificationType type,
        @Attr("categoria") NotificationCategory category,
        @Attr(value = "tipo do recurso", opt = true, len = 40) String resourceType,
        @Attr(value = "id do recurso", opt = true) UUID resourceId,
        @Attr(value = "título", len = 200) String title,
        @Attr(value = "corpo", opt = true, len = 1000) String body,
        @Attr(value = "payload", opt = true) String payloadJson,
        @Attr(value = "chave de agrupamento por hora", opt = true, len = 120) String groupKey,
        @Attr(value = "lida", col = "is_read") boolean read,
        @Attr(value = "lida em", opt = true) Instant readAt,
        @Attr(value = "canais entregues (in-app, e-mail…)", opt = true, col = "delivered_channels_json") String deliveredChannels) {
}
