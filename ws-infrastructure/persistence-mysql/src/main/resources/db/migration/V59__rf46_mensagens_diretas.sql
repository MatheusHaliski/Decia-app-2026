-- V59 — rf46_mensagens_diretas (12b Mensageria & Atribuição). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- direct_messages (DirectMessageRecord — 12b Mensageria & Atribuição; RF46)
-- Mensagens diretas em MySQL (fallback do Cassandra). Texto cifrado; apagar zera o texto e marca deleted_at.
-- Some com a conversa.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE direct_messages (
    id                      BINARY(16)      NOT NULL,
    conversation_id         BINARY(16)      NOT NULL,
    author_id               BINARY(16)      NOT NULL,
    body_enc                TEXT            NULL,
    sent_at                 TIMESTAMP(6)    NOT NULL,
    edited_at               TIMESTAMP(6)    NULL,
    deleted_at              TIMESTAMP(6)    NULL,
    changed_at              TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_direct_messages__conversation_id FOREIGN KEY (conversation_id) REFERENCES direct_conversations (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_direct_messages__author_id FOREIGN KEY (author_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    INDEX ix_direct_messages_conversation_sent_at (conversation_id, sent_at),
    INDEX ix_direct_messages_conversation_changed_at (conversation_id, changed_at),
    INDEX ix_direct_messages_author (author_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- direct_conversation_pairs (DirectConversationPair — 12b Mensageria & Atribuição; RF46)
-- Uma conversa DIRETA por par de pessoas (chave menorId:maiorId). Some com a conversa.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE direct_conversation_pairs (
    pair_key                VARCHAR(80)     NOT NULL,
    conversation_id         BINARY(16)      NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (pair_key),
    CONSTRAINT ux_direct_conversation_pairs_conversation UNIQUE (conversation_id),
    CONSTRAINT fk_direct_conversation_pairs__conversation_id FOREIGN KEY (conversation_id) REFERENCES direct_conversations (id)
        ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
