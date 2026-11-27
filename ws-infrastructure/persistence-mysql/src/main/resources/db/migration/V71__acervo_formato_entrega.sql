-- V71 — acervo_formato_entrega (2 Acervo de Tarefas). MySQL 8.4, InnoDB.
-- Formato da entrega em família → variante → detalhes (docs/produto/FORMATOS_E_VARIANTES.md; catálogo em DeliveryFormats e
-- lib/tasks/formats.ts — mesmos códigos):
--   * tasks: o formato ESCOLHIDO no criador/edição (validado no serviço: variante da família, só chaves da variante);
--   * task_attachments e evidences: o formato do tipo REAL do binário (DetectedType/magic bytes, D-67 — nunca nome nem MIME do
--     cliente), com detalhes extraídos pelo servidor (páginas e camada de texto do PDF, largura × altura, abas, slides…).
-- Escrita à mão como a V37 e a V60 (V11 já aplicada nunca é regenerada — D-40); colunas opcionais, nenhuma linha existente muda.
-- Uma coluna por ALTER (o CatalogSchemaConsistencyTest lê ALTER TABLE … ADD COLUMN).
ALTER TABLE tasks ADD COLUMN format_family VARCHAR(20) NULL;
ALTER TABLE tasks ADD COLUMN format_variant VARCHAR(10) NULL;
ALTER TABLE tasks ADD COLUMN format_details_json JSON NULL;
ALTER TABLE tasks ADD CONSTRAINT ck_tasks_format_family CHECK (format_family IN ('PLANILHA', 'DOCUMENTO', 'APRESENTACAO', 'IMAGEM', 'DESENHO_TECNICO', 'DADOS', 'AUDIO_VIDEO', 'PACOTE', 'LINK', 'OUTRO'));
ALTER TABLE tasks ADD CONSTRAINT ck_tasks_c_format_details CHECK (format_details_json IS NULL OR (JSON_TYPE(format_details_json) = 'OBJECT' AND CHAR_LENGTH(format_details_json) <= 2000));
ALTER TABLE task_attachments ADD COLUMN format_family VARCHAR(20) NULL;
ALTER TABLE task_attachments ADD COLUMN format_variant VARCHAR(10) NULL;
ALTER TABLE task_attachments ADD COLUMN format_details_json JSON NULL;
ALTER TABLE task_attachments ADD CONSTRAINT ck_task_attachments_format_family CHECK (format_family IN ('PLANILHA', 'DOCUMENTO', 'APRESENTACAO', 'IMAGEM', 'DESENHO_TECNICO', 'DADOS', 'AUDIO_VIDEO', 'PACOTE', 'LINK', 'OUTRO'));
ALTER TABLE task_attachments ADD CONSTRAINT ck_task_attachments_c_format_details CHECK (format_details_json IS NULL OR (JSON_TYPE(format_details_json) = 'OBJECT' AND CHAR_LENGTH(format_details_json) <= 2000));
ALTER TABLE evidences ADD COLUMN format_family VARCHAR(20) NULL;
ALTER TABLE evidences ADD COLUMN format_variant VARCHAR(10) NULL;
ALTER TABLE evidences ADD COLUMN format_details_json JSON NULL;
ALTER TABLE evidences ADD CONSTRAINT ck_evidences_format_family CHECK (format_family IN ('PLANILHA', 'DOCUMENTO', 'APRESENTACAO', 'IMAGEM', 'DESENHO_TECNICO', 'DADOS', 'AUDIO_VIDEO', 'PACOTE', 'LINK', 'OUTRO'));
ALTER TABLE evidences ADD CONSTRAINT ck_evidences_c_format_details CHECK (format_details_json IS NULL OR (JSON_TYPE(format_details_json) = 'OBJECT' AND CHAR_LENGTH(format_details_json) <= 2000));
