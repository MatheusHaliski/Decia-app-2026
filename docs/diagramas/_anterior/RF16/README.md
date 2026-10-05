# RF16 — Formular perguntas ao grupo quando for identificado um ponto crítico na análise do tema da conversa
**HU:** HU16 · **Sprint (board Work Station):** 3 · **Equivalente FAI:** card RF16 não cita equivalente; pelo Mapa de equivalência o DECIA é o **RF10 Copilot** do FAI (o Copilot pergunta ao usuário para refinar a sugestão) — aqui a pergunta é dirigida ao grupo e auditada (`ai_questions`) · **Aba/rota:** DECIA — sessão › painel lateral "Perguntas da IA" (`/decia/[sessionId]`; rota a confirmar)
**Critérios de aceite cobertos:** RF16.CA01 · RF16.CA02 · RF16.CA03 · RF16.CA04 · RF16.CA05 · RF16.CA06 (RF1–RF18 não têm CAs no board: derivados da HU16 + RF7, RF8, RF11, RF33.CA03, RF42 e marcados "CA a confirmar")

> **HU16** — COMO IA do sistema POSSO formular perguntas ao grupo quando identificar um ponto crítico na análise do tema da conversa PARA esclarecer o ponto crítico e garantir que a análise do tema avance com clareza.

Diferença para o RF8: o RF8 formaliza perguntas a partir de mensagens **RISCO** (`AiQuestion.kind = RISCO`); o RF16 detecta **pontos críticos** da análise (`kind = PONTO_CRITICO`): lacuna de evidência numa recomendação, conflito com o plano anual (RF24) ou com o Espelho de Conformidade (RF32), prazo legal em risco (RF20.CA11), argumento central sem contraditório.

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF16.CA01** | Dado mensagens classificadas (RF7) e o contexto da sessão, quando a IA (capability FORMULAR_PERGUNTA) detecta um ponto crítico, então cria `AiQuestion` (kind PONTO_CRITICO, status ABERTA) com `questionText`, `basisMessageIds` e `citationsJson` (RF33.CA03 — "baseado em") e posta `SessionMessage` (authorKind IA) classificada como PERGUNTA. |
| **RF16.CA02** | Dado a pergunta criada, então o grupo recebe `Notification` (categoria DECIA) e a pergunta fica **fixada** no painel lateral até ser RESPONDIDA ou IGNORADA; nó PERGUNTA entra no rastro (RF29) com arestas ORIGINOU a partir das mensagens-base. |
| **RF16.CA03** | Dado um participante responde (mensagem com `replyToMessageId` = mensagem da pergunta), quando a IA avalia a resposta, então `status = RESPONDIDA`, `answeredByMessageId` e `answeredWithEvidence` (true se cita tarefa/anexo/fonte); com evidência, evento AFTER_COMMIT credita **+4 DP** (`PERGUNTA_RESPONDIDA`, idempotente, RF42.CA01). Resposta sem evidência mantém ABERTA com aviso "cite uma fonte para encerrar". |
| **RF16.CA04** | Dado pergunta ABERTA até a geração do resumo (RF11) ou descartada pelo administrador ("Descartar"), então `status = IGNORADA` e ela consta em `attentionPointsJson` do resumo. |
| **RF16.CA05** | Dado ≥ 3 perguntas ABERTAS na sessão ou pergunta similar já aberta (similaridade > 90 % do `questionText`), então a IA **não duplica**; em `aiMode` ECONOMIA a detecção roda a cada N mensagens; tudo registrado em `ai_inference_log`. |
| **RF16.CA06** | Dado sessão fora de ATIVA/REABERTA, então a IA não formula perguntas; resposta a pergunta RESPONDIDA/IGNORADA → `409 PERGUNTA_ENCERRADA`; descarte por não-admin → `403 ACESSO_NEGADO`. |

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
    +UUID planAxisId
    +SessionStatus status
    +AiMode aiMode
  }
  class SessionMessage {
    <<entity>>
    +TIMEUUID id
    +UUID sessionId
    +UUID authorId
    +AuthorKind authorKind
    +String bodyMd
    +TIMEUUID replyToMessageId
    +String attachmentsJson
    +String similarityHash
    +Instant sentAt
  }
  class MessageClassification {
    <<entity>>
    +UUID id
    +UUID messageId
    +MessageClass label
    +BigDecimal confidence
    +boolean hasEvidence
    +String evidenceRefsJson
    +UUID linkedTaskId
  }
  class AiQuestion {
    <<entity>>
    +UUID id
    +UUID sessionId
    +QuestionKind kind
    +String questionText
    +String basisMessageIds
    +QuestionStatus status
    +TIMEUUID answeredByMessageId
    +boolean answeredWithEvidence
    +UUID aiInferenceId
    +String citationsJson
  }
  class Citation {
    <<entity>>
    +String sourceType
    +UUID sourceId
    +String excerpt
    +String url
    +BigDecimal score
  }
  class ComplianceResult {
    <<entity>>
    +UUID id
    +UUID projectId
    +int blockingCount
    +String itemsJson
  }
  class PlanAxis {
    <<entity>>
    +UUID id
    +String name
    +String goal
    +String aggregatedRisk
  }
  class DecisionTraceNode {
    <<entity>>
    +UUID id
    +TraceNodeType nodeType
    +UUID refId
    +String label
    +String classLabel
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +UUID id
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +UUID refId
    +String idempotencyKey
  }
  class Notification {
    <<entity>>
    +UUID id
    +UUID recipientId
    +NotificationType type
    +String category
    +UUID resourceId
  }
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +AiMode mode
    +String provider
    +String result
    +BigDecimal confidence
  }

  class QuestionKind {
    <<enum>>
    RISCO
    PONTO_CRITICO
    ESCLARECIMENTO
  }
  class QuestionStatus {
    <<enum>>
    ABERTA
    RESPONDIDA
    IGNORADA
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
  class SessionStatus {
    <<enum>>
    ATIVA
    REABERTA
    EM_RESUMO
  }
  class PointsEvent {
    <<enum>>
    PERGUNTA_RESPONDIDA
    ARGUMENTO_EVIDENCIA
  }

  class AiQuestionController {
    <<controller>>
    +list(sessionId, status) 200
    +dismiss(sessionId, questionId) 200
  }
  class AiQuestionService {
    <<service>>
    +onMessageClassified(event) AFTER_COMMIT
    +detectCriticalPoint(sessionId) Optional~AiQuestion~
    +onReplyToQuestion(sessionId, messageId) AFTER_COMMIT
    +dismiss(actor, sessionId, questionId)
    +ignoreOpenOnSummary(sessionId)
    -isDuplicate(sessionId, questionText) boolean
  }
  class DecisionTraceService {
    <<service>>
    +appendNode(sessionId, PERGUNTA, questionId)
    +appendEdge(messageNode, questionNode, ORIGINOU)
  }
  class DeciaPointsService {
    <<service>>
    +onQuestionAnswered(event) AFTER_COMMIT
  }
  class AiEnginePort {
    <<port>>
    +detectCriticalPoint(context) Optional~QuestionDraft~
    +evaluateAnswer(question, reply) AnswerEvaluation
  }
  class MemorySearchPort {
    <<port>>
    +searchCitations(query, filters) List~Citation~
  }
  class SessionMessageRepositoryPort {
    <<port>>
    +append(SessionMessage)
    +findRecent(sessionId, limit) List~SessionMessage~
  }
  class NotificationPort {
    <<port>>
    +notifyGroup(recipients, type, resource)
  }
  class AiQuestionRepository {
    <<adapter>>
    MySQL ai_questions
  }
  class CassandraMessageAdapter {
    <<adapter>>
    messages_by_session
  }
  class OpenSearchMemoryAdapter {
    <<adapter>>
    índice ws-memory
  }
  class AiEngineAdapter {
    <<adapter>>
    Claude e Gemini com fallback local
  }

  DeciaSession "1" --> "*" AiQuestion : perguntas
  DeciaSession --> SessionStatus
  AiQuestion --> QuestionKind
  AiQuestion --> QuestionStatus
  AiQuestion ..> SessionMessage : basisMessageIds / answeredByMessageId
  AiQuestion ..> Citation : citationsJson
  AiQuestion ..> AiInferenceLog : aiInferenceId
  AiQuestion ..> ComplianceResult : ponto crítico de conformidade
  AiQuestion ..> PlanAxis : ponto crítico de alinhamento
  SessionMessage "1" --> "0..1" MessageClassification
  MessageClassification --> MessageClass
  DecisionTraceNode ..> AiQuestion : refId quando PERGUNTA
  DeciaPointsLedgerEntry --> PointsEvent
  DeciaPointsLedgerEntry ..> AiQuestion : refId PERGUNTA_RESPONDIDA
  Notification ..> AiQuestion : resourceId

  AiQuestionController --> AiQuestionService
  AiQuestionService --> AiEnginePort
  AiQuestionService --> MemorySearchPort
  AiQuestionService --> SessionMessageRepositoryPort
  AiQuestionService --> NotificationPort
  AiQuestionService --> DecisionTraceService
  AiQuestionService --> AiQuestionRepository
  AiQuestionService ..> DeciaPointsService : evento QuestionAnswered
  AiEnginePort <|.. AiEngineAdapter
  MemorySearchPort <|.. OpenSearchMemoryAdapter
  SessionMessageRepositoryPort <|.. CassandraMessageAdapter

  note for AiQuestion "tabela ai_questions — kind RISCO (RF8), PONTO_CRITICO (RF16), ESCLARECIMENTO .. status ABERTA, RESPONDIDA, IGNORADA"
  note for AiQuestionService "onMessageClassified: listener AFTER_COMMIT do RF7 .. teto 3 ABERTAS por sessão, dedupe por similaridade > 90 %"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Grupo / Administrador da sessão"]
    A0(["Mensagens enviadas e classificadas (RF6/RF7)"])
    A1["Grupo recebe notificação e vê a pergunta fixada no painel"]
    A2{"Alguém responde?"}
    A3["Participante responde citando tarefa, anexo ou fonte"]
    A4["Participante responde sem evidência"]
    A5["Admin descarta a pergunta"]
    A6["Resumo analítico é gerado (RF11)"]
    A7(["Fim"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["Painel lateral: GET /api/decia/sessions/{id}/questions?status=ABERTA"]
    B2["POST /api/decia/sessions/{id}/messages {replyToMessageId = pergunta} (RF6)"]
    B3["POST /api/decia/sessions/{id}/questions/{qid}/dismiss"]
    B4["Exibe 403 ACESSO_NEGADO"]
    B5["Exibe 409 PERGUNTA_ENCERRADA"]
    B6["Pergunta marcada RESPONDIDA ✓ e toast +4 DP"]
    B7["Aviso: cite uma fonte para encerrar a pergunta"]
  end

  subgraph L3["ws-application (AiQuestionService)"]
    C0["Listener MessageClassified (AFTER_COMMIT)"]
    C1{"session.status em ATIVA ou REABERTA?"}
    C2{"aiMode ECONOMIA: contador de mensagens atingiu N?"}
    C3{"perguntas ABERTAS < 3?"}
    C4["Monta contexto: últimas classificações, divergências, ComplianceResult, PlanAxis, prazos legais"]
    C5["AiEnginePort.detectCriticalPoint"]
    C6{"ponto crítico encontrado?"}
    C7{"similar a pergunta ABERTA (> 90 %)?"}
    C8["MemorySearchPort.searchCitations"]
    C9["INSERT AiQuestion PONTO_CRITICO ABERTA (basisMessageIds, citationsJson)"]
    C10["SessionMessage authorKind IA (classificada PERGUNTA)"]
    C11["Rastro: nó PERGUNTA + arestas ORIGINOU"]
    C12["NotificationPort.notifyGroup"]
    C13["Listener onReplyToQuestion: replyToMessageId aponta para pergunta"]
    C14{"pergunta ABERTA?"}
    C15["AiEnginePort.evaluateAnswer"]
    C16{"answeredWithEvidence?"}
    C17["status = RESPONDIDA, answeredByMessageId, answeredWithEvidence = true"]
    C18["Publica QuestionAnswered (outbox)"]
    C19["Mantém ABERTA; registra tentativa"]
    C20{"actor = adminUserId?"}
    C21["status = IGNORADA"]
    C22["ignoreOpenOnSummary: ABERTAS → IGNORADA; entram em attentionPointsJson"]
  end

  subgraph L4["IA (AiEngine)"]
    D1["FORMULAR_PERGUNTA: lacuna de evidência, conflito com plano/conformidade, prazo legal, argumento sem contraditório"]
    D2["Redige questionText + baseado em …"]
    D3["Avalia resposta: cita tarefa/anexo/fonte?"]
    D4["AiInferenceLog (mode, provider, confidence)"]
  end

  subgraph L5["Persistência"]
    E1[("MySQL ai_questions · message_classifications · compliance_results · plan_axes")]
    E2[("Cassandra messages_by_session · notifications_by_user")]
    E3[("OpenSearch ws-memory")]
    E4[("MySQL decision_trace_nodes/edges · domain_events · decia_points_ledger")]
  end

  subgraph L6["Listeners AFTER_COMMIT"]
    F1["DeciaPointsService: +4 DP PERGUNTA_RESPONDIDA (idempotente)"]
    F2["NotificationPort: grupo — pergunta respondida"]
  end

  A0 --> C0 --> C1
  C1 -->|não| A7
  C1 -->|sim| C2
  C2 -->|não| A7
  C2 -->|sim| C3
  C3 -->|não| A7
  C3 -->|sim| C4 --> E1
  C4 --> C5 --> D1 --> D2 --> D4 --> C6
  C6 -->|não| A7
  C6 -->|sim| C7
  C7 -->|sim| A7
  C7 -->|não| C8 --> E3
  C8 --> C9 --> E1
  C9 --> C10 --> E2
  C10 --> C11 --> E4
  C11 --> C12 --> E2
  C12 --> A1 --> B1 --> A2
  A2 -->|com evidência| A3 --> B2 --> C13
  A2 -->|sem evidência| A4 --> B2
  A2 -->|descartar| A5 --> B3 --> C20
  A2 -->|ninguém| A6 --> C22 --> E1
  C22 --> A7
  C13 --> C14
  C14 -->|não| B5 --> A7
  C14 -->|sim| C15 --> D3 --> D4
  D3 --> C16
  C16 -->|sim| C17 --> E1
  C17 --> C18 --> E4
  C18 --> F1 --> E4
  C18 --> F2 --> E2
  F1 --> B6 --> A7
  C16 -->|não| C19 --> B7 --> A2
  C20 -->|não| B4 --> A7
  C20 -->|sim| C21 --> E1
  C21 --> A7
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (participante / admin)
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — IA detecta ponto crítico, pergunta ao grupo, participante responde com evidência
    EV-->>S: AiQuestionService.onMessageClassified(sessionId, messageId, label)
    S->>DB: SELECT decia_sessions (status ATIVA, aiMode) + count(ai_questions ABERTA) < 3
    S->>CS: SELECT messages_by_session (últimas N)
    S->>DB: SELECT message_classifications, divergences, compliance_results, plan_axes, legal_deadline_rules
    S->>AI: detectCriticalPoint(context)
    AI-->>S: QuestionDraft {questionText, basisMessageIds, kind PONTO_CRITICO, confidence}
    S->>DB: SELECT ai_questions ABERTA → similaridade do questionText ≤ 90 %
    S->>OS: kNN ws-memory (questionText, filtros empresa/departamento)
    OS-->>S: Citation[] (ou vazio → "sem precedente")
    S->>DB: INSERT ai_inference_log (FORMULAR_PERGUNTA)
    S->>DB: INSERT ai_questions (PONTO_CRITICO, ABERTA, basisMessageIds, citationsJson)
    S->>CS: INSERT messages_by_session (authorKind IA, bodyMd = pergunta, classification PERGUNTA)
    S->>DB: INSERT decision_trace_nodes (PERGUNTA) + decision_trace_edges (MENSAGEM → PERGUNTA, ORIGINOU)
    S->>CS: INSERT notifications_by_user (participantes, PERGUNTA_IA)

    U->>FE: Vê a pergunta fixada no painel
    FE->>C: GET /api/decia/sessions/{id}/questions?status=ABERTA
    C->>S: AiQuestionService.list(sessionId, ABERTA)
    S->>DB: SELECT ai_questions
    S-->>C: 200 [AiQuestion + citations]
    C-->>FE: 200
    FE-->>U: Pergunta com faísca ✦ e "baseado em"
    U->>FE: Responde citando a tarefa Planilha orçamentária v2
    FE->>C: POST /api/decia/sessions/{id}/messages {bodyMd, replyToMessageId, attachmentIds} (RF6)
    C->>S: SessionMessageService.send(...) → INSERT messages_by_session → evento MessageSent
    EV-->>S: AiQuestionService.onReplyToQuestion(sessionId, messageId)
    S->>DB: SELECT ai_questions WHERE messageId = replyToMessageId AND status = ABERTA
    S->>AI: evaluateAnswer(question, reply, attachments)
    AI-->>S: AnswerEvaluation {answers: true, withEvidence: true, rationale}
    S->>DB: INSERT ai_inference_log
    S->>DB: UPDATE ai_questions SET status = RESPONDIDA, answeredByMessageId, answeredWithEvidence = true
    S->>DB: INSERT decision_trace_edges (PERGUNTA → MENSAGEM, RESPONDEU)
    S->>DB: INSERT domain_events (QuestionAnswered)
    EV-->>S: DeciaPointsService.onQuestionAnswered → INSERT decia_points_ledger (+4 PERGUNTA_RESPONDIDA, idempotencyKey)
    EV-->>S: NotificationPort.notifyGroup(participantes, PERGUNTA_RESPONDIDA)
    FE-->>U: Pergunta marcada RESPONDIDA ✓ e toast +4 DP
  end

  alt RF16.CA03 — resposta sem evidência
    AI-->>S: AnswerEvaluation {answers: true, withEvidence: false}
    S->>DB: UPDATE ai_questions SET answeredWithEvidence = false (status permanece ABERTA)
    FE-->>U: "Cite uma fonte (tarefa, anexo ou memória) para encerrar a pergunta"
  else RF16.CA05 — teto ou duplicata
    S->>DB: count(ai_questions ABERTA) = 3 ou similaridade > 90 %
    S->>DB: INSERT ai_inference_log (result OK, outputSummary "suprimida: teto/duplicata")
    Note over S,DB: nenhuma pergunta criada
  else RF16.CA06 — resposta a pergunta encerrada
    EV-->>S: onReplyToQuestion(...)
    S->>DB: SELECT ai_questions.status IN (RESPONDIDA, IGNORADA)
    S-->>C: 409 PERGUNTA_ENCERRADA (mensagem segue no chat como comum)
  else RF16.CA04 — admin descarta
    U->>FE: Clica "Descartar"
    FE->>C: POST /api/decia/sessions/{id}/questions/{qid}/dismiss
    C->>S: AiQuestionService.dismiss(actor, sessionId, questionId)
    S->>DB: SELECT decia_sessions.adminUserId = actor
    S->>DB: UPDATE ai_questions SET status = IGNORADA
    S-->>C: 200
    C-->>FE: 200
  end
```

## 4. Máquina de estados

Entidade central: `AiQuestion.status` (`QuestionStatus`: ABERTA → RESPONDIDA | IGNORADA). A sessão (`SessionStatus`) precisa estar em ATIVA ou REABERTA para a IA formular.

```mermaid
stateDiagram-v2
  [*] --> ABERTA : IA detecta ponto crítico (FORMULAR_PERGUNTA, kind PONTO_CRITICO) — RF16.CA01
  ABERTA --> ABERTA : resposta sem evidência (answeredWithEvidence = false) — RF16.CA03
  ABERTA --> RESPONDIDA : resposta com evidência avaliada pela IA — RF16.CA03
  ABERTA --> IGNORADA : admin descarta — RF16.CA04
  ABERTA --> IGNORADA : resumo RF11 gerado com a pergunta aberta — RF16.CA04
  RESPONDIDA --> [*]
  IGNORADA --> [*]

  note right of ABERTA
    fixada no painel lateral
    teto: 3 ABERTAS por sessão
    dedupe: similaridade > 90 % não cria nova
    só nasce com sessão ATIVA ou REABERTA
  end note
  note right of RESPONDIDA
    answeredByMessageId + answeredWithEvidence = true
    AFTER_COMMIT: +4 DP PERGUNTA_RESPONDIDA ao autor
    aresta RESPONDEU no rastro
    nova resposta → 409 PERGUNTA_ENCERRADA
  end note
  note left of IGNORADA
    consta em attentionPointsJson do AnalyticalSummary
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/decia/[sessionId]/page.tsx — painel Perguntas da IA"]
    FE2["components/ui/AiQuestionCard · PinnedQuestions · ReplyComposer (RF6) · CitationChip"]
  end

  subgraph WEB["ws-web"]
    W1["AiQuestionController (REST /api/decia/sessions/{id}/questions)"]
    W2["SessionMessageController (RF6 — resposta via replyToMessageId)"]
    W3["SessionAccessGuard (participante / adminUserId)"]
  end

  subgraph APP["ws-application"]
    S1["AiQuestionService (+ listeners MessageClassified, MessageSent)"]
    S2["SessionMessageService (RF6)"]
    S3["DecisionTraceService"]
    S4["DeciaPointsService (listener AFTER_COMMIT)"]
    S5["SummaryService.ignoreOpenOnSummary (RF11)"]
    P1["AiEnginePort"]
    P2["MemorySearchPort"]
    P3["SessionMessageRepositoryPort"]
    P4["NotificationPort"]
    P5["DomainEventPublisher (outbox)"]
  end

  subgraph DOM["ws-domain"]
    D1["AiQuestion · Citation"]
    D2["SessionMessage · MessageClassification · DeciaSession"]
    D3["ComplianceResult · PlanAxis · LegalDeadlineRule (leitura)"]
    D4["DecisionTraceNode · DecisionTraceEdge · DeciaPointsLedgerEntry"]
    D5["Enums: QuestionKind · QuestionStatus · MessageClass · SessionStatus · PointsEvent"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["persistence-mysql: AiQuestionRepository, MessageClassificationRepository, ComplianceResultRepository, PlanAxisRepository, DecisionTraceRepository, DeciaPointsLedgerRepository, DomainEventOutboxRepository"]
    I2["persistence-cassandra: CassandraMessageAdapter, NotificationFeedAdapter"]
    I3["search-opensearch: OpenSearchMemoryAdapter (ws-memory)"]
    I4["cache-redis: AiQuotaAdapter, CircuitStateAdapter, contador de mensagens por sessão (modo ECONOMIA)"]
    I5["ai-providers: AiEngineAdapter (FORMULAR_PERGUNTA, ai_inference_log)"]
    I6["platform: NotificationAdapter, OutboxRelay"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  OS[("OpenSearch")]
  RD[("Redis")]

  FE1 --> FE2
  FE2 -->|HTTPS/JSON| W1 --> W3 --> S1
  FE2 -->|HTTPS/JSON| W2 --> W3 --> S2
  S2 --> P5
  P5 -.->|AFTER_COMMIT MessageClassified / MessageSent| S1
  P5 -.->|AFTER_COMMIT QuestionAnswered| S4
  S1 --> S3
  S5 --> S1
  S1 --> P1
  S1 --> P2
  S1 --> P3
  S1 --> P4
  S1 --> D1
  S1 --> D2
  S1 --> D3
  S3 --> D4
  S4 --> D4
  D1 --> D5
  P1 -.-> I5
  P2 -.-> I3
  P3 -.-> I2
  P4 -.-> I6
  I5 --> I4
  S1 --> I4
  S1 --> I1
  S3 --> I1
  S4 --> I1
  I1 --> MY
  I2 --> CA
  I3 --> OS
  I4 --> RD
  I5 --> X1
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF16.CA01 | `AiQuestion` (kind PONTO_CRITICO, questionText, basisMessageIds, citationsJson), `AiQuestionService.onMessageClassified/detectCriticalPoint`, `AiEnginePort.detectCriticalPoint`, `MemorySearchPort`, `SessionMessage` (IA, PERGUNTA) | A0, C0, C4–C10, D1, D2, D4 | 1–12 | [*] → ABERTA | `AiQuestionService`, `AiEngineAdapter`, `OpenSearchMemoryAdapter`, `CassandraMessageAdapter` |
| RF16.CA02 | `Notification` (DECIA), `DecisionTraceNode` PERGUNTA / arestas ORIGINOU, `PinnedQuestions` | C11, C12, A1, B1 | 13–20 | nota de ABERTA (fixada) | `NotificationAdapter`, `DecisionTraceService`, `AiQuestionController.list` |
| RF16.CA03 | `AiQuestion.status/answeredByMessageId/answeredWithEvidence`, `AiEnginePort.evaluateAnswer`, `DeciaPointsLedgerEntry` (PERGUNTA_RESPONDIDA +4), `DeciaPointsService.onQuestionAnswered` | A3, A4, B2, C13–C19, F1, F2, B6, B7 | 21–34; `alt` sem evidência | ABERTA → RESPONDIDA; ABERTA → ABERTA | `SessionMessageService`, `DeciaPointsService`, `OutboxRelay` |
| RF16.CA04 | `AiQuestion.status = IGNORADA`, `AiQuestionService.dismiss/ignoreOpenOnSummary`, `AnalyticalSummary.attentionPointsJson` | A5, A6, B3, C20–C22 | `alt` RF16.CA04 (dismiss) | ABERTA → IGNORADA (2 gatilhos) | `AiQuestionController.dismiss`, `SummaryService` |
| RF16.CA05 | `AiQuestionService.isDuplicate`, teto 3 ABERTAS, `SessionMessage.similarityHash`, `AiMode` ECONOMIA (contador Redis), `AiInferenceLog` | C2, C3, C7 | 2, 7; `alt` RF16.CA05 | nota de ABERTA (teto/dedupe) | `AiQuotaAdapter`, contador Redis, `AiEngineAdapter` |
| RF16.CA06 | guarda `SessionStatus` ATIVA/REABERTA, `SessionAccessGuard` (admin), 409 PERGUNTA_ENCERRADA | C1, C14, C20, B4, B5 | `alt` 409 PERGUNTA_ENCERRADA | RESPONDIDA/IGNORADA terminais | `SessionAccessGuard`, `AiQuestionService` |
