package br.gov.pr.secid.workstation.web.notifications;

import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.notifications.NotificationService;
import br.gov.pr.secid.workstation.application.notifications.NotificationService.NotificationView;
import br.gov.pr.secid.workstation.application.notifications.NotificationService.ReadAll;
import br.gov.pr.secid.workstation.application.notifications.NotificationService.UnreadCount;
import br.gov.pr.secid.workstation.web.security.AuthorizedBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * RF27 — notificações da própria conta (sino e central). Só lê e marca o que é seu: a notificação de outra pessoa responde o mesmo 404 de
 * um id inexistente.
 */
@RestController
@Tag(name = "RF27 Notificações")
public class NotificationController {
    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @Operation(summary = "RF27 Minhas notificações, mais recentes primeiro (até 50)")
    @GetMapping("/api/notifications")
    public List<NotificationView> list(CurrentUser user, @RequestParam(defaultValue = "30") int limit) {
        return notifications.list(user, limit);
    }

    @Operation(summary = "RF27 Quantas notificações não lidas eu tenho")
    @GetMapping("/api/notifications/unread-count")
    public UnreadCount unreadCount(CurrentUser user) {
        return notifications.unreadCount(user);
    }

    @Operation(summary = "RF27 Marca uma notificação minha como lida (de outra pessoa → 404 NAO_ENCONTRADO)")
    @PostMapping("/api/notifications/{id}/read")
    @AuthorizedBy("requireOwnNotification")
    public ResponseEntity<Void> markRead(CurrentUser user, @PathVariable UUID id) {
        notifications.markRead(user, id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "RF27 Marca todas as minhas notificações como lidas")
    @PostMapping("/api/notifications/read-all")
    public ReadAll markAllRead(CurrentUser user) {
        return notifications.markAllRead(user);
    }
}
