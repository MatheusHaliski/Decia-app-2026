-- V72 — audit_log_append_only (12 Plataforma / Segurança). MySQL 8.4, InnoDB.
-- O audit_log (V2) é append-only por contrato: a aplicação só faz INSERT (AuditLogJpaRepository não expõe update/delete) e a FK
-- actor_id → users é RESTRICT (conta real é anonimizada, nunca apagada — AccountAnonymizer só INSERE o evento ACCOUNT_ANONYMIZED).
-- Até aqui nada no BANCO impedia um UPDATE/DELETE (bug, SQL manual, injeção). Estes gatilhos tornam a trilha imutável para qualquer
-- conexão: toda tentativa falha com SQLSTATE 45000 e a mensagem abaixo, dentro da transação de quem tentou.
-- Conferido antes de criar: nenhum fluxo legítimo do código atualiza ou apaga audit_log (anonimização, retenção e testes só inserem
-- ou leem; o único DELETE era o de um teste de FK, ajustado junto). Uma futura política de retenção (expurgo após o prazo legal) terá
-- de ser uma migration/rotina de DBA explícita que derrube e recrie o gatilho, registrada em docs/DECISOES.md — nunca um caminho da app.
-- TRUNCATE não dispara gatilho: o usuário da aplicação em produção não deve ter DROP (TRUNCATE exige DROP) — ver
-- docs/arquitetura/seguranca-audit-log.md.
-- Corpo de uma instrução só (sem BEGIN/END): dispensa DELIMITER e roda igual no Flyway e no cliente mysql.
CREATE TRIGGER trg_audit_log_no_update BEFORE UPDATE ON audit_log
    FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log e append-only: UPDATE proibido';

CREATE TRIGGER trg_audit_log_no_delete BEFORE DELETE ON audit_log
    FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log e append-only: DELETE proibido';
