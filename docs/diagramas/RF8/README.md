# RF8 — Notificar o grupo a respeito de divergências, assim como formalizar perguntas a partir destes pontos de risco.
**HU:** HU8 · **Sprint (board Work Station):** 2 · **Equivalente FAI:** RF10 Copilot (sugestões proativas do Copilot) + RF24 Usar a IA do sistema (`AiEngine`, capabilities DETECTAR_DIVERGENCIA e FORMULAR_PERGUNTA) + notificações RNF10 (`NotificationService`) · **Aba/rota:** DECIA (`/decia/[sessionId]` — mensagens da IA no chat + painel lateral "Divergências e perguntas"), sino de notificações — rota sugerida
**Critérios de aceite cobertos:** RF8.CA01 … RF8.CA06 (RF1–RF18 não têm CAs no board: derivados da HU8 + RF16/RF29/RF42 e marcados "CA a confirmar")

> **HU8** — COMO IA do sistema POSSO notificar o grupo a respeito de divergências identificadas e formular perguntas a partir dos pontos de risco PARA estimular o esclarecimento e reduzir ambiguidades antes da decisão.

## Critérios de aceite derivados da HU8 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF8.CA01** (CA a confirmar) | Dado `MessageClassified` com `label DIVERGENCIA` (confidence ≥ 0,6) envolvendo autores distintos, então o `DivergenceService` pede ao `AiEngine` (DETECTAR_DIVERGENCIA) a síntese das posições e cria `Divergence` (`originMessageId`, `detectedByAi` true, `summary`, `partiesJson`, `status ABERTA`, `aiInferenceId`), publicando na sessão uma mensagem `authorKind IA` "Divergência identificada entre A e B sobre X". |
| **RF8.CA02** (CA a confirmar) | Dado a divergência criada, então todos os participantes ativos recebem `Notification` (categoria DECIA, type DIVERGENCIA_DETECTADA, `groupKey` por sessão/hora para não inundar), em tempo real (SSE) e em `notifications_by_user`; `Divergence.notifiedAt` é preenchido. |
| **RF8.CA03** (CA a confirmar) | Dado `MessageClassified` com `label RISCO` (ou um ponto crítico detectado no contexto, RF16), então a IA formula `AiQuestion` (`kind` RISCO · PONTO_CRITICO · ESCLARECIMENTO, `questionText`, `basisMessageIds`, `status ABERTA`, `citationsJson` com fontes da Memória Institucional quando houver — RF33.CA03) e a posta na sessão como mensagem IA, endereçada ao grupo. |
| **RF8.CA04** (CA a confirmar) | Dado o controle de ruído, então há no máximo **3 perguntas ABERTAS** por sessão e não se cria `Divergence` já ABERTA para as mesmas partes/mensagens-base (dedupe por `basisMessageIds`/`partiesJson`); mensagens RUIDO ou repetidas nunca geram divergência nem pergunta; o administrador pode marcar uma pergunta como IGNORADA com motivo. |
| **RF8.CA05** (CA a confirmar) | Dado o `AiEngine`, então a detecção e a formulação seguem a cadeia primário → alternativo → motor local com `AiInferenceLog`; **sem IA externa** (sigilo, cota ou falha) o motor local detecta divergência por heurística (contraste/negação entre pares de ARGUMENTO) e usa uma pergunta-modelo, com aviso "gerado pelo motor local" no card. |
| **RF8.CA06** (CA a confirmar) | Dado divergência e pergunta criadas, então entram no `DecisionTrace` (nós DIVERGENCIA e PERGUNTA, arestas ORIGINOU a partir da mensagem), aparecem no painel lateral (abertas/resolvidas) e podem ser resolvidas pelo grupo (RF10 → `DivergenceReply`, RF16 → `answeredByMessageId`), gerando DECIA Points quando a IA marca como resolvida/respondida com evidência (RF42); `AuditLog DIVERGENCE_DETECTED` / `AI_QUESTION_ASKED`. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  namespace wai_domain {
    class Divergence {
      <<entity>>
      +id: UUID
      +sessionId: UUID
      +originMessageId: TIMEUUID
      +detectedByAi: boolean
      +summary: String
      +partiesJson: String
      +status: String
      +resolvedByReplyId: UUID
      +resolvedAt: Instant
      +notifiedAt: Instant
      +aiInferenceId: UUID
    }
    class DivergenceReply {
      <<entity>>
      +id: UUID
      +divergenceId: UUID
      +authorId: UUID
      +messageId: TIMEUUID
      +resolves: boolean
      +at: Instant
    }
    class AiQuestion {
      <<entity>>
      +id: UUID
      +sessionId: UUID
      +kind: String
      +questionText: String
      +basisMessageIds: String
      +status: String
      +answeredByMessageId: TIMEUUID
      +answeredWithEvidence: boolean
      +aiInferenceId: UUID
      +citationsJson: String
    }
    class MessageClassification {
      <<entity>>
      +id: UUID
      +messageId: TIMEUUID
      +label: MessageClass
      +confidence: BigDecimal
    }
    class SessionMessage {
      <<entity>>
      +id: TIMEUUID
      +sessionId: UUID
      +authorId: UUID
      +authorKind: String
      +bodyMd: String
    }
    class Notification {
      <<entity>>
      +id: UUID
      +recipientId: UUID
      +actorId: UUID
      +type: NotificationType
      +category: String
      +resourceType: String
      +resourceId: UUID
      +title: String
      +body: String
      +groupKey: String
      +read: boolean
      +deliveredChannels: String
    }
    class DecisionTraceNode {
      <<entity>>
      +id: UUID
      +sessionId: UUID
      +nodeType: TraceNodeType
      +refId: UUID
      +classLabel: String
    }
    class DecisionTraceEdge {
      <<entity>>
      +fromNodeId: UUID
      +toNodeId: UUID
      +relation: String
    }
    class AiInferenceLog {
      <<entity>>
      +id: UUID
      +capability: AiCapability
      +provider: String
      +result: String
      +fallbackUsed: boolean
      +correlationId: String
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
    class AiCapability {
      <<enum>>
      DETECTAR_DIVERGENCIA
      FORMULAR_PERGUNTA
    }
  }

  namespace wai_application {
    class DivergenceService {
      <<service>>
      +onMessageClassified(event MessageClassified) void
      +detect(session DeciaSession, classification MessageClassification) Divergence
      +list(current CurrentUser, sessionId, status) List~DivergenceView~
      -alreadyOpen(sessionId, parties, basisIds) boolean
    }
    class AiQuestionService {
      <<service>>
      +onMessageClassified(event MessageClassified) void
      +ask(session DeciaSession, kind, basisMessageIds) AiQuestion
      +ignore(current CurrentUser, sessionId, questionId, reason) AiQuestion
      +list(current CurrentUser, sessionId, status) List~AiQuestionView~
      -openCount(sessionId) int
    }
    class MessageService {
      <<service>>
      +postAiMessage(sessionId, bodyMd, correlationId) SessionMessage
    }
    class AiEngine {
      <<service>>
      +text(call TextCall) AiOutcome
    }
    class NotificationPort {
      <<port>>
      +notifyGroup(sessionId, recipients List~UUID~, notification Notification, groupKey) void
    }
    class RealtimePublisherPort {
      <<port>>
      +publish(sessionId, event SessionEvent) void
    }
    class DecisionTracePort {
      <<port>>
      +appendNode(node DecisionTraceNode) UUID
      +appendEdge(edge DecisionTraceEdge) void
    }
    class MemorySearchPort {
      <<port>>
      +citations(query, companyId, k) List~Citation~
    }
    class DomainEventPublisherPort {
      <<port>>
      +publish(event DomainEvent) void
    }
  }

  namespace wai_web {
    class DeciaSessionController {
      <<controller>>
      +divergences(sessionId, status) List~DivergenceView~
      +questions(sessionId, status) List~AiQuestionView~
      +ignoreQuestion(sessionId, questionId, body IgnoreRequest) AiQuestionView
    }
  }

  namespace wai_infrastructure {
    class CassandraNotificationProjector {
      <<adapter>>
    }
    class RedisRealtimePublisher {
      <<adapter>>
    }
    class OpenSearchMemoryAdapter {
      <<adapter>>
      +index: String
    }
    class LocalEngineAdapter {
      <<adapter>>
      +divergenceHeuristic: ContrastDetector
      +questionTemplates: Map
    }
  }

  DeciaSessionController --> DivergenceService
  DeciaSessionController --> AiQuestionService
  DivergenceService --> AiEngine : DETECTAR_DIVERGENCIA
  AiQuestionService --> AiEngine : FORMULAR_PERGUNTA
  AiQuestionService --> MemorySearchPort : citações (RF33)
  DivergenceService --> MessageService
  AiQuestionService --> MessageService
  DivergenceService --> NotificationPort
  AiQuestionService --> NotificationPort
  DivergenceService --> RealtimePublisherPort
  DivergenceService --> DecisionTracePort
  AiQuestionService --> DecisionTracePort
  DivergenceService --> DomainEventPublisherPort
  AiQuestionService --> DomainEventPublisherPort
  CassandraNotificationProjector ..|> NotificationPort
  RedisRealtimePublisher ..|> RealtimePublisherPort
  OpenSearchMemoryAdapter ..|> MemorySearchPort
  AiEngine ..> LocalEngineAdapter : fallback
  Divergence "1" --> "*" DivergenceReply : respostas (RF10)
  Divergence ..> SessionMessage : originMessageId
  Divergence ..> AiInferenceLog : aiInferenceId
  AiQuestion ..> SessionMessage : basisMessageIds e answeredByMessageId
  AiQuestion ..> AiInferenceLog : aiInferenceId
  MessageClassification --> MessageClass
  MessageClassification ..> Divergence : DIVERGENCIA origina
  MessageClassification ..> AiQuestion : RISCO origina
  Notification ..> Divergence : DIVERGENCIA_DETECTADA
  Notification ..> AiQuestion : PERGUNTA_IA
  DecisionTraceNode "1" --> "*" DecisionTraceEdge : ORIGINOU
  AiInferenceLog --> AiCapability

  note for Divergence "tabela divergences (RF8, RF10) · status ABERTA · EM_RESPOSTA · RESOLVIDA · SEM_CONSENSO"
  note for AiQuestion "tabela ai_questions (RF8, RF16) · kind RISCO · PONTO_CRITICO · ESCLARECIMENTO · status ABERTA · RESPONDIDA · IGNORADA"
  note for Notification "Cassandra notifications_by_user (TTL) + MySQL notifications · categoria DECIA · groupKey agrupa por sessão/hora"
```

## 2. Diagrama de atividades

Raias: Grupo/Administrador · Web/BFF · `wai-application` · IA (AiEngine) · Persistência. Gatilho: `MessageClassified` (RF7).

```mermaid
flowchart TD
  subgraph L1["Ator humano — Grupo da conversa e administrador"]
    A1["Recebe notificação e vê a mensagem da IA no chat"] --> A2{"O que fazer?"}
    A2 -->|responder a divergência| A3["Responde (RF10) → DivergenceReply"]
    A2 -->|responder a pergunta| A4["Responde com evidência (RF16)"]
    A2 -->|admin: ignorar pergunta| A5["Marca IGNORADA com motivo"]
    A20(["Divergência/pergunta listadas no painel lateral com status"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["SSE DivergenceDetected / AiQuestionAsked → insere a mensagem IA e atualiza o painel"]
    B2["GET /api/decia/sessions/{id}/divergences · /questions"]
    B3["POST /api/decia/sessions/{id}/questions/{qid}/ignore"]
  end

  subgraph L3["wai-application — DivergenceService / AiQuestionService"]
    C0(["Evento MessageClassified (RF7)"]) --> C1{"label?"}
    C1 -->|DIVERGENCIA conf ≥ 0,6| C2{"Autores distintos e não há Divergence ABERTA para as mesmas partes/base?"}
    C2 -->|não| C3["Ignora (dedupe)"]
    C2 -->|sim| C4["AiEngine DETECTAR_DIVERGENCIA: síntese das posições + partes"]
    C5["Cria Divergence ABERTA (originMessageId, summary, partiesJson, aiInferenceId)"] --> C6["Mensagem IA no chat: Divergência identificada entre A e B sobre X"]
    C6 --> C7["Notification DECIA a todos os ativos (groupKey sessão/hora) · notifiedAt"]
    C7 --> C8["DecisionTrace: nó DIVERGENCIA + aresta ORIGINOU · AuditLog DIVERGENCE_DETECTED"]
    C1 -->|RISCO ou ponto crítico| C9{"Perguntas ABERTAS na sessão < 3?"}
    C9 -->|não| C10["Adia (fila) até uma pergunta ser respondida ou ignorada"]
    C9 -->|sim| C11["Busca citações na Memória Institucional (RF33) se houver"]
    C11 --> C12["AiEngine FORMULAR_PERGUNTA: questionText + kind"]
    C13["Cria AiQuestion ABERTA (basisMessageIds, citationsJson, aiInferenceId)"] --> C14["Mensagem IA no chat endereçada ao grupo"]
    C14 --> C15["Notification DECIA · DecisionTrace nó PERGUNTA + ORIGINOU · AuditLog AI_QUESTION_ASKED"]
    C1 -->|ARGUMENTO, CONSENSO, PERGUNTA, RUIDO| C16["Nada neste RF (RUIDO nunca gera)"]
    C17{"É adminUserId?"}
    C17 -->|não| E403["403 ACESSO_NEGADO"]
    C17 -->|sim| C18{"Pergunta ABERTA e motivo informado?"}
    C18 -->|não| E422["422 VALIDACAO"]
    C18 -->|sim| C19["AiQuestion.status → IGNORADA · libera vaga na fila"]
  end

  subgraph L4["IA (AiEngine — Strategy + Chain)"]
    I1["Primário (Claude/Gemini) → alternativo → motor local"] --> I2{"Chegou ao motor local?"}
    I2 -->|sim| I3["Heurística de contraste entre pares / pergunta-modelo · aviso gerado pelo motor local"]
    I2 -->|não| I4["Resposta estruturada do provedor"]
    I3 --> I5["AiInferenceLog (result FALLBACK ou BLOQUEADO_SIGILO)"]
    I4 --> I6["AiInferenceLog (result OK)"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL: divergences, ai_questions, ai_inference_log, decision_trace_nodes/edges, notifications, audit_log, domain_events")]
    D2[("Cassandra: messages_by_session (mensagens IA), notifications_by_user, trace_by_entity")]
    D3[("Redis: pub/sub da sessão · AiQuota · circuit breaker")]
    D4[("OpenSearch: wai-memory (citações)")]
  end

  C4 --> I1
  C12 --> I1
  I5 --> C5
  I6 --> C5
  I5 --> C13
  I6 --> C13
  C11 --> D4
  C5 --> D1
  C6 --> D2
  C7 --> D2
  C7 --> D3
  C8 --> D1
  C13 --> D1
  C14 --> D2
  C15 --> D1
  C15 --> D2
  D3 --> B1 --> A1
  B2 --> A20
  A5 --> B3 --> C17
  C19 --> D1

  classDef erro fill:#fde2e2,stroke:#c0392b,color:#7b1d1d;
  class E403,E422 erro;
```

## 3. Diagrama de sequência

Caminho feliz da divergência (CA01, CA02) e da pergunta (CA03), `alt` de dedupe/limite (CA04), `alt` de fallback local (CA05) e o erro 403 ao ignorar. Sem ponto e vírgula nas mensagens.

```mermaid
sequenceDiagram
  autonumber
  participant DE as DomainEvents (AFTER_COMMIT)
  participant DV as DivergenceService (wai-application)
  participant AQ as AiQuestionService (wai-application)
  participant AI as AiEngine
  participant OS as OpenSearch
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant R as Redis
  participant N as Next.js (App Router) /decia/[id]
  actor U as Usuário (grupo / admin)
  participant C as DeciaSessionController (wai-web)

  DE->>DV: MessageClassified(sessionId, messageId, label=DIVERGENCIA, confidence 0.82)
  DV->>DB: SELECT divergences WHERE session_id AND status=ABERTA (mesmas partes/base?)
  alt já existe divergência ABERTA equivalente (CA04)
    DV->>DV: dedupe → nada a criar
  else nova divergência (CA01)
    DV->>CS: SELECT messages_by_session (mensagem + réplicas recentes)
    DV->>AI: text(DETECTAR_DIVERGENCIA, contexto mascarado, mode da sessão)
    alt provedor externo disponível
      AI-->>DV: AiOutcome {summary, parties[A, B], topic, confidence} (ai_inference_log OK)
    else sem IA externa — sigilo, cota ou falha (CA05)
      AI->>AI: LocalEngineAdapter → heurística de contraste entre pares de ARGUMENTO
      AI-->>DV: AiOutcome local {summary genérico, parties} (ai_inference_log FALLBACK, aviso)
    end
    DV->>DB: BEGIN · INSERT divergences (ABERTA, origin_message_id, parties_json, ai_inference_id) · INSERT decision_trace_nodes (DIVERGENCIA) + edges (ORIGINOU) · INSERT domain_events DivergenceDetected · COMMIT (CA06)
    DV->>CS: INSERT messages_by_session (authorKind=IA, "Divergência identificada entre A e B sobre X")
    DV->>DB: INSERT session_messages_idx (mensagem IA)
    DE->>CS: AFTER_COMMIT → notifications_by_user para participantes ativos (DIVERGENCIA_DETECTADA, groupKey sessão/hora) (CA02)
    DE->>DB: AFTER_COMMIT → UPDATE divergences SET notified_at · INSERT audit_log DIVERGENCE_DETECTED (CA02, CA06)
    DE->>R: AFTER_COMMIT → PUBLISH decia.session.{id} DivergenceDetected (CA02)
    R-->>N: SSE → mensagem da IA no chat + item no painel lateral
    N-->>U: sino de notificação e card laranja "Divergência"
  end

  DE->>AQ: MessageClassified(sessionId, messageId, label=RISCO)
  AQ->>DB: SELECT COUNT ai_questions WHERE session_id AND status=ABERTA
  alt já há 3 perguntas ABERTAS (CA04)
    AQ->>DB: INSERT pipeline_jobs (PERGUNTA_ADIADA) → reprocessa quando uma pergunta fechar
  else há vaga (CA03)
    AQ->>OS: kNN wai-memory (tema + mensagem) → citações institucionais (RF33.CA03)
    OS-->>AQ: até 3 Citation (ou vazio → "sem precedente")
    AQ->>AI: text(FORMULAR_PERGUNTA, basisMessages, citations)
    AI-->>AQ: AiOutcome {kind=RISCO, questionText} (ai_inference_log)
    AQ->>DB: BEGIN · INSERT ai_questions (ABERTA, basis_message_ids, citations_json) · INSERT decision_trace_nodes (PERGUNTA) + edges (ORIGINOU) · INSERT domain_events AiQuestionAsked · COMMIT (CA06)
    AQ->>CS: INSERT messages_by_session (authorKind=IA, pergunta endereçada ao grupo, com citações)
    DE->>CS: AFTER_COMMIT → notifications_by_user (PERGUNTA_IA)
    DE->>R: AFTER_COMMIT → PUBLISH AiQuestionAsked
    R-->>N: SSE → card roxo "Pergunta da IA" + painel lateral
  end

  U->>N: abre o painel lateral
  N->>C: GET /api/decia/sessions/{id}/divergences?status=ABERTA e /questions?status=ABERTA
  C-->>N: 200 listas com status, partes, base e citações (CA06)

  U->>N: admin marca a pergunta como ignorada com motivo
  N->>C: POST /api/decia/sessions/{id}/questions/{qid}/ignore {reason}
  C->>AQ: ignore(currentUser, sessionId, questionId, reason)
  alt não é adminUserId (CA04)
    AQ-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else admin (CA04)
    AQ->>DB: UPDATE ai_questions SET status=IGNORADA · INSERT audit_log AI_QUESTION_IGNORED
    AQ-->>C: 200 AiQuestionView
    C-->>N: 200 → painel atualizado, vaga liberada na fila
  end
```

## 4. Máquina de estados

Entidades centrais: `Divergence.status` (ABERTA · EM_RESPOSTA · RESOLVIDA · SEM_CONSENSO) e `AiQuestion.status` (ABERTA · RESPONDIDA · IGNORADA). O RF8 cria ambas em `ABERTA`; as transições de resposta pertencem aos RF10 e RF16 e aparecem para contexto.

```mermaid
stateDiagram-v2
  direction LR

  state "Divergence (divergences)" as DIV {
    [*] --> ABERTA : MessageClassified DIVERGENCIA sem duplicata (RF8.CA01) — notifica o grupo (CA02)
    ABERTA --> EM_RESPOSTA : participante habilitado responde (RF10 → DivergenceReply)
    EM_RESPOSTA --> EM_RESPOSTA : novas réplicas
    EM_RESPOSTA --> RESOLVIDA : IA marca reply.resolves=true (RF10) → +8 DECIA Points (RF42)
    EM_RESPOSTA --> SEM_CONSENSO : resumo analítico fecha sem convergência (RF11)
    ABERTA --> SEM_CONSENSO : sessão vai a EM_RESUMO sem resposta (RF11)
    RESOLVIDA --> [*]
    SEM_CONSENSO --> [*]
  }

  state "AiQuestion (ai_questions)" as AQS {
    [*] --> Q_ABERTA : MessageClassified RISCO ou ponto crítico, menos de 3 abertas (RF8.CA03/CA04)
    Q_ABERTA --> Q_RESPONDIDA : mensagem do grupo responde (RF16) — answeredWithEvidence → +4 DP (RF42)
    Q_ABERTA --> Q_IGNORADA : admin ignora com motivo (RF8.CA04)
    Q_RESPONDIDA --> [*]
    Q_IGNORADA --> [*]
  }

  note right of DIV
    Dedupe: não nasce nova ABERTA para as mesmas
    partes e mensagens-base. Nó DIVERGENCIA no
    DecisionTrace, aresta ORIGINOU (RF8.CA06).
  end note
  note right of AQS
    Fila: a 4ª pergunta espera uma vaga
    (RESPONDIDA ou IGNORADA). Nó PERGUNTA no
    DecisionTrace, citações da memória (RF33).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/(app)/decia/[sessionId]/page.tsx (mensagens IA laranja/roxa + painel lateral)"]
    FE2["components/ui (DivergencePanel, AiQuestionCard, NotificationBell, CitationChip)"]
    FE3["lib/decia/useSessionStream.ts (DivergenceDetected, AiQuestionAsked)"]
  end

  subgraph WEB["wai-web"]
    W1["DeciaSessionController /api/decia/sessions/{id}/divergences · /questions · /questions/{qid}/ignore"]
    W2["SessionStreamController (SSE) · NotificationController /api/me/notifications"]
  end

  subgraph APP["wai-application"]
    S1["DivergenceService (listener MessageClassified)"]
    S2["AiQuestionService (listener MessageClassified, fila de 3)"]
    S3["AiEngine (DETECTAR_DIVERGENCIA, FORMULAR_PERGUNTA)"]
    S4["MessageService.postAiMessage · DecisionTraceService"]
    P1["AiProviderPort · MemorySearchPort · NotificationPort"]
    P2["RealtimePublisherPort · DecisionTracePort · DomainEventPublisherPort"]
  end

  subgraph DOM["wai-domain"]
    D1["Divergence · DivergenceReply · AiQuestion · MessageClassification · SessionMessage · Notification · DecisionTraceNode/Edge · AiInferenceLog"]
    D2["MessageClass · AiCapability · NotificationType · TraceNodeType"]
    D3["DivergenceRepository · AiQuestionRepository · SessionParticipantRepository"]
  end

  subgraph INFRA["wai-infrastructure"]
    I1["ai-providers (ClaudeProviderAdapter, GeminiProviderAdapter, LocalEngineAdapter: ContrastDetector + templates)"]
    I2["search-opensearch (OpenSearchMemoryAdapter índice wai-memory)"]
    I3["persistence-mysql (divergences, ai_questions, notifications, decision_trace_*, ai_inference_log, domain_events, audit_log)"]
    I4["persistence-cassandra (messages_by_session, notifications_by_user, trace_by_entity)"]
    I5["cache-redis (RedisRealtimePublisher, RedisAiQuota, RedisCircuitBreaker)"]
    I6["platform (OutboxEventPublisher, NotificationDispatcher, AuditLogWriter)"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude (Anthropic API)"]
    X2["Gemini (Google AI)"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  RD[("Redis")]
  OSB[("OpenSearch")]

  FE1 --> FE2
  FE1 --> FE3
  FE1 -->|HTTPS/JSON| W1
  FE3 -->|SSE| W2
  W1 --> S1
  W1 --> S2
  S1 --> S3
  S2 --> S3
  S1 --> S4
  S2 --> S4
  S1 --> P1
  S2 --> P1
  S1 --> P2
  S2 --> P2
  S1 --> D1
  S2 --> D1
  S1 --> D3
  S2 --> D3
  I1 -.->|implementa| P1
  I2 -.->|implementa| P1
  I4 -.->|implementa| P1
  I5 -.->|implementa| P2
  I3 -.->|implementa| P2
  I6 -.->|implementa| P2
  I1 --> X1
  I1 --> X2
  W2 --> I5
  D3 --> I3
  I3 --> MY
  I4 --> CA
  I5 --> RD
  I2 --> OSB
  BOOT["wai-bootstrap (limiar de confiança 0,6, máx. 3 perguntas abertas, flags ai.provider.*, opensearch.enabled)"] -.-> INFRA
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) |
|---|---|---|---|---|---|
| RF8.CA01 | `DivergenceService.onMessageClassified/detect`, `Divergence.originMessageId/summary/partiesJson/detectedByAi`, `AiEngine` (DETECTAR_DIVERGENCIA), `MessageService.postAiMessage` | `C0`, `C1`, `C2`, `C4`, `C5`, `C6` | 1, 5–7, 11–13 | `[*] → ABERTA` (Divergence) | `S1`, `S3`, `S4`, `I3 divergences`, `I4 messages_by_session` |
| RF8.CA02 | `NotificationPort.notifyGroup`, `Notification.groupKey/category DECIA`, `Divergence.notifiedAt`, `RealtimePublisherPort` | `C7`, `B1`, `A1` | 14–18 | nota em `ABERTA` | `I4 notifications_by_user`, `I6 NotificationDispatcher`, `I5`, `W2`, `FE2 NotificationBell` |
| RF8.CA03 | `AiQuestionService.ask`, `AiQuestion.kind/questionText/basisMessageIds/citationsJson`, `MemorySearchPort`/`OpenSearchMemoryAdapter`, `AiEngine` (FORMULAR_PERGUNTA) | `C9`, `C11`–`C14` | 19, 24–32 | `[*] → Q_ABERTA` | `S2`, `I2 search-opensearch`, `FE2 AiQuestionCard/CitationChip` |
| RF8.CA04 | `DivergenceService.alreadyOpen`, `AiQuestionService.openCount/ignore`, `AiQuestion.status IGNORADA` | `C2` → `C3`, `C9` → `C10`, `C17` → `E403`, `C18` → `E422`, `C19` | 2–4 (dedupe), 20–23 (fila), 36–44 (ignorar, 403) | `Q_ABERTA → Q_IGNORADA`, nota da fila | `W1 /ignore`, `BOOT` (limiares) |
| RF8.CA05 | `AiEngine` cadeia, `LocalEngineAdapter.divergenceHeuristic/questionTemplates`, `AiInferenceLog.fallbackUsed/result` | `I1`–`I6` | 8–10 (`else sem IA externa` → heurística local) | — | `I1 ai-providers`, `I5 RedisCircuitBreaker/AiQuota`, `X1`, `X2` |
| RF8.CA06 | `DecisionTracePort`, `DecisionTraceNode DIVERGENCIA/PERGUNTA`, `DecisionTraceEdge ORIGINOU`, `DivergenceReply`, `AiQuestion.answeredByMessageId`, `AuditLog` | `C8`, `C15`, `A3`, `A4`, `B2`, `A20` | 11, 15, 29, 33–35 | `ABERTA → EM_RESPOSTA → RESOLVIDA` (RF10), `Q_ABERTA → Q_RESPONDIDA` (RF16) | `S4 DecisionTraceService`, `I3 decision_trace_*`, `I4 trace_by_entity`, `FE2 DivergencePanel` |
