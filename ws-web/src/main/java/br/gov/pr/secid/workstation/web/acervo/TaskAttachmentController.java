package br.gov.pr.secid.workstation.web.acervo;

import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.AttachmentView;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.EvidenceInput;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.EvidenceView;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.FileContent;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.FileInput;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.web.security.AuthorizedBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * RF41.CA06 — anexos e evidências da tarefa. Toda regra (BOLA por {@code ResourceAuthorizer.require} na tarefa, pipeline de mídia D-67,
 * metadados de imagem removidos, geolocalização só quando enviada e cifrada, limites) fica no {@link TaskAttachmentService}; aqui só o HTTP.
 * O download não é renderizável como página ({@code nosniff}, CSP {@code sandbox}); só imagem sai {@code inline}.
 */
@RestController
@Tag(name = "RF41 Anexos e evidências")
public class TaskAttachmentController {
    private final TaskAttachmentService attachments;

    public TaskAttachmentController(TaskAttachmentService attachments) {
        this.attachments = attachments;
    }

    /** Marcar um anexo como evidência: legenda, data da captura (ISO-8601 com fuso) e coordenadas opcionais (as duas ou nenhuma). */
    public record EvidenceRequest(@Schema(maxLength = 500) String caption,
                                  @Schema(description = "data e hora da captura, ISO-8601 com fuso", example = "2026-11-12T13:30:00Z") String takenAt,
                                  @Schema(description = "graus decimais; só com longitude", example = "-25.4284") String latitude,
                                  @Schema(description = "graus decimais; só com latitude", example = "-49.2733") String longitude) {
        EvidenceInput toInput() {
            return new EvidenceInput(caption, takenAt, latitude, longitude);
        }
    }

    @Operation(summary = "RF41.CA06 Anexos da tarefa (com a marca de evidência, a varredura do antivírus e se já pode ser aberto)")
    @GetMapping("/api/tasks/{id}/attachments")
    @AuthorizedBy("require")
    public List<AttachmentView> listAttachments(CurrentUser user, @PathVariable UUID id) {
        return attachments.list(user, id);
    }

    @Operation(summary = "RF41.CA06 Envia um anexo (multipart, campo file; até 15 MB e 50 por tarefa): tipo real pelo conteúdo (415 "
            + "TIPO_NAO_PERMITIDO/TIPO_DIVERGENTE), antivírus (422 ARQUIVO_INFECTADO), metadados de imagem removidos; 409 ANEXO_DUPLICADO, "
            + "409 LIMITE_ANEXOS, 409 TAREFA_BLOQUEADA")
    @PostMapping(path = "/api/tasks/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @AuthorizedBy("require")
    public AttachmentView uploadAttachment(CurrentUser user, @PathVariable UUID id, @RequestParam("file") MultipartFile file, RequestContext ctx) {
        return attachments.upload(user, id, input(file), ctx);
    }

    @Operation(summary = "RF41.CA06 Remove o anexo (e a marca de evidência dele); o arquivo é apagado quando nada mais aponta para ele")
    @DeleteMapping("/api/tasks/{id}/attachments/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @AuthorizedBy("require")
    public void removeAttachment(CurrentUser user, @PathVariable UUID id, @PathVariable UUID attachmentId, RequestContext ctx) {
        attachments.remove(user, id, attachmentId, ctx);
    }

    @Operation(summary = "RF41.CA06 Conteúdo do anexo (423 MIDIA_EM_QUARENTENA enquanto o antivírus não libera; RESTRITO/SIGILOSO só o dono)")
    @GetMapping("/api/tasks/{id}/attachments/{attachmentId}/content")
    @AuthorizedBy("require")
    public ResponseEntity<byte[]> attachmentContent(CurrentUser user, @PathVariable UUID id, @PathVariable UUID attachmentId) {
        FileContent f = attachments.content(user, id, attachmentId);
        ContentDisposition disposition = (f.inline() ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(f.fileName(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.mimeType()))
                .cacheControl(CacheControl.noStore().cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(f.content());
    }

    @Operation(summary = "RF41.CA06 Marca um anexo como evidência (legenda, data da captura, geolocalização opcional cifrada; 409 "
            + "EVIDENCIA_EXISTENTE; 422 VALIDACAO)")
    @PostMapping("/api/tasks/{id}/attachments/{attachmentId}/evidence")
    @ResponseStatus(HttpStatus.CREATED)
    @AuthorizedBy("require")
    public EvidenceView markEvidence(CurrentUser user, @PathVariable UUID id, @PathVariable UUID attachmentId,
                                     @RequestBody(required = false) EvidenceRequest body, RequestContext ctx) {
        return attachments.markEvidence(user, id, attachmentId, body == null ? null : body.toInput(), ctx);
    }

    @Operation(summary = "RF41.CA06 Evidências da tarefa (coordenadas só para quem registrou ou pode editar)")
    @GetMapping("/api/tasks/{id}/evidences")
    @AuthorizedBy("require")
    public List<EvidenceView> listEvidences(CurrentUser user, @PathVariable UUID id) {
        return attachments.evidences(user, id);
    }

    @Operation(summary = "RF41.CA06 Envia foto/arquivo já como evidência (multipart: file, caption, takenAt ISO-8601, latitude e longitude "
            + "opcionais e juntas); mesmo pipeline e limites do anexo")
    @PostMapping(path = "/api/tasks/{id}/evidences", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @AuthorizedBy("require")
    public EvidenceView addEvidence(CurrentUser user, @PathVariable UUID id, @RequestParam("file") MultipartFile file,
                                    @RequestParam(required = false) String caption, @RequestParam(required = false) String takenAt,
                                    @RequestParam(required = false) String latitude, @RequestParam(required = false) String longitude,
                                    RequestContext ctx) {
        return attachments.addEvidence(user, id, input(file), new EvidenceInput(caption, takenAt, latitude, longitude), ctx);
    }

    @Operation(summary = "RF41.CA06 Desmarca a evidência (o anexo continua)")
    @DeleteMapping("/api/tasks/{id}/evidences/{evidenceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @AuthorizedBy("require")
    public void removeEvidence(CurrentUser user, @PathVariable UUID id, @PathVariable UUID evidenceId, RequestContext ctx) {
        attachments.removeEvidence(user, id, evidenceId, ctx);
    }

    @Operation(summary = "RF41.CA06 Meus anexos e evidências (anexos das minhas tarefas, mais recentes primeiro, com o título da tarefa)")
    @GetMapping("/api/attachments")
    public List<AttachmentView> myAttachments(CurrentUser user, @RequestParam(defaultValue = "100") int limit) {
        return attachments.mine(user, limit);
    }

    private static FileInput input(MultipartFile file) {
        try {
            return new FileInput(file.getBytes(), file.getOriginalFilename(), file.getContentType());
        } catch (IOException e) {
            throw ApiException.unprocessable("ARQUIVO_ILEGIVEL", "Não foi possível ler o arquivo enviado.", Map.of());
        }
    }
}
