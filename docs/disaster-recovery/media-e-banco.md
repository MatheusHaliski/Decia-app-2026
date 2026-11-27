# Backup e restauração: banco (MySQL) e arquivos (mídia)

Estado em 27/11/2026. O backup do repositório Git está em [`repository-backup.md`](repository-backup.md) e **não** cobre dados da
aplicação. Este runbook cobre o que ele deixa de fora: o MySQL e os binários de anexos/evidências/avatares.

## O que precisa de backup, e juntos

| Dado | Onde vive | Observação |
| --- | --- | --- |
| Metadados, tarefas, auditoria, chaves de mídia | MySQL 8.4 (schema `workstation`) | `media_objects.object_key` aponta para o binário. |
| Binários (anexos, evidências, avatares) | `ws.storage.type=local`: volume `/app/data/media` do contêiner (`VOLUME` no `Dockerfile.backend`); `ws.storage.type=s3`: bucket `WS_S3_BUCKET` | Sem o volume os arquivos somem a cada deploy. |
| Chave de cifra de campos | `WS_DATA_ENCRYPTION_KEY` (gerenciador de segredos) | Sem ela os campos `*_enc` (e-mail, coordenadas, captura EXIF) não são legíveis. **Nunca** vai junto do dump. |

Banco e binários precisam ser copiados em sequência próxima: restaurar um banco mais novo que os arquivos gera anexos sem binário
(`mídia ausente no storage`); o inverso só deixa binários órfãos (inofensivo).

## Rotina recomendada (diária)

1. **MySQL** — dump consistente sem travar a aplicação:
   ```bash
   mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF \
     -h "$WS_DB_HOST" -u "$BACKUP_USER" -p workstation | gzip > "workstation-$(date -u +%F).sql.gz"
   ```
   `--triggers` é obrigatório: a V72 protege o `audit_log` com gatilhos. O usuário de backup precisa de `SELECT`, `SHOW VIEW`,
   `TRIGGER` e `LOCK TABLES`.
2. **Binários, disco local** — logo depois do dump:
   ```bash
   docker run --rm -v ws-media:/data:ro -v "$PWD":/out alpine tar czf "/out/media-$(date -u +%F).tar.gz" -C /data .
   ```
   (`ws-media` = nome do volume montado em `/app/data/media`.)
3. **Binários, S3/MinIO** — replicação/versionamento do bucket no provedor, ou espelho:
   ```bash
   mc mirror --overwrite origem/workstation-media destino/workstation-media-backup
   ```
4. Enviar os artefatos para armazenamento independente, cifrado, com retenção definida (ex.: 30 diários + 12 mensais) e acesso
   restrito. Registrar a execução.

## Restauração

1. Subir MySQL 8.4 com `log_bin_trust_function_creators=1` (necessário para os gatilhos da V72 — ver
   [`../arquitetura/seguranca-audit-log.md`](../arquitetura/seguranca-audit-log.md)).
2. `gunzip -c workstation-AAAA-MM-DD.sql.gz | mysql -u root -p workstation`.
3. Restaurar os binários no volume (`tar xzf … -C /data`) ou no bucket (`mc mirror` invertido).
4. Configurar `WS_DATA_ENCRYPTION_KEY` com a MESMA chave da época do backup.
5. Subir a API: o Flyway só aplica migrations mais novas que as do dump.
6. Conferência por amostragem: abrir anexos recentes (`GET …/attachments/{id}/content`) e comparar o SHA-256 baixado com o
   `sha256` do anexo na API.

## Teste de restauração

Trimestral, em ambiente isolado, seguindo a seção anterior a partir do backup mais recente; anotar data, duração e problemas.
Nenhum backup conta como válido até ter sido restaurado uma vez.

## O que este documento não automatiza

Não há job de backup de banco/mídia no repositório: a execução depende da infraestrutura de produção (provedor gerenciado, cron ou
serviço de backup). O workflow `repository-backup.yml` continua só para o Git.
