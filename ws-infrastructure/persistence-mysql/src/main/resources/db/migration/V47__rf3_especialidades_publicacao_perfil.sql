-- RF3 (auditoria Onda 1, 31/10/2026): especialidades e controle de publicação do perfil público.
--   * specialties_json: até 10 rótulos curtos (≤ 40 caracteres), já normalizados e sem repetição pela aplicação (Specialties);
--     NULL = nenhuma.
--   * profile_visibility: quem vê o perfil público, a foto, as tarefas visíveis e pode seguir — AUTENTICADOS (padrão, qualquer conta
--     autenticada) ou EMPRESA (só contas da mesma users.company_id). Aplicado no servidor (ResourceAuthorizer.requireProfileVisible).
ALTER TABLE users
    ADD COLUMN specialties_json   JSON        NULL AFTER bio,
    ADD COLUMN profile_visibility VARCHAR(20) NOT NULL DEFAULT 'AUTENTICADOS' AFTER specialties_json,
    ADD CONSTRAINT ck_users_profile_visibility CHECK (profile_visibility IN ('AUTENTICADOS', 'EMPRESA'));
