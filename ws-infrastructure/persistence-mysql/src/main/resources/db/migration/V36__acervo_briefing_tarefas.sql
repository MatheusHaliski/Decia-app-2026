-- V36 — acervo_briefing_tarefas (2 Acervo de Tarefas). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- task_briefs (TaskBrief — 2 Acervo de Tarefas; RF4, RF12, RF41)
-- Briefing 1:1 da tarefa (objetivo, entregáveis, critérios, referências, extensões por área). Some com a tarefa
-- (CASCADE).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE task_briefs (
    task_id                 BINARY(16)      NOT NULL,
    objective               VARCHAR(500)    NULL,
    area                    VARCHAR(20)     NULL,
    deliverables_json       JSON            NULL,
    acceptance_criteria_json JSON            NULL,
    references_json         JSON            NULL,
    extensions_json         JSON            NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (task_id),
    CONSTRAINT fk_task_briefs__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_task_briefs_area CHECK (area IS NULL OR area IN ('SOFTWARE', 'ADMINISTRACAO', 'DESIGN', 'PESQUISA', 'MARKETING', 'PLANEJAMENTO', 'ENGENHARIA', 'JURIDICO', 'OUTRA')),
    INDEX ix_task_briefs_area (area)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
