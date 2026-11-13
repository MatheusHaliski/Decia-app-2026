-- V61 — rf20_conectores_fontes_externas (2 Acervo de Tarefas). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- connector_accounts (ConnectorAccount — 2 Acervo de Tarefas; RF20, RF4, RF23, RF34)
-- Contas Google/Microsoft conectadas por OAuth 2.0 + PKCE para importar documentos (só leitura). Tokens selados
-- na aplicação (AES-256-GCM, WS_CONNECTORS_TOKEN_KEY); e-mail cifrado. Dono → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE connector_accounts (
    id                      BINARY(16)      NOT NULL,
    owner_id                BINARY(16)      NOT NULL,
    provider                VARCHAR(20)     NOT NULL,
    external_subject        VARCHAR(128)    NOT NULL,
    account_email_enc       VARCHAR(512)    NULL,
    scopes_json             JSON            NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ATIVO',
    access_token_sealed     TEXT            NULL,
    refresh_token_sealed    TEXT            NULL,
    access_expires_at       TIMESTAMP(6)    NULL,
    connected_at            TIMESTAMP(6)    NOT NULL,
    last_used_at            TIMESTAMP(6)    NULL,
    last_error              VARCHAR(60)     NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_connector_accounts_owner_provider_external_subject UNIQUE (owner_id, provider, external_subject),
    CONSTRAINT fk_connector_accounts__owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_connector_accounts_provider CHECK (provider IN ('GOOGLE', 'MICROSOFT', 'APPLE_ICLOUD')),
    CONSTRAINT ck_connector_accounts_status CHECK (status IN ('ATIVO', 'EXPIRADO', 'REVOGADO', 'ERRO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- connector_oauth_states (ConnectorOAuthState — 2 Acervo de Tarefas; RF20, RF4)
-- Autorização OAuth em andamento: hash do segredo da fase (state do pedido, 10 min; confirmação do retorno, 5
-- min — uso único), verificador PKCE e code selados e caminho interno de volta. Some com quem iniciou.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE connector_oauth_states (
    id                      BINARY(16)      NOT NULL,
    state_hash              CHAR(64)        NOT NULL,
    owner_id                BINARY(16)      NOT NULL,
    provider                VARCHAR(20)     NOT NULL,
    code_verifier_sealed    VARCHAR(512)    NOT NULL,
    code_sealed             TEXT            NULL,
    return_to               VARCHAR(200)    NOT NULL,
    expires_at              TIMESTAMP(6)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_connector_oauth_states_state_hash UNIQUE (state_hash),
    CONSTRAINT fk_connector_oauth_states__owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_connector_oauth_states_provider CHECK (provider IN ('GOOGLE', 'MICROSOFT', 'APPLE_ICLOUD')),
    INDEX ix_connector_oauth_states_owner (owner_id),
    INDEX ix_connector_oauth_states_expires_at (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- task_external_links (TaskExternalLink — 2 Acervo de Tarefas; RF20, RF8, RF23)
-- Id no provedor, conta usada e versão remota de uma tarefa importada por conector (para o SYNC_EXTERNO). Tarefa
-- → CASCADE; conta desconectada → SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE task_external_links (
    task_id                 BINARY(16)      NOT NULL,
    account_id              BINARY(16)      NULL,
    provider                VARCHAR(20)     NOT NULL,
    external_id             VARCHAR(300)    NOT NULL,
    mime_type               VARCHAR(255)    NULL,
    link_mode               VARCHAR(20)     NOT NULL,
    remote_version          VARCHAR(200)    NULL,
    synced_at               TIMESTAMP(6)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (task_id),
    CONSTRAINT fk_task_external_links__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_task_external_links__account_id FOREIGN KEY (account_id) REFERENCES connector_accounts (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_task_external_links_provider CHECK (provider IN ('GOOGLE', 'MICROSOFT', 'APPLE_ICLOUD')),
    CONSTRAINT ck_task_external_links_link_mode CHECK (link_mode IN ('VINCULADO', 'COPIADO')),
    INDEX ix_task_external_links_account (account_id),
    INDEX ix_task_external_links_provider_external (provider, external_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
