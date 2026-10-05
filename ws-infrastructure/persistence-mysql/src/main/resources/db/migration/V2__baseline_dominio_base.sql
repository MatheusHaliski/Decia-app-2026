-- V2 — baseline do domínio base (Bloco 2: integridade e origem dos dados). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- Fonte de verdade do schema (TAXONOMIA §1.1–1.3, §10.1, §12). Nunca edite depois de aplicada: mudança = V3+.
--
-- Convenções (D-23):
--   * ids BINARY(16) = UUID (D-04, AuditableEntity.id); carimbos TIMESTAMP(6) em UTC; `version` para lock otimista.
--   * enums de domínio como VARCHAR + CHECK nomeado ck_<tabela>_<coluna> (ENUM do MySQL exige ALTER para valor novo;
--     o JPA mapeia String). Catálogos que crescem por RF (ai_inference_log.capability, audit_log.action) ficam sem CHECK.
--   * toda FK tem nome fk_<tabela>__<coluna> e ON DELETE / ON UPDATE EXPLÍCITOS; a lista completa está em
--     ForeignKeyPolicy.POLICY e o ForeignKeyPolicyTest compara com INFORMATION_SCHEMA — FK fora da lista quebra o build.
--   * nunca SET FOREIGN_KEY_CHECKS = 0.
--
-- Política de ON DELETE por domínio:
--   * dado de quem é dono (preferências, sessões/refresh, mídia enviada)         → CASCADE
--   * catálogo institucional (companies, departments — RF28, ainda sem tabela)   → RESTRICT (o filho segura o pai)
--   * filho que continua válido sem o pai (refresh_tokens.rotated_from_id)       → SET NULL, só nesse caso
--   * trilhas append-only (audit_log, ai_inference_log)                          → RESTRICT: nunca cascateiam
--   * conta REAL nunca é apagada: é ANONIMIZADA (D-18); o DELETE físico só existe para TEST_SEED/DEMO (reset de ambiente)
--     e, por isso, as trilhas RESTRICT exigem que o reset apague/anonimize a trilha antes — o que é intencional.

-- ---------------------------------------------------------------------------------------------------------------
-- users (TAXONOMIA §1.1) — e-mail e telefone cifrados (AES-GCM, WS_DATA_ENCRYPTION_KEY) + hash para busca/unicidade.
-- company_id / department_id ainda SEM FK: companies e departments nascem no RF28 (a FK RESTRICT entra na migration
-- daquele RF e na ForeignKeyPolicy.POLICY ao mesmo tempo).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE users (
    id                      BINARY(16)    NOT NULL,
    username                VARCHAR(80)   NOT NULL,
    full_name               VARCHAR(160)  NOT NULL,
    display_name            VARCHAR(80)   NULL,
    email_enc               VARCHAR(512)  NOT NULL,
    email_hash              VARCHAR(128)  NOT NULL,
    email_verified          BOOLEAN       NOT NULL DEFAULT FALSE,
    phone_enc               VARCHAR(512)  NULL,
    password_hash           VARCHAR(255)  NULL,
    oidc_subject            VARCHAR(255)  NULL,
    oidc_issuer             VARCHAR(255)  NULL,
    profile_type            VARCHAR(30)   NOT NULL,
    role                    VARCHAR(20)   NOT NULL DEFAULT 'USER',
    status                  VARCHAR(40)   NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION',
    job_title               VARCHAR(120)  NULL,
    company_id              BINARY(16)    NULL,
    department_id           BINARY(16)    NULL,
    avatar_url              VARCHAR(500)  NULL,
    cover_url               VARCHAR(500)  NULL,
    bio                     VARCHAR(1000) NULL,
    verified                BOOLEAN       NOT NULL DEFAULT FALSE,
    two_factor_enabled      BOOLEAN       NOT NULL DEFAULT FALSE,
    hype_visibility         VARCHAR(20)   NOT NULL DEFAULT 'SO_EU',
    ranking_opt_out         BOOLEAN       NOT NULL DEFAULT FALSE,
    last_login_at           TIMESTAMP(6)  NULL,
    terms_version           VARCHAR(20)   NULL,
    privacy_version         VARCHAR(20)   NULL,
    deletion_requested_at   TIMESTAMP(6)  NULL,
    deletion_scheduled_at   TIMESTAMP(6)  NULL,
    deletion_reason         VARCHAR(500)  NULL,
    anonymized_at           TIMESTAMP(6)  NULL,
    account_origin          VARCHAR(20)   NOT NULL DEFAULT 'REAL',
    fixture_key             VARCHAR(80)   NULL,
    test_account            BOOLEAN       GENERATED ALWAYS AS (account_origin IN ('TEST_SEED', 'DEMO')) STORED,
    created_at              TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT ux_users_username        UNIQUE (username),
    CONSTRAINT ux_users_email_hash      UNIQUE (email_hash),
    CONSTRAINT ux_users_fixture_key     UNIQUE (fixture_key),
    CONSTRAINT ux_users_oidc            UNIQUE (oidc_issuer, oidc_subject),
    CONSTRAINT ck_users_profile_type    CHECK (profile_type IN ('EMPREGADO', 'EMPRESA', 'CHEFE_DEPARTAMENTO')),
    CONSTRAINT ck_users_role            CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT ck_users_status          CHECK (status IN ('PENDING_EMAIL_VERIFICATION', 'PENDING_VALIDATION', 'ACTIVE',
                                                          'SUSPENDED', 'DELETION_SCHEDULED', 'ANONYMIZED')),
    CONSTRAINT ck_users_hype_visibility CHECK (hype_visibility IN ('PUBLICO', 'EMPRESA', 'SO_EU')),
    CONSTRAINT ck_users_account_origin  CHECK (account_origin IN ('REAL', 'TEST_SEED', 'DEMO', 'SYSTEM')),
    INDEX ix_users_account_origin (account_origin),
    INDEX ix_users_test_account   (test_account),
    INDEX ix_users_status         (status),
    INDEX ix_users_company_id     (company_id),
    INDEX ix_users_department_id  (department_id),
    INDEX ix_users_deletion       (deletion_scheduled_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- user_preferences (TAXONOMIA §1.2) — 1:1 com users; some com o dono (CASCADE).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE user_preferences (
    user_id                 BINARY(16)    NOT NULL,
    theme                   VARCHAR(20)   NOT NULL DEFAULT 'AUTO',
    language                VARCHAR(10)   NOT NULL DEFAULT 'PT_BR',
    density                 VARCHAR(20)   NOT NULL DEFAULT 'NORMAL',
    font_scale              DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
    reduce_motion           BOOLEAN       NOT NULL DEFAULT FALSE,
    desk_skin               VARCHAR(20)   NOT NULL DEFAULT 'PAPEL',
    default_card_skin       VARCHAR(40)   NULL,
    notification_prefs_json JSON          NULL,
    timezone                VARCHAR(64)   NOT NULL DEFAULT 'America/Sao_Paulo',
    wip_limit               TINYINT UNSIGNED NOT NULL DEFAULT 3,
    dashboard_layout_json   JSON          NULL,
    ai_mode_default         VARCHAR(20)   NOT NULL DEFAULT 'ECONOMIA',
    created_at              TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_preferences__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_user_preferences_theme     CHECK (theme IN ('AUTO', 'CLARO', 'ESCURO', 'ALTO_CONTRASTE', 'BLUEPRINT')),
    CONSTRAINT ck_user_preferences_language  CHECK (language IN ('PT_BR', 'EN', 'ES')),
    CONSTRAINT ck_user_preferences_density   CHECK (density IN ('COMPACTA', 'NORMAL', 'CONFORTAVEL')),
    CONSTRAINT ck_user_preferences_desk_skin CHECK (desk_skin IN ('PAPEL', 'CORTICA', 'BLUEPRINT', 'PAPEL_TIMBRADO')),
    CONSTRAINT ck_user_preferences_ai_mode   CHECK (ai_mode_default IN ('ECONOMIA', 'AVANCADO')),
    CONSTRAINT ck_user_preferences_wip_limit CHECK (wip_limit BETWEEN 1 AND 20)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- refresh_tokens (TAXONOMIA §1.3) — espelho do Redis (hash por family_id). Só o HASH do token é guardado.
-- rotated_from_id: o token rotacionado continua válido como histórico se o anterior for apagado → SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id                      BINARY(16)    NOT NULL,
    user_id                 BINARY(16)    NOT NULL,
    token_hash              VARCHAR(128)  NOT NULL,
    family_id               BINARY(16)    NOT NULL,
    expires_at              TIMESTAMP(6)  NOT NULL,
    revoked_at              TIMESTAMP(6)  NULL,
    rotated_from_id         BINARY(16)    NULL,
    created_ip              VARCHAR(45)   NULL,
    user_agent              VARCHAR(512)  NULL,
    device_name             VARCHAR(120)  NULL,
    last_used_at            TIMESTAMP(6)  NULL,
    persistent              BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_refresh_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_refresh_tokens__rotated_from_id FOREIGN KEY (rotated_from_id) REFERENCES refresh_tokens (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    INDEX ix_refresh_tokens_family_id  (family_id),
    INDEX ix_refresh_tokens_user_id    (user_id),
    INDEX ix_refresh_tokens_expires_at (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- audit_log (TAXONOMIA §12.1) — APPEND-ONLY: a aplicação só faz INSERT; sem UPDATE/DELETE. actor_id nulo = sistema /
-- anônimo (ex.: tentativa de login). RESTRICT: apagar um usuário com trilha é erro, não limpeza.
-- metadata_json já sanitizado (sem senha/token: SensitiveDataMaskingConverter + Masking).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE audit_log (
    id                      BINARY(16)    NOT NULL,
    actor_id                BINARY(16)    NULL,
    action                  VARCHAR(80)   NOT NULL,
    resource_type           VARCHAR(80)   NULL,
    resource_id             VARCHAR(64)   NULL,
    result                  VARCHAR(20)   NOT NULL,
    ip                      VARCHAR(45)   NULL,
    user_agent              VARCHAR(512)  NULL,
    correlation_id          VARCHAR(64)   NULL,
    metadata_json           JSON          NULL,
    at                      TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_audit_log__actor_id FOREIGN KEY (actor_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_audit_log_result CHECK (result IN ('OK', 'FALHA', 'NEGADO')),
    INDEX ix_audit_log_actor_at    (actor_id, at),
    INDEX ix_audit_log_resource    (resource_type, resource_id),
    INDEX ix_audit_log_action_at   (action, at),
    INDEX ix_audit_log_correlation (correlation_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- ai_inference_log (TAXONOMIA §10.1) — APPEND-ONLY. Trilha de cada chamada de IA (custo, latência, mascaramento,
-- fallback). user_id nulo = job do sistema. RESTRICT (nunca cascateia). department_id sem FK até o RF28.
-- capability é catálogo que cresce por RF (27 valores hoje) → sem CHECK; o enum Java é a fonte.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE ai_inference_log (
    id                      BINARY(16)    NOT NULL,
    user_id                 BINARY(16)    NULL,
    department_id           BINARY(16)    NULL,
    capability              VARCHAR(40)   NOT NULL,
    host_rf                 VARCHAR(10)   NULL,
    provider                VARCHAR(20)   NOT NULL,
    model                   VARCHAR(80)   NULL,
    mode                    VARCHAR(20)   NOT NULL DEFAULT 'ECONOMIA',
    latency_ms              INT UNSIGNED  NULL,
    input_tokens            INT UNSIGNED  NULL,
    output_tokens           INT UNSIGNED  NULL,
    estimated_cost_usd      DECIMAL(10, 6) NULL,
    result                  VARCHAR(20)   NOT NULL,
    fallback_used           BOOLEAN       NOT NULL DEFAULT FALSE,
    masked_fields_json      JSON          NULL,
    input_summary_json      JSON          NULL,
    output_summary          TEXT          NULL,
    confidence              DECIMAL(4, 3) NULL,
    reviewed_by             BINARY(16)    NULL,
    reviewed_at             TIMESTAMP(6)  NULL,
    quota_source            VARCHAR(20)   NULL,
    correlation_id          VARCHAR(64)   NULL,
    created_at              TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_inference_log__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_ai_inference_log__reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_ai_inference_log_provider     CHECK (provider IN ('CLAUDE', 'GEMINI', 'LOCAL')),
    CONSTRAINT ck_ai_inference_log_mode         CHECK (mode IN ('ECONOMIA', 'AVANCADO')),
    CONSTRAINT ck_ai_inference_log_result       CHECK (result IN ('OK', 'FALLBACK', 'ERRO', 'BLOQUEADO_SIGILO')),
    CONSTRAINT ck_ai_inference_log_quota_source CHECK (quota_source IS NULL OR quota_source IN ('MENSAL', 'CREDITO', 'PONTOS')),
    INDEX ix_ai_inference_log_user_at       (user_id, created_at),
    INDEX ix_ai_inference_log_capability_at (capability, created_at),
    INDEX ix_ai_inference_log_correlation   (correlation_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- feature_flags (TAXONOMIA §12.4) — stores opcionais e provedores de IA nascem DESLIGADOS; só ai.local.only = TRUE
-- (RF43: RESTRITO/SIGILOSO nunca saem do motor local).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE feature_flags (
    flag_key                VARCHAR(80)   NOT NULL,
    enabled                 BOOLEAN       NOT NULL DEFAULT FALSE,
    scope                   VARCHAR(20)   NOT NULL DEFAULT 'GLOBAL',
    rollout_json            JSON          NULL,
    updated_at              TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (flag_key),
    CONSTRAINT ck_feature_flags_scope CHECK (scope IN ('GLOBAL', 'EMPRESA', 'DEPARTAMENTO', 'USUARIO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

INSERT INTO feature_flags (flag_key, enabled, scope) VALUES
    ('redis.enabled',      FALSE, 'GLOBAL'),
    ('cassandra.enabled',  FALSE, 'GLOBAL'),
    ('opensearch.enabled', FALSE, 'GLOBAL'),
    ('storage.s3',         FALSE, 'GLOBAL'),
    ('ai.provider.claude', FALSE, 'GLOBAL'),
    ('ai.provider.gemini', FALSE, 'GLOBAL'),
    ('ai.local.only',      TRUE,  'GLOBAL');

-- ---------------------------------------------------------------------------------------------------------------
-- domain_events (TAXONOMIA §12.2) — outbox transacional: gravado na mesma transação do agregado, publicado depois
-- (AFTER_COMMIT / relay). aggregate_id textual (UUID ou chave natural). Sem FK por desenho: o evento sobrevive ao agregado.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE domain_events (
    id                      BINARY(16)    NOT NULL,
    aggregate_type          VARCHAR(80)   NOT NULL,
    aggregate_id            VARCHAR(64)   NOT NULL,
    event_type              VARCHAR(120)  NOT NULL,
    payload_json            JSON          NOT NULL,
    occurred_at             TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    published_at            TIMESTAMP(6)  NULL,
    attempts                INT UNSIGNED  NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX ix_domain_events_published_at (published_at),
    INDEX ix_domain_events_aggregate    (aggregate_type, aggregate_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- media_objects (TAXONOMIA §12.5) — metadados do S3/MinIO/local. object_key único no bucket padrão; o binário em
-- `restricted/` segue a classe RESTRICTED (só o dono + ADMIN). Mídia pertence ao dono → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE media_objects (
    id                      BINARY(16)    NOT NULL,
    owner_id                BINARY(16)    NOT NULL,
    bucket                  VARCHAR(63)   NOT NULL,
    object_key              VARCHAR(512)  NOT NULL,
    mime_type               VARCHAR(127)  NOT NULL,
    size_bytes              BIGINT UNSIGNED NOT NULL,
    sha256                  CHAR(64)      NOT NULL,
    access_class            VARCHAR(20)   NOT NULL DEFAULT 'PRIVATE',
    variants_json           JSON          NULL,
    created_at              TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_media_objects_object_key UNIQUE (object_key),
    CONSTRAINT fk_media_objects__owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_media_objects_access_class CHECK (access_class IN ('PUBLIC', 'PRIVATE', 'RESTRICTED')),
    INDEX ix_media_objects_owner_id (owner_id),
    INDEX ix_media_objects_sha256   (sha256)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- marca o baseline aplicado (WorkStationApplicationIT confere)
-- ---------------------------------------------------------------------------------------------------------------
UPDATE app_meta SET meta_value = 'bloco-2' WHERE meta_key = 'schema.baseline';
