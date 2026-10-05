-- V16 — rf27_social (7 Social & Descoberta). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- reactions (Reaction — 7 Social & Descoberta; RF26, RF27, RF42, RF45)
-- Reações. Ator → CASCADE (dado do dono). Única (actor, target, reaction_type).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE reactions (
    id                      BINARY(16)      NOT NULL,
    actor_id                BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    reaction_type           VARCHAR(20)     NOT NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    actor_hype_at_time      INT             NULL,
    ignored_reason          VARCHAR(20)     NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_reactions_actor_target_type_target_reaction_type UNIQUE (actor_id, target_type, target_id, reaction_type),
    CONSTRAINT fk_reactions__actor_id FOREIGN KEY (actor_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_reactions_target_type CHECK (target_type IN ('TASK', 'PROJECT', 'PLAN', 'KIT', 'PROJECT_TASK', 'MESSAGE', 'RECOGNITION')),
    CONSTRAINT ck_reactions_reaction_type CHECK (reaction_type IN ('CURTIR', 'UTIL', 'BEM_FUNDAMENTADO', 'INOVADOR', 'CONFORME')),
    CONSTRAINT ck_reactions_ignored_reason CHECK (ignored_reason IS NULL OR ignored_reason IN ('NAO_VERIFICADO', 'AUTO_INTERACAO', 'ANTIFRAUDE')),
    INDEX ix_reactions_target_type_target_reaction_type (target_type, target_id, reaction_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- comments (Comment — 7 Social & Descoberta; RF26, RF22, RF27)
-- Comentários em alvo polimórfico, com respostas (parent SET NULL). Autor → CASCADE; moderador RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE comments (
    id                      BINARY(16)      NOT NULL,
    author_id               BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    parent_comment_id       BINARY(16)      NULL,
    content_md              TEXT            NOT NULL,
    mentions_json           JSON            NULL,
    edited_at               TIMESTAMP(6)    NULL,
    deleted_by              BINARY(16)      NULL,
    active                  BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_comments__author_id FOREIGN KEY (author_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_comments__parent_comment_id FOREIGN KEY (parent_comment_id) REFERENCES comments (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_comments__deleted_by FOREIGN KEY (deleted_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_comments_target_type CHECK (target_type IN ('TASK', 'PROJECT', 'PLAN', 'KIT', 'PROJECT_TASK', 'MESSAGE', 'RECOGNITION')),
    INDEX ix_comments_target_type_target_created_at (target_type, target_id, created_at),
    INDEX ix_comments_author (author_id),
    INDEX ix_comments_parent_comment (parent_comment_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- saved_items (SavedItem — 7 Social & Descoberta; RF26, RF27, RF19)
-- Salvos do usuário → CASCADE. Único (user, target).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE saved_items (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    favorite                BOOLEAN         NOT NULL DEFAULT FALSE,
    saved_at                TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_saved_items_user_target_type_target UNIQUE (user_id, target_type, target_id),
    CONSTRAINT fk_saved_items__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_saved_items_target_type CHECK (target_type IN ('TASK', 'PROJECT', 'PLAN', 'KIT', 'PROJECT_TASK', 'MESSAGE', 'RECOGNITION'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- shares (Share — 7 Social & Descoberta; RF26, RF27, RF29)
-- Compartilhamentos. Ator → CASCADE; sessão/imagem SET NULL. externalToken único.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE shares (
    id                      BINARY(16)      NOT NULL,
    actor_id                BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    channel                 VARCHAR(20)     NOT NULL,
    session_id              BINARY(16)      NULL,
    external_token          VARCHAR(64)     NULL,
    expires_at              TIMESTAMP(6)    NULL,
    image_media_id          BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_shares_external_token UNIQUE (external_token),
    CONSTRAINT fk_shares__actor_id FOREIGN KEY (actor_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_shares__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_shares__image_media_id FOREIGN KEY (image_media_id) REFERENCES media_objects (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_shares_target_type CHECK (target_type IN ('TASK', 'PROJECT', 'PLAN', 'KIT', 'PROJECT_TASK', 'MESSAGE', 'RECOGNITION')),
    CONSTRAINT ck_shares_channel CHECK (channel IN ('MURAL', 'SESSAO_DECIA', 'LINK_EXTERNO')),
    INDEX ix_shares_target_type_target (target_type, target_id),
    INDEX ix_shares_actor (actor_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- remixes (Remix — 7 Social & Descoberta; RF26, RF23, RF40, RF42)
-- Remixes. Ator → CASCADE; oferta e lançamento de pontos SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE remixes (
    id                      BINARY(16)      NOT NULL,
    actor_id                BINARY(16)      NOT NULL,
    source_type             VARCHAR(20)     NOT NULL,
    source_id               BINARY(16)      NOT NULL,
    result_type             VARCHAR(20)     NOT NULL,
    result_id               BINARY(16)      NOT NULL,
    model_offer_id          BINARY(16)      NULL,
    ledger_entry_id         BINARY(16)      NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_remixes__actor_id FOREIGN KEY (actor_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_remixes_source_type CHECK (source_type IN ('TASK', 'PROJECT', 'PLAN', 'KIT', 'PROJECT_TASK', 'MESSAGE', 'RECOGNITION')),
    CONSTRAINT ck_remixes_result_type CHECK (result_type IN ('TASK', 'PROJECT', 'PLAN', 'KIT', 'PROJECT_TASK', 'MESSAGE', 'RECOGNITION')),
    INDEX ix_remixes_source_type_source (source_type, source_id),
    INDEX ix_remixes_actor (actor_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- follows (Follow — 7 Social & Descoberta; RF27, RF14, RF15)
-- Seguidores. Único (follower, target). Seguidor → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE follows (
    id                      BINARY(16)      NOT NULL,
    follower_id             BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ATIVO',
    at                      TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_follows_follower_target_type_target UNIQUE (follower_id, target_type, target_id),
    CONSTRAINT fk_follows__follower_id FOREIGN KEY (follower_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_follows_target_type CHECK (target_type IN ('USER', 'DEPARTMENT', 'COMPANY')),
    CONSTRAINT ck_follows_status CHECK (status IN ('ATIVO', 'REMOVIDO')),
    INDEX ix_follows_target_type_target_status (target_type, target_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- mural_entries (MuralEntry — 7 Social & Descoberta; RF27, RF15, RF35, RF42)
-- Feed institucional. Catálogos RESTRICT; ator → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE mural_entries (
    id                      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    kind                    VARCHAR(20)     NOT NULL,
    target_type             VARCHAR(20)     NULL,
    target_id               BINARY(16)      NULL,
    actor_id                BINARY(16)      NOT NULL,
    boost_until             TIMESTAMP(6)    NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_mural_entries__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_mural_entries__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_mural_entries__actor_id FOREIGN KEY (actor_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_mural_entries_kind CHECK (kind IN ('COMPARTILHAMENTO', 'DECISAO_VALIDADA', 'PROJETO_PUBLICADO', 'RECONHECIMENTO', 'META', 'DESTAQUE', 'IMPULSO', 'COMUNICADO')),
    CONSTRAINT ck_mural_entries_target_type CHECK (target_type IS NULL OR target_type IN ('TASK', 'PROJECT', 'PLAN', 'KIT', 'PROJECT_TASK', 'MESSAGE', 'RECOGNITION')),
    INDEX ix_mural_entries_company_at (company_id, at),
    INDEX ix_mural_entries_department_at (department_id, at),
    INDEX ix_mural_entries_boost_until (boost_until)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- notifications (Notification — 7 Social & Descoberta; RF27, RF8, RF13, RF15, RF39, RF42, RF46)
-- Notificações do destinatário → CASCADE; ator SET NULL. Índice (recipient, read_at) para a central (RF27).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE notifications (
    id                      BINARY(16)      NOT NULL,
    recipient_id            BINARY(16)      NOT NULL,
    actor_id                BINARY(16)      NULL,
    type                    VARCHAR(30)     NOT NULL,
    category                VARCHAR(20)     NOT NULL,
    resource_type           VARCHAR(40)     NULL,
    resource_id             BINARY(16)      NULL,
    title                   VARCHAR(200)    NOT NULL,
    body                    VARCHAR(1000)   NULL,
    payload_json            JSON            NULL,
    group_key               VARCHAR(120)    NULL,
    is_read                 BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at                 TIMESTAMP(6)    NULL,
    delivered_channels_json VARCHAR(255)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_notifications__recipient_id FOREIGN KEY (recipient_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_notifications__actor_id FOREIGN KEY (actor_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_notifications_type CHECK (type IN ('SESSAO_PROPOSTA', 'SESSAO_INICIADA', 'PARTICIPANTE_ADICIONADO', 'PARTICIPANTE_REMOVIDO', 'DIVERGENCIA_DETECTADA', 'PERGUNTA_IA', 'RESUMO_PUBLICADO', 'DECISAO_PROPOSTA', 'DECISAO_VALIDADA', 'DECISAO_DEVOLVIDA', 'REABERTURA', 'ARTEFATO', 'PRAZO_PROXIMO', 'PRAZO_VENCIDO', 'REACAO', 'COMENTARIO', 'MENCAO', 'REMIX', 'CHANCELA_ESTADO', 'INDICACAO', 'BENEFICIO', 'PONTOS', 'META', 'RECONHECIMENTO', 'TAREFA_DO_DIA', 'TRANSICAO', 'MENSAGEM_DIRETA', 'ATRIBUICAO_PROPOSTA', 'ATRIBUICAO_ACEITA', 'ATRIBUICAO_RECUSADA', 'ATRIBUICAO_DEVOLVIDA', 'TAREFA_REUTILIZADA', 'SISTEMA')),
    CONSTRAINT ck_notifications_category CHECK (category IN ('SOCIAL', 'DECIA', 'PRAZO', 'CHANCELA', 'PONTOS', 'SISTEMA')),
    INDEX ix_notifications_recipient_is_read_created_at (recipient_id, is_read, created_at),
    INDEX ix_notifications_recipient_read_at (recipient_id, read_at),
    INDEX ix_notifications_group_key (group_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- announcements (Announcement — 7 Social & Descoberta; RF15, RF27)
-- Comunicados da EMPRESA/CHEFE. Catálogos e autor RESTRICT (comunicação oficial).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE announcements (
    id                      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    author_id               BINARY(16)      NOT NULL,
    title                   VARCHAR(200)    NOT NULL,
    body_md                 MEDIUMTEXT      NOT NULL,
    attachments_json        JSON            NULL,
    visibility              VARCHAR(20)     NOT NULL DEFAULT 'EMPRESA',
    pinned                  BOOLEAN         NOT NULL DEFAULT FALSE,
    comments_enabled        BOOLEAN         NOT NULL DEFAULT TRUE,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'RASCUNHO',
    published_at            TIMESTAMP(6)    NULL,
    archived_at             TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_announcements__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_announcements__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_announcements__author_id FOREIGN KEY (author_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_announcements_visibility CHECK (visibility IN ('EMPRESA', 'PUBLICO')),
    CONSTRAINT ck_announcements_status CHECK (status IN ('RASCUNHO', 'PUBLICADO', 'FIXADO', 'ARQUIVADO')),
    INDEX ix_announcements_company_status_published_at (company_id, status, published_at),
    INDEX ix_announcements_department (department_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
