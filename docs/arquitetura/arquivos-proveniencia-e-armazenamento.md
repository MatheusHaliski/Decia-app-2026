# Anexos: proveniência, variedade, armazenamento e antivírus

Estado em 27/11/2026 (backend). Complementa o D-67 (pipeline de mídia) e a V71 (formato de entrega).

## Pipeline comum (upload direto e conectores)

Todo binário que vira anexo ou evidência passa por `PreparedUpload.prepare` (`ws-application/.../media`), tanto no upload direto
(`TaskAttachmentService`) quanto na cópia trazida por conta conectada (`ConnectorService.store` → `ConnectorImportWriter`):

1. inspeção D-67 (`MediaUploadInspector`): tipo real por magic bytes / conteúdo, limites, zip-bomb, nome e MIME declarados;
2. **SHA-256 do arquivo como recebido** (`originalSha256`) e **metadados de captura** lidos do EXIF (`CaptureMetadata`) — antes do
   strip, que os apaga;
3. strip dos metadados embutidos (`ImageMetadata`) e SHA-256 do binário limpo (`sha256`, o guardado e deduplicado);
4. formato de entrega (`DetectedFormat`) extraído do binário limpo, pelo tipo real.

Antes desta onda a cópia por conector gravava o formato só pelo MIME (sem detalhes) e não passava pelo strip.

## Proveniência (V73)

Colunas novas em `task_attachments` e `evidences` (a evidência herda as quatro do anexo de onde nasce):

| Coluna | Conteúdo |
| --- | --- |
| `original_sha256` | SHA-256 do arquivo como chegou (antes do strip). Para tipos sem strip (PDF, Office, texto) é igual a `sha256`. |
| `uploaded_by` | Quem enviou ou importou (FK `users`, `SET NULL`). |
| `uploaded_via` | `DIRETO`, `GOOGLE`, `MICROSOFT`, `APPLE_ICLOUD` (enum `UploadChannel`). |
| `capture_metadata_enc` | JSON `{takenAt, latitude, longitude, cameraMake, cameraModel}` lido do EXIF (JPEG APP1, PNG `eXIf`, WEBP `EXIF`), **cifrado com AES-256-GCM** pelo mesmo `AesGcmStringConverter` das coordenadas da evidência. |

API (`AttachmentView`, `EvidenceView`): `sha256`, `originalSha256`, `uploadedBy`, `uploadedVia`, `hasCaptureMetadata` para quem vê a
tarefa; `capture` (os dados) só para quem pode editar a tarefa ou enviou o arquivo. A auditoria (`TASK_ATTACHMENT_ADDED`,
`TASK_EVIDENCE_ADDED`, `CONNECTOR_IMPORTED` com cópia) leva os dois hashes; a captura nunca vai para log nem auditoria.

## Variedade de formatos

`DetectedType` passou de 13 para 22 tipos:

| Tipo | Como é detectado | Família / variante | Detalhes extraídos |
| --- | --- | --- | --- |
| ODT, ODS, ODP | ZIP com entrada `mimetype` na raiz = `application/vnd.oasis.opendocument.text`/`spreadsheet`/`presentation` e `content.xml` | DOCUMENTO/ODT, PLANILHA/ODS, APRESENTACAO/ODP | `pages` (`meta:page-count`), `sheets` (`<table:table>`), `slides` (`<draw:page>`) |
| CSV, TSV | texto (abaixo) + extensão `.csv` / `.tsv`, `.tab` | PLANILHA/CSV, PLANILHA/TSV | `encoding`, `lineEnding`, `lines`, `delimiter`, `columns`, `headerRow` |
| TXT, MD | texto + `.txt`/`.text`/`.log`, `.md`/`.markdown` | DOCUMENTO/TXT, DOCUMENTO/MD | `encoding`, `lineEnding`, `lines` |
| JSON, XML | texto + `.json` / `.xml`, bem formado | DADOS/JSON, DADOS/XML | `encoding`, `lineEnding`, `lines` |

Heurística de texto (`TextInspector`): arquivo inteiro sem NUL nem controle C0 além de TAB/LF/CR/FF; decodifica como UTF-8 (com ou sem
BOM) ou, se não, Windows-1252 (bytes indefinidos recusam). JSON precisa de um único valor bem formado; XML é lido por StAX sem DTD
(DOCTYPE recusado: sem XXE nem bomba de entidades). **SVG fica de fora** (extensão `.svg` ou raiz `<svg>`), assim como HTML/XHTML.
Texto com extensão que não é de texto (ex.: `foto.png`, `app.js`) → `415 TIPO_NAO_PERMITIDO`; JSON/XML malformado →
`422 TEXTO_MALFORMADO`. Limite padrão da categoria TEXT: 20 MB (`ws.upload.max-bytes.TEXT`). Valores de `encoding`: `UTF8`,
`UTF8BOM`, `WINDOWS1252`; `lineEnding`: `LF`, `CRLF`, `CR`, `MIXED`; `delimiter`: `COMMA`, `SEMICOLON`, `TAB`, `PIPE`.

Lista final de tipos aceitos no anexo da tarefa (para o `accept` do front): PNG, JPEG, GIF, WEBP, PDF, DOCX, XLSX, PPTX, ZIP, DWG,
DXF, IFC, GLB, ODT, ODS, ODP, TXT, CSV, TSV, MD, JSON, XML — extensões `png jpg jpeg jpe gif webp pdf docx xlsx pptx zip dwg dxf ifc
glb odt ods odp txt text log csv tsv tab md markdown json xml`. A cópia por conector (`ConnectorService.COPYABLE`) não mudou.

## Armazenamento

| Adaptador | Quando | Notas |
| --- | --- | --- |
| `LocalMediaStorage` | `ws.storage.type=local` (padrão) | Diretório `WS_STORAGE_LOCAL_DIR`; no contêiner `/app/data/media` é `VOLUME` no `Dockerfile.backend`. Leitura em fluxo (`Files.newInputStream`). |
| `S3MediaStorage` | `ws.storage.type=s3` | S3 compatível (MinIO, AWS, Ceph) com o `HttpClient` da JDK e assinatura `SigV4` própria — o AWS SDK não está no repositório Maven offline do build. PUT com `x-amz-content-sha256` do corpo, GET em fluxo, DELETE idempotente, URL pré-assinada opcional (`ws.storage.s3.presign=true`). `SigV4Test` confere com os exemplos publicados pela AWS; `S3MediaStorageTest` roda contra um S3 falso que valida a assinatura. |

Variáveis do S3: `WS_S3_ENDPOINT` (ex.: `http://minio:9000`), `WS_S3_REGION`, `WS_S3_BUCKET` (precisa existir),
`WS_S3_ACCESS_KEY_ID`, `WS_S3_SECRET_ACCESS_KEY`, `WS_S3_PATH_STYLE` (padrão `true`, MinIO). Trocar o adaptador por um baseado no
AWS SDK depois é local ao módulo `storage-s3` (mesma `MediaStoragePort`).

Ciclo de vida do binário (`MediaUploadService`):

- **apagar só depois do commit**: `delete` remove o metadado na transação e registra `TransactionSynchronization.afterCommit` para o
  binário; rollback mantém o arquivo; sem transação ativa apaga na hora;
- **rollback depois do put**: o binário recém-gravado é apagado em `afterCompletion(ROLLED_BACK)`, a menos que outra transação já
  tenha gravado o mesmo objeto (dedupe por dono + SHA-256);
- **download em streaming com Range**: `GET /api/tasks/{id}/attachments/{attachmentId}/content` devolve um `Resource` de tamanho
  conhecido aberto sob demanda no storage; o Spring MVC responde `Accept-Ranges: bytes` e `206 Partial Content` para `Range`.

## Antivírus (ClamAV)

`ClamdAntivirus` (`ws-infrastructure/platform/.../antivirus`) implementa `AntivirusPort` pelo protocolo `zINSTREAM` do `clamd` em
TCP. Liga com `ws.upload.antivirus=clamd` (`WS_UPLOAD_ANTIVIRUS`), endereço `ws.upload.clamd.host`/`port` (`WS_CLAMD_HOST`,
`WS_CLAMD_PORT`, padrão 3310), `timeout-ms` e `chunk-bytes`. `stream: OK` → `LIMPO`; `stream: <assinatura> FOUND` → `INFECTADO`
(upload recusado com `422 ARQUIVO_INFECTADO`); erro do daemon ou daemon fora do ar → `NAO_VERIFICADO` (com
`WS_UPLOAD_REQUIRE_ANTIVIRUS=true` o arquivo fica em quarentena, 423). `ClamdAntivirusTest` roda contra um clamd falso em socket.

## Fora desta onda

Upload em partes (multipart S3) e limite de 200 MB para CAD; lixeira de 30 dias; miniaturas/prévia no servidor; conversão
LibreOffice; HEIC/MP4/MP3; recibo exportável (RFC 3161/ICP-Brasil) e encadeamento de hash na auditoria.
