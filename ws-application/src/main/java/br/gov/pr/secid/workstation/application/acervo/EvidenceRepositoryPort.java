package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.Evidence;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Evidências ({@code evidences}, V11; RF41.CA06): foto ou arquivo marcado como prova de execução da tarefa, com legenda, data da captura e
 * geolocalização opcional cifrada (AES-GCM no adaptador). Adaptador JPA: {@code JpaAcervoAdapters}.
 */
public interface EvidenceRepositoryPort {

    /** Evidência persistida com o carimbo de criação. */
    record StoredEvidence(Evidence evidence, Instant createdAt) {
    }

    StoredEvidence insert(Evidence evidence);

    Optional<StoredEvidence> findById(UUID id);

    /** Evidências vinculadas à tarefa, mais antigas primeiro. */
    List<StoredEvidence> findByTask(UUID taskId);

    /** Evidências vinculadas a qualquer uma das tarefas. */
    List<StoredEvidence> findByTasks(Collection<UUID> taskIds);

    /** Quantas evidências (de qualquer tarefa) apontam para o objeto de mídia. */
    long countByMedia(UUID mediaObjectId);

    void delete(UUID id);
}
