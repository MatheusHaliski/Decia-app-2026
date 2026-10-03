# RF23 — Extrair uma tarefa de um Esquema de Projeto para o meu Acervo (reutilização com crédito) e preservar snapshot quando a tarefa original for excluída
**HU:** HU23 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4; candidato à Sprint 5) · **Equivalente FAI:** RF7 Peça a partir do esquema · **Aba/rota:** ação "Levar ao meu acervo" no card de tarefa dentro de `/projects/[id]` (destino: Acervo de Tarefas `/acervo`, RF41)
**Critérios de aceite cobertos:** RF23.CA01 · CA02 · CA03 · CA04 · CA05

Dois fluxos sobre a mesma ligação `ProjectTask ↔ TaskItem`: (1) **Extrair** — em qualquer projeto visível para mim, cada tarefa não-PRIVADA tem a ação **"Levar ao meu acervo"**, que cria uma cópia (`TaskItem` com `sourceKind = EXTRAIDA_DE_PROJETO`, `originalTaskId` = crédito ao autor, `sourceProjectId` = link ao projeto), herdando tipo, categoria, tags e **anexos por referência** (`TaskAttachment` aponta para o mesmo `MediaObject`, sem duplicar arquivo), nascendo `DISPONIVEL` e `PRIVADA`, e incrementando `reuseCount` da original (métrica de reutilização do perfil deliberativo, objetivo 2). (2) **Excluir** — quando o dono apaga uma tarefa usada em projetos de terceiros, cada `ProjectTask` grava o **snapshot** (`TaskSnapshot` em `snapshotJson`), `taskId` fica nulo e `removedByAuthor = true`; o projeto exibe "removida pelo autor" sem quebrar fases nem `ProjectTaskDependency`.

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace wai_domain_acervo {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +summary: String
    +type: TaskType
    +category: TaskCategory
    +subcategory: String
    +processTags: Set~ProcessTag~
    +natureTags: Set~NatureTag~
    +accessClass: AccessClassification
    +sourceKind: SourceKind
    +sourceRef: String
    +state: TaskState
    +visibility: Visibility
    +thumbnailUrl: String
    +tags: Set~String~
    +originalTaskId: UUID crédito
    +sourceProjectId: UUID
    +reuseCount: int
    +projectUsageCount: int
    +version: long
    .. +35 campos ..
  }
  class TaskAttachment {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +mediaObjectId: UUID mesmo objeto, sem cópia
    +fileName: String
    +mimeType: String
    +sha256: String
    +isPrimary: boolean
  }
  class TaskStateLog {
    <<entity>>
    +taskId: UUID
    +fromState: TaskState
    +toState: TaskState
    +actorId: UUID
    +reason: String
  }
  class TaskSnapshot {
    <<entity>>
    +title: String
    +type: TaskType
    +category: TaskCategory
    +thumbnailUrl: String
    +summary: String
    +ownerName: String
    +capturedAt: Instant
  }
}

namespace wai_domain_projetos {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +title: String
    +visibility: Visibility
    +status: ProjectStatus
  }
  class ProjectTask {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +taskId: UUID nullable se removida
    +phase: ProjectPhase
    +sortOrder: int
    +responsibleId: UUID
    +dueAt: LocalDate
    +snapshotJson: JSON TaskSnapshot
    +removedByAuthor: boolean
  }
  class ProjectTaskDependency {
    <<entity>>
    +predecessorProjectTaskId: UUID
    +successorProjectTaskId: UUID
    +type: String
  }
}

namespace wai_domain_plataforma_social {
  class MediaObject {
    <<entity>>
    +id: UUID
    +bucket: String
    +key: String
    +sha256: String
    +ownerId: UUID
  }
  class User {
    <<entity>>
    +id: UUID
    +displayName: String
    +companyId: UUID
    +departmentId: UUID
  }
  class Notification {
    <<entity>>
    +recipientId: UUID
    +actorId: UUID
    +type: NotificationType TAREFA_REUTILIZADA
    +category: String SOCIAL
    +groupKey: String
  }
  class DeliberativeProfile {
    <<entity>>
    +userId: UUID
    +periodKey: String
    +reuse: BigDecimal
    +deltaJson: JSON
  }
  class DomainEventOutbox {
    <<entity>>
    +aggregateType: String TASK
    +eventType: String TaskExtracted TaskDeletedWithSnapshot
    +payloadJson: JSON
  }
}

namespace wai_domain_enums {
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
    ATA_VIVA
    DOSSIE
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
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
}

namespace wai_application {
  class AcervoService {
    <<service>>
    +extractToAcervo(userId, projectId, projectTaskId) TaskItem
    +canExtract(viewer, project, task) boolean visibilidade não PRIVADA e projeto visível
    +deleteTask(ownerId, taskId) DeleteResult
    -copyAttachmentsByReference(source, copy)
  }
  class ProjectComposerService {
    <<service>>
    +snapshotProjectTasks(taskId) int
    +renderRemovedByAuthor(projectId) List~ProjectTask~
  }
  class SocialService {
    <<service>>
    +notifyReuse(originalOwnerId, actorId, taskId)
  }
  class ReputationService {
    <<service>>
    +onTaskReused(originalOwnerId) atualiza métrica reuse
  }
  class SearchIndexPort {
    <<port>>
    +indexTask(TaskItem)
    +removeTask(taskId)
  }
  class MediaStoragePort {
    <<port>>
    +presign(mediaId) URL
  }
}

namespace wai_web {
  class ProjectController {
    <<controller>>
    +POST_api_projects_id_tasks_ptId_extract()
    +GET_api_projects_id()
  }
  class TaskController {
    <<controller>>
    +DELETE_api_tasks_id()
  }
}

namespace wai_infrastructure {
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
  class S3StorageAdapter {
    <<adapter>>
  }
}

ProjectScheme "1" --> "*" ProjectTask
ProjectTask "*" --> "0..1" TaskItem : taskId nulo após exclusão
ProjectTask "1" --> "0..1" TaskSnapshot : snapshotJson embutido
ProjectTaskDependency "*" --> "1" ProjectTask : predecessor
ProjectTaskDependency "*" --> "1" ProjectTask : successor
TaskItem "*" --> "0..1" TaskItem : originalTaskId crédito ao autor
TaskItem "*" --> "0..1" ProjectScheme : sourceProjectId
TaskItem "1" --> "*" TaskAttachment
TaskItem "1" --> "*" TaskStateLog
TaskItem "*" --> "1" User : ownerId
TaskAttachment "*" --> "1" MediaObject : referência compartilhada
Notification "*" --> "1" User : recipientId dono original
DeliberativeProfile "*" --> "1" User : userId
TaskItem --> SourceKind
TaskItem --> TaskState
TaskItem --> Visibility

ProjectController ..> AcervoService : extract
TaskController ..> AcervoService : delete
AcervoService ..> ProjectComposerService : snapshot antes de excluir
AcervoService ..> SearchIndexPort
AcervoService ..> MediaStoragePort
AcervoService ..> DomainEventOutbox : TaskExtracted
DomainEventOutbox ..> SocialService : AFTER_COMMIT
DomainEventOutbox ..> ReputationService : AFTER_COMMIT
OpenSearchIndexAdapter ..|> SearchIndexPort
S3StorageAdapter ..|> MediaStoragePort

note for TaskItem "cópia: sourceKind EXTRAIDA_DE_PROJETO, originalTaskId, sourceProjectId, state DISPONIVEL, visibility PRIVADA (CA01, CA02) · original: reuseCount + 1 (CA04)"
note for TaskAttachment "cópia aponta para o mesmo mediaObjectId — referência, não duplicação de arquivo (CA02)"
note for ProjectTask "exclusão pelo dono: snapshotJson preenchido, taskId nulo, removedByAuthor true — fases e dependências intactas (CA03)"
note for AcervoService "canExtract falso para visibility PRIVADA: ação oculta na tela e 403 na API (CA05)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Abre um projeto visível para mim"]
    U2["Clica em Levar ao meu acervo em uma tarefa"]
    U3["Dono exclui uma tarefa sua"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Renderiza cards de tarefa do projeto"]
    W2{"Tarefa é PRIVADA?"}
    W3["Ação oculta no card"]
    W4["Ação Levar ao meu acervo visível"]
    W5["Toast: tarefa copiada, abrir no Acervo"]
    W6["Card exibe removida pelo autor com snapshot: título, tipo, categoria, thumbnail, resumo"]
    W7["Card da original mostra reutilizada N vezes"]
  end

  subgraph LA["wai-application"]
    A1["AcervoService.canExtract"]
    A2{"Projeto visível e tarefa não PRIVADA?"}
    A3["403 ACESSO_NEGADO"]
    A4["Cria cópia TaskItem: sourceKind EXTRAIDA_DE_PROJETO, originalTaskId, sourceProjectId, ownerId = eu, state DISPONIVEL, visibility PRIVADA"]
    A5["Herda type, category, subcategory, tags; TaskAttachment por referência ao mesmo MediaObject"]
    A6["UPDATE original reuseCount + 1"]
    A7["AFTER_COMMIT TaskExtracted"]
    A8["AcervoService.deleteTask"]
    A9{"Tarefa usada em ProjectTasks de outras pessoas?"}
    A10["ProjectComposerService.snapshotProjectTasks: snapshotJson = TaskSnapshot, taskId = null, removedByAuthor = true"]
    A11["Exclui TaskItem, mantém MediaObjects referenciados por cópias"]
    A12["SearchIndexPort.removeTask"]
    A13["SocialService.notifyReuse ao dono original"]
    A14["ReputationService.onTaskReused: métrica reuse do DeliberativeProfile"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: tasks cópia + task_attachments ref")]
    P2[("MySQL: tasks original reuseCount")]
    P3[("OpenSearch: índice de tarefas")]
    P4[("MySQL: project_tasks snapshotJson, removedByAuthor")]
    P5[("Cassandra: notifications_by_user · MySQL: deliberative_profiles")]
  end

  U1 --> W1 --> W2
  W2 -->|"sim"| W3
  W2 -->|"não"| W4 --> U2 --> A1 --> A2
  A2 -->|"não"| A3
  A2 -->|"sim"| A4 --> A5 --> P1
  A5 --> A6 --> P2
  A6 --> A7
  A7 --> P3
  A7 --> A13 --> P5
  A7 --> A14 --> P5
  A7 --> W5
  A14 --> W7
  U3 --> A8 --> A9
  A9 -->|"sim"| A10 --> P4 --> A11
  A9 -->|"não"| A11
  A11 --> A12 --> P3
  A10 --> W6

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A3 err
  class W3,W6 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (eu)
  actor O as Dono original
  participant NX as Next.js (App Router)
  participant C as Controller (wai-web)
  participant S as Service (wai-application)
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant CS as Cassandra
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: abre /projects/77 e clica Levar ao meu acervo na tarefa T9
  NX->>C: POST /api/projects/77/tasks/PT9/extract
  C->>S: AcervoService.extractToAcervo(userId, 77, PT9)
  S->>DB: project_schemes 77 + project_tasks PT9 + tasks T9
  S->>S: canExtract = projeto visível para mim AND T9.visibility != PRIVADA
  alt tarefa PRIVADA ou projeto invisível (CA05)
    S-->>C: 403 ACESSO_NEGADO
    C-->>NX: 403
    NX-->>U: ação não disponível
  else permitido (CA01, CA02)
    S->>DB: INSERT tasks (ownerId eu, sourceKind EXTRAIDA_DE_PROJETO, originalTaskId T9, sourceProjectId 77, state DISPONIVEL, visibility PRIVADA, type, category, tags herdados)
    S->>DB: INSERT task_attachments (mediaObjectId igual ao da original — referência)
    S->>DB: INSERT task_state_log (null → DISPONIVEL, reason EXTRAIDA_DE_PROJETO)
    S->>DB: UPDATE tasks SET reuseCount = reuseCount + 1 WHERE id = T9 (CA04)
    S->>DE: publish TaskExtracted {copyId, originalId T9, actorId, projectId 77}
    S-->>C: 201 TaskItem cópia com crédito e link ao projeto
    C-->>NX: 201
    NX-->>U: tarefa no meu Acervo, card mostra autor original e projeto de origem
  end
  DE->>OS: indexTask(cópia)
  DE->>CS: INSERT notifications_by_user (recipient dono original, type TAREFA_REUTILIZADA, groupKey hora)
  DE->>DB: UPDATE deliberative_profiles SET reuse (métrica de reutilização, objetivo 2) (CA04)
  O->>NX: vê no card e no perfil deliberativo reutilizada N vezes

  O->>NX: exclui a tarefa T9 (usada no projeto 77 de outra pessoa)
  NX->>C: DELETE /api/tasks/T9
  C->>S: AcervoService.deleteTask(ownerId, T9)
  S->>DB: SELECT project_tasks WHERE taskId = T9 AND project.ownerId != O
  alt usada em projetos de terceiros (CA03)
    S->>DB: UPDATE project_tasks SET snapshotJson = {title, type, category, thumbnailUrl, summary, ownerName, capturedAt}, taskId = NULL, removedByAuthor = true
    Note over S,DB: fases, sortOrder e project_task_dependencies permanecem intactos
  end
  S->>DB: DELETE tasks WHERE id = T9 (MediaObjects referenciados por cópias são preservados)
  S->>DE: publish TaskDeletedWithSnapshot
  S-->>C: 204
  DE->>OS: removeTask(T9)
  U->>NX: reabre /projects/77
  NX->>C: GET /api/projects/77
  C->>S: ProjectComposerService.renderRemovedByAuthor
  S-->>C: ProjectTask PT9 com snapshot e removedByAuthor true
  NX-->>U: card "removida pelo autor" na fase original, dependências preservadas
```

## 4. Máquina de estados

Entidade central: **`TaskItem.state`** (enum `TaskState`) — o RF23 cria a **cópia** diretamente em `DISPONIVEL` e encerra o ciclo da **original** por exclusão com snapshot. A ligação `ProjectTask` ganha o marcador `removedByAuthor`, mostrado como estado derivado.

```mermaid
stateDiagram-v2
  state "Cópia extraída — sourceKind EXTRAIDA_DE_PROJETO" as Copia {
    [*] --> DISPONIVEL : Levar ao meu acervo, visibility PRIVADA, originalTaskId
    DISPONIVEL --> EM_USO : usada em um projeto meu
    DISPONIVEL --> ARQUIVADA : arquivar
    EM_USO --> DISPONIVEL : removida dos projetos
  }
  state "Original — ciclo RF41" as Original {
    [*] --> EM_USO_ORIG
    state "EM_USO em projetos de terceiros" as EM_USO_ORIG
    state "Excluída pelo dono" as EXCLUIDA
    EM_USO_ORIG --> EM_USO_ORIG : reuseCount + 1 a cada extração
    EM_USO_ORIG --> EXCLUIDA : DELETE pelo dono, snapshot gravado em cada ProjectTask
    EXCLUIDA --> [*]
  }
  state "ProjectTask de terceiros" as PT {
    [*] --> Vinculada
    Vinculada --> RemovidaPeloAutor : taskId nulo, snapshotJson, removedByAuthor true
    RemovidaPeloAutor --> RemovidaPeloAutor : fases e dependências preservadas
  }
  Original --> PT : exclusão dispara snapshot
  note right of Copia
    PRIVADA não pode ser extraída: 403 ACESSO_NEGADO (CA05).
    Herda tipo, categoria, tags e anexos por referência (CA02).
  end note
  note right of PT
    Projeto exibe "removida pelo autor" com título, tipo,
    categoria, thumbnail e resumo do TaskSnapshot (CA03).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/projects/[id] — TaskCard com ação Levar ao meu acervo"]
    F2["app/acervo — Acervo de Tarefas RF41, card com crédito ao autor e link ao projeto"]
    F3["components/ui: TaskCard, RemovedByAuthorCard snapshot, ReuseCounter, CreditBadge"]
  end

  subgraph WEB["wai-web"]
    C1["ProjectController — POST /api/projects/{id}/tasks/{ptId}/extract, GET /api/projects/{id}"]
    C2["TaskController — DELETE /api/tasks/{id}"]
  end

  subgraph APP["wai-application"]
    S1["AcervoService RF41"]
    S2["ProjectComposerService RF21"]
    S3["SocialService RF26"]
    S4["ReputationService RF43"]
    P1["SearchIndexPort"]
    P2["MediaStoragePort"]
  end

  subgraph DOM["wai-domain"]
    D1["TaskItem · TaskAttachment · TaskStateLog · TaskSnapshot"]
    D2["ProjectScheme · ProjectTask · ProjectTaskDependency"]
    D3["MediaObject · Notification · DeliberativeProfile · DomainEventOutbox"]
  end

  subgraph INFRA["wai-infrastructure/*"]
    I1[("persistence-mysql: tasks, task_attachments, task_state_log, project_tasks, deliberative_profiles, domain_events")]
    I2[("storage-s3: MediaObjects compartilhados por referência")]
    I3[("search-opensearch: índice de tarefas")]
    I4[("persistence-cassandra: notifications_by_user")]
    I5["platform: outbox AFTER_COMMIT"]
  end

  F1 --- F3
  F2 --- F3
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C2
  C1 --> S1
  C2 --> S1
  S1 --> S2
  S1 --> P1
  S1 --> P2
  S1 --> D1
  S2 --> D2
  S1 --> D3
  D3 --> I5
  I5 --> S3
  I5 --> S4
  S3 --> I4
  S4 --> I1
  D1 --> I1
  D2 --> I1
  P1 --> I3
  P2 --> I2
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF23.CA01 | `TaskItem.sourceKind EXTRAIDA_DE_PROJETO / originalTaskId / sourceProjectId`, enum `SourceKind`, `AcervoService.extractToAcervo` · Atividades `W4 → U2 → A1 → A4 → P1` · Sequência `POST /api/projects/77/tasks/PT9/extract` → `INSERT tasks (… EXTRAIDA_DE_PROJETO, originalTaskId T9, sourceProjectId 77 …)` · Transição `[*] → DISPONIVEL` da *Cópia* · Componentes `TaskCard`, `CreditBadge`, `ProjectController /extract` |
| RF23.CA02 | `TaskAttachment.mediaObjectId` (nota "referência, não duplicação"), `MediaObject`, `AcervoService.copyAttachmentsByReference`, enums `TaskState.DISPONIVEL`, `Visibility.PRIVADA` · Atividades `A5` · Sequência `INSERT task_attachments (mediaObjectId igual ao da original)` e `state DISPONIVEL, visibility PRIVADA, type, category, tags herdados` · Nota da *Cópia* · Componente `storage-s3 (compartilhados por referência)` |
| RF23.CA03 | `ProjectTask.snapshotJson / removedByAuthor / taskId nullable`, `TaskSnapshot`, `ProjectTaskDependency`, `ProjectComposerService.snapshotProjectTasks/renderRemovedByAuthor`, `AcervoService.deleteTask` · Atividades `U3 → A8 → A9 → A10 → P4 → A11 → W6` · Sequência `DELETE /api/tasks/T9` → `alt usada em projetos de terceiros` → `UPDATE project_tasks SET snapshotJson …, taskId = NULL, removedByAuthor = true` + nota "fases … intactos" → card "removida pelo autor" · Estados *Original → EXCLUIDA* e *ProjectTask → RemovidaPeloAutor* · Componente `RemovedByAuthorCard` |
| RF23.CA04 | `TaskItem.reuseCount`, `DeliberativeProfile.reuse`, `ReputationService.onTaskReused`, `Notification` · Atividades `A6 → P2`, `A7 → A14 → P5 → W7` · Sequência `UPDATE tasks SET reuseCount + 1`, `UPDATE deliberative_profiles SET reuse`, "reutilizada N vezes" · Transição `EM_USO_ORIG → EM_USO_ORIG : reuseCount + 1` · Componentes `ReuseCounter`, `ReputationService RF43` |
| RF23.CA05 | `AcervoService.canExtract` (nota PRIVADA → oculta + 403) · Atividades `W2 (sim) → W3` (ação oculta) e `A2 (não) → A3 403 ACESSO_NEGADO` · Sequência `alt tarefa PRIVADA ou projeto invisível → 403 ACESSO_NEGADO` · Nota da *Cópia* |
