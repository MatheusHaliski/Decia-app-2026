# RF11 — Gerar e disponibilizar ao grupo da conversa um resumo analítico estruturado da sessão, contendo argumentos identificados, consensos, divergências, riscos, pontos de atenção e recomendações fundamentadas, incluindo cenários alternativos, vantagens, desvantagens e critérios de avaliação utilizados pela IA
**HU:** HU11 · **Sprint (board Work Station):** 2 · **Equivalente FAI:** card RF11 não cita equivalente; pelo Mapa de equivalência o DECIA é o **RF10 Copilot** do FAI (sugestões do Copilot) + **RF24 IA do sistema**; a Loja (RF42) vende "sessão com IA avançada e resumo analítico estendido" · **Aba/rota:** DECIA — sessão › aba "Resumo" (`/decia/[sessionId]/summary`; rota a confirmar)
**Critérios de aceite cobertos:** RF11.CA01 · RF11.CA02 · RF11.CA03 · RF11.CA04 · RF11.CA05 · RF11.CA06 (RF1–RF18 não têm CAs no board: derivados da HU11 + RF29.CA08, RF31.CA02/CA04, RF32.CA05, RF33.CA03, RF42 e marcados "CA a confirmar")

> **HU11** — COMO IA do sistema POSSO gerar e disponibilizar ao grupo um resumo analítico estruturado da sessão — com argumentos, consensos, divergências, riscos e pontos de atenção — e recomendações fundamentadas com cenários alternativos, vantagens, desvantagens e critérios de avaliação PARA consolidar a discussão e apoiar o grupo na tomada de decisão.

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF11.CA01** | Dado sessão ATIVA ou REABERTA com mensagens classificadas (RF7), quando o administrador aciona "Gerar resumo" (ou a IA sugere ao detectar convergência), então a sessão passa a EM_RESUMO e a IA (capability RESUMO_ANALITICO) cria `AnalyticalSummary` RASCUNHO com `argumentsJson`, `consensusJson`, `divergencesJson` (RF8/RF10, inclusive SEM_CONSENSO), `risksJson`, `attentionPointsJson` (perguntas IGNORADAS do RF16) e `recommendationsJson`. |
| **RF11.CA02** | Dado o resumo gerado, então contém **≥ 2 `SummaryScenario`** (name, description, `advantagesJson`, `disadvantagesJson`, `criteriaScoresJson`) e `evaluationCriteriaJson` explicita os critérios usados pela IA; um cenário pode apontar `linkedProjectScenarioId` (Simulador RF31.CA04) e o `complianceResultId` do Espelho (RF32.CA05) entra no resumo. |
| **RF11.CA03** | Dado cada recomendação, então traz `citations[]` (`Citation`: sourceType, sourceId, excerpt, url, score) obtidas por busca semântica em `ws-memory` (RF33.CA03 — "baseado em: sessão X, projeto Y") ou a marca **"sem precedente"**, e lista `affectedTaskIds`, `affectedProjectIds` e `planAxisId` (RF29.CA08). |
| **RF11.CA04** | Dado o RASCUNHO, quando o administrador publica, então `status = PUBLICADO`, `versionNumber` incrementa a cada regeneração, o grupo recebe `Notification` (DECIA), o rastro ganha nó RESUMO com arestas RESUMIU a partir das mensagens-base, e os `MessageAttachment` usados ficam `usedInDecision = true` → evento AFTER_COMMIT credita **+6 DP** (`ARTEFATO_USADO`) ao autor do anexo (RF42). A sessão segue para EM_DECISAO (RF12). |
| **RF11.CA05** | Dado mensagens/anexos com `accessClass` RESTRITO ou SIGILOSO, quando o resumo é gerado, então esses trechos **não vão ao provedor externo** (mascarados ou processados no motor local), registrado em `ai_inference_log` com `maskedFields` / `result = BLOQUEADO_SIGILO`. |
| **RF11.CA06** | Dado provedor de IA indisponível (circuit OPEN) ou cota esgotada → `503 IA_INDISPONIVEL` / `429 COTA_EXCEDIDA` e a sessão volta a ATIVA; sessão sem mensagens classificadas → `422 VALIDACAO`; não-admin → `403 ACESSO_NEGADO`; sessão fora de ATIVA/REABERTA → `409 SESSAO_NAO_ATIVA`. |

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
  class AnalyticalSummary {
    <<entity>>
    +UUID id
    +UUID sessionId
    +int versionNumber
    +Instant generatedAt
    +String argumentsJson
    +String consensusJson
    +String divergencesJson
    +String risksJson
    +String attentionPointsJson
    +String recommendationsJson
    +String evaluationCriteriaJson
    +UUID complianceResultId
    +UUID aiInferenceId
    +SummaryStatus status
  }
  class SummaryScenario {
    <<entity>>
    +UUID id
    +UUID summaryId
    +String name
    +String description
    +String advantagesJson
    +String disadvantagesJson
    +String criteriaScoresJson
    +UUID linkedProjectScenarioId
  }
  class Citation {
    <<entity>>
    +String sourceType
    +UUID sourceId
    +String excerpt
    +String url
    +BigDecimal score
  }
  class InstitutionalMemoryDocument {
    <<entity>>
    +String docId
    +String sourceType
    +UUID sourceId
    +UUID companyId
    +UUID departmentId
    +String title
    +String text
    +float[] embedding
    +Visibility visibility
    +AccessClassification accessClass
  }
  class MessageClassification {
    <<entity>>
    +UUID id
    +UUID messageId
    +MessageClass label
    +boolean hasEvidence
    +UUID linkedTaskId
    +UUID linkedProjectId
  }
  class Divergence {
    <<entity>>
    +UUID id
    +String summary
    +DivergenceStatus status
  }
  class AiQuestion {
    <<entity>>
    +UUID id
    +String kind
    +String questionText
    +String status
  }
  class MessageAttachment {
    <<entity>>
    +UUID id
    +TIMEUUID messageId
    +String targetType
    +UUID targetId
    +boolean usedInDecision
  }
  class ComplianceResult {
    <<entity>>
    +UUID id
    +UUID projectId
    +BigDecimal percent
    +int blockingCount
  }
  class ProjectScenario {
    <<entity>>
    +UUID id
    +UUID projectId
    +String name
    +String impactReportJson
  }
  class DecisionTraceNode {
    <<entity>>
    +UUID id
    +TraceNodeType nodeType
    +UUID refId
    +String label
  }
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +String provider
    +AiMode mode
    +String result
    +String maskedFields
    +int inputTokens
    +int outputTokens
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +String idempotencyKey
  }

  class SessionStatus {
    <<enum>>
    ATIVA
    EM_RESUMO
    EM_DECISAO
    REABERTA
  }
  class SummaryStatus {
    <<enum>>
    RASCUNHO
    PUBLICADO
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
    RESUMO_ANALITICO
    MEMORIA_BUSCA
    CONFORMIDADE
  }

  class SummaryController {
    <<controller>>
    +generate(sessionId) 202
    +getLatest(sessionId) 200
    +publish(sessionId, summaryId) 200
    +regenerate(sessionId, summaryId, instruction) 202
  }
  class SummaryService {
    <<service>>
    +generate(actor, sessionId) AnalyticalSummary
    +publish(actor, sessionId, summaryId)
    +regenerate(actor, sessionId, summaryId, instruction)
    -collectContext(sessionId) SummaryContext
    -maskSensitive(context) SummaryContext
  }
  class SessionLifecycleService {
    <<service>>
    +transition(sessionId, from, to)
  }
  class DecisionTraceService {
    <<service>>
    +appendNode(sessionId, RESUMO, summaryId)
    +appendEdges(fromMessageNodes, summaryNode, RESUMIU)
  }
  class DeciaPointsService {
    <<service>>
    +onSummaryPublished(event) AFTER_COMMIT
  }
  class AiEnginePort {
    <<port>>
    +summarize(SummaryContext) SummaryDraft
  }
  class MemorySearchPort {
    <<port>>
    +searchCitations(query, filters) List~Citation~
  }
  class SessionMessageRepositoryPort {
    <<port>>
    +findClassifiedBySession(sessionId) List~SessionMessage~
  }
  class AnalyticalSummaryRepository {
    <<adapter>>
    MySQL analytical_summaries + summary_scenarios
  }
  class OpenSearchMemoryAdapter {
    <<adapter>>
    índice ws-memory
  }
  class AiEngineAdapter {
    <<adapter>>
    Claude e Gemini com fallback local
  }
  class CassandraMessageAdapter {
    <<adapter>>
    messages_by_session
  }

  DeciaSession "1" --> "*" AnalyticalSummary : versões
  DeciaSession --> SessionStatus
  AnalyticalSummary --> SummaryStatus
  AnalyticalSummary "1" --> "2..*" SummaryScenario : cenários
  AnalyticalSummary ..> Citation : recommendationsJson.citations
  AnalyticalSummary ..> ComplianceResult : complianceResultId
  AnalyticalSummary ..> AiInferenceLog : aiInferenceId
  AnalyticalSummary ..> MessageClassification : argumentsJson e consensusJson
  AnalyticalSummary ..> Divergence : divergencesJson
  AnalyticalSummary ..> AiQuestion : attentionPointsJson
  SummaryScenario ..> ProjectScenario : linkedProjectScenarioId
  Citation ..> InstitutionalMemoryDocument : sourceId
  MessageClassification --> MessageClass
  DecisionTraceNode ..> AnalyticalSummary : refId quando RESUMO
  DeciaPointsLedgerEntry ..> MessageAttachment : refId ARTEFATO_USADO

  SummaryController --> SummaryService
  SummaryService --> SessionLifecycleService
  SummaryService --> SessionMessageRepositoryPort
  SummaryService --> MemorySearchPort
  SummaryService --> AiEnginePort
  SummaryService --> AnalyticalSummaryRepository
  SummaryService --> DecisionTraceService
  SummaryService ..> DeciaPointsService : evento SummaryPublished
  AiEnginePort <|.. AiEngineAdapter
  MemorySearchPort <|.. OpenSearchMemoryAdapter
  SessionMessageRepositoryPort <|.. CassandraMessageAdapter
  AiEngineAdapter --> AiInferenceLog : registra

  note for AnalyticalSummary "tabela analytical_summaries — status RASCUNHO, PUBLICADO .. recommendationsJson = [{text, affectedTaskIds, affectedProjectIds, planAxisId, citations[]}] .."
  note for SummaryScenario "tabela summary_scenarios — mesmo formato do impactReportJson do RF31"
  note for Citation "valor embutido — vazio = marca 'sem precedente' (RF33.CA03)"
  note for InstitutionalMemoryDocument "OpenSearch ws-memory (dense_vector) .. +4 campos .."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Administrador da sessão / Grupo"]
    A0(["Sessão ATIVA ou REABERTA com discussão madura"])
    A1["Admin aciona Gerar resumo (ou aceita sugestão da IA)"]
    A2["Admin revisa o rascunho (argumentos, cenários, critérios, citações)"]
    A3{"Publicar ou regenerar?"}
    A4["Admin informa instrução de ajuste"]
    A5["Grupo lê o resumo publicado e os cenários"]
    A6(["Fim — sessão em EM_DECISAO (RF12)"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["POST /api/decia/sessions/{id}/summaries"]
    B2["Polling GET /api/decia/sessions/{id}/summaries/latest"]
    B3["POST /api/decia/sessions/{id}/summaries/{sid}/publish"]
    B4["POST /api/decia/sessions/{id}/summaries/{sid}/regenerate"]
    B5["Exibe 403 ACESSO_NEGADO"]
    B6["Exibe 409 SESSAO_NAO_ATIVA"]
    B7["Exibe 422 VALIDACAO — sem mensagens classificadas"]
    B8["Exibe 503 IA_INDISPONIVEL ou 429 COTA_EXCEDIDA"]
    B9["Renderiza abas: Argumentos · Consensos · Divergências · Riscos · Atenção · Recomendações · Cenários"]
  end

  subgraph L3["ws-application (SummaryService)"]
    C1{"actor = adminUserId?"}
    C2{"status em ATIVA ou REABERTA?"}
    C3{"há mensagens classificadas?"}
    C4["SessionLifecycleService: ATIVA → EM_RESUMO"]
    C5["collectContext: classificações, divergências, perguntas, anexos, ComplianceResult, cenários RF31"]
    C6["maskSensitive: remove RESTRITO/SIGILOSO do prompt externo"]
    C7["MemorySearchPort.searchCitations por tema e recomendações"]
    C8["AiEnginePort.summarize(context + citações)"]
    C9{"IA respondeu?"}
    C10["Salva AnalyticalSummary RASCUNHO + SummaryScenario (≥2) + evaluationCriteriaJson"]
    C11["Marca recomendações sem citação como 'sem precedente'"]
    C12["EM_RESUMO → ATIVA (rollback do estado)"]
    C13["status = PUBLICADO, versionNumber++"]
    C14["MessageAttachment.usedInDecision = true nos anexos citados"]
    C15["Rastro: nó RESUMO + arestas RESUMIU"]
    C16["Publica SummaryPublished (outbox)"]
    C17["SessionLifecycleService: EM_RESUMO → EM_DECISAO"]
  end

  subgraph L4["IA (AiEngine)"]
    D1["RESUMO_ANALITICO: estrutura argumentos/consensos/divergências/riscos/pontos de atenção"]
    D2["Gera recomendações com cenários, vantagens, desvantagens, criteriaScores"]
    D3["Anexa citações (baseado em: sessão X, projeto Y)"]
    D4["AiInferenceLog (provider, mode, tokens, maskedFields)"]
    D5["Circuit breaker / cota: FALLBACK local ou ERRO"]
  end

  subgraph L5["Persistência"]
    E1[("Cassandra messages_by_session")]
    E2[("MySQL message_classifications · divergences · ai_questions · compliance_results")]
    E3[("OpenSearch ws-memory")]
    E4[("MySQL analytical_summaries · summary_scenarios")]
    E5[("MySQL decision_trace_nodes/edges · domain_events")]
  end

  subgraph L6["Listeners AFTER_COMMIT"]
    F1["NotificationPort: grupo — Resumo analítico disponível"]
    F2["DeciaPointsService: +6 DP ARTEFATO_USADO ao autor de cada anexo usado"]
  end

  A0 --> A1 --> B1 --> C1
  C1 -->|não| B5 --> A6
  C1 -->|sim| C2
  C2 -->|não| B6 --> A6
  C2 -->|sim| C3
  C3 -->|não| B7 --> A6
  C3 -->|sim| C4 --> C5
  C5 --> E1
  C5 --> E2
  C5 --> C6 --> C7 --> E3
  C7 --> C8 --> D1 --> D2 --> D3 --> D4
  D5 -.-> C9
  D4 --> C9
  C9 -->|erro / cota| C12 --> B8 --> A6
  C9 -->|sim| C10 --> E4
  C10 --> C11 --> B2 --> A2 --> A3
  A3 -->|regenerar| A4 --> B4 --> C5
  A3 -->|publicar| B3 --> C13 --> E4
  C13 --> C14 --> C15 --> E5
  C15 --> C16 --> E5
  C16 --> F1
  C16 --> F2
  C16 --> C17 --> B9 --> A5 --> A6
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (admin da sessão)
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — gerar rascunho, publicar, notificar e creditar anexos usados
    U->>FE: Clica "Gerar resumo analítico"
    FE->>C: POST /api/decia/sessions/{id}/summaries
    C->>S: SummaryService.generate(actor, sessionId)
    S->>DB: SELECT decia_sessions (adminUserId, status, linkedProjectId, planAxisId)
    S->>DB: UPDATE decia_sessions SET status = EM_RESUMO
    S->>CS: SELECT messages_by_session (sessionId) — bodyMd, attachmentsJson
    S->>DB: SELECT message_classifications, divergences, ai_questions, compliance_results, project_scenarios
    S->>S: maskSensitive(accessClass RESTRITO/SIGILOSO)
    S->>OS: kNN ws-memory (tema + argumentos, filtros empresa/departamento/visibilidade)
    OS-->>S: top-k InstitutionalMemoryDocument → Citation[]
    S->>AI: summarize(context, citations, aiMode)
    AI-->>S: SummaryDraft {arguments, consensus, divergences, risks, attentionPoints, recommendations[], scenarios[2..n], evaluationCriteria}
    S->>DB: INSERT ai_inference_log (RESUMO_ANALITICO, provider, tokens, maskedFields)
    S->>DB: INSERT analytical_summaries (RASCUNHO, versionNumber = n+1)
    S->>DB: INSERT summary_scenarios (name, advantagesJson, disadvantagesJson, criteriaScoresJson, linkedProjectScenarioId)
    S-->>C: 202 {summaryId, status RASCUNHO}
    C-->>FE: 202
    FE->>C: GET /api/decia/sessions/{id}/summaries/latest
    C-->>FE: 200 AnalyticalSummary + scenarios (recomendações sem citação marcadas "sem precedente")
    FE-->>U: Rascunho para revisão
    U->>FE: Clica "Publicar"
    FE->>C: POST /api/decia/sessions/{id}/summaries/{sid}/publish
    C->>S: SummaryService.publish(actor, sessionId, summaryId)
    S->>DB: UPDATE analytical_summaries SET status = PUBLICADO
    S->>DB: UPDATE message_attachments SET usedInDecision = true WHERE id IN (citados)
    S->>DB: INSERT decision_trace_nodes (RESUMO) + decision_trace_edges (RESUMIU) a partir dos nós MENSAGEM
    S->>DB: UPDATE decia_sessions SET status = EM_DECISAO
    S->>DB: INSERT domain_events (SummaryPublished)
    S-->>C: 200 {summary PUBLICADO}
    C-->>FE: 200
    FE-->>U: Resumo publicado — abas por seção
    EV-->>S: NotificationPort.notify(participantes, RESUMO_DISPONIVEL)
    EV-->>S: DeciaPointsService.onSummaryPublished → INSERT decia_points_ledger (+6 ARTEFATO_USADO, idempotencyKey)
  end

  alt RF11.CA06 — provedor indisponível ou cota esgotada
    S->>AI: summarize(...)
    AI-->>S: ERRO (circuit OPEN) ou COTA_EXCEDIDA
    S->>DB: INSERT ai_inference_log (result ERRO)
    S->>DB: UPDATE decia_sessions SET status = ATIVA
    S-->>C: 503 IA_INDISPONIVEL ou 429 COTA_EXCEDIDA
    C-->>FE: 503 / 429
    FE-->>U: "IA indisponível — tente novamente" (oferece modo ECONOMIA)
  else RF11.CA06 — sem mensagens classificadas
    S->>DB: SELECT count(message_classifications) = 0
    S-->>C: 422 VALIDACAO
    C-->>FE: 422
  else RF11.CA06 — não é o admin da sessão
    S->>DB: SELECT decia_sessions.adminUserId ≠ actor
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
  end
```

## 4. Máquina de estados

Entidade central: `AnalyticalSummary.status` (RASCUNHO → PUBLICADO), acoplada ao trecho ATIVA → EM_RESUMO → EM_DECISAO de `SessionStatus` (`DeciaSession`).

```mermaid
stateDiagram-v2
  state "SessionStatus (DeciaSession)" as Sess {
    ATIVA --> EM_RESUMO : admin aciona Gerar resumo — RF11.CA01
    REABERTA --> EM_RESUMO : novo ciclo após reabertura (RF14)
    EM_RESUMO --> ATIVA : IA indisponível, cota ou 422 — RF11.CA06
    EM_RESUMO --> EM_DECISAO : resumo PUBLICADO — RF11.CA04
  }

  state "AnalyticalSummary.status" as Sum {
    [*] --> RASCUNHO : IA gera versão n+1 (RESUMO_ANALITICO)
    RASCUNHO --> RASCUNHO : regenerar com instrução (nova linha, versionNumber++)
    RASCUNHO --> PUBLICADO : admin publica — RF11.CA04
    PUBLICADO --> [*]
  }

  EM_RESUMO --> RASCUNHO : gera
  PUBLICADO --> EM_DECISAO : dispara

  note right of RASCUNHO
    ≥ 2 SummaryScenario
    evaluationCriteriaJson preenchido
    recomendações sem citação = "sem precedente"
  end note
  note right of PUBLICADO
    AFTER_COMMIT: Notification ao grupo
    +6 DP ARTEFATO_USADO por anexo usado
    nó RESUMO no DecisionTrace
    versões anteriores permanecem (histórico)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/decia/[sessionId]/summary/page.tsx"]
    FE2["components/ui/SummaryTabs · ScenarioCard · CitationChip · CriteriaTable"]
  end

  subgraph WEB["ws-web"]
    W1["SummaryController (REST /api/decia/sessions/{id}/summaries)"]
    W2["SessionAccessGuard (adminUserId)"]
  end

  subgraph APP["ws-application"]
    S1["SummaryService"]
    S2["SessionLifecycleService"]
    S3["DecisionTraceService"]
    S4["DeciaPointsService (listener AFTER_COMMIT)"]
    P1["AiEnginePort"]
    P2["MemorySearchPort"]
    P3["SessionMessageRepositoryPort"]
    P4["NotificationPort"]
    P5["DomainEventPublisher (outbox)"]
  end

  subgraph DOM["ws-domain"]
    D1["AnalyticalSummary · SummaryScenario · Citation"]
    D2["DeciaSession · MessageClassification · Divergence · AiQuestion · MessageAttachment"]
    D3["ComplianceResult · ProjectScenario (leitura)"]
    D4["Enums: SessionStatus · MessageClass · AiCapability · AiMode"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["persistence-mysql: AnalyticalSummaryRepository, SummaryScenarioRepository, MessageClassificationRepository, DivergenceRepository, AiQuestionRepository, ComplianceResultRepository, ProjectScenarioRepository, DecisionTraceRepository, DomainEventOutboxRepository"]
    I2["persistence-cassandra: CassandraMessageAdapter"]
    I3["search-opensearch: OpenSearchMemoryAdapter (ws-memory, kNN)"]
    I4["cache-redis: AiQuotaAdapter, CircuitStateAdapter"]
    I5["ai-providers: AiEngineAdapter (Strategy + Chain of Responsibility, mascaramento LGPD, ai_inference_log)"]
    I6["platform: NotificationAdapter, OutboxRelay, AuditLogAdapter"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  OS[("OpenSearch")]
  RD[("Redis")]

  FE1 --> FE2 -->|HTTPS/JSON| W1 --> W2 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> P1
  S1 --> P2
  S1 --> P3
  S1 --> P4
  S1 --> P5
  P5 -.->|AFTER_COMMIT SummaryPublished| S4
  S1 --> D1
  S1 --> D2
  S1 --> D3
  D1 --> D4
  P1 -.-> I5
  P2 -.-> I3
  P3 -.-> I2
  P4 -.-> I6
  I5 --> I4
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
| RF11.CA01 | `AnalyticalSummary` (argumentsJson … recommendationsJson), `SummaryService.generate`, `SessionLifecycleService`, `AiEnginePort.summarize`, `AiCapability.RESUMO_ANALITICO` | A1, B1, C1–C5, C8, C10, D1, D4 | 1–16 | ATIVA/REABERTA → EM_RESUMO; [*] → RASCUNHO | `SummaryController`, `SummaryService`, `AiEngineAdapter`, `CassandraMessageAdapter` |
| RF11.CA02 | `SummaryScenario` (advantagesJson, disadvantagesJson, criteriaScoresJson, linkedProjectScenarioId), `AnalyticalSummary.evaluationCriteriaJson/complianceResultId`, `ProjectScenario`, `ComplianceResult` | C5, C10, D2 | 7, 12, 15 | nota de RASCUNHO | `SummaryScenarioRepository`, `ComplianceResultRepository`, `ProjectScenarioRepository` |
| RF11.CA03 | `Citation`, `InstitutionalMemoryDocument`, `MemorySearchPort.searchCitations`, `recommendationsJson.affectedTaskIds/affectedProjectIds/planAxisId` | C7, C11, D3, E3 | 9–10, 19 ("sem precedente") | nota de RASCUNHO | `OpenSearchMemoryAdapter`, `CitationChip` |
| RF11.CA04 | `AnalyticalSummary.status/versionNumber`, `MessageAttachment.usedInDecision`, `DecisionTraceNode` RESUMO / aresta RESUMIU, `DeciaPointsService.onSummaryPublished`, `NotificationPort` | A3, B3, C13–C17, F1, F2 | 21–33 | RASCUNHO → PUBLICADO; EM_RESUMO → EM_DECISAO | `DecisionTraceService`, `DeciaPointsService`, `OutboxRelay`, `NotificationAdapter` |
| RF11.CA05 | `SummaryService.maskSensitive`, `AiInferenceLog.maskedFields/result BLOQUEADO_SIGILO`, `AccessClassification` | C6, D4 | 8, 13 | — | `AiEngineAdapter` (mascaramento LGPD), `ai.local.only` flag |
| RF11.CA06 | `AiProviderCircuitState`, `AiQuota`, guardas de `SummaryService` | C1–C3, C9, C12, B5–B8, D5 | `alt` 503/429, 422, 403 | EM_RESUMO → ATIVA | `AiQuotaAdapter`, `CircuitStateAdapter`, `SessionAccessGuard` |
