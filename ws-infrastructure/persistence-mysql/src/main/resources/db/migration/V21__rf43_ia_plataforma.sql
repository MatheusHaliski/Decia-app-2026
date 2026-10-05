-- V21 — rf43_ia_plataforma (10 IA do sistema · 12 Plataforma). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- ai_quotas (AiQuota — 10 IA do sistema; RF43, RF42, RF18)
-- Espelho das cotas (contador atômico vive no Redis). Única (scope, scope_id, month_key).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE ai_quotas (
    id                      BINARY(16)      NOT NULL,
    scope                   VARCHAR(20)     NOT NULL,
    scope_id                BINARY(16)      NOT NULL,
    month_key               CHAR(7)         NOT NULL,
    monthly_limit           INT             NOT NULL DEFAULT 0,
    consumed                INT             NOT NULL DEFAULT 0,
    purchased_credits       INT             NOT NULL DEFAULT 0,
    reset_at                TIMESTAMP(6)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_ai_quotas_scope_scope_month_key UNIQUE (scope, scope_id, month_key),
    CONSTRAINT ck_ai_quotas_scope CHECK (scope IN ('USER', 'DEPARTMENT'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- insights (Insight — 10 IA do sistema; RF43, RF19, RF21)
-- Insights por escopo (acervo, perfil, equipe, projeto). Sem FK no escopo (polimórfico).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE insights (
    id                      BINARY(16)      NOT NULL,
    scope                   VARCHAR(20)     NOT NULL,
    scope_id                BINARY(16)      NOT NULL,
    kind                    VARCHAR(60)     NOT NULL,
    title                   VARCHAR(200)    NOT NULL,
    body_md                 TEXT            NOT NULL,
    metric_refs_json        JSON            NULL,
    actions_json            JSON            NULL,
    severity                VARCHAR(20)     NOT NULL DEFAULT 'INFO',
    ai_inference_id         BINARY(16)      NULL,
    dismissed_at            TIMESTAMP(6)    NULL,
    generated_at            TIMESTAMP(6)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_insights__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_insights_scope CHECK (scope IN ('ACERVO', 'PERFIL', 'EQUIPE', 'PROJETO')),
    CONSTRAINT ck_insights_severity CHECK (severity IN ('INFO', 'ATENCAO', 'CRITICO')),
    INDEX ix_insights_scope_scope_generated_at (scope, scope_id, generated_at),
    INDEX ix_insights_dismissed_at (dismissed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- feasibility_sheets (FeasibilitySheet — 10 IA do sistema; RF43, RF30, RF21)
-- Fichas de viabilidade de candidatos a projeto. Projeto/tarefa resultantes SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE feasibility_sheets (
    id                      BINARY(16)      NOT NULL,
    candidate_title         VARCHAR(200)    NOT NULL,
    demand_ref              VARCHAR(200)    NULL,
    cost_json               JSON            NULL,
    time_json               JSON            NULL,
    deadline_json           JSON            NULL,
    viability_score_json    JSON            NULL,
    risks_json              JSON            NULL,
    wbs_json                JSON            NULL,
    raci_json               JSON            NULL,
    assumptions_json        JSON            NULL,
    unknowns_json           JSON            NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PROPOSTA',
    discard_reason          VARCHAR(500)    NULL,
    resulting_project_id    BINARY(16)      NULL,
    resulting_task_id       BINARY(16)      NULL,
    ai_inference_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_feasibility_sheets__resulting_project_id FOREIGN KEY (resulting_project_id) REFERENCES project_schemes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_feasibility_sheets__resulting_task_id FOREIGN KEY (resulting_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_feasibility_sheets__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_feasibility_sheets_status CHECK (status IN ('PROPOSTA', 'ACEITA', 'DESCARTADA')),
    INDEX ix_feasibility_sheets_status (status),
    INDEX ix_feasibility_sheets_resulting_project (resulting_project_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- metric_definitions (MetricDefinition — 10 IA do sistema; RF43, RF18)
-- Catálogo de métricas (fórmula, fonte, proxy, unidade, amostra mínima).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE metric_definitions (
    code                    VARCHAR(60)     NOT NULL,
    domain                  VARCHAR(20)     NOT NULL,
    name                    VARCHAR(160)    NOT NULL,
    formula                 TEXT            NOT NULL,
    source_description      TEXT            NULL,
    proxy_note              VARCHAR(500)    NULL,
    unit                    VARCHAR(30)     NULL,
    min_samples             INT             NOT NULL DEFAULT 1,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (code),
    CONSTRAINT ck_metric_definitions_domain CHECK (domain IN ('INOVACAO', 'TI', 'PROJETOS', 'EQUIPES', 'DECIA', 'PONTOS'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- metric_snapshots (MetricSnapshot — 10 IA do sistema; RF18, RF43)
-- Valores materializados por métrica, escopo e período. Métrica RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE metric_snapshots (
    id                      BINARY(16)      NOT NULL,
    metric_code             VARCHAR(60)     NOT NULL,
    scope                   VARCHAR(20)     NOT NULL,
    scope_id                BINARY(16)      NULL,
    period_start            DATE            NOT NULL,
    period_end              DATE            NOT NULL,
    value                   DECIMAL(18,4)   NOT NULL,
    values_json             JSON            NULL,
    computed_at             TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_metric_snapshots_metric_code_scope_scope_period_star_1487b21c UNIQUE (metric_code, scope, scope_id, period_start, period_end),
    CONSTRAINT fk_metric_snapshots__metric_code FOREIGN KEY (metric_code) REFERENCES metric_definitions (code)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_metric_snapshots_scope CHECK (scope IN ('GLOBAL', 'EMPRESA', 'DEPARTAMENTO', 'USUARIO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- extraction_results (ExtractionResult — 10 IA do sistema; RF34, RF20, RF21)
-- Extrações por tarefa (filho → CASCADE); tarefa derivada SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE extraction_results (
    id                      BINARY(16)      NOT NULL,
    task_id                 BINARY(16)      NOT NULL,
    kind                    VARCHAR(20)     NOT NULL,
    rows_json               JSON            NULL,
    layers_json             JSON            NULL,
    derived_task_id         BINARY(16)      NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PROCESSANDO',
    ai_inference_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_extraction_results__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_extraction_results__derived_task_id FOREIGN KEY (derived_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_extraction_results__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_extraction_results_kind CHECK (kind IN ('QUANTITATIVOS', 'ITENS_PRAZOS', 'ESTRUTURAL')),
    CONSTRAINT ck_extraction_results_status CHECK (status IN ('PROCESSANDO', 'PRONTA', 'REVISADA', 'CONVERTIDA', 'FALHA')),
    INDEX ix_extraction_results_task_status (task_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- extraction_corrections (ExtractionCorrection — 10 IA do sistema; RF34)
-- Correções (filho → CASCADE). Quem corrigiu RESTRICT (trilha de aprendizado).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE extraction_corrections (
    id                      BINARY(16)      NOT NULL,
    extraction_id           BINARY(16)      NOT NULL,
    row_index               INT             NOT NULL DEFAULT 0,
    field                   VARCHAR(40)     NOT NULL,
    old_value               VARCHAR(500)    NULL,
    new_value               VARCHAR(500)    NULL,
    user_id                 BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_extraction_corrections__extraction_id FOREIGN KEY (extraction_id) REFERENCES extraction_results (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_extraction_corrections__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_extraction_corrections__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX ix_extraction_corrections_extraction_row_index (extraction_id, row_index)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- memory_queries (MemoryQuery — 10 IA do sistema; RF33, RF27)
-- Histórico de buscas (dono → CASCADE).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE memory_queries (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    query_text              VARCHAR(1000)   NOT NULL,
    filters_json            JSON            NULL,
    results_json            JSON            NULL,
    ai_inference_id         BINARY(16)      NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_memory_queries__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_memory_queries__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    INDEX ix_memory_queries_user_at (user_id, at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- pipeline_jobs (PipelineJob — 12 Plataforma; RF3, RF20, RF33, RF37, RF38, RF43, RF44, RF45)
-- Fila de jobs em MySQL (MysqlJobQueue). Alvo polimórfico sem FK.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE pipeline_jobs (
    id                      BINARY(16)      NOT NULL,
    type                    VARCHAR(20)     NOT NULL,
    target_type             VARCHAR(40)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDENTE',
    attempts                INT             NOT NULL DEFAULT 0,
    last_error              VARCHAR(1000)   NULL,
    scheduled_at            TIMESTAMP(6)    NOT NULL,
    finished_at             TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ck_pipeline_jobs_type CHECK (type IN ('THUMBNAIL', 'OCR', 'ANTIVIRUS', 'SYNC_EXTERNO', 'INDEXAR_MEMORIA', 'EXPORT_PDF', 'TRANSCRICAO', 'RECALC_HYPE', 'RECALC_RANKING', 'RECALC_METRICS', 'PERGUNTA_ADIADA', 'DATA_EXPORT')),
    CONSTRAINT ck_pipeline_jobs_status CHECK (status IN ('PENDENTE', 'RODANDO', 'OK', 'FALHA', 'REPROCESSAR')),
    INDEX ix_pipeline_jobs_status_scheduled_at (status, scheduled_at),
    INDEX ix_pipeline_jobs_target_type_target (target_type, target_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE data_export_requests ADD CONSTRAINT fk_data_export_requests__job_id FOREIGN KEY (job_id) REFERENCES pipeline_jobs (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;
