-- V70 — trava_trabalhos_agendados (plataforma; RF41.CA04, RF44.CA10). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- Escrita à mão (não é entidade do catálogo de domínio): trava entre instâncias para os trabalhos agendados, no estilo do ShedLock.
-- Cada trabalho tem uma linha pelo nome; quem consegue o UPDATE condicional (locked_until <= agora) roda e, ao terminar, devolve a
-- trava (locked_until = agora). Se a instância cair no meio, a trava expira sozinha em locked_until. Sem dado pessoal: locked_by é o
-- nome da máquina + um id aleatório do processo. Primeiro uso: aviso diário de prazo próximo e vencido (DeadlineReminderJob).
-- Reserva no docs/PLANO_EXECUCAO.md §6.

CREATE TABLE scheduled_job_locks (
    name                    VARCHAR(64)     NOT NULL,
    locked_until            TIMESTAMP(6)    NOT NULL,
    locked_at               TIMESTAMP(6)    NOT NULL,
    locked_by               VARCHAR(255)    NOT NULL,
    PRIMARY KEY (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
