-- V20 — rf46_mensageria_atribuicao (12b Mensageria & Atribuição). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- direct_conversations (DirectConversation — 12b Mensageria & Atribuição; RF46, RF10)
-- Conversas (sem IA, sem pontos, sem índice). Empresa e criador RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE direct_conversations (
    id                      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NOT NULL,
    kind                    VARCHAR(20)     NOT NULL DEFAULT 'DIRETA',
    title                   VARCHAR(160)    NULL,
    created_by              BINARY(16)      NOT NULL,
    last_message_at         TIMESTAMP(6)    NULL,
    messaging_ttl_days      INT             NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_direct_conversations__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_direct_conversations__created_by FOREIGN KEY (created_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_direct_conversations_kind CHECK (kind IN ('DIRETA', 'GRUPO')),
    INDEX ix_direct_conversations_company_last_message_at (company_id, last_message_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- direct_conversation_participants (DirectConversationParticipant — 12b Mensageria & Atribuição; RF46)
-- Participantes (filho → CASCADE; pessoa → CASCADE).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE direct_conversation_participants (
    id                      BINARY(16)      NOT NULL,
    conversation_id         BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    joined_at               TIMESTAMP(6)    NOT NULL,
    left_at                 TIMESTAMP(6)    NULL,
    last_read_at            TIMESTAMP(6)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_direct_conversation_participants_conversation_user UNIQUE (conversation_id, user_id),
    CONSTRAINT fk_direct_conversation_participants__conversation_id FOREIGN KEY (conversation_id) REFERENCES direct_conversations (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_direct_conversation_participants__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    INDEX ix_direct_conversation_participants_user_left_at (user_id, left_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- assignments (Assignment — 12b Mensageria & Atribuição; RF46, RF10, RF18, RF19, RF44)
-- Atribuições (alvo polimórfico). Pessoas RESTRICT (trilha de responsabilidade); nó do rastro SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE assignments (
    id                      BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    from_user_id            BINARY(16)      NOT NULL,
    to_user_id              BINARY(16)      NOT NULL,
    origin                  VARCHAR(20)     NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PROPOSTA',
    due_at                  TIMESTAMP(6)    NULL,
    message                 VARCHAR(1000)   NULL,
    reason                  VARCHAR(500)    NULL,
    previous_responsible_id BINARY(16)      NULL,
    trace_node_id           BINARY(16)      NULL,
    responded_at            TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_assignments__from_user_id FOREIGN KEY (from_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_assignments__to_user_id FOREIGN KEY (to_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_assignments__previous_responsible_id FOREIGN KEY (previous_responsible_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_assignments__trace_node_id FOREIGN KEY (trace_node_id) REFERENCES decision_trace_nodes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_assignments_target_type CHECK (target_type IN ('TASK', 'PROJECT')),
    CONSTRAINT ck_assignments_origin CHECK (origin IN ('CHAT_WS', 'CHAT_DECIA', 'BOTAO_ESQUEMA', 'MINHA_EQUIPE')),
    CONSTRAINT ck_assignments_status CHECK (status IN ('PROPOSTA', 'ACEITA', 'RECUSADA', 'DEVOLVIDA')),
    INDEX ix_assignments_to_user_status (to_user_id, status),
    INDEX ix_assignments_from_user_status (from_user_id, status),
    INDEX ix_assignments_target_type_target (target_type, target_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
