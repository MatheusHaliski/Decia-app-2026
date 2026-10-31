package br.gov.pr.secid.workstation.application.messaging;

import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.ConversationView;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.MessageChanges;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.MessagePage;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.MessageView;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.Started;
import br.gov.pr.secid.workstation.application.notifications.MemoryNotifications;
import br.gov.pr.secid.workstation.application.notifications.NotificationService;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.mensageria.ConversationKind;
import br.gov.pr.secid.workstation.domain.social.Notification;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * RF46 — mensagens diretas: mesma empresa e conta ativa (recusa uniforme), 1:1 único por par, só participante lê/escreve (404 igual a
 * inexistente), texto puro com limite, edição e remoção só da própria mensagem, cursor e leitura incremental, não lidas por participante,
 * notificação agrupada por (remetente, conversa), saída de grupo e anonimização.
 */
class ConversationServiceTest {

    /** Relógio que a gente adianta à mão. */
    static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-31T12:00:00.123456789Z");

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }
    }

    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final MemoryNotifications notifs = new MemoryNotifications();
    final MemoryConversations repo = new MemoryConversations(notifs);
    final List<AuditEvent> audited = new ArrayList<>();
    final MutableClock clock = new MutableClock();
    final UUID company = UUID.randomUUID();
    final RequestContext ctx = new RequestContext("203.0.113.9", "teste");
    final ConversationService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        ResourceAuthorizer authz = new ResourceAuthorizer(users, Optional.empty());
        service = new ConversationService(repo, users, authz, new NotificationService(notifs, users, authz, clock), audited::add,
                new InMemoryRateLimit(), clock);
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User person(String name) {
        return person(name, company, AccountStatus.ACTIVE);
    }

    User person(String name, UUID companyId, AccountStatus status) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername(name.toLowerCase());
        u.setFullName(name);
        u.setRole(Role.USER);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setCompanyId(companyId);
        u.setStatus(status);
        people.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    UUID direct(User a, User b) {
        return service.start(cu(a), List.of(b.getId()), null, ctx).conversation().id();
    }

    MessageView send(User u, UUID conv, String text) {
        clock.advance(Duration.ofSeconds(1));
        return service.send(cu(u), conv, text);
    }

    static ApiException error(Executable call) {
        return catchThrowableOfType(ApiException.class, () -> call.execute());
    }

    List<Notification> messageNotifs(User u) {
        return notifs.of(u.getId()).stream().filter(n -> n.type() == NotificationType.MENSAGEM_DIRETA).toList();
    }

    // ------------------------------------------------------------------------------------------------ iniciar

    @Test
    void conversaDiretaEhUnicaPorParNosDoisSentidos() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        Started first = service.start(cu(ana), List.of(bruno.getId(), ana.getId(), bruno.getId()), "ignorado", ctx);
        assertThat(first.created()).isTrue();
        assertThat(first.conversation().kind()).isEqualTo(ConversationKind.DIRETA);
        assertThat(first.conversation().title()).as("1:1 não tem título").isNull();
        assertThat(first.conversation().participants()).extracting(ConversationService.ParticipantView::name).containsExactlyInAnyOrder("Ana", "Bruno");
        assertThat(first.conversation().participants()).filteredOn(ConversationService.ParticipantView::self).singleElement()
                .satisfies(p -> assertThat(p.id()).isEqualTo(ana.getId()));
        Started again = service.start(cu(bruno), List.of(ana.getId()), null, ctx);
        assertThat(again.created()).as("o outro lado reaproveita").isFalse();
        assertThat(again.conversation().id()).isEqualTo(first.conversation().id());
        assertThat(repo.conversations).hasSize(1);
        assertThat(audited).extracting(AuditEvent::action).containsExactly(ConversationService.AUDIT_STARTED);
        assertThat(audited.get(0).metadata()).containsEntry("kind", "DIRETA").containsEntry("participants", 2);
    }

    @Test
    void grupoNovoACadaInicioComTituloLimpoELimiteDePessoas() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        User carla = person("Carla");
        Started g = service.start(cu(ana), List.of(bruno.getId(), carla.getId()), "  Obra\u0007 da ponte ", ctx);
        assertThat(g.conversation().kind()).isEqualTo(ConversationKind.GRUPO);
        assertThat(g.conversation().title()).isEqualTo("Obra da ponte");
        assertThat(service.start(cu(ana), List.of(bruno.getId(), carla.getId()), null, ctx).created()).isTrue();
        assertThat(repo.conversations).hasSize(2);
        assertThat(error(() -> service.start(cu(ana), List.of(bruno.getId(), carla.getId()), "x".repeat(161), ctx)).status()).isEqualTo(422);

        List<UUID> many = new ArrayList<>();
        for (int i = 0; i < ConversationService.MAX_PARTICIPANTS; i++) {
            many.add(person("P" + i).getId());
        }
        ApiException big = error(() -> service.start(cu(ana), many, null, ctx));
        assertThat(big.status()).isEqualTo(422);
        assertThat(big.code()).isEqualTo(ConversationService.GRUPO_GRANDE);
    }

    @Test
    void outraEmpresaContaNaoAtivaOuInexistenteTemAMesmaRecusa() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        User outra = person("Olga", UUID.randomUUID(), AccountStatus.ACTIVE);
        User suspensa = person("Sara", company, AccountStatus.SUSPENDED);
        User semEmpresa = person("Nina", null, AccountStatus.ACTIVE);
        List<ApiException> errors = new ArrayList<>();
        for (UUID id : new UUID[] {outra.getId(), suspensa.getId(), UUID.randomUUID()}) {
            errors.add(error(() -> service.start(cu(ana), List.of(bruno.getId(), id), null, ctx)));
            errors.add(error(() -> service.start(cu(ana), List.of(id), null, ctx)));
        }
        errors.add(error(() -> service.start(cu(semEmpresa), List.of(bruno.getId()), null, ctx)));
        assertThat(errors).allSatisfy(e -> {
            assertThat(e.status()).isEqualTo(422);
            assertThat(e.code()).isEqualTo(ConversationService.PARTICIPANTE_INDISPONIVEL);
            assertThat(e.getMessage()).isEqualTo("Não é possível conversar com uma ou mais pessoas escolhidas.");
            assertThat(e.details()).isEmpty();
        });
        ApiException alone = error(() -> service.start(cu(ana), List.of(ana.getId()), null, ctx));
        assertThat(alone.code()).isEqualTo(ApiException.VALIDACAO);
        assertThat(repo.conversations).isEmpty();
        assertThat(audited).isEmpty();
    }

    // ------------------------------------------------------------------------------------------------ ler e escrever

    @Test
    void quemNaoParticipaRecebeOMesmo404DeConversaInexistente() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        User intrusa = person("Ivo");
        UUID conv = direct(ana, bruno);
        send(ana, conv, "oi");
        List<Executable> calls = new ArrayList<>();
        for (UUID id : new UUID[] {conv, UUID.randomUUID()}) {
            calls.add(() -> service.get(cu(intrusa), id));
            calls.add(() -> service.messages(cu(intrusa), id, null, 30));
            calls.add(() -> service.changes(cu(intrusa), id, "2026-10-31T00:00:00Z"));
            calls.add(() -> service.send(cu(intrusa), id, "posso entrar?"));
            calls.add(() -> service.markRead(cu(intrusa), id));
            calls.add(() -> service.leave(cu(intrusa), id, ctx));
        }
        for (Executable call : calls) {
            AuthorizationTrail.clear();
            ApiException e = error(call);
            assertThat(e.status()).isEqualTo(404);
            assertThat(e.getMessage()).isEqualTo("Conversa não encontrado(a)");
            assertThat(AuthorizationTrail.last()).isEqualTo("CONVERSATION");
        }
        assertThat(service.list(cu(intrusa), 50)).isEmpty();
        assertThat(repo.messages).hasSize(1);
    }

    @Test
    void textoPuroComLimiteSemControleEHtmlFicaComoTexto() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        UUID conv = direct(ana, bruno);
        assertThat(error(() -> service.send(cu(ana), conv, "   \n ")).code()).isEqualTo(ConversationService.MENSAGEM_VAZIA);
        assertThat(error(() -> service.send(cu(ana), conv, null)).code()).isEqualTo(ConversationService.MENSAGEM_VAZIA);
        ApiException longa = error(() -> service.send(cu(ana), conv, "a".repeat(ConversationService.MAX_BODY + 1)));
        assertThat(longa.status()).isEqualTo(422);
        assertThat(longa.code()).isEqualTo(ConversationService.MENSAGEM_LONGA);
        assertThat(send(ana, conv, "a".repeat(ConversationService.MAX_BODY)).body()).hasSize(ConversationService.MAX_BODY);
        MessageView m = send(ana, conv, "  <b>oi</b>\u0000 veja https://exemplo.gov.br\r\nlinha 2  ");
        assertThat(m.body()).isEqualTo("<b>oi</b> veja https://exemplo.gov.br\nlinha 2");
        assertThat(m.mine()).isTrue();
        assertThat(m.edited()).isFalse();
    }

    @Test
    void listaPorAtividadeComUltimaMensagemNaoLidasEMarcarComoLida() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        User carla = person("Carla");
        UUID comBruno = direct(ana, bruno);
        UUID comCarla = direct(ana, carla);
        send(bruno, comBruno, "primeira");
        send(bruno, comBruno, "segunda   com\n\nespaços");
        send(carla, comCarla, "oi Ana");
        List<ConversationView> list = service.list(cu(ana), 50);
        assertThat(list).extracting(ConversationView::id).as("a mais recente primeiro").containsExactly(comCarla, comBruno);
        ConversationView b = list.get(1);
        assertThat(b.unread()).isEqualTo(2);
        assertThat(b.lastMessage().preview()).isEqualTo("segunda com espaços");
        assertThat(b.lastMessage().authorId()).isEqualTo(bruno.getId());
        assertThat(b.canSend()).isTrue();
        assertThat(service.unread(cu(ana))).isEqualTo(new ConversationService.UnreadSummary(2, 3));
        assertThat(service.unread(cu(bruno)).messages()).as("as próprias mensagens não contam").isZero();

        assertThat(service.markRead(cu(ana), comBruno)).isEqualTo(new ConversationService.UnreadSummary(1, 1));
        assertThat(service.get(cu(ana), comBruno).unread()).isZero();
        assertThat(service.get(cu(bruno), comBruno).unread()).as("leitura é por participante").isZero();
        send(bruno, comBruno, "terceira");
        assertThat(service.get(cu(ana), comBruno).unread()).isEqualTo(1);
        send(ana, comBruno, "respondi");
        assertThat(service.get(cu(ana), comBruno).unread()).as("quem responde leu até ali").isZero();
        assertThat(service.list(cu(ana), 50).get(0).id()).isEqualTo(comBruno);
    }

    @Test
    void paginacaoPorCursorMaisRecentesPrimeiroComCarimbosUnicos() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        UUID conv = direct(ana, bruno);
        for (int i = 1; i <= 5; i++) {
            service.send(cu(i % 2 == 0 ? bruno : ana), conv, "m" + i);   // mesmo instante do relógio: o carimbo sobe 1 µs
        }
        MessagePage p1 = service.messages(cu(ana), conv, null, 2);
        assertThat(p1.items()).extracting(MessageView::body).containsExactly("m5", "m4");
        assertThat(p1.nextCursor()).isNotNull();
        MessagePage p2 = service.messages(cu(ana), conv, p1.nextCursor(), 2);
        assertThat(p2.items()).extracting(MessageView::body).containsExactly("m3", "m2");
        MessagePage p3 = service.messages(cu(bruno), conv, p2.nextCursor(), 2);
        assertThat(p3.items()).extracting(MessageView::body).containsExactly("m1");
        assertThat(p3.nextCursor()).isNull();
        assertThat(repo.messages.values()).extracting(m -> m.sentAt()).doesNotHaveDuplicates();
        assertThat(error(() -> service.messages(cu(ana), conv, "ontem", 2)).code()).isEqualTo(ConversationService.CURSOR_INVALIDO);
    }

    @Test
    void edicaoERemocaoSoDaPropriaMensagemEAparecemNaLeituraIncremental() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        UUID conv = direct(ana, bruno);
        MessageView m = send(ana, conv, "texto original");
        MessageView dele = send(bruno, conv, "do Bruno");
        clock.advance(Duration.ofSeconds(10));   // fora da janela de sobreposição (5 s), que reenvia o que é recente
        Instant since = service.messages(cu(bruno), conv, null, 30).serverTime();
        clock.advance(Duration.ofMinutes(1));

        ApiException alheia = error(() -> service.edit(cu(ana), conv, dele.id(), "mudei", ctx));
        assertThat(alheia.status()).isEqualTo(403);
        assertThat(error(() -> service.delete(cu(ana), conv, dele.id(), ctx)).status()).isEqualTo(403);
        assertThat(error(() -> service.edit(cu(ana), conv, UUID.randomUUID(), "x", ctx)).status()).isEqualTo(404);

        MessageView edited = service.edit(cu(ana), conv, m.id(), "texto corrigido", ctx);
        assertThat(edited.edited()).isTrue();
        assertThat(edited.body()).isEqualTo("texto corrigido");
        assertThat(edited.sentAt()).as("a ordem não muda").isEqualTo(m.sentAt());
        MessageChanges changes = service.changes(cu(bruno), conv, since.toString());
        assertThat(changes.items()).extracting(MessageView::id).containsExactly(m.id());
        assertThat(changes.items().get(0).mine()).isFalse();

        clock.advance(Duration.ofMinutes(1));
        MessageView removed = service.delete(cu(ana), conv, m.id(), ctx);
        assertThat(removed.deleted()).isTrue();
        assertThat(removed.body()).isNull();
        assertThat(removed.edited()).isFalse();
        assertThat(service.delete(cu(ana), conv, m.id(), ctx).deleted()).as("idempotente").isTrue();
        assertThat(error(() -> service.edit(cu(ana), conv, m.id(), "volta", ctx)).code()).isEqualTo(ConversationService.MENSAGEM_APAGADA);
        assertThat(service.changes(cu(bruno), conv, changes.serverTime().toString()).items()).singleElement()
                .satisfies(v -> assertThat(v.deleted()).isTrue());
        assertThat(repo.messages.get(dele.id()).body()).as("histórico do outro intacto").isEqualTo("do Bruno");
        assertThat(service.list(cu(bruno), 10).get(0).lastMessage().preview()).isEqualTo("do Bruno");
        assertThat(error(() -> service.changes(cu(bruno), conv, null)).code()).isEqualTo(ConversationService.CURSOR_INVALIDO);

        assertThat(audited).extracting(AuditEvent::action)
                .contains(ConversationService.AUDIT_MESSAGE_EDITED, ConversationService.AUDIT_MESSAGE_DELETED);
        assertThat(audited).as("nada de texto de mensagem na auditoria").allSatisfy(a ->
                assertThat(a.metadata().values().toString()).doesNotContain("texto", "Bruno"));
    }

    // ------------------------------------------------------------------------------------------------ notificações

    @Test
    void notificacaoAgrupadaPorRemetenteEConversaAteSerLida() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        User carla = person("Carla");
        UUID conv = direct(ana, bruno);
        send(ana, conv, "um segredo");
        send(ana, conv, "dois");
        send(ana, conv, "três");
        assertThat(messageNotifs(bruno)).as("uma só enquanto não lida").singleElement().satisfies(n -> {
            assertThat(n.actorId()).isEqualTo(ana.getId());
            assertThat(n.resourceType()).isEqualTo("conversation");
            assertThat(n.resourceId()).isEqualTo(conv);
            assertThat(n.groupKey()).isEqualTo("conversation:" + conv);
            assertThat(n.title() + n.payloadJson()).as("sem texto da mensagem").doesNotContain("segredo", "dois");
        });
        assertThat(messageNotifs(ana)).as("quem envia não é notificado").isEmpty();

        service.markRead(cu(bruno), conv);
        assertThat(messageNotifs(bruno)).as("ler a conversa lê a notificação").allSatisfy(n -> assertThat(n.read()).isTrue());
        send(ana, conv, "quatro");
        assertThat(messageNotifs(bruno)).hasSize(2);

        UUID grupo = service.start(cu(ana), List.of(bruno.getId(), carla.getId()), "Equipe", ctx).conversation().id();
        send(ana, grupo, "olá grupo");
        send(carla, grupo, "oi");
        assertThat(messageNotifs(bruno)).as("outra conversa e outro remetente, outra notificação").hasSize(4);
        assertThat(messageNotifs(carla)).singleElement().satisfies(n -> assertThat(n.payloadJson()).contains("GRUPO", "Equipe"));
    }

    // ------------------------------------------------------------------------------------------------ sair, anonimizar, limites

    @Test
    void sairDoGrupoTiraOAcessoESoValeParaGrupo() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        User carla = person("Carla");
        UUID grupo = service.start(cu(ana), List.of(bruno.getId(), carla.getId()), null, ctx).conversation().id();
        UUID direta = direct(ana, bruno);
        assertThat(error(() -> service.leave(cu(ana), direta, ctx)).code()).isEqualTo(ConversationService.SAIR_SO_DE_GRUPO);
        send(bruno, grupo, "antes de sair");
        service.leave(cu(bruno), grupo, ctx);
        assertThat(error(() -> service.messages(cu(bruno), grupo, null, 10)).status()).isEqualTo(404);
        assertThat(service.list(cu(bruno), 10)).extracting(ConversationView::id).containsExactly(direta);
        assertThat(service.get(cu(ana), grupo).participants()).filteredOn(p -> p.id().equals(bruno.getId())).singleElement()
                .satisfies(p -> assertThat(p.active()).isFalse());
        service.leave(cu(carla), grupo, ctx);
        assertThat(service.get(cu(ana), grupo).canSend()).isFalse();
        assertThat(error(() -> service.send(cu(ana), grupo, "alguém?")).code()).isEqualTo(ConversationService.CONVERSA_SEM_DESTINATARIO);
        assertThat(audited).extracting(AuditEvent::action).contains(ConversationService.AUDIT_LEFT);
    }

    @Test
    void anonimizarApagaOTextoDaPessoaETiraDasConversas() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        UUID conv = direct(ana, bruno);
        send(ana, conv, "dado pessoal da Ana");
        send(bruno, conv, "resposta do Bruno");
        ConversationService.Purged purged = service.purge(ana.getId());
        assertThat(purged).isEqualTo(new ConversationService.Purged(1, 1));
        assertThat(repo.messages.values()).filteredOn(m -> m.authorId().equals(ana.getId())).singleElement().satisfies(m -> {
            assertThat(m.body()).isNull();
            assertThat(m.deleted()).isTrue();
        });
        List<MessageView> seen = service.messages(cu(bruno), conv, null, 10).items();
        assertThat(seen).extracting(MessageView::deleted).containsExactly(false, true);
        assertThat(seen.get(0).body()).isEqualTo("resposta do Bruno");
        assertThat(service.get(cu(bruno), conv).canSend()).isFalse();
        assertThat(error(() -> service.get(cu(ana), conv)).status()).isEqualTo(404);
        assertThat(service.purge(ana.getId())).as("idempotente").isEqualTo(new ConversationService.Purged(0, 0));
    }

    @Test
    void limiteDeEnvioPorMinutoEContaComExclusaoAgendadaNaoEscreve() {
        User ana = person("Ana");
        User bruno = person("Bruno");
        UUID conv = direct(ana, bruno);
        for (int i = 0; i < ConversationService.SEND_LIMIT; i++) {
            service.send(cu(ana), conv, "m" + i);
        }
        ApiException many = error(() -> service.send(cu(ana), conv, "mais uma"));
        assertThat(many.status()).isEqualTo(429);
        assertThat(many.details()).containsKey("retryAfterSeconds");

        bruno.setStatus(AccountStatus.DELETION_SCHEDULED);
        bruno.setDeletionScheduledAt(Instant.now().plus(Duration.ofDays(10)));
        ApiException scheduled = error(() -> service.send(cu(bruno), conv, "tchau"));
        assertThat(scheduled.status()).isEqualTo(403);
        assertThat(scheduled.code()).isEqualTo(AuthCodes.EXCLUSAO_AGENDADA);
        assertThat(service.messages(cu(bruno), conv, null, 1).items()).as("mas ainda lê").hasSize(1);
    }
}
