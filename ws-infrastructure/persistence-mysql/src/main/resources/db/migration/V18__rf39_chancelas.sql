-- V18 — rf39_chancelas (9 Chancelas & Vínculos). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- seals (Seal — 9 Chancelas & Vínculos; RF39, RF20, RF21, RF28, RF40, RF45)
-- Chancelas (catálogo do emissor → RESTRICT). Política vigente em seal_policies.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE seals (
    id                      BINARY(16)      NOT NULL,
    issuer_user_id          BINARY(16)      NOT NULL,
    issuer_kind             VARCHAR(20)     NOT NULL,
    company_id              BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    name                    VARCHAR(120)    NOT NULL,
    tier                    VARCHAR(20)     NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ATIVA',
    art_json                JSON            NULL,
    icon_url                VARCHAR(500)    NULL,
    excellence              BOOLEAN         NOT NULL DEFAULT FALSE,
    available_from          TIMESTAMP(6)    NULL,
    available_until         TIMESTAMP(6)    NULL,
    usage_limit             INT             NULL,
    usage_count             INT             NOT NULL DEFAULT 0,
    auto_issued             BOOLEAN         NOT NULL DEFAULT FALSE,
    policy_id               BINARY(16)      NULL,
    recertification_required BOOLEAN         NOT NULL DEFAULT FALSE,
    description             TEXT            NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_seals__issuer_user_id FOREIGN KEY (issuer_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_seals__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_seals__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_seals_issuer_kind CHECK (issuer_kind IN ('EMPRESA', 'CHEFE')),
    CONSTRAINT ck_seals_tier CHECK (tier IN ('TAREFA', 'PROJETO', 'PLANO')),
    CONSTRAINT ck_seals_status CHECK (status IN ('ATIVA', 'PAUSADA', 'ENCERRADA')),
    CONSTRAINT ck_seals_c1 CHECK (usage_count >= 0),
    INDEX ix_seals_issuer_user_status (issuer_user_id, status),
    INDEX ix_seals_company_status (company_id, status),
    INDEX ix_seals_department (department_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- seal_policies (SealPolicy — 9 Chancelas & Vínculos; RF39)
-- Políticas de concessão por chancela (filho → CASCADE). Critérios [{criterion, threshold}].
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE seal_policies (
    id                      BINARY(16)      NOT NULL,
    seal_id                 BINARY(16)      NOT NULL,
    mode                    VARCHAR(20)     NOT NULL DEFAULT 'REVISAO',
    criteria_json           JSON            NOT NULL,
    recertify_every_days    INT             NULL,
    version                 INT             NOT NULL DEFAULT 0,
    valid_from              TIMESTAMP(6)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_seal_policies_seal_version UNIQUE (seal_id, version),
    CONSTRAINT fk_seal_policies__seal_id FOREIGN KEY (seal_id) REFERENCES seals (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_seal_policies_mode CHECK (mode IN ('AUTO', 'REVISAO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- seal_bonds (SealBond — 9 Chancelas & Vínculos; RF39, RF20, RF21, RF40, RF42, RF45)
-- Vínculos chancela × alvo (polimórfico). Chancela/emissor/autor RESTRICT (prova de mérito); revisor RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE seal_bonds (
    id                      BINARY(16)      NOT NULL,
    seal_id                 BINARY(16)      NOT NULL,
    issuer_user_id          BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    target_owner_id         BINARY(16)      NOT NULL,
    requested_by            BINARY(16)      NULL,
    basis                   VARCHAR(20)     NOT NULL,
    origin                  VARCHAR(20)     NOT NULL,
    confidence              DECIMAL(5,4)    NULL,
    justification           VARCHAR(1024)   NULL,
    criteria_report_json    JSON            NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'SUGERIDA',
    requires_review         BOOLEAN         NOT NULL DEFAULT FALSE,
    author_consent          BOOLEAN         NULL,
    ai_inference_id         BINARY(16)      NULL,
    responded_at            TIMESTAMP(6)    NULL,
    reviewed_at             TIMESTAMP(6)    NULL,
    reviewed_by             BINARY(16)      NULL,
    review_note             VARCHAR(1000)   NULL,
    seal_code               VARCHAR(40)     NULL,
    issued_at               TIMESTAMP(6)    NULL,
    expires_at              TIMESTAMP(6)    NULL,
    revoke_reason           VARCHAR(500)    NULL,
    last_recertified_at     TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT ux_seal_bonds_target_issuer_user UNIQUE (target_id, issuer_user_id),
    CONSTRAINT ux_seal_bonds_seal_code UNIQUE (seal_code),
    CONSTRAINT fk_seal_bonds__seal_id FOREIGN KEY (seal_id) REFERENCES seals (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_seal_bonds__issuer_user_id FOREIGN KEY (issuer_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_seal_bonds__target_owner_id FOREIGN KEY (target_owner_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_seal_bonds__requested_by FOREIGN KEY (requested_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_seal_bonds__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_seal_bonds__reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_seal_bonds_target_type CHECK (target_type IN ('TASK', 'PROJECT', 'PLAN')),
    CONSTRAINT ck_seal_bonds_basis CHECK (basis IN ('MODELO_MATCH', 'DEPARTAMENTO_MATCH', 'PLANO_MATCH', 'DECISAO_MATCH', 'POLITICA', 'INDICACAO', 'PREMIACAO')),
    CONSTRAINT ck_seal_bonds_origin CHECK (origin IN ('SUGESTAO_IA', 'POLITICA', 'INDICACAO', 'CURADORIA', 'MANUAL')),
    CONSTRAINT ck_seal_bonds_status CHECK (status IN ('SUGERIDA', 'ACEITA', 'EDITADA', 'RECUSADA', 'EM_REVISAO', 'APROVADA', 'APROVADA_PRIVADA', 'REJEITADA', 'REVOGADA', 'EXPIRADA')),
    INDEX ix_seal_bonds_seal_status (seal_id, status),
    INDEX ix_seal_bonds_target_type_target (target_type, target_id),
    INDEX ix_seal_bonds_target_owner_status (target_owner_id, status),
    INDEX ix_seal_bonds_status_expires_at (status, expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- seal_proposals (SealProposal — 9 Chancelas & Vínculos; RF39)
-- Propostas de chancela. Proponente → CASCADE; departamento RESTRICT; chancela criada SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE seal_proposals (
    id                      BINARY(16)      NOT NULL,
    proposer_id             BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NOT NULL,
    name                    VARCHAR(120)    NOT NULL,
    rationale               TEXT            NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDENTE',
    resulting_seal_id       BINARY(16)      NULL,
    decided_by              BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_seal_proposals__proposer_id FOREIGN KEY (proposer_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_seal_proposals__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_seal_proposals__resulting_seal_id FOREIGN KEY (resulting_seal_id) REFERENCES seals (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_seal_proposals__decided_by FOREIGN KEY (decided_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_seal_proposals_status CHECK (status IN ('PENDENTE', 'CRIADA', 'RECUSADA')),
    INDEX ix_seal_proposals_department_status (department_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- benefits (Benefit — 9 Chancelas & Vínculos; RF39, RF35, RF19, RF42)
-- Benefícios por chancela (RESTRICT: resgates dependem dele). Emissor RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE benefits (
    id                      BINARY(16)      NOT NULL,
    seal_id                 BINARY(16)      NOT NULL,
    issuer_user_id          BINARY(16)      NOT NULL,
    type                    VARCHAR(20)     NOT NULL,
    title                   VARCHAR(160)    NOT NULL,
    rules                   TEXT            NULL,
    value_json              JSON            NULL,
    starts_at               TIMESTAMP(6)    NULL,
    expires_at              TIMESTAMP(6)    NULL,
    total_quota             INT             NULL,
    per_user_limit          INT             NOT NULL DEFAULT 1,
    redeemed_count          INT             NOT NULL DEFAULT 0,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'DISPONIVEL',
    visibility              VARCHAR(20)     NOT NULL DEFAULT 'EMPRESA',
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_benefits__seal_id FOREIGN KEY (seal_id) REFERENCES seals (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_benefits__issuer_user_id FOREIGN KEY (issuer_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_benefits_type CHECK (type IN ('CERTIFICADO', 'CREDITOS_IA', 'PONTOS_BONUS', 'VITRINE_DIRETA', 'PRIORIDADE_REVISAO', 'CAPACITACAO', 'MENCAO_RELATORIO')),
    CONSTRAINT ck_benefits_status CHECK (status IN ('DISPONIVEL', 'ESGOTADO', 'ENCERRADO')),
    CONSTRAINT ck_benefits_visibility CHECK (visibility IN ('PRIVADA', 'DEPARTAMENTO', 'EMPRESA', 'PUBLICA')),
    CONSTRAINT ck_benefits_c1 CHECK (redeemed_count >= 0),
    INDEX ix_benefits_seal_status (seal_id, status),
    INDEX ix_benefits_issuer_user (issuer_user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- benefit_redemptions (BenefitRedemption — 9 Chancelas & Vínculos; RF39, RF42, RF19)
-- Resgates (idempotentes). RESTRICT em benefício, vínculo, pessoa e lançamento.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE benefit_redemptions (
    id                      BINARY(16)      NOT NULL,
    benefit_id              BINARY(16)      NOT NULL,
    seal_bond_id            BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    code                    VARCHAR(40)     NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'EMITIDO',
    redeemed_at             TIMESTAMP(6)    NULL,
    expires_at              TIMESTAMP(6)    NULL,
    certificate_media_id    BINARY(16)      NULL,
    ledger_entry_id         BINARY(16)      NULL,
    idempotency_key         VARCHAR(120)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_benefit_redemptions_code UNIQUE (code),
    CONSTRAINT ux_benefit_redemptions_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT fk_benefit_redemptions__benefit_id FOREIGN KEY (benefit_id) REFERENCES benefits (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_benefit_redemptions__seal_bond_id FOREIGN KEY (seal_bond_id) REFERENCES seal_bonds (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_benefit_redemptions__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_benefit_redemptions__certificate_media_id FOREIGN KEY (certificate_media_id) REFERENCES media_objects (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_benefit_redemptions__ledger_entry_id FOREIGN KEY (ledger_entry_id) REFERENCES decia_points_ledger (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_benefit_redemptions_status CHECK (status IN ('EMITIDO', 'RESGATADO', 'EXPIRADO', 'CANCELADO')),
    INDEX ix_benefit_redemptions_user_status (user_id, status),
    INDEX ix_benefit_redemptions_benefit (benefit_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE seals ADD CONSTRAINT fk_seals__policy_id FOREIGN KEY (policy_id) REFERENCES seal_policies (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;
