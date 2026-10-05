# RF14 — Solicitar reabertura da sessão ao grupo, em caso de rejeição, com motivo devidamente justificado
**HU:** HU14 · **Sprint (board Work Station):** 3 · **Equivalente FAI:** card RF14 não cita equivalente; sem análogo direto no FAI — no fluxo de `SealBond` (FAI RF20/RF21) um vínculo REJECTED é terminal; aqui a rejeição da decisão (RF15) abre um ciclo de reabertura deliberativa · **Aba/rota:** DECIA — sessão › banner "Pedido de reabertura" (`/decia/[sessionId]`; rota a confirmar)
**Critérios de aceite cobertos:** RF14.CA01 · RF14.CA02 · RF14.CA03 · RF14.CA04 · RF14.CA05 (RF1–RF18 não têm CAs no board: derivados da HU14 + RF15, RF12.CA04, RF29 e marcados "CA a confirmar")

> **HU14** — COMO IA do sistema POSSO solicitar ao grupo a reabertura da sessão, quando a decisão for rejeitada, com motivo devidamente justificado PARA permitir que a discussão seja retomada e a decisão refeita com base no motivo da rejeição.

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF14.CA01** | Dado `FinalDecision` DEVOLVIDA com `DecisionReview.reason` (RF15), quando o evento `DecisionReturned` dispara AFTER_COMMIT, então a IA cria `ReopenRequest` PENDENTE com `requestedBy = IA`, `decisionId` e `justification` redigida a partir do motivo da devolução (o que precisa ser rediscutido, quais divergências/riscos reabrir), e posta `SessionMessage` (authorKind IA) + `Notification` (DECIA) ao grupo. |
| **RF14.CA02** | Dado o pedido PENDENTE, quando participantes MEMBRO votam em `votesJson` (ACEITAR / RECUSAR), então o administrador decide (ou a maioria simples dos votantes decide ao fim do prazo configurável): **ACEITA** → sessão EM_REVISAO → REABERTA (`decidedAt`), o chat volta a aceitar mensagens (RF6) com a decisão DEVOLVIDA e o motivo fixados como contexto; **RECUSADA** → a sessão permanece EM_REVISAO para o administrador encerrar (RF17). |
| **RF14.CA03** | Dado um pedido manual (participante ou admin), quando `justification` tem menos de 20 caracteres → `422 VALIDACAO`; sessão sem decisão DEVOLVIDA → `409 DECISAO_NAO_DEVOLVIDA`; não-participante → `403 ACESSO_NEGADO`. |
| **RF14.CA04** | Dado pedido já ACEITA/RECUSADA, quando chega novo voto ou nova decisão → `409 PEDIDO_ENCERRADO`; existe no máximo **um** `ReopenRequest` PENDENTE por `decisionId`; voto repetido do mesmo usuário substitui o anterior (idempotente). |
| **RF14.CA05** | Dado sessão REABERTA, então um novo ciclo RF11 → RF12 → RF15 produz nova `FinalDecision`; a DEVOLVIDA passa a SUBSTITUIDA e o rastro liga REVISAO → ORIGINOU → (nó DECISAO novo), preservando a decisão devolvida (RF29.CA07). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class DeciaSession {
    <<entity>>
    +UUID id
    +String topic
    +UUID adminUserId
    +SessionStatus status
    +int participantCount
  }
  class SessionParticipant {
    <<entity>>
    +UUID id
    +UUID sessionId
    +UUID userId
    +ParticipantRole role
    +Instant leftAt
  }
  class FinalDecision {
    <<entity>>
    +UUID id
    +UUID sessionId
    +String decisionText
    +DecisionStatus status
    +UUID reviewId
    +String stampJson
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
  class ReopenRequest {
    <<entity>>
    +UUID id
    +UUID sessionId
    +UUID decisionId
    +UUID requestedBy
    +String justification
    +ReopenStatus status
    +String votesJson
    +Instant decidedAt
  }
  class SessionMessage {
    <<entity>>
    +TIMEUUID id
    +UUID sessionId
    +UUID authorId
    +AuthorKind authorKind
    +String bodyMd
    +Instant sentAt
  }
  class Notification {
    <<entity>>
    +UUID id
    +UUID recipientId
    +NotificationType type
    +String category
    +UUID resourceId
  }
  class DecisionTraceNode {
    <<entity>>
    +UUID id
    +TraceNodeType nodeType
    +UUID refId
    +String label
  }
  class DecisionTraceEdge {
    <<entity>>
    +UUID id
    +UUID fromNodeId
    +UUID toNodeId
    +TraceRelation relation
  }
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +String result
  }

  class SessionStatus {
    <<enum>>
    EM_REVISAO
    REABERTA
    EM_RESUMO
    ENCERRADA
  }
  class ReopenStatus {
    <<enum>>
    PENDENTE
    ACEITA
    RECUSADA
  }
  class DecisionStatus {
    <<enum>>
    DEVOLVIDA
    SUBSTITUIDA
    PROPOSTA
  }
  class ReviewOutcome {
    <<enum>>
    VALIDADA
    DEVOLVIDA
  }

  class ReopenController {
    <<controller>>
    +create(sessionId, ReopenForm) 201
    +vote(sessionId, requestId, VoteForm) 200
    +decide(sessionId, requestId, DecideForm) 200
    +getPending(sessionId) 200
  }
  class ReopenService {
    <<service>>
    +onDecisionReturned(event) AFTER_COMMIT
    +request(actor, sessionId, decisionId, justification) ReopenRequest
    +vote(actor, sessionId, requestId, choice)
    +decide(actor, sessionId, requestId, outcome)
    +closeExpired(requestId)
  }
  class SessionLifecycleService {
    <<service>>
    +transition(sessionId, from, to)
  }
  class DecisionService {
    <<service>>
    +supersede(decisionId)
  }
  class DecisionTraceService {
    <<service>>
    +appendNode(sessionId, REVISAO, requestId)
    +appendEdge(reviewNode, newNode, ORIGINOU)
  }
  class AiEnginePort {
    <<port>>
    +draftReopenJustification(decision, review, summary) String
  }
  class NotificationPort {
    <<port>>
    +notifyGroup(recipients, type, resource)
  }
  class SessionMessageRepositoryPort {
    <<port>>
    +append(SessionMessage)
  }
  class ReopenRequestRepository {
    <<adapter>>
    MySQL reopen_requests
  }
  class CassandraMessageAdapter {
    <<adapter>>
    messages_by_session
  }
  class AiEngineAdapter {
    <<adapter>>
    Claude e Gemini com fallback local
  }

  DeciaSession "1" --> "*" ReopenRequest : pedidos
  DeciaSession "1" --> "*" SessionParticipant
  DeciaSession --> SessionStatus
  ReopenRequest --> ReopenStatus
  ReopenRequest "*" --> "1" FinalDecision : decisionId (DEVOLVIDA)
  ReopenRequest ..> SessionParticipant : votesJson (userId, choice, at)
  ReopenRequest ..> AiInferenceLog : justificativa gerada
  FinalDecision --> DecisionStatus
  FinalDecision "1" --> "0..1" DecisionReview : reviewId
  DecisionReview --> ReviewOutcome
  DecisionTraceEdge --> DecisionTraceNode : fromNodeId / toNodeId
  DecisionTraceNode ..> ReopenRequest : refId quando REVISAO (reabertura)

  ReopenController --> ReopenService
  ReopenService --> SessionLifecycleService
  ReopenService --> DecisionService
  ReopenService --> DecisionTraceService
  ReopenService --> AiEnginePort
  ReopenService --> NotificationPort
  ReopenService --> SessionMessageRepositoryPort
  ReopenService --> ReopenRequestRepository
  AiEnginePort <|.. AiEngineAdapter
  SessionMessageRepositoryPort <|.. CassandraMessageAdapter
  NotificationPort ..> Notification : cria

  note for ReopenRequest "tabela reopen_requests — status PENDENTE, ACEITA, RECUSADA .. votesJson = [{userId, choice ACEITAR|RECUSAR, at}] .. máximo 1 PENDENTE por decisionId"
  note for ReopenService "onDecisionReturned: listener AFTER_COMMIT do RF15 (outcome DEVOLVIDA)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Grupo / Administrador da sessão"]
    A0(["Decisão DEVOLVIDA com motivo (RF15)"])
    A1["Grupo recebe notificação e lê o pedido de reabertura da IA"]
    A2["Membros votam ACEITAR ou RECUSAR"]
    A3{"Admin decide ou prazo encerra?"}
    A4["Admin aciona Aceitar reabertura"]
    A5["Admin aciona Recusar reabertura"]
    A6["Sessão REABERTA — grupo volta a debater com o motivo fixado"]
    A7["Sessão continua EM_REVISAO — admin encerra (RF17)"]
    A8(["Fim"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["GET /api/decia/sessions/{id}/reopen-requests/pending"]
    B2["POST /api/decia/sessions/{id}/reopen-requests/{rid}/votes"]
    B3["POST /api/decia/sessions/{id}/reopen-requests/{rid}/decide"]
    B4["POST /api/decia/sessions/{id}/reopen-requests (pedido manual)"]
    B5["Exibe 403 ACESSO_NEGADO"]
    B6["Exibe 409 PEDIDO_ENCERRADO ou 409 DECISAO_NAO_DEVOLVIDA"]
    B7["Exibe 422 VALIDACAO — justificativa curta"]
    B8["Banner: decisão devolvida + motivo + placar de votos"]
  end

  subgraph L3["ws-application (ReopenService)"]
    C0["Listener DecisionReturned (AFTER_COMMIT)"]
    C1{"já existe ReopenRequest PENDENTE para a decisão?"}
    C2["AiEnginePort.draftReopenJustification (motivo → o que rediscutir)"]
    C3["INSERT ReopenRequest PENDENTE (requestedBy = IA)"]
    C4["SessionMessage authorKind IA com o pedido"]
    C5["NotificationPort.notifyGroup (REABERTURA_SOLICITADA)"]
    C6{"actor é MEMBRO ativo e pedido PENDENTE?"}
    C7["Upsert voto em votesJson (idempotente por userId)"]
    C8{"actor = adminUserId ou prazo vencido com maioria?"}
    C9{"resultado?"}
    C10["status = ACEITA, decidedAt"]
    C11["SessionLifecycleService: EM_REVISAO → REABERTA"]
    C12["DecisionService.supersede: DEVOLVIDA → SUBSTITUIDA ao nascer nova decisão"]
    C13["Rastro: nó REVISAO (reabertura) + aresta ORIGINOU"]
    C14["status = RECUSADA, decidedAt"]
    C15{"justification ≥ 20 chars e decisão DEVOLVIDA?"}
  end

  subgraph L4["IA (AiEngine)"]
    D1["FORMULAR_PERGUNTA / DECISAO_FINAL: sintetiza o motivo da devolução em pauta de reabertura"]
    D2["AiInferenceLog"]
  end

  subgraph L5["Persistência"]
    E1[("MySQL reopen_requests · final_decisions · decision_reviews")]
    E2[("Cassandra messages_by_session · notifications_by_user")]
    E3[("MySQL decia_sessions · decision_trace_nodes/edges · domain_events")]
  end

  subgraph L6["Listeners AFTER_COMMIT"]
    F1["NotificationPort: grupo — Sessão reaberta / Reabertura recusada"]
    F2["Timer: closeExpired ao fim do prazo (maioria simples)"]
  end

  A0 --> C0 --> C1
  C1 -->|sim| A8
  C1 -->|não| C2 --> D1 --> D2 --> C3 --> E1
  C3 --> C4 --> E2
  C4 --> C5 --> E2
  C5 --> A1 --> B1 --> B8 --> A2 --> B2 --> C6
  C6 -->|não| B5 --> A8
  C6 -->|pedido encerrado| B6 --> A8
  C6 -->|sim| C7 --> E1
  C7 --> A3
  A3 -->|admin aceita| A4 --> B3 --> C8
  A3 -->|admin recusa| A5 --> B3
  A3 -->|prazo| F2 --> C8
  C8 -->|não| B5
  C8 -->|sim| C9
  C9 -->|ACEITA| C10 --> E1
  C10 --> C11 --> E3
  C11 --> C13 --> E3
  C13 --> F1 --> A6
  A6 --> C12 --> E1
  C12 --> A8
  C9 -->|RECUSADA| C14 --> E1
  C14 --> F1 --> A7 --> A8
  A2 -.->|pedido manual| B4 --> C15
  C15 -->|não| B7 --> A8
  C15 -->|decisão não devolvida| B6
  C15 -->|sim| C3
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (membro / admin)
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — IA pede reabertura, grupo vota, admin aceita, sessão REABERTA
    EV-->>S: ReopenService.onDecisionReturned(sessionId, decisionId, reviewId)
    S->>DB: SELECT final_decisions (DEVOLVIDA), decision_reviews.reason, analytical_summaries
    S->>DB: SELECT reopen_requests WHERE decisionId AND status = PENDENTE → nenhum
    S->>AI: draftReopenJustification(decision, review.reason, summary)
    AI-->>S: justification ("O revisor devolveu por X — rediscutir riscos R1 e divergência D2")
    S->>DB: INSERT ai_inference_log
    S->>DB: INSERT reopen_requests (PENDENTE, requestedBy = IA, justification)
    S->>CS: INSERT messages_by_session (authorKind IA, bodyMd = pedido)
    S->>CS: INSERT notifications_by_user (participantes, REABERTURA_SOLICITADA)
    S->>DB: INSERT decision_trace_nodes (REVISAO, label "pedido de reabertura")

    U->>FE: Abre a sessão — banner do pedido
    FE->>C: GET /api/decia/sessions/{id}/reopen-requests/pending
    C->>S: ReopenService.getPending(sessionId)
    S->>DB: SELECT reopen_requests PENDENTE + votesJson
    S-->>C: 200 ReopenRequest {justification, votes, deadline}
    C-->>FE: 200
    FE-->>U: Motivo da devolução, justificativa da IA, placar
    U->>FE: Vota ACEITAR
    FE->>C: POST /api/decia/sessions/{id}/reopen-requests/{rid}/votes {choice ACEITAR}
    C->>S: ReopenService.vote(actor, sessionId, requestId, ACEITAR)
    S->>DB: SELECT session_participants (actor MEMBRO, leftAt null)
    S->>DB: UPDATE reopen_requests SET votesJson = upsert(userId, ACEITAR)
    S-->>C: 200 placar
    C-->>FE: 200

    U->>FE: Admin clica "Aceitar reabertura"
    FE->>C: POST /api/decia/sessions/{id}/reopen-requests/{rid}/decide {outcome ACEITA}
    C->>S: ReopenService.decide(actor, sessionId, requestId, ACEITA)
    S->>DB: SELECT decia_sessions (adminUserId = actor, status = EM_REVISAO)
    S->>DB: UPDATE reopen_requests SET status = ACEITA, decidedAt
    S->>DB: UPDATE decia_sessions SET status = REABERTA
    S->>DB: INSERT decision_trace_edges (REVISAO → sessão REABERTA, ORIGINOU)
    S->>DB: INSERT audit_log + domain_events (SessionReopened)
    S-->>C: 200 {session REABERTA}
    C-->>FE: 200
    FE-->>U: Chat liberado — decisão devolvida e motivo fixados no topo
    EV-->>S: NotificationPort.notifyGroup(participantes, SESSAO_REABERTA)
  end

  alt RF14.CA03 — justificativa curta em pedido manual
    U->>FE: Pede reabertura manualmente
    FE->>C: POST /api/decia/sessions/{id}/reopen-requests {justification "ok"}
    C->>S: ReopenService.request(actor, sessionId, decisionId, justification)
    S-->>C: 422 VALIDACAO
    C-->>FE: 422
  else RF14.CA03 — decisão não está DEVOLVIDA
    FE->>C: POST .../reopen-requests
    C->>S: request(...)
    S->>DB: SELECT final_decisions.status ≠ DEVOLVIDA
    S-->>C: 409 DECISAO_NAO_DEVOLVIDA
  else RF14.CA04 — pedido já decidido
    FE->>C: POST .../votes
    C->>S: vote(...)
    S->>DB: SELECT reopen_requests.status IN (ACEITA, RECUSADA)
    S-->>C: 409 PEDIDO_ENCERRADO
    C-->>FE: 409
  else RF14.CA02 — admin recusa
    FE->>C: POST .../decide {outcome RECUSADA}
    C->>S: decide(..., RECUSADA)
    S->>DB: UPDATE reopen_requests SET status = RECUSADA, decidedAt
    S-->>C: 200 {session permanece EM_REVISAO}
    EV-->>S: NotificationPort.notifyGroup(participantes, REABERTURA_RECUSADA)
  end
```

## 4. Máquina de estados

Entidade central: `ReopenRequest.status` (PENDENTE → ACEITA | RECUSADA), acoplada à transição EM_REVISAO → REABERTA de `SessionStatus` (`DeciaSession`).

```mermaid
stateDiagram-v2
  [*] --> PENDENTE : decisão DEVOLVIDA (RF15) → IA cria pedido com justificativa — RF14.CA01
  [*] --> PENDENTE : pedido manual de participante (justification ≥ 20 chars) — RF14.CA03
  PENDENTE --> PENDENTE : voto ACEITAR/RECUSAR registrado em votesJson (upsert por userId) — RF14.CA02
  PENDENTE --> ACEITA : admin aceita ou maioria simples ao fim do prazo — RF14.CA02
  PENDENTE --> RECUSADA : admin recusa ou maioria recusa ao fim do prazo — RF14.CA02
  ACEITA --> [*]
  RECUSADA --> [*]

  state "SessionStatus (DeciaSession)" as Sess {
    EM_REVISAO --> REABERTA : ReopenRequest ACEITA
    REABERTA --> EM_RESUMO : novo ciclo RF11 → RF12 → RF15 — RF14.CA05
    EM_REVISAO --> ENCERRADA : ReopenRequest RECUSADA → admin encerra (RF17)
  }

  ACEITA --> REABERTA : dispara
  RECUSADA --> ENCERRADA : libera encerramento

  note right of PENDENTE
    máximo 1 PENDENTE por decisionId
    novo voto após decisão → 409 PEDIDO_ENCERRADO
  end note
  note right of REABERTA
    chat volta a aceitar mensagens (RF6)
    decisão DEVOLVIDA + motivo fixados como contexto
    ao nascer nova FinalDecision, a DEVOLVIDA → SUBSTITUIDA
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/decia/[sessionId]/page.tsx — banner ReopenRequest"]
    FE2["components/ui/ReopenBanner · VoteButtons · DecideReopenDialog"]
  end

  subgraph WEB["ws-web"]
    W1["ReopenController (REST /api/decia/sessions/{id}/reopen-requests)"]
    W2["SessionAccessGuard (MEMBRO ativo / adminUserId)"]
  end

  subgraph APP["ws-application"]
    S1["ReopenService (+ listener DecisionReturned, timer closeExpired)"]
    S2["SessionLifecycleService"]
    S3["DecisionService.supersede"]
    S4["DecisionTraceService"]
    P1["AiEnginePort"]
    P2["NotificationPort"]
    P3["SessionMessageRepositoryPort"]
    P4["DomainEventPublisher (outbox)"]
  end

  subgraph DOM["ws-domain"]
    D1["ReopenRequest"]
    D2["FinalDecision · DecisionReview · DeciaSession · SessionParticipant"]
    D3["DecisionTraceNode · DecisionTraceEdge"]
    D4["Enums: ReopenStatus · SessionStatus · DecisionStatus"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["persistence-mysql: ReopenRequestRepository, FinalDecisionRepository, DecisionReviewRepository, DeciaSessionRepository, SessionParticipantRepository, DecisionTraceRepository, DomainEventOutboxRepository, AuditLogRepository"]
    I2["persistence-cassandra: CassandraMessageAdapter, NotificationFeedAdapter"]
    I3["ai-providers: AiEngineAdapter (justificativa, ai_inference_log)"]
    I4["platform: NotificationAdapter, OutboxRelay, SchedulerAdapter (prazo de votação)"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]

  FE1 --> FE2 -->|HTTPS/JSON| W1 --> W2 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> P1
  S1 --> P2
  S1 --> P3
  S1 --> P4
  P4 -.->|AFTER_COMMIT DecisionReturned| S1
  P4 -.->|AFTER_COMMIT SessionReopened| P2
  S1 --> D1
  S1 --> D2
  S4 --> D3
  D1 --> D4
  P1 -.-> I3
  P2 -.-> I4
  P3 -.-> I2
  I4 -.->|timer| S1
  S1 --> I1
  S4 --> I1
  I1 --> MY
  I2 --> CA
  I3 --> X1
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF14.CA01 | `ReopenRequest` (requestedBy = IA, justification, decisionId), `ReopenService.onDecisionReturned`, `AiEnginePort.draftReopenJustification`, `SessionMessage` (IA), `NotificationPort` | A0, C0–C5, D1, D2 | 1–10 | [*] → PENDENTE | `ReopenService`, `AiEngineAdapter`, `CassandraMessageAdapter`, `NotificationAdapter` |
| RF14.CA02 | `ReopenRequest.votesJson/status/decidedAt`, `ReopenService.vote/decide/closeExpired`, `SessionLifecycleService` (EM_REVISAO → REABERTA) | A2–A7, B2, B3, C6–C11, C14, F1, F2 | 11–36; `alt` RF14.CA02 (RECUSADA) | PENDENTE → PENDENTE (voto); PENDENTE → ACEITA / RECUSADA; EM_REVISAO → REABERTA | `ReopenController`, `VoteButtons`, `SchedulerAdapter`, `SessionLifecycleService` |
| RF14.CA03 | `ReopenService.request` (validação ≥ 20 chars), `FinalDecision.status DEVOLVIDA`, `SessionAccessGuard` | B4, C15, B7, B6, B5 | `alt` 422 VALIDACAO; `alt` 409 DECISAO_NAO_DEVOLVIDA | [*] → PENDENTE (manual) | `ReopenController.create`, `SessionAccessGuard` |
| RF14.CA04 | unicidade PENDENTE por `decisionId` (índice), upsert em `votesJson` | C1, C7, B6 | `alt` 409 PEDIDO_ENCERRADO; 3 (SELECT PENDENTE → nenhum) | nota de PENDENTE | `ReopenRequestRepository` |
| RF14.CA05 | `DecisionService.supersede` (DEVOLVIDA → SUBSTITUIDA), `DecisionTraceEdge` ORIGINOU, novo ciclo RF11–RF15 | A6, C12, C13 | 32 (trace), 36 | REABERTA → EM_RESUMO; DEVOLVIDA → SUBSTITUIDA (RF12) | `DecisionService`, `DecisionTraceService` |
