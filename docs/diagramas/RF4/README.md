# RF4 — Utilizar o criador de tarefas, escolhendo o tipo do arquivo e editando detalhes, em modo manual ou com IA
**HU:** HU4 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (o card "SPRINT 1" cita "RF4 Tema e acesso da sessão", escopo antigo — ver `RENUMERACAO.md`; fase (d) da ARQUITETURA §6) · **Equivalente FAI:** RF4 Adicionar peça (foto → IA pré-preenche → formulário com taxonomia oficial → "Mais detalhes" → Closet) + RF11 Background Studio + buscador web de marcas · **Aba/rota:** Criar Tarefa (`/tasks/new`; folha "+ Criar" do `SidebarNav`; botão "Cadastrar nova tarefa" do Criador de Projetos, RF5); API `POST /api/tasks`, `POST /api/tasks/uploads`, `POST /api/tasks/detect`, `GET /api/org-entities/search`, `GET /api/legal-deadlines/compute` · **real em 17/10/2026:** só `/tasks/new` (`TaskForm` modo create) e `POST /api/tasks`; `uploads`, `detect`, `org-entities` e `legal-deadlines` seguem **(planejado)**
**Critérios de aceite cobertos:** RF20.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 · CA15 — **corpo do card = card RF20** (o card RF4 está vazio; o criador de tarefas está descrito no corpo do card RF20, cujos CAs são citados aqui como estão escritos; ver `RENUMERACAO.md`). **Situação em 17/10/2026 (auditoria `docs/auditoria/2026-10-17/`, MATRIZ_RF: AUSENTE → API REAL PARCIAL):** **(real)** a criação **manual** ponta a ponta — `/tasks/new` (`components/tasks/TaskForm.tsx`, `tasksApi.create` em `lib/tasks/client.ts`) → `POST /api/tasks` (`TaskController.create`, `TaskRequest`) → `TaskService.create` (`TaskInput`, `ResourceAuthorizer.viewer`, erros de campo juntos em `422 VALIDACAO`) → `TaskItem.create` (`RASCUNHO`, `SourceKind.MANUAL` — V37) + `TaskBrief` (V36 `task_briefs`: objetivo, `WorkArea`, entregáveis, critérios, referências, extensões opcionais por área) → `TaskRepositoryPort.insert` → `task_state_log` → `AuditLogPort` `TASK_CREATED` → `201 TaskView` (commits `97611a0`, `013657a`, `474b6cb`; jornada real 17/17 com tarefas de 6 áreas), mais os transversais do Bloco 1–3 (`SecurityConfig`, `CorrelationIdFilter`, `Guard`, `AuditLogPort`, `AuthRateLimitFilter`, `S3StorageConfig`, `AiProvidersConfig`); **(planejado)** uploads e anexos (`UploadService`; `MediaUploadService` existe mas ainda não é bean), detecção por IA (`TaskDetectionService`, `AiEngine`), órgãos (`/api/org-entities/search`), prazos legais (`/api/legal-deadlines/compute`), lote/.zip, chancelas, Balcão, dependências, escolha de outro responsável (busca `/api/people?q=`) e vínculo com projeto/peças (Onda 3 do `PLANO_ONDAS.md`); as fontes ARQUIVO, COLAR, GOOGLE, MICROSOFT, EMAIL, LINK, PROTOCOLO, FOTO e TEXTO_IA existem **só como valores do enum `SourceKind`**, sem adaptador.

> **HU4** — COMO usuário logado dentro do sistema WS POSSO acessar a aba criar nova tarefa PARA criar um esquema de tarefa único e personalizado conforme as diretrizes de minha equipe de trabalho.

A **tarefa** (`TaskItem`, TAXONOMIA §2.1) é a unidade mínima do Work Station (= peça de roupa). O título do card destaca o que o corpo (RF20) detalha em 5 etapas: **(1) Fonte** — a aba escolhida define `SourceKind` e o `TaskType` sugerido; **(2) Detecção por IA** — `AiEngine` capability `PREENCHER_TAREFA` pré-preenche com confiança por campo e faísca ✦ (pulada no modo Manual ou quando a IA falha, CA03); **(3) Dados da tarefa** — taxonomia oficial, prazo legal (`LegalDeadlineRule`), órgão (`OrgEntity` via busca web); **(4) Mais detalhes** — chancelas sugeridas (RF39), visibilidade, estado inicial, situação do documento, protocolo, guarda, Balcão (RF40), tags, dependências, projeto/fase; **(5) Arte do card** — thumbnail assíncrono (RF38/RF11). Antivírus, OCR e thumbnail rodam como `PipelineJob` após o commit e a tarefa entra no **Acervo (RF6/RF41)**.

| Fonte (etapa 1) | `SourceKind` | `TaskType` sugerido | Porta / adaptador |
|---|---|---|---|
| Arquivo (.docx .xlsx .pptx .pdf .txt .md .csv .msg .eml .zip .png .jpg .dwg .dxf .ifc .glb; 50 MB, zip 200 MB) | ARQUIVO | por MIME real: DOCUMENTO · PLANILHA · PASTA · IMAGEM_EDITADA · DESENHO_TECNICO … | `MediaStoragePort` (storage-s3), `AntivirusPort` |
| Colar Ctrl+V (texto · tabela · captura) | COLAR | TEXTO_MANUAL · PLANILHA · IMAGEM_EDITADA | `MediaStoragePort` |
| Google Workspace (Drive, Gmail, Agenda) — vinculado ou copiado | GOOGLE | DOCUMENTO · PLANILHA · FORMULARIO · EMAIL | `ExternalDocPort` (`GoogleDriveAdapter`) |
| Microsoft 365 (OneDrive/SharePoint, Outlook, Teams) | MICROSOFT | DOCUMENTO · PLANILHA · EMAIL · LINK | `ExternalDocPort` (`MicrosoftGraphAdapter`) |
| E-mail encaminhado (`tarefas+<usuário>@…`) ou .eml/.msg | EMAIL | EMAIL (+ anexos → `TaskAttachment` ou tarefas filhas) | `EmailInboundAdapter` |
| Link | LINK | LINK | `LinkPreviewAdapter` |
| Protocolo (e-Protocolo/SEI) | PROTOCOLO | PROTOCOLO | `ProtocolPort` (`EProtocoloAdapter`) |
| Foto/scanner do celular (QR) + Estúdio de Documento | FOTO | IMAGEM_EDITADA · DOCUMENTO (OCR) | `OcrPort`, `MediaStoragePort` |
| Texto com IA (pedido + ≤ 5 tarefas de referência) | TEXTO_IA | TEXTO_IA | `AiEngine` |

## 0. Diagrama de casos de uso

Quem usa o criador de tarefas e o que consegue fazer nele. Borda contínua: existe no código em 17/10/2026; tracejada: planejado.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  autenticado["«ator» Pessoa autenticada"]:::ator
  subgraph SIS["Work Station — RF4 Criador de tarefas"]
    direction TB
    UC1(["UC1 Criar tarefa no modo manual"]):::uc
    UC2(["UC2 Salvar tarefa como rascunho"]):::uc
    UC3(["UC3 Validar os campos da tarefa"]):::uc
    UC4(["UC4 Anexar arquivo ou colar conteúdo"]):::ucPlan
    UC5(["UC5 Pré-preencher a tarefa com IA"]):::ucPlan
    UC6(["UC6 Importar de serviço externo"]):::ucPlan
    UC7(["UC7 Criar tarefas em lote"]):::ucPlan
    UC8(["UC8 Informar órgão e prazo legal"]):::ucPlan
    UC9(["UC9 Aceitar chancela sugerida"]):::ucPlan
    UC10(["UC10 Oferecer no Balcão de Modelos"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  conectores["«ator» Google · Microsoft · e-Protocolo"]:::atorSis
  email["«ator» Serviço de e-mail"]:::atorSis
  autenticado --- UC1
  autenticado --- UC4
  autenticado --- UC6
  autenticado --- UC7
  UC1 -. "«include»" .-> UC3
  UC2 -. "«extend»" .-> UC1
  UC5 -. "«extend»" .-> UC1
  UC8 -. "«extend»" .-> UC1
  UC9 -. "«extend»" .-> UC1
  UC10 -. "«extend»" .-> UC1
  UC5 --- ia
  UC6 --- conectores
  UC6 --- email
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Criar tarefa no modo manual | autenticado | RF20.CA04, RF20.CA14 | real: `/tasks/new` (`TaskForm`) → `POST /api/tasks` → `TaskService.create`, sem projeto/fase, anexos nem IA |
| UC2 Salvar tarefa como rascunho | autenticado | RF20.CA04, RF20.CA05 | real: `draft: true` deixa a tarefa em `RASCUNHO` |
| UC3 Validar os campos da tarefa | — (incluído por UC1) | RF20.CA14 | real: `422 VALIDACAO` com todos os campos juntos; categoria, processo, natureza e prazo legal planejados |
| UC4 Anexar arquivo ou colar conteúdo | autenticado | RF20.CA01, RF20.CA06, RF20.CA12 | planejado (`UploadService`, antivírus, OCR; `ARQUIVO`/`COLAR` só no enum) |
| UC5 Pré-preencher a tarefa com IA | autenticado, ia | RF20.CA02, RF20.CA03 | planejado (`TaskDetectionService`, `PREENCHER_TAREFA`; sem motor registrado) |
| UC6 Importar de serviço externo | autenticado, conectores, email | RF20.CA07, RF20.CA08, RF20.CA09 | planejado (Google, Microsoft, e-mail encaminhado, e-Protocolo; só valores de `SourceKind`) |
| UC7 Criar tarefas em lote | autenticado | RF20.CA05 | planejado (vários arquivos ou .zip) |
| UC8 Informar órgão e prazo legal | autenticado | RF20.CA10, RF20.CA11 | planejado (`/api/org-entities/search`, `/api/legal-deadlines/compute`) |
| UC9 Aceitar chancela sugerida | autenticado | RF20.CA13 | planejado (RF39) |
| UC10 Oferecer no Balcão de Modelos | autenticado | RF20.CA15 | planejado (RF40) |

## 1. Diagrama de classes

Legenda (17/10/2026): **(real)** `TaskController` (só `create` neste RF; `get`/`update` são do RF12 e `mine`/`transition` do RF41), `TaskRequest`, `TaskService` (`TaskInput`, `TaskView`), `TaskRepositoryPort` (`insert`, `update`, `appendStateLog`; adaptador `JpaAcervoAdapters`), `ResourceAuthorizer`, `AccessPolicy`, `AuditLogPort`, `TaskItem`, `TaskBrief`, `WorkArea`, `TaskStateLog` e os enums; `TaskAttachment`, `TaskVersion`, `LegalDeadlineRule`, `OrgEntity`, `MediaObject`, `PipelineJob`, `AiInferenceLog`, `SealBond` e `ModelOffer` existem só como entidade de domínio + tabela, sem serviço; `MediaStoragePort`/`AntivirusPort` existem (Bloco 5, D-67) sem rota de tarefa. **(planejado)** `TaskController.upload/detect/createBatch`, `OrgEntityController`, `LegalDeadlineController`, `TaskCreationService`, `TaskDetectionService`, `DeadlineService`, `OrgEntityLookupService`, `UploadService`, `AiEngine`, `TaskStateMachine` (no real a tabela é `TaskState.machine()`), `OcrPort`, `ExternalDocPort`, `ProtocolPort`, `OrgLookupPort`, `PipelineJobPort`, `SearchIndexPort`, `SealSuggestionService`.

```mermaid
classDiagram
  direction LR

  class TaskController {
    <<controller>>
    +create(CurrentUser, TaskRequest, RequestContext) TaskView
    +upload(MultipartFile, CurrentUser) UploadReceipt
    +detect(DetectRequest, CurrentUser) DetectionResult
    +createBatch(BatchRequest, CurrentUser, ctx) List
  }
  class TaskRequest {
    +String title
    +String descriptionMd
    +TaskType type
    +TaskCategory category
    +Priority priority
    +LocalDate dueAt
    +UUID responsibleId
    +AccessClassification accessClass
    +Visibility visibility
    +String objective
    +WorkArea area
    +List~Deliverable~ deliverables
    +List~Criterion~ acceptanceCriteria
    +List~Reference~ references
    +Map extensions
    +Boolean draft
    +Long version
  }
  class TaskService {
    <<service>>
    +create(CurrentUser, TaskInput, RequestContext) TaskView
    +listMine(CurrentUser, limit) List
    +get(CurrentUser, id) TaskView
    +update(CurrentUser, id, TaskInput, version, ctx) TaskView
    +transition(CurrentUser, id, TransitionInput, ctx) TaskView
    -validate(Viewer, TaskInput) Validated
  }
  class ResourceAuthorizer {
    <<service>>
    +viewer(CurrentUser) Viewer
    +require(Viewer, ScopedResource, ResourceAction) void
  }
  class AuditLogPort {
    <<port>>
    +record(AuditEvent) void
  }
  class TaskBrief {
    <<entity>>
    +UUID taskId
    +String objective
    +WorkArea area
    +JSON deliverablesJson
    +JSON acceptanceCriteriaJson
    +JSON referencesJson
    +JSON extensionsJson
  }
  class WorkArea {
    <<enum>>
    SOFTWARE
    ADMINISTRACAO
    DESIGN
    PESQUISA
    MARKETING
    PLANEJAMENTO
    ENGENHARIA
    JURIDICO
    OUTRA
  }
  class OrgEntityController {
    <<controller>>
    +search(q) List
  }
  class LegalDeadlineController {
    <<controller>>
    +compute(category, subcategory, baseDate, companyId) DeadlineResult
  }
  class TaskCreationService {
    <<service>>
    +create(CreateTaskCommand, CurrentUser, ctx) TaskItem
    +createBatch(BatchCommand, CurrentUser, ctx) List
    +fromPaste(PasteCommand) TaskItem
    +fromEmail(EmailCommand) TaskItem
    +fromProtocol(protocolNumber) TaskItem
    -validate(CreateTaskCommand) void
  }
  class TaskDetectionService {
    <<service>>
    +detect(sourceRef, accessClass, mode) DetectionResult
  }
  class DeadlineService {
    <<service>>
    +compute(category, subcategory, baseDate, companyId) DeadlineResult
  }
  class OrgEntityLookupService {
    <<service>>
    +search(q) List
    +adopt(candidate) OrgEntity
  }
  class UploadService {
    <<service>>
    +store(file, ownerId) MediaObject
    -detectMime(bytes) String
    -zipBombGuard(file) void
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
    capability PREENCHER_TAREFA
  }
  class TaskStateMachine {
    <<service>>
    +transition(TaskItem, TaskState, actor, reason) TaskStateLog
  }
  class MediaStoragePort {
    <<port>>
    +put(key, bytes, mime) MediaObject
    +presign(key) URL
  }
  class AntivirusPort {
    <<port>>
    +scan(MediaObject) ScanResult
  }
  class OcrPort {
    <<port>>
    +extract(MediaObject) OcrText
  }
  class ExternalDocPort {
    <<port>>
    +pick(provider, token) ExternalDoc
    +snapshot(ref) MediaObject
    +watch(ref) void
  }
  class ProtocolPort {
    <<port>>
    +lookup(number) ProtocolMeta
  }
  class OrgLookupPort {
    <<port>>
    +search(q) List
  }
  class TaskRepositoryPort {
    <<port>>
    +insert(TaskItem, TaskBrief) StoredTask
    +update(TaskItem, TaskBrief, expectedVersion) StoredTask
    +findById(id) Optional
    +findByOwner(ownerId, limit) List
    +appendStateLog(TaskStateLog) void
  }
  class PipelineJobPort {
    <<port>>
    +enqueue(type, targetType, targetId) PipelineJob
  }
  class SearchIndexPort {
    <<port>>
    +index(TaskItem) void
  }
  class SealSuggestionService {
    <<service>>
    +suggestFor(TaskItem) List
  }

  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID departmentId
    +String title
    +String summary
    +TaskType type
    +TaskCategory category
    +String subcategory
    +Set~ProcessTag~ processTags
    +Set~NatureTag~ natureTags
    +AccessClassification accessClass
    +String format
    +EffortSize effortSize
    +BigDecimal amountInvolved
    +TaskOrigin origin
    +SourceKind sourceKind
    +String sourceRef
    +LinkMode linkMode
    +UUID orgEntityId
    +UUID responsibleId
    +LocalDate dueAt
    +UUID legalDeadlineRuleId
    +LocalDate legalDueAt
    +String legalOverrideReason
    +Priority priority
    +TaskState state
    +DocSituation docSituation
    +String protocolNumber
    +Visibility visibility
    +boolean offeredInCounter
    +boolean aiGenerated
    +UUID aiInferenceId
    +JSON aiConfidenceJson
    +String thumbnailUrl
    +CoverMode coverMode
    +long version
  }
  class TaskAttachment {
    <<entity>>
    +UUID taskId
    +UUID mediaObjectId
    +String fileName
    +String mimeType
    +String sha256
    +String antivirusStatus
    +String ocrStatus
    +boolean isPrimary
  }
  class TaskVersion {
    <<entity>>
    +UUID taskId
    +int versionNumber
    +String externalRevisionId
    +Instant syncedAt
    +UUID snapshotMediaId
  }
  class LegalDeadlineRule {
    <<entity>>
    +UUID companyId
    +TaskCategory category
    +int days
    +boolean businessDays
    +String legalBasis
  }
  class OrgEntity {
    <<entity>>
    +String name
    +String cnpj
    +String kind
    +String source
    +String externalRef
    +String logoUrl
  }
  class MediaObject {
    <<entity>>
    +String bucket
    +String objectKey
    +String mimeType
    +long sizeBytes
    +String sha256
    +UUID ownerId
  }
  class PipelineJob {
    <<entity>>
    +String type
    +String targetType
    +UUID targetId
    +PipelineJobStatus status
    +int attempts
  }
  class AiInferenceLog {
    <<entity>>
    +AiCapability capability
    +String hostRf
    +AiProvider provider
    +InferenceResult result
    +BigDecimal confidence
    +String correlationId
  }
  class SealBond {
    <<entity>>
    +SealBondStatus status
    +SealBondBasis basis
  }
  class ModelOffer {
    <<entity>>
    +int pricePoints
    +ModelLicense license
  }
  class TaskState {
    <<enum>>
    RASCUNHO
    DISPONIVEL
    EM_USO
    BLOQUEADA
    CONCLUIDA
    ARQUIVADA
    MODELO_PUBLICO
    OFERECIDA
  }
  class TaskType {
    <<enum>>
    TEXTO_MANUAL
    TEXTO_IA
    IMAGEM_WEB
    IMAGEM_EDITADA
    PLANILHA
    DOCUMENTO
    PASTA
    LINK
    DESENHO_TECNICO
    FORMULARIO
    ATA_REGISTRO
    EMAIL
    PROTOCOLO
    CRONOGRAMA
    ESTUDO_TECNICO_PRELIMINAR
  }
  class SourceKind {
    <<enum>>
    MANUAL
    ARQUIVO
    COLAR
    GOOGLE
    MICROSOFT
    EMAIL
    LINK
    PROTOCOLO
    FOTO
    TEXTO_IA
    EXTRAIDA_DE_PROJETO
    REMIX
    DECIA
    AUTOPILOT
    ATA_VIVA
    DOSSIE
    EXTRACAO
  }
  class AccessClassification {
    <<enum>>
    PUBLICO
    INTERNO
    RESTRITO
    SIGILOSO
  }
  class LinkMode {
    <<enum>>
    VINCULADO
    COPIADO
  }

  TaskController --> TaskService : create real
  TaskController ..> TaskRequest
  TaskService --> ResourceAuthorizer
  TaskService --> TaskRepositoryPort
  TaskService --> AuditLogPort
  TaskItem "1" --> "0..1" TaskBrief : task_briefs V36
  TaskBrief --> WorkArea
  TaskController --> TaskCreationService
  TaskController --> TaskDetectionService
  TaskController --> UploadService
  OrgEntityController --> OrgEntityLookupService
  LegalDeadlineController --> DeadlineService
  TaskCreationService --> DeadlineService
  TaskCreationService --> TaskStateMachine
  TaskCreationService --> TaskRepositoryPort
  TaskCreationService --> PipelineJobPort
  TaskCreationService --> SealSuggestionService
  TaskCreationService --> ExternalDocPort
  TaskCreationService --> ProtocolPort
  TaskDetectionService --> AiEngine
  TaskDetectionService --> OcrPort
  UploadService --> MediaStoragePort
  UploadService --> AntivirusPort
  OrgEntityLookupService --> OrgLookupPort
  TaskItem "1" --> "0..*" TaskAttachment
  TaskItem "1" --> "0..*" TaskVersion : VINCULADO
  TaskItem "0..*" --> "0..1" LegalDeadlineRule
  TaskItem "0..*" --> "0..1" OrgEntity
  TaskItem "0..*" --> "0..1" AiInferenceLog : aiInferenceId
  TaskItem "1" --> "0..*" SealBond : targetType TASK
  TaskItem "1" --> "0..1" ModelOffer : offeredInCounter
  TaskAttachment "1" --> "1" MediaObject
  PipelineJob "0..*" --> "1" TaskItem : THUMBNAIL, OCR, ANTIVIRUS, SYNC_EXTERNO
  TaskItem --> TaskState
  TaskItem --> TaskType
  TaskItem --> SourceKind
  TaskItem --> AccessClassification
  TaskItem --> LinkMode
  note for TaskController "(real) ws-web acervo, POST /api/tasks 201 · upload, detect e createBatch (planejado)"
  note for TaskService "(real) ws-application acervo · TaskInput = TaskRequest sem version · TaskView traz version e editable · audita TASK_CREATED, TASK_UPDATED, TASK_STATE_CHANGED"
  note for TaskCreationService "(planejado) hoje POST /api/tasks vai a TaskService.create, só fonte MANUAL"
  note for TaskStateMachine "(planejado) no real a tabela é TaskState.machine() e o TaskService grava task_state_log"
  note for SourceKind "MANUAL é a única fonte real (V37) · as demais são só valores do enum (planejado)"
  note for TaskItem "+22 campos (descriptionMd, receivedAt, senderOrigin, retentionPolicyJson, favorite, cardSkin, tags, notes, originalTaskId, sourceProjectId, checklistItemId, reuseCount, projectUsageCount, contadores sociais, sealIdsJson, blocked*). TaskCategory: OFICIO_MEMORANDO … OUTRO (15 valores)."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Empregado autenticado"]
    A1["Abre /tasks/new (ou + Criar, ou Cadastrar nova tarefa no RF5) e escolhe a aba da fonte"]
    A2["Escolhe o modo: Manual ou Com IA"]
    A3["Revisa / edita Dados da tarefa (etapa 3) e Mais detalhes (etapa 4)"]
    A4["Escolhe a arte do card (etapa 5) e salva"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["Zona de entrada única: Arquivo · Colar · Google · Microsoft · E-mail · Link · Protocolo · Foto · Texto com IA"]
    F2["POST /api/tasks/uploads (multipart) ou seletor Drive/OneDrive (OAuth do usuário)"]
    F3["POST /api/tasks/detect {sourceRef, accessClass}"]
    F4["Formulário com faísca ✦ e confiança por campo · erro por campo (422 details)"]
    F5["GET /api/org-entities/search?q= · GET /api/legal-deadlines/compute"]
    F6["POST /api/tasks (ou /batch) → TaskCard no Acervo"]
    FM1["(real) TaskForm modo create em /tasks/new: campos comuns + extensões só da área escolhida · Criar tarefa ou Salvar como rascunho"]
    FM2["(real) tasksApi.create → POST /api/tasks TaskRequest · 201 TaskView → /tasks/id · 422 aparece junto do campo"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + Guard.requireCanCreate (não DELETION_SCHEDULED)"]
    W2["TaskController.upload / detect / create"]
    WM1["(real) TaskController.create: @Valid TaskRequest, CurrentUser, RequestContext"]
    E415["415 FORMATO_NAO_SUPORTADO"]
    E413["413 ARQUIVO_GRANDE (50 MB, zip 200 MB)"]
    E422M["422 ARQUIVO_MALICIOSO"]
    E422["422 VALIDACAO details por campo + correlationId"]
    E409["409 COTA_ESGOTADA (IA)"]
    E403["403 ACESSO_NEGADO"]
  end
  subgraph APP["ws-application"]
    U1["UploadService: MIME real (magic bytes) · limite por formato · zip-bomb guard · sha256"]
    U2{"formato e tamanho ok?"}
    U3["MediaStoragePort.put (quarentena) · AntivirusPort.scan"]
    U4{"limpo?"}
    D1{"modo Com IA?"}
    D2["TaskDetectionService: OCR se imagem/PDF → AiEngine PREENCHER_TAREFA"]
    D3{"IA respondeu com confiança suficiente?"}
    D4["Formulário vazio + aviso 'preencha manualmente' (sem bloquear)"]
    D5["Pré-preenche tipo, categoria, título, resumo, prazo legal, órgão, classificação + aiConfidenceJson"]
    V1["TaskCreationService.validate: título, categoria/subcategoria, classificação, ≥1 processo, ≥1 natureza, prazo se categoria tem prazo legal"]
    V2{"válido?"}
    V3["DeadlineService.compute (dias úteis, base legal) · legalOverrideReason se sobrescrito"]
    V4["OrgEntityLookupService.adopt (Wikidata/CNPJ/site) → OrgEntity"]
    V5["SealSuggestionService.suggestFor → SealBond SUGERIDA (RF39) · aceitar → ACEITA"]
    V6["TaskItem state RASCUNHO ou DISPONIVEL · linkMode VINCULADO/COPIADO · offeredInCounter → ModelOffer (RF40)"]
    V7["save · TaskStateLog · AuditLog TASK_CREATED · opcional ProjectTask na fase escolhida (RF5)"]
    B1["Lote/.zip: um rascunho por arquivo ou PASTA com 'explodir em N tarefas' · revisão antes de confirmar"]
    RM1["(real) TaskService.create: ResourceAuthorizer.viewer → validate (título ≤ 200, tipo, objetivo ≤ 500, descrição ≤ 20000, responsável da mesma empresa, prazo, listas do briefing)"]
    RM2{"válido?"}
    RM3["(real) TaskItem.create RASCUNHO, SourceKind MANUAL, origem INTERNA + TaskBrief → TaskRepositoryPort.insert · task_state_log null → RASCUNHO"]
    RM4{"draft?"}
    RM5["(real) transition DISPONIVEL (A realizar) · TaskRepositoryPort.update · task_state_log RASCUNHO → DISPONIVEL"]
    RM6["(real) AuditLogPort TASK_CREATED (state, area) · 201 TaskView"]
    AC["AFTER_COMMIT: PipelineJob THUMBNAIL · OCR · ANTIVIRUS (se pendente) · SYNC_EXTERNO (VINCULADO) · SearchIndexPort.index"]
  end
  subgraph IA["AiEngine"]
    I1["Governança: flag ai.provider.* · accessClass RESTRITO/SIGILOSO → LocalEngine · mascaramento LGPD · AiQuota"]
    I2["Claude → Gemini → LocalEngine (circuit breaker) · AiInferenceLog capability PREENCHER_TAREFA, hostRf RF4"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: tasks, task_briefs (V36, real), task_state_log (real), task_attachments, task_versions, legal_deadline_rules, org_entities, media_objects, pipeline_jobs, ai_inference_log, audit_log")]
    P2[("S3/MinIO: quarentena → bucket de anexos · thumbnails")]
    P3[("OpenSearch ws-tasks (+ texto OCR)")]
    P4[("Redis: AiQuota · cache de busca web de órgãos")]
    P5["Externos: Google Drive/Gmail · Microsoft Graph · e-Protocolo · Wikidata/CNPJ"]
  end

  A1 --> F1 --> F2 --> W1 --> W2 --> U1 --> U2
  U2 -->|"não"| E415
  U2 -->|"grande"| E413
  U2 -->|"sim"| U3 --> U4
  U4 -->|"infectado"| E422M
  U4 -->|"sim"| A2 --> D1
  U3 --> P2
  D1 -->|"Manual"| D4
  D1 -->|"Com IA"| F3 --> D2 --> I1 --> I2 --> D3
  I2 --> P4
  I2 -->|"sem cota"| E409
  D3 -->|"não / indisponível"| D4
  D3 -->|"sim"| D5
  D4 --> F4
  D5 --> F4 --> A3 --> F5
  F5 --> V3
  F5 --> V4
  V4 --> P5
  A3 --> A4 --> F6 --> W2 --> V1 --> V2
  V2 -->|"não"| E422
  V2 -->|"sim"| V3 --> V5 --> V6 --> V7 --> P1
  V7 --> AC
  AC --> P2
  AC --> P3
  F2 -->|"vários arquivos ou .zip"| B1 --> F4
  W1 -->|"sem permissão"| E403
  F2 -->|"Google/Microsoft"| P5
  A1 -->|"modo Manual (real)"| FM1 --> FM2 --> WM1 --> RM1 --> RM2
  RM2 -->|"não"| E422
  RM2 -->|"sim"| RM3 --> RM4
  RM4 -->|"sim (rascunho)"| RM6
  RM4 -->|"não"| RM5 --> RM6
  RM3 --> P1
  RM6 --> P1
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
  participant RD as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: arrasta um .pdf em /tasks/new (aba Arquivo)
  N->>C: POST /api/tasks/uploads (multipart, X-Correlation-Id)
  C->>S: UploadService.store(file, ownerId)
  S->>S: MIME por magic bytes, limite por formato, zip-bomb guard, sha256
  alt formato não suportado ou acima do limite
    S-->>C: 415 FORMATO_NAO_SUPORTADO ou 413 ARQUIVO_GRANDE
    C-->>N: erro com mensagem clara
  else aceito
    S->>S3: put(quarentena/{uploadId}, bytes)
    S->>S: AntivirusPort.scan
    alt malicioso
      S->>S3: delete(quarentena)
      S-->>C: 422 ARQUIVO_MALICIOSO
      C-->>N: 422
    else limpo
      S->>R: insert media_objects
      S-->>C: UploadReceipt {mediaObjectId, mime, size}
      C-->>N: 201
    end
  end

  U->>N: escolhe o modo Com IA
  N->>C: POST /api/tasks/detect {mediaObjectId, accessClass}
  C->>S: TaskDetectionService.detect
  S->>S: OcrPort.extract (PDF/imagem)
  S->>AI: run(AiRequest PREENCHER_TAREFA, hostRf RF4, accessClass, texto mascarado)
  AI->>RD: AiQuota.tryConsume(userId, deptId)
  alt cota esgotada
    AI-->>S: 409 COTA_ESGOTADA
    S-->>C: 409 COTA_ESGOTADA (link para a Loja, RF42)
    C-->>N: 409
  else RESTRITO ou SIGILOSO
    AI->>AI: LocalEngine (nunca provedor externo)
    AI->>R: insert ai_inference_log (provider LOCAL)
    AI-->>S: campos sugeridos com confiança baixa
  else provedor externo
    AI->>AI: Claude → fallback Gemini → LocalEngine (circuit breaker)
    AI->>R: insert ai_inference_log (modelo, custo, latência, fallback, maskedFieldsJson)
    AI-->>S: DetectionResult {tipo, categoria, título, resumo, prazoLegal, órgão, classificação, confidence por campo}
  end
  alt IA indisponível ou confiança insuficiente
    S-->>C: DetectionResult vazio + aviso
    C-->>N: 200 formulário vazio, preenchimento manual (sem bloquear)
  else ok
    S-->>C: DetectionResult preenchido
    C-->>N: 200 formulário pré-preenchido com faísca ✦ e confiança
  end

  U->>N: edita categoria TERMO_REFERENCIA e informa data-base
  N->>C: GET /api/legal-deadlines/compute?category=TERMO_REFERENCIA&baseDate=…
  C->>S: DeadlineService.compute
  S->>R: legal_deadline_rules (companyId ou padrão)
  S-->>C: DeadlineResult {legalDueAt, explanation "15 dias úteis a partir do recebimento — base legal X"}
  C-->>N: 200
  U->>N: digita o órgão e aciona a busca web
  N->>C: GET /api/org-entities/search?q=…
  C->>S: OrgEntityLookupService.search → OrgLookupPort (Wikidata, CNPJ, site)
  S-->>C: candidatos com fonte e logo tratado
  C-->>N: 200

  U->>N: confirma Mais detalhes (chancela sugerida aceita, Oferecer no Balcão) e salva
  N->>C: POST /api/tasks {CreateTaskRequest}
  C->>S: TaskCreationService.create(cmd, currentUser, ctx)
  S->>S: validate (título, categoria, classificação, ≥1 processo, ≥1 natureza, prazo quando exigido)
  alt inválido
    S-->>C: 422 VALIDACAO details por campo
    C-->>N: 422 (campos destacados, i18n, correlationId)
  else válido
    S->>R: insert tasks (state RASCUNHO ou DISPONIVEL, sourceKind, linkMode, aiInferenceId, aiConfidenceJson)
    S->>R: insert task_attachments, seal_bonds SUGERIDA→ACEITA, model_offers (se oferecido)
    S->>R: insert project_tasks na fase escolhida (opcional, RF5)
    S->>R: insert task_state_log, audit_log TASK_CREATED
    S-->>C: TaskView
    C-->>N: 201 TaskView
    N-->>U: TaskCard aparece no Acervo (RF6/RF41)
    EV->>R: enqueue PipelineJob THUMBNAIL, OCR, SYNC_EXTERNO (VINCULADO)
    EV->>OS: index ws-tasks (+ texto OCR quando pronto)
    EV->>S3: thumbnail / preview
    Note over EV,S3: OCR indisponível → job REPROCESSAR, aviso no card (CA12)
  end

  Note over U,R: Caminho REAL em 17/10/2026 (modo Manual, sem anexo nem IA) — commits 97611a0 e 013657a
  U->>N: preenche o TaskForm em /tasks/new (título, tipo, área, objetivo, entregáveis, critérios, referências, extensões da área) e clica Criar tarefa
  N->>C: POST /api/tasks TaskRequest (draft falso)
  C->>S: TaskService.create(user, TaskInput, ctx)
  S->>S: ResourceAuthorizer.viewer(actor) e validate (título, tipo, objetivo, descrição, responsável da mesma empresa, prazo, listas do briefing)
  alt inválido
    S-->>C: 422 VALIDACAO details.fields com todos os campos de uma vez
    C-->>N: 422
    N-->>U: erro junto de cada campo, nada é gravado
  else válido
    S->>R: TaskRepositoryPort.insert(TaskItem.create RASCUNHO e SourceKind MANUAL, TaskBrief) em tasks e task_briefs
    S->>R: appendStateLog(null → RASCUNHO)
    opt draft falso (Criar tarefa)
      S->>R: TaskRepositoryPort.update(DISPONIVEL, version) e appendStateLog(RASCUNHO → DISPONIVEL)
    end
    S->>R: AuditLogPort.record TASK_CREATED (state, area)
    S-->>C: TaskView (version, editable)
    C-->>N: 201 TaskView
    N-->>U: abre /tasks/id com estado A realizar (ou Rascunho)
  end
```

## 4. Máquina de estados

Entidade central: **`TaskItem.state`** (`TaskState`, TAXONOMIA §2.1/§13), governada pelo `TaskStateMachine` (ARQUITETURA §3 "State Machine explícita"); toda transição grava `TaskStateLog`. O criador cria em `RASCUNHO` ou `DISPONIVEL` (CA04); os demais estados são operados pelo Acervo (RF6/RF41), pelo Criador de Projetos (RF5) e pelo Balcão (RF40). **Real (17/10/2026):** não há `TaskStateMachine`; a tabela é `TaskState.machine()` e `TaskService.create` grava sempre `RASCUNHO` (`task_state_log` de `null` → `RASCUNHO`) e, sem `draft`, passa na mesma transação a `DISPONIVEL` (rótulo «A realizar» em `lib/tasks/status.ts`); «Salvar como rascunho» (`draft: true`) mantém `RASCUNHO`. Transição fora da tabela responde `409 TAREFA_TRANSICAO_INVALIDA`.

```mermaid
stateDiagram-v2
  direction LR
  state "RASCUNHO" as RAS
  state "DISPONIVEL" as DIS
  state "EM_USO" as USO
  state "BLOQUEADA" as BLO
  state "CONCLUIDA" as CON
  state "ARQUIVADA" as ARQ
  state "MODELO_PUBLICO" as MOD
  state "OFERECIDA" as OFE

  [*] --> RAS : POST /api/tasks com estado inicial RASCUNHO · lote/.zip (CA05) · OCR pendente (CA12)
  [*] --> DIS : POST /api/tasks com obrigatórios completos e estado inicial DISPONIVEL (CA04)
  RAS --> DIS : completar obrigatórios e publicar no Acervo
  RAS --> ARQ : descartar rascunho
  DIS --> USO : entra em ProjectTask de projeto ativo (RF5, RF21.CA04) · Assignment ACEITA (RF10)
  USO --> DIS : removida do projeto ou projeto arquivado
  DIS --> BLO : bloqueio por dependência (blockedByTaskId) ou por pessoa (blockedByUserId, blockReason)
  USO --> BLO : predecessora pendente
  BLO --> DIS : desbloqueio
  BLO --> USO : desbloqueio com projeto ativo
  USO --> CON : concluir (RF8/RF41) · TaskStateLog
  DIS --> CON : concluir sem projeto
  CON --> ARQ : arquivar
  DIS --> ARQ : arquivar
  ARQ --> DIS : reabrir com justificativa (RF12.CA05)
  DIS --> MOD : chancela APROVADA ou publicação como modelo (RF39, RF41)
  MOD --> OFE : Oferecer no Balcão (CA15, RF40) · ModelOffer ATIVA
  DIS --> OFE : Oferecer no Balcão direto do criador (CA15)
  OFE --> MOD : ModelOffer RETIRADA
  OFE --> DIS : retirada sem chancela
  CON --> [*]
  ARQ --> [*]
  note right of RAS
    Rascunho não gera EM_USO (RF21.CA14)
    e não aparece para terceiros (RF17.CA03).
  end note
  note right of DIS
    Transição inválida: 409 TAREFA_TRANSICAO_INVALIDA (real).
    EM_USO e MODELO_PUBLICO só por evento, nunca à mão.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/tasks/new (real: TaskForm modo create) · etapas 1–5 e modal reutilizado por /projects/new, RF5 (planejado)"]
    TFM["(real) components/tasks/TaskForm.tsx · lib/tasks/client.ts tasksApi.create · lib/api/schema.d.ts (OpenAPI)"]
    UI["packages/ui: TypeChip, Select, Input, Textarea, Checkbox, Spark ✦, Due (⚖ prazo legal), Seal, TaskCard (prévia), Dialog, Toast"]
    SN["SidebarNav › folha + Criar · TopBar"]
    ST["Estúdio de Documento / Arte do card (RF11, RF38)"]
    BFF["app/bff/tasks/* · OAuth Google/Microsoft (tokens do usuário em cookie httpOnly)"]
    PG --> UI
    PG --> ST
    PG --> BFF
    PG --> TFM
    TFM --> BFF
    SN --> PG
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver · CorrelationIdFilter"]
    TC["TaskController (real: POST /api/tasks) · OrgEntityController · LegalDeadlineController (planejado)"]
    GEH["GlobalExceptionHandler (413, 415, 422, 409, 403)"]
  end
  subgraph WSAPP["ws-application"]
    AC["acervo: TaskService (real) · TaskCreationService · TaskDetectionService · UploadService · DeadlineService · OrgEntityLookupService · TaskStateMachine (planejado)"]
    AIE["ai: AiEngine (Strategy + Chain: Claude → Gemini → LocalEngine) · AiQuota · governança accessClass/mascaramento"]
    SEAL["seals: SealSuggestionService (RF39)"]
    PORTS["ports: TaskRepositoryPort · AuditLogPort (real) · MediaStoragePort · AntivirusPort (reais, sem rota de tarefa) · OcrPort · ExternalDocPort · ProtocolPort · OrgLookupPort · PipelineJobPort · SearchIndexPort (planejado)"]
    EVT["events: TaskCreated (AFTER_COMMIT) → SideEffectRunner"]
    GD["security: ResourceAuthorizer + AccessPolicy (real) · Guard.requireCanCreate (planejado)"]
    AC --> PORTS
    AC --> AIE
    AC --> SEAL
    AC --> EVT
    AC --> GD
  end
  subgraph WSDOM["ws-domain"]
    DOM["acervo: TaskItem · TaskBrief e WorkArea (real, V36) · SourceKind com MANUAL (real, V37) · TaskAttachment · TaskVersion · TaskStateLog · LegalDeadlineRule · OrgEntity · enums TaskType/TaskCategory/TaskState/SourceKind/AccessClassification · platform: MediaObject · PipelineJob · AiInferenceLog"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql (real): JpaAcervoAdapters (TaskRepositoryPort), TaskItemRepository, TaskBriefRepository · Flyway V11 tasks, V36 task_briefs, V37 ck_tasks_source_kind com MANUAL"]
    S3["storage-s3 (S3StorageConfig, flag storage.s3): quarentena, anexos, thumbnails"]
    OSE["search-opensearch (flag opensearch.enabled): índice ws-tasks"]
    RDS["cache-redis: AiQuota, cache de busca web"]
    AIP["ai-providers (AiProvidersConfig, flags ai.provider.claude/gemini, ai.local.only): ClaudeAdapter · GeminiAdapter · LocalEngine"]
    PLT["platform: AntivirusAdapter (ClamAV) · OcrAdapter (Tesseract) · GoogleDriveAdapter · MicrosoftGraphAdapter · EProtocoloAdapter · WikidataCnpjAdapter · EmailInboundAdapter"]
  end
  subgraph EXT["Externos"]
    GW["Google Workspace"]
    M365["Microsoft 365"]
    EP["e-Protocolo / SEI"]
    WD["Wikidata · CNPJ · site oficial"]
    CL["Claude (primário) · Gemini (alternativo)"]
  end

  BFF -->|"REST JSON"| SEC --> TC --> AC
  TC --> GEH
  MY -.implementa.-> PORTS
  S3 -.implementa.-> PORTS
  OSE -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  AIP -.implementa.-> AIE
  PLT -.implementa.-> PORTS
  AC --> DOM
  PLT --> GW
  PLT --> M365
  PLT --> EP
  PLT --> WD
  AIP --> CL
  MY --> DB[("MySQL 8.4")]
  S3 --> MINIO[("S3 / MinIO")]
  OSE --> OSX[("OpenSearch 2.19")]
  RDS --> RD[("Redis 7")]
```

## 6. Rastreabilidade

| CA (card RF20) | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF20.CA01 | `UploadService`, `MediaStoragePort`, `AntivirusPort`, `MediaObject`, `ExternalDocPort` | `F2`→`U1`→`U4`, `E415`, `E413`, `E422M` | 2–15 | — | `S3`, `PLT` (ClamAV, Drive, Graph), `GEH` | planejado |
| RF20.CA02 | `TaskDetectionService`, `AiEngine` (PREENCHER_TAREFA), `AiInferenceLog`, `TaskItem.aiConfidenceJson/aiGenerated` | `D1`→`D2`→`I1`→`I2`→`D5`→`F4` | 16–32, 35–36 | — | `AIE`, `AIP`, `UI` (`Spark`) | planejado |
| RF20.CA03 | `TaskDetectionService` (fallback vazio) | `D3`→`D4`→`F4` | 33–34 | — | `AIE` (LocalEngine/circuit breaker) | planejado |
| RF20.CA04 | `TaskCreationService.create/validate`, `TaskRepositoryPort`, `ProjectTask` (RF5); real: `TaskController.create`, `TaskService.create`, `TaskRepositoryPort.insert`, `TaskBrief` | `V1`→`V2`→`V6`→`V7`; real: `FM1`→`FM2`→`WM1`→`RM1`→`RM2`→`RM3`→`RM4`→`RM5`→`RM6` | 49–58; real: 61–64, 68–74 | `[*]`→`DIS` / `RAS` | `TC`, `AC`, `MY`, `TFM` | **real parcial** (manual, sem projeto/fase, anexos nem IA) — ver tabela abaixo |
| RF20.CA05 | `TaskCreationService.createBatch`, `TaskType.PASTA` | `B1` | — | `[*]`→`RAS` | `TC.createBatch` | planejado (o real só cria uma tarefa por vez; «Salvar como rascunho» = `draft: true`) |
| RF20.CA06 | `TaskCreationService.fromPaste`, `SourceKind.COLAR` | `F1` (aba Colar) → `V6` | — | `[*]`→`DIS` | `PG` | planejado (`COLAR` só no enum; texto digitado é `MANUAL` desde V37, Q-235) |
| RF20.CA07 | `ExternalDocPort.watch`, `TaskVersion`, `LinkMode`, `PipelineJob SYNC_EXTERNO` | `F2` (Google/Microsoft) → `V6` → `AC` | 59 | — | `PLT` (`GoogleDriveAdapter`, `MicrosoftGraphAdapter`), `BFF` (OAuth) | planejado (`GOOGLE`/`MICROSOFT` só no enum) |
| RF20.CA08 | `TaskCreationService.fromEmail`, `EmailInboundAdapter`, `TaskAttachment` | `F1` (aba E-mail) | — | — | `PLT` | planejado (`EMAIL` só no enum) |
| RF20.CA09 | `TaskCreationService.fromProtocol`, `ProtocolPort`, `TaskType.PROTOCOLO`, `TaskItem.protocolNumber` | `F1` (aba Protocolo) | — | — | `PLT` (`EProtocoloAdapter`), `EP` | planejado (`PROTOCOLO` só no enum) |
| RF20.CA10 | `OrgEntityLookupService`, `OrgLookupPort`, `OrgEntity` | `F5`→`V4`→`P5` | 43–46 | — | `PLT` (`WikidataCnpjAdapter`), `RDS` (cache) | planejado |
| RF20.CA11 | `DeadlineService`, `LegalDeadlineRule`, `TaskItem.legalDueAt/legalOverrideReason` | `F5`→`V3` | 37–42 | — | `UI` (`Due` ⚖), `MY` | planejado |
| RF20.CA12 | `OcrPort`, `PipelineJob OCR` (REPROCESSAR), `TaskAttachment.ocrStatus` | `AC` | 59–61 | `[*]`→`RAS` | `PLT` (OCR), `EVT` | planejado |
| RF20.CA13 | `SealSuggestionService`, `SealBond` SUGERIDA→ACEITA | `V5` | 51 | — | `SEAL` | planejado (RF39) |
| RF20.CA14 | `TaskCreationService.validate`, `GlobalExceptionHandler` (`ApiError.details`); real: `TaskService.validate` (privado), `TaskBriefJson.invalid` | `V2`→`E422`; real: `RM2`→`E422` | 48–50; real: 64–67 | — | `GEH`, `UI` (erro por campo i18n), `TFM` | **real** para as regras do criador manual (título, tipo, objetivo, descrição, responsável, prazo, listas); categoria/processo/natureza/prazo legal planejados |
| RF20.CA15 | `ModelOffer`, `TaskItem.offeredInCounter` | `V6` | 51 | `DIS`→`OFE`, `MOD`→`OFE` | `AC`, `MY` | planejado (RF40) |

### Caminho real de criação manual (17/10/2026)

| Elemento | Classe / arquivo real | Teste | Commit | CA |
|---|---|---|---|---|
| Tela `/tasks/new` | `app/(shell)/tasks/new/page.tsx`, `components/tasks/TaskForm.tsx` (modo create, extensões por área, rascunho), `lib/tasks/client.ts` (`tasksApi.create`, `AREA_EXTENSIONS`) | `components/tasks/tasks.test.tsx` «valida localmente, mostra só os campos da área e envia o briefing» · «editar antes de /api/me responder não apaga o responsável» | `013657a`, `474b6cb` | RF20.CA04, RF20.CA14 |
| `POST /api/tasks` → 201 | `TaskController.create`, `TaskRequest`, `@Tag RF4 Tarefas` | `TaskControllerWebTest.criaComBriefingEDevolve201` · `semTokenRecebe401EPapelDesconhecido403` | `97611a0` | RF20.CA04 |
| Serviço e validação (422) | `TaskService.create`, `TaskInput`, `TaskView`, `ResourceAuthorizer.viewer`, `TaskBriefJson` | `TaskServiceTest.criaTarefasDeSeisAreasSemExigirCamposDeSoftware` · `rascunhoFicaEmRascunhoEValidacaoVoltaComTodosOsCampos` · `responsavelPrecisaSerDaMesmaEmpresa` | `97611a0` | RF20.CA04, RF20.CA14 |
| Persistência | `TaskRepositoryPort.insert/update/appendStateLog`, `JpaAcervoAdapters`, `TaskBrief` (V36 `task_briefs`), `SourceKind.MANUAL` (V37) | `TaskPersistenceIT.salvaReabreEditaOBriefingESobeAVersao` | `97611a0`, `3e7aa9f` (V37) | RF20.CA04 |
| Auditoria | `AuditActions.TASK_CREATED` via `AuditLogPort` | — | `97611a0` | RF20.CA04 |
| Evidência | jornada real 17/17 (`docs/auditoria/2026-10-17/evidencias/JORNADA.json`), capturas 01 e 09 | — | `203244a` | RF20.CA04 |

Tela/aba: `/tasks/new` (real desde `013657a`: `app/(shell)/tasks/new/page.tsx` com `TaskForm` modo create; antes, esqueleto)
