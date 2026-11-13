package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.TaskState;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contadores e alertas do Acervo (RF41.CA01/CA04/CA09) para os mesmos filtros da lista. Cada contador ignora o PRÓPRIO filtro e respeita
 * os demais (ex.: {@code byPriority} conta por prioridade dentro do estado e da categoria escolhidos), para o número ao lado de cada opção
 * dizer quantas tarefas ela mostraria. Os alertas de prazo legal não dependem dos filtros.
 *
 * @param total            tarefas que casam com todos os filtros (para a paginação)
 * @param scanned          tarefas lidas do índice do dono
 * @param truncated        o dono tem mais tarefas que o teto lido ({@code scanned}): contadores parciais
 * @param today            "hoje" usado nas contas (fuso America/Sao_Paulo)
 * @param byWorkStatus     estado de trabalho → quantidade (todas as chaves de {@link AcervoQuery.WorkFilter})
 * @param byPriority       prioridade → quantidade (todas as chaves)
 * @param byCategory       categoria → quantidade (todas as chaves)
 * @param byDeadline       filtro de prazo → quantidade (todas as chaves de {@link AcervoQuery.DeadlineFilter})
 * @param legalAlerts      até 10 tarefas abertas com prazo legal vencido, hoje ou em até 7 dias, do mais urgente ao menos urgente
 * @param legalAlertCount  total dessas tarefas (pode passar de 10)
 */
public record AcervoSummary(int total, int scanned, boolean truncated, LocalDate today, Map<String, Integer> byWorkStatus,
                            Map<String, Integer> byPriority, Map<String, Integer> byCategory, Map<String, Integer> byDeadline,
                            List<LegalAlert> legalAlerts, int legalAlertCount) {

    /** Tarefa com prazo legal próximo ou vencido: {@code daysLeft} negativo = vencida há |daysLeft| dias; 0 = vence hoje. */
    public record LegalAlert(UUID taskId, String title, TaskState state, LocalDate legalDueAt, long daysLeft) {
    }
}
