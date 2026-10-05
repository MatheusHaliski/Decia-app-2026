-- V12 — rf21_criador_projetos (3 Criador de Projetos). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- project_schemes (ProjectScheme — 3 Criador de Projetos; RF21, RF22, RF23, RF24, RF25, RF29, RF30, RF31, RF32, RF43)
-- Esquema de Projeto. Dono → CASCADE; catálogos RESTRICT; origem (remix/modelo/sessão) e agrupamentos SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE project_schemes (
    id                      BINARY(16)      NOT NULL,
    owner_id                BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NULL,
    department_id           BINARY(16)      NULL,
    title                   VARCHAR(200)    NOT NULL,
    emoji                   VARCHAR(16)     NULL,
    icon_id                 VARCHAR(60)     NULL,
    objective               VARCHAR(300)    NULL,
    description_md          MEDIUMTEXT      NULL,
    process_tags_json       JSON            NULL,
    nature_tags_json        JSON            NULL,
    creation_mode           VARCHAR(20)     NOT NULL DEFAULT 'MANUAL',
    origin                  VARCHAR(20)     NOT NULL DEFAULT 'CRIAR_PROJETO',
    original_project_id     BINARY(16)      NULL,
    source_session_id       BINARY(16)      NULL,
    ai_orientation          TEXT            NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'RASCUNHO',
    current_phase           VARCHAR(20)     NOT NULL DEFAULT 'DEMANDA',
    priority                VARCHAR(20)     NOT NULL DEFAULT 'MEDIA',
    visibility              VARCHAR(20)     NOT NULL DEFAULT 'PRIVADA',
    exercise_year           INT             NULL,
    program_grouping_id     BINARY(16)      NULL,
    exercise_grouping_id    BINARY(16)      NULL,
    management_grouping_id  BINARY(16)      NULL,
    plan_axis_id            BINARY(16)      NULL,
    cover_mode              VARCHAR(20)     NOT NULL DEFAULT 'MOSAICO',
    cover_url               VARCHAR(500)    NULL,
    mosaic_json             JSON            NULL,
    desk_skin               VARCHAR(40)     NULL,
    desk_background_json    JSON            NULL,
    conformity_percent      DECIMAL(5,2)    NULL,
    has_blocking_pending    BOOLEAN         NOT NULL DEFAULT FALSE,
    critical_path_json      JSON            NULL,
    evm_json                JSON            NULL,
    next_milestone_at       DATE            NULL,
    last_decia_event_at     TIMESTAMP(6)    NULL,
    last_decia_event_label  VARCHAR(120)    NULL,
    offered_in_counter      BOOLEAN         NOT NULL DEFAULT FALSE,
    ai_generated            BOOLEAN         NOT NULL DEFAULT FALSE,
    ai_inference_id         BINARY(16)      NULL,
    likes_count             BIGINT          NOT NULL DEFAULT 0,
    comments_count          BIGINT          NOT NULL DEFAULT 0,
    saves_count             BIGINT          NOT NULL DEFAULT 0,
    shares_count            BIGINT          NOT NULL DEFAULT 0,
    remixes_count           BIGINT          NOT NULL DEFAULT 0,
    views_count             BIGINT          NOT NULL DEFAULT 0,
    seal_ids_json           JSON            NULL,
    autosave_draft_json     JSON            NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_project_schemes__owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_project_schemes__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_project_schemes__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_project_schemes__original_project_id FOREIGN KEY (original_project_id) REFERENCES project_schemes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_project_schemes__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_project_schemes_creation_mode CHECK (creation_mode IN ('MANUAL', 'COM_IA')),
    CONSTRAINT ck_project_schemes_origin CHECK (origin IN ('CRIAR_PROJETO', 'DECIA', 'REMIX', 'AUTOPILOTO', 'MODELO', 'CENARIO', 'DOSSIE', 'ATA_VIVA')),
    CONSTRAINT ck_project_schemes_status CHECK (status IN ('RASCUNHO', 'PUBLICADO', 'EM_DECISAO', 'APROVADO', 'EM_EXECUCAO', 'CONCLUIDO', 'ARQUIVADO', 'DEVOLVIDO')),
    CONSTRAINT ck_project_schemes_current_phase CHECK (current_phase IN ('DEMANDA', 'PLANEJAMENTO', 'ELABORACAO', 'ANALISE', 'APROVACAO', 'EXECUCAO', 'ENCERRAMENTO')),
    CONSTRAINT ck_project_schemes_priority CHECK (priority IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    CONSTRAINT ck_project_schemes_visibility CHECK (visibility IN ('PRIVADA', 'DEPARTAMENTO', 'EMPRESA', 'PUBLICA')),
    CONSTRAINT ck_project_schemes_cover_mode CHECK (cover_mode IN ('MOSAICO', 'FOTO', 'IA')),
    CONSTRAINT ck_project_schemes_c1 CHECK (conformity_percent IS NULL OR conformity_percent BETWEEN 0 AND 100),
    INDEX ix_project_schemes_owner_status (owner_id, status),
    INDEX ix_project_schemes_department_status (department_id, status),
    INDEX ix_project_schemes_company_exercise_year (company_id, exercise_year),
    INDEX ix_project_schemes_status_visibility (status, visibility),
    INDEX ix_project_schemes_plan_axis (plan_axis_id),
    INDEX ix_project_schemes_next_milestone_at (next_milestone_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- project_tasks (ProjectTask — 3 Criador de Projetos; RF21, RF22, RF23, RF29, RF43, RF44)
-- Tarefas do esquema por fase. task_id SET NULL + snapshot_json (Q-31). Filho do projeto → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE project_tasks (
    id                      BINARY(16)      NOT NULL,
    project_id              BINARY(16)      NOT NULL,
    task_id                 BINARY(16)      NULL,
    phase                   VARCHAR(20)     NOT NULL,
    sort_order              INT             NOT NULL DEFAULT 0,
    responsible_id          BINARY(16)      NULL,
    due_at                  DATE            NULL,
    start_at                DATE            NULL,
    estimated_hours         DECIMAL(8,2)    NULL,
    pert_optimistic         DECIMAL(8,2)    NULL,
    pert_most_likely        DECIMAL(8,2)    NULL,
    pert_pessimistic        DECIMAL(8,2)    NULL,
    actual_hours            DECIMAL(8,2)    NULL,
    percent_complete        TINYINT UNSIGNED NOT NULL DEFAULT 0,
    planned_value           DECIMAL(16,2)   NULL,
    earned_value            DECIMAL(16,2)   NULL,
    actual_cost             DECIMAL(16,2)   NULL,
    is_critical             BOOLEAN         NOT NULL DEFAULT FALSE,
    slack_days              INT             NULL,
    moscow                  VARCHAR(20)     NULL,
    snapshot_json           JSON            NULL,
    removed_by_author       BOOLEAN         NOT NULL DEFAULT FALSE,
    canvas_x                DECIMAL(10,3)   NULL,
    canvas_y                DECIMAL(10,3)   NULL,
    canvas_scale            DECIMAL(6,3)    NULL,
    canvas_rotation         DECIMAL(6,2)    NULL,
    canvas_layer            INT             NULL,
    sticky_color            VARCHAR(40)     NULL,
    decision_trace_node_id  BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_project_tasks__project_id FOREIGN KEY (project_id) REFERENCES project_schemes (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_project_tasks__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_project_tasks__responsible_id FOREIGN KEY (responsible_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_project_tasks_phase CHECK (phase IN ('DEMANDA', 'PLANEJAMENTO', 'ELABORACAO', 'ANALISE', 'APROVACAO', 'EXECUCAO', 'ENCERRAMENTO')),
    CONSTRAINT ck_project_tasks_moscow CHECK (moscow IS NULL OR moscow IN ('MUST', 'SHOULD', 'COULD', 'WONT')),
    CONSTRAINT ck_project_tasks_c1 CHECK (percent_complete BETWEEN 0 AND 100),
    INDEX ix_project_tasks_project_phase_sort_order (project_id, phase, sort_order),
    INDEX ix_project_tasks_task (task_id),
    INDEX ix_project_tasks_responsible_due_at (responsible_id, due_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- project_task_dependencies (ProjectTaskDependency — 3 Criador de Projetos; RF21, RF43)
-- Arestas do grafo de precedência. Filho do projeto e das duas tarefas → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE project_task_dependencies (
    id                      BINARY(16)      NOT NULL,
    project_id              BINARY(16)      NOT NULL,
    predecessor_project_task_id BINARY(16)      NOT NULL,
    successor_project_task_id BINARY(16)      NOT NULL,
    type                    VARCHAR(20)     NOT NULL DEFAULT 'FS',
    lag_days                INT             NOT NULL DEFAULT 0,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_project_task_dependencies_predecessor_project_task_s_aa482624 UNIQUE (predecessor_project_task_id, successor_project_task_id),
    CONSTRAINT fk_project_task_dependencies__project_id FOREIGN KEY (project_id) REFERENCES project_schemes (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_project_task_dependencies__predecessor_project_task_id FOREIGN KEY (predecessor_project_task_id) REFERENCES project_tasks (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_project_task_dependencies__successor_project_task_id FOREIGN KEY (successor_project_task_id) REFERENCES project_tasks (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_project_task_dependencies_type CHECK (type IN ('FS', 'SS', 'FF', 'SF')),
    CONSTRAINT ck_project_task_dependencies_c1 CHECK (predecessor_project_task_id <> successor_project_task_id),
    INDEX ix_project_task_dependencies_project (project_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- project_scenarios (ProjectScenario — 3 Criador de Projetos; RF31, RF11, RF29)
-- Cenários simulados por projeto. Filho do projeto → CASCADE; autor → CASCADE; sessão/versão SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE project_scenarios (
    id                      BINARY(16)      NOT NULL,
    project_id              BINARY(16)      NOT NULL,
    author_id               BINARY(16)      NOT NULL,
    name                    VARCHAR(120)    NOT NULL,
    variables_json          JSON            NOT NULL,
    impact_report_json      JSON            NULL,
    recalculated_timeline_json JSON            NULL,
    risk_by_phase_json      JSON            NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'RASCUNHO',
    applied_version_id      BINARY(16)      NULL,
    shared_in_session_id    BINARY(16)      NULL,
    ai_inference_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_project_scenarios__project_id FOREIGN KEY (project_id) REFERENCES project_schemes (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_project_scenarios__author_id FOREIGN KEY (author_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_project_scenarios__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_project_scenarios_status CHECK (status IN ('RASCUNHO', 'SALVO', 'APLICADO', 'DESCARTADO')),
    INDEX ix_project_scenarios_project_status (project_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- project_versions (ProjectVersion — 3 Criador de Projetos; RF22, RF31)
-- Histórico de versões (append-only por projeto). Autor RESTRICT; restauração/cenário de origem SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE project_versions (
    id                      BINARY(16)      NOT NULL,
    project_id              BINARY(16)      NOT NULL,
    version_number          INT             NOT NULL DEFAULT 0,
    author_id               BINARY(16)      NOT NULL,
    diff_json               JSON            NULL,
    snapshot_json           JSON            NOT NULL,
    reason                  VARCHAR(500)    NULL,
    restored_from_version_id BINARY(16)      NULL,
    source_scenario_id      BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_project_versions_project_version_number UNIQUE (project_id, version_number),
    CONSTRAINT fk_project_versions__project_id FOREIGN KEY (project_id) REFERENCES project_schemes (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_project_versions__author_id FOREIGN KEY (author_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_project_versions__restored_from_version_id FOREIGN KEY (restored_from_version_id) REFERENCES project_versions (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_project_versions__source_scenario_id FOREIGN KEY (source_scenario_id) REFERENCES project_scenarios (id)
        ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- compliance_checklists (ComplianceChecklist — 3 Criador de Projetos; RF32, RF11, RF39, RF45)
-- Catálogo institucional de checklists (RESTRICT). departmentId nulo = toda a empresa.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE compliance_checklists (
    id                      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    process_tag             VARCHAR(30)     NOT NULL,
    name                    VARCHAR(160)    NOT NULL,
    legal_basis             VARCHAR(300)    NULL,
    active                  BOOLEAN         NOT NULL DEFAULT TRUE,
    checklist_version       INT             NOT NULL DEFAULT 1,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_compliance_checklists__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_compliance_checklists__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_compliance_checklists_process_tag CHECK (process_tag IN ('LICITACAO', 'CONVENIO', 'OBRA', 'REGULARIZACAO_FUNDIARIA', 'PLANEJAMENTO_URBANO', 'ORCAMENTO', 'PESSOAL', 'JURIDICO', 'OUTRO')),
    INDEX ix_compliance_checklists_company_process_tag_active (company_id, process_tag, active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- compliance_items (ComplianceItem — 3 Criador de Projetos; RF32)
-- Itens esperados de um checklist (fase, categoria, tipo, precedência). Filho do checklist → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE compliance_items (
    id                      BINARY(16)      NOT NULL,
    checklist_id            BINARY(16)      NOT NULL,
    label                   VARCHAR(200)    NOT NULL,
    requirement             VARCHAR(20)     NOT NULL DEFAULT 'OBRIGATORIO',
    expected_phase          VARCHAR(20)     NULL,
    expected_category       VARCHAR(40)     NULL,
    expected_type           VARCHAR(30)     NULL,
    must_precede_item_id    BINARY(16)      NULL,
    sort_order              INT             NOT NULL DEFAULT 0,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_compliance_items__checklist_id FOREIGN KEY (checklist_id) REFERENCES compliance_checklists (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_compliance_items__must_precede_item_id FOREIGN KEY (must_precede_item_id) REFERENCES compliance_items (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_compliance_items_requirement CHECK (requirement IN ('OBRIGATORIO', 'RECOMENDADO')),
    CONSTRAINT ck_compliance_items_expected_phase CHECK (expected_phase IS NULL OR expected_phase IN ('DEMANDA', 'PLANEJAMENTO', 'ELABORACAO', 'ANALISE', 'APROVACAO', 'EXECUCAO', 'ENCERRAMENTO')),
    CONSTRAINT ck_compliance_items_expected_category CHECK (expected_category IS NULL OR expected_category IN ('OFICIO_MEMORANDO', 'PARECER_TECNICO', 'ETP', 'TERMO_REFERENCIA', 'PLANILHA_ORCAMENTARIA', 'PROJETO_BASICO_EXECUTIVO', 'CRONOGRAMA', 'ATA', 'PORTARIA_RESOLUCAO', 'CONTRATO_CONVENIO', 'VISTORIA_RELATORIO_FOTOGRAFICO', 'LICENCA_ANUENCIA', 'MAPA_GEORREFERENCIA', 'FORMULARIO', 'OUTRO')),
    CONSTRAINT ck_compliance_items_expected_type CHECK (expected_type IS NULL OR expected_type IN ('TEXTO_MANUAL', 'TEXTO_IA', 'IMAGEM_WEB', 'IMAGEM_EDITADA', 'PLANILHA', 'DOCUMENTO', 'PASTA', 'LINK', 'DESENHO_TECNICO', 'FORMULARIO', 'ATA_REGISTRO', 'EMAIL', 'PROTOCOLO', 'CRONOGRAMA', 'ESTUDO_TECNICO_PRELIMINAR')),
    INDEX ix_compliance_items_checklist_sort_order (checklist_id, sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- compliance_results (ComplianceResult — 3 Criador de Projetos; RF32, RF11, RF39)
-- Resultados de avaliação por projeto × checklist. Filho do projeto → CASCADE; checklist RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE compliance_results (
    id                      BINARY(16)      NOT NULL,
    project_id              BINARY(16)      NOT NULL,
    checklist_id            BINARY(16)      NOT NULL,
    evaluated_at            TIMESTAMP(6)    NOT NULL,
    items_json              JSON            NOT NULL,
    percent                 DECIMAL(5,2)    NOT NULL DEFAULT 0,
    blocking_count          INT             NOT NULL DEFAULT 0,
    override_by_user_id     BINARY(16)      NULL,
    override_reason         VARCHAR(500)    NULL,
    ai_inference_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_compliance_results__project_id FOREIGN KEY (project_id) REFERENCES project_schemes (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_compliance_results__checklist_id FOREIGN KEY (checklist_id) REFERENCES compliance_checklists (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_compliance_results__override_by_user_id FOREIGN KEY (override_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_compliance_results__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_compliance_results_c1 CHECK (percent BETWEEN 0 AND 100),
    INDEX ix_compliance_results_project_evaluated_at (project_id, evaluated_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- process_kits (ProcessKit — 3 Criador de Projetos; RF21, RF40, RF43)
-- Kits de tarefas-modelo por processo. Dono → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE process_kits (
    id                      BINARY(16)      NOT NULL,
    owner_id                BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    name                    VARCHAR(160)    NOT NULL,
    description             TEXT            NULL,
    emoji                   VARCHAR(16)     NULL,
    process_tag             VARCHAR(30)     NULL,
    visibility              VARCHAR(20)     NOT NULL DEFAULT 'PRIVADA',
    offered_in_counter      BOOLEAN         NOT NULL DEFAULT FALSE,
    seal_ids_json           JSON            NULL,
    remix_count             INT             NOT NULL DEFAULT 0,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_process_kits__owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_process_kits__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_process_kits_process_tag CHECK (process_tag IS NULL OR process_tag IN ('LICITACAO', 'CONVENIO', 'OBRA', 'REGULARIZACAO_FUNDIARIA', 'PLANEJAMENTO_URBANO', 'ORCAMENTO', 'PESSOAL', 'JURIDICO', 'OUTRO')),
    CONSTRAINT ck_process_kits_visibility CHECK (visibility IN ('PRIVADA', 'DEPARTAMENTO', 'EMPRESA', 'PUBLICA')),
    INDEX ix_process_kits_owner (owner_id),
    INDEX ix_process_kits_department_process_tag (department_id, process_tag)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- kit_items (KitItem — 3 Criador de Projetos; RF21, RF40)
-- Tarefas que compõem o kit. Filho do kit e da tarefa → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE kit_items (
    id                      BINARY(16)      NOT NULL,
    kit_id                  BINARY(16)      NOT NULL,
    task_id                 BINARY(16)      NOT NULL,
    phase                   VARCHAR(20)     NULL,
    sort_order              INT             NOT NULL DEFAULT 0,
    optional                BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_kit_items_kit_task UNIQUE (kit_id, task_id),
    CONSTRAINT fk_kit_items__kit_id FOREIGN KEY (kit_id) REFERENCES process_kits (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_kit_items__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_kit_items_phase CHECK (phase IS NULL OR phase IN ('DEMANDA', 'PLANEJAMENTO', 'ELABORACAO', 'ANALISE', 'APROVACAO', 'EXECUCAO', 'ENCERRAMENTO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- team_desks (TeamDesk — 3 Criador de Projetos; RF21, RF22)
-- Uma Mesa por departamento (layout de widgets, skin). Catálogo institucional → RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE team_desks (
    id                      BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NOT NULL,
    layout_json             JSON            NULL,
    desk_skin               VARCHAR(20)     NOT NULL DEFAULT 'PAPEL',
    updated_by              BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT ux_team_desks_department_id UNIQUE (department_id),
    CONSTRAINT fk_team_desks__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_team_desks__updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_team_desks_desk_skin CHECK (desk_skin IN ('PAPEL', 'CORTICA', 'BLUEPRINT', 'PAPEL_TIMBRADO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- desk_notes (DeskNote — 3 Criador de Projetos; RF21, RF22)
-- Notas da Mesa pessoal (scope_id = user_id) ou da equipe (scope_id = department_id). Autor → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE desk_notes (
    id                      BINARY(16)      NOT NULL,
    desk_scope              VARCHAR(20)     NOT NULL,
    scope_id                BINARY(16)      NOT NULL,
    author_id               BINARY(16)      NOT NULL,
    content_md              TEXT            NOT NULL,
    color                   VARCHAR(40)     NULL,
    canvas_x                DECIMAL(10,3)   NOT NULL DEFAULT 0,
    canvas_y                DECIMAL(10,3)   NOT NULL DEFAULT 0,
    canvas_scale            DECIMAL(6,3)    NOT NULL DEFAULT 1,
    canvas_rotation         DECIMAL(6,2)    NOT NULL DEFAULT 0,
    canvas_layer            INT             NOT NULL DEFAULT 0,
    pinned                  BOOLEAN         NOT NULL DEFAULT FALSE,
    active                  BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_desk_notes__author_id FOREIGN KEY (author_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_desk_notes_desk_scope CHECK (desk_scope IN ('PESSOAL', 'EQUIPE')),
    INDEX ix_desk_notes_desk_scope_scope_active (desk_scope, scope_id, active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__source_project_id FOREIGN KEY (source_project_id) REFERENCES project_schemes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE tasks ADD CONSTRAINT fk_tasks__checklist_item_id FOREIGN KEY (checklist_item_id) REFERENCES compliance_items (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE task_state_log ADD CONSTRAINT fk_task_state_log__project_id FOREIGN KEY (project_id) REFERENCES project_schemes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE evidences ADD CONSTRAINT fk_evidences__linked_project_id FOREIGN KEY (linked_project_id) REFERENCES project_schemes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE project_scenarios ADD CONSTRAINT fk_project_scenarios__applied_version_id FOREIGN KEY (applied_version_id) REFERENCES project_versions (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;
