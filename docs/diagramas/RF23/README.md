# RF23 — Importar tarefas ou projetos de outros provedores para dentro de meu perfil do Work Station
**HU:** HU23 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4; candidato à Sprint 5) · **Equivalente FAI:** RF7 Peça a partir do esquema (corpo do card) + RF4 Adicionar peça — fontes externas (título) · **Aba/rota:** Criar Tarefa (`/tasks/new`, abas Google Workspace · Microsoft 365 · E-mail · Protocolo) para **importar**; ação "Levar ao meu acervo" no card de tarefa em `/projects/[id]` para **extrair**; destino Acervo de Tarefas (`/acervo`, RF41)
**Critérios de aceite cobertos:** RF23.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card — extrair tarefa de projeto + snapshot) · RF20.CA07 · RF20.CA08 · RF20.CA09 (importar de Google/Microsoft, e-mail e e-Protocolo — CAs escritos no card RF20, citados como estão) · RF23.CA06 (CA a confirmar — importar **projeto** de provedor) — regra: o **título do card** define o RF; o corpo contém os CAs RF23.CA01–05 de extração (= antigo RF23, ver `_anterior/RF23`); as fontes externas do título vêm do antigo RF20 etapa 1 (`_anterior/RF20`)

O título fala de **importar tarefas ou projetos de outros provedores**; o corpo descreve **extrair** uma tarefa de um Esquema de Projeto para o meu Acervo. Este README modela os dois caminhos, que convergem na mesma entidade `TaskItem` do meu Acervo:

| Caminho | Fonte | `SourceKind` | `linkMode` | Porta / adaptador | CAs |
|---|---|---|---|---|---|
| **Importar** — Google Workspace (Drive, Gmail, Agenda) | arquivo/mensagem externa escolhida via OAuth | GOOGLE | VINCULADO (assina mudanças → `TaskVersion`) ou COPIADO (snapshot em S3) | `ExternalDocPort` → `GoogleDriveAdapter` | RF20.CA07 |
| **Importar** — Microsoft 365 (OneDrive/SharePoint, Outlook, Teams) | idem | MICROSOFT | VINCULADO ou COPIADO | `ExternalDocPort` → `MicrosoftGraphAdapter` | RF20.CA07 |
| **Importar** — e-mail encaminhado ou .eml/.msg | mensagem | EMAIL | COPIADO | `EmailInboundAdapter` | RF20.CA08 |
| **Importar** — e-Protocolo / SEI | nº de processo | PROTOCOLO | VINCULADO (link ao sistema de origem) | `ProtocolPort` → `EProtocoloAdapter` | RF20.CA09 |
| **Importar projeto** — pasta do Drive/SharePoint ou plano do Planner/Tasks | pasta/plano | PASTA → N tarefas + `ProjectScheme` RASCUNHO | COPIADO | `ExternalDocPort` | RF23.CA06 (a confirmar) |
| **Extrair** — "Levar ao meu acervo" em projeto de terceiro | `ProjectTask` visível | EXTRAIDA_DE_PROJETO | — (anexos por referência) | `AcervoService` | RF23.CA01–CA05 |

Regras comuns: a cópia nasce `DISPONIVEL` e `PRIVADA`, herda tipo, categoria e tags; `accessClass` RESTRITO/SIGILOSO nunca vai a IA externa; o item VINCULADO ganha `TaskVersion` a cada revisão externa (webhook) e, se o usuário revoga o OAuth, vira COPIADO com o último snapshot. Quando o dono exclui uma tarefa usada em projetos de outros, cada `ProjectTask` guarda `TaskSnapshot` em `snapshotJson` e mostra "removida pelo autor" sem quebrar fases nem dependências.

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_acervo {
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
    +format: String gdoc gsheet docx msg url
    +sourceKind: SourceKind
    +sourceRef: String id Drive OneDrive messageId protocolo
    +linkMode: LinkMode
    +senderOrigin: String
    +protocolNumber: String
    +state: TaskState
    +visibility: Visibility
    +thumbnailUrl: String
    +tags: Set~String~
    +originalTaskId: UUID crédito
    +sourceProjectId: UUID
    +reuseCount: int
    +projectUsageCount: int
    +version: long
    .. +30 campos ..
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
  class TaskVersion {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +versionNumber: int
    +externalRevisionId: String
    +syncedAt: Instant
    +thumbnailUrl: String
    +changeSummary: String
    +snapshotMediaId: UUID
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

namespace ws_domain_projetos {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +title: String
    +origin: SchemeOrigin
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
    +type: String FS SS FF SF
  }
}

namespace ws_domain_plataforma_social {
  class MediaObject {
    <<entity>>
    +id: UUID
    +bucket: String
    +key: String
    +sha256: String
    +accessClass: AccessClassification
  }
  class PipelineJob {
    <<entity>>
    +type: String SYNC_EXTERNO THUMBNAIL OCR
    +targetType: String TASK
    +targetId: UUID
    +status: String
  }
  class User {
    <<entity>>
    +id: UUID
    +displayName: String
    +companyId: UUID
  }
  class Notification {
    <<entity>>
    +recipientId: UUID
    +actorId: UUID
    +type: NotificationType REMIX
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
    +eventType: String TaskImported TaskExtracted TaskDeletedWithSnapshot
    +payloadJson: JSON
  }
}

namespace ws_domain_enums {
  class SourceKind {
    <<enum>>
    GOOGLE
    MICROSOFT
    EMAIL
    PROTOCOLO
    EXTRAIDA_DE_PROJETO
    ARQUIVO
    COLAR
    LINK
    FOTO
    TEXTO_IA
    REMIX
    DECIA
    AUTOPILOT
    ATA_VIVA
    DOSSIE
    EXTRACAO
  }
  class LinkMode {
    <<enum>>
    VINCULADO
    COPIADO
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

namespace ws_application {
  class TaskCreatorService {
    <<service>>
    +createFromExternal(userId, provider, ref, linkMode) TaskItem
    +createFromEmail(userId, MailMessage, attachmentsMode) TaskItem
    +createFromProtocol(userId, protocolNumber) TaskItem
    +importFolderAsProject(userId, provider, folderRef) ProjectScheme CA06 a confirmar
  }
  class AcervoService {
    <<service>>
    +extractToAcervo(userId, projectId, projectTaskId) TaskItem
    +canExtract(viewer, project, task) boolean visibilidade não PRIVADA e projeto visível
    +deleteTask(ownerId, taskId) DeleteResult
    +syncLinkedVersion(taskId, externalRevision) TaskVersion
    +convertLinkToSnapshot(taskId) TaskVersion
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
  class ExternalDocPort {
    <<port>>
    +pick(provider, oauthToken) ExternalDoc
    +fetch(provider, ref, mode) ExternalDoc
    +listFolder(provider, folderRef) List~ExternalDoc~
    +subscribeChanges(provider, ref) Subscription
    +revoke(provider, ref)
  }
  class ProtocolPort {
    <<port>>
    +lookup(protocolNumber) ProtocolMetadata
  }
  class MediaStoragePort {
    <<port>>
    +put(stream, mimeType, accessClass) MediaObject
    +presign(mediaId) URL
  }
  class SearchIndexPort {
    <<port>>
    +indexTask(TaskItem)
    +removeTask(taskId)
  }
}

namespace ws_web {
  class TaskController {
    <<controller>>
    +POST_api_tasks_sources(provider, ref, linkMode)
    +POST_api_tasks_import_project(provider, folderRef)
    +DELETE_api_tasks_id()
  }
  class ProjectController {
    <<controller>>
    +POST_api_projects_id_tasks_ptId_extract()
    +GET_api_projects_id()
  }
  class ExternalDocWebhookController {
    <<controller>>
    +POST_api_webhooks_google_drive()
    +POST_api_webhooks_microsoft_graph()
  }
  class EmailInboundController {
    <<controller>>
    +POST_api_inbound_email(MailMessage)
  }
}

namespace ws_infrastructure {
  class GoogleDriveAdapter {
    <<adapter>>
  }
  class MicrosoftGraphAdapter {
    <<adapter>>
  }
  class EProtocoloAdapter {
    <<adapter>>
  }
  class EmailInboundAdapter {
    <<adapter>>
  }
  class S3StorageAdapter {
    <<adapter>>
  }
  class OpenSearchIndexAdapter {
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
TaskItem "1" --> "*" TaskVersion : só se VINCULADO
TaskItem "1" --> "*" TaskStateLog
TaskItem "*" --> "1" User : ownerId
TaskAttachment "*" --> "1" MediaObject : referência compartilhada
TaskVersion "*" --> "0..1" MediaObject : snapshotMediaId
PipelineJob "*" --> "1" TaskItem : SYNC_EXTERNO
Notification "*" --> "1" User : recipientId dono original
DeliberativeProfile "*" --> "1" User : userId
TaskItem --> SourceKind
TaskItem --> LinkMode
TaskItem --> TaskState
TaskItem --> Visibility

TaskController ..> TaskCreatorService : importar
TaskController ..> AcervoService : delete
ProjectController ..> AcervoService : extract
ExternalDocWebhookController ..> AcervoService : syncLinkedVersion
EmailInboundController ..> TaskCreatorService : createFromEmail
TaskCreatorService ..> ExternalDocPort
TaskCreatorService ..> ProtocolPort
TaskCreatorService ..> MediaStoragePort
TaskCreatorService ..> AcervoService : addToAcervo
AcervoService ..> ProjectComposerService : snapshot antes de excluir
AcervoService ..> ExternalDocPort : revoke e fetch
AcervoService ..> SearchIndexPort
AcervoService ..> MediaStoragePort
AcervoService ..> DomainEventOutbox : TaskImported TaskExtracted
DomainEventOutbox ..> SocialService : AFTER_COMMIT
DomainEventOutbox ..> ReputationService : AFTER_COMMIT
GoogleDriveAdapter ..|> ExternalDocPort
MicrosoftGraphAdapter ..|> ExternalDocPort
EProtocoloAdapter ..|> ProtocolPort
EmailInboundAdapter ..> EmailInboundController : entrega MailMessage
S3StorageAdapter ..|> MediaStoragePort
OpenSearchIndexAdapter ..|> SearchIndexPort

note for TaskItem "importada: sourceKind GOOGLE MICROSOFT EMAIL PROTOCOLO, sourceRef, linkMode (RF20.CA07–09) · extraída: sourceKind EXTRAIDA_DE_PROJETO, originalTaskId, sourceProjectId, state DISPONIVEL, visibility PRIVADA (CA01, CA02) · original: reuseCount + 1 (CA04)"
note for TaskVersion "tabela task_versions · 1 linha por revisão externa do item VINCULADO · revogar OAuth converte em COPIADO com último snapshot (RF20.CA07)"
note for TaskAttachment "cópia extraída aponta para o mesmo mediaObjectId — referência, não duplicação de arquivo (CA02)"
note for ProjectTask "exclusão pelo dono: snapshotJson preenchido, taskId nulo, removedByAuthor true — fases e dependências intactas (CA03)"
note for AcervoService "canExtract falso para visibility PRIVADA: ação oculta na tela e 403 na API (CA05)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Abre /tasks/new e escolhe Google Workspace, Microsoft 365, E-mail ou Protocolo"]
    U2["Escolhe o item no seletor OAuth e o modo VINCULADO ou COPIADO"]
    U3["Abre um projeto visível para mim e clica Levar ao meu acervo"]
    U4["Dono exclui uma tarefa sua"]
    U5["Revoga o acesso OAuth ao provedor"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["DrivePicker / OneDrivePicker / EmailDrop / ProtocolInput"]
    W2["Formulário pré-preenchido pela IA, tudo editável"]
    W3{"Tarefa é PRIVADA?"}
    W4["Ação oculta no card"]
    W5["Toast: tarefa no meu Acervo com crédito ao autor e link ao projeto"]
    W6["Card exibe removida pelo autor com snapshot: título, tipo, categoria, thumbnail, resumo"]
    W7["Card VINCULADO mostra versão N e data da última sincronização"]
  end

  subgraph LA["ws-application"]
    A1["TaskCreatorService.createFromExternal / createFromEmail / createFromProtocol"]
    A2{"OAuth válido e item acessível?"}
    A3["403 ACESSO_NEGADO ou 422 PROVEDOR_INDISPONIVEL"]
    A4{"linkMode?"}
    A5["VINCULADO: ExternalDocPort.subscribeChanges, sourceRef = id externo, PipelineJob SYNC_EXTERNO"]
    A6["COPIADO: ExternalDocPort.fetch → MediaStoragePort.put snapshot → TaskAttachment"]
    A7{"accessClass sugerida RESTRITO ou SIGILOSO?"}
    A8["Detecção por IA com campos mascarados ou motor local (RF20.CA02)"]
    A9["Persiste TaskItem sourceKind GOOGLE/MICROSOFT/EMAIL/PROTOCOLO, state DISPONIVEL"]
    A10["Webhook de mudança → AcervoService.syncLinkedVersion → TaskVersion versionNumber + 1"]
    A11["AcervoService.convertLinkToSnapshot → linkMode COPIADO, último snapshot preservado"]
    A12["AcervoService.canExtract"]
    A13{"Projeto visível e tarefa não PRIVADA?"}
    A14["403 ACESSO_NEGADO"]
    A15["Cria cópia TaskItem: sourceKind EXTRAIDA_DE_PROJETO, originalTaskId, sourceProjectId, ownerId = eu, state DISPONIVEL, visibility PRIVADA"]
    A16["Herda type, category, subcategory, tags · TaskAttachment por referência ao mesmo MediaObject"]
    A17["UPDATE original reuseCount + 1"]
    A18["AFTER_COMMIT TaskExtracted → SocialService.notifyReuse · ReputationService.onTaskReused"]
    A19["AcervoService.deleteTask"]
    A20{"Tarefa usada em ProjectTasks de outras pessoas?"}
    A21["ProjectComposerService.snapshotProjectTasks: snapshotJson = TaskSnapshot, taskId = null, removedByAuthor = true"]
    A22["Exclui TaskItem, mantém MediaObjects referenciados por cópias · SearchIndexPort.removeTask"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["PREENCHER_TAREFA: tipo, categoria, título, resumo, prazo, sigilo sugerido + confiança por campo"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: tasks, task_attachments, task_versions, pipeline_jobs")]
    P2[("S3: snapshot do item COPIADO")]
    P3[("MySQL: tasks cópia + task_attachments ref · tasks original reuseCount")]
    P4[("OpenSearch: índice de tarefas")]
    P5[("MySQL: project_tasks snapshotJson, removedByAuthor")]
    P6[("Cassandra: notifications_by_user · MySQL: deliberative_profiles")]
  end

  U1 --> W1 --> U2 --> A1 --> A2
  A2 -->|"não"| A3
  A2 -->|"sim"| A4
  A4 -->|"VINCULADO"| A5 --> A7
  A4 -->|"COPIADO"| A6 --> P2
  A6 --> A7
  A7 -->|"sim"| A8 --> I1
  A7 -->|"não"| I1
  I1 --> W2 --> A9 --> P1
  A9 --> P4
  A10 --> P1
  A10 --> W7
  U5 --> A11 --> P1
  U3 --> W3
  W3 -->|"sim"| W4
  W3 -->|"não"| A12 --> A13
  A13 -->|"não"| A14
  A13 -->|"sim"| A15 --> A16 --> P3
  A16 --> A17 --> P3
  A17 --> A18
  A18 --> P4
  A18 --> P6
  A18 --> W5
  U4 --> A19 --> A20
  A20 -->|"sim"| A21 --> P5 --> A22
  A20 -->|"não"| A22
  A22 --> P4
  A21 --> W6

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A3,A14 err
  class W4,W6,A11 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (eu)
  actor O as Dono original
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant S3 as S3
  participant OS as OpenSearch
  participant CS as Cassandra
  participant DE as DomainEvents (AFTER_COMMIT)

  Note over U,DE: Importar de provedor externo (RF20.CA07) — Google Drive, modo VINCULADO
  U->>NX: aba Google Workspace, escolhe planilha no DrivePicker, modo VINCULADO
  NX->>C: POST /api/tasks/sources {provider GOOGLE, ref fileId, linkMode VINCULADO}
  C->>S: TaskCreatorService.createFromExternal(userId, GOOGLE, fileId, VINCULADO)
  S->>S: ExternalDocPort.fetch(GOOGLE, fileId, VINCULADO) com OAuth do usuário
  alt OAuth expirado ou item sem permissão
    S-->>C: 403 ACESSO_NEGADO {provider GOOGLE, reauthUrl}
    C-->>NX: 403
    NX-->>U: pede reconexão ao provedor
  else item acessível
    S->>S: ExternalDocPort.subscribeChanges(GOOGLE, fileId)
    S->>AI: infer(PREENCHER_TAREFA, {título, texto extraído, mimetype}) com campos sensíveis mascarados
    AI-->>S: type PLANILHA, category PLANILHA_ORCAMENTARIA, resumo, confiança por campo
    S->>DB: INSERT tasks (sourceKind GOOGLE, sourceRef fileId, linkMode VINCULADO, format gsheet, state DISPONIVEL)
    S->>DB: INSERT task_versions (versionNumber 1, externalRevisionId, syncedAt) · INSERT pipeline_jobs SYNC_EXTERNO
    S->>DE: publish TaskImported {taskId, provider GOOGLE}
    S-->>C: 201 TaskItem
    C-->>NX: 201
    NX-->>U: card no Acervo com selo Vinculado ao Google Drive
  end
  DE->>OS: indexTask(tarefa importada)
  Note over C,DB: Webhook Drive → ExternalDocWebhookController → AcervoService.syncLinkedVersion → INSERT task_versions (versionNumber 2, changeSummary, thumbnailUrl). Revogar OAuth → convertLinkToSnapshot → linkMode COPIADO, snapshotMediaId em S3.

  Note over U,DE: Extrair tarefa de projeto de terceiro (RF23.CA01, CA02, CA04, CA05)
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
  DE->>CS: INSERT notifications_by_user (recipient dono original, type REMIX, groupKey hora)
  DE->>DB: UPDATE deliberative_profiles SET reuse (métrica de reutilização, objetivo 2) (CA04)
  O->>NX: vê no card e no perfil deliberativo reutilizada N vezes

  Note over O,DE: Exclusão pelo dono preserva snapshot (RF23.CA03)
  O->>NX: exclui a tarefa T9 (usada no projeto 77 de outra pessoa)
  NX->>C: DELETE /api/tasks/T9
  C->>S: AcervoService.deleteTask(ownerId, T9)
  S->>DB: SELECT project_tasks WHERE taskId = T9 AND project.ownerId != O
  alt usada em projetos de terceiros (CA03)
    S->>DB: UPDATE project_tasks SET snapshotJson = {title, type, category, thumbnailUrl, summary, ownerName, capturedAt}, taskId = NULL, removedByAuthor = true
    Note over S,DB: fases, sortOrder e project_task_dependencies permanecem intactos
  end
  S->>DB: DELETE tasks WHERE id = T9 (MediaObjects referenciados por cópias são preservados)
  S->>S3: nada é apagado enquanto houver TaskAttachment apontando para o MediaObject
  S->>DE: publish TaskDeletedWithSnapshot
  S-->>C: 204
  DE->>OS: removeTask(T9)
  U->>NX: reabre /projects/77
  NX->>C: GET /api/projects/77
  C->>S: ProjectComposerService.renderRemovedByAuthor
  S-->>C: ProjectTask PT9 com snapshot e removedByAuthor true
  NX-->>U: card removida pelo autor na fase original, dependências preservadas
```

## 4. Máquina de estados

Entidade central: **`TaskItem.state`** (enum `TaskState`). Tanto a tarefa **importada** de provedor quanto a **cópia extraída** nascem diretamente em `DISPONIVEL`. Dois estados derivados completam o RF: `TaskItem.linkMode` (VINCULADO → COPIADO ao revogar OAuth, RF20.CA07) e o marcador `ProjectTask.removedByAuthor` (CA03).

```mermaid
stateDiagram-v2
  state "Tarefa importada — sourceKind GOOGLE MICROSOFT EMAIL PROTOCOLO" as Importada {
    [*] --> DISPONIVEL_IMP : importar de provedor, formulário confirmado
    state "DISPONIVEL" as DISPONIVEL_IMP
    state "VINCULADO" as VINC
    state "COPIADO" as COP
    DISPONIVEL_IMP --> VINC : linkMode VINCULADO, subscribeChanges
    DISPONIVEL_IMP --> COP : linkMode COPIADO, snapshot em S3
    VINC --> VINC : webhook de mudança, TaskVersion + 1
    VINC --> COP : OAuth revogado, convertLinkToSnapshot
    COP --> [*]
  }
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
  note right of Importada
    RF20.CA07–09. OAuth inválido 403 ACESSO_NEGADO.
    RESTRITO/SIGILOSO nunca vai a IA externa.
  end note
  note right of Copia
    PRIVADA não pode ser extraída 403 ACESSO_NEGADO (CA05).
    Herda tipo, categoria, tags e anexos por referência (CA02).
  end note
  note right of PT
    Projeto exibe removida pelo autor com título, tipo,
    categoria, thumbnail e resumo do TaskSnapshot (CA03).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/tasks/new — abas Google Workspace, Microsoft 365, E-mail, Protocolo"]
    F2["app/projects/[id] — TaskCard com ação Levar ao meu acervo"]
    F3["app/acervo — Acervo RF41, card com selo Vinculado/Copiado, crédito ao autor e link ao projeto"]
    F4["components/ui: DrivePicker, OneDrivePicker, EmailDrop, ProtocolInput, LinkModeToggle, VersionBadge, RemovedByAuthorCard, ReuseCounter, CreditBadge"]
  end

  subgraph WEB["ws-web"]
    C1["TaskController — POST /api/tasks/sources, POST /api/tasks/import-project, DELETE /api/tasks/{id}"]
    C2["ProjectController — POST /api/projects/{id}/tasks/{ptId}/extract, GET /api/projects/{id}"]
    C3["ExternalDocWebhookController — /api/webhooks/google-drive, /microsoft-graph"]
    C4["EmailInboundController — /api/inbound/email"]
  end

  subgraph APP["ws-application"]
    S1["TaskCreatorService RF20"]
    S2["AcervoService RF41"]
    S3["ProjectComposerService RF21"]
    S4["SocialService RF26"]
    S5["ReputationService RF43"]
    S6["AiEngine PREENCHER_TAREFA"]
    P1["ExternalDocPort"]
    P2["ProtocolPort"]
    P3["MediaStoragePort"]
    P4["SearchIndexPort"]
  end

  subgraph DOM["ws-domain"]
    D1["TaskItem · TaskAttachment · TaskVersion · TaskStateLog · TaskSnapshot"]
    D2["ProjectScheme · ProjectTask · ProjectTaskDependency"]
    D3["MediaObject · PipelineJob · Notification · DeliberativeProfile · DomainEventOutbox"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: tasks, task_attachments, task_versions, task_state_log, project_tasks, pipeline_jobs, deliberative_profiles, domain_events")]
    I2[("storage-s3: snapshots COPIADO, MediaObjects compartilhados por referência")]
    I3[("search-opensearch: índice de tarefas")]
    I4[("persistence-cassandra: notifications_by_user")]
    I5["platform: GoogleDriveAdapter, MicrosoftGraphAdapter, EProtocoloAdapter, EmailInboundAdapter, PipelineJob SYNC_EXTERNO, outbox AFTER_COMMIT"]
    I6["ai-providers: ClaudeGeminiAdapter + motor local"]
  end

  subgraph EXT["Serviços externos"]
    E1(("Google Workspace: Drive, Gmail, Agenda"))
    E2(("Microsoft 365: OneDrive, SharePoint, Outlook, Teams"))
    E3(("e-Protocolo / SEI"))
    E4(("Servidor de e-mail tarefas+usuario@workstation"))
    E5(("Claude / Gemini"))
  end

  F1 --- F4
  F2 --- F4
  F3 --- F4
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C2
  F3 -->|"HTTPS/JSON"| C1
  C1 --> S1
  C1 --> S2
  C2 --> S2
  C3 --> S2
  C4 --> S1
  S1 --> S2
  S1 --> S6
  S1 --> P1
  S1 --> P2
  S1 --> P3
  S2 --> S3
  S2 --> P1
  S2 --> P3
  S2 --> P4
  S1 --> D1
  S2 --> D1
  S3 --> D2
  S2 --> D3
  D3 --> I5
  I5 --> S4
  I5 --> S5
  S4 --> I4
  S5 --> I1
  D1 --> I1
  D2 --> I1
  P1 --> I5
  P2 --> I5
  P3 --> I2
  P4 --> I3
  S6 --> I6
  I5 -.->|"OAuth do usuário + webhooks"| E1
  I5 -.->|"OAuth do usuário + webhooks"| E2
  I5 -.-> E3
  E4 -.-> C4
  I6 -.-> E5
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF23.CA01 | `TaskItem.sourceKind EXTRAIDA_DE_PROJETO / originalTaskId / sourceProjectId`, enum `SourceKind`, `AcervoService.extractToAcervo` · Atividades `U3 → W3 (não) → A12 → A15 → P3` · Sequência `POST /api/projects/77/tasks/PT9/extract` → `INSERT tasks (… EXTRAIDA_DE_PROJETO, originalTaskId T9, sourceProjectId 77 …)` · Transição `[*] → DISPONIVEL` da *Cópia* · Componentes `TaskCard`, `CreditBadge`, `ProjectController /extract` |
| RF23.CA02 | `TaskAttachment.mediaObjectId` (nota "referência, não duplicação"), `MediaObject`, `AcervoService.copyAttachmentsByReference`, enums `TaskState.DISPONIVEL`, `Visibility.PRIVADA` · Atividades `A16` · Sequência `INSERT task_attachments (mediaObjectId igual ao da original)` e `state DISPONIVEL, visibility PRIVADA, type, category, tags herdados` · Nota da *Cópia* · Componente `storage-s3 (compartilhados por referência)` |
| RF23.CA03 | `ProjectTask.snapshotJson / removedByAuthor / taskId nullable`, `TaskSnapshot`, `ProjectTaskDependency`, `ProjectComposerService.snapshotProjectTasks/renderRemovedByAuthor`, `AcervoService.deleteTask` · Atividades `U4 → A19 → A20 → A21 → P5 → A22 → W6` · Sequência bloco "Exclusão pelo dono" → `alt usada em projetos de terceiros` → `UPDATE project_tasks SET snapshotJson …, taskId = NULL, removedByAuthor = true` + nota "fases … intactos" → card removida pelo autor · Estados *Original → EXCLUIDA* e *ProjectTask → RemovidaPeloAutor* · Componente `RemovedByAuthorCard` |
| RF23.CA04 | `TaskItem.reuseCount`, `DeliberativeProfile.reuse`, `ReputationService.onTaskReused`, `Notification` · Atividades `A17 → P3`, `A18 → P6 → W5` · Sequência `UPDATE tasks SET reuseCount + 1`, `UPDATE deliberative_profiles SET reuse`, "reutilizada N vezes" · Transição `EM_USO_ORIG → EM_USO_ORIG : reuseCount + 1` · Componentes `ReuseCounter`, `ReputationService RF43` |
| RF23.CA05 | `AcervoService.canExtract` (nota PRIVADA → oculta + 403) · Atividades `W3 (sim) → W4` (ação oculta) e `A13 (não) → A14 403 ACESSO_NEGADO` · Sequência `alt tarefa PRIVADA ou projeto invisível → 403 ACESSO_NEGADO` · Nota da *Cópia* |
| RF20.CA07 (Google/Microsoft vinculado ou copiado) | Classes `TaskVersion`, `TaskItem.linkMode/sourceRef/format`, enum `LinkMode`, `ExternalDocPort.fetch/subscribeChanges/revoke`, `TaskCreatorService.createFromExternal`, `AcervoService.syncLinkedVersion/convertLinkToSnapshot`, `ExternalDocWebhookController`, `GoogleDriveAdapter`, `MicrosoftGraphAdapter`, `PipelineJob SYNC_EXTERNO` · Atividades `U1 → W1 → U2 → A1 → A2 → A4 → A5/A6`, `A10 → W7`, `U5 → A11` · Sequência bloco "Importar de provedor externo" (`POST /api/tasks/sources`, `alt OAuth expirado → 403 ACESSO_NEGADO`, `INSERT task_versions`, nota do webhook e da revogação) · Estados *Importada*: `VINC → VINC` (TaskVersion + 1), `VINC → COP` (OAuth revogado) · Componentes `DrivePicker`, `OneDrivePicker`, `LinkModeToggle`, `VersionBadge`, `C3`, `I5 → E1/E2` |
| RF20.CA08 (e-mail) | `TaskCreatorService.createFromEmail`, `EmailInboundController`, `EmailInboundAdapter`, enum `SourceKind.EMAIL`, `TaskItem.senderOrigin/sourceRef` · Atividades `U1 → W1 (EmailDrop) → A1` · Componentes `EmailDrop`, `C4`, `E4 → C4` |
| RF20.CA09 (protocolo) | `TaskCreatorService.createFromProtocol`, `ProtocolPort.lookup`, `EProtocoloAdapter`, `TaskItem.protocolNumber`, enum `SourceKind.PROTOCOLO` · Atividades `U1 → W1 (ProtocolInput) → A1` · Componentes `ProtocolInput`, `P2 → I5 → E3` |
| RF23.CA06 (a confirmar — importar **projeto** de provedor) | `TaskCreatorService.importFolderAsProject`, `ExternalDocPort.listFolder`, `TaskController POST /api/tasks/import-project`, `ProjectScheme` RASCUNHO com uma `ProjectTask` por arquivo da pasta (ou item do plano Planner/Google Tasks) · Sem passo próprio nos diagramas 2–4 até confirmação do CA |

> Dúvidas para `docs/DECISOES.md`: (1) o título cita **projetos** de outros provedores, mas nenhum CA do board descreve essa importação — RF23.CA06 acima é proposta (pasta Drive/SharePoint → PASTA explodida em tarefas + `ProjectScheme` RASCUNHO; Planner/Google Tasks → `ProjectTask` por item); (2) `NotificationType` não tem valor para "tarefa reutilizada" — usei `REMIX` (existente); alternativa é acrescentar `TAREFA_REUTILIZADA` à TAXONOMIA; (3) eventos `TaskImported`, `TaskExtracted`, `TaskDeletedWithSnapshot` e o erro `422 PROVEDOR_INDISPONIVEL` são propostas; (4) a importação de provedores continua sendo também parte do RF20 (Criador de Tarefas) — o RF23 reutiliza `TaskCreatorService` e não duplica o formulário.
