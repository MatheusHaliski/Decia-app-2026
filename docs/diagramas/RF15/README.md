# RF15 — Revisar a decisão final gerada pela IA. Em caso de rejeição, deve-se responder ao grupo o motivo desta decisão
**HU:** HU15 · **Sprint (board Work Station):** 3 · **Equivalente FAI:** card RF15 não cita equivalente; análogo à **fila de revisão de `SealBond`** do FAI (RF20/RF21: marca aprova/rejeita com motivo → APPROVED/REJECTED), aqui aplicada à decisão da IA (carimbo VALIDADO/DEVOLVIDO, RF38 §4) · **Aba/rota:** DECIA — sessão › "Revisar decisão" (`/decia/[sessionId]/decision/review`; rota a confirmar) + fila "Decisões pendentes de revisão" no dashboard do CHEFE (RF28.CA06)
**Critérios de aceite cobertos:** RF15.CA01 · RF15.CA02 · RF15.CA03 · RF15.CA04 · RF15.CA05 · RF15.CA06 (RF1–RF18 não têm CAs no board: derivados da HU15 + RF29.CA05, RF33.CA01, RF38 §4, RF42 e marcados "CA a confirmar")

> **HU15** — COMO administrador do sistema POSSO revisar a decisão final gerada pela IA e, em caso de rejeição, registrar e comunicar ao grupo o motivo PARA garantir que apenas decisões validadas e alinhadas às políticas institucionais sejam oficializadas.

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF15.CA01** | Dado `FinalDecision` EM_REVISAO (RF12), quando o administrador da sessão (`adminUserId` — CHEFE DE DEPARTAMENTO ou ADMIN) abre a revisão, então vê `decisionText`, `rationale`, cenário escolhido, `citationsJson` e o fio de decisão (RF29.CA06); qualquer outro usuário → `403 ACESSO_NEGADO`. |
| **RF15.CA02** | Dado o revisor escolhe **VALIDADA**, então é criado `DecisionReview` (outcome VALIDADA, reviewedAt), `FinalDecision.status = VALIDADA`, `reviewId` e `stampJson = {kind: VALIDADO, date, reviewerName}`; o grupo é notificado (`notifiedGroupAt`); no projeto vinculado nasce `TaskItem` ATA_REGISTRO na fase APROVACAO com o carimbo (RF29.CA05, `resultingTaskId`) e `ProjectScheme.status` passa a APROVADO. |
| **RF15.CA03** | Dado o revisor escolhe **DEVOLVIDA**, então `reason` é obrigatório (vazio → `422 VALIDACAO`); `FinalDecision.status = DEVOLVIDA`, `stampJson = {kind: DEVOLVIDO, date, reviewerName}`; o grupo recebe `Notification` com o **motivo** e `SessionMessage` (IA) o republica no chat; a tarefa ATA_REGISTRO nasce com carimbo DEVOLVIDO + motivo e `ProjectScheme.status` passa a DEVOLVIDO; dispara o RF14. |
| **RF15.CA04** | Dado VALIDADA, quando `DecisionValidated` é publicado AFTER_COMMIT, então cada participante que contribuiu (≥ 1 mensagem classificada ≠ RUIDO) recebe **+15 DP × qualityMultiplier (0,5–2,0)** (`DECISAO_VALIDADA`, idempotente, RF42.CA01) e nasce `MuralEntry` kind DECISAO_VALIDADA (RF27); dispara RF13 (artefatos). |
| **RF15.CA05** | Dado decisão já VALIDADA/DEVOLVIDA, quando outra revisão chega → `409 DECISAO_JA_REVISADA`; decisão em PROPOSTA (não encaminhada) → `409 DECISAO_NAO_ENCAMINHADA`; a revisão é **imutável**, vai ao rastro (nó REVISAO, aresta REVISOU) e ao `audit_log`. |
| **RF15.CA06** | Dado decisão VALIDADA, então é indexada na Memória Institucional (`InstitutionalMemoryDocument.sourceType = DECISAO`, RF33.CA01) por `PipelineJob` INDEXAR_MEMORIA; e a sessão fica apta ao encerramento (RF17). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class DeciaSession {
    <<entity>>
    +UUID id
    +String topic
    +UUID adminUserId
    +UUID linkedProjectId
    +SessionStatus status
  }
  class FinalDecision {
    <<entity>>
    +UUID id
    +UUID sessionId
    +UUID summaryId
    +String decisionText
    +String rationale
    +UUID chosenScenarioId
    +boolean proposedByAi
    +DecisionStatus status
    +UUID reviewId
    +UUID resultingTaskId
    +String stampJson
    +String citationsJson
  }
  class DecisionReview {
    <<entity>>
    +UUID id
    +UUID decisionId
    +UUID reviewerId
    +ReviewOutcome outcome
    +String reason
    +Instant reviewedAt
    +Instant notifiedGroupAt
  }
  class User {
    <<entity>>
    +UUID id
    +String fullName
    +ProfileType profileType
    +Role role
    +UUID departmentId
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +TaskType type
    +TaskCategory category
    +SourceKind sourceKind
    +String sourceRef
    +TaskState state
  }
  class ProjectTask {
    <<entity>>
    +UUID id
    +UUID projectId
    +UUID taskId
    +ProjectPhase phase
    +UUID decisionTraceNodeId
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +ProjectStatus status
    +ProjectPhase currentPhase
    +Instant lastDeciaEventAt
    +String lastDeciaEventLabel
  }
  class DecisionTraceNode {
    <<entity>>
    +UUID id
    +UUID sessionId
    +TraceNodeType nodeType
    +UUID refId
    +String label
    +UUID actorId
    +String snapshotJson
  }
  class DecisionTraceEdge {
    <<entity>>
    +UUID id
    +UUID fromNodeId
    +UUID toNodeId
    +TraceRelation relation
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +UUID id
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +UUID refId
    +UUID sessionId
    +BigDecimal qualityMultiplier
    +String idempotencyKey
    +LedgerStatus status
  }
  class DeliberativeProfile {
    <<entity>>
    +UUID userId
    +String periodKey
    +BigDecimal clarity
    +BigDecimal evidenceUse
    +BigDecimal consistency
  }
  class MuralEntry {
    <<entity>>
    +UUID id
    +String kind
    +String targetType
    +UUID targetId
    +UUID actorId
  }
  class Notification {
    <<entity>>
    +UUID id
    +UUID recipientId
    +NotificationType type
    +String category
    +String body
  }
  class AuditLog {
    <<entity>>
    +UUID id
    +UUID actorId
    +String action
    +String resourceType
    +UUID resourceId
    +String correlationId
  }

  class DecisionStatus {
    <<enum>>
    PROPOSTA
    EM_REVISAO
    VALIDADA
    DEVOLVIDA
    SUBSTITUIDA
  }
  class ReviewOutcome {
    <<enum>>
    VALIDADA
    DEVOLVIDA
  }
  class ProjectStatus {
    <<enum>>
    EM_DECISAO
    APROVADO
    DEVOLVIDO
  }
  class ProjectPhase {
    <<enum>>
    ANALISE
    APROVACAO
    EXECUCAO
  }
  class PointsEvent {
    <<enum>>
    DECISAO_VALIDADA
    ARTEFATO_USADO
    PRESENCA_ENCERRADA
  }

  class DecisionReviewController {
    <<controller>>
    +getForReview(sessionId, decisionId) 200
    +review(sessionId, decisionId, ReviewForm) 200
    +pendingQueue(departmentId) 200
  }
  class DecisionService {
    <<service>>
    +getForReview(actor, sessionId, decisionId) ReviewView
    +review(actor, sessionId, decisionId, outcome, reason) DecisionReview
    -stamp(decision, outcome, reviewer) StampJson
  }
  class TaskCreationService {
    <<service>>
    +createDecisionRecord(decision, review, project) TaskItem
  }
  class ProjectStatusService {
    <<service>>
    +onDecisionReviewed(projectId, outcome)
  }
  class DecisionTraceService {
    <<service>>
    +appendNode(sessionId, REVISAO, reviewId)
    +appendEdge(decisionNode, reviewNode, REVISOU)
  }
  class DeciaPointsService {
    <<service>>
    +onDecisionValidated(event) AFTER_COMMIT
    +qualityMultiplier(userId, sessionId) BigDecimal
  }
  class NotificationPort {
    <<port>>
    +notifyGroup(recipients, type, body)
  }
  class MemoryIndexPort {
    <<port>>
    +scheduleIndex(sourceType, sourceId)
  }
  class DecisionReviewRepository {
    <<adapter>>
    MySQL decision_reviews
  }
  class FinalDecisionRepository {
    <<adapter>>
    MySQL final_decisions (@Version)
  }

  DeciaSession "1" --> "*" FinalDecision
  DeciaSession ..> ProjectScheme : linkedProjectId
  DeciaSession ..> User : adminUserId (revisor)
  FinalDecision --> DecisionStatus
  FinalDecision "1" --> "0..1" DecisionReview : reviewId
  FinalDecision ..> TaskItem : resultingTaskId (ATA_REGISTRO)
  DecisionReview --> ReviewOutcome
  DecisionReview "*" --> "1" User : reviewerId
  TaskItem "1" --> "*" ProjectTask : em fase APROVACAO
  ProjectTask "*" --> "1" ProjectScheme
  ProjectTask ..> DecisionTraceNode : decisionTraceNodeId
  ProjectScheme --> ProjectStatus
  ProjectTask --> ProjectPhase
  DecisionTraceEdge --> DecisionTraceNode : fromNodeId / toNodeId
  DecisionTraceNode ..> DecisionReview : refId quando REVISAO
  DeciaPointsLedgerEntry --> PointsEvent
  DeciaPointsLedgerEntry ..> FinalDecision : refId
  DeciaPointsLedgerEntry ..> DeliberativeProfile : qualityMultiplier
  MuralEntry ..> FinalDecision : targetId (DECISION)

  DecisionReviewController --> DecisionService
  DecisionService --> DecisionReviewRepository
  DecisionService --> FinalDecisionRepository
  DecisionService --> TaskCreationService
  DecisionService --> ProjectStatusService
  DecisionService --> DecisionTraceService
  DecisionService --> NotificationPort
  DecisionService --> MemoryIndexPort
  DecisionService ..> DeciaPointsService : evento DecisionValidated
  DecisionService ..> AuditLog : registra
  NotificationPort ..> Notification : cria

  note for DecisionReview "tabela decision_reviews — outcome VALIDADA, DEVOLVIDA .. reason obrigatório se DEVOLVIDA .. imutável"
  note for FinalDecision "stampJson = {kind VALIDADO|DEVOLVIDO, date, reviewerName} — carimbo do fio de decisão (RF38 §4)"
  note for DeciaPointsLedgerEntry "+15 × qualityMultiplier 0,5–2,0 (perfil deliberativo, objetivo 2) .. idempotencyKey = DECISAO_VALIDADA + decisionId + userId .."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Administrador da sessão (CHEFE / ADMIN)"]
    A0(["Notificação: decisão aguardando revisão (RF12)"])
    A1["Abre a revisão: decisão, justificativa, cenário, citações, fio de decisão"]
    A2{"Veredito?"}
    A3["Escolhe VALIDADA"]
    A4["Escolhe DEVOLVIDA e escreve o motivo"]
    A5(["Fim — grupo informado"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["GET /api/decia/sessions/{id}/decisions/{did}/review"]
    B2["POST /api/decia/sessions/{id}/decisions/{did}/review {outcome, reason}"]
    B3["Exibe 403 ACESSO_NEGADO"]
    B4["Exibe 409 DECISAO_JA_REVISADA ou 409 DECISAO_NAO_ENCAMINHADA"]
    B5["Exibe 422 VALIDACAO — motivo obrigatório"]
    B6["Carimbo VALIDADO (verde) com data e revisor + confete discreto"]
    B7["Carimbo DEVOLVIDO (vermelho) com o motivo"]
  end

  subgraph L3["wai-application (DecisionService)"]
    C1{"actor = adminUserId?"}
    C2{"decision.status = EM_REVISAO?"}
    C3{"outcome = DEVOLVIDA e reason vazio?"}
    C4["INSERT DecisionReview (outcome, reason, reviewedAt)"]
    C5["FinalDecision.status = outcome; reviewId; stampJson"]
    C6{"outcome?"}
    C7["TaskCreationService: TaskItem ATA_REGISTRO em APROVACAO com carimbo VALIDADO (RF29.CA05)"]
    C8["ProjectStatusService: ProjectScheme → APROVADO; lastDeciaEventLabel"]
    C9["TaskCreationService: TaskItem ATA_REGISTRO com carimbo DEVOLVIDO + motivo"]
    C10["ProjectStatusService: ProjectScheme → DEVOLVIDO"]
    C11["Rastro: nó REVISAO + aresta REVISOU (DECISAO → REVISAO)"]
    C12["AuditLog DECISION_REVIEWED (correlationId)"]
    C13["Publica DecisionValidated (outbox)"]
    C14["Publica DecisionReturned (outbox)"]
    C15["notifiedGroupAt = now"]
  end

  subgraph L4["Persistência"]
    E1[("MySQL final_decisions · decision_reviews")]
    E2[("MySQL tasks · project_tasks · project_schemes")]
    E3[("MySQL decision_trace_nodes/edges · audit_log · domain_events")]
    E4[("Cassandra notifications_by_user · messages_by_session")]
  end

  subgraph L5["Listeners AFTER_COMMIT"]
    F1["NotificationPort: grupo — Decisão VALIDADA"]
    F2["DeciaPointsService: +15 × qualityMultiplier DECISAO_VALIDADA por contribuinte (idempotente)"]
    F3["MuralEntry DECISAO_VALIDADA (RF27)"]
    F4["ArtifactService: gerar relatório, ata, checklist (RF13)"]
    F5["PipelineJob INDEXAR_MEMORIA (sourceType DECISAO, RF33.CA01)"]
    F6["NotificationPort: grupo — Decisão DEVOLVIDA + motivo; SessionMessage IA com o motivo"]
    F7["ReopenService: pedido de reabertura (RF14)"]
  end

  A0 --> A1 --> B1 --> C1
  C1 -->|não| B3 --> A5
  C1 -->|sim| A2
  A2 -->|validar| A3 --> B2
  A2 -->|devolver| A4 --> B2
  B2 --> C2
  C2 -->|não| B4 --> A5
  C2 -->|sim| C3
  C3 -->|sim| B5 --> A4
  C3 -->|não| C4 --> E1
  C4 --> C5 --> E1
  C5 --> C6
  C6 -->|VALIDADA| C7 --> E2
  C7 --> C8 --> E2
  C8 --> C11
  C6 -->|DEVOLVIDA| C9 --> E2
  C9 --> C10 --> E2
  C10 --> C11 --> E3
  C11 --> C12 --> E3
  C12 --> C6b{"outcome?"}
  C6b -->|VALIDADA| C13 --> E3
  C6b -->|DEVOLVIDA| C14 --> E3
  C13 --> F1 --> E4
  C13 --> F2
  C13 --> F3
  C13 --> F4
  C13 --> F5
  C14 --> F6 --> E4
  C14 --> F7
  F1 --> C15 --> B6 --> A5
  F6 --> C15
  C15 --> B7 --> A5
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (admin da sessão — CHEFE/ADMIN)
  participant FE as Next.js (App Router)
  participant C as Controller (wai-web)
  participant S as Service (wai-application)
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — revisor VALIDA: carimbo, tarefa ATA_REGISTRO, pontos, mural, artefatos, memória
    U->>FE: Abre "Revisar decisão"
    FE->>C: GET /api/decia/sessions/{id}/decisions/{did}/review
    C->>S: DecisionService.getForReview(actor, sessionId, decisionId)
    S->>DB: SELECT decia_sessions.adminUserId = actor
    S->>DB: SELECT final_decisions (EM_REVISAO) + summary_scenarios + decision_trace (fio de decisão)
    S-->>C: 200 ReviewView {decisionText, rationale, scenario, citations, trace}
    C-->>FE: 200
    FE-->>U: Tela de revisão com fio de decisão
    U->>FE: Escolhe VALIDADA e confirma
    FE->>C: POST /api/decia/sessions/{id}/decisions/{did}/review {outcome VALIDADA}
    C->>S: DecisionService.review(actor, sessionId, decisionId, VALIDADA, null)
    S->>DB: SELECT final_decisions FOR UPDATE (status = EM_REVISAO, @Version)
    S->>DB: INSERT decision_reviews (VALIDADA, reviewerId, reviewedAt)
    S->>DB: UPDATE final_decisions SET status = VALIDADA, reviewId, stampJson = {VALIDADO, date, reviewerName}
    S->>DB: INSERT tasks (ATA_REGISTRO, category ATA, sourceKind DECIA, sourceRef = decisionId, notes = carimbo)
    S->>DB: INSERT project_tasks (phase APROVACAO, decisionTraceNodeId) + UPDATE final_decisions SET resultingTaskId
    S->>DB: UPDATE project_schemes SET status = APROVADO, lastDeciaEventLabel = "decisão validada"
    S->>DB: INSERT decision_trace_nodes (REVISAO, snapshotJson) + decision_trace_edges (DECISAO → REVISAO, REVISOU)
    S->>DB: INSERT audit_log (DECISION_REVIEWED, correlationId)
    S->>DB: INSERT domain_events (DecisionValidated)
    S->>DB: INSERT pipeline_jobs (INDEXAR_MEMORIA, DECISAO)
    S-->>C: 200 {decision VALIDADA, stampJson, resultingTaskId}
    C-->>FE: 200
    FE-->>U: Carimbo VALIDADO + confete discreto
    EV-->>S: NotificationPort.notifyGroup(participantes, DECISAO_VALIDADA) → UPDATE decision_reviews SET notifiedGroupAt
    S->>CS: INSERT notifications_by_user (participantes)
    EV-->>S: DeciaPointsService.onDecisionValidated
    S->>DB: SELECT contribuintes (message_classifications ≠ RUIDO) + deliberative_profiles (qualityMultiplier)
    S->>DB: INSERT decia_points_ledger (+15 × m, DECISAO_VALIDADA, idempotencyKey) por contribuinte
    EV-->>S: MuralService: INSERT mural_entries (DECISAO_VALIDADA)
    EV-->>S: ArtifactService.onDecisionValidated (RF13)
    S->>OS: index wai-memory {sourceType DECISAO, sourceId, text}
  end

  alt RF15.CA03 — revisor DEVOLVE com motivo
    U->>FE: Escolhe DEVOLVIDA e escreve o motivo
    FE->>C: POST .../review {outcome DEVOLVIDA, reason}
    C->>S: review(..., DEVOLVIDA, reason)
    S->>DB: INSERT decision_reviews (DEVOLVIDA, reason) + UPDATE final_decisions SET status = DEVOLVIDA, stampJson = {DEVOLVIDO, …}
    S->>DB: INSERT tasks ATA_REGISTRO (carimbo DEVOLVIDO + motivo) + UPDATE project_schemes SET status = DEVOLVIDO
    S->>DB: INSERT decision_trace (REVISAO, REVISOU) + audit_log + domain_events (DecisionReturned)
    S-->>C: 200 {decision DEVOLVIDA}
    EV-->>S: NotificationPort.notifyGroup(participantes, DECISAO_DEVOLVIDA, body = reason)
    S->>CS: INSERT messages_by_session (authorKind IA, bodyMd = motivo da devolução)
    EV-->>S: ReopenService.onDecisionReturned (RF14)
  else RF15.CA03 — DEVOLVIDA sem motivo
    FE->>C: POST .../review {outcome DEVOLVIDA, reason ""}
    C->>S: review(...)
    S-->>C: 422 VALIDACAO (reason obrigatório)
    C-->>FE: 422
  else RF15.CA05 — decisão já revisada
    FE->>C: POST .../review
    C->>S: review(...)
    S->>DB: SELECT final_decisions.status IN (VALIDADA, DEVOLVIDA)
    S-->>C: 409 DECISAO_JA_REVISADA
    C-->>FE: 409
  else RF15.CA01 — não é o administrador da sessão
    FE->>C: GET .../review
    C->>S: getForReview(...)
    S->>DB: SELECT decia_sessions.adminUserId ≠ actor
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
  end
```

## 4. Máquina de estados

Entidade central: `FinalDecision.status` (`DecisionStatus`) — o RF15 é o único que atribui VALIDADA e DEVOLVIDA.

```mermaid
stateDiagram-v2
  [*] --> PROPOSTA : IA propõe (RF12)
  PROPOSTA --> EM_REVISAO : admin encaminha (RF12)
  PROPOSTA --> SUBSTITUIDA : nova proposta (RF12.CA04)
  EM_REVISAO --> VALIDADA : revisor VALIDA — RF15.CA02
  EM_REVISAO --> DEVOLVIDA : revisor DEVOLVE com reason obrigatório — RF15.CA03
  DEVOLVIDA --> SUBSTITUIDA : sessão REABERTA gera nova decisão (RF14.CA05)
  VALIDADA --> [*]
  SUBSTITUIDA --> [*]

  note right of VALIDADA
    stampJson = VALIDADO + data + revisor
    TaskItem ATA_REGISTRO em APROVACAO (RF29.CA05)
    ProjectScheme → APROVADO
    AFTER_COMMIT: +15 × qualidade DP, MuralEntry, RF13, INDEXAR_MEMORIA
    terminal — nova revisão → 409 DECISAO_JA_REVISADA
  end note
  note left of DEVOLVIDA
    stampJson = DEVOLVIDO + motivo
    grupo notificado com o motivo (notifiedGroupAt)
    ProjectScheme → DEVOLVIDO
    AFTER_COMMIT: ReopenRequest (RF14)
  end note
  note right of EM_REVISAO
    revisão só pelo adminUserId (CHEFE/ADMIN)
    decisão em PROPOSTA → 409 DECISAO_NAO_ENCAMINHADA
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/decia/[sessionId]/decision/review/page.tsx"]
    FE2["app/admin/dashboard — fila Decisões pendentes (RF28.CA06)"]
    FE3["components/ui/ReviewPanel · DecisionThread (fio de decisão) · StampBadge · ReasonTextarea"]
  end

  subgraph WEB["wai-web"]
    W1["DecisionReviewController (REST /api/decia/sessions/{id}/decisions/{did}/review)"]
    W2["SessionAccessGuard (adminUserId; perfil CHEFE/ADMIN)"]
  end

  subgraph APP["wai-application"]
    S1["DecisionService.review"]
    S2["TaskCreationService (RF20/RF29)"]
    S3["ProjectStatusService (RF21)"]
    S4["DecisionTraceService"]
    S5["DeciaPointsService (listener AFTER_COMMIT)"]
    S6["MuralService (listener, RF27)"]
    S7["ArtifactService (listener, RF13)"]
    S8["ReopenService (listener, RF14)"]
    P1["NotificationPort"]
    P2["MemoryIndexPort"]
    P3["DomainEventPublisher (outbox)"]
  end

  subgraph DOM["wai-domain"]
    D1["FinalDecision · DecisionReview"]
    D2["TaskItem · ProjectTask · ProjectScheme"]
    D3["DecisionTraceNode · DecisionTraceEdge · AuditLog"]
    D4["DeciaPointsLedgerEntry · DeliberativeProfile · MuralEntry"]
    D5["Enums: DecisionStatus · ReviewOutcome · ProjectStatus · ProjectPhase · PointsEvent"]
  end

  subgraph INFRA["wai-infrastructure"]
    I1["persistence-mysql: FinalDecisionRepository (@Version), DecisionReviewRepository, TaskItemRepository, ProjectTaskRepository, ProjectSchemeRepository, DecisionTraceRepository, DeciaPointsLedgerRepository, MuralEntryRepository, AuditLogRepository, PipelineJobRepository"]
    I2["persistence-cassandra: NotificationFeedAdapter, CassandraMessageAdapter"]
    I3["search-opensearch: OpenSearchMemoryAdapter (wai-memory)"]
    I4["cache-redis: PointsBalanceCache"]
    I5["platform: NotificationAdapter, OutboxRelay, PipelineJobRunner"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  OS[("OpenSearch")]
  RD[("Redis")]

  FE1 --> FE3
  FE2 --> FE3
  FE3 -->|HTTPS/JSON| W1 --> W2 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> P1
  S1 --> P2
  S1 --> P3
  P3 -.->|AFTER_COMMIT DecisionValidated| S5
  P3 -.->|AFTER_COMMIT DecisionValidated| S6
  P3 -.->|AFTER_COMMIT DecisionValidated| S7
  P3 -.->|AFTER_COMMIT DecisionReturned| S8
  S1 --> D1
  S2 --> D2
  S3 --> D2
  S4 --> D3
  S5 --> D4
  S6 --> D4
  D1 --> D5
  P1 -.-> I5
  P2 -.-> I5
  I5 --> I2
  I5 --> I3
  S5 --> I4
  S1 --> I1
  S2 --> I1
  S4 --> I1
  S5 --> I1
  I1 --> MY
  I2 --> CA
  I3 --> OS
  I4 --> RD
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF15.CA01 | `DecisionService.getForReview`, `DeciaSession.adminUserId`, `DecisionTraceNode/Edge` (fio de decisão), `SessionAccessGuard` | A1, B1, C1, B3 | 1–8; `alt` 403 ACESSO_NEGADO | nota de EM_REVISAO | `DecisionReviewController.getForReview`, `ReviewPanel`, `DecisionThread` |
| RF15.CA02 | `DecisionReview` (VALIDADA), `FinalDecision.status/reviewId/stampJson/resultingTaskId`, `TaskItem` ATA_REGISTRO, `ProjectTask` APROVACAO, `ProjectScheme.status APROVADO`, `TaskCreationService`, `ProjectStatusService` | A3, B2, C4–C8, B6 | 9–24 | EM_REVISAO → VALIDADA | `DecisionService.review`, `TaskCreationService`, `ProjectStatusService`, `StampBadge` |
| RF15.CA03 | `DecisionReview.reason` (obrigatório), `stampJson` DEVOLVIDO, `DecisionReview.notifiedGroupAt`, `SessionMessage` (IA), `ProjectScheme.status DEVOLVIDO` | A4, C3, C9, C10, C14, F6, B5, B7 | `alt` RF15.CA03 (DEVOLVIDA) e `alt` 422 VALIDACAO | EM_REVISAO → DEVOLVIDA | `ReasonTextarea`, `NotificationAdapter`, `CassandraMessageAdapter`, `ReopenService` |
| RF15.CA04 | `DeciaPointsLedgerEntry` (DECISAO_VALIDADA, qualityMultiplier), `DeliberativeProfile`, `DeciaPointsService.onDecisionValidated`, `MuralEntry` DECISAO_VALIDADA, `ArtifactService` | C13, F1–F4 | 25–31 | nota de VALIDADA | `DeciaPointsService`, `MuralService`, `ArtifactService`, `OutboxRelay`, `PointsBalanceCache` |
| RF15.CA05 | `FinalDecisionRepository` (@Version, SELECT FOR UPDATE), `AuditLog`, `DecisionTraceNode` REVISAO / aresta REVISOU | C2, C11, C12, B4 | 12, 19, 20; `alt` 409 DECISAO_JA_REVISADA | VALIDADA/DEVOLVIDA sem transição de volta | `DecisionTraceService`, `AuditLogRepository` |
| RF15.CA06 | `PipelineJob` INDEXAR_MEMORIA, `InstitutionalMemoryDocument` (DECISAO), `MemoryIndexPort` | F5 | 22, 32 | nota de VALIDADA | `OpenSearchMemoryAdapter`, `PipelineJobRunner` |
