-- V3 — RF1/RF2 (Bloco 3): códigos de verificação de e-mail, tokens de redefinição de senha e (reserva) 2FA.
-- Só o HASH do código/token é guardado (SHA-256); `attempts` é persistido mesmo quando a conferência falha
-- (@Transactional(noRollbackFor = ApiException.class)) e o 5º erro invalida o código (RF1.CA11).
-- Dado do dono → ON DELETE CASCADE (ForeignKeyPolicy.POLICY: verification_codes.user_id → users CASCADE).
CREATE TABLE verification_codes (
    id                      BINARY(16)       NOT NULL,
    user_id                 BINARY(16)       NOT NULL,
    purpose                 VARCHAR(30)      NOT NULL,
    code_hash               VARCHAR(128)     NOT NULL,
    attempts                TINYINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at              TIMESTAMP(6)     NOT NULL,
    consumed_at             TIMESTAMP(6)     NULL,
    created_at              TIMESTAMP(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_verification_codes_code_hash UNIQUE (code_hash),
    CONSTRAINT fk_verification_codes__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_verification_codes_purpose CHECK (purpose IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'TWO_FACTOR')),
    INDEX ix_verification_codes_user_purpose (user_id, purpose, consumed_at),
    INDEX ix_verification_codes_expires_at  (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
