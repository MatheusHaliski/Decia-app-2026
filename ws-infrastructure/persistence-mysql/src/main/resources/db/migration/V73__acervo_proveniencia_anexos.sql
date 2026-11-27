-- V73 — acervo_proveniencia_anexos (2 Acervo de Tarefas). MySQL 8.4, InnoDB.
-- Proveniência do binário de anexos e evidências (auditoria "Proveniência"):
--   * original_sha256: SHA-256 do arquivo COMO RECEBIDO, antes de o servidor remover os metadados (EXIF/XMP) da imagem; o sha256 que já
--     existia é o do binário guardado (limpo). Os dois juntos provam que o arquivo guardado deriva do enviado.
--   * uploaded_by: quem enviou (SET NULL: conta de teste apagada não leva o anexo; conta real é anonimizada, nunca apagada).
--   * uploaded_via: DIRETO (upload pela pessoa) ou o provedor conectado de onde veio a cópia (GOOGLE, MICROSOFT, APPLE_ICLOUD).
--   * capture_metadata_enc: data/hora original, GPS e câmera lidos do EXIF ANTES do strip — JSON cifrado com AES-256-GCM pelo mesmo
--     AesGcmStringConverter das coordenadas da evidência (dado pessoal; só quem edita a tarefa vê).
-- Evidência herda os quatro do anexo de onde nasceu. Escrita à mão como a V71 (V11 já aplicada nunca é regenerada — D-40); colunas
-- opcionais, nenhuma linha existente muda. Uma coluna por ALTER (o CatalogSchemaConsistencyTest lê ALTER TABLE … ADD COLUMN).
ALTER TABLE task_attachments ADD COLUMN original_sha256 CHAR(64) NULL;
ALTER TABLE task_attachments ADD COLUMN uploaded_by BINARY(16) NULL;
ALTER TABLE task_attachments ADD COLUMN uploaded_via VARCHAR(20) NULL;
ALTER TABLE task_attachments ADD COLUMN capture_metadata_enc TEXT NULL;
ALTER TABLE task_attachments ADD CONSTRAINT ck_task_attachments_uploaded_via CHECK (uploaded_via IN ('DIRETO', 'GOOGLE', 'MICROSOFT', 'APPLE_ICLOUD'));
ALTER TABLE task_attachments ADD CONSTRAINT fk_task_attachments__uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE evidences ADD COLUMN original_sha256 CHAR(64) NULL;
ALTER TABLE evidences ADD COLUMN uploaded_by BINARY(16) NULL;
ALTER TABLE evidences ADD COLUMN uploaded_via VARCHAR(20) NULL;
ALTER TABLE evidences ADD COLUMN capture_metadata_enc TEXT NULL;
ALTER TABLE evidences ADD CONSTRAINT ck_evidences_uploaded_via CHECK (uploaded_via IN ('DIRETO', 'GOOGLE', 'MICROSOFT', 'APPLE_ICLOUD'));
ALTER TABLE evidences ADD CONSTRAINT fk_evidences__uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE RESTRICT;
