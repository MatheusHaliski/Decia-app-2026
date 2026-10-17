-- V37 — acervo_source_kind_manual (2 Acervo de Tarefas). MySQL 8.4, InnoDB.
-- Q-235 (auditoria 17/10/2026): tarefa digitada no criador ganha SourceKind.MANUAL; COLAR volta a significar só Ctrl+V.
-- Escrita à mão (V11 já aplicada nunca é regenerada — D-40). Só o CHECK muda; nenhuma coluna, FK ou índice.
ALTER TABLE tasks DROP CHECK ck_tasks_source_kind;
ALTER TABLE tasks ADD CONSTRAINT ck_tasks_source_kind CHECK (source_kind IN ('MANUAL', 'ARQUIVO', 'COLAR', 'GOOGLE', 'MICROSOFT', 'EMAIL', 'LINK',
    'PROTOCOLO', 'FOTO', 'TEXTO_IA', 'EXTRAIDA_DE_PROJETO', 'REMIX', 'DECIA', 'AUTOPILOT', 'ATA_VIVA', 'DOSSIE', 'EXTRACAO'));
