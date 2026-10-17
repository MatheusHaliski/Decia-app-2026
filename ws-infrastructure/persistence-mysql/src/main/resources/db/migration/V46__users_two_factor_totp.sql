-- RF2.CA02 / D-144: verificação em duas etapas por aplicativo autenticador (TOTP, RFC 6238).
-- O segredo é cifrado pela aplicação (AES-GCM, mesmo conversor de email_enc); os códigos de recuperação ficam só como SHA-256.
ALTER TABLE users
    ADD COLUMN two_factor_secret_enc      VARCHAR(512)  NULL AFTER two_factor_enabled,
    ADD COLUMN two_factor_recovery_hashes VARCHAR(1024) NULL AFTER two_factor_secret_enc,
    ADD COLUMN two_factor_last_step       BIGINT        NULL AFTER two_factor_recovery_hashes,
    ADD COLUMN two_factor_enabled_at      TIMESTAMP(6)  NULL AFTER two_factor_last_step;
