# audit_log append-only no banco (V72)

Estado em 27/11/2026. Complementa a TAXONOMIA §12.1 e o comentário do `V2__baseline_dominio_base.sql`.

## O que garante

| Camada | Controle |
| --- | --- |
| Aplicação | `AuditLogPort` só tem `record` (INSERT); `AuditLogJpaRepository` é um `Repository` sem `save` de atualização nem `delete`; `AuditEvent` saneia chaves que parecem segredo. |
| Integridade referencial | `audit_log.actor_id → users.id` é `RESTRICT`: apagar conta com trilha falha; conta real é anonimizada (`AccountAnonymizer`), nunca apagada. |
| **Banco (V72)** | Gatilhos `trg_audit_log_no_update` e `trg_audit_log_no_delete` (`BEFORE UPDATE`/`BEFORE DELETE`, `FOR EACH ROW SIGNAL SQLSTATE '45000'`). Qualquer conexão (bug, SQL manual, injeção) que tente alterar ou apagar uma linha recebe erro e a linha fica intacta. |

Provado por `AuditLogAppendOnlyIT` (MySQL 8.4 real, usuário sem SUPER): INSERT passa; UPDATE de uma coluna, UPDATE em massa
(inclusive tentar apagar IP), DELETE de uma linha e DELETE geral falham com SQLSTATE 45000; dentro de transação o erro não desfaz o
que já foi inserido; os dois gatilhos existem em `information_schema.TRIGGERS`. O `ForeignKeyPolicyTest` também mostra que a trilha
não sai por `DELETE` direto.

## Fluxos legítimos conferidos

Nenhum caminho do código atualiza ou apaga `audit_log`:

- anonimização da conta (`AccountAnonymizer`): só **insere** o evento `ACCOUNT_ANONYMIZED`; os eventos antigos continuam com o
  `actor_id` (id interno, sem dado que identifique a pessoa);
- não existe rotina de retenção/expurgo da trilha;
- o único `DELETE FROM audit_log` do repositório era um teste de política de FK (`ForeignKeyPolicyTest`), reescrito para provar o
  bloqueio e testar o `CASCADE` com uma conta sem trilha.

Se uma política de retenção legal exigir expurgo no futuro, ela será uma migration/rotina de DBA explícita (derruba o gatilho, apaga
pelo critério aprovado, recria o gatilho), registrada no `docs/DECISOES.md` — nunca um caminho da aplicação.

## Pré-requisito do servidor MySQL

Com o binlog ligado (padrão do MySQL 8.4), `CREATE TRIGGER` por um usuário sem `SUPER` falha com o erro **1419** a menos que
`log_bin_trust_function_creators = 1`. A V72 roda com o usuário da aplicação, então:

| Ambiente | Onde está ligado |
| --- | --- |
| Desenvolvimento | `docker-compose.dev.yml` (`--log-bin-trust-function-creators=1` no `command` do MySQL) |
| Testes (Testcontainers) | `src/test/resources/mysql-default-conf/my.cnf` em `persistence-mysql` e `ws-bootstrap` (sobrepõe o `my.cnf` do jar do Testcontainers) |
| Produção | parameter group / `my.cnf` do servidor gerenciado — **ligar antes do deploy da V72**, senão o Flyway falha e a API não sobe |

## Limites conhecidos

- `TRUNCATE TABLE` e `DROP TABLE` não disparam gatilho. Hoje o Flyway roda com o mesmo usuário da aplicação, que tem `DROP` no schema.
  Recomendação para produção: usuário de migração separado (DDL) e usuário da aplicação só com `SELECT, INSERT, UPDATE, DELETE` —
  aí a trilha fica protegida também contra `TRUNCATE`.
- Quem tem privilégio de DDL pode derrubar o gatilho; o controle contra isso é operacional (acesso de DBA auditado no provedor).
- Encadeamento por hash (cada linha com o hash da anterior) e carimbo de tempo externo ficam para uma próxima onda.
