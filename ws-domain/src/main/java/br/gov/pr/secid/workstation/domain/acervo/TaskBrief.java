package br.gov.pr.secid.workstation.domain.acervo;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/**
 * Briefing profissional da tarefa, 1:1 com {@link TaskItem} (RF4, RF12, RF41; auditoria 17/10/2026, Onda Acervo V36): objetivo,
 * área, entregáveis, critérios de conclusão, referências e extensões da área. Campos comuns a qualquer profissão; as extensões
 * são opcionais e só as da área escolhida. Listas em JSON validadas pelo serviço (tamanho e formato), nunca HTML.
 */
@DomainEntity(context = "2 Acervo de Tarefas", table = "task_briefs", rfs = {"RF4", "RF12", "RF41"}, migration = 36, pk = "task_id",
        doc = "Briefing 1:1 da tarefa (objetivo, entregáveis, critérios, referências, extensões por área). Some com a tarefa (CASCADE).",
        indexes = {"area"})
public record TaskBrief(
        @Attr(value = "tarefa (PK)", ref = "tasks", onDelete = OnDelete.CASCADE) UUID taskId,
        @Attr(value = "objetivo: o resultado esperado em uma frase", opt = true, len = 500) String objective,
        @Attr(value = "área profissional (define extensões oferecidas)", opt = true) WorkArea area,
        @Attr(value = "entregáveis [{text}]", opt = true) String deliverablesJson,
        @Attr(value = "critérios de conclusão [{text, done}]", opt = true) String acceptanceCriteriaJson,
        @Attr(value = "referências [{label, url}]", opt = true) String referencesJson,
        @Attr(value = "extensões da área {chave: texto}", opt = true) String extensionsJson) {

    public static TaskBrief empty(UUID taskId) {
        return new TaskBrief(taskId, null, null, null, null, null, null);
    }
}
