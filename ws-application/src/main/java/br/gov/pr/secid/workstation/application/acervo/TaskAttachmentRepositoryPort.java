package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.TaskAttachment;

import java.util.List;
import java.util.UUID;

/**
 * Anexos da tarefa ({@code task_attachments}, V11). O binário já passou pelo pipeline de mídia ({@code MediaUploadService}: inspeção,
 * antivírus, dedupe, chave segura) e está em {@code media_objects}; aqui fica só o vínculo. Primeiro uso: a cópia de um documento
 * externo (conectores, modo COPIADO). Adaptador JPA: {@code JpaAcervoAdapters}.
 */
public interface TaskAttachmentRepositoryPort {

    TaskAttachment insert(TaskAttachment attachment);

    List<TaskAttachment> findByTask(UUID taskId);
}
