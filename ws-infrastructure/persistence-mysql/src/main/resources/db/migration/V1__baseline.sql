-- V1 — baseline mínimo do esqueleto (Bloco 1). Só prova que o Flyway roda no MySQL 8.4 e que o MigrationVersionsTest
-- enxerga a versão. O baseline de verdade (users, user_preferences, refresh_tokens, audit_log, ai_inference_log,
-- feature_flags, domain_events, media_objects) é do Bloco 2 e entra em V2+ — NUNCA edite este arquivo depois de aplicado.
CREATE TABLE app_meta (
    meta_key    VARCHAR(64)  NOT NULL,
    meta_value  VARCHAR(255) NOT NULL,
    updated_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (meta_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

INSERT INTO app_meta (meta_key, meta_value) VALUES ('schema.baseline', 'bloco-1');
