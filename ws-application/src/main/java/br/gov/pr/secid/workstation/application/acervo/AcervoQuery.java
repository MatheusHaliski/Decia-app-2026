package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.common.Priority;

/**
 * Sub-filtros, ordenação e página do Acervo de Tarefas (RF41.CA01/CA09) — {@code GET /api/tasks?filtro=&categoria=&prioridade=&prazo=&ordem=
 * &page=&size=}. Todos opcionais: sem nenhum, a lista é a de antes (mais recentes primeiro). O front guarda os mesmos valores na URL de
 * {@code /tasks} (compartilhável).
 *
 * @param filtro     estado de trabalho (eixo de execução do {@code lib/tasks/status.ts}); PUBLICADO = modelo público ou oferecida
 * @param categoria  categoria documental
 * @param prioridade prioridade
 * @param prazo      com prazo legal, vencendo em até 7 dias ou atrasadas (prazo mais próximo entre o prazo e o prazo legal)
 * @param ordem      CRIACAO (padrão), ATUALIZACAO, PRAZO ou PRIORIDADE
 * @param page       página a partir de 1
 * @param size       itens por página (padrão 20, máximo 100)
 */
public record AcervoQuery(WorkFilter filtro, TaskCategory categoria, Priority prioridade, DeadlineFilter prazo, SortOrder ordem, int page,
                          int size) {
    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    /** Estado de trabalho como o usuário o entende (A realizar · Em andamento · Bloqueado · Concluído · Arquivado · Publicado). */
    public enum WorkFilter {
        A_REALIZAR, EM_ANDAMENTO, BLOQUEADO, CONCLUIDO, ARQUIVADO, PUBLICADO;

        public static WorkFilter of(TaskState s) {
            return switch (s) {
                case RASCUNHO, DISPONIVEL -> A_REALIZAR;
                case EM_USO -> EM_ANDAMENTO;
                case BLOQUEADA -> BLOQUEADO;
                case CONCLUIDA -> CONCLUIDO;
                case ARQUIVADA -> ARQUIVADO;
                case MODELO_PUBLICO, OFERECIDA -> PUBLICADO;
            };
        }
    }

    /** Filtros de prazo: só as abertas contam como "vencendo" ou "atrasadas"; "com prazo legal" vale para qualquer estado. */
    public enum DeadlineFilter {
        COM_PRAZO_LEGAL, VENCE_7_DIAS, ATRASADAS
    }

    /** Ordenação: criação (padrão da API), última atualização, prazo mais próximo (abertas primeiro) ou prioridade. */
    public enum SortOrder {
        CRIACAO, ATUALIZACAO, PRAZO, PRIORIDADE
    }

    public AcervoQuery {
        ordem = ordem == null ? SortOrder.CRIACAO : ordem;
        page = Math.max(1, page);
        size = size < 1 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
    }

    /** Sem filtro, ordem de criação, primeira página com {@code size} itens (lista antiga {@code ?limit=}). */
    public static AcervoQuery firstPage(int size) {
        return new AcervoQuery(null, null, null, null, SortOrder.CRIACAO, 1, size);
    }
}
