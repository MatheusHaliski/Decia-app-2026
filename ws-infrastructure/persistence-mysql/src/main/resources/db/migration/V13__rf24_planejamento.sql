-- V13 — rf24_planejamento (4 Planejamento institucional). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- annual_plans (AnnualPlan — 4 Planejamento institucional; RF24, RF11, RF21, RF39, RF44)
-- Plano anual por escopo (empresa, departamento, pessoal). Dono → CASCADE; catálogos RESTRICT; plano de origem
-- SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE annual_plans (
    id                      BINARY(16)      NOT NULL,
    owner_id                BINARY(16)      NOT NULL,
    scope                   VARCHAR(20)     NOT NULL,
    company_id              BINARY(16)      NULL,
    department_id           BINARY(16)      NULL,
    exercise_year           SMALLINT        NOT NULL DEFAULT 0,
    title                   VARCHAR(200)    NOT NULL,
    identity_phrase         VARCHAR(300)    NULL,
    derived_from_plan_id    BINARY(16)      NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'RASCUNHO',
    visibility              VARCHAR(20)     NOT NULL DEFAULT 'DEPARTAMENTO',
    cover_url               VARCHAR(500)    NULL,
    background_json         JSON            NULL,
    creation_mode           VARCHAR(20)     NOT NULL DEFAULT 'MANUAL',
    ai_explanation_json     JSON            NULL,
    likes_count             BIGINT          NOT NULL DEFAULT 0,
    comments_count          BIGINT          NOT NULL DEFAULT 0,
    saves_count             BIGINT          NOT NULL DEFAULT 0,
    shares_count            BIGINT          NOT NULL DEFAULT 0,
    views_count             BIGINT          NOT NULL DEFAULT 0,
    seal_ids_json           JSON            NULL,
    published_at            TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_annual_plans__owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_annual_plans__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_annual_plans__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_annual_plans__derived_from_plan_id FOREIGN KEY (derived_from_plan_id) REFERENCES annual_plans (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_annual_plans_scope CHECK (scope IN ('EMPRESA', 'DEPARTAMENTO', 'PESSOAL')),
    CONSTRAINT ck_annual_plans_status CHECK (status IN ('RASCUNHO', 'PUBLICADO', 'ENCERRADO')),
    CONSTRAINT ck_annual_plans_visibility CHECK (visibility IN ('PRIVADA', 'DEPARTAMENTO', 'EMPRESA', 'PUBLICA')),
    CONSTRAINT ck_annual_plans_creation_mode CHECK (creation_mode IN ('MANUAL', 'COM_IA')),
    INDEX ix_annual_plans_owner_exercise_year (owner_id, exercise_year),
    INDEX ix_annual_plans_company_exercise_year_status (company_id, exercise_year, status),
    INDEX ix_annual_plans_department_exercise_year (department_id, exercise_year)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- plan_axes (PlanAxis — 4 Planejamento institucional; RF24, RF21, RF31, RF32)
-- Eixos do plano (posição 1..6). Filho do plano → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE plan_axes (
    id                      BINARY(16)      NOT NULL,
    plan_id                 BINARY(16)      NOT NULL,
    position                TINYINT UNSIGNED NOT NULL DEFAULT 0,
    name                    VARCHAR(120)    NOT NULL,
    goal                    VARCHAR(500)    NULL,
    indicator               VARCHAR(200)    NULL,
    target_value            VARCHAR(80)     NULL,
    color                   VARCHAR(40)     NULL,
    icon                    VARCHAR(60)     NULL,
    projects_count          INT             NOT NULL DEFAULT 0,
    completed_pct           DECIMAL(5,2)    NOT NULL DEFAULT 0,
    nearest_due_at          DATE            NULL,
    aggregated_risk         VARCHAR(20)     NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_plan_axes_plan_position UNIQUE (plan_id, position),
    CONSTRAINT fk_plan_axes__plan_id FOREIGN KEY (plan_id) REFERENCES annual_plans (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_plan_axes_aggregated_risk CHECK (aggregated_risk IS NULL OR aggregated_risk IN ('BAIXO', 'MEDIO', 'ALTO')),
    CONSTRAINT ck_plan_axes_c1 CHECK (position BETWEEN 1 AND 6)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- plan_axis_projects (PlanAxisProject — 4 Planejamento institucional; RF24, RF21)
-- Projetos por eixo. plan_id desnormalizado para garantir um eixo por plano. Filho do eixo/projeto → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE plan_axis_projects (
    id                      BINARY(16)      NOT NULL,
    plan_id                 BINARY(16)      NOT NULL,
    axis_id                 BINARY(16)      NOT NULL,
    project_id              BINARY(16)      NOT NULL,
    linked_by               BINARY(16)      NOT NULL,
    linked_at               TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_plan_axis_projects_plan_project UNIQUE (plan_id, project_id),
    CONSTRAINT fk_plan_axis_projects__plan_id FOREIGN KEY (plan_id) REFERENCES annual_plans (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_plan_axis_projects__axis_id FOREIGN KEY (axis_id) REFERENCES plan_axes (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_plan_axis_projects__project_id FOREIGN KEY (project_id) REFERENCES project_schemes (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_plan_axis_projects__linked_by FOREIGN KEY (linked_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX ix_plan_axis_projects_project (project_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- groupings (Grouping — 4 Planejamento institucional; RF25, RF19, RF28, RF36)
-- Programas, exercícios, gestões e frentes. Dono → CASCADE; catálogos RESTRICT; dossiê de encerramento SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE groupings (
    id                      BINARY(16)      NOT NULL,
    owner_id                BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NULL,
    department_id           BINARY(16)      NULL,
    type                    VARCHAR(20)     NOT NULL,
    label                   VARCHAR(160)    NOT NULL,
    description             TEXT            NULL,
    cover_url               VARCHAR(500)    NULL,
    period_from             DATE            NULL,
    period_to               DATE            NULL,
    accent_color            VARCHAR(40)     NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ATIVO',
    closed_at               TIMESTAMP(6)    NULL,
    handoff_dossier_id      BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_groupings__owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_groupings__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_groupings__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_groupings_type CHECK (type IN ('PROGRAMA', 'EXERCICIO', 'GESTAO', 'FRENTE')),
    CONSTRAINT ck_groupings_status CHECK (status IN ('ATIVO', 'ENCERRADO')),
    INDEX ix_groupings_company_type_status (company_id, type, status),
    INDEX ix_groupings_department_type (department_id, type),
    INDEX ix_groupings_owner (owner_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- grouping_items (GroupingItem — 4 Planejamento institucional; RF25)
-- Itens do agrupamento (alvo polimórfico). Filho → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE grouping_items (
    id                      BINARY(16)      NOT NULL,
    grouping_id             BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    added_at                TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_grouping_items_grouping_target_type_target UNIQUE (grouping_id, target_type, target_id),
    CONSTRAINT fk_grouping_items__grouping_id FOREIGN KEY (grouping_id) REFERENCES groupings (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_grouping_items_target_type CHECK (target_type IN ('PROJECT', 'TASK')),
    INDEX ix_grouping_items_target_type_target (target_type, target_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE project_schemes ADD CONSTRAINT fk_project_schemes__program_grouping_id FOREIGN KEY (program_grouping_id) REFERENCES groupings (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE project_schemes ADD CONSTRAINT fk_project_schemes__exercise_grouping_id FOREIGN KEY (exercise_grouping_id) REFERENCES groupings (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE project_schemes ADD CONSTRAINT fk_project_schemes__management_grouping_id FOREIGN KEY (management_grouping_id) REFERENCES groupings (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE project_schemes ADD CONSTRAINT fk_project_schemes__plan_axis_id FOREIGN KEY (plan_axis_id) REFERENCES plan_axes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;
