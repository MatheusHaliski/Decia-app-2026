# RF7 — Abrir um esquema de tarefa a partir da lista de um esquema de projeto
**HU:** HU7 · **Sprint (board Work Station):** lista *Requisitos Funcionais* (sem sprint atribuída) · **Equivalente FAI:** RF7 Peça a partir do esquema (clicar numa peça do look abre o detalhe da peça com "Adicionar ao meu closet"; snapshot quando a peça foi excluída) · **Aba/rota:** detalhe do projeto `/projects/[id]` → lista de tarefas por fase → `/projects/[id]/tasks/[ptId]` (folha de detalhe, URL profunda), com atalho para `/tasks/[id]` e ação "Levar ao meu acervo" (destino: Acervo Digital, RF6/RF41)
**Critérios de aceite cobertos:** RF7.CA01 … RF7.CA06 — **todos "(CA a confirmar)"**: o corpo do card RF7 está vazio; os CAs foram derivados do título + HU7 e reaproveitam `_anterior/RF23` (snapshot RF23.CA03, "Levar ao meu acervo" RF23.CA01/CA05) e RF41.CA03 (detalhe da tarefa)

> **HU7** — COMO usuário visualizando um esquema de projeto POSSO clicar em um item da lista de tarefas PARA visualizar detalhes de uma tarefa e então compreender melhor o escopo do projeto.

A lista de um **Esquema de Projeto** (`ProjectScheme`) é a sequência de `ProjectTask` por fase (`ProjectPhase`). Clicar num item abre o **detalhe da tarefa** (`TaskItem`, RF41.CA03) **no contexto do projeto**: além dos dados da tarefa (resumo, anexos com preview via `MediaStoragePort.presign`, versões `TaskVersion`, chancelas `SealBond`, fio de decisão `DecisionTraceNode`), a folha mostra a fase, a ordem, o responsável e o prazo **daquele projeto** e as dependências (`ProjectTaskDependency`) predecessoras/sucessoras. Se a tarefa original foi excluída pelo autor (`ProjectTask.taskId` nulo, `removedByAuthor = true`), o detalhe é renderizado a partir do `TaskSnapshot` em `snapshotJson` (RF23.CA03). Para tarefas não-PRIVADAS de outras pessoas, a ação principal é **"Levar ao meu acervo"** (cópia `EXTRAIDA_DE_PROJETO` com crédito, RF23.CA01); para o dono/responsável, "Editar" (RF8). O RF7 **não altera estado** de nenhuma entidade além de `viewsCount` e da cópia opcional.

## Critérios de aceite derivados do título + HU7 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) | Fonte reaproveitada |
|---|---|---|
| **RF7.CA01** (CA a confirmar) | Dado um projeto visível para mim, quando clico num item da lista de tarefas (quadro por fase, linha do tempo ou lista), então abre a folha de detalhe da tarefa com título, tipo, categoria, resumo (3 linhas), estado (`TaskState` em texto), prazo (⚖ se legal), responsável, anexos com pré-visualização (`presign`), versões, chancelas, interações e o **contexto no projeto**: fase, ordem, prazo e responsável do `ProjectTask`, predecessoras e sucessoras; a URL fica profunda (`/projects/[id]/tasks/[ptId]`) e compartilhável. | RF41.CA03, RF22.CA03 |
| **RF7.CA02** (CA a confirmar) | Dado um `ProjectTask` com `taskId` nulo (tarefa excluída pelo autor), quando o abro, então o detalhe mostra o `TaskSnapshot` (título, tipo, categoria, thumbnail, resumo, autor, `capturedAt`) com o aviso "removida pelo autor", sem anexos nem ações de cópia/edição; fases e dependências do projeto continuam íntegras. | RF23.CA03, RF41.CA05 |
| **RF7.CA03** (CA a confirmar) | Dado que a tarefa tem `visibility` incompatível com o viewer (PRIVADA de outra pessoa, DEPARTAMENTO sem ser membro), quando clico no item, então o card aparece como "tarefa privada" (só fase e ordem) e a API responde `403 ACESSO_NEGADO`; `ProjectTask` inexistente no projeto → `404 TAREFA_NAO_ENCONTRADA`. | RF26.CA08, RF41.CA08 |
| **RF7.CA04** (CA a confirmar) | Dado o detalhe de uma tarefa não-PRIVADA que não é minha, quando aciono **"Levar ao meu acervo"**, então nasce uma cópia (`sourceKind EXTRAIDA_DE_PROJETO`, `originalTaskId`, `sourceProjectId`, `state DISPONIVEL`, `visibility PRIVADA`, anexos por referência ao mesmo `MediaObject`), `reuseCount` da original incrementa e o dono é notificado; ação oculta para PRIVADA (403 na API). | RF23.CA01, CA02, CA04, CA05 |
| **RF7.CA05** (CA a confirmar) | Dado que sou o dono da tarefa ou responsável no projeto, então a ação principal é **"Editar"** (abre RF8) e a alternativa "Abrir no Acervo" (`/tasks/[id]`); para os demais a ação principal é "Levar ao meu acervo" e as interações sociais (RF19 atual); toda abertura incrementa `viewsCount` (contador desnormalizado, sem evento). | RF41.CA07, RF26.CA07 |
| **RF7.CA06** (CA a confirmar) | Dado a folha aberta, quando fecho ou uso "voltar", então retorno à lista do projeto na mesma fase e posição de rolagem; a folha carrega com skeleton, respeita i18n pt-BR/en/es e layout responsivo (folha lateral no desktop, tela cheia no celular). | RF19.CA03, RF19.CA07 |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_projetos {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +visibility: Visibility
    +criticalPathJson: JSON
    .. +35 campos ..
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
    +startAt: LocalDate
    +percentComplete: int
    +isCritical: boolean
    +slackDays: int
    +snapshotJson: JSON TaskSnapshot
    +removedByAuthor: boolean
    +decisionTraceNodeId: UUID
  }
  class ProjectTaskDependency {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +predecessorProjectTaskId: UUID
    +successorProjectTaskId: UUID
    +type: String FS SS FF SF
    +lagDays: int
  }
}

namespace ws_domain_acervo {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +summary: String
    +descriptionMd: String
    +type: TaskType
    +category: TaskCategory
    +accessClass: AccessClassification
    +state: TaskState
    +visibility: Visibility
    +dueAt: LocalDate
    +legalDueAt: LocalDate
    +responsibleId: UUID
    +thumbnailUrl: String
    +sourceKind: SourceKind
    +originalTaskId: UUID
    +sourceProjectId: UUID
    +reuseCount: int
    +viewsCount: long
    +sealIdsJson: JSON
    .. +35 campos ..
  }
  class TaskAttachment {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +mediaObjectId: UUID
    +fileName: String
    +mimeType: String
    +isPrimary: boolean
  }
  class TaskVersion {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +versionNumber: int
    +syncedAt: Instant
    +changeSummary: String
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

namespace ws_domain_outros {
  class User {
    <<entity>>
    +id: UUID
    +displayName: String
    +companyId: UUID
    +departmentId: UUID
  }
  class MediaObject {
    <<entity>>
    +id: UUID
    +bucket: String
    +key: String
    +mimeType: String
    +variantsJson: JSON thumb preview
  }
  class SealBond {
    <<entity>>
    +id: UUID
    +sealId: UUID
    +targetType: String TASK
    +targetId: UUID
    +status: SealBondStatus
  }
  class DecisionTraceNode {
    <<entity>>
    +id: UUID
    +sessionId: UUID
    +nodeType: TraceNodeType
    +refId: UUID
    +label: String
  }
  class Notification {
    <<entity>>
    +recipientId: UUID
    +type: NotificationType REMIX
    +category: String SOCIAL
    +groupKey: String
  }
}

namespace ws_domain_enums {
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
  class ProjectPhase {
    <<enum>>
    DEMANDA
    PLANEJAMENTO
    ELABORACAO
    ANALISE
    APROVACAO
    EXECUCAO
    ENCERRAMENTO
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
}

namespace ws_application {
  class ProjectService {
    <<service>>
    +load(viewerId, projectId) ProjectView
    +taskDetailInProject(viewerId, projectId, ptId) ProjectTaskDetail
    +canView(viewer, project) boolean
    +dependenciesOf(projectId, ptId) Deps predecessoras e sucessoras
  }
  class AcervoService {
    <<service>>
    +detail(viewerId, taskId) TaskDetail anexos versões chancelas fio
    +canViewTask(viewer, task) boolean por Visibility
    +canExtract(viewer, project, task) boolean
    +extractToAcervo(userId, projectId, ptId) TaskItem
    +incrementViews(taskId)
  }
  class DecisionTraceService {
    <<service>>
    +threadForTask(taskId) List~DecisionTraceNode~
  }
  class MediaStoragePort {
    <<port>>
    +presign(mediaId, ttl) URL
  }
  class CounterCachePort {
    <<port>>
    +incr(key)
  }
}

namespace ws_web {
  class ProjectController {
    <<controller>>
    +GET_api_projects_id()
    +GET_api_projects_id_tasks_ptId()
    +POST_api_projects_id_tasks_ptId_extract()
  }
  class TaskController {
    <<controller>>
    +GET_api_tasks_id()
  }
}

namespace ws_infrastructure {
  class S3StorageAdapter {
    <<adapter>>
  }
  class RedisCounterAdapter {
    <<adapter>>
  }
  class CassandraTraceReadAdapter {
    <<adapter>>
  }
}

ProjectScheme "1" --> "*" ProjectTask : lista por fase
ProjectTask "*" --> "0..1" TaskItem : taskId nulo após exclusão
ProjectTask "1" --> "0..1" TaskSnapshot : snapshotJson embutido
ProjectTask "*" --> "0..1" User : responsibleId
ProjectTask "*" --> "0..1" DecisionTraceNode : decisionTraceNodeId
ProjectTaskDependency "*" --> "1" ProjectTask : predecessor
ProjectTaskDependency "*" --> "1" ProjectTask : successor
TaskItem "*" --> "1" User : ownerId
TaskItem "1" --> "*" TaskAttachment
TaskItem "1" --> "*" TaskVersion
TaskItem "1" --> "*" SealBond : targetId quando TASK
TaskItem "*" --> "0..1" TaskItem : originalTaskId crédito
TaskItem "*" --> "0..1" ProjectScheme : sourceProjectId
TaskAttachment "*" --> "1" MediaObject
Notification "*" --> "1" User : recipientId dono original
TaskItem --> Visibility
TaskItem --> TaskState
ProjectTask --> ProjectPhase
ProjectScheme --> Visibility

ProjectController ..> ProjectService
ProjectController ..> AcervoService : extract
TaskController ..> AcervoService : detail
ProjectService ..> AcervoService : detail + canViewTask
ProjectService ..> DecisionTraceService
AcervoService ..> MediaStoragePort : presign dos anexos
AcervoService ..> CounterCachePort : viewsCount
S3StorageAdapter ..|> MediaStoragePort
RedisCounterAdapter ..|> CounterCachePort
CassandraTraceReadAdapter ..> DecisionTraceService : trace_by_entity

note for ProjectTask "item da lista do projeto · taskId nulo + snapshotJson + removedByAuthor = detalhe pelo TaskSnapshot, sem ações (CA02)"
note for ProjectService "taskDetailInProject = canView(projeto) + canViewTask(tarefa) + detail + contexto do projeto (fase, ordem, prazo, responsável, dependências) (CA01, CA03)"
note for AcervoService "canExtract falso para PRIVADA ou dono = eu: ação oculta e 403 na API (CA04) · ação principal: Editar para dono/responsável, Levar ao meu acervo para os demais (CA05)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Abre /projects/[id] e vê a lista de tarefas por fase"]
    U2["Clica em um item da lista"]
    U3["Levar ao meu acervo"]
    U4["Editar (dono/responsável) ou Abrir no Acervo"]
    U5["Fecha a folha / voltar"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Renderiza quadro por fase, linha do tempo ou lista"]
    W2["Abre folha de detalhe com skeleton e URL profunda /projects/[id]/tasks/[ptId]"]
    W3["Folha: dados da tarefa + contexto do projeto (fase, ordem, prazo, responsável, predecessoras, sucessoras) + anexos com preview"]
    W4["Card 'removida pelo autor' renderizado pelo snapshot, sem ações"]
    W5["Card 'tarefa privada': só fase e ordem"]
    W6["Ação principal: Editar (RF8) para dono/responsável · Levar ao meu acervo para os demais"]
    W7["Retorna à lista na mesma fase e rolagem"]
    W8["Toast: tarefa copiada, abrir no Acervo"]
  end

  subgraph LA["ws-application"]
    A1["ProjectService.load → canView(projeto)"]
    A2{"Projeto visível para o viewer?"}
    A3["403 ACESSO_NEGADO"]
    A4["ProjectService.taskDetailInProject"]
    A5{"ProjectTask existe no projeto?"}
    A6["404 TAREFA_NAO_ENCONTRADA"]
    A7{"taskId nulo (removedByAuthor)?"}
    A8["Monta detalhe a partir do TaskSnapshot"]
    A9{"canViewTask por Visibility?"}
    A10["403 ACESSO_NEGADO"]
    A11["AcervoService.detail: anexos presign, versões, chancelas, fio de decisão + dependenciesOf"]
    A12["AcervoService.incrementViews"]
    A13{"viewer é dono ou responsável?"}
    A14["AcervoService.canExtract → extractToAcervo: cópia EXTRAIDA_DE_PROJETO, anexos por referência, reuseCount + 1"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: project_schemes, project_tasks, project_task_dependencies")]
    P2[("MySQL: tasks, task_attachments, task_versions, seal_bonds")]
    P3[("S3: presign dos MediaObjects")]
    P4[("Cassandra: trace_by_entity")]
    P5[("Redis: viewsCount")]
    P6[("MySQL: tasks cópia · Cassandra: notifications_by_user")]
  end

  U1 --> A1 --> P1
  A1 --> A2
  A2 -->|"não"| A3
  A2 -->|"sim"| W1 --> U2 --> W2 --> A4 --> A5
  A5 -->|"não"| A6
  A5 -->|"sim"| A7
  A7 -->|"sim"| A8 --> W4
  A7 -->|"não"| A9
  A9 -->|"não"| A10 --> W5
  A9 -->|"sim"| A11
  A11 --> P2
  A11 --> P3
  A11 --> P4
  A11 --> A12 --> P5
  A11 --> W3 --> A13
  A13 -->|"sim"| W6 --> U4
  A13 -->|"não"| W6 --> U3 --> A14 --> P6
  A14 --> W8
  W3 --> U5 --> W7

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A3,A6,A10 err
  class W4,W5 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant R as Redis
  participant S3 as S3
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: abre /projects/77 e clica na tarefa PT9 da fase ELABORACAO
  NX->>NX: atualiza URL para /projects/77/tasks/PT9 e abre folha com skeleton (CA06)
  NX->>C: GET /api/projects/77/tasks/PT9
  C->>S: ProjectService.taskDetailInProject(viewerId, 77, PT9)
  S->>DB: project_schemes 77 + project_tasks PT9 + project_task_dependencies
  alt projeto invisível ou PT9 não pertence ao projeto
    S-->>C: 403 ACESSO_NEGADO ou 404 TAREFA_NAO_ENCONTRADA (CA03)
    C-->>NX: 403 / 404
    NX-->>U: folha com mensagem e botão voltar
  else PT9.taskId nulo (CA02)
    S->>S: monta detalhe pelo TaskSnapshot em snapshotJson
    S-->>C: 200 {removedByAuthor true, snapshot, phase, sortOrder, deps}
    C-->>NX: 200
    NX-->>U: card "removida pelo autor": título, tipo, categoria, thumbnail, resumo, autor, sem ações
  else tarefa existe
    S->>DB: tasks T9 + task_attachments + task_versions + seal_bonds
    S->>S: canViewTask(viewer, T9) por visibility
    alt T9 PRIVADA de outra pessoa ou DEPARTAMENTO sem ser membro (CA03)
      S-->>C: 403 ACESSO_NEGADO
      C-->>NX: 403
      NX-->>U: card "tarefa privada" só com fase e ordem
    else visível (CA01)
      S->>S3: MediaStoragePort.presign(mediaObjectId) para cada anexo
      S3-->>S: URLs temporárias
      S->>CS: trace_by_entity WHERE entity = task T9
      CS-->>S: nós do fio de decisão
      S->>R: INCR views:task:T9 (CA05)
      S-->>C: 200 ProjectTaskDetail {task, anexos, versões, chancelas, fio, contexto: phase, sortOrder, dueAt, responsibleId, predecessoras, sucessoras, actions}
      C-->>NX: 200
      NX-->>U: folha de detalhe com contexto do projeto e ação principal conforme o viewer
    end
  end

  U->>NX: Levar ao meu acervo (CA04)
  NX->>C: POST /api/projects/77/tasks/PT9/extract
  C->>S: AcervoService.extractToAcervo(userId, 77, PT9)
  S->>S: canExtract = projeto visível AND T9.visibility != PRIVADA AND owner != eu
  alt não permitido
    S-->>C: 403 ACESSO_NEGADO
    C-->>NX: 403
  else permitido
    S->>DB: INSERT tasks (sourceKind EXTRAIDA_DE_PROJETO, originalTaskId T9, sourceProjectId 77, state DISPONIVEL, visibility PRIVADA)
    S->>DB: INSERT task_attachments (mesmo mediaObjectId, referência)
    S->>DB: UPDATE tasks SET reuseCount = reuseCount + 1 WHERE id = T9
    S->>DE: publish TaskExtracted {copyId, originalId T9, actorId, projectId 77}
    S-->>C: 201 TaskItem cópia
    C-->>NX: 201
    NX-->>U: toast "tarefa copiada", link para o Acervo Digital
  end
  DE->>CS: INSERT notifications_by_user (recipient dono de T9, category SOCIAL, groupKey hora)

  U->>NX: fecha a folha
  NX-->>U: volta a /projects/77 na fase ELABORACAO, mesma rolagem (CA06)
```

## 4. Máquina de estados

O RF7 **não tem estados próprios**: ele lê `TaskItem.state` (`TaskState`, RF41) e o marcador derivado do `ProjectTask` (vinculada × removida pelo autor, RF23.CA03). A única escrita de estado é a da **cópia** criada por "Levar ao meu acervo", que nasce `DISPONIVEL`. O diagrama mostra o item da lista do projeto como entidade afetada e, aninhado, o que o detalhe exibe.

```mermaid
stateDiagram-v2
  state "Item da lista do projeto (ProjectTask)" as PT {
    [*] --> Vinculada : ProjectTask criada no RF5, taskId preenchido
    Vinculada --> Aberta : clique no item, GET tasks/ptId, viewsCount + 1
    Aberta --> Vinculada : fechar a folha, volta à mesma fase
    Vinculada --> RemovidaPeloAutor : dono exclui a tarefa, snapshotJson gravado, taskId nulo
    RemovidaPeloAutor --> AbertaSnapshot : clique no item, detalhe pelo TaskSnapshot
    AbertaSnapshot --> RemovidaPeloAutor : fechar
    Vinculada --> Privada : visibility incompatível com o viewer, 403 ACESSO_NEGADO
  }
  state "Detalhe aberto — TaskItem.state exibido em texto (RF41)" as Detalhe {
    [*] --> Leitura
    Leitura --> Leitura : anexos presign, versões, chancelas, fio, dependências
  }
  state "Cópia — Levar ao meu acervo" as Copia {
    [*] --> DISPONIVEL : sourceKind EXTRAIDA_DE_PROJETO, visibility PRIVADA, originalTaskId
    DISPONIVEL --> EM_USO : usada em um projeto meu
  }
  Aberta --> Detalhe
  Aberta --> Copia : Levar ao meu acervo, não PRIVADA e não sou dono
  note right of PT
    Vinculada, RemovidaPeloAutor e Privada são derivados:
    taskId nulo + removedByAuthor (CA02) e canViewTask (CA03).
    Nenhuma transição de TaskState acontece ao abrir (CA01, CA05).
  end note
  note right of Copia
    reuseCount + 1 na original e notificação ao dono (CA04).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/projects/[id] — lista por fase (quadro, linha do tempo, lista)"]
    F2["app/projects/[id]/tasks/[ptId] — folha de detalhe, URL profunda, folha lateral no desktop e tela cheia no celular"]
    F3["components/ui: ProjectTaskList, TaskDetailSheet, ProjectContextPanel fase ordem prazo responsável dependências, AttachmentPreview, VersionList, SealBadges, DecisionThreadPanel, RemovedByAuthorCard snapshot, PrivateTaskCard, PrimaryAction Editar ou Levar ao meu acervo, Skeleton"]
    F4["i18n next-intl pt-BR / en / es · layout responsivo"]
  end

  subgraph WEB["ws-web"]
    C1["ProjectController — GET /api/projects/{id}, GET /api/projects/{id}/tasks/{ptId}, POST .../extract"]
    C2["TaskController — GET /api/tasks/{id}"]
  end

  subgraph APP["ws-application"]
    S1["ProjectService"]
    S2["AcervoService RF41/RF23"]
    S3["DecisionTraceService RF29"]
    P1["MediaStoragePort"]
    P2["CounterCachePort"]
  end

  subgraph DOM["ws-domain"]
    D1["ProjectScheme · ProjectTask · ProjectTaskDependency · TaskSnapshot"]
    D2["TaskItem · TaskAttachment · TaskVersion · SealBond · Visibility · TaskState"]
    D3["User · MediaObject · DecisionTraceNode · Notification · DomainEventOutbox"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: project_schemes, project_tasks, project_task_dependencies, tasks, task_attachments, task_versions, seal_bonds")]
    I2[("storage-s3: presign dos anexos")]
    I3[("persistence-cassandra: trace_by_entity, notifications_by_user")]
    I4[("cache-redis: viewsCount")]
    I5["platform: outbox AFTER_COMMIT"]
  end

  F1 --- F3
  F2 --- F3
  F2 --- F4
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C1
  F3 -->|"HTTPS/JSON"| C2
  C1 --> S1
  C1 --> S2
  C2 --> S2
  S1 --> S2
  S1 --> S3
  S2 --> P1
  S2 --> P2
  S1 --> D1
  S2 --> D2
  S2 --> D3
  S3 --> D3
  D1 --> I1
  D2 --> I1
  D3 --> I5
  P1 --> I2
  P2 --> I4
  S3 --> I3
  I5 --> I3
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF7.CA01 (a confirmar) | Classes `ProjectTask` (phase, sortOrder, dueAt, responsibleId), `ProjectTaskDependency`, `TaskItem`, `TaskAttachment`, `TaskVersion`, `SealBond`, `DecisionTraceNode`, `ProjectService.taskDetailInProject/dependenciesOf`, `AcervoService.detail`, `MediaStoragePort.presign` · Atividades `U1 → A1 → W1 → U2 → W2 → A4 → A9 (sim) → A11 → P2/P3/P4 → W3` · Sequência msgs 1–5 e `else visível (CA01)` · Transição `Vinculada → Aberta → Detalhe` · Componentes `TaskDetailSheet`, `ProjectContextPanel`, `AttachmentPreview`, `VersionList`, `SealBadges`, `DecisionThreadPanel`, `storage-s3`, `persistence-cassandra` |
| RF7.CA02 (a confirmar) | Classes `ProjectTask.taskId nullable/snapshotJson/removedByAuthor`, `TaskSnapshot` · Atividades `A7 (sim) → A8 → W4` · Sequência `else PT9.taskId nulo (CA02)` · Transição `RemovidaPeloAutor → AbertaSnapshot` e nota · Componente `RemovedByAuthorCard snapshot` |
| RF7.CA03 (a confirmar) | `ProjectService.canView`, `AcervoService.canViewTask`, enum `Visibility` · Atividades `A2 (não) → A3 403`, `A5 (não) → A6 404 TAREFA_NAO_ENCONTRADA`, `A9 (não) → A10 403 → W5` · Sequência `alt projeto invisível ou PT9 não pertence` e `alt T9 PRIVADA … → 403` · Estado `Privada` · Componente `PrivateTaskCard` |
| RF7.CA04 (a confirmar) | Classes `TaskItem.sourceKind EXTRAIDA_DE_PROJETO/originalTaskId/sourceProjectId/reuseCount`, `TaskAttachment.mediaObjectId` (referência), `Notification`, `AcervoService.canExtract/extractToAcervo`, `ProjectController POST …/extract` · Atividades `U3 → A14 → P6 → W8` · Sequência `POST /api/projects/77/tasks/PT9/extract` com `alt não permitido → 403` / `else permitido` → INSERT tasks, task_attachments, reuseCount + 1, TaskExtracted → notifications_by_user · Estado composto `Copia` e nota · Componentes `PrimaryAction Levar ao meu acervo`, `outbox AFTER_COMMIT` |
| RF7.CA05 (a confirmar) | `AcervoService.incrementViews`, `CounterCachePort`, `RedisCounterAdapter`, `TaskItem.viewsCount` · Atividades `A12 → P5`, `A13 → W6 → U4/U3` · Sequência `INCR views:task:T9` e "ação principal conforme o viewer" · Transição `Vinculada → Aberta : viewsCount + 1` · Componentes `PrimaryAction Editar ou Levar ao meu acervo`, `cache-redis` |
| RF7.CA06 (a confirmar) | Atividades `W2` (skeleton + URL profunda), `U5 → W7` (mesma fase e rolagem) · Sequência msg 2 (URL profunda, skeleton) e msgs finais (fecha a folha → volta à fase) · Transição `Aberta → Vinculada : fechar a folha` · Componentes `app/projects/[id]/tasks/[ptId]`, `Skeleton`, `F4` (i18n, responsivo) |
