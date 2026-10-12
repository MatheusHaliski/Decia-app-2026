-- Esboço da seed Flyway das artes de fundo (renomear para V<versão>__backgrounds_seed.sql ao entrar em
-- backend/src/main/resources/db/migration). MySQL 8. Fonte: docs/design-system/backgrounds/backgrounds.ts — manter em sincronia.
-- A tabela existe para o servidor validar `user_preferences.background_id` (RF3) e servir o seletor com rótulo traduzido.

CREATE TABLE IF NOT EXISTS background (
  id                VARCHAR(40)  NOT NULL,
  file              VARCHAR(120) NULL,                           -- NULL para "sem-arte"
  thumb             VARCHAR(120) NOT NULL,
  tone              ENUM('LIGHT','DARK') NOT NULL,
  recommended_theme ENUM('CLARO','ESCURO','ALTO_CONTRASTE','TERMINAL') NOT NULL,
  placeholder       TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order        SMALLINT     NOT NULL DEFAULT 0,
  active            TINYINT(1)   NOT NULL DEFAULT 1,
  created_at        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS background_i18n (
  background_id VARCHAR(40) NOT NULL,
  locale        ENUM('PT_BR','EN','ES') NOT NULL,
  label         VARCHAR(80) NOT NULL,
  PRIMARY KEY (background_id, locale),
  CONSTRAINT fk_background_i18n FOREIGN KEY (background_id) REFERENCES background (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO background (id, file, thumb, tone, recommended_theme, placeholder, sort_order) VALUES
  ('sem-arte',          NULL,                    'sem-arte.png',          'LIGHT', 'CLARO',          0, 0),
  ('malha-laranja',     'malha-laranja.svg',     'malha-laranja.png',     'DARK',  'ESCURO',         1, 1),
  ('nos-multicolor',    'nos-multicolor.svg',    'nos-multicolor.png',    'LIGHT', 'CLARO',          1, 2),
  ('terminal-noturno',  'terminal-noturno.svg',  'terminal-noturno.png',  'DARK',  'TERMINAL',       1, 3),
  ('disco-creme',       'disco-creme.svg',       'disco-creme.png',       'LIGHT', 'CLARO',          1, 4),
  ('blueprint-de-rede', 'blueprint-de-rede.svg', 'blueprint-de-rede.png', 'DARK',  'ESCURO',         1, 5),
  ('grade-minima',      'grade-minima.svg',      'grade-minima.png',      'LIGHT', 'ALTO_CONTRASTE', 1, 6)
ON DUPLICATE KEY UPDATE file = VALUES(file), thumb = VALUES(thumb), tone = VALUES(tone), recommended_theme = VALUES(recommended_theme), placeholder = VALUES(placeholder), sort_order = VALUES(sort_order);

INSERT INTO background_i18n (background_id, locale, label) VALUES
  ('sem-arte', 'PT_BR', 'Sem arte'),               ('sem-arte', 'EN', 'No artwork'),           ('sem-arte', 'ES', 'Sin arte'),
  ('malha-laranja', 'PT_BR', 'Malha laranja'),     ('malha-laranja', 'EN', 'Orange mesh'),     ('malha-laranja', 'ES', 'Malla naranja'),
  ('nos-multicolor', 'PT_BR', 'Nós multicolor'),   ('nos-multicolor', 'EN', 'Multicolor nodes'), ('nos-multicolor', 'ES', 'Nodos multicolor'),
  ('terminal-noturno', 'PT_BR', 'Terminal noturno'), ('terminal-noturno', 'EN', 'Night terminal'), ('terminal-noturno', 'ES', 'Terminal nocturna'),
  ('disco-creme', 'PT_BR', 'Disco creme'),         ('disco-creme', 'EN', 'Cream disc'),        ('disco-creme', 'ES', 'Disco crema'),
  ('blueprint-de-rede', 'PT_BR', 'Blueprint de rede'), ('blueprint-de-rede', 'EN', 'Network blueprint'), ('blueprint-de-rede', 'ES', 'Blueprint de red'),
  ('grade-minima', 'PT_BR', 'Grade mínima'),       ('grade-minima', 'EN', 'Minimal grid'),     ('grade-minima', 'ES', 'Cuadrícula mínima')
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- Ao trocar placeholder pela arte final: UPDATE background SET placeholder = 0, file = '<id>.<ext>' WHERE id = '<id>';
