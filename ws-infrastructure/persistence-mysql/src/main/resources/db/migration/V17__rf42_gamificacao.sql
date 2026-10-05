-- V17 — rf42_gamificacao (8 Gamificação). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- decia_points_rules (DeciaPointsRule — 8 Gamificação; RF42, RF18)
-- Catálogo de regras de pontos por evento, com tetos. RESTRICT (referenciada pelo extrato).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decia_points_rules (
    id                      BINARY(16)      NOT NULL,
    event_code              VARCHAR(30)     NOT NULL,
    points                  INT             NOT NULL DEFAULT 0,
    daily_cap               INT             NULL,
    weekly_cap              INT             NULL,
    per_session_cap         INT             NULL,
    once_per_ref            BOOLEAN         NOT NULL DEFAULT FALSE,
    multiplier_source       VARCHAR(60)     NULL,
    valid_from              TIMESTAMP(6)    NOT NULL,
    valid_to                TIMESTAMP(6)    NULL,
    active                  BOOLEAN         NOT NULL DEFAULT TRUE,
    edited_by               BINARY(16)      NULL,
    description             VARCHAR(500)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_decia_points_rules__edited_by FOREIGN KEY (edited_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decia_points_rules_event_code CHECK (event_code IN ('ARGUMENTO_EVIDENCIA', 'CONSENSO', 'DIVERGENCIA_RESOLVIDA', 'PERGUNTA_RESPONDIDA', 'ARTEFATO_USADO', 'DECISAO_VALIDADA', 'PRESENCA_ENCERRADA', 'REACAO_QUALIDADE', 'ATA_RATIFICADA', 'ENCAMINHAMENTO_CUMPRIDO', 'META_ATINGIDA', 'BENEFICIO_BONUS', 'COMPRA_LOJA', 'VENDA_BALCAO', 'DOACAO_ENVIADA', 'DOACAO_RECEBIDA', 'ESTORNO', 'EXPIRACAO')),
    INDEX ix_decia_points_rules_event_code_active_valid_from (event_code, active, valid_from)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decia_points_ledger (DeciaPointsLedgerEntry — 8 Gamificação; RF42, RF19, RF35, RF39, RF40, RF43, RF45)
-- Extrato de DECIA Points, append-only. RESTRICT em tudo (financeiro): usuário, contraparte, revisor, regra,
-- sessão.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decia_points_ledger (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    delta                   BIGINT          NOT NULL DEFAULT 0,
    event_code              VARCHAR(30)     NOT NULL,
    ref_type                VARCHAR(40)     NULL,
    ref_id                  BINARY(16)      NULL,
    session_id              BINARY(16)      NULL,
    rule_version_id         BINARY(16)      NULL,
    quality_multiplier      DECIMAL(3,2)    NOT NULL DEFAULT 1.00,
    idempotency_key         VARCHAR(160)    NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'CONFIRMADO',
    suspended_reason        VARCHAR(300)    NULL,
    reviewed_by             BINARY(16)      NULL,
    counterparty_user_id    BINARY(16)      NULL,
    correlation_id          VARCHAR(64)     NULL,
    expires_at              TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_decia_points_ledger_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT fk_decia_points_ledger__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decia_points_ledger__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decia_points_ledger__rule_version_id FOREIGN KEY (rule_version_id) REFERENCES decia_points_rules (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decia_points_ledger__reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decia_points_ledger__counterparty_user_id FOREIGN KEY (counterparty_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decia_points_ledger_event_code CHECK (event_code IN ('ARGUMENTO_EVIDENCIA', 'CONSENSO', 'DIVERGENCIA_RESOLVIDA', 'PERGUNTA_RESPONDIDA', 'ARTEFATO_USADO', 'DECISAO_VALIDADA', 'PRESENCA_ENCERRADA', 'REACAO_QUALIDADE', 'ATA_RATIFICADA', 'ENCAMINHAMENTO_CUMPRIDO', 'META_ATINGIDA', 'BENEFICIO_BONUS', 'COMPRA_LOJA', 'VENDA_BALCAO', 'DOACAO_ENVIADA', 'DOACAO_RECEBIDA', 'ESTORNO', 'EXPIRACAO')),
    CONSTRAINT ck_decia_points_ledger_status CHECK (status IN ('CONFIRMADO', 'SUSPENSO', 'ESTORNADO')),
    CONSTRAINT ck_decia_points_ledger_c1 CHECK (quality_multiplier BETWEEN 0.5 AND 2.0),
    INDEX ix_decia_points_ledger_user_created_at (user_id, created_at),
    INDEX ix_decia_points_ledger_user_status (user_id, status),
    INDEX ix_decia_points_ledger_event_code_created_at (event_code, created_at),
    INDEX ix_decia_points_ledger_expires_at (expires_at),
    INDEX ix_decia_points_ledger_session (session_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- ai_credit_ledger (AiCreditLedgerEntry — 8 Gamificação; RF42, RF39, RF43)
-- Extrato de créditos de IA (append-only). user_id/department_id RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE ai_credit_ledger (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NULL,
    department_id           BINARY(16)      NULL,
    delta                   BIGINT          NOT NULL DEFAULT 0,
    source                  VARCHAR(20)     NOT NULL,
    ref_id                  BINARY(16)      NULL,
    expires_at              TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_credit_ledger__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_ai_credit_ledger__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_ai_credit_ledger_source CHECK (source IN ('COMPRA', 'BENEFICIO', 'CONSUMO', 'EXPIRACAO', 'MENSAL')),
    INDEX ix_ai_credit_ledger_user_created_at (user_id, created_at),
    INDEX ix_ai_credit_ledger_department_created_at (department_id, created_at),
    INDEX ix_ai_credit_ledger_expires_at (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- points_donations (PointsDonation — 8 Gamificação; RF42)
-- Doações (par de lançamentos). RESTRICT em pessoas e lançamentos.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE points_donations (
    id                      BINARY(16)      NOT NULL,
    from_user_id            BINARY(16)      NOT NULL,
    to_user_id              BINARY(16)      NOT NULL,
    points                  INT             NOT NULL DEFAULT 0,
    message                 VARCHAR(300)    NULL,
    ledger_debit_id         BINARY(16)      NOT NULL,
    ledger_credit_id        BINARY(16)      NOT NULL,
    month_key               CHAR(7)         NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_points_donations__from_user_id FOREIGN KEY (from_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_points_donations__to_user_id FOREIGN KEY (to_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_points_donations__ledger_debit_id FOREIGN KEY (ledger_debit_id) REFERENCES decia_points_ledger (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_points_donations__ledger_credit_id FOREIGN KEY (ledger_credit_id) REFERENCES decia_points_ledger (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_points_donations_c1 CHECK (points > 0),
    CONSTRAINT ck_points_donations_c2 CHECK (from_user_id <> to_user_id),
    INDEX ix_points_donations_from_user_month_key (from_user_id, month_key),
    INDEX ix_points_donations_to_user_month_key (to_user_id, month_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- collective_goals (CollectiveGoal — 8 Gamificação; RF35, RF21, RF27, RF39, RF42)
-- Metas por empresa/departamento. Criador RESTRICT; catálogos RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE collective_goals (
    id                      BINARY(16)      NOT NULL,
    creator_id              BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    title                   VARCHAR(200)    NOT NULL,
    description             TEXT            NULL,
    criterion_json          JSON            NOT NULL,
    period_from             DATE            NOT NULL,
    period_to               DATE            NOT NULL,
    reward_points_per_participant INT             NOT NULL DEFAULT 0,
    recognition_template_json JSON            NULL,
    min_effort_check        BOOLEAN         NOT NULL DEFAULT TRUE,
    progress                DECIMAL(4,3)    NOT NULL DEFAULT 0,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ABERTA',
    achieved_at             TIMESTAMP(6)    NULL,
    ledger_batch_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_collective_goals__creator_id FOREIGN KEY (creator_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_collective_goals__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_collective_goals__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_collective_goals_status CHECK (status IN ('ABERTA', 'ATINGIDA', 'EXPIRADA')),
    CONSTRAINT ck_collective_goals_c1 CHECK (progress BETWEEN 0 AND 1),
    INDEX ix_collective_goals_department_status_period_to (department_id, status, period_to),
    INDEX ix_collective_goals_company_status (company_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- goal_participants (GoalParticipant — 8 Gamificação; RF35)
-- Participantes (filho → CASCADE; pessoa → CASCADE).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE goal_participants (
    id                      BINARY(16)      NOT NULL,
    goal_id                 BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    joined_at               TIMESTAMP(6)    NOT NULL,
    contribution_json       JSON            NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_goal_participants_goal_user UNIQUE (goal_id, user_id),
    CONSTRAINT fk_goal_participants__goal_id FOREIGN KEY (goal_id) REFERENCES collective_goals (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_goal_participants__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- highlights (Highlight — 8 Gamificação; RF35, RF27, RF39)
-- Destaques mensais por empresa/departamento. Catálogos e curador RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE highlights (
    id                      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    month_key               CHAR(7)         NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    algorithm_score_json    JSON            NULL,
    curated_by              BINARY(16)      NULL,
    position                INT             NOT NULL DEFAULT 0,
    published_at            TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_highlights_company_department_month_key_target_type_target UNIQUE (company_id, department_id, month_key, target_type, target_id),
    CONSTRAINT fk_highlights__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_highlights__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_highlights__curated_by FOREIGN KEY (curated_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_highlights_target_type CHECK (target_type IN ('PROJECT', 'DECISION', 'USER')),
    INDEX ix_highlights_month_key_position (month_key, position)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- recognitions (Recognition — 8 Gamificação; RF35, RF28, RF19, RF39, RF42)
-- Reconhecimentos emitidos a pessoas. Emissor RESTRICT; recebedor RESTRICT (trilha de mérito).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE recognitions (
    id                      BINARY(16)      NOT NULL,
    issuer_user_id          BINARY(16)      NOT NULL,
    recipient_user_id       BINARY(16)      NOT NULL,
    name                    VARCHAR(160)    NOT NULL,
    medal_art_json          JSON            NULL,
    criterion               VARCHAR(500)    NULL,
    source                  VARCHAR(20)     NOT NULL DEFAULT 'MANUAL',
    source_id               BINARY(16)      NULL,
    valid_until             DATE            NULL,
    issued_at               TIMESTAMP(6)    NOT NULL,
    public_on_mural         BOOLEAN         NOT NULL DEFAULT TRUE,
    certificate_media_id    BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_recognitions__issuer_user_id FOREIGN KEY (issuer_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_recognitions__recipient_user_id FOREIGN KEY (recipient_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_recognitions__certificate_media_id FOREIGN KEY (certificate_media_id) REFERENCES media_objects (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_recognitions_source CHECK (source IN ('MANUAL', 'META', 'BENEFICIO')),
    INDEX ix_recognitions_recipient_user_issued_at (recipient_user_id, issued_at),
    INDEX ix_recognitions_issuer_user (issuer_user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- week_plans (WeekPlan — 8 Gamificação; RF44, RF19)
-- Plano semanal por pessoa (dono → CASCADE). Único (user, week_start).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE week_plans (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    week_start              DATE            NOT NULL,
    streak                  INT             NOT NULL DEFAULT 0,
    closing_hse             DECIMAL(6,2)    NULL,
    recommendation          VARCHAR(1000)   NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT ux_week_plans_user_week_start UNIQUE (user_id, week_start),
    CONSTRAINT fk_week_plans__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- week_plan_days (WeekPlanDay — 8 Gamificação; RF44)
-- Dias do plano (filho → CASCADE); tarefa SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE week_plan_days (
    id                      BINARY(16)      NOT NULL,
    week_plan_id            BINARY(16)      NOT NULL,
    plan_date               DATE            NOT NULL,
    task_id                 BINARY(16)      NULL,
    sort_order              INT             NOT NULL DEFAULT 0,
    meetings_json           JSON            NULL,
    load_pct                DECIMAL(5,2)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_week_plan_days__week_plan_id FOREIGN KEY (week_plan_id) REFERENCES week_plans (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_week_plan_days__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    INDEX ix_week_plan_days_week_plan_plan_date (week_plan_id, plan_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- daily_tasks (DailyTask — 8 Gamificação; RF44, RF19, RF43, RF45, RF46)
-- Sugestão diária e feedback. Dono → CASCADE; tarefa RESTRICT (a tarefa do dia segura a tarefa); delegado SET
-- NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE daily_tasks (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    task_date               DATE            NOT NULL,
    task_id                 BINARY(16)      NOT NULL,
    suggested_by_ai         BOOLEAN         NOT NULL DEFAULT FALSE,
    priority_index_json     JSON            NULL,
    hse_predicted_json      JSON            NULL,
    hse_realized_json       JSON            NULL,
    feedback                VARCHAR(20)     NULL,
    feedback_at             TIMESTAMP(6)    NULL,
    actual_hours            DECIMAL(6,2)    NULL,
    swap_reason             VARCHAR(300)    NULL,
    swapped_from_task_id    BINARY(16)      NULL,
    delegated_to_user_id    BINARY(16)      NULL,
    blocked_by_ref          VARCHAR(200)    NULL,
    week_plan_day_id        BINARY(16)      NULL,
    ai_inference_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT ux_daily_tasks_user_task_date UNIQUE (user_id, task_date),
    CONSTRAINT fk_daily_tasks__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_daily_tasks__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_daily_tasks__swapped_from_task_id FOREIGN KEY (swapped_from_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_daily_tasks__delegated_to_user_id FOREIGN KEY (delegated_to_user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_daily_tasks__week_plan_day_id FOREIGN KEY (week_plan_day_id) REFERENCES week_plan_days (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_daily_tasks__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_daily_tasks_feedback CHECK (feedback IS NULL OR feedback IN ('CONCLUI', 'ADIEI', 'BLOQUEADA', 'DELEGUEI')),
    INDEX ix_daily_tasks_task (task_id),
    INDEX ix_daily_tasks_week_plan_day (week_plan_day_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- hse_weights (HseWeights — 8 Gamificação; RF44, RF43)
-- Pesos versionados do HSE (catálogo → RESTRICT).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE hse_weights (
    id                      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NULL,
    version                 INT             NOT NULL DEFAULT 0,
    weights_json            JSON            NOT NULL,
    valid_from              TIMESTAMP(6)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_hse_weights_company_version UNIQUE (company_id, version),
    CONSTRAINT fk_hse_weights__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- hse_snapshots (EfficiencyScoreSnapshot — 8 Gamificação; RF44, RF43, RF45, RF3)
-- HSE por pessoa e dia (dono → CASCADE). Único (user, date).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE hse_snapshots (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    score_date              DATE            NOT NULL,
    hse                     DECIMAL(6,2)    NOT NULL,
    moving_avg7             DECIMAL(6,2)    NULL,
    weights_version         INT             NOT NULL DEFAULT 0,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_hse_snapshots_user_score_date UNIQUE (user_id, score_date),
    CONSTRAINT fk_hse_snapshots__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- hype_bands (HypeBand — 8 Gamificação; RF45)
-- Faixas por empresa (catálogo → RESTRICT). Nomes configuráveis.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE hype_bands (
    id                      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NULL,
    code                    VARCHAR(40)     NOT NULL,
    min_score               SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    max_score               SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    name                    VARCHAR(80)     NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_hype_bands__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_hype_bands_c1 CHECK (min_score <= max_score),
    INDEX ix_hype_bands_company_min_score (company_id, min_score)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- profile_hype_scores (ProfileHypeScore — 8 Gamificação; RF45, RF19, RF28, RF43, RF3)
-- Hype diário por pessoa (dono → CASCADE). Único (user, date); idempotente por chave.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE profile_hype_scores (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    score_date              DATE            NOT NULL,
    score                   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    band_code               VARCHAR(40)     NOT NULL,
    blocks_json             JSON            NOT NULL,
    bayesian_priors_json    JSON            NULL,
    half_life_days          INT             NOT NULL DEFAULT 180,
    percentile_in_dept      DECIMAL(5,2)    NULL,
    top_positive_events_json JSON            NULL,
    top_negative_events_json JSON            NULL,
    suggestions_json        JSON            NULL,
    weights_version         INT             NOT NULL DEFAULT 0,
    ai_inference_id         BINARY(16)      NULL,
    idempotency_key         VARCHAR(120)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_profile_hype_scores_user_score_date UNIQUE (user_id, score_date),
    CONSTRAINT ux_profile_hype_scores_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT fk_profile_hype_scores__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_profile_hype_scores__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_profile_hype_scores_c1 CHECK (score BETWEEN 0 AND 1000)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- hype_ignored_events (HypeIgnoredEvent — 8 Gamificação; RF45)
-- Trilha de eventos ignorados (append-only; user RESTRICT).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE hype_ignored_events (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    event_type              VARCHAR(60)     NOT NULL,
    event_id                BINARY(16)      NOT NULL,
    reason                  VARCHAR(20)     NOT NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_hype_ignored_events__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_hype_ignored_events_reason CHECK (reason IN ('NAO_VERIFICADO', 'AUTO_INTERACAO', 'ANTIFRAUDE')),
    INDEX ix_hype_ignored_events_user_at (user_id, at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- deliberative_profiles (DeliberativeProfile — 8 Gamificação; RF43, RF19, RF45)
-- Perfil deliberativo por pessoa e período (dono → CASCADE). Único (user, period_key).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE deliberative_profiles (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    period_key              VARCHAR(40)     NOT NULL,
    clarity                 DECIMAL(5,2)    NOT NULL,
    evidence_use            DECIMAL(5,2)    NOT NULL,
    consistency             DECIMAL(5,2)    NOT NULL,
    completeness            DECIMAL(5,2)    NOT NULL,
    reuse                   DECIMAL(5,2)    NOT NULL,
    delta_json              JSON            NULL,
    badges_json             JSON            NULL,
    public_indicators_json  JSON            NULL,
    ai_insights_json        JSON            NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_deliberative_profiles_user_period_key UNIQUE (user_id, period_key),
    CONSTRAINT fk_deliberative_profiles__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- ranking_weights (RankingWeights — 8 Gamificação; RF43, RF28)
-- Pesos versionados (catálogo → RESTRICT; Company.rankingWeightsId aponta para o vigente).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE ranking_weights (
    id                      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NULL,
    version                 INT             NOT NULL DEFAULT 0,
    weights_json            JSON            NOT NULL,
    criteria_public_text    TEXT            NULL,
    valid_from              TIMESTAMP(6)    NOT NULL,
    edited_by               BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_ranking_weights_company_version UNIQUE (company_id, version),
    CONSTRAINT fk_ranking_weights__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_ranking_weights__edited_by FOREIGN KEY (edited_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- ranking_entries (RankingEntry — 8 Gamificação; RF43, RF19, RF28, RF3)
-- Rankings materializados por período (dono → CASCADE). Único (scope, scope_id, period, dimension, user).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE ranking_entries (
    id                      BINARY(16)      NOT NULL,
    scope                   VARCHAR(20)     NOT NULL,
    scope_id                BINARY(16)      NOT NULL,
    period_key              CHAR(7)         NOT NULL,
    dimension               VARCHAR(30)     NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    value                   DECIMAL(12,4)   NOT NULL,
    position                INT             NOT NULL DEFAULT 0,
    explanation_json        JSON            NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_ranking_entries_scope_scope_period_key_dimension_user UNIQUE (scope, scope_id, period_key, dimension, user_id),
    CONSTRAINT fk_ranking_entries__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_ranking_entries_scope CHECK (scope IN ('DEPARTAMENTO', 'EMPRESA')),
    CONSTRAINT ck_ranking_entries_dimension CHECK (dimension IN ('QUALIDADE_DELIBERATIVA', 'DECIA_POINTS', 'REUTILIZACAO', 'RASTRO_CONFORMIDADE', 'PONTUALIDADE_SPI', 'HSE_MEDIO', 'HYPE_PERFIL')),
    INDEX ix_ranking_entries_scope_scope_period_key_dimension_position (scope, scope_id, period_key, dimension, position)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE companies ADD CONSTRAINT fk_companies__ranking_weights_id FOREIGN KEY (ranking_weights_id) REFERENCES ranking_weights (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE remixes ADD CONSTRAINT fk_remixes__ledger_entry_id FOREIGN KEY (ledger_entry_id) REFERENCES decia_points_ledger (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;
