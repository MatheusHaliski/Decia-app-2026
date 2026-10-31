package br.gov.pr.secid.workstation.web.messaging;

import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.messaging.ConversationService;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.ConversationView;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.MessageChanges;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.MessagePage;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.MessageView;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.Started;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.UnreadSummary;
import br.gov.pr.secid.workstation.web.security.AuthorizedBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * RF46 — mensagens diretas (Onda 7). Conversas 1:1 e em grupo pequeno entre pessoas ativas da mesma empresa; só participantes leem e
 * escrevem (quem não participa recebe o mesmo 404 de uma conversa inexistente). Entrega quase em tempo real por polling leve:
 * {@code GET …/messages/changes?since=} com o {@code serverTime} da leitura anterior. O texto é puro (nunca HTML) e não vai a logs.
 */
@RestController
@Tag(name = "RF46 Mensagens diretas")
public class ConversationController {
    private final ConversationService conversations;

    public ConversationController(ConversationService conversations) {
        this.conversations = conversations;
    }

    /** Iniciar: uma pessoa → 1:1 (reaproveitada); duas ou mais → grupo (título opcional). */
    public record StartRequest(@Size(max = 50) List<UUID> participantIds, @Size(max = 1000) String title) {
    }

    /** Texto da mensagem; o limite de {@value ConversationService#MAX_BODY} caracteres é conferido no serviço (422 MENSAGEM_LONGA). */
    public record MessageRequest(@Size(max = 20000) String body) {
    }

    @Operation(summary = "RF46.CA01 Iniciar conversa (201 nova; 200 = a 1:1 que já existia; 422 PARTICIPANTE_INDISPONIVEL uniforme)")
    @PostMapping("/api/conversations")
    public ResponseEntity<ConversationView> start(CurrentUser user, @Valid @RequestBody StartRequest body, RequestContext ctx) {
        Started s = conversations.start(user, body.participantIds(), body.title(), ctx);
        return ResponseEntity.status(s.created() ? HttpStatus.CREATED : HttpStatus.OK).body(s.conversation());
    }

    @Operation(summary = "RF46.CA06 Minhas conversas por atividade, com última mensagem e não lidas (até 100)")
    @GetMapping("/api/conversations")
    public List<ConversationView> list(CurrentUser user, @RequestParam(defaultValue = "50") int limit) {
        return conversations.list(user, limit);
    }

    @Operation(summary = "RF46.CA06 Quantas conversas e mensagens não lidas eu tenho")
    @GetMapping("/api/conversations/unread")
    public UnreadSummary unread(CurrentUser user) {
        return conversations.unread(user);
    }

    @Operation(summary = "RF46.CA01 Abrir conversa (não participa → 404 NAO_ENCONTRADO)")
    @GetMapping("/api/conversations/{id}")
    @AuthorizedBy("requireConversationParticipant")
    public ConversationView get(CurrentUser user, @PathVariable UUID id) {
        return conversations.get(user, id);
    }

    @Operation(summary = "RF46.CA01 Mensagens por cursor, mais recentes primeiro (before = nextCursor da página anterior)")
    @GetMapping("/api/conversations/{id}/messages")
    @AuthorizedBy("requireConversationParticipant")
    public MessagePage messages(CurrentUser user, @PathVariable UUID id, @RequestParam(required = false) String before,
                                @RequestParam(defaultValue = "30") int limit) {
        return conversations.messages(user, id, before, limit);
    }

    @Operation(summary = "RF46.CA06 Novas, editadas e apagadas desde since (serverTime da leitura anterior) — polling leve")
    @GetMapping("/api/conversations/{id}/messages/changes")
    @AuthorizedBy("requireConversationParticipant")
    public MessageChanges changes(CurrentUser user, @PathVariable UUID id, @RequestParam(required = false) String since) {
        return conversations.changes(user, id, since);
    }

    @Operation(summary = "RF46.CA01 Enviar texto puro (422 MENSAGEM_VAZIA/MENSAGEM_LONGA/CONVERSA_SEM_DESTINATARIO; 429 por minuto)")
    @PostMapping("/api/conversations/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    @AuthorizedBy("requireConversationParticipant")
    public MessageView send(CurrentUser user, @PathVariable UUID id, @Valid @RequestBody MessageRequest body) {
        return conversations.send(user, id, body == null ? null : body.body());
    }

    @Operation(summary = "RF46.CA01 Editar a própria mensagem (de outra pessoa → 403; apagada → 409 MENSAGEM_APAGADA)")
    @PutMapping("/api/conversations/{id}/messages/{messageId}")
    @AuthorizedBy("requireConversationParticipant")
    public MessageView edit(CurrentUser user, @PathVariable UUID id, @PathVariable UUID messageId, @Valid @RequestBody MessageRequest body,
                            RequestContext ctx) {
        return conversations.edit(user, id, messageId, body == null ? null : body.body(), ctx);
    }

    @Operation(summary = "RF46.CA01 Apagar a própria mensagem (fica \"mensagem removida\"; idempotente)")
    @DeleteMapping("/api/conversations/{id}/messages/{messageId}")
    @AuthorizedBy("requireConversationParticipant")
    public MessageView delete(CurrentUser user, @PathVariable UUID id, @PathVariable UUID messageId, RequestContext ctx) {
        return conversations.delete(user, id, messageId, ctx);
    }

    @Operation(summary = "RF46.CA06 Marcar a conversa como lida (devolve os totais de não lidas)")
    @PostMapping("/api/conversations/{id}/read")
    @AuthorizedBy("requireConversationParticipant")
    public UnreadSummary markRead(CurrentUser user, @PathVariable UUID id) {
        return conversations.markRead(user, id);
    }

    @Operation(summary = "RF46.CA06 Sair do grupo (1:1 → 422 SAIR_SO_DE_GRUPO)")
    @DeleteMapping("/api/conversations/{id}/participants/me")
    @AuthorizedBy("requireConversationParticipant")
    public ResponseEntity<Void> leave(CurrentUser user, @PathVariable UUID id, RequestContext ctx) {
        conversations.leave(user, id, ctx);
        return ResponseEntity.noContent().build();
    }
}
