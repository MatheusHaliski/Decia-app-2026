# RF41 — Gerir o Acervo de Tarefas (inventário do usuário): estados, sub-filtros, ordenação, prazos legais, anexos & evidências e ações rápidas
**HU:** HU41 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4; o Acervo é entregue junto com RF4/RF6 na fase (d) da ARQUITETURA §6) · **Equivalente FAI:** Closet Digital (RF6) + RF31 Estados do acervo + RF12 Minhas Fotos + RF7 detalhe da peça · **Aba/rota:** Acervo de Tarefas (`/tasks?filtro=&categoria=&ordem=&page=`), detalhe (`/tasks/[id]`), Anexos & Evidências (`/attachments`), acervo de terceiros (`/u/[username]?tab=acervo`)
**Critérios de aceite cobertos:** RF41.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs. A criação de tarefas é o RF4 (corpo em RF20); o Acervo alimenta os selects do Criador de Projetos (RF5) e os anexos do DECIA (RF29).

Estados (`TaskState`): RASCUNHO · DISPONIVEL · EM_USO (em ≥ 1 projeto ativo, automático) · BLOQUEADA · CONCLUIDA · ARQUIVADA · MODELO_PUBLICO (só via chancela RF39 ou publicação explícita) · OFERECIDA (Balcão RF40); toda transição em `TaskStateLog` (`TaskStateMachine` com tabela testada). Sub-filtros: Todas · Favoritas · Disponíveis · Em uso · Bloqueadas · Concluídas · Modelos públicos · Chanceladas · Oferecidas (+ filtros categoria, tipo, processo, natureza, departamento, `accessClass`, prazo, origem; ordenação recentes, mais/menos usadas, nome, prazo, valor), tudo na querystring (CA09). Prazo legal (`legalDueAt`, `LegalDeadlineRule`): card âmbar a 3 dias, vermelho vencido, ⚖, notificação `PRAZO_PROXIMO/PRAZO_VENCIDO` (job diário) e sugestão na Tarefa do Dia (RF44). Evidências (`Evidence`: foto com `takenAt`, geolocalização opcional AES, vínculo a tarefa/projeto, `studioStatus`) podem virar IMAGEM_EDITADA pelo Estúdio (RF4). Exclusão: projetos de outros mantêm `ProjectTask.snapshotJson` (RF23) e donos são avisados; tarefa ligada a decisão VALIDADA (`FinalDecision.resultingTaskId` ou nó TAREFA do rastro) **não é excluída, só arquivada** (409). Acervo de terceiros: `VisibilityFilter` + `Guard` (403 no resto).

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
    +processTags: Set~ProcessTag~
    +natureTags: Set~NatureTag~
    +accessClass: AccessClassification
    +sourceKind: SourceKind
    +state: TaskState
    +blockedByTaskId: UUID
    +blockedByUserId: UUID
    +blockReason: String
    +dueAt: LocalDate
    +legalDeadlineRuleId: UUID
    +legalDueAt: LocalDate
    +amountInvolved: BigDecimal
    +visibility: Visibility
    +favorite: boolean
    +offeredInCounter: boolean
    +thumbnailUrl: String
    +reuseCount: int
    +projectUsageCount: int
    +sealIdsJson: JSON
    +version: long
    .. +30 campos ..
  }
  class TaskStateLog {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +fromState: TaskState
    +toState: TaskState
    +actorId: UUID
    +reason: String
    +projectId: UUID
    +correlationId: String
    +at: Instant
  }
  class TaskAttachment {
    <<entity>>
    +taskId: UUID
    +mediaObjectId: UUID
    +mimeType: String
    +antivirusStatus: String
    +isPrimary: boolean
  }
  class TaskVersion {
    <<entity>>
    +taskId: UUID
    +versionNumber: int
    +externalRevisionId: String
    +syncedAt: Instant
  }
  class LegalDeadlineRule {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +category: TaskCategory
    +days: int
    +businessDays: boolean
    +legalBasis: String
    +active: boolean
  }
  class Evidence {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +mediaObjectId: UUID
    +takenAt: Instant
    +latitude: BigDecimal
    +longitude: BigDecimal
    +caption: String
    +linkedTaskId: UUID
    +linkedProjectId: UUID
    +studioStatus: StudioStatus
    +derivedTaskId: UUID
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
  class StudioStatus {
    <<enum>>
    ORIGINAL
    ENDIREITADA
    RECORTADA
    SEM_FUNDO
    OCR
  }
}

namespace ws_domain_relacionados {
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +taskId: UUID
    +snapshotJson: JSON
    +removedByAuthor: boolean
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +status: ProjectStatus
  }
  class FinalDecision {
    <<entity>>
    +resultingTaskId: UUID
    +status: DecisionStatus
  }
  class DecisionTraceNode {
    <<entity>>
    +nodeType: TraceNodeType
    +refId: UUID
  }
  class SealBond {
    <<entity>>
    +targetId: UUID
    +status: SealBondStatus
  }
  class Notification {
    <<entity>>
    +recipientId: UUID
    +type: NotificationType
  }
}

namespace ws_application {
  class AcervoService {
    <<service>>
    +list(viewer, ownerId, AcervoQuery) Page~TaskCardView~
    +counters(viewer, ownerId) Map~SubFilter,int~
    +detail(viewer, taskId) TaskDetailView
    +quickAction(actor, taskId, action) TaskItem
    +delete(actor, taskId) DeleteResult
    +archive(actor, taskId, handover) TaskItem
  }
  class TaskStateMachine {
    <<service>>
    +transition(task, to, actor, reason, projectId)
    +onProjectActivated(projectId)
    +onProjectLeft(projectId, taskId)
  }
  class LegalDeadlineService {
    <<service>>
    +compute(task) LocalDate
    +scanDueSoon() void
  }
  class EvidenceService {
    <<service>>
    +upload(actor, media, meta) Evidence
    +link(actor, evidenceId, taskId, projectId)
    +toStudio(actor, evidenceId) TaskItem
  }
  class VisibilityFilter {
    <<service>>
    +allowedFor(viewer) Filter
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
    +requireSameCompany(actor, companyId)
  }
  class UploadGuard {
    <<service>>
    +checkMagicBytes(bytes)
    +checkPixelCeiling(w, h)
  }
  class OwnMedia {
    <<service>>
    +requireAccess(actor, MediaObject)
  }
  class SearchIndexPort {
    <<port>>
    +search(ws_tasks, query, filter, sort, page)
  }
  class CachePort {
    <<port>>
    +counters(ownerId)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class AcervoController {
    <<controller>>
    +GET_api_tasks(filtro, filtros, ordem, page)
    +GET_api_tasks_counters()
    +GET_api_tasks_id()
    +POST_api_tasks_id_actions(action)
    +DELETE_api_tasks_id()
    +GET_api_users_id_tasks(filtros, page)
  }
  class EvidenceController {
    <<controller>>
    +POST_api_evidences(file, meta)
    +POST_api_evidences_id_link(taskId, projectId)
    +POST_api_evidences_id_studio()
  }
}

TaskItem "1" o-- "0..*" TaskStateLog
TaskItem "1" o-- "0..*" TaskAttachment
TaskItem "1" o-- "0..*" TaskVersion
TaskItem "0..*" --> "0..1" LegalDeadlineRule
TaskItem "0..*" --> "0..1" TaskItem : blockedByTaskId
Evidence "0..*" --> "0..1" TaskItem : linkedTaskId
Evidence "0..1" --> "0..1" TaskItem : derivedTaskId IMAGEM_EDITADA
ProjectTask "0..*" --> "0..1" TaskItem : referencia ou snapshot
ProjectScheme "1" *-- "0..*" ProjectTask
FinalDecision ..> TaskItem : resultingTaskId nao exclui
DecisionTraceNode ..> TaskItem : TAREFA no rastro
SealBond ..> TaskItem : Chanceladas
AcervoController --> AcervoService
EvidenceController --> EvidenceService
AcervoService --> TaskStateMachine
AcervoService --> LegalDeadlineService
AcervoService --> VisibilityFilter
AcervoService --> Guard
AcervoService --> SearchIndexPort
AcervoService --> CachePort
AcervoService --> DomainEvents
TaskStateMachine ..> TaskStateLog : grava toda transicao
EvidenceService --> UploadGuard
EvidenceService --> OwnMedia
LegalDeadlineService ..> Notification : PRAZO_PROXIMO PRAZO_VENCIDO
DomainEvents ..> TaskStateMachine : ProjectActivated ProjectTaskRemoved
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPREGADO dono · visitante do perfil)"]
    A0([Abre /tasks]) --> A1["Vê grade de cards com contadores por sub-filtro"]
    A1 --> A2["Aplica sub-filtro, filtros e ordenação"]
    A3([Abre /tasks/id]) --> A4["Pré-visualização, metadados, versões, projetos em uso, fio de decisão, chancelas, interações, histórico"]
    A5([Ação rápida no card]) --> A6{"Qual?"}
    A6 -->|favoritar| A7
    A6 -->|duplicar| A7
    A6 -->|Levar ao projeto| A8["Select de fase do Criador (RF5)"]
    A6 -->|Compartilhar na sessão| A9["Anexo na sessão DECIA (RF29)"]
    A6 -->|Pedir chancela| A10["Indicação RF39"]
    A6 -->|Oferecer no Balcão| A11["RF40"]
    A6 -->|arquivar ou repassar| A12["Arquiva, opção repassar ao Balcão"]
    A7["Executa"]
    A13([Exclui tarefa usada por outros]) --> A14{"Confirma?"}
    A15([Envia fotos de vistoria]) --> A16["Data, geolocalização opcional, vínculo a tarefa/projeto"]
    A17([Abre acervo de outro usuário])
  end

  subgraph FE["Next.js / BFF (app/(shell)/tasks · tasks/[id] · attachments · u/[username])"]
    F1["Querystring guarda filtro, filtros, ordem e page · 20 por página · i18n"]
    F2["TaskCard layout compact (grade) com variants por TaskState, FAVORITA, PRAZO_LEGAL, CHANCELADA, NO_BALCAO · Skeleton · EmptyState ilustrado · ErrorState tentar de novo"]
    F3["Detalhe: layout expanded · preview por tipo · DecisionThread · Seal · Counters · histórico (TaskStateLog)"]
    F4["Ações rápidas (menu do card) · POST /api/tasks/{id}/actions"]
    F5["Due âmbar a 3 dias, vermelho vencido, ⚖ prazo legal"]
    F6["EvidenceUploader (EXIF data/GPS com consentimento) · POST /api/evidences"]
    F7["Dialog de exclusão: lista projetos de outros que usam a tarefa"]
  end

  subgraph WEB["ws-web"]
    W1["JWT · CorrelationIdFilter · rate limit por rota"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    P1["AcervoService.list: VisibilityFilter + Guard (próprio ou terceiro) + SearchIndexPort + contadores em cache"]
    P2{"Ator é dono?"}
    P2 -->|não| P3["Só visibilidade compatível · ação Levar ao meu acervo (RF23) se permitida · resto 403"]
    P4["TaskStateMachine.transition: RASCUNHO→DISPONIVEL→EM_USO⇄BLOQUEADA→CONCLUIDA→ARQUIVADA"]
    P4 --> P5{"Transição permitida?"}
    P5 -->|não| E1["409 TRANSICAO_INVALIDA"]
    P5 -->|sim| P6["TaskStateLog (from, to, actor, reason, projectId, correlationId)"]
    P7["AFTER_COMMIT ProjectActivated → EM_USO automático · ProjectTaskRemoved ou projeto encerrado → volta a DISPONIVEL"]
    P8{"MODELO_PUBLICO?"}
    P8 -->|só via chancela aprovada ou publicação explícita| P6
    P9["LegalDeadlineService.scanDueSoon (job diário): legalDueAt em 3 dias ou vencido → Notification PRAZO_PROXIMO/PRAZO_VENCIDO · sugere na Tarefa do Dia (RF44)"]
    P10{"Guard.requireOwner(tarefa)?"}
    P10 -->|não| E2["403 ACESSO_NEGADO"]
    P11{"Tarefa ligada a decisão VALIDADA?"}
    P11 -->|sim| E3["409 TAREFA_EM_DECISAO: só arquivar"]
    P11 -->|não| P12["Projetos de outros mantêm ProjectTask.snapshotJson (removedByAuthor) · Notification TAREFA_REUTILIZADA aos donos · delete"]
    P13["UploadGuard (magic bytes, teto de pixels) · reencode · geolocalização AES opcional · Evidence · OwnMedia"]
    P14["toStudio: Evidence → TaskItem IMAGEM_EDITADA (RF4) · derivedTaskId"]
    P15["archive: ARQUIVADA · oferece repassar ao Balcão (RF40.CA05)"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL tasks · task_state_log · task_attachments · task_versions · legal_deadline_rules · evidences · project_tasks")]
    D2[("OpenSearch ws-tasks · flag opensearch.enabled (fallback consulta MySQL)")]
    D3[("Redis contadores por sub-filtro · flag redis.enabled")]
    D4[("S3 anexos · evidências · thumbnails · flag storage.s3")]
    D5[("Cassandra notifications_by_user · flag cassandra.enabled")]
  end

  A0 --> F1 --> W1 --> P1 --> D2
  P1 --> D3
  P1 --> F2 --> A1
  A2 --> F1
  A3 --> F3 --> W1 --> P1 --> D1
  A5 --> A6
  A7 --> F4 --> W1 --> P10 -->|sim| P4
  A12 --> F4 --> W1 --> P10 --> P15 --> P4
  P6 --> D1
  P7 --> P4
  P9 --> D5
  P9 --> F5
  A13 --> F7 --> A14 -->|sim| W1 --> P10 --> P11
  P12 --> D1
  P12 --> D5
  A15 --> A16 --> F6 --> W1 --> P13 --> D4
  P13 --> D1
  P13 --> P14 --> D1
  A17 --> F1 --> P2
  P3 --> F2
  E1 --> W2
  E2 --> W2
  E3 --> W2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant R as Redis
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: abre /tasks?filtro=EM_USO&categoria=ETP&ordem=prazo&page=2
  FE->>C: GET /api/tasks?filtro=EM_USO&categoria=ETP&ordem=prazo&page=2
  C->>S: AcervoService.list(viewer, viewer.id, query)
  S->>S: VisibilityFilter + Guard (dono)
  alt opensearch.enabled
    S->>OS: search ws-tasks (filtros, ordenação, 20 por página)
  else fallback
    S->>DB: select tasks paginado
  end
  S->>R: contadores por sub-filtro (cache)
  S-->>FE: Page de TaskCardView + contadores
  FE->>FE: TaskCard compact com variants (EM_USO, PRAZO_LEGAL, CHANCELADA) · Due âmbar/vermelho/⚖
  alt erro de rede
    FE-->>U: ErrorState com tentar de novo
  end

  U->>FE: ação rápida Levar ao projeto
  FE->>C: POST /api/tasks/{id}/actions {LEVAR_AO_PROJETO, projectId, phase}
  C->>S: AcervoService.quickAction(actor, id, action)
  S->>S: Guard.requireOwner(actor, task.ownerId)
  S->>DB: insert project_tasks (fase)
  S->>EV: ProjectTaskAdded
  S-->>C: 201
  EV->>S: TaskStateMachine.onProjectActivated → DISPONIVEL → EM_USO
  S->>DB: update tasks.state EM_USO · insert task_state_log (projectId, correlationId)

  U->>FE: exclui tarefa usada no projeto de um colega
  FE->>C: DELETE /api/tasks/{id}
  C->>S: AcervoService.delete(actor, id)
  S->>DB: final_decisions.resulting_task_id / decision_trace_nodes TAREFA
  alt ligada a decisão VALIDADA
    S-->>C: 409 TAREFA_EM_DECISAO (só arquivar)
  else usada em projetos de outros
    S->>DB: project_tasks set task_id null, removedByAuthor true (snapshotJson preservado)
    S->>DB: delete tasks (anexos → S3 lifecycle)
    S->>EV: TaskDeleted → Notification TAREFA_REUTILIZADA aos donos dos projetos
    S-->>C: 204
  end

  U->>FE: envia foto de vistoria em /attachments
  FE->>C: POST /api/evidences (file, takenAt, lat/long opcional, taskId)
  C->>S: EvidenceService.upload(actor, media, meta)
  S->>S: UploadGuard magic bytes + teto de pixels · reencode sem EXIF (geo guardada AES só se consentido)
  S->>S3: put evidences/{id}.webp
  S->>DB: insert evidences (linkedTaskId, takenAt, studioStatus ORIGINAL)
  S-->>C: 201 Evidence

  Note over S,EV: job diário LegalDeadlineService.scanDueSoon
  EV->>S: scanDueSoon()
  S->>DB: tasks com legal_due_at em 3 dias ou vencidas
  S->>EV: Notification PRAZO_PROXIMO / PRAZO_VENCIDO ao responsável · candidata à Tarefa do Dia (RF44)

  U->>FE: abre acervo de outro usuário
  FE->>C: GET /api/users/{id}/tasks?page=1
  C->>S: AcervoService.list(viewer, ownerId, query)
  S->>S: VisibilityFilter (PUBLICA ou EMPRESA se mesma empresa)
  S-->>FE: cards visíveis com ação Levar ao meu acervo quando permitida
  FE->>C: POST /api/tasks/{idPrivada}/actions {FAVORITAR}
  C->>S: Guard.requireOwner
  S-->>C: 403 ACESSO_NEGADO
```

## 4. Máquina de estados

Entidade central: `TaskItem.state` (`TaskState`, `TaskStateMachine` com tabela de transições testada; toda transição em `TaskStateLog`).

```mermaid
stateDiagram-v2
  [*] --> RASCUNHO: criada (RF4) · Copilot/Autopilot/extração (RF26, RF34)
  RASCUNHO --> DISPONIVEL: dono conclui o cadastro
  DISPONIVEL --> EM_USO: entra em projeto ativo (automático, AFTER_COMMIT)
  EM_USO --> DISPONIVEL: sai do projeto ou projeto encerra (automático)
  EM_USO --> BLOQUEADA: aguarda outra tarefa ou pessoa (blockedByTaskId / blockedByUserId, blockReason)
  BLOQUEADA --> EM_USO: dependência resolvida
  DISPONIVEL --> BLOQUEADA: bloqueio registrado
  BLOQUEADA --> DISPONIVEL: desbloqueada fora de projeto
  EM_USO --> CONCLUIDA: concluída (também pelo feedback CONCLUI da Tarefa do Dia, RF44)
  DISPONIVEL --> CONCLUIDA: concluída
  CONCLUIDA --> ARQUIVADA: arquivar (oferece repassar ao Balcão, RF40.CA05)
  DISPONIVEL --> ARQUIVADA: arquivar
  RASCUNHO --> ARQUIVADA: descartada
  DISPONIVEL --> MODELO_PUBLICO: chancela APROVADA (RF39) ou publicação explícita
  CONCLUIDA --> MODELO_PUBLICO: chancela APROVADA ou publicação explícita
  MODELO_PUBLICO --> DISPONIVEL: despublicada ou chancela revogada
  DISPONIVEL --> OFERECIDA: Oferecer no Balcão (RF40)
  CONCLUIDA --> OFERECIDA: Oferecer no Balcão
  OFERECIDA --> DISPONIVEL: oferta retirada (volta ao estado de trabalho registrado)
  ARQUIVADA --> DISPONIVEL: desarquivar
  ARQUIVADA --> [*]
  note right of ARQUIVADA
    Tarefa ligada a decisão VALIDADA não é excluída: só arquivada (CA05).
    Exclusão em outros estados preserva snapshotJson nos projetos de terceiros.
  end note
  note left of EM_USO
    Transição inválida → 409 TRANSICAO_INVALIDA.
    Toda transição → TaskStateLog (CA02).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/tasks (grade + querystring) · tasks/[id] · attachments · u/[username] (acervo de terceiro)"]
    R2["components: TaskCard (TaskCardLayout compact/list/expanded · TaskCardVariant por TaskState, FAVORITA, PRAZO_LEGAL, CHANCELADA, NO_BALCAO, COM_EVIDENCIA) · Tag · Due · TypeChip · Seal · Counters · DecisionThread · EvidenceUploader · Skeleton · EmptyState · ErrorState · Dialog"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    AC["AcervoController · EvidenceController (@Operation RF41.CA01-CA09)"]
    SEC["SecurityConfig · CorrelationIdFilter · AuthRateLimitFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    AS["acervo/AcervoService"]
    TSM["acervo/TaskStateMachine (tabela testada)"]
    LDS["acervo/LegalDeadlineService (job diário)"]
    ES["acervo/EvidenceService"]
    VF["social/VisibilityFilter"]
    GD["security/Guard (main: ownerOrAdmin · requireRole)"]
    OM["security/OwnMedia (restricted/)"]
    UG["security/UploadGuard (magic bytes · teto de pixels)"]
    DE["events/DomainEvents AFTER_COMMIT (ProjectActivated · ProjectTaskRemoved · TaskDeleted)"]
    PORTS["ports: SearchIndexPort · CachePort · StoragePort · NotificationPort"]
    SCH["schedulers (ws-bootstrap): prazos legais 06:00"]
  end
  subgraph DOM["ws-domain"]
    ENT["TaskItem · TaskState · TaskStateLog · TaskAttachment · TaskVersion · LegalDeadlineRule · Evidence · StudioStatus (planejado) · MediaObject (V2)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql tasks · task_state_log · evidences (V__rf4/rf41)"]
    OSA["search-opensearch ws-tasks (flag opensearch.enabled)"]
    RD["cache-redis contadores (flag redis.enabled)"]
    S3A["storage-s3 anexos · evidências (flag storage.s3)"]
    CASA["persistence-cassandra notifications (flag cassandra.enabled)"]
  end
  BFF --> AC --> SEC
  AC --> AS
  AC --> ES
  AS --> TSM
  AS --> LDS
  AS --> VF
  AS --> GD
  AS --> DE
  AS --> PORTS
  ES --> UG
  ES --> OM
  ES --> PORTS
  DE --> TSM
  SCH --> LDS
  AS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> OSA --> OPENS[("OpenSearch")]
  PORTS --> RD --> REDIS[("Redis")]
  PORTS --> S3A --> S3[("S3 / MinIO")]
  DE --> CASA --> CASS[("Cassandra")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF41.CA01 | `AcervoService.list/counters`, `TaskCardView`, contadores por sub-filtro em `CachePort` | A0 → A1 → F1 → P1 → F2 | 1–11 | — | `TaskCard compact`, `Skeleton · EmptyState · ErrorState`, `RD`, `OSA` |
| RF41.CA02 | `TaskStateMachine.transition/onProjectActivated/onProjectLeft`, `TaskState`, `TaskStateLog`, MODELO_PUBLICO só via chancela/publicação | P4 → P5 (409) → P6 · P7 · P8 | 12–20 | toda a máquina + nota de EM_USO | `TSM`, `DE`, `MY` |
| RF41.CA03 | `AcervoService.detail` (preview, metadados RF4, `TaskVersion`, `ProjectTask` em uso, `DecisionTraceNode`, `SealBond`, interações, `TaskStateLog`) | A3 → A4 → F3 | — (GET /api/tasks/{id}) | — | `TaskCard expanded`, `DecisionThread`, `Seal`, `Counters` |
| RF41.CA04 | `LegalDeadlineRule`, `TaskItem.legalDueAt`, `LegalDeadlineService.scanDueSoon`, `Notification PRAZO_PROXIMO/PRAZO_VENCIDO`, `Due` (âmbar · vermelho · ⚖), RF44 | P9 → F5 | 39–41 | — | `LDS`, `SCH`, `Due`, `CASA` |
| RF41.CA05 | `AcervoService.delete`, `ProjectTask.snapshotJson/removedByAuthor` (RF23), `FinalDecision.resultingTaskId`, 409 TAREFA_EM_DECISAO, `Notification TAREFA_REUTILIZADA` | A13 → A14 → F7 → P10 → P11 (409) → P12 | 21–29 | nota de ARQUIVADA | `AS`, `Dialog` |
| RF41.CA06 | `Evidence` (takenAt, latitude/longitude AES, linkedTaskId/ProjectId, studioStatus), `EvidenceService.upload/link/toStudio`, `UploadGuard`, `OwnMedia`, IMAGEM_EDITADA (RF4) | A15 → A16 → F6 → P13 → P14 | 30–36 | — | `ES`, `UG`, `OM`, `EvidenceUploader`, `S3A` |
| RF41.CA07 | `AcervoService.quickAction` (FAVORITAR · DUPLICAR · LEVAR_AO_PROJETO · COMPARTILHAR_SESSAO · PEDIR_CHANCELA · OFERECER_BALCAO · ARQUIVAR/REPASSAR), `AcervoService.archive` | A5 → A6 → A7..A12 → F4 → P10 → P4/P15 | 12–17 | `→ ARQUIVADA / OFERECIDA / EM_USO` | `F4 menu do card`, `TSM` |
| RF41.CA08 | `VisibilityFilter.allowedFor`, `Guard.requireOwner` (403), ação Levar ao meu acervo (RF23) | A17 → F1 → P2 → P3 | 42–49 | — | `VF`, `GD`, `R1 u/[username]` |
| RF41.CA09 | querystring (filtro, filtros, ordem, page), 20 por página, i18n, `AcervoQuery` | A2 → F1 | 1–3 | — | `R1 /tasks`, `lib/i18n` |
