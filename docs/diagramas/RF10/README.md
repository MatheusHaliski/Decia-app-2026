# RF10 — Permitir que o grupo ou usuário ativo na sessão possa responder uma divergência apontada pela IA
**HU:** HU10 · **Sprint (board Work Station):** 2 · **Equivalente FAI:** card RF10 não cita equivalente; pelo Mapa de equivalência o DECIA é o **RF10 Copilot** do FAI (mensagem do Copilot → mensagem do DECIA) · **Aba/rota:** DECIA — sessão (`/decia/[sessionId]`, painel "Divergências"; rota a confirmar)
**Critérios de aceite cobertos:** RF10.CA01 · RF10.CA02 · RF10.CA03 · RF10.CA04 · RF10.CA05 · RF10.CA06 (RF1–RF18 não têm CAs no board: derivados da HU10 + RF8/RF29/RF42 e marcados "CA a confirmar")

> **HU10** — COMO administrador da sessão de conversa POSSO habilitar que grupo ou usuário ativo responda uma divergência PARA permitir que os participantes esclareçam ou resolvam os pontos divergentes da discussão.

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF10.CA01** | Dado uma `Divergence` ABERTA detectada pela IA (RF8), quando o administrador da sessão habilita a resposta para **o grupo** ou para **um participante**, então `SessionParticipant.canReplyDivergence` é marcado nos habilitados, a divergência passa a EM_RESPOSTA e os habilitados recebem `Notification` (categoria DECIA). |
| **RF10.CA02** | Dado um participante habilitado, quando envia a resposta (mensagem com `replyToMessageId` = `originMessageId` da divergência), então é criado `DivergenceReply` ligado à `Divergence` e à `SessionMessage`; participante **não habilitado** recebe `403 ACESSO_NEGADO`. |
| **RF10.CA03** | Dado uma resposta registrada, quando a IA (capability DETECTAR_DIVERGENCIA) a avalia, então marca `DivergenceReply.resolves`; com `resolves=true` a divergência passa a RESOLVIDA (`resolvedByReplyId`, `resolvedAt`) e o grupo é notificado; com `false` permanece EM_RESPOSTA. |
| **RF10.CA04** | Dado divergência RESOLVIDA, quando o evento `DivergenceResolved` é publicado AFTER_COMMIT, então o autor da resposta recebe **+8 DP** (`PointsEvent.DIVERGENCIA_RESOLVIDA`) em lançamento idempotente (RF42.CA01) e o Rastro de Decisão ganha nó DIVERGENCIA → aresta RESPONDEU → nó MENSAGEM (RF29). |
| **RF10.CA05** | Dado sessão fora de ATIVA/REABERTA → `409 SESSAO_NAO_ATIVA`; divergência já RESOLVIDA ou SEM_CONSENSO → `409 DIVERGENCIA_ENCERRADA`; resposta vazia → `422 VALIDACAO`. |
| **RF10.CA06** | Dado divergência sem resposta resolutiva, quando o administrador a encerra como SEM_CONSENSO (ou o resumo RF11 é gerado), então ela consta em `divergencesJson` do resumo analítico. |

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
    +AiMode aiMode
    +int messageCount
    +int participantCount
  }
  class SessionParticipant {
    <<entity>>
    +UUID id
    +UUID sessionId
    +UUID userId
    +ParticipantRole role
    +boolean canReplyDivergence
    +Instant joinedAt
    +Instant leftAt
  }
  class SessionMessage {
    <<entity>>
    +TIMEUUID id
    +UUID sessionId
    +UUID authorId
    +AuthorKind authorKind
    +String bodyMd
    +TIMEUUID replyToMessageId
    +Instant sentAt
    +UUID classificationId
    +String correlationId
  }
  class MessageClassification {
    <<entity>>
    +UUID id
    +UUID messageId
    +MessageClass label
    +BigDecimal confidence
    +boolean hasEvidence
    +UUID aiInferenceId
  }
  class Divergence {
    <<entity>>
    +UUID id
    +UUID sessionId
    +TIMEUUID originMessageId
    +boolean detectedByAi
    +String summary
    +String partiesJson
    +DivergenceStatus status
    +UUID resolvedByReplyId
    +Instant resolvedAt
    +Instant notifiedAt
    +UUID aiInferenceId
  }
  class DivergenceReply {
    <<entity>>
    +UUID id
    +UUID divergenceId
    +UUID authorId
    +TIMEUUID messageId
    +boolean resolves
    +Instant at
  }
  class DecisionTraceNode {
    <<entity>>
    +UUID id
    +UUID sessionId
    +TraceNodeType nodeType
    +UUID refId
    +String label
    +String classLabel
    +UUID actorId
    +Instant at
  }
  class DecisionTraceEdge {
    <<entity>>
    +UUID id
    +UUID fromNodeId
    +UUID toNodeId
    +TraceRelation relation
    +Instant at
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +UUID id
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +String refType
    +UUID refId
    +UUID sessionId
    +String idempotencyKey
    +LedgerStatus status
    +String correlationId
  }
  class Notification {
    <<entity>>
    +UUID id
    +UUID recipientId
    +NotificationType type
    +String category
    +String resourceType
    +UUID resourceId
    +String groupKey
  }
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +String provider
    +String result
    +String correlationId
  }

  class SessionStatus {
    <<enum>>
    PROPOSTA
    ATIVA
    EM_RESUMO
    EM_DECISAO
    EM_REVISAO
    REABERTA
    ENCERRADA
    ARQUIVADA
  }
  class DivergenceStatus {
    <<enum>>
    ABERTA
    EM_RESPOSTA
    RESOLVIDA
    SEM_CONSENSO
  }
  class MessageClass {
    <<enum>>
    ARGUMENTO
    DIVERGENCIA
    RISCO
    CONSENSO
    PERGUNTA
    RUIDO
  }
  class ParticipantRole {
    <<enum>>
    ADMIN
    MEMBRO
    OBSERVADOR
    IA
  }
  class PointsEvent {
    <<enum>>
    DIVERGENCIA_RESOLVIDA
    ARGUMENTO_EVIDENCIA
    CONSENSO
    PERGUNTA_RESPONDIDA
  }

  class DivergenceController {
    <<controller>>
    +enableReply(sessionId, divergenceId, EnableReplyForm) 200
    +reply(sessionId, divergenceId, ReplyForm) 201
    +closeWithoutConsensus(sessionId, divergenceId) 200
    +list(sessionId) 200
  }
  class DivergenceService {
    <<service>>
    +enableReply(actor, sessionId, divergenceId, scope, userId)
    +reply(actor, sessionId, divergenceId, bodyMd, attachments)
    +evaluateReply(divergenceId, replyId)
    +closeWithoutConsensus(actor, divergenceId)
  }
  class DeciaPointsService {
    <<service>>
    +onDivergenceResolved(event) AFTER_COMMIT
    +credit(userId, eventCode, refId, sessionId)
  }
  class DecisionTraceService {
    <<service>>
    +appendNode(sessionId, nodeType, refId, label)
    +appendEdge(fromNodeId, toNodeId, relation)
  }
  class AiEnginePort {
    <<port>>
    +evaluateDivergenceReply(context) AiResult
  }
  class NotificationPort {
    <<port>>
    +notify(recipients, type, resource)
  }
  class SessionMessageRepositoryPort {
    <<port>>
    +append(SessionMessage)
    +findById(sessionId, messageId)
  }
  class DivergenceRepository {
    <<adapter>>
    MySQL divergences
  }
  class DivergenceReplyRepository {
    <<adapter>>
    MySQL divergence_replies
  }
  class CassandraMessageAdapter {
    <<adapter>>
    messages_by_session
  }
  class AiEngineAdapter {
    <<adapter>>
    Claude e Gemini com fallback local
  }

  DeciaSession "1" --> "*" SessionParticipant : participantes
  DeciaSession "1" --> "*" Divergence : divergências
  DeciaSession --> SessionStatus
  SessionParticipant --> ParticipantRole
  Divergence --> DivergenceStatus
  Divergence "1" --> "*" DivergenceReply : respostas
  Divergence ..> SessionMessage : originMessageId
  Divergence ..> DivergenceReply : resolvedByReplyId
  Divergence ..> AiInferenceLog : aiInferenceId
  DivergenceReply ..> SessionMessage : messageId
  SessionMessage "1" --> "0..1" MessageClassification : classificationId
  MessageClassification --> MessageClass
  DecisionTraceEdge --> DecisionTraceNode : fromNodeId
  DecisionTraceEdge --> DecisionTraceNode : toNodeId
  DecisionTraceNode ..> Divergence : refId quando DIVERGENCIA
  DeciaPointsLedgerEntry --> PointsEvent
  DeciaPointsLedgerEntry ..> DivergenceReply : refId

  DivergenceController --> DivergenceService
  DivergenceService --> DivergenceRepository
  DivergenceService --> DivergenceReplyRepository
  DivergenceService --> SessionMessageRepositoryPort
  DivergenceService --> AiEnginePort
  DivergenceService --> NotificationPort
  DivergenceService --> DecisionTraceService
  DivergenceService ..> DeciaPointsService : evento DivergenceResolved
  SessionMessageRepositoryPort <|.. CassandraMessageAdapter
  AiEnginePort <|.. AiEngineAdapter
  DeciaPointsService --> DeciaPointsLedgerEntry : INSERT idempotente

  note for Divergence "tabela divergences — status ABERTA, EM_RESPOSTA, RESOLVIDA, SEM_CONSENSO"
  note for SessionParticipant "tabela session_participants — canReplyDivergence habilitado pelo admin (RF10) .. +4 campos .."
  note for SessionMessage "Cassandra messages_by_session + índice MySQL session_messages_idx .. +5 campos .."
  note for DeciaPointsLedgerEntry "decia_points_ledger — idempotencyKey = tipo + idEvento + usuário .. +9 campos .."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Administrador da sessão / Participante"]
    A0(["Divergência ABERTA no painel (RF8)"])
    A1["Admin abre a divergência e escolhe habilitar resposta"]
    A2{"Escopo?"}
    A3["Habilitar para o GRUPO"]
    A4["Habilitar para um PARTICIPANTE"]
    A5["Participante habilitado escreve a resposta"]
    A6["Admin decide encerrar SEM_CONSENSO"]
    A7(["Fim"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["POST /api/decia/sessions/{id}/divergences/{divId}/enable-reply"]
    B2["POST /api/decia/sessions/{id}/divergences/{divId}/replies"]
    B3["POST /api/decia/sessions/{id}/divergences/{divId}/close"]
    B4["Exibe 403 ACESSO_NEGADO"]
    B5["Exibe 409 SESSAO_NAO_ATIVA ou 409 DIVERGENCIA_ENCERRADA"]
    B6["Exibe 422 VALIDACAO"]
    B7["Atualiza painel: divergência RESOLVIDA ✓ e toast +8 DP"]
    B8["Atualiza painel: continua EM_RESPOSTA"]
  end

  subgraph L3["ws-application (DivergenceService)"]
    C1{"actor = adminUserId?"}
    C2{"session.status em ATIVA ou REABERTA?"}
    C3{"divergence.status em ABERTA ou EM_RESPOSTA?"}
    C4["Marca canReplyDivergence nos habilitados"]
    C5["Divergence.status = EM_RESPOSTA"]
    C6["Notifica habilitados (categoria DECIA)"]
    C7{"actor.canReplyDivergence?"}
    C8{"bodyMd não vazio e anexos ≤ 5?"}
    C9["Cria SessionMessage com replyToMessageId = originMessageId"]
    C10["Cria DivergenceReply (resolves = null)"]
    C11["Chama IA: avaliar se a resposta resolve"]
    C12{"resolves?"}
    C13["Divergence.status = RESOLVIDA; resolvedByReplyId; resolvedAt"]
    C14["Publica DivergenceResolved (outbox)"]
    C15["Divergence.status = SEM_CONSENSO"]
    C16["Append rastro: nó DIVERGENCIA → RESPONDEU → nó MENSAGEM"]
  end

  subgraph L4["IA (AiEngine)"]
    D1["DETECTAR_DIVERGENCIA: compara resposta × partiesJson × summary"]
    D2["Retorna resolves, confidence, rationale"]
    D3["Registra AiInferenceLog"]
  end

  subgraph L5["Persistência"]
    E1[("MySQL divergences / session_participants")]
    E2[("Cassandra messages_by_session")]
    E3[("MySQL divergence_replies")]
    E4[("MySQL domain_events + decia_points_ledger")]
    E5[("MySQL decision_trace_nodes / edges")]
  end

  subgraph L6["Listeners AFTER_COMMIT"]
    F1["DeciaPointsService: +8 DP DIVERGENCIA_RESOLVIDA (idempotente)"]
    F2["NotificationPort: grupo informado da resolução"]
  end

  A0 --> A1 --> A2
  A2 -->|grupo| A3 --> B1
  A2 -->|um participante| A4 --> B1
  B1 --> C1
  C1 -->|não| B4 --> A7
  C1 -->|sim| C2
  C2 -->|não| B5 --> A7
  C2 -->|sim| C3
  C3 -->|não| B5
  C3 -->|sim| C4 --> C5 --> E1
  C5 --> C6 --> A5
  A5 --> B2 --> C7
  C7 -->|não| B4
  C7 -->|sim| C8
  C8 -->|não| B6 --> A5
  C8 -->|sim| C9 --> E2
  C9 --> C10 --> E3
  C10 --> C11 --> D1 --> D2 --> D3
  D2 --> C12
  C12 -->|sim| C13 --> E1
  C13 --> C16 --> E5
  C13 --> C14 --> E4
  C14 --> F1 --> E4
  C14 --> F2
  F1 --> B7 --> A7
  C12 -->|não| B8 --> A5
  A6 --> B3 --> C1
  C3 -->|admin encerra| C15 --> E1
  C15 --> A7
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (admin / participante)
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — admin habilita, participante responde, IA marca como resolvida
    U->>FE: Habilitar resposta (escopo GRUPO | userId)
    FE->>C: POST /api/decia/sessions/{id}/divergences/{divId}/enable-reply
    C->>S: DivergenceService.enableReply(actor, sessionId, divId, scope, userId)
    S->>DB: SELECT decia_sessions, divergences (status, adminUserId)
    S->>DB: UPDATE session_participants SET canReplyDivergence = true
    S->>DB: UPDATE divergences SET status = EM_RESPOSTA
    S-->>C: 200 {divergence EM_RESPOSTA, enabledUserIds}
    C-->>FE: 200
    FE-->>U: Painel atualizado — habilitados recebem Notification (DECIA)

    U->>FE: Escreve resposta à divergência
    FE->>C: POST /api/decia/sessions/{id}/divergences/{divId}/replies {bodyMd, attachmentIds}
    C->>S: DivergenceService.reply(actor, sessionId, divId, bodyMd, attachments)
    S->>DB: SELECT session_participants (canReplyDivergence)
    S->>CS: INSERT messages_by_session (replyToMessageId = originMessageId, correlationId)
    S->>DB: INSERT divergence_replies (resolves = null)
    S->>AI: evaluateDivergenceReply(summary, partiesJson, reply)
    AI-->>S: {resolves: true, confidence 0.87, rationale}
    S->>DB: INSERT ai_inference_log (DETECTAR_DIVERGENCIA)
    S->>DB: UPDATE divergence_replies SET resolves = true
    S->>DB: UPDATE divergences SET status = RESOLVIDA, resolvedByReplyId, resolvedAt
    S->>DB: INSERT decision_trace_nodes (MENSAGEM) + decision_trace_edges (RESPONDEU)
    S->>DB: INSERT domain_events (DivergenceResolved)
    S-->>C: 201 {reply, divergence RESOLVIDA}
    C-->>FE: 201
    FE-->>U: Divergência resolvida ✓
    EV-->>S: DeciaPointsService.onDivergenceResolved (AFTER_COMMIT)
    S->>DB: INSERT decia_points_ledger (+8 DIVERGENCIA_RESOLVIDA, idempotencyKey)
    EV-->>S: NotificationPort.notify(grupo, DIVERGENCIA_RESOLVIDA)
  end

  alt RF10.CA02 — participante não habilitado
    U->>FE: Tenta responder
    FE->>C: POST .../replies
    C->>S: reply(...)
    S->>DB: SELECT session_participants (canReplyDivergence = false)
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
    FE-->>U: "Aguarde o administrador habilitar a resposta"
  else RF10.CA05 — sessão não ativa ou divergência encerrada
    FE->>C: POST .../replies
    C->>S: reply(...)
    S->>DB: SELECT decia_sessions.status / divergences.status
    S-->>C: 409 SESSAO_NAO_ATIVA ou 409 DIVERGENCIA_ENCERRADA
    C-->>FE: 409
  else RF10.CA03 — IA conclui que não resolve
    AI-->>S: {resolves: false, rationale}
    S->>DB: UPDATE divergence_replies SET resolves = false
    S-->>C: 201 {reply, divergence EM_RESPOSTA}
    FE-->>U: Resposta registrada — divergência continua aberta
  end
```

## 4. Máquina de estados

Entidade central: `Divergence.status` (`DivergenceStatus`). A sessão (`SessionStatus`) precisa estar em ATIVA ou REABERTA para qualquer transição disparada por humano.

```mermaid
stateDiagram-v2
  [*] --> ABERTA : IA detecta divergência (RF8) e notifica o grupo
  ABERTA --> EM_RESPOSTA : admin habilita resposta (grupo ou participante) — RF10.CA01
  EM_RESPOSTA --> EM_RESPOSTA : resposta registrada e IA marca resolves = false — RF10.CA03
  EM_RESPOSTA --> RESOLVIDA : IA marca resolves = true (resolvedByReplyId, resolvedAt) — RF10.CA03
  ABERTA --> SEM_CONSENSO : admin encerra sem resposta — RF10.CA06
  EM_RESPOSTA --> SEM_CONSENSO : admin encerra ou resumo RF11 gerado sem resolução — RF10.CA06
  RESOLVIDA --> [*]
  SEM_CONSENSO --> [*]

  note right of RESOLVIDA
    AFTER_COMMIT: +8 DP ao autor da resposta (DIVERGENCIA_RESOLVIDA)
    rastro DIVERGENCIA → RESPONDEU → MENSAGEM
    estado terminal: nova resposta → 409 DIVERGENCIA_ENCERRADA
  end note
  note left of SEM_CONSENSO
    consta em divergencesJson do AnalyticalSummary (RF11)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/decia/[sessionId]/page.tsx — painel Divergências"]
    FE2["components/ui/DivergenceCard · ReplyComposer · EnableReplyDialog"]
  end

  subgraph WEB["ws-web"]
    W1["DivergenceController (REST /api/decia/sessions/{id}/divergences)"]
    W2["SessionAccessGuard (adminUserId, canReplyDivergence)"]
  end

  subgraph APP["ws-application"]
    S1["DivergenceService"]
    S2["DecisionTraceService"]
    S3["DeciaPointsService (listener AFTER_COMMIT)"]
    P1["AiEnginePort"]
    P2["SessionMessageRepositoryPort"]
    P3["NotificationPort"]
    P4["DomainEventPublisher (outbox)"]
  end

  subgraph DOM["ws-domain"]
    D1["Divergence · DivergenceReply · SessionParticipant"]
    D2["DecisionTraceNode · DecisionTraceEdge"]
    D3["DeciaPointsLedgerEntry · DeciaPointsRule"]
    D4["Enums: DivergenceStatus · SessionStatus · PointsEvent"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["persistence-mysql: DivergenceRepository, DivergenceReplyRepository, SessionParticipantRepository, DecisionTraceRepository, DeciaPointsLedgerRepository, DomainEventOutboxRepository"]
    I2["persistence-cassandra: CassandraMessageAdapter (messages_by_session)"]
    I3["ai-providers: AiEngineAdapter (Strategy + Chain of Responsibility, circuit breaker, ai_inference_log)"]
    I4["platform: NotificationAdapter, AuditLogAdapter, OutboxRelay"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]

  FE1 --> FE2
  FE2 -->|HTTPS/JSON| W1
  W1 --> W2 --> S1
  S1 --> S2
  S1 --> P1
  S1 --> P2
  S1 --> P3
  S1 --> P4
  P4 -.->|AFTER_COMMIT DivergenceResolved| S3
  S1 --> D1
  S2 --> D2
  S3 --> D3
  D1 --> D4
  P1 -.-> I3
  P2 -.-> I2
  P3 -.-> I4
  S1 --> I1
  S2 --> I1
  S3 --> I1
  I1 --> MY
  I2 --> CA
  I3 --> X1
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF10.CA01 | `SessionParticipant.canReplyDivergence`, `Divergence.status`, `DivergenceService.enableReply`, `NotificationPort` | A1–A4, B1, C1–C6 | 1–9 (enable-reply → UPDATE session_participants / divergences → Notification) | ABERTA → EM_RESPOSTA | `DivergenceController`, `SessionAccessGuard`, `DivergenceService`, `NotificationAdapter` |
| RF10.CA02 | `DivergenceReply`, `SessionMessage.replyToMessageId`, `DivergenceService.reply` | A5, B2, C7–C10, E2, E3 | 10–14 (INSERT messages_by_session + divergence_replies); `alt` 403 ACESSO_NEGADO | EM_RESPOSTA (sem transição) | `CassandraMessageAdapter`, `DivergenceReplyRepository` |
| RF10.CA03 | `DivergenceReply.resolves`, `Divergence.resolvedByReplyId/resolvedAt`, `AiEnginePort.evaluateDivergenceReply`, `AiInferenceLog` | C11–C13, D1–D3, B7/B8 | 15–19; `alt` resolves=false | EM_RESPOSTA → RESOLVIDA / EM_RESPOSTA → EM_RESPOSTA | `AiEngineAdapter`, Claude/Gemini |
| RF10.CA04 | `DeciaPointsLedgerEntry` (DIVERGENCIA_RESOLVIDA, idempotencyKey), `DeciaPointsService.onDivergenceResolved`, `DecisionTraceNode/Edge` (RESPONDEU) | C14, C16, F1, F2, E4, E5 | 20–26 (outbox → AFTER_COMMIT → ledger + notificação) | nota de RESOLVIDA | `DeciaPointsService`, `DecisionTraceService`, `OutboxRelay`, `DeciaPointsLedgerRepository` |
| RF10.CA05 | `DeciaSession.status`, `Divergence.status` (guardas) | C2, C3, C8, B5, B6 | `alt` 409 SESSAO_NAO_ATIVA / 409 DIVERGENCIA_ENCERRADA | RESOLVIDA e SEM_CONSENSO terminais | `SessionAccessGuard`, `DivergenceService` |
| RF10.CA06 | `Divergence.status = SEM_CONSENSO`, `DivergenceService.closeWithoutConsensus`, `AnalyticalSummary.divergencesJson` (RF11) | A6, B3, C15 | — (fluxo do admin; ver RF11) | ABERTA/EM_RESPOSTA → SEM_CONSENSO | `DivergenceController.closeWithoutConsensus` |
