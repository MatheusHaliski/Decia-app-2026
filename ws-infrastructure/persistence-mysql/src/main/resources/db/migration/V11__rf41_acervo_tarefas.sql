-- V11 — rf41_acervo_tarefas (2 Acervo de Tarefas). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- org_entities (OrgEntity — 2 Acervo de Tarefas; RF20, RF41)
-- Catálogo de órgãos, entidades e fornecedores (RESTRICT). cnpj cifrado.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE org_entities (
    id                      BINARY(16)      NOT NULL,
    name                    VARCHAR(200)    NOT NULL,
    cnpj_enc                VARCHAR(512)    NULL,
    kind                    VARCHAR(20)     NOT NULL,
    source                  VARCHAR(20)     NOT NULL DEFAULT 'MANUAL',
    external_ref            VARCHAR(120)    NULL,
    website_url             VARCHAR(500)    NULL,
    logo_url                VARCHAR(500)    NULL,
    verified                BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ck_org_entities_kind CHECK (kind IN ('ORGAO', 'FORNECEDOR', 'ENTIDADE', 'CIDADAO')),
    CONSTRAINT ck_org_entities_source CHECK (source IN ('WIKIDATA', 'CNPJ', 'SITE', 'MANUAL')),
    INDEX ix_org_entities_name (name),
    INDEX ix_org_entities_kind (kind)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- legal_deadline_rules (LegalDeadlineRule — 2 Acervo de Tarefas; RF20, RF44)
-- Catálogo de prazos legais (dias corridos ou úteis) por categoria/subcategoria. RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE legal_deadline_rules (
    id                      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NULL,
    category                VARCHAR(40)     NOT NULL,
    subcategory             VARCHAR(80)     NULL,
    days                    INT             NOT NULL DEFAULT 0,
    business_days           BOOLEAN         NOT NULL DEFAULT FALSE,
    legal_basis             VARCHAR(300)    NOT NULL,
    description             VARCHAR(500)    NULL,
    active                  BOOLEAN         NOT NULL DEFAULT TRUE,
    valid_from              DATE            NULL,
    valid_to                DATE            NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_legal_deadline_rules__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_legal_deadline_rules_category CHECK (category IN ('OFICIO_MEMORANDO', 'PARECER_TECNICO', 'ETP', 'TERMO_REFERENCIA', 'PLANILHA_ORCAMENTARIA', 'PROJETO_BASICO_EXECUTIVO', 'CRONOGRAMA', 'ATA', 'PORTARIA_RESOLUCAO', 'CONTRATO_CONVENIO', 'VISTORIA_RELATORIO_FOTOGRAFICO', 'LICENCA_ANUENCIA', 'MAPA_GEORREFERENCIA', 'FORMULARIO', 'OUTRO')),
    CONSTRAINT ck_legal_deadline_rules_c1 CHECK (days > 0),
    INDEX ix_legal_deadline_rules_category_subcategory_active (category, subcategory, active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- tasks (TaskItem — 2 Acervo de Tarefas; RF20, RF41, RF21, RF22, RF23, RF29, RF34, RF40, RF44)
-- Tarefa (item do acervo). Dono → CASCADE; catálogos (departments, org_entities) RESTRICT; referências que
-- sobrevivem (bloqueio, original, projeto de origem) SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE tasks (
    id                      BINARY(16)      NOT NULL,
    owner_id                BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    title                   VARCHAR(200)    NOT NULL,
    summary                 TEXT            NULL,
    description_md          MEDIUMTEXT      NULL,
    type                    VARCHAR(30)     NOT NULL,
    category                VARCHAR(40)     NULL,
    subcategory             VARCHAR(80)     NULL,
    process_tags_json       JSON            NULL,
    nature_tags_json        JSON            NULL,
    access_class            VARCHAR(20)     NOT NULL DEFAULT 'INTERNO',
    format                  VARCHAR(20)     NULL,
    effort_size             VARCHAR(20)     NULL,
    estimated_hours         DECIMAL(8,2)    NULL,
    amount_involved         DECIMAL(16,2)   NOT NULL DEFAULT 0,
    origin                  VARCHAR(20)     NOT NULL DEFAULT 'INTERNA',
    source_kind             VARCHAR(20)     NOT NULL,
    source_ref              VARCHAR(500)    NULL,
    link_mode               VARCHAR(20)     NULL,
    org_entity_id           BINARY(16)      NULL,
    responsible_id          BINARY(16)      NULL,
    due_at                  DATE            NULL,
    legal_deadline_rule_id  BINARY(16)      NULL,
    legal_deadline_base_date DATE            NULL,
    legal_due_at            DATE            NULL,
    legal_override_reason   VARCHAR(300)    NULL,
    priority                VARCHAR(20)     NOT NULL DEFAULT 'MEDIA',
    state                   VARCHAR(20)     NOT NULL DEFAULT 'RASCUNHO',
    blocked_by_task_id      BINARY(16)      NULL,
    blocked_by_user_id      BINARY(16)      NULL,
    block_reason            VARCHAR(300)    NULL,
    doc_situation           VARCHAR(20)     NULL,
    received_at             DATE            NULL,
    sender_origin           VARCHAR(200)    NULL,
    protocol_number         VARCHAR(60)     NULL,
    retention_policy_json   JSON            NULL,
    visibility              VARCHAR(20)     NOT NULL DEFAULT 'PRIVADA',
    favorite                BOOLEAN         NOT NULL DEFAULT FALSE,
    offered_in_counter      BOOLEAN         NOT NULL DEFAULT FALSE,
    ai_generated            BOOLEAN         NOT NULL DEFAULT FALSE,
    ai_inference_id         BINARY(16)      NULL,
    ai_confidence_json      JSON            NULL,
    thumbnail_url           VARCHAR(500)    NULL,
    cover_url               VARCHAR(500)    NULL,
    cover_mode              VARCHAR(20)     NOT NULL DEFAULT 'AUTO',
    card_skin               VARCHAR(40)     NULL,
    tags_json               JSON            NULL,
    notes                   TEXT            NULL,
    original_task_id        BINARY(16)      NULL,
    source_project_id       BINARY(16)      NULL,
    checklist_item_id       BINARY(16)      NULL,
    reuse_count             INT             NOT NULL DEFAULT 0,
    project_usage_count     INT             NOT NULL DEFAULT 0,
    likes_count             BIGINT          NOT NULL DEFAULT 0,
    comments_count          BIGINT          NOT NULL DEFAULT 0,
    saves_count             BIGINT          NOT NULL DEFAULT 0,
    shares_count            BIGINT          NOT NULL DEFAULT 0,
    remixes_count           BIGINT          NOT NULL DEFAULT 0,
    views_count             BIGINT          NOT NULL DEFAULT 0,
    seal_ids_json           JSON            NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_tasks__owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_tasks__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_tasks__org_entity_id FOREIGN KEY (org_entity_id) REFERENCES org_entities (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_tasks__responsible_id FOREIGN KEY (responsible_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_tasks__legal_deadline_rule_id FOREIGN KEY (legal_deadline_rule_id) REFERENCES legal_deadline_rules (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_tasks__blocked_by_task_id FOREIGN KEY (blocked_by_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_tasks__blocked_by_user_id FOREIGN KEY (blocked_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_tasks__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_tasks__original_task_id FOREIGN KEY (original_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_tasks_type CHECK (type IN ('TEXTO_MANUAL', 'TEXTO_IA', 'IMAGEM_WEB', 'IMAGEM_EDITADA', 'PLANILHA', 'DOCUMENTO', 'PASTA', 'LINK', 'DESENHO_TECNICO', 'FORMULARIO', 'ATA_REGISTRO', 'EMAIL', 'PROTOCOLO', 'CRONOGRAMA', 'ESTUDO_TECNICO_PRELIMINAR')),
    CONSTRAINT ck_tasks_category CHECK (category IS NULL OR category IN ('OFICIO_MEMORANDO', 'PARECER_TECNICO', 'ETP', 'TERMO_REFERENCIA', 'PLANILHA_ORCAMENTARIA', 'PROJETO_BASICO_EXECUTIVO', 'CRONOGRAMA', 'ATA', 'PORTARIA_RESOLUCAO', 'CONTRATO_CONVENIO', 'VISTORIA_RELATORIO_FOTOGRAFICO', 'LICENCA_ANUENCIA', 'MAPA_GEORREFERENCIA', 'FORMULARIO', 'OUTRO')),
    CONSTRAINT ck_tasks_access_class CHECK (access_class IN ('PUBLICO', 'INTERNO', 'RESTRITO', 'SIGILOSO')),
    CONSTRAINT ck_tasks_effort_size CHECK (effort_size IS NULL OR effort_size IN ('P', 'M', 'G')),
    CONSTRAINT ck_tasks_origin CHECK (origin IN ('INTERNA', 'ORGAO_EXTERNO', 'FORNECEDOR', 'CIDADAO')),
    CONSTRAINT ck_tasks_source_kind CHECK (source_kind IN ('ARQUIVO', 'COLAR', 'GOOGLE', 'MICROSOFT', 'EMAIL', 'LINK', 'PROTOCOLO', 'FOTO', 'TEXTO_IA', 'EXTRAIDA_DE_PROJETO', 'REMIX', 'DECIA', 'AUTOPILOT', 'ATA_VIVA', 'DOSSIE', 'EXTRACAO')),
    CONSTRAINT ck_tasks_link_mode CHECK (link_mode IS NULL OR link_mode IN ('VINCULADO', 'COPIADO')),
    CONSTRAINT ck_tasks_priority CHECK (priority IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    CONSTRAINT ck_tasks_state CHECK (state IN ('RASCUNHO', 'DISPONIVEL', 'EM_USO', 'BLOQUEADA', 'CONCLUIDA', 'ARQUIVADA', 'MODELO_PUBLICO', 'OFERECIDA')),
    CONSTRAINT ck_tasks_doc_situation CHECK (doc_situation IS NULL OR doc_situation IN ('MINUTA', 'REVISADO', 'ASSINADO', 'PUBLICADO')),
    CONSTRAINT ck_tasks_visibility CHECK (visibility IN ('PRIVADA', 'DEPARTAMENTO', 'EMPRESA', 'PUBLICA')),
    CONSTRAINT ck_tasks_cover_mode CHECK (cover_mode IN ('AUTO', 'MANUAL', 'IA')),
    CONSTRAINT ck_tasks_c1 CHECK (amount_involved >= 0),
    CONSTRAINT ck_tasks_c2 CHECK (reuse_count >= 0),
    INDEX ix_tasks_owner_state (owner_id, state),
    INDEX ix_tasks_department_state (department_id, state),
    INDEX ix_tasks_responsible_due_at (responsible_id, due_at),
    INDEX ix_tasks_state_visibility (state, visibility),
    INDEX ix_tasks_protocol_number (protocol_number),
    INDEX ix_tasks_legal_due_at (legal_due_at),
    INDEX ix_tasks_original_task (original_task_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- task_attachments (TaskAttachment — 2 Acervo de Tarefas; RF20, RF41, RF34)
-- Anexos da tarefa (filho → CASCADE). media_objects RESTRICT: o binário é apagado explicitamente (GC, Q-31).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE task_attachments (
    id                      BINARY(16)      NOT NULL,
    task_id                 BINARY(16)      NOT NULL,
    media_object_id         BINARY(16)      NOT NULL,
    file_name               VARCHAR(255)    NOT NULL,
    mime_type               VARCHAR(127)    NOT NULL,
    size_bytes              BIGINT          NOT NULL DEFAULT 0,
    sha256                  CHAR(64)        NOT NULL,
    antivirus_status        VARCHAR(20)     NOT NULL DEFAULT 'PENDENTE',
    ocr_status              VARCHAR(20)     NOT NULL DEFAULT 'PENDENTE',
    ocr_text_ref            VARCHAR(200)    NULL,
    is_primary              BOOLEAN         NOT NULL DEFAULT FALSE,
    sort_order              INT             NOT NULL DEFAULT 0,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_task_attachments__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_task_attachments__media_object_id FOREIGN KEY (media_object_id) REFERENCES media_objects (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_task_attachments_antivirus_status CHECK (antivirus_status IN ('PENDENTE', 'LIMPO', 'INFECTADO')),
    CONSTRAINT ck_task_attachments_ocr_status CHECK (ocr_status IN ('PENDENTE', 'PRONTO', 'FALHA', 'NAO_APLICAVEL')),
    INDEX ix_task_attachments_task_sort_order (task_id, sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- task_versions (TaskVersion — 2 Acervo de Tarefas; RF20, RF41)
-- Versões externas de itens VINCULADO. Filho da tarefa → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE task_versions (
    id                      BINARY(16)      NOT NULL,
    task_id                 BINARY(16)      NOT NULL,
    version_number          INT             NOT NULL DEFAULT 0,
    external_revision_id    VARCHAR(200)    NULL,
    synced_at               TIMESTAMP(6)    NOT NULL,
    thumbnail_url           VARCHAR(500)    NULL,
    change_summary          VARCHAR(500)    NULL,
    snapshot_media_id       BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_task_versions_task_version_number UNIQUE (task_id, version_number),
    CONSTRAINT fk_task_versions__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_task_versions__snapshot_media_id FOREIGN KEY (snapshot_media_id) REFERENCES media_objects (id)
        ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- task_state_log (TaskStateLog — 2 Acervo de Tarefas; RF41, RF12, RF44, RF46)
-- Append-only. Pertence à tarefa (CASCADE); ator RESTRICT (trilha nunca cascateia por usuário).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE task_state_log (
    id                      BINARY(16)      NOT NULL,
    task_id                 BINARY(16)      NOT NULL,
    from_state              VARCHAR(20)     NULL,
    to_state                VARCHAR(20)     NOT NULL,
    actor_id                BINARY(16)      NULL,
    reason                  VARCHAR(500)    NULL,
    project_id              BINARY(16)      NULL,
    correlation_id          VARCHAR(64)     NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_task_state_log__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_task_state_log__actor_id FOREIGN KEY (actor_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_task_state_log_from_state CHECK (from_state IS NULL OR from_state IN ('RASCUNHO', 'DISPONIVEL', 'EM_USO', 'BLOQUEADA', 'CONCLUIDA', 'ARQUIVADA', 'MODELO_PUBLICO', 'OFERECIDA')),
    CONSTRAINT ck_task_state_log_to_state CHECK (to_state IN ('RASCUNHO', 'DISPONIVEL', 'EM_USO', 'BLOQUEADA', 'CONCLUIDA', 'ARQUIVADA', 'MODELO_PUBLICO', 'OFERECIDA')),
    INDEX ix_task_state_log_task_at (task_id, at),
    INDEX ix_task_state_log_actor (actor_id),
    INDEX ix_task_state_log_correlation (correlation_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- evidences (Evidence — 2 Acervo de Tarefas; RF41, RF20, RF29)
-- Evidências (fotos) do dono → CASCADE; vínculos a tarefa/projeto sobrevivem como SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE evidences (
    id                      BINARY(16)      NOT NULL,
    owner_id                BINARY(16)      NOT NULL,
    media_object_id         BINARY(16)      NOT NULL,
    taken_at                TIMESTAMP(6)    NULL,
    latitude_enc            VARCHAR(512)    NULL,
    longitude_enc           VARCHAR(512)    NULL,
    caption                 VARCHAR(500)    NULL,
    linked_task_id          BINARY(16)      NULL,
    linked_project_id       BINARY(16)      NULL,
    studio_status           VARCHAR(20)     NOT NULL DEFAULT 'ORIGINAL',
    derived_task_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_evidences__owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_evidences__media_object_id FOREIGN KEY (media_object_id) REFERENCES media_objects (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_evidences__linked_task_id FOREIGN KEY (linked_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_evidences__derived_task_id FOREIGN KEY (derived_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_evidences_studio_status CHECK (studio_status IN ('ORIGINAL', 'ENDIREITADA', 'RECORTADA', 'SEM_FUNDO', 'OCR')),
    INDEX ix_evidences_owner_taken_at (owner_id, taken_at),
    INDEX ix_evidences_linked_task (linked_task_id),
    INDEX ix_evidences_linked_project (linked_project_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
