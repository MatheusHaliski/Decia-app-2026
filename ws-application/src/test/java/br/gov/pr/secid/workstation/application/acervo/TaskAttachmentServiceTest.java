package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.AttachmentView;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.EvidenceInput;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.EvidenceView;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.FileContent;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.FileInput;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.media.ImageMetadataTest;
import br.gov.pr.secid.workstation.application.media.MediaUploadService;
import br.gov.pr.secid.workstation.application.media.MemoryMedia;
import br.gov.pr.secid.workstation.application.notifications.MemoryNotifications;
import br.gov.pr.secid.workstation.application.notifications.NotificationService;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.AntivirusStatus;
import br.gov.pr.secid.workstation.domain.acervo.OcrStatus;
import br.gov.pr.secid.workstation.domain.acervo.TaskAttachment;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import java.util.function.Consumer;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * RF41.CA06 — anexos e evidências: pipeline de mídia (tipo real, limites, metadados de imagem fora), BOLA (dono/responsável editam, colega
 * da empresa só vê, outra empresa recebe 404), geolocalização só quando enviada e só para quem pode editar, binário apagado no último
 * vínculo e lista "meus anexos".
 */
class TaskAttachmentServiceTest {
    static final RequestContext CTX = new RequestContext("127.0.0.1", "test");

    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final List<AuditEvent> audits = new ArrayList<>();
    final AcervoFakes.Tasks tasks = new AcervoFakes.Tasks();
    final AcervoFakes.Attachments attachments = new AcervoFakes.Attachments();
    final AcervoFakes.Evidences evidences = new AcervoFakes.Evidences();
    final MemoryMedia media = new MemoryMedia();
    final UUID company = UUID.randomUUID();
    final TaskAttachmentService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        ResourceAuthorizer authorizer = new ResourceAuthorizer(users, Optional.empty());
        Clock clock = Clock.fixed(AcervoFakes.T0, ZoneOffset.UTC);
        TaskService taskService = new TaskService(tasks, users, authorizer, audits::add,
                new NotificationService(new MemoryNotifications(), users, authorizer, clock), clock);
        MediaUploadService mediaService = media.service(authorizer);
        service = new TaskAttachmentService(taskService, attachments, evidences, media.inspector, mediaService, authorizer, audits::add, clock);
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User person(UUID companyId) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setRole(Role.USER);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setCompanyId(companyId);
        u.setStatus(AccountStatus.ACTIVE);
        people.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    TaskItem taskOf(User owner, String title, TaskState state, Visibility visibility, AccessClassification access, User responsible) {
        TaskItem t = AcervoFakes.task(owner.getId(), title, state, Priority.MEDIA, TaskCategory.VISTORIA_RELATORIO_FOTOGRAFICO, null, null, access,
                visibility, responsible == null ? null : responsible.getId());
        tasks.put(t, AcervoFakes.T0, AcervoFakes.T0);
        attachments.titles.put(t.id(), title);
        attachments.owners.put(t.id(), owner.getId());
        return t;
    }

    static FileInput png(int seed) {
        return new FileInput(ImageMetadataTest.pngWithText(64, 32, seed), "planta.png", "image/png");
    }

    static Consumer<Throwable> api(int status, String code) {
        return e -> {
            assertThat(e).isInstanceOf(ApiException.class);
            assertThat(((ApiException) e).status()).isEqualTo(status);
            assertThat(((ApiException) e).code()).isEqualTo(code);
        };
    }

    @Test
    void enviaListaAbreERemoveComBolaEApagaOBinarioNoFim() {
        User me = person(company);
        User colega = person(company);
        User estranho = person(UUID.randomUUID());
        TaskItem t = taskOf(me, "Vistoria da obra", TaskState.EM_USO, Visibility.EMPRESA, AccessClassification.INTERNO, null);

        AttachmentView a = service.upload(cu(me), t.id(), png(1), CTX);
        assertThat(a).extracting(AttachmentView::fileName, AttachmentView::mimeType, AttachmentView::image, AttachmentView::primary,
                AttachmentView::taskTitle).containsExactly("planta.png", "image/png", true, true, "Vistoria da obra");
        assertThat(a.scanStatus()).isEqualTo(MediaScanStatus.NAO_VERIFICADO);
        assertThat(a.available()).isTrue();
        // o binário é do dono da tarefa e perdeu os chunks de texto (GPS)
        assertThat(media.rows.values()).singleElement().satisfies(m -> {
            assertThat(m.ownerId()).isEqualTo(me.getId());
            assertThat(m.accessClass()).isEqualTo(MediaAccessClass.PRIVATE);
        });
        assertThat(new String(media.blobs.values().iterator().next(), StandardCharsets.ISO_8859_1)).doesNotContain("GPS");

        assertThat(service.list(cu(colega), t.id())).extracting(AttachmentView::id).containsExactly(a.id());
        FileContent f = service.content(cu(colega), t.id(), a.id());
        assertThat(f.inline()).isTrue();
        assertThat(f.mimeType()).isEqualTo("image/png");
        assertThatThrownBy(() -> service.upload(cu(colega), t.id(), png(2), CTX)).satisfies(api(403, "ACESSO_NEGADO"));
        assertThatThrownBy(() -> service.list(cu(estranho), t.id())).satisfies(api(404, "NAO_ENCONTRADO"));
        assertThatThrownBy(() -> service.content(cu(estranho), t.id(), a.id())).satisfies(api(404, "NAO_ENCONTRADO"));
        assertThatThrownBy(() -> service.remove(cu(colega), t.id(), a.id(), CTX)).satisfies(api(403, "ACESSO_NEGADO"));
        // anexo de outra tarefa: 404 mesmo para o dono
        TaskItem outra = taskOf(me, "Outra", TaskState.DISPONIVEL, Visibility.PRIVADA, AccessClassification.INTERNO, null);
        assertThatThrownBy(() -> service.content(cu(me), outra.id(), a.id())).satisfies(api(404, "NAO_ENCONTRADO"));

        service.remove(cu(me), t.id(), a.id(), CTX);
        assertThat(service.list(cu(me), t.id())).isEmpty();
        assertThat(media.rows).isEmpty();
        assertThat(media.blobs).isEmpty();
        assertThat(audits).extracting(AuditEvent::action).containsExactly("TASK_ATTACHMENT_ADDED", "TASK_ATTACHMENT_REMOVED");
        assertThat(audits.get(0).metadata()).doesNotContainKey("fileName").containsEntry("mime", "image/png");
    }

    @Test
    void tipoRealLimitesEDuplicado() {
        User me = person(company);
        TaskItem t = taskOf(me, "Laudo", TaskState.DISPONIVEL, Visibility.PRIVADA, AccessClassification.INTERNO, null);
        FileInput texto = new FileInput("MZ executavel disfarçado".getBytes(StandardCharsets.UTF_8), "foto.png", "image/png");
        assertThatThrownBy(() -> service.upload(cu(me), t.id(), texto, CTX)).satisfies(api(415, "TIPO_NAO_PERMITIDO"));
        FileInput renomeado = new FileInput(ImageMetadataTest.pngWithText(8, 8, 3), "foto.jpg", "image/jpeg");
        assertThatThrownBy(() -> service.upload(cu(me), t.id(), renomeado, CTX)).satisfies(api(415, "TIPO_DIVERGENTE"));
        byte[] grande = new byte[(int) TaskAttachmentService.MAX_BYTES + 1];
        assertThatThrownBy(() -> service.upload(cu(me), t.id(), new FileInput(grande, "x.png", "image/png"), CTX))
                .satisfies(api(413, "ARQUIVO_GRANDE_DEMAIS"));

        service.upload(cu(me), t.id(), png(4), CTX);
        assertThatThrownBy(() -> service.upload(cu(me), t.id(), png(4), CTX)).satisfies(api(409, "ANEXO_DUPLICADO"));

        // teto de anexos por tarefa
        for (int i = 0; i < TaskAttachmentService.MAX_PER_TASK; i++) {
            attachments.insert(new TaskAttachment(null, t.id(), UUID.randomUUID(), "f" + i + ".pdf", "application/pdf", 1, "sha" + i,
                    AntivirusStatus.LIMPO, OcrStatus.PENDENTE, null, false, i + 1));
        }
        assertThatThrownBy(() -> service.upload(cu(me), t.id(), png(5), CTX)).satisfies(api(409, "LIMITE_ANEXOS"));
        assertThat(media.rows).hasSize(1);
    }

    @Test
    void jpegDeCelularPerdeOGpsEmbutido() {
        User me = person(company);
        TaskItem t = taskOf(me, "Vistoria", TaskState.EM_USO, Visibility.PRIVADA, AccessClassification.INTERNO, null);
        service.upload(cu(me), t.id(), new FileInput(ImageMetadataTest.jpegWithGps(800, 600, 9), "IMG_0001.JPG", "image/jpeg"), CTX);
        String stored = new String(media.blobs.values().iterator().next(), StandardCharsets.ISO_8859_1);
        assertThat(stored).doesNotContain("GPS").doesNotContain("Exif").contains("JFIF");
    }

    @Test
    void evidenciaComLocalizacaoCifradaSoParaQuemEdita() {
        User me = person(company);
        User responsavel = person(company);
        User colega = person(company);
        TaskItem t = taskOf(me, "Vistoria", TaskState.EM_USO, Visibility.EMPRESA, AccessClassification.INTERNO, responsavel);
        EvidenceInput meta = new EvidenceInput("  Fissura na viga V3 ", "2026-11-12T10:15:00-03:00", "-25.42840000", "-49.2733");
        // o responsável (colaborador explícito) também registra evidência
        EvidenceView ev = service.addEvidence(cu(responsavel), t.id(),
                new FileInput(ImageMetadataTest.jpegWithGps(640, 480, 1), "viga.jpg", "image/jpeg"), meta, CTX);
        assertThat(ev).extracting(EvidenceView::caption, EvidenceView::hasLocation, EvidenceView::latitude, EvidenceView::longitude)
                .containsExactly("Fissura na viga V3", true, "-25.4284", "-49.2733");
        assertThat(ev.takenAt()).isEqualTo(java.time.Instant.parse("2026-11-12T13:15:00Z"));
        assertThat(ev.ownerId()).isEqualTo(responsavel.getId());
        assertThat(ev.attachmentId()).isNotNull();

        assertThat(service.list(cu(me), t.id())).singleElement().satisfies(a -> {
            assertThat(a.evidence()).isNotNull();
            assertThat(a.evidence().latitude()).isEqualTo("-25.4284");
        });
        // colega da empresa vê que há localização, sem as coordenadas
        assertThat(service.evidences(cu(colega), t.id())).singleElement().satisfies(e -> {
            assertThat(e.hasLocation()).isTrue();
            assertThat(e.latitude()).isNull();
            assertThat(e.longitude()).isNull();
        });
        assertThat(audits).extracting(AuditEvent::action).contains("TASK_EVIDENCE_ADDED");
        assertThat(audits.toString()).doesNotContain("-25.4284").doesNotContain("Fissura");

        // mesmo arquivo de novo como evidência: já registrada
        assertThatThrownBy(() -> service.addEvidence(cu(me), t.id(),
                new FileInput(ImageMetadataTest.jpegWithGps(640, 480, 1), "viga.jpg", "image/jpeg"), meta, CTX))
                .satisfies(api(409, "EVIDENCIA_EXISTENTE"));

        // desmarcar mantém o anexo; remover o anexo leva a marca junto
        service.removeEvidence(cu(me), t.id(), ev.id(), CTX);
        assertThat(service.list(cu(me), t.id())).singleElement().satisfies(a -> assertThat(a.evidence()).isNull());
        assertThat(media.rows).hasSize(1);
        EvidenceView again = service.markEvidence(cu(me), t.id(), ev.attachmentId(), new EvidenceInput(null, null, null, null), CTX);
        assertThat(again.hasLocation()).isFalse();
        assertThatThrownBy(() -> service.markEvidence(cu(me), t.id(), ev.attachmentId(), null, CTX)).satisfies(api(409, "EVIDENCIA_EXISTENTE"));
        TaskItem outra = taskOf(me, "Outra", TaskState.EM_USO, Visibility.PRIVADA, AccessClassification.INTERNO, null);
        assertThatThrownBy(() -> service.removeEvidence(cu(me), outra.id(), again.id(), CTX)).satisfies(api(404, "NAO_ENCONTRADO"));
        service.remove(cu(me), t.id(), ev.attachmentId(), CTX);
        assertThat(evidences.rows).isEmpty();
        assertThat(media.rows).isEmpty();
    }

    @Test
    void dadosDaEvidenciaSaoValidadosAntesDeGravarOArquivo() {
        User me = person(company);
        TaskItem t = taskOf(me, "Vistoria", TaskState.EM_USO, Visibility.PRIVADA, AccessClassification.INTERNO, null);
        Map<EvidenceInput, String> invalid = Map.of(
                new EvidenceInput(null, null, "-25.4", null), "longitude",
                new EvidenceInput(null, null, "95", "10"), "latitude",
                new EvidenceInput(null, null, "-25.4", "1e3"), "longitude",
                new EvidenceInput(null, "2030-01-01T00:00:00Z", null, null), "takenAt",
                new EvidenceInput(null, "ontem", null, null), "takenAt",
                new EvidenceInput("x".repeat(501), null, null, null), "caption");
        invalid.forEach((in, field) -> assertThatThrownBy(() -> service.addEvidence(cu(me), t.id(), png(7), in, CTX))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.status()).isEqualTo(422);
                    assertThat(e.details().toString()).as(in.toString()).contains(field);
                }));
        assertThat(media.rows).isEmpty();
        assertThat(attachments.rows).isEmpty();
    }

    @Test
    void tarefaFechadaSoLeEArquivoCompartilhadoSoSaiNoUltimoVinculo() {
        User me = person(company);
        TaskItem a = taskOf(me, "A", TaskState.EM_USO, Visibility.PRIVADA, AccessClassification.INTERNO, null);
        TaskItem b = taskOf(me, "B", TaskState.EM_USO, Visibility.PRIVADA, AccessClassification.INTERNO, null);
        AttachmentView na = service.upload(cu(me), a.id(), png(11), CTX);
        AttachmentView nb = service.upload(cu(me), b.id(), png(11), CTX);
        assertThat(media.rows).hasSize(1);                     // dedupe por dono: um binário, dois vínculos
        service.remove(cu(me), a.id(), na.id(), CTX);
        assertThat(media.rows).hasSize(1);
        service.remove(cu(me), b.id(), nb.id(), CTX);
        assertThat(media.rows).isEmpty();

        TaskItem fechada = taskOf(me, "Fechada", TaskState.CONCLUIDA, Visibility.PRIVADA, AccessClassification.INTERNO, null);
        assertThatThrownBy(() -> service.upload(cu(me), fechada.id(), png(12), CTX)).satisfies(api(409, "TAREFA_BLOQUEADA"));
        assertThat(service.list(cu(me), fechada.id())).isEmpty();
    }

    @Test
    void sigilosoVaiParaRestrictedEMeusAnexosTrazemTitulosSoDasMinhasTarefas() {
        User me = person(company);
        User outro = person(company);
        TaskItem sig = taskOf(me, "Processo sigiloso", TaskState.EM_USO, Visibility.PRIVADA, AccessClassification.SIGILOSO, null);
        TaskItem pub = taskOf(me, "Relatório", TaskState.EM_USO, Visibility.EMPRESA, AccessClassification.INTERNO, null);
        TaskItem alheia = taskOf(outro, "Do colega", TaskState.EM_USO, Visibility.EMPRESA, AccessClassification.INTERNO, null);
        service.upload(cu(me), sig.id(), png(21), CTX);
        service.addEvidence(cu(me), pub.id(), png(22), new EvidenceInput("Foto", null, null, null), CTX);
        service.upload(cu(outro), alheia.id(), png(23), CTX);
        assertThat(media.rows.values()).anySatisfy(m -> {
            assertThat(m.accessClass()).isEqualTo(MediaAccessClass.RESTRICTED);
            assertThat(m.objectKey()).startsWith("restricted/");
        });
        List<AttachmentView> mine = service.mine(cu(me), 50);
        assertThat(mine).extracting(AttachmentView::taskTitle).containsExactlyInAnyOrder("Processo sigiloso", "Relatório");
        assertThat(mine).filteredOn(x -> x.evidence() != null).extracting(x -> x.evidence().caption()).containsExactly("Foto");
        assertThat(service.content(cu(me), sig.id(), mine.stream().filter(x -> x.taskId().equals(sig.id())).findFirst().orElseThrow().id())
                .inline()).isTrue();
    }
}
