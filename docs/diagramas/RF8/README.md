# RF8 — Editar arquivos de tarefas ou projetos dentro de meu perfil do Work Station
**HU:** HU8 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (o card "SPRINT 2" cita "RF8 Notificar divergências", escopo antigo — `RENUMERACAO.md`; fase (e) da ARQUITETURA §6) · **Equivalente FAI:** RF8 Editar peça (formulário da peça, trocar foto, versão da foto) + RF9 Editar esquema · **Aba/rota:** `/tasks/[id]/edit` (ficha + **anexos + versões**, a partir do Acervo Digital, RF6) e `/projects/[id]/edit` (ficha do projeto e arquivos das tarefas pela Mesa, RF22); "Editar no provedor" abre Google Docs/Sheets ou Word/Excel online; API `PATCH /api/tasks/{id}`, `POST /api/tasks/{id}/attachments`, `PUT /api/tasks/{id}/attachments/{attId}` (substituir), `POST /api/tasks/{id}/link/convert`, `POST /api/tasks/{id}/complete`, `PATCH /api/projects/{id}`, webhook `POST /api/integrations/{provider}/changes`
**Critérios de aceite cobertos:** RF8.CA01 … RF8.CA06 — **todos "(CA a confirmar)"**: o corpo do card está vazio; os CAs foram derivados do título + HU8 e reaproveitam RF20.CA07/CA12 (itens vinculados, `PipelineJob`), RF41.CA02/CA03 (estados, versões) e RF22.CA02/CA06 (versões de projeto, bloqueio). O foco deste RF são os **arquivos** (anexos, versões, provedor externo); a edição dos **dados** do esquema é o RF12. Todas as classes do RF são **(planejado)**; reais só os transversais (`SecurityConfig`, `SessionActiveFilter`, `Guard`, `AuditLogPort`, `S3StorageConfig`, `AiProvidersConfig`).

> **HU8** — COMO usuário do sistema Work Station POSSO editar uma tarefa ou projeto de meu perfil PARA concluir projetos e receber insights de feedback da IA a respeito da qualidade do item.

## Critérios de aceite derivados da HU8 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) | Origem |
|---|---|---|
| **RF8.CA01** (CA a confirmar) | Dado uma tarefa do meu perfil (sou `ownerId` ou `responsibleId`), quando edito título, categoria, tags, prazo, descrição ou classificação e salvo com `If-Match: version`, então o sistema valida como no criador (RF4: `422 VALIDACAO` por campo), grava com bloqueio otimista (`409 CONFLITO_VERSAO` se outra edição venceu), registra `AuditLog TASK_UPDATED` e reindexa no OpenSearch após o commit; quem não é dono nem responsável → `403 ACESSO_NEGADO`. | RF41.CA03, RF12 |
| **RF8.CA02** (CA a confirmar) | Dado os anexos da tarefa, quando substituo o arquivo principal ou adiciono um novo, então o upload passa por `MediaStoragePort` + `AntivirusPort` (`422 ARQUIVO_MALICIOSO` bloqueia; `415`/`413` como no RF4), a versão anterior é preservada como `TaskVersion` (`versionNumber + 1`, `snapshotMediaId` do arquivo antigo, `changeSummary`), e thumbnail/OCR são reprocessados por `PipelineJob` após o commit (falha → `REPROCESSAR`, aviso no card). | RF20.CA01/CA12, RF41.CA06 |
| **RF8.CA03** (CA a confirmar) | Dado um item `linkMode VINCULADO` (Google/Microsoft), quando aciono "Editar no provedor", então o documento abre no Google Docs/Sheets ou Word/Excel online com o OAuth do usuário; ao receber o webhook de mudança (`ExternalDocPort.watch`), `AcervoService.syncLinkedVersion` cria `TaskVersion` (`externalRevisionId`, `syncedAt`) e atualiza o thumbnail; "Converter em cópia" chama `convertLinkToSnapshot` (`linkMode COPIADO`, snapshot no S3); token revogado → conversão automática em snapshot com aviso. | RF20.CA07 |
| **RF8.CA04** (CA a confirmar) | Dado um projeto do meu perfil, quando edito a ficha (título, objetivo, prazo, programa, eixo) ou os arquivos das suas tarefas pela Mesa (RF22), então mudanças estruturais geram `ProjectVersion` com `diffJson` legível e as não-estruturais só atualizam; projeto `CONCLUIDO`/`ARQUIVADO` → `409 PROJETO_BLOQUEADO` (reabrir exige justificativa); a visibilidade dos arquivos segue a da tarefa dona (`AccessPolicy`). | RF22.CA02/CA06 |
| **RF8.CA05** (CA a confirmar) | Dado uma tarefa `EM_USO` ou `DISPONIVEL`, quando marco "Concluir" (`POST /api/tasks/{id}/complete`), então `TaskStateMachine` leva a `CONCLUIDA` com `TaskStateLog`; se era a última `ProjectTask` pendente de um projeto, `ProjectScheme.status` passa a `CONCLUIDO` e `percentComplete = 100`; transição inválida → `422 TRANSICAO_INVALIDA`; `BLOQUEADA` precisa ser desbloqueada antes. | RF41.CA02, RF5 §4 |
| **RF8.CA06** (CA a confirmar) | Dado um salvamento bem-sucedido, então após o commit a IA gera um **`Insight` de qualidade** (`scope` ACERVO para tarefa, PROJETO para projeto; `metricRefsJson` com completude, clareza, prazo, conformidade RF32; `actionsJson` com correções em 1 clique), exibido com faísca ✦ e "Por que isto?", registrado em `ai_inference_log` (capability `INSIGHT`, `hostRf RF8`); `accessClass` RESTRITO/SIGILOSO → `LocalEngine`; sem cota → sem insight (nunca bloqueia o salvamento). | RF43 §2–4, RF43.CA02 |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class TaskEditController {
    <<controller>>
    +update(id, PatchTaskRequest, ifMatch, CurrentUser, ctx) TaskView
    +addAttachment(id, MultipartFile, CurrentUser, ctx) AttachmentView
    +replaceAttachment(id, attId, MultipartFile, CurrentUser, ctx) AttachmentView
    +convertLink(id, CurrentUser, ctx) TaskView
    +complete(id, CurrentUser, ctx) TaskView
  }
  class ProjectEditController {
    <<controller>>
    +update(id, PatchProjectRequest, ifMatch, CurrentUser, ctx) ProjectView
  }
  class IntegrationWebhookController {
    <<controller>>
    +changes(provider, payload, signature) void
  }
  class AcervoService {
    <<service>>
    +update(id, PatchTaskCommand, version, actor, ctx) TaskItem
    +addAttachment(id, upload, actor, ctx) TaskAttachment
    +replaceAttachment(id, attId, upload, actor, ctx) TaskAttachment
    +syncLinkedVersion(taskId, externalRevisionId) TaskVersion
    +convertLinkToSnapshot(id, actor, ctx) TaskItem
    +complete(id, actor, ctx) TaskItem
  }
  class ProjectEditService {
    <<service>>
    +update(id, PatchProjectCommand, version, actor, ctx) ProjectScheme
    -isStructural(diff) boolean
    +completeIfAllDone(projectId) void
  }
  class UploadService {
    <<service>>
    +store(file, ownerId) MediaObject
  }
  class TaskStateMachine {
    <<service>>
    +transition(TaskItem, TaskState, actor, reason) TaskStateLog
  }
  class ProjectStatusStateMachine {
    <<service>>
    +transition(ProjectScheme, ProjectStatus, actor, reason) void
  }
  class QualityInsightService {
    <<service>>
    +afterSave(targetType, targetId) Insight
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
    capability INSIGHT
  }
  class AccessPolicy {
    <<service>>
    +canEdit(viewer, TaskItem) boolean
    +canEdit(viewer, ProjectScheme) boolean
  }
  class TaskRepositoryPort {
    <<port>>
    +findById(id) Optional
    +save(TaskItem) TaskItem
  }
  class ProjectRepositoryPort {
    <<port>>
    +save(ProjectScheme) ProjectScheme
    +pendingProjectTasks(projectId) int
  }
  class MediaStoragePort {
    <<port>>
    +put(key, bytes, mime) MediaObject
    +copy(from, to) MediaObject
  }
  class AntivirusPort {
    <<port>>
    +scan(MediaObject) ScanResult
  }
  class ExternalDocPort {
    <<port>>
    +editUrl(ref, token) URL
    +watch(ref) void
    +snapshot(ref) MediaObject
    +revision(ref) String
  }
  class PipelineJobPort {
    <<port>>
    +enqueue(type, targetType, targetId) PipelineJob
  }
  class SearchIndexPort {
    <<port>>
    +index(TaskItem) void
    +index(ProjectScheme) void
  }

  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID responsibleId
    +String title
    +TaskCategory category
    +Set~String~ tags
    +LocalDate dueAt
    +String descriptionMd
    +AccessClassification accessClass
    +TaskState state
    +LinkMode linkMode
    +String sourceRef
    +String thumbnailUrl
    +long version
  }
  class TaskAttachment {
    <<entity>>
    +UUID id
    +UUID taskId
    +UUID mediaObjectId
    +String fileName
    +String mimeType
    +String sha256
    +String antivirusStatus
    +String ocrStatus
    +boolean isPrimary
    +int sortOrder
  }
  class TaskVersion {
    <<entity>>
    +UUID id
    +UUID taskId
    +int versionNumber
    +String externalRevisionId
    +Instant syncedAt
    +String thumbnailUrl
    +String changeSummary
    +UUID snapshotMediaId
  }
  class TaskStateLog {
    <<entity>>
    +TaskState fromState
    +TaskState toState
    +UUID actorId
    +String reason
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +String objective
    +ProjectStatus status
    +UUID programGroupingId
    +UUID planAxisId
    +long version
  }
  class ProjectTask {
    <<entity>>
    +UUID taskId
    +UUID responsibleId
    +int percentComplete
  }
  class ProjectVersion {
    <<entity>>
    +UUID projectId
    +int versionNumber
    +UUID authorId
    +JSON diffJson
    +JSON snapshotJson
    +String reason
  }
  class MediaObject {
    <<entity>>
    +String objectKey
    +String mimeType
    +String sha256
  }
  class PipelineJob {
    <<entity>>
    +String type
    +PipelineJobStatus status
    +int attempts
    +String lastError
  }
  class Insight {
    <<entity>>
    +InsightScope scope
    +UUID scopeId
    +String kind
    +String title
    +String bodyMd
    +JSON metricRefsJson
    +JSON actionsJson
    +UUID aiInferenceId
  }
  class LinkMode {
    <<enum>>
    VINCULADO
    COPIADO
  }
  class PipelineJobStatus {
    <<enum>>
    PENDENTE
    RODANDO
    OK
    FALHA
    REPROCESSAR
  }

  TaskEditController --> AcervoService
  ProjectEditController --> ProjectEditService
  IntegrationWebhookController --> AcervoService
  AcervoService --> AccessPolicy
  AcervoService --> UploadService
  AcervoService --> TaskStateMachine
  AcervoService --> TaskRepositoryPort
  AcervoService --> ExternalDocPort
  AcervoService --> PipelineJobPort
  AcervoService --> SearchIndexPort
  AcervoService --> ProjectEditService : completeIfAllDone
  ProjectEditService --> AccessPolicy
  ProjectEditService --> ProjectStatusStateMachine
  ProjectEditService --> ProjectRepositoryPort
  UploadService --> MediaStoragePort
  UploadService --> AntivirusPort
  QualityInsightService --> AiEngine
  TaskItem "1" *-- "0..*" TaskAttachment
  TaskItem "1" *-- "0..*" TaskVersion
  TaskItem "1" --> "0..*" TaskStateLog
  TaskAttachment "1" --> "1" MediaObject
  TaskVersion "0..*" --> "0..1" MediaObject : snapshotMediaId
  ProjectScheme "1" *-- "0..*" ProjectVersion
  ProjectScheme "1" *-- "2..*" ProjectTask
  ProjectTask "0..*" --> "0..1" TaskItem
  PipelineJob "0..*" --> "1" TaskItem : THUMBNAIL, OCR, SYNC_EXTERNO
  Insight "0..*" --> "1" TaskItem : scope ACERVO
  Insight "0..*" --> "1" ProjectScheme : scope PROJETO
  TaskItem --> LinkMode
  PipelineJob --> PipelineJobStatus
  note for TaskVersion "versionNumber cresce a cada substituição de arquivo (CA02) ou revisão externa sincronizada (CA03)."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Dono ou responsável"]
    A1["Abre /tasks/{id}/edit a partir do Acervo Digital (RF6) ou /projects/{id}/edit (RF22)"]
    A2["Edita a ficha (título, categoria, tags, prazo, descrição, classificação)"]
    A3["Substitui o arquivo principal ou adiciona anexo"]
    A4["Item VINCULADO: Editar no provedor · Converter em cópia"]
    A5["Marca Concluir"]
    A6["Lê o Insight de qualidade ✦ e aplica correções em 1 clique"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["Formulário com If-Match: version · erro por campo"]
    F2["PATCH /api/tasks/{id} · PATCH /api/projects/{id}"]
    F3["POST|PUT /api/tasks/{id}/attachments (multipart) · lista de TaskVersion"]
    F4["Abre editUrl do provedor em nova aba (OAuth do usuário) · POST /api/tasks/{id}/link/convert"]
    F5["POST /api/tasks/{id}/complete"]
    F6["Painel Insight com Spark ✦ e 'Por que isto?' (polling após salvar)"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["TaskEditController · ProjectEditController · IntegrationWebhookController (assinatura do provedor)"]
    E403["403 ACESSO_NEGADO (nem dono nem responsável)"]
    E422["422 VALIDACAO por campo"]
    E409V["409 CONFLITO_VERSAO (If-Match)"]
    E409P["409 PROJETO_BLOQUEADO (CONCLUIDO/ARQUIVADO)"]
    E422M["422 ARQUIVO_MALICIOSO · 415 · 413"]
    E422T["422 TRANSICAO_INVALIDA (BLOQUEADA → desbloquear antes)"]
  end
  subgraph APP["ws-application"]
    S1["AccessPolicy.canEdit(viewer, task | project)?"]
    S2{"permitido?"}
    S3["AcervoService.update: valida como RF4 · compara version"]
    S4{"válido e versão igual?"}
    S5["save · AuditLog TASK_UPDATED"]
    T1["UploadService.store: MIME real · limite · AntivirusPort"]
    T2{"limpo?"}
    T3["TaskVersion(versionNumber+1, snapshotMediaId = arquivo antigo, changeSummary) · TaskAttachment aponta o novo MediaObject"]
    L1["ExternalDocPort.editUrl(sourceRef, token OAuth)"]
    L2["Webhook → syncLinkedVersion: TaskVersion(externalRevisionId, syncedAt) · thumbnail"]
    L3["convertLinkToSnapshot: ExternalDocPort.snapshot → S3 · linkMode COPIADO (automático se token revogado)"]
    P1["ProjectEditService.update: CONCLUIDO/ARQUIVADO?"]
    P2{"estrutural?"}
    P3["ProjectVersion(diffJson legível, snapshotJson, authorId)"]
    P4["só atualiza ficha"]
    C1["TaskStateMachine: EM_USO | DISPONIVEL → CONCLUIDA · TaskStateLog"]
    C2{"última ProjectTask pendente do projeto?"}
    C3["ProjectStatusStateMachine → CONCLUIDO · percentComplete = 100"]
    EV["AFTER_COMMIT: PipelineJob THUMBNAIL/OCR (REPROCESSAR em falha) · SearchIndexPort.index · QualityInsightService.afterSave"]
  end
  subgraph IA["AiEngine"]
    I1["Governança: accessClass RESTRITO/SIGILOSO → LocalEngine · AiQuota (sem cota → sem insight) · mascaramento"]
    I2["INSIGHT hostRf RF8: completude, clareza, prazo, conformidade (RF32) → Insight(metricRefsJson, actionsJson) · AiInferenceLog"]
  end
  subgraph PERS["Persistência"]
    D1[("MySQL: tasks, task_attachments, task_versions, task_state_log, project_schemes, project_versions, project_tasks, pipeline_jobs, insights, ai_inference_log, audit_log")]
    D2[("S3: novo arquivo · snapshot do antigo · thumbnails")]
    D3[("OpenSearch ws-tasks · ws-projects")]
    D4["Google Drive / Microsoft Graph (OAuth do usuário, webhooks)"]
  end

  A1 --> F1 --> A2 --> F2 --> W1 --> W2 --> S1 --> S2
  S2 -->|"não"| E403
  S2 -->|"sim"| S3 --> S4
  S4 -->|"campo inválido"| E422
  S4 -->|"versão antiga"| E409V
  S4 -->|"sim"| S5 --> D1
  S5 --> EV
  A3 --> F3 --> W2 --> T1 --> T2
  T2 -->|"não"| E422M
  T2 -->|"sim"| T3 --> D2
  T3 --> D1
  T3 --> EV
  A4 --> F4 --> L1 --> D4
  D4 -->|"webhook de mudança"| W2 --> L2 --> D1
  F4 -->|"converter"| L3 --> D2
  F2 -->|"projeto"| P1
  P1 -->|"bloqueado"| E409P
  P1 --> P2
  P2 -->|"sim"| P3 --> D1
  P2 -->|"não"| P4 --> D1
  P3 --> EV
  A5 --> F5 --> W2 --> C1
  C1 -->|"inválida"| E422T
  C1 --> C2
  C2 -->|"sim"| C3 --> D1
  C2 -->|"não"| D1
  C1 --> EV
  EV --> D3
  EV --> I1 --> I2 --> D1
  I2 --> F6 --> A6
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant R as Repository/MySQL
  participant S3 as S3
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)
  participant GW as Google Workspace / Microsoft 365

  U->>N: substitui o arquivo principal em /tasks/{id}/edit
  N->>C: PUT /api/tasks/{id}/attachments/{attId} (multipart, If-Match: version)
  C->>S: AcervoService.replaceAttachment(id, attId, upload, actor, ctx)
  S->>R: findById(task)
  S->>S: AccessPolicy.canEdit(actor, task)
  alt nem dono nem responsável
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else versão divergente
    S-->>C: 409 CONFLITO_VERSAO
    C-->>N: 409 (recarregar e refazer)
  else upload inválido
    S->>S: UploadService.store → MIME real, limite, AntivirusPort.scan
    S-->>C: 422 ARQUIVO_MALICIOSO | 415 | 413
    C-->>N: erro
  else ok
    S->>S3: put(novo arquivo) + copy(antigo → snapshot/{versionNumber})
    S->>R: insert task_versions (versionNumber+1, snapshotMediaId, changeSummary)
    S->>R: update task_attachments (mediaObjectId, sha256, ocrStatus PENDENTE) + tasks.version+1
    S->>R: insert audit_log TASK_UPDATED {fields: attachments}
    S-->>C: AttachmentView
    C-->>N: 200
    EV->>R: enqueue PipelineJob THUMBNAIL, OCR (falha → REPROCESSAR + aviso no card)
    EV->>OS: index ws-tasks
    EV->>AI: QualityInsightService.afterSave(TASK, id)
    AI->>AI: governança (accessClass, AiQuota, mascaramento) → INSIGHT hostRf RF8
    AI->>R: insert insights (scope ACERVO, metricRefsJson, actionsJson) + ai_inference_log
    N->>C: GET /api/insights?scope=ACERVO&scopeId={id}
    C-->>N: 200 Insight ✦ "Por que isto?"
  end

  Note over U,GW: Item VINCULADO (Google/Microsoft)
  U->>N: "Editar no provedor"
  N->>C: GET /api/tasks/{id}/link/edit-url
  C->>S: ExternalDocPort.editUrl(sourceRef, token OAuth do usuário)
  S-->>C: URL do Google Docs / Word online
  C-->>N: 200 → nova aba
  GW->>C: POST /api/integrations/{provider}/changes (assinatura válida)
  C->>S: AcervoService.syncLinkedVersion(taskId, externalRevisionId)
  S->>GW: revision(ref) + thumbnail
  S->>R: insert task_versions (externalRevisionId, syncedAt, thumbnailUrl)
  S-->>C: 204
  alt token OAuth revogado
    S->>S: convertLinkToSnapshot (automático)
    S->>S3: put(snapshot)
    S->>R: update tasks.linkMode = COPIADO + aviso
  end

  Note over U,EV: Concluir
  U->>N: "Concluir" na tarefa EM_USO
  N->>C: POST /api/tasks/{id}/complete
  C->>S: AcervoService.complete(id, actor, ctx)
  alt BLOQUEADA
    S-->>C: 422 TRANSICAO_INVALIDA (desbloquear antes)
    C-->>N: 422
  else ok
    S->>R: TaskStateMachine → CONCLUIDA + task_state_log
    S->>R: pendingProjectTasks(projectId)
    opt era a última pendente
      S->>R: ProjectStatusStateMachine → CONCLUIDO, percentComplete = 100, ProjectVersion(reason CONCLUSAO)
    end
    S-->>C: TaskView
    C-->>N: 200 (Tag carimbo CONCLUÍDA)
    EV->>OS: index ws-tasks, ws-projects
  end
```

## 4. Máquina de estados

Entidade central: **`TaskItem.state`** (`TaskState`) na porção acionada pela edição (concluir, bloqueios) e, em paralelo, o **`PipelineJob.status`** dos reprocessamentos de arquivo (CA02/CA03). `ProjectStatus` (CA04/CA05) está completo no RF5 §4; aqui só a chegada a `CONCLUIDO`.

```mermaid
stateDiagram-v2
  direction LR
  state "TaskState (edição)" as TS {
    state "DISPONIVEL" as DIS
    state "EM_USO" as USO
    state "BLOQUEADA" as BLO
    state "CONCLUIDA" as CON
    state "ARQUIVADA" as ARQ
    DIS --> CON : POST /api/tasks/{id}/complete (CA05) · TaskStateLog
    USO --> CON : complete (CA05) [se última ProjectTask pendente → ProjectStatus CONCLUIDO, percentComplete 100]
    BLO --> DIS : desbloquear (pré-requisito do complete)
    BLO --> USO : desbloquear [em projeto ativo]
    CON --> ARQ : arquivar
    ARQ --> DIS : reabrir com justificativa (RF12.CA05)
    DIS --> DIS : PATCH /api/tasks/{id} · anexos · versões (não mudam estado)
    USO --> USO : PATCH /api/tasks/{id} · anexos · versões
  }
  state "PipelineJob (THUMBNAIL · OCR · SYNC_EXTERNO)" as PJ {
    state "PENDENTE" as PEN
    state "RODANDO" as ROD
    state "OK" as OK
    state "FALHA" as FAL
    state "REPROCESSAR" as REP
    [*] --> PEN : AFTER_COMMIT do salvamento (CA02) ou webhook do provedor (CA03)
    PEN --> ROD : worker pega o job
    ROD --> OK : thumbnail/OCR gravados · TaskAttachment.ocrStatus = OK
    ROD --> FAL : erro (attempts++)
    FAL --> REP : attempts < máximo · aviso no card
    REP --> ROD : nova tentativa agendada
    FAL --> [*] : attempts esgotados · lastError
    OK --> [*]
  }
  note right of CON
    Transição inválida: 422 TRANSICAO_INVALIDA.
    BLOQUEADA nunca vai direto a CONCLUIDA.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/tasks/[id]/edit · app/(shell)/projects/[id]/edit (Mesa, RF22)"]
    UI["packages/ui: Input/Select/Textarea, TaskCard (attachment), TypeChip, Tag, Due, Spark ✦ (Insight), Dialog (versões), Toast, ErrorState (job REPROCESSAR)"]
    BFF["app/bff/tasks/* · app/bff/projects/* · OAuth Google/Microsoft (cookies httpOnly)"]
    PG --> UI
    PG --> BFF
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    TC["TaskEditController · ProjectEditController"]
    WH["IntegrationWebhookController (assinatura HMAC do provedor, idempotência por revisionId)"]
    GEH["GlobalExceptionHandler (403, 409, 413, 415, 422)"]
  end
  subgraph WSAPP["ws-application"]
    ACV["acervo: AcervoService · UploadService · TaskStateMachine"]
    PRJ["projects: ProjectEditService · ProjectStatusStateMachine"]
    AIE["ai: QualityInsightService · AiEngine INSIGHT · AiQuota"]
    SECU["security: AccessPolicy · Guard (real)"]
    PORTS["ports: TaskRepositoryPort · ProjectRepositoryPort · MediaStoragePort · AntivirusPort · ExternalDocPort · PipelineJobPort · SearchIndexPort · AuditLogPort"]
    EVT["events: TaskUpdated · TaskCompleted · ProjectUpdated (AFTER_COMMIT) → SideEffectRunner"]
    ACV --> SECU
    ACV --> PORTS
    ACV --> EVT
    PRJ --> SECU
    PRJ --> PORTS
    PRJ --> EVT
    EVT --> AIE
  end
  subgraph WSDOM["ws-domain"]
    DOM["acervo: TaskItem · TaskAttachment · TaskVersion · TaskStateLog · projects: ProjectScheme · ProjectTask · ProjectVersion · platform: MediaObject · PipelineJob · ai: Insight · AiInferenceLog"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: Jpa*Repository · pipeline_jobs"]
    S3["storage-s3: arquivos, snapshots de versão, thumbnails"]
    OSE["search-opensearch: ws-tasks · ws-projects"]
    AIP["ai-providers: Claude → Gemini → LocalEngine"]
    PLT["platform: GoogleDriveAdapter · MicrosoftGraphAdapter (webhooks) · AntivirusAdapter · OcrAdapter · workers de PipelineJob"]
  end
  subgraph EXT["Externos"]
    GW["Google Workspace (Docs/Sheets, Drive changes)"]
    M365["Microsoft 365 (Word/Excel online, Graph subscriptions)"]
    CL["Claude · Gemini"]
  end

  BFF -->|"REST JSON"| SEC --> TC --> ACV
  TC --> PRJ
  GW -->|"webhook"| WH --> ACV
  M365 -->|"webhook"| WH
  TC --> GEH
  MY -.implementa.-> PORTS
  S3 -.implementa.-> PORTS
  OSE -.implementa.-> PORTS
  PLT -.implementa.-> PORTS
  AIP -.implementa.-> AIE
  ACV --> DOM
  PLT --> GW
  PLT --> M365
  AIP --> CL
  MY --> DB[("MySQL 8.4")]
  S3 --> MINIO[("S3 / MinIO")]
  OSE --> OSX[("OpenSearch 2.19")]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF8.CA01 | `TaskEditController.update`, `AcervoService.update`, `AccessPolicy.canEdit`, `TaskItem.version`, `SearchIndexPort` | `A2`→`F2`→`S1`→`S5`, `E403`, `E422`, `E409V` | 4–9 (mesmo guard e versão), 22 | `DIS`→`DIS`, `USO`→`USO` | `TC`, `ACV`, `SECU`, `OSE` | planejado |
| RF8.CA02 | `AcervoService.addAttachment/replaceAttachment`, `UploadService`, `AntivirusPort`, `TaskVersion`, `PipelineJob` | `A3`→`F3`→`T1`→`T3`→`EV`, `E422M` | 1–3, 10–21 | `PJ` inteiro | `S3`, `PLT` (antivírus, OCR), `UI` (`ErrorState`) | planejado |
| RF8.CA03 | `ExternalDocPort.editUrl/watch/snapshot/revision`, `AcervoService.syncLinkedVersion/convertLinkToSnapshot`, `IntegrationWebhookController`, `LinkMode` | `A4`→`F4`→`L1`→`L2`/`L3` | 27–40 | `PEN` por webhook (SYNC_EXTERNO) | `WH`, `PLT`, `GW`, `M365`, `BFF` (OAuth) | planejado (RF20.CA07) |
| RF8.CA04 | `ProjectEditService.update/isStructural`, `ProjectVersion`, `ProjectStatusStateMachine` | `F2`→`P1`→`P2`→`P3`/`P4`, `E409P` | — (mesmo padrão de 4–9) | `ProjectStatus` em RF5 §4, nota de `CON` | `PRJ`, `UI` (RF22) | planejado (RF22.CA02/CA06) |
| RF8.CA05 | `AcervoService.complete`, `TaskStateMachine`, `ProjectEditService.completeIfAllDone`, `ProjectRepositoryPort.pendingProjectTasks` | `A5`→`F5`→`C1`→`C2`→`C3`, `E422T` | 41–52 | `DIS`→`CON`, `USO`→`CON`, `BLO`→`DIS` | `ACV`, `PRJ` | planejado |
| RF8.CA06 | `QualityInsightService.afterSave`, `AiEngine` (INSIGHT), `Insight`, `AiInferenceLog` | `EV`→`I1`→`I2`→`F6`→`A6` | 23–26 | — | `AIE`, `AIP`, `UI` (`Spark`) | planejado (RF43) |
