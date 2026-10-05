-- V19 — rf40_balcao_loja (11 Balcão & Loja). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- model_offers (ModelOffer — 11 Balcão & Loja; RF40, RF19, RF21, RF42)
-- Ofertas do Balcão (alvo polimórfico). Dono → CASCADE; quem destacou RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE model_offers (
    id                      BINARY(16)      NOT NULL,
    owner_id                BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    price_points            INT             NOT NULL DEFAULT 0,
    license                 VARCHAR(20)     NOT NULL DEFAULT 'ATRIBUICAO',
    usage_description       VARCHAR(1000)   NULL,
    visibility              VARCHAR(20)     NOT NULL DEFAULT 'EMPRESA',
    shelf                   VARCHAR(20)     NOT NULL DEFAULT 'COMUNIDADE',
    is_handover             BOOLEAN         NOT NULL DEFAULT FALSE,
    available_from          TIMESTAMP(6)    NULL,
    available_until         TIMESTAMP(6)    NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ATIVA',
    views_count             BIGINT          NOT NULL DEFAULT 0,
    remix_count             INT             NOT NULL DEFAULT 0,
    points_earned           BIGINT          NOT NULL DEFAULT 0,
    highlighted_by          BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT ux_model_offers_target_type_target_owner UNIQUE (target_type, target_id, owner_id),
    CONSTRAINT fk_model_offers__owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_model_offers__highlighted_by FOREIGN KEY (highlighted_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_model_offers_target_type CHECK (target_type IN ('TASK', 'PROJECT', 'KIT')),
    CONSTRAINT ck_model_offers_license CHECK (license IN ('COPIA_LIVRE', 'ATRIBUICAO', 'SOMENTE_LEITURA')),
    CONSTRAINT ck_model_offers_visibility CHECK (visibility IN ('DEPARTAMENTO', 'EMPRESA', 'PUBLICO')),
    CONSTRAINT ck_model_offers_shelf CHECK (shelf IN ('COMUNIDADE', 'CHANCELADO')),
    CONSTRAINT ck_model_offers_status CHECK (status IN ('ATIVA', 'RETIRADA', 'ESGOTADA')),
    CONSTRAINT ck_model_offers_c1 CHECK (price_points >= 0),
    INDEX ix_model_offers_status_shelf_visibility (status, shelf, visibility),
    INDEX ix_model_offers_owner_status (owner_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- store_items (StoreItem — 11 Balcão & Loja; RF42, RF38, RF40)
-- Catálogo da loja (RESTRICT: compras dependem dele). companyId nulo = global.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE store_items (
    id                      BINARY(16)      NOT NULL,
    kind                    VARCHAR(30)     NOT NULL,
    ref_id                  BINARY(16)      NULL,
    title                   VARCHAR(160)    NOT NULL,
    price_points            INT             NOT NULL DEFAULT 0,
    stock                   INT             NULL,
    available_from          TIMESTAMP(6)    NULL,
    available_until         TIMESTAMP(6)    NULL,
    company_id              BINARY(16)      NULL,
    active                  BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_store_items__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_store_items_kind CHECK (kind IN ('MODELO_BALCAO', 'CREDITOS_IA', 'SKIN_MESA', 'MOLDURA_CARD', 'CAPA_IA_LOTE', 'IMPULSO_MURAL', 'SESSAO_IA_AVANCADA', 'KIT_CHANCELADO', 'CERTIFICADO_PERSONALIZADO')),
    CONSTRAINT ck_store_items_c1 CHECK (price_points >= 0),
    INDEX ix_store_items_kind_active (kind, active),
    INDEX ix_store_items_company_active (company_id, active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- store_purchases (StorePurchase — 11 Balcão & Loja; RF42, RF38)
-- Compras (financeiro → RESTRICT em comprador, item e lançamento).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE store_purchases (
    id                      BINARY(16)      NOT NULL,
    buyer_id                BINARY(16)      NOT NULL,
    store_item_id           BINARY(16)      NOT NULL,
    price_paid              INT             NOT NULL DEFAULT 0,
    ledger_entry_id         BINARY(16)      NULL,
    delivery_json           JSON            NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'CONCLUIDA',
    idempotency_key         VARCHAR(120)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_store_purchases_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT fk_store_purchases__buyer_id FOREIGN KEY (buyer_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_store_purchases__store_item_id FOREIGN KEY (store_item_id) REFERENCES store_items (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_store_purchases__ledger_entry_id FOREIGN KEY (ledger_entry_id) REFERENCES decia_points_ledger (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_store_purchases_status CHECK (status IN ('CONCLUIDA', 'FALHA', 'ESTORNADA')),
    INDEX ix_store_purchases_buyer_created_at (buyer_id, created_at),
    INDEX ix_store_purchases_store_item (store_item_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- user_skins (UserSkin — 11 Balcão & Loja; RF38, RF42)
-- Skins do usuário → CASCADE; compra de origem SET NULL. Única (user, kind, key).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE user_skins (
    id                      BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    skin_kind               VARCHAR(20)     NOT NULL,
    skin_key                VARCHAR(60)     NOT NULL,
    acquired_via            VARCHAR(20)     NOT NULL DEFAULT 'PADRAO',
    purchase_id             BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_user_skins_user_skin_kind_skin_key UNIQUE (user_id, skin_kind, skin_key),
    CONSTRAINT fk_user_skins__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_user_skins__purchase_id FOREIGN KEY (purchase_id) REFERENCES store_purchases (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_user_skins_skin_kind CHECK (skin_kind IN ('MESA', 'CARD', 'TEMA')),
    CONSTRAINT ck_user_skins_acquired_via CHECK (acquired_via IN ('PADRAO', 'COMPRA', 'BENEFICIO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE remixes ADD CONSTRAINT fk_remixes__model_offer_id FOREIGN KEY (model_offer_id) REFERENCES model_offers (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;
