-- V24 — seg_bloco5_quarentena_midia (12 Plataforma). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- media_scans (MediaScan — 12 Plataforma; RF20, RF34, RF38, RF41)
-- Quarentena/antivírus por objeto de mídia (filho de media_objects → CASCADE); única por media_id. Tipo
-- detectado por magic bytes.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE media_scans (
    id                      BINARY(16)      NOT NULL,
    media_id                BINARY(16)      NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDENTE',
    detected_type           VARCHAR(20)     NOT NULL,
    engine                  VARCHAR(40)     NULL,
    threat_name             VARCHAR(200)    NULL,
    scanned_at              TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_media_scans_media_id UNIQUE (media_id),
    CONSTRAINT fk_media_scans__media_id FOREIGN KEY (media_id) REFERENCES media_objects (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_media_scans_status CHECK (status IN ('PENDENTE', 'LIMPO', 'INFECTADO', 'NAO_VERIFICADO')),
    INDEX ix_media_scans_status_created_at (status, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
