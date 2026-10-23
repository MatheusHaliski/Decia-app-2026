# RF7 — Abrir um esquema de tarefa a partir da lista de um esquema de projeto
**HU:** HU7 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (o card "SPRINT 2" cita "RF7 Classificar mensagens", escopo antigo — `RENUMERACAO.md`; fase (e) da ARQUITETURA §6) · **Equivalente FAI:** RF7 Peça a partir do esquema (clicar numa peça do look abre o detalhe da peça com "Adicionar ao meu closet"; snapshot quando a peça foi excluída) · **Aba/rota:** detalhe do projeto `/projects/[id]` → lista de tarefas por fase → `/projects/[id]/tasks/[ptId]` (folha de detalhe com URL profunda), atalho para `/tasks/[id]`, ação "Levar ao meu acervo" (destino: Acervo Digital, RF6/RF41); API `GET /api/projects/{id}`, `GET /api/projects/{id}/tasks/{ptId}`, `POST /api/tasks/{id}/extract` (compartilhado com RF23), `GET /api/media/{id}/presign`
**Critérios de aceite cobertos:** RF7.CA01 … RF7.CA06 — **todos "(CA a confirmar)"**: o corpo do card está vazio; os CAs foram derivados do título + HU7 e reaproveitam `_anterior/RF23` (snapshot RF23.CA03, "Levar ao meu acervo" RF23.CA01/CA05) e RF41.CA03 (detalhe da tarefa). Todas as classes do RF são **(planejado)**; reais só os transversais (`SecurityConfig`, `SessionActiveFilter`, `Guard`, `CorrelationIdFilter`, `AuditLogPort`).

> **HU7** — COMO usuário visualizando um esquema de projeto POSSO clicar em um item da lista de tarefas PARA visualizar detalhes de uma tarefa e então compreender melhor o escopo do projeto.

A lista do projeto é a lista de `ProjectTask` por fase (quadro, linha do tempo ou lista — RF22 §"Três visões"); clicar num item abre a **folha de detalhe** da `TaskItem` ligada (`ProjectTask.taskId`) ou, se o autor a excluiu, o `TaskSnapshot` guardado em `ProjectTask.snapshotJson` (TAXONOMIA §2.8). O que o viewer vê e pode fazer depende de `AccessPolicy` (visibilidade da tarefa) e do papel no projeto (dono, responsável, terceiro).

## Critérios de aceite derivados da HU7 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) | Origem |
|---|---|---|
| **RF7.CA01** (CA a confirmar) | Dado um projeto visível para mim, quando clico num item da lista de tarefas (quadro por fase, linha do tempo ou lista), então abre a folha de detalhe da tarefa com título, tipo (`TypeChip`), categoria, resumo (3 linhas), estado (`Tag` com nome em texto), prazo (`Due`, ⚖ se legal), responsável, anexos com pré-visualização (`GET /api/media/{id}/presign`), versões, chancelas (`Seal`), interações (`Counters`) e o **contexto no projeto** (fase, ordem, dependências, caminho crítico, `percentComplete`); a URL fica `/projects/{id}/tasks/{ptId}`. | RF41.CA03, RF22 |
| **RF7.CA02** (CA a confirmar) | Dado um `ProjectTask` com `taskId` nulo (tarefa excluída pelo autor, `removedByAuthor`), quando o abro, então o detalhe mostra o `TaskSnapshot` (título, tipo, categoria, thumbnail, resumo, `ownerName`, `capturedAt`) com o aviso "removida pelo autor", sem anexos nem ações de cópia/edição; fases e dependências do projeto continuam íntegras. | RF23.CA03, RF41.CA05 |
| **RF7.CA03** (CA a confirmar) | Dado que a tarefa tem `visibility` incompatível com o viewer (PRIVADA de outra pessoa, DEPARTAMENTO sem ser membro), quando clico no item, então o card aparece como "tarefa privada" (só fase e ordem) e a API responde `403 ACESSO_NEGADO`; `ProjectTask` inexistente no projeto → `404 TAREFA_NAO_ENCONTRADA`; projeto fora da minha visibilidade → `403`. | RF26.CA08, RF41.CA08 |
| **RF7.CA04** (CA a confirmar) | Dado o detalhe de uma tarefa não-PRIVADA que não é minha, quando aciono **"Levar ao meu acervo"**, então nasce uma cópia (`sourceKind EXTRAIDA_DE_PROJETO`, `originalTaskId`, `sourceProjectId`, `state DISPONIVEL`, `visibility PRIVADA`, anexos por referência ao mesmo `MediaObject`), `reuseCount` da original incrementa e o dono é notificado (`Notification TAREFA_REUTILIZADA`); ação oculta para PRIVADA (403 na API). | RF23.CA01/CA02/CA04/CA05 |
| **RF7.CA05** (CA a confirmar) | Dado que sou o dono da tarefa ou responsável no projeto, então a ação principal é **"Editar"** (abre RF8/RF12) e a alternativa "Abrir no Acervo" (`/tasks/[id]`); para os demais a ação principal é "Levar ao meu acervo" e as interações sociais (RF18/RF19); toda abertura incrementa `viewsCount` (contador desnormalizado, Redis → MySQL em lote). | RF41.CA07, RF26.CA07 |
| **RF7.CA06** (CA a confirmar) | Dado a folha aberta, quando fecho ou uso "voltar", então retorno à lista do projeto na mesma fase e posição de rolagem; a folha carrega com `Skeleton`, respeita i18n pt-BR/en/es e layout responsivo (`Sheet` lateral no desktop, tela cheia no celular). | RF19.CA03, RF19.CA07 |

## 0. Diagrama de casos de uso

Quem abre uma tarefa a partir da lista de um projeto e o que cada um pode fazer com ela. Borda contínua: existe no código em 17/10/2026; tracejada: planejado (não há API de projetos).

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  autenticado["«ator» Pessoa autenticada"]:::ator
  dono["«ator» Dono do recurso"]:::ator
  responsavel["«ator» Responsável atribuído"]:::ator
  subgraph SIS["Work Station — RF7 Tarefa a partir do projeto"]
    direction TB
    UC1(["UC1 Abrir tarefa da lista do projeto"]):::ucPlan
    UC2(["UC2 Verificar acesso à tarefa"]):::uc
    UC3(["UC3 Ver tarefa removida pelo autor"]):::ucPlan
    UC4(["UC4 Levar tarefa ao meu acervo"]):::ucPlan
    UC5(["UC5 Editar a tarefa a partir do projeto"]):::ucPlan
    UC6(["UC6 Abrir a tarefa no Acervo"]):::ucPlan
  end
  autenticado --- UC1
  autenticado --- UC4
  dono --- UC5
  dono --- UC6
  responsavel --- UC5
  responsavel --- UC6
  UC1 -. "«include»" .-> UC2
  UC3 -. "«extend»" .-> UC1
  UC4 -. "«extend»" .-> UC1
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Abrir tarefa da lista do projeto | autenticado | RF7.CA01, RF7.CA06 | planejado (`/projects/[id]/tasks/[ptId]`) |
| UC2 Verificar acesso à tarefa | — (incluído por UC1) | RF7.CA03 | real para a tarefa: `GET /api/tasks/{id}` com `ResourceAuthorizer`/`AccessPolicy` (invisível → `404 NAO_ENCONTRADO`, D-141); no contexto do projeto, planejado |
| UC3 Ver tarefa removida pelo autor | autenticado | RF7.CA02 | planejado (`TaskSnapshot`) |
| UC4 Levar tarefa ao meu acervo | autenticado | RF7.CA04 | planejado (`EXTRAIDA_DE_PROJETO`, RF23) |
| UC5 Editar a tarefa a partir do projeto | dono, responsavel | RF7.CA05 | planejado (a edição em si é real no RF12 para dono e colaborador) |
| UC6 Abrir a tarefa no Acervo | dono, responsavel | RF7.CA05 | planejado (o destino `/tasks/[id]` já é real; o atalho a partir do projeto não) |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class ProjectController {
    <<controller>>
    +detail(id, CurrentUser) ProjectDetailView
    +taskDetail(id, ptId, CurrentUser) ProjectTaskDetailView
  }
  class TaskExtractController {
    <<controller>>
    +extract(taskId, ExtractRequest, CurrentUser, ctx) TaskView
  }
  class MediaController {
    <<controller>>
    +presign(mediaId, CurrentUser) PresignedUrl
  }
  class ProjectDetailService {
    <<service>>
    +detail(projectId, viewer) ProjectDetailView
    +taskDetail(projectId, ptId, viewer) ProjectTaskDetailView
    -contextOf(ProjectTask) ProjectContext
    -actionsFor(viewer, task, project) List~Action~
  }
  class TaskExtractionService {
    <<service>>
    +extractToMyAcervo(taskId, projectId, actor, ctx) TaskItem
  }
  class AccessPolicy {
    <<service>>
    +canView(viewer, TaskItem) boolean
    +canView(viewer, ProjectScheme) boolean
    +canEdit(viewer, TaskItem, ProjectScheme) boolean
  }
  class ViewCounter {
    <<service>>
    +hit(targetType, targetId) void
  }
  class OwnMedia {
    <<service>>
    +requireReadable(viewer, MediaObject, TaskItem) void
  }
  class ProjectRepositoryPort {
    <<port>>
    +findById(id) Optional
    +findProjectTask(projectId, ptId) Optional
  }
  class TaskRepositoryPort {
    <<port>>
    +findById(id) Optional
    +save(TaskItem) TaskItem
    +incrementReuse(id) void
  }
  class MediaStoragePort {
    <<port>>
    +presign(objectKey, ttl) URL
  }
  class CounterCachePort {
    <<port>>
    +increment(key) long
  }
  class NotificationPort {
    <<port>>
    +notify(Notification) void
  }

  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +ProjectStatus status
    +ProjectPhase currentPhase
    +Visibility visibility
    +JSON criticalPathJson
  }
  class ProjectTask {
    <<entity>>
    +UUID id
    +UUID projectId
    +UUID taskId
    +ProjectPhase phase
    +int sortOrder
    +UUID responsibleId
    +LocalDate dueAt
    +int percentComplete
    +boolean isCritical
    +int slackDays
    +JSON snapshotJson
    +boolean removedByAuthor
  }
  class TaskSnapshot {
    <<value>>
    +String title
    +TaskType type
    +TaskCategory category
    +String thumbnailUrl
    +String summary
    +String ownerName
    +Instant capturedAt
  }
  class ProjectTaskDependency {
    <<entity>>
    +UUID predecessorProjectTaskId
    +UUID successorProjectTaskId
    +String type
    +int lagDays
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +String summary
    +TaskType type
    +TaskCategory category
    +TaskState state
    +Visibility visibility
    +UUID responsibleId
    +LocalDate dueAt
    +LocalDate legalDueAt
    +SourceKind sourceKind
    +UUID originalTaskId
    +UUID sourceProjectId
    +int reuseCount
    +long viewsCount
    +JSON sealIdsJson
  }
  class TaskAttachment {
    <<entity>>
    +UUID taskId
    +UUID mediaObjectId
    +String fileName
    +String mimeType
    +boolean isPrimary
  }
  class TaskVersion {
    <<entity>>
    +int versionNumber
    +Instant syncedAt
  }
  class MediaObject {
    <<entity>>
    +String objectKey
    +String accessClass
    +UUID ownerId
  }
  class Notification {
    <<entity>>
    +NotificationType type
    +UUID recipientId
    +String groupKey
  }
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
  class SourceKind {
    <<enum>>
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
  }

  ProjectController --> ProjectDetailService
  TaskExtractController --> TaskExtractionService
  MediaController --> OwnMedia
  MediaController --> MediaStoragePort
  ProjectDetailService --> AccessPolicy
  ProjectDetailService --> ViewCounter
  ProjectDetailService --> ProjectRepositoryPort
  ProjectDetailService --> TaskRepositoryPort
  TaskExtractionService --> AccessPolicy
  TaskExtractionService --> TaskRepositoryPort
  TaskExtractionService --> NotificationPort
  ViewCounter --> CounterCachePort
  ProjectScheme "1" *-- "2..*" ProjectTask
  ProjectScheme "1" *-- "0..*" ProjectTaskDependency
  ProjectTask "0..*" --> "0..1" TaskItem : taskId (nulo se removida)
  ProjectTask ..> TaskSnapshot : snapshotJson
  TaskItem "1" --> "0..*" TaskAttachment
  TaskItem "1" --> "0..*" TaskVersion
  TaskAttachment "1" --> "1" MediaObject
  TaskItem "0..*" --> "0..1" TaskItem : originalTaskId (cópia extraída)
  TaskItem "0..*" --> "0..1" ProjectScheme : sourceProjectId
  TaskItem --> Visibility
  TaskItem --> SourceKind
  TaskExtractionService ..> Notification : TAREFA_REUTILIZADA
  note for ProjectTask "+12 campos (startAt, estimatedHours, PERT, EVM, moscow, canvas*, stickyColor, decisionTraceNodeId). snapshotJson é atualizado por TaskUpdated (RF12.CA06) e congelado quando o autor exclui."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Usuário (dono · responsável · terceiro)"]
    A1["Abre /projects/{id} e vê a lista de tarefas por fase"]
    A2["Clica num item da lista"]
    A3["Lê o detalhe · navega anexos, versões, chancelas, contexto no projeto"]
    A4["Aciona a ação principal: Editar · Levar ao meu acervo · Abrir no Acervo"]
    A5["Fecha a folha ou volta"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["GET /api/projects/{id} → quadro/linha do tempo/lista (ProjectCard, PhaseBar)"]
    F2["Router push /projects/{id}/tasks/{ptId} · Sheet lateral (desktop) ou tela cheia (celular) · Skeleton"]
    F3["GET /api/projects/{id}/tasks/{ptId}"]
    F4["GET /api/media/{id}/presign para pré-visualizar anexo"]
    F5["POST /api/tasks/{taskId}/extract {projectId}"]
    F6["Volta à lista na mesma fase e rolagem (estado preservado na URL e no cache do router)"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["ProjectController.taskDetail · TaskExtractController.extract · MediaController.presign"]
    E403["403 ACESSO_NEGADO (projeto ou tarefa fora da visibilidade · PRIVADA de terceiro)"]
    E404["404 TAREFA_NAO_ENCONTRADA (ptId não pertence ao projeto)"]
    E409["409 JA_NO_ACERVO (cópia já existe para este usuário)"]
  end
  subgraph APP["ws-application"]
    S1["ProjectDetailService.taskDetail: findProjectTask(projectId, ptId)"]
    S2{"ProjectTask existe no projeto?"}
    S3{"taskId nulo (removida pelo autor)?"}
    S4["Monta detalhe a partir do TaskSnapshot: aviso 'removida pelo autor', sem anexos nem ações"]
    S5{"AccessPolicy.canView(viewer, task)?"}
    S6["Card 'tarefa privada' (só fase e ordem)"]
    S7["Monta detalhe completo: tarefa + anexos (presign sob demanda) + versões + chancelas + contexto (fase, ordem, dependências, crítica, %)"]
    S8["actionsFor: dono/responsável → Editar · terceiro → Levar ao meu acervo + interações"]
    S9["ViewCounter.hit(TASK, id) → Redis, consolidado em viewsCount"]
    X1["TaskExtractionService: canView e visibility != PRIVADA?"]
    X2["Cópia: sourceKind EXTRAIDA_DE_PROJETO · originalTaskId · sourceProjectId · DISPONIVEL · PRIVADA · anexos por referência (mesmo MediaObject)"]
    X3["reuseCount++ na original · AuditLog TASK_EXTRACTED"]
    EV["AFTER_COMMIT: Notification TAREFA_REUTILIZADA ao dono · reindexa ws-tasks · métrica de reutilização (perfil deliberativo)"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: project_schemes, project_tasks (snapshot_json), project_task_dependencies, tasks, task_attachments, task_versions, media_objects, audit_log")]
    P2[("Redis: views:task:{id} · card cache")]
    P3[("S3: anexos (URL assinada curta) · thumbnails")]
    P4[("Cassandra notifications_by_user · OpenSearch ws-tasks")]
  end

  A1 --> F1 --> W1 --> W2 --> P1
  F1 --> A2 --> F2 --> F3 --> W1
  W2 --> S1 --> S2
  S2 -->|"não"| E404
  S2 -->|"sim"| S3
  S3 -->|"sim"| S4 --> A3
  S3 -->|"não"| S5
  S5 -->|"não"| S6
  S5 -->|"não, API direta"| E403
  S5 -->|"sim"| S7 --> S8 --> S9 --> A3
  S9 --> P2
  S7 --> P1
  A3 --> F4 --> W2 --> P3
  A3 --> A4
  A4 -->|"Levar ao meu acervo"| F5 --> W2 --> X1
  X1 -->|"PRIVADA ou sem acesso"| E403
  X1 -->|"já extraída"| E409
  X1 -->|"ok"| X2 --> X3 --> P1
  X3 --> EV --> P4
  A4 -->|"Editar"| RF8["RF8 / RF12: /tasks/{id}/edit"]
  A4 -->|"Abrir no Acervo"| RF41["/tasks/{id} (RF6/RF41)"]
  A3 --> A5 --> F6
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant R as Repository/MySQL
  participant RD as Redis
  participant S3 as S3
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: clica numa tarefa da fase ELABORACAO em /projects/{id}
  N->>N: push /projects/{id}/tasks/{ptId} (Sheet com Skeleton)
  N->>C: GET /api/projects/{id}/tasks/{ptId}
  C->>S: ProjectDetailService.taskDetail(projectId, ptId, viewer)
  S->>R: findById(project) + AccessPolicy.canView(viewer, project)
  S->>R: findProjectTask(projectId, ptId)
  alt ptId não pertence ao projeto
    S-->>C: 404 TAREFA_NAO_ENCONTRADA
    C-->>N: 404
  else tarefa removida pelo autor (taskId nulo)
    S->>S: detalhe a partir de snapshotJson (TaskSnapshot)
    S-->>C: ProjectTaskDetailView {snapshot, removedByAuthor=true, actions=[]}
    C-->>N: 200 (aviso "removida pelo autor", sem anexos)
  else tarefa fora da visibilidade do viewer
    S->>S: AccessPolicy.canView(viewer, task) = false
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403 (card "tarefa privada": só fase e ordem)
  else tarefa visível
    S->>R: tasks + task_attachments + task_versions + seal_bonds + dependências do ProjectTask
    S->>S: contextOf (fase, ordem, predecessoras, isCritical, slackDays, percentComplete)
    S->>S: actionsFor(viewer) → Editar | Levar ao meu acervo | Abrir no Acervo + interações
    S->>RD: INCR views:task:{taskId} (consolidação em lote em tasks.views_count)
    S-->>C: ProjectTaskDetailView
    C-->>N: 200
    N-->>U: folha com TypeChip, Tag, Due ⚖, Seal, Counters, contexto no projeto
  end

  U->>N: clica no anexo principal
  N->>C: GET /api/media/{mediaId}/presign
  C->>S: OwnMedia.requireReadable(viewer, media, task)
  alt sem direito de leitura
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else ok
    S->>S3: presign(objectKey, 5 min)
    S-->>C: PresignedUrl
    C-->>N: 200 → pré-visualização
  end

  U->>N: "Levar ao meu acervo"
  N->>C: POST /api/tasks/{taskId}/extract {projectId}
  C->>S: TaskExtractionService.extractToMyAcervo(taskId, projectId, actor, ctx)
  S->>R: findById(task)
  alt PRIVADA ou viewer sem acesso
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else já existe cópia deste usuário
    S-->>C: 409 JA_NO_ACERVO {existingTaskId}
    C-->>N: 409 (link para a cópia)
  else ok
    S->>R: insert tasks (cópia: EXTRAIDA_DE_PROJETO, originalTaskId, sourceProjectId, DISPONIVEL, PRIVADA)
    S->>R: insert task_attachments apontando os mesmos media_objects
    S->>R: update original.reuse_count + 1 · insert audit_log TASK_EXTRACTED
    S-->>C: TaskView (cópia)
    C-->>N: 201 → Toast "no seu Acervo"
    EV->>CS: notifications_by_user TAREFA_REUTILIZADA (dono da original)
    EV->>R: deliberative_profiles.reuse (métrica de reutilização)
  end

  U->>N: fecha a folha
  N->>N: back → /projects/{id} na mesma fase e rolagem
```

## 4. Máquina de estados

Entidade central: a **ligação `ProjectTask` → `TaskItem`** vista pelo leitor — estados derivados de `taskId`, `removedByAuthor` e `AccessPolicy.canView` (não há enum; `ProjectTask` não tem `status`). A tarefa em si segue `TaskState` (RF4/RF6 §4); a cópia extraída nasce `DISPONIVEL`.

```mermaid
stateDiagram-v2
  direction LR
  state "LIGADA_VISIVEL (taskId != null, canView)" as VIS
  state "LIGADA_PRIVADA (taskId != null, canView = false)" as PRIV
  state "REMOVIDA_PELO_AUTOR (taskId = null, snapshotJson)" as REM
  state "Cópia no meu Acervo (TaskItem EXTRAIDA_DE_PROJETO, DISPONIVEL, PRIVADA)" as COPIA

  [*] --> VIS : ProjectTask criada no Criador de Projetos (RF5) [visibility compatível com o viewer]
  [*] --> PRIV : ProjectTask criada [tarefa PRIVADA de terceiro ou DEPARTAMENTO sem ser membro]
  VIS --> PRIV : dono reduz a visibility da tarefa (RF12) → snapshotJson mantido, folha vira "tarefa privada"
  PRIV --> VIS : dono amplia a visibility
  VIS --> REM : dono exclui a tarefa → ProjectTask.taskId = null, removedByAuthor = true, snapshot congelado (RF23.CA03)
  PRIV --> REM : dono exclui a tarefa
  VIS --> VIS : TaskUpdated (RF12.CA06) atualiza snapshotJson e viewsCount++ a cada abertura
  VIS --> COPIA : "Levar ao meu acervo" [viewer != dono, visibility != PRIVADA] · reuseCount++ · TAREFA_REUTILIZADA
  COPIA --> [*] : passa a seguir TaskState no Acervo do viewer (RF6/RF41)
  REM --> [*] : permanece no projeto como snapshot (fases e dependências íntegras)
  note right of PRIV
    API: 403 ACESSO_NEGADO.
    Tela: card "tarefa privada" só com fase e ordem.
  end note
  note right of REM
    Sem anexos, sem Editar, sem Levar ao meu acervo.
    Aviso "removida pelo autor".
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/projects/[id] · app/(shell)/projects/[id]/tasks/[ptId] (rota paralela em Sheet)"]
    UI["packages/ui: ProjectCard, PhaseBar, TaskCard (list/expanded), TypeChip, Tag, Due, Seal, Counters, Sheet, Skeleton, Button (icon transformar-tarefa)"]
    BFF["app/bff/projects/* · app/bff/tasks/* · app/bff/media/*"]
    PG --> UI
    PG --> BFF
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    PC["ProjectController · TaskExtractController · MediaController"]
    GEH["GlobalExceptionHandler (403, 404, 409)"]
  end
  subgraph WSAPP["ws-application"]
    PRJ["projects: ProjectDetailService"]
    ACV["acervo: TaskExtractionService (compartilhado com RF23) · ViewCounter"]
    SECU["security: AccessPolicy · OwnMedia · Guard (real)"]
    PORTS["ports: ProjectRepositoryPort · TaskRepositoryPort · MediaStoragePort · CounterCachePort · NotificationPort · SearchIndexPort · AuditLogPort"]
    EVT["events: TaskExtracted (AFTER_COMMIT)"]
    PRJ --> SECU
    PRJ --> PORTS
    ACV --> SECU
    ACV --> PORTS
    ACV --> EVT
  end
  subgraph WSDOM["ws-domain"]
    DOM["projects: ProjectScheme · ProjectTask · TaskSnapshot · ProjectTaskDependency · acervo: TaskItem · TaskAttachment · TaskVersion · platform: MediaObject · social: Notification"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: JpaProjectRepository · JpaTaskRepository"]
    RDS["cache-redis: views:task:{id} · cache de card"]
    S3["storage-s3: presign curto (5 min) · anexos por referência"]
    CAS["persistence-cassandra: notifications_by_user · timeline_by_user"]
    OSE["search-opensearch: ws-tasks (reindexa a cópia)"]
  end

  BFF -->|"REST JSON"| SEC --> PC --> PRJ
  PC --> ACV
  PC --> GEH
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  S3 -.implementa.-> PORTS
  CAS -.implementa.-> PORTS
  OSE -.implementa.-> PORTS
  PRJ --> DOM
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  S3 --> MINIO[("S3 / MinIO")]
  CAS --> CDB[("Cassandra 4.1")]
  OSE --> OSX[("OpenSearch 2.19")]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF7.CA01 | `ProjectDetailService.taskDetail/contextOf`, `ProjectTask`, `ProjectTaskDependency`, `TaskAttachment`, `TaskVersion`, `MediaController.presign` | `A2`→`F2`→`F3`→`S1`→`S7`→`A3`, `F4` | 1–6, 17–24, 25–33 | `[*]`→`VIS` | `PG`, `UI` (`TypeChip`, `Tag`, `Due`, `Seal`, `Counters`), `S3` | planejado |
| RF7.CA02 | `ProjectTask.taskId/snapshotJson/removedByAuthor`, `TaskSnapshot` | `S3`→`S4` | 10–13 | `VIS`→`REM`, nota de `REM` | `PRJ`, `DOM` | planejado (RF23.CA03) |
| RF7.CA03 | `AccessPolicy.canView`, `ProjectRepositoryPort.findProjectTask` | `S2`→`E404`, `S5`→`S6`/`E403` | 7–9, 14–16 | `[*]`→`PRIV`, `VIS`→`PRIV` | `SECU`, `GEH` | planejado |
| RF7.CA04 | `TaskExtractionService.extractToMyAcervo`, `TaskItem.sourceKind/originalTaskId/sourceProjectId/reuseCount`, `NotificationPort` | `A4`→`F5`→`X1`→`X3`→`EV`, `E403`, `E409` | 34–50 | `VIS`→`COPIA` | `ACV`, `EVT`, `CAS`, `OSE` | planejado (RF23.CA01/CA02/CA04/CA05) |
| RF7.CA05 | `ProjectDetailService.actionsFor`, `AccessPolicy.canEdit`, `ViewCounter`, `CounterCachePort` | `S8`→`S9`, `A4`→`RF8`/`RF41` | 20–21 | `VIS`→`VIS` (viewsCount) | `RDS`, `UI` (`Button`) | planejado |
| RF7.CA06 | rota paralela `/projects/[id]/tasks/[ptId]`, `Sheet`, `Skeleton`, `lib/i18n` | `F2`, `A5`→`F6` | 2, 51–52 | — | `PG`, `UI` (`Sheet`, `Skeleton`) | planejado |
