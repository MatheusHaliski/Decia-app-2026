package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.TaskAttachment;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Anexos da tarefa ({@code task_attachments}, V11). O binário já passou pelo pipeline de mídia ({@code MediaUploadService}: inspeção,
 * antivírus, dedupe, chave segura) e está em {@code media_objects}; aqui fica só o vínculo. Usos: a cópia de um documento externo
 * (conectores, modo COPIADO) e os anexos enviados no detalhe da tarefa (RF41.CA06). Adaptador JPA: {@code JpaAcervoAdapters}.
 */
public interface TaskAttachmentRepositoryPort {

    /** Anexo persistido com o carimbo de criação (data do envio). */
    record StoredAttachment(TaskAttachment attachment, Instant createdAt) {
    }

    /** Anexo com o título da tarefa (lista "meus anexos", {@code /attachments}). */
    record TitledAttachment(StoredAttachment stored, String taskTitle) {
    }

    TaskAttachment insert(TaskAttachment attachment);

    List<TaskAttachment> findByTask(UUID taskId);

    /** Anexos da tarefa na ordem de exibição, com a data do envio. */
    List<StoredAttachment> listByTask(UUID taskId);

    Optional<StoredAttachment> findById(UUID id);

    /** Anexos das tarefas de um dono, mais recentes primeiro, até {@code limit}. */
    List<TitledAttachment> listByTaskOwner(UUID ownerId, int limit);

    /** Quantos anexos (de qualquer tarefa) apontam para o objeto de mídia — o binário só é apagado quando nenhum aponta. */
    long countByMedia(UUID mediaObjectId);

    void delete(UUID id);
}
