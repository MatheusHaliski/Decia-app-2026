# RF7 — Classificar as mensagens enviadas em diferentes categorias, tais como: argumento, divergência, risco, consenso.
**HU:** HU7 · **Sprint (board Work Station):** 2 · **Equivalente FAI:** RF24 Usar a IA do sistema (`AiEngine` Strategy + Chain of Responsibility: provedor primário → alternativo → motor local, `ai_inference_log`, circuit breaker, fallback) + RF10 Copilot (classificação das mensagens) · **Aba/rota:** DECIA (`/decia/[sessionId]` — badge de classe no card da mensagem, painel "IA do sistema" no admin RF18/RF43) — rota sugerida
**Critérios de aceite cobertos:** RF7.CA01 … RF7.CA06 (RF1–RF18 não têm CAs no board: derivados da HU7 + RF29/RF42/RF43 e marcados "CA a confirmar")

> **HU7** — COMO IA do sistema POSSO classificar automaticamente as mensagens enviadas em categorias como argumento, divergência, risco e consenso PARA estruturar a discussão e subsidiar análises e decisões fundamentadas.

## Critérios de aceite derivados da HU7 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF7.CA01** (CA a confirmar) | Dado o evento `MessageSent` (RF6) de uma mensagem `authorKind HUMANO`, então o `ClassificationService` classifica de forma **assíncrona** em `MessageClass` ARGUMENTO · DIVERGENCIA · RISCO · CONSENSO · PERGUNTA · RUIDO, gravando `MessageClassification` (label, `confidence` 0–1, `rationale`, `hasEvidence`, `evidenceRefsJson`) e preenchendo `SessionMessage.classificationId`; o card da mensagem recebe o badge em até 5 s (p95) via SSE. |
| **RF7.CA02** (CA a confirmar) | Dado o `AiEngine` (Strategy + Chain), então a inferência tenta o **provedor primário** (Claude ou Gemini, conforme `FeatureFlag ai.provider.*`), depois o **alternativo** e por fim o **motor local** (regras + embeddings locais); timeout, erro, cota esgotada ou `AiProviderCircuitState OPEN` avançam a cadeia; cada chamada gera `AiInferenceLog` (capability CLASSIFICAR_MENSAGEM, provider, model, mode, latencyMs, tokens, estimatedCostUsd, result OK/FALLBACK/ERRO, fallbackUsed, correlationId). |
| **RF7.CA03** (CA a confirmar) | Dado uma mensagem cujo anexo tem `accessClass RESTRITO` ou `SIGILOSO` (ou sessão marcada `localOnly`), então a classificação roda **somente no motor local** (`provider LOCAL`, `result BLOQUEADO_SIGILO` para a tentativa externa) com aviso no card; em qualquer chamada externa, dados pessoais são **mascarados** antes (`maskedFields`), conforme RF43.CA02 e LGPD. |
| **RF7.CA04** (CA a confirmar) | Dado a classificação concluída, então ela liga o argumento ao item citado (`linkedTaskId`/`linkedProjectId`, RF29) e é exibida com a cor da classe (argumento azul, divergência laranja, risco vermelho, consenso verde, pergunta roxa) **com o nome em texto** (RF38.CA05/CA07) e a faísca ✦ com tooltip "gerado por IA em [data]" (RF38.CA04); o nó `DecisionTrace CLASSIFICACAO` e a aresta `CLASSIFICOU` são gravados (append-only). |
| **RF7.CA05** (CA a confirmar) | Dado o autor da mensagem ou o administrador da sessão, quando confirma ou corrige a classe (`POST …/classification/confirm {label}`), então `confirmedByUserId` e o novo `label` são gravados mantendo o `aiInferenceId` original, o badge perde a faísca (revisado por humano) e a taxa de aceitação alimenta o painel "IA do sistema" (RF43.CA12); outros participantes não podem corrigir (`403 ACESSO_NEGADO`). |
| **RF7.CA06** (CA a confirmar) | Dado a classificação, então ela dispara os efeitos via `MessageClassified` (AFTER_COMMIT): DIVERGENCIA → `DivergenceService` (RF8), RISCO/PERGUNTA → candidata a `AiQuestion` (RF8/RF16), ARGUMENTO com `hasEvidence` ou CONSENSO confirmado → evento pontuável idempotente (RF42.CA01); RUIDO e mensagens repetidas (`similarityHash`) não pontuam; a cota `AiQuota` do departamento é consumida (sem cota → motor local com aviso). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  namespace ws_domain {
    class SessionMessage {
      <<entity>>
      +id: TIMEUUID
      +sessionId: UUID
      +authorId: UUID
      +authorKind: String
      +bodyMd: String
      +attachmentsJson: String
      +classificationId: UUID
      +similarityHash: String
      +correlationId: String
    }
    class MessageClassification {
      <<entity>>
      +id: UUID
      +messageId: TIMEUUID
      +sessionId: UUID
      +label: MessageClass
      +confidence: BigDecimal
      +hasEvidence: boolean
      +evidenceRefsJson: String
      +linkedTaskId: UUID
      +linkedProjectId: UUID
      +rationale: String
      +aiInferenceId: UUID
      +confirmedByUserId: UUID
      +at: Instant
    }
    class AiInferenceLog {
      <<entity>>
      +id: UUID
      +userId: UUID
      +departmentId: UUID
      +capability: AiCapability
      +hostRf: String
      +provider: String
      +model: String
      +mode: AiMode
      +latencyMs: int
      +inputTokens: int
      +outputTokens: int
      +estimatedCostUsd: BigDecimal
      +result: String
      +fallbackUsed: boolean
      +maskedFields: String
      +confidence: BigDecimal
      +quotaSource: String
      +correlationId: String
    }
    class AiQuota {
      <<entity>>
      +scope: String
      +scopeId: UUID
      +monthKey: String
      +monthlyLimit: int
      +consumed: int
      +purchasedCredits: int
    }
    class AiProviderCircuitState {
      <<entity>>
      +provider: String
      +state: String
      +failures: int
      +openedAt: Instant
    }
    class DecisionTraceNode {
      <<entity>>
      +id: UUID
      +sessionId: UUID
      +nodeType: TraceNodeType
      +refId: UUID
      +classLabel: String
      +at: Instant
    }
    class DecisionTraceEdge {
      <<entity>>
      +fromNodeId: UUID
      +toNodeId: UUID
      +relation: String
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
      CLASSIFICAR_MENSAGEM
      DETECTAR_DIVERGENCIA
      FORMULAR_PERGUNTA
    }
    class AiMode {
      <<enum>>
      ECONOMIA
      AVANCADO
    }
  }

  namespace ws_application {
    class ClassificationService {
      <<service>>
      +onMessageSent(event MessageSent) void
      +classify(message SessionMessage, session DeciaSession) MessageClassification
      +confirm(current CurrentUser, sessionId, messageId, label MessageClass) MessageClassification
      -buildPrompt(message, context) AiRequest
      -localOnly(message, session) boolean
    }
    class AiEngine {
      <<service>>
      +text(call TextCall) AiOutcome
      -chain(providers List~AiProviderPort~, call) AiOutcome
      -mask(input, protectedNames) MaskedInput
      -log(call, outcome) AiInferenceLog
    }
    class AiProviderPort {
      <<port>>
      +id() String
      +available() boolean
      +complete(request AiRequest) AiResponse
    }
    class AiQuotaPort {
      <<port>>
      +tryConsume(scope, scopeId, cost) QuotaDecision
    }
    class CircuitBreakerPort {
      <<port>>
      +allow(provider) boolean
      +recordSuccess(provider) void
      +recordFailure(provider) void
    }
    class PiiMaskerPort {
      <<port>>
      +mask(text, protectedNames) MaskedText
    }
    class DecisionTracePort {
      <<port>>
      +appendNode(node DecisionTraceNode) UUID
      +appendEdge(edge DecisionTraceEdge) void
    }
    class DomainEventPublisherPort {
      <<port>>
      +publish(event DomainEvent) void
    }
  }

  namespace ws_web {
    class MessageController {
      <<controller>>
      +classification(sessionId, messageId) ClassificationView
      +confirmClassification(sessionId, messageId, body ConfirmRequest) ClassificationView
    }
  }

  namespace ws_infrastructure {
    class ClaudeProviderAdapter {
      <<adapter>>
      +model: String
    }
    class GeminiProviderAdapter {
      <<adapter>>
      +model: String
    }
    class LocalEngineAdapter {
      <<adapter>>
      +rules: ClassificationRules
      +embeddings: LocalEmbeddingIndex
    }
    class RedisCircuitBreaker {
      <<adapter>>
    }
    class RedisAiQuota {
      <<adapter>>
    }
  }

  MessageController --> ClassificationService
  ClassificationService --> AiEngine
  ClassificationService --> DecisionTracePort
  ClassificationService --> DomainEventPublisherPort
  AiEngine --> AiProviderPort : Strategy
  AiEngine --> AiQuotaPort
  AiEngine --> CircuitBreakerPort
  AiEngine --> PiiMaskerPort
  ClaudeProviderAdapter ..|> AiProviderPort : 1º primário
  GeminiProviderAdapter ..|> AiProviderPort : 2º alternativo
  LocalEngineAdapter ..|> AiProviderPort : 3º motor local
  RedisCircuitBreaker ..|> CircuitBreakerPort
  RedisAiQuota ..|> AiQuotaPort
  SessionMessage "1" --> "0..1" MessageClassification : classificationId
  MessageClassification --> MessageClass
  MessageClassification ..> AiInferenceLog : aiInferenceId
  AiInferenceLog --> AiCapability
  AiInferenceLog --> AiMode
  AiEngine ..> AiInferenceLog : grava
  AiEngine ..> AiQuota
  AiEngine ..> AiProviderCircuitState
  DecisionTraceNode "1" --> "*" DecisionTraceEdge : CLASSIFICOU
  DecisionTraceNode ..> MessageClassification : refId (nodeType CLASSIFICACAO)

  note for MessageClassification "tabela message_classifications (RF7) · confirmedByUserId = correção humana"
  note for AiInferenceLog "tabela ai_inference_log · result OK · FALLBACK · ERRO · BLOQUEADO_SIGILO · provider CLAUDE · GEMINI · LOCAL · .. +6 campos .."
  note for AiProviderCircuitState "Redis · state CLOSED · OPEN · HALF_OPEN"
```

## 2. Diagrama de atividades

Raias: Participante (autor/admin, só na confirmação) · Web/BFF · `ws-application` · IA (AiEngine) · Persistência. O gatilho é o evento `MessageSent` do RF6, não uma ação humana.

```mermaid
flowchart TD
  subgraph L1["Ator humano — Autor ou administrador da sessão"]
    A1["Vê o badge da classe no card (cor + nome em texto + faísca)"] --> A2{"Concorda com a classe?"}
    A2 -->|sim| A3["Confirma"]
    A2 -->|não| A4["Corrige para outra classe"]
    A20(["Classe revisada por humano (sem faísca)"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["SSE MessageClassified → atualiza o badge do card"]
    B2["POST /api/decia/sessions/{id}/messages/{msgId}/classification/confirm {label}"]
  end

  subgraph L3["ws-application — ClassificationService"]
    C0(["Evento MessageSent (AFTER_COMMIT do RF6)"]) --> C1{"authorKind HUMANO e não repetida?"}
    C1 -->|não| C2["Marca RUIDO ou ignora (não pontua)"]
    C1 -->|sim| C3["Monta contexto: tema, últimas N mensagens, anexos citados"]
    C3 --> C4{"Anexo RESTRITO/SIGILOSO ou sessão localOnly?"}
    C4 -->|sim| C5["Força provider LOCAL (BLOQUEADO_SIGILO para externos)"]
    C4 -->|não| C6["Mascara dados pessoais (PiiMasker)"]
    C6 --> C7{"AiQuota do departamento disponível?"}
    C7 -->|não| C5
    C7 -->|sim| C8["AiEngine.text(CLASSIFICAR_MENSAGEM, mode da sessão)"]
    C5 --> C8
    C12["Grava MessageClassification + classificationId na mensagem"] --> C13["DecisionTrace: nó CLASSIFICACAO + aresta CLASSIFICOU"]
    C13 --> C14["Publica MessageClassified (AFTER_COMMIT) → realtime, RF8, RF42"]
    C15{"É autor ou adminUserId?"}
    C15 -->|não| E403["403 ACESSO_NEGADO"]
    C15 -->|sim| C16{"label no enum MessageClass?"}
    C16 -->|não| E422["422 VALIDACAO"]
    C16 -->|sim| C17["Atualiza label + confirmedByUserId (mantém aiInferenceId)"]
    C17 --> C14
  end

  subgraph L4["IA (AiEngine — Strategy + Chain)"]
    I1{"Circuito do primário CLOSED/HALF_OPEN?"}
    I1 -->|sim| I2["Claude ou Gemini (primário) com timeout"]
    I1 -->|não| I4
    I2 --> I3{"Resposta válida (JSON label, confidence, rationale, evidence)?"}
    I3 -->|sim| I7["AiInferenceLog result OK"]
    I3 -->|não ou timeout| I4{"Circuito do alternativo permite?"}
    I4 -->|sim| I5["Provedor alternativo"]
    I4 -->|não| I6
    I5 --> I3b{"Resposta válida?"}
    I3b -->|sim| I7b["AiInferenceLog result FALLBACK"]
    I3b -->|não| I6["Motor local: regras + embeddings locais"]
    I6 --> I7c["AiInferenceLog result FALLBACK ou BLOQUEADO_SIGILO · aviso no card"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL: message_classifications, session_messages_idx.classification_id, ai_inference_log, decision_trace_nodes/edges, domain_events")]
    D2[("Redis: AiQuota quota:{scope}:{id}:{month} · AiProviderCircuitState")]
    D3[("Cassandra: trace_by_entity (espelho) · messages_by_session (leitura do contexto)")]
  end

  C3 --> D3
  C7 --> D2
  C8 --> I1
  I7 --> C12
  I7b --> C12
  I7c --> C12
  C12 --> D1
  C13 --> D1
  C13 --> D3
  C14 --> B1 --> A1
  A3 --> B2
  A4 --> B2
  B2 --> C15
  C17 --> D1
  C14 --> A20

  classDef erro fill:#fde2e2,stroke:#c0392b,color:#7b1d1d;
  class E403,E422 erro;
```

## 3. Diagrama de sequência

Caminho feliz (primário responde), `alt` de fallback em cadeia (CA02), `alt` de sigilo (CA03) e confirmação humana (CA05). Sem ponto e vírgula nas mensagens.

```mermaid
sequenceDiagram
  autonumber
  participant DE as DomainEvents (AFTER_COMMIT)
  participant CL as ClassificationService (ws-application)
  participant CS as Cassandra
  participant R as Redis
  participant AI as AiEngine
  participant P1 as Claude (primário)
  participant P2 as Gemini (alternativo)
  participant LC as Motor local (LocalEngineAdapter)
  participant DB as Repository/MySQL
  participant N as Next.js (App Router) /decia/[id]
  actor U as Usuário (autor ou admin)
  participant C as MessageController (ws-web)

  DE->>CL: MessageSent(sessionId, messageId, authorId, localOnly, correlationId)
  CL->>CS: SELECT messages_by_session (mensagem + últimas 20 do contexto)
  CL->>DB: SELECT decia_sessions (topic, aiMode) + message_attachments (accessClass)
  alt anexo RESTRITO/SIGILOSO ou sessão localOnly (CA03)
    CL->>AI: text(CLASSIFICAR_MENSAGEM, providers=[LOCAL], reason=SIGILO)
    AI->>LC: complete(request)
    LC-->>AI: label, confidence, rationale
    AI->>DB: INSERT ai_inference_log (provider LOCAL, result BLOQUEADO_SIGILO para externos, maskedFields)
    AI-->>CL: AiOutcome (local, aviso de sigilo)
  else mensagem comum (CA01, CA02)
    CL->>AI: text(CLASSIFICAR_MENSAGEM, mode=aiMode, protectedNames)
    AI->>AI: PiiMasker.mask (nomes, e-mails, CPF)
    AI->>R: AiQuota.tryConsume(DEPARTMENT, departmentId)
    alt sem cota mensal nem créditos
      AI->>LC: complete(request) com aviso "sem cota"
      LC-->>AI: resposta local
    else com cota
      AI->>R: CircuitBreaker.allow(CLAUDE)
      alt circuito CLOSED e primário responde no timeout
        AI->>P1: complete(prompt mascarado, JSON schema)
        P1-->>AI: {label, confidence, rationale, evidenceRefs}
        AI->>R: recordSuccess(CLAUDE)
        AI->>DB: INSERT ai_inference_log (CLAUDE, result OK, tokens, custo, latência)
      else timeout, erro 5xx ou circuito OPEN (CA02)
        AI->>R: recordFailure(CLAUDE) → pode abrir o circuito
        AI->>P2: complete(prompt mascarado)
        alt alternativo responde
          P2-->>AI: {label, confidence, rationale}
          AI->>DB: INSERT ai_inference_log (GEMINI, result FALLBACK, fallbackUsed=true)
        else alternativo também falha
          AI->>LC: complete(request)
          LC-->>AI: label por regras + embeddings locais
          AI->>DB: INSERT ai_inference_log (LOCAL, result FALLBACK, fallbackUsed=true)
        end
      end
    end
    AI-->>CL: AiOutcome (label, confidence, rationale, provider, aiInferenceId)
  end
  CL->>DB: BEGIN · INSERT message_classifications · UPDATE session_messages_idx SET classification_id · INSERT decision_trace_nodes (CLASSIFICACAO) + decision_trace_edges (CLASSIFICOU) · INSERT domain_events MessageClassified · COMMIT (CA04)
  CL->>CS: UPDATE messages_by_session SET classification_id (eventual)
  DE->>R: AFTER_COMMIT → PUBLISH decia.session.{id} MessageClassified (CA01)
  R-->>N: SSE → badge da classe com cor, nome em texto e faísca (CA04)
  DE->>DE: AFTER_COMMIT → DivergenceService (se DIVERGENCIA, RF8) · PointsService evento idempotente (RF42) (CA06)

  U->>N: corrige a classe de RISCO para DIVERGENCIA
  N->>C: POST /api/decia/sessions/{id}/messages/{msgId}/classification/confirm {label}
  C->>CL: confirm(currentUser, sessionId, messageId, DIVERGENCIA)
  alt não é autor nem adminUserId (CA05)
    CL-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else autor ou admin (CA05)
    CL->>DB: UPDATE message_classifications SET label, confirmed_by_user_id (mantém ai_inference_id)
    CL->>DB: INSERT domain_events MessageClassified(confirmed=true)
    CL-->>C: 200 ClassificationView (revisado por humano)
    C-->>N: 200 → badge sem faísca, tooltip "revisado por [pessoa]"
    DE->>DB: AFTER_COMMIT → métrica de aceitação para o painel IA do sistema (RF43.CA12)
  end
```

## 4. Máquina de estados

Entidade central: `MessageClassification`. Não há enum de status na TAXONOMIA, então os estados são **implícitos**: pendente (mensagem sem `classificationId`), em inferência (cadeia do AiEngine), classificada (`label` + `aiInferenceId`) e revisada (`confirmedByUserId`). O estado composto mostra a cadeia primário → alternativo → local e o circuito do provedor.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> PENDENTE : MessageSent (RF6) com authorKind HUMANO

  state "EM_INFERENCIA (AiEngine Strategy + Chain)" as EM_INFERENCIA {
    [*] --> PRIMARIO : circuito CLOSED ou HALF_OPEN
    [*] --> LOCAL_SIGILO : anexo RESTRITO/SIGILOSO ou sem cota (RF7.CA03)
    PRIMARIO --> ALTERNATIVO : timeout, erro ou circuito OPEN
    ALTERNATIVO --> LOCAL : timeout ou erro
    PRIMARIO --> [*] : resposta válida (result OK)
    ALTERNATIVO --> [*] : resposta válida (result FALLBACK)
    LOCAL --> [*] : regras + embeddings (result FALLBACK)
    LOCAL_SIGILO --> [*] : regras + embeddings (result BLOQUEADO_SIGILO)
  }

  PENDENTE --> EM_INFERENCIA : ClassificationService.classify
  EM_INFERENCIA --> CLASSIFICADA : label ARGUMENTO · DIVERGENCIA · RISCO · CONSENSO · PERGUNTA · RUIDO + aiInferenceId (RF7.CA01)
  EM_INFERENCIA --> ERRO : todos os provedores falharam (result ERRO, nova tentativa com backoff)
  ERRO --> EM_INFERENCIA : retry (PipelineJob REPROCESSAR)
  CLASSIFICADA --> REVISADA : autor ou admin confirma ou corrige (confirmedByUserId, RF7.CA05)
  CLASSIFICADA --> PENDENTE : mensagem editada em até 5 min (RF6.CA05) → reclassifica
  REVISADA --> [*]

  note right of CLASSIFICADA
    Dispara MessageClassified (RF7.CA06):
    DIVERGENCIA → RF8 · RISCO/PERGUNTA → AiQuestion
    ARGUMENTO com evidência / CONSENSO → DECIA Points (RF42)
    RUIDO → nada
  end note
  note left of EM_INFERENCIA
    AiProviderCircuitState por provedor:
    CLOSED → OPEN após N falhas → HALF_OPEN após espera
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/(app)/decia/[sessionId]/page.tsx (MessageCard com ClassBadge)"]
    FE2["components/ui (ClassBadge: cor + nome em texto, AiSpark ✦ tooltip, ConfirmClassMenu)"]
    FE3["lib/decia/useSessionStream.ts (MessageClassified)"]
  end

  subgraph WEB["ws-web"]
    W1["MessageController /api/decia/sessions/{id}/messages/{msgId}/classification · /confirm"]
    W2["SessionStreamController (SSE)"]
  end

  subgraph APP["ws-application"]
    S1["ClassificationService (listener MessageSent)"]
    S2["AiEngine (Strategy + Chain, PiiMasker, log)"]
    S3["DecisionTraceService"]
    P1["AiProviderPort · CircuitBreakerPort · AiQuotaPort · PiiMaskerPort"]
    P2["MessageStorePort · DecisionTracePort · DomainEventPublisherPort · RealtimePublisherPort"]
  end

  subgraph DOM["ws-domain"]
    D1["SessionMessage · MessageClassification · AiInferenceLog · AiQuota · AiProviderCircuitState · DecisionTraceNode · DecisionTraceEdge"]
    D2["MessageClass · AiCapability · AiMode · AccessClassification · TraceNodeType"]
    D3["MessageClassificationRepository · AiInferenceLogRepository · DecisionTraceNodeRepository"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["ai-providers (ClaudeProviderAdapter, GeminiProviderAdapter, LocalEngineAdapter: regras + embeddings locais)"]
    I2["cache-redis (RedisCircuitBreaker, RedisAiQuota, RedisRealtimePublisher)"]
    I3["persistence-mysql (message_classifications, ai_inference_log, decision_trace_nodes/edges, domain_events)"]
    I4["persistence-cassandra (messages_by_session leitura de contexto, trace_by_entity)"]
    I5["platform (OutboxEventPublisher, FeatureFlags ai.provider.claude / ai.provider.gemini / ai.local.only)"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude (Anthropic API)"]
    X2["Gemini (Google AI)"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  RD[("Redis")]

  FE1 --> FE2
  FE1 --> FE3
  FE1 -->|HTTPS/JSON| W1
  FE3 -->|SSE| W2
  W1 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> P2
  S2 --> P1
  S1 --> D1
  S1 --> D3
  I1 -.->|implementa| P1
  I2 -.->|implementa| P1
  I2 -.->|implementa| P2
  I3 -.->|implementa| P2
  I4 -.->|implementa| P2
  I5 -.->|implementa| P2
  I5 -.->|flags| S2
  I1 -->|primário| X1
  I1 -->|alternativo| X2
  W2 --> I2
  D3 --> I3
  I3 --> MY
  I4 --> CA
  I2 --> RD
  BOOT["ws-bootstrap (chaves de API, timeouts, limiares do circuit breaker, cota mensal padrão)"] -.-> INFRA
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) |
|---|---|---|---|---|---|
| RF7.CA01 | `ClassificationService.onMessageSent/classify`, `MessageClassification.label/confidence/rationale/hasEvidence`, `MessageClass`, `SessionMessage.classificationId` | `C0`, `C1`, `C3`, `C8`, `C12`, `B1` | 1–3, 12, 30–33 | `[*] → PENDENTE → EM_INFERENCIA → CLASSIFICADA` | `S1`, `W2`, `FE3`, `I3 message_classifications` |
| RF7.CA02 | `AiEngine.text/chain`, `AiProviderPort` (Claude → Gemini → Local), `CircuitBreakerPort`/`AiProviderCircuitState`, `AiInferenceLog` | `I1`–`I7c` | 17–29 (`alt` timeout/erro → alternativo → local, `ai_inference_log` OK/FALLBACK) | composto `EM_INFERENCIA` (PRIMARIO → ALTERNATIVO → LOCAL), `→ ERRO` | `S2`, `I1 ai-providers`, `I2 RedisCircuitBreaker`, `X1`, `X2` |
| RF7.CA03 | `ClassificationService.localOnly`, `PiiMaskerPort`, `AiInferenceLog.maskedFields/result BLOQUEADO_SIGILO`, `AccessClassification` | `C4` → `C5`, `C6` | 4–9 (`alt` sigilo → só LOCAL), 13 (mask) | `[*] → LOCAL_SIGILO` | `I1 LocalEngineAdapter`, `S2 PiiMasker`, `I5 ai.local.only` |
| RF7.CA04 | `MessageClassification.linkedTaskId/linkedProjectId`, `DecisionTraceNode CLASSIFICACAO`, `DecisionTraceEdge CLASSIFICOU`, `DecisionTracePort` | `C13`, `B1`, `A1` | 30 (nós/arestas do trace), 33 (badge cor + texto + faísca) | nota em `CLASSIFICADA` | `FE2 ClassBadge/AiSpark`, `S3`, `I3 decision_trace_*`, `I4 trace_by_entity` |
| RF7.CA05 | `ClassificationService.confirm`, `MessageClassification.confirmedByUserId`, `MessageController.confirmClassification` | `A2`–`A4`, `B2`, `C15` → `E403`, `C16` → `E422`, `C17` | 35–44 (`confirm`, 403, revisado por humano) | `CLASSIFICADA → REVISADA` | `W1 /confirm`, `FE2 ConfirmClassMenu` |
| RF7.CA06 | `DomainEventPublisherPort` (`MessageClassified`), `AiQuotaPort`/`RedisAiQuota`/`AiQuota`, `SessionMessage.similarityHash` | `C1` → `C2`, `C7`, `C14` | 14–16 (cota), 34 (→ RF8, RF42) | nota em `CLASSIFICADA` | `I2 RedisAiQuota`, `I5 OutboxEventPublisher` |
