-- V10 — rf28_institucional_lgpd (1 Identidade & Acesso · 12 Plataforma). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- companies (Company — 1 Identidade & Acesso; RF28, RF19, RF24, RF25, RF35, RF39, RF42, RF45)
-- Catálogo institucional: empresa/órgão dona de departamentos, políticas de pontos/Hype e retenção. RESTRICT em
-- tudo que a referencia.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE companies (
    id                      BINARY(16)      NOT NULL,
    owner_user_id           BINARY(16)      NOT NULL,
    legal_name              VARCHAR(200)    NOT NULL,
    slug                    VARCHAR(80)     NOT NULL,
    cnpj_enc                VARCHAR(512)    NULL,
    logo_url                VARCHAR(500)    NULL,
    coat_of_arms_url        VARCHAR(500)    NULL,
    about                   TEXT            NULL,
    website_url             VARCHAR(500)    NULL,
    accent_color            VARCHAR(40)     NULL,
    points_policy_json      JSON            NULL,
    hype_policy_json        JSON            NULL,
    messaging_policy_json   JSON            NULL,
    ranking_weights_id      BINARY(16)      NULL,
    recording_retention_policy VARCHAR(40)     NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ATIVA',
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT ux_companies_slug UNIQUE (slug),
    CONSTRAINT fk_companies__owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_companies_status CHECK (status IN ('ATIVA', 'SUSPENSA', 'ENCERRADA')),
    INDEX ix_companies_owner_user (owner_user_id),
    INDEX ix_companies_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- departments (Department — 1 Identidade & Acesso; RF28, RF14, RF19, RF24, RF25, RF35, RF39)
-- Catálogo institucional: departamento de uma empresa, com chefe atual (headUserId). Inativo → página 404
-- (RF14.CA01).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE departments (
    id                      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NOT NULL,
    name                    VARCHAR(160)    NOT NULL,
    acronym                 VARCHAR(30)     NULL,
    slug                    VARCHAR(80)     NOT NULL,
    color                   VARCHAR(40)     NULL,
    monogram                VARCHAR(3)      NULL,
    head_user_id            BINARY(16)      NULL,
    about                   TEXT            NULL,
    cover_url               VARCHAR(500)    NULL,
    active                  BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT ux_departments_company_slug UNIQUE (company_id, slug),
    CONSTRAINT fk_departments__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_departments__head_user_id FOREIGN KEY (head_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX ix_departments_head_user (head_user_id),
    INDEX ix_departments_company_active (company_id, active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- department_memberships (DepartmentMembership — 1 Identidade & Acesso; RF28, RF21, RF36)
-- Lotações (histórico). endedAt nulo = vigente; a aplicação garante uma vigente por usuário (RF28.CA02).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE department_memberships (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NOT NULL,
    role_in_dept            VARCHAR(20)     NOT NULL DEFAULT 'MEMBRO',
    started_at              TIMESTAMP(6)    NOT NULL,
    ended_at                TIMESTAMP(6)    NULL,
    reason                  VARCHAR(300)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_department_memberships__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_department_memberships__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_department_memberships_role_in_dept CHECK (role_in_dept IN ('MEMBRO', 'CHEFE', 'CURADOR')),
    INDEX ix_department_memberships_user_ended_at (user_id, ended_at),
    INDEX ix_department_memberships_department_ended_at (department_id, ended_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- curator_appointments (CuratorAppointment — 1 Identidade & Acesso; RF28, RF39)
-- Nomeações de curador (papel contextual CURADOR). revokedAt nulo = vigente.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE curator_appointments (
    id                      BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NOT NULL,
    curator_user_id         BINARY(16)      NOT NULL,
    appointed_by            BINARY(16)      NOT NULL,
    appointed_at            TIMESTAMP(6)    NOT NULL,
    revoked_at              TIMESTAMP(6)    NULL,
    revoke_reason           VARCHAR(300)    NULL,
    scope                   VARCHAR(20)     NOT NULL DEFAULT 'AMBOS',
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_curator_appointments__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_curator_appointments__curator_user_id FOREIGN KEY (curator_user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_curator_appointments__appointed_by FOREIGN KEY (appointed_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_curator_appointments_scope CHECK (scope IN ('FILA_REVISAO', 'PREMIACAO', 'AMBOS')),
    INDEX ix_curator_appointments_department_revoked_at (department_id, revoked_at),
    INDEX ix_curator_appointments_curator_user (curator_user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- verification_policies (VerificationPolicy — 1 Identidade & Acesso; RF28, RF1)
-- Política de validação (critérios, motivos, prazos). O ApprovalRequest congela policyVersion; uma VIGENTE por
-- profileType.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE verification_policies (
    id                      BINARY(16)      NOT NULL,
    version                 VARCHAR(20)     NOT NULL,
    profile_type            VARCHAR(20)     NOT NULL,
    criteria_json           JSON            NOT NULL,
    reasons_json            JSON            NOT NULL,
    max_submissions         INT             NOT NULL DEFAULT 5,
    sla_business_days       INT             NOT NULL DEFAULT 3,
    resubmit_sla_business_days INT             NOT NULL DEFAULT 2,
    adjustments_reply_days  INT             NOT NULL DEFAULT 30,
    free_mail_domains_json  JSON            NULL,
    valid_from              TIMESTAMP(6)    NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'RASCUNHO',
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_verification_policies_profile_type_version UNIQUE (profile_type, version),
    CONSTRAINT ck_verification_policies_profile_type CHECK (profile_type IN ('EMPREGADO', 'EMPRESA', 'CHEFE_DEPARTAMENTO')),
    CONSTRAINT ck_verification_policies_status CHECK (status IN ('RASCUNHO', 'VIGENTE', 'SUBSTITUIDA'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- approval_requests (ApprovalRequest — 1 Identidade & Acesso; RF1, RF28, RF3, RF18)
-- Validação de perfil pelo ADMIN. Um pedido por usuário; attempts ≤ maxSubmissions da política; prazo em dias
-- úteis.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE approval_requests (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    requested_profile       VARCHAR(20)     NOT NULL,
    evidence_json           JSON            NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDENTE',
    policy_version          VARCHAR(20)     NOT NULL,
    criteria_json           JSON            NULL,
    reasons_json            JSON            NULL,
    note                    VARCHAR(500)    NULL,
    attempts                INT             NOT NULL DEFAULT 1,
    email_confirmed_at      TIMESTAMP(6)    NULL,
    submitted_at            TIMESTAMP(6)    NULL,
    due_at                  TIMESTAMP(6)    NULL,
    verification_code       VARCHAR(12)     NOT NULL,
    document_keys_json      JSON            NULL,
    confirmed_by            BINARY(16)      NULL,
    confirmed_at            TIMESTAMP(6)    NULL,
    reviewed_by             BINARY(16)      NULL,
    reviewed_at             TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT ux_approval_requests_user_id UNIQUE (user_id),
    CONSTRAINT fk_approval_requests__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_approval_requests__confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_approval_requests__reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_approval_requests_requested_profile CHECK (requested_profile IN ('EMPREGADO', 'EMPRESA', 'CHEFE_DEPARTAMENTO')),
    CONSTRAINT ck_approval_requests_status CHECK (status IN ('PENDENTE', 'AJUSTES', 'APROVADO', 'RECUSADO', 'ESGOTADO')),
    CONSTRAINT ck_approval_requests_c1 CHECK (attempts BETWEEN 1 AND 5),
    INDEX ix_approval_requests_status_due_at (status, due_at),
    INDEX ix_approval_requests_reviewed_by (reviewed_by)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- pending_uploads (PendingUpload — 1 Identidade & Acesso; RF1, RF3)
-- Uploads pendentes do cadastro (avatar/identity/representation), expiram em 24 h; só consumidos uma vez e pelo
-- mesmo kind.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE pending_uploads (
    id                      BINARY(16)      NOT NULL,
    kind                    VARCHAR(20)     NOT NULL,
    object_key              VARCHAR(512)    NOT NULL,
    mime_type               VARCHAR(127)    NOT NULL,
    size_bytes              BIGINT          NOT NULL DEFAULT 0,
    width                   INT             NULL,
    height                  INT             NULL,
    sha256                  CHAR(64)        NOT NULL,
    ip                      VARCHAR(45)     NULL,
    expires_at              TIMESTAMP(6)    NOT NULL,
    consumed_by_user_id     BINARY(16)      NULL,
    consumed_at             TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_pending_uploads_object_key UNIQUE (object_key),
    CONSTRAINT fk_pending_uploads__consumed_by_user_id FOREIGN KEY (consumed_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_pending_uploads_kind CHECK (kind IN ('avatar', 'identity', 'representation')),
    INDEX ix_pending_uploads_expires_at (expires_at),
    INDEX ix_pending_uploads_consumed_by_user (consumed_by_user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- user_empresa_ext (EmpresaProfileExtension — 1 Identidade & Acesso; RF1, RF28)
-- Dados declarados pelo perfil EMPRESA; confirmados viram Company na aprovação (Q-65).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE user_empresa_ext (
    user_id                 BINARY(16)      NOT NULL,
    legal_name              VARCHAR(200)    NOT NULL,
    company_cnpj_enc        VARCHAR(512)    NULL,
    official_site           VARCHAR(500)    NOT NULL,
    representation_doc_id   BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_empresa_ext__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_user_empresa_ext__representation_doc_id FOREIGN KEY (representation_doc_id) REFERENCES media_objects (id)
        ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- user_chefe_ext (ChefeProfileExtension — 1 Identidade & Acesso; RF1, RF28)
-- Dados declarados pelo perfil CHEFE: empresa existente, departamento (nome ou id) e link do ato de nomeação no
-- Diário Oficial.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE user_chefe_ext (
    user_id                 BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NOT NULL,
    department_name         VARCHAR(160)    NULL,
    department_id           BINARY(16)      NULL,
    appointment_link        VARCHAR(500)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_chefe_ext__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_user_chefe_ext__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_user_chefe_ext__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- policy_documents (PolicyDocument — 1 Identidade & Acesso; RF1, RF2, RF3, RF18)
-- Documentos legais publicados em /termos e /privacidade. Único (document, version, language); uma VIGENTE por
-- (document, language).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE policy_documents (
    id                      BINARY(16)      NOT NULL,
    document                VARCHAR(20)     NOT NULL,
    version                 VARCHAR(20)     NOT NULL,
    language                VARCHAR(20)     NOT NULL DEFAULT 'PT_BR',
    effective_from          TIMESTAMP(6)    NULL,
    changelog               TEXT            NULL,
    body_md                 MEDIUMTEXT      NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'RASCUNHO',
    published_by            BINARY(16)      NULL,
    published_at            TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_policy_documents_document_version_language UNIQUE (document, version, language),
    CONSTRAINT fk_policy_documents__published_by FOREIGN KEY (published_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_policy_documents_document CHECK (document IN ('TERMOS', 'PRIVACIDADE')),
    CONSTRAINT ck_policy_documents_language CHECK (language IN ('PT_BR', 'EN', 'ES')),
    CONSTRAINT ck_policy_documents_status CHECK (status IN ('RASCUNHO', 'VIGENTE', 'SUBSTITUIDA')),
    INDEX ix_policy_documents_document_language_status (document, language, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- policy_acceptances (PolicyAcceptance — 1 Identidade & Acesso; RF1, RF2, RF3, RF18)
-- Prova do aceite (art. 8º §2º). Só INSERT; FK users RESTRICT: o userId fica depois da anonimização.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE policy_acceptances (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    document                VARCHAR(20)     NOT NULL,
    version                 VARCHAR(20)     NOT NULL,
    accepted_at             TIMESTAMP(6)    NOT NULL,
    ip                      VARCHAR(45)     NULL,
    user_agent              VARCHAR(512)    NULL,
    channel                 VARCHAR(20)     NOT NULL,
    correlation_id          VARCHAR(64)     NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_policy_acceptances__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_policy_acceptances_document CHECK (document IN ('TERMOS', 'PRIVACIDADE')),
    CONSTRAINT ck_policy_acceptances_channel CHECK (channel IN ('CADASTRO_LOCAL', 'OIDC', 'REACEITE', 'SEED')),
    INDEX ix_policy_acceptances_user_document_accepted_at (user_id, document, accepted_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- consent_events (ConsentEvent — 1 Identidade & Acesso; RF3, RF18)
-- Cada concessão/revogação. Só INSERT; FK users RESTRICT (sobrevive à anonimização junto com
-- policy_acceptances).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE consent_events (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    purpose                 VARCHAR(30)     NOT NULL,
    action                  VARCHAR(20)     NOT NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    ip                      VARCHAR(45)     NULL,
    user_agent              VARCHAR(512)    NULL,
    policy_version          VARCHAR(20)     NULL,
    channel                 VARCHAR(20)     NOT NULL,
    correlation_id          VARCHAR(64)     NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_consent_events__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_consent_events_purpose CHECK (purpose IN ('RESUMO_PROFISSIONAL_IA', 'GRAVACAO_REUNIOES_PADRAO')),
    CONSTRAINT ck_consent_events_action CHECK (action IN ('GRANTED', 'REVOKED')),
    CONSTRAINT ck_consent_events_channel CHECK (channel IN ('SETTINGS', 'API')),
    INDEX ix_consent_events_user_purpose_at (user_id, purpose, at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- user_consents (UserConsent — 1 Identidade & Acesso; RF3, RF37, RF43, RF18)
-- Consentimento vigente por (userId, purpose). Histórico em consent_events. RESTRICT: prova fica após
-- anonimização (D-18).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE user_consents (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    purpose                 VARCHAR(30)     NOT NULL,
    granted                 BOOLEAN         NOT NULL DEFAULT FALSE,
    granted_at              TIMESTAMP(6)    NULL,
    revoked_at              TIMESTAMP(6)    NULL,
    policy_version          VARCHAR(20)     NULL,
    last_event_id           BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_user_consents_user_purpose UNIQUE (user_id, purpose),
    CONSTRAINT fk_user_consents__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_user_consents__last_event_id FOREIGN KEY (last_event_id) REFERENCES consent_events (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_user_consents_purpose CHECK (purpose IN ('RESUMO_PROFISSIONAL_IA', 'GRAVACAO_REUNIOES_PADRAO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- data_subject_requests (DataSubjectRequest — 1 Identidade & Acesso; RF3, RF18, RF43, RF44, RF45)
-- Direitos do titular. RESTRICT: registro legal que fica após anonimização. assigneeId = ADMIN/encarregado.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE data_subject_requests (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    kind                    VARCHAR(30)     NOT NULL,
    target                  VARCHAR(20)     NULL,
    target_id               BINARY(16)      NULL,
    description             VARCHAR(2000)   NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ABERTA',
    opened_at               TIMESTAMP(6)    NOT NULL,
    due_at                  TIMESTAMP(6)    NULL,
    assignee_id             BINARY(16)      NULL,
    response_md             TEXT            NULL,
    responded_at            TIMESTAMP(6)    NULL,
    correlation_id          VARCHAR(64)     NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_data_subject_requests__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_data_subject_requests__assignee_id FOREIGN KEY (assignee_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_data_subject_requests_kind CHECK (kind IN ('REVISAO_DECISAO_AUTOMATIZADA', 'OPOSICAO', 'INFORMACAO_COMPARTILHAMENTO', 'CORRECAO')),
    CONSTRAINT ck_data_subject_requests_target CHECK (target IS NULL OR target IN ('HSE', 'RANKING', 'HYPE', 'CLASSIFICACAO_IA')),
    CONSTRAINT ck_data_subject_requests_status CHECK (status IN ('ABERTA', 'EM_ANALISE', 'RESPONDIDA', 'RECUSADA', 'ENCERRADA')),
    INDEX ix_data_subject_requests_status_due_at (status, due_at),
    INDEX ix_data_subject_requests_user_opened_at (user_id, opened_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- data_export_requests (DataExportRequest — 12 Plataforma; RF3)
-- Exportação assíncrona (PipelineJob DATA_EXPORT). Arquivo em restricted/users/{userId}/exports/; expira em +7
-- d.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE data_export_requests (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'REQUESTED',
    job_id                  BINARY(16)      NULL,
    file_key                VARCHAR(512)    NULL,
    format                  VARCHAR(20)     NOT NULL DEFAULT 'JSON',
    language                VARCHAR(20)     NOT NULL DEFAULT 'PT_BR',
    size_bytes              BIGINT          NULL,
    requested_at            TIMESTAMP(6)    NOT NULL,
    completed_at            TIMESTAMP(6)    NULL,
    expires_at              TIMESTAMP(6)    NULL,
    downloaded_at           TIMESTAMP(6)    NULL,
    failure_reason          VARCHAR(500)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_data_export_requests__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_data_export_requests_status CHECK (status IN ('REQUESTED', 'PROCESSING', 'READY', 'EXPIRED', 'FAILED')),
    CONSTRAINT ck_data_export_requests_format CHECK (format IN ('JSON', 'ZIP')),
    CONSTRAINT ck_data_export_requests_language CHECK (language IN ('PT_BR', 'EN', 'ES')),
    INDEX ix_data_export_requests_user_requested_at (user_id, requested_at),
    INDEX ix_data_export_requests_status_expires_at (status, expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE users ADD CONSTRAINT fk_users__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE users ADD CONSTRAINT fk_users__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE ai_inference_log ADD CONSTRAINT fk_ai_inference_log__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT;
