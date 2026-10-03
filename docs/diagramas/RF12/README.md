# RF12 — Registrar uma decisão final para o tema da conversa da sessão ativa, assim como enviá-la ao Administrador para revisão final
**HU:** HU12 · **Sprint (board Work Station):** 3 · **Equivalente FAI:** card RF12 não cita equivalente; pelo Mapa de equivalência o DECIA é o **RF10 Copilot** do FAI — a decisão proposta pela IA equivale à sugestão do Copilot que o usuário aceita/edita, aqui obrigatoriamente submetida a **revisão humana** (RF15) · **Aba/rota:** DECIA — sessão › aba "Decisão" (`/decia/[sessionId]/decision`; rota a confirmar)
**Critérios de aceite cobertos:** RF12.CA01 · RF12.CA02 · RF12.CA03 · RF12.CA04 · RF12.CA05 (RF1–RF18 não têm CAs no board: derivados da HU12 + RF11, RF15, RF29.CA05, RF33.CA03 e marcados "CA a confirmar")

> **HU12** — COMO IA do sistema POSSO registrar uma decisão final para o tema da sessão ativa e encaminhá-la ao administrador para revisão PARA formalizar a conclusão da discussão e garantir validação humana antes da publicação.

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF12.CA01** | Dado sessão EM_DECISAO com `AnalyticalSummary` PUBLICADO (RF11), quando a IA (capability DECISAO_FINAL) propõe a decisão — automaticamente após a publicação do resumo ou quando o administrador aciona "Propor decisão" — então é criada `FinalDecision` PROPOSTA com `decisionText`, `rationale`, `chosenScenarioId` (um `SummaryScenario` do resumo), `citationsJson` (RF33.CA03) e `proposedByAi = true`, `proposedAt`. |
| **RF12.CA02** | Dado a decisão PROPOSTA, quando é encaminhada ao administrador, então `status = EM_REVISAO`, a sessão passa a EM_REVISAO, o `adminUserId` recebe `Notification` (categoria DECIA, link para a revisão RF15) e o grupo vê "aguardando revisão"; o chat fica **somente leitura** (RF6 responde `409 SESSAO_NAO_ATIVA`). |
| **RF12.CA03** | Dado a proposta, então `summaryId` aponta para o último resumo PUBLICADO e `chosenScenarioId` pertence a esse resumo; cenário inexistente ou texto vazio → `422 VALIDACAO`; sessão sem resumo publicado → `409 RESUMO_AUSENTE`; sessão fora de EM_DECISAO → `409 SESSAO_NAO_ATIVA`. |
| **RF12.CA04** | Dado nova proposta para sessão que já tem decisão PROPOSTA (ex.: admin pede "Reformular" antes de encaminhar), então a anterior passa a SUBSTITUIDA e o rastro liga as duas (nó DECISAO novo, aresta DECIDIU a partir do nó RESUMO; aresta ORIGINOU da decisão substituída). |
| **RF12.CA05** | Dado perfil que não seja o administrador da sessão, quando tenta propor/editar/encaminhar manualmente, então `403 ACESSO_NEGADO`; o status VALIDADA **nunca** é atribuído neste RF — só pela revisão humana (RF15). |

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
    +AiMode aiMode
  }
  class AnalyticalSummary {
    <<entity>>
    +UUID id
    +UUID sessionId
    +int versionNumber
    +String recommendationsJson
    +String evaluationCriteriaJson
    +SummaryStatus status
  }
  class SummaryScenario {
    <<entity>>
    +UUID id
    +UUID summaryId
    +String name
    +String advantagesJson
    +String disadvantagesJson
    +String criteriaScoresJson
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
    +Instant proposedAt
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
  }
  class Citation {
    <<entity>>
    +String sourceType
    +UUID sourceId
    +String excerpt
    +String url
    +BigDecimal score
  }
  class DecisionTraceNode {
    <<entity>>
    +UUID id
    +UUID sessionId
    +TraceNodeType nodeType
    +UUID refId
    +String label
    +UUID actorId
    +Instant at
  }
  class DecisionTraceEdge {
    <<entity>>
    +UUID id
    +UUID fromNodeId
    +UUID toNodeId
    +TraceRelation relation
  }
  class Notification {
    <<entity>>
    +UUID id
    +UUID recipientId
    +NotificationType type
    +String category
    +String resourceType
    +UUID resourceId
  }
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +String provider
    +String result
    +BigDecimal confidence
  }

  class SessionStatus {
    <<enum>>
    EM_RESUMO
    EM_DECISAO
    EM_REVISAO
    REABERTA
  }
  class DecisionStatus {
    <<enum>>
    PROPOSTA
    EM_REVISAO
    VALIDADA
    DEVOLVIDA
    SUBSTITUIDA
  }
  class TraceRelation {
    <<enum>>
    ORIGINOU
    RESUMIU
    DECIDIU
    REVISOU
  }
  class AiCapability {
    <<enum>>
    DECISAO_FINAL
    RESUMO_ANALITICO
  }

  class DecisionController {
    <<controller>>
    +propose(sessionId) 201
    +update(sessionId, decisionId, DecisionForm) 200
    +submitForReview(sessionId, decisionId) 200
    +getCurrent(sessionId) 200
  }
  class DecisionService {
    <<service>>
    +propose(actor, sessionId) FinalDecision
    +onSummaryPublished(event) AFTER_COMMIT
    +update(actor, sessionId, decisionId, form)
    +submitForReview(actor, sessionId, decisionId)
    -supersede(previousDecision)
  }
  class SessionLifecycleService {
    <<service>>
    +transition(sessionId, from, to)
  }
  class DecisionTraceService {
    <<service>>
    +appendNode(sessionId, DECISAO, decisionId)
    +appendEdge(summaryNode, decisionNode, DECIDIU)
  }
  class AiEnginePort {
    <<port>>
    +proposeDecision(summary, scenarios, citations) DecisionDraft
  }
  class NotificationPort {
    <<port>>
    +notify(recipientId, type, resource)
  }
  class FinalDecisionRepository {
    <<adapter>>
    MySQL final_decisions
  }
  class AnalyticalSummaryRepository {
    <<adapter>>
    MySQL analytical_summaries + summary_scenarios
  }
  class AiEngineAdapter {
    <<adapter>>
    Claude e Gemini com fallback local
  }

  DeciaSession "1" --> "*" FinalDecision : decisões (1 ativa)
  DeciaSession --> SessionStatus
  FinalDecision --> DecisionStatus
  FinalDecision "*" --> "1" AnalyticalSummary : summaryId
  FinalDecision ..> SummaryScenario : chosenScenarioId
  FinalDecision ..> Citation : citationsJson
  FinalDecision ..> DecisionReview : reviewId (RF15)
  FinalDecision ..> AiInferenceLog : proposedByAi
  AnalyticalSummary "1" --> "2..*" SummaryScenario
  DecisionTraceEdge --> TraceRelation
  DecisionTraceEdge --> DecisionTraceNode : fromNodeId / toNodeId
  DecisionTraceNode ..> FinalDecision : refId quando DECISAO

  DecisionController --> DecisionService
  DecisionService --> SessionLifecycleService
  DecisionService --> DecisionTraceService
  DecisionService --> AiEnginePort
  DecisionService --> NotificationPort
  DecisionService --> FinalDecisionRepository
  DecisionService --> AnalyticalSummaryRepository
  AiEnginePort <|.. AiEngineAdapter
  NotificationPort ..> Notification : cria

  note for FinalDecision "tabela final_decisions — status PROPOSTA, EM_REVISAO, VALIDADA, DEVOLVIDA, SUBSTITUIDA .. stampJson só é preenchido no RF15 .."
  note for DecisionService "onSummaryPublished dispara a proposta automática (AFTER_COMMIT do RF11)"
  note for DecisionStatus "VALIDADA e DEVOLVIDA são atribuídos apenas pela revisão humana (RF15)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Administrador da sessão / Grupo"]
    A0(["Resumo analítico PUBLICADO (RF11) — sessão EM_DECISAO"])
    A1["Admin lê a decisão proposta pela IA (texto, justificativa, cenário, citações)"]
    A2{"Aceitar, editar ou reformular?"}
    A3["Admin edita texto/justificativa ou troca o cenário"]
    A4["Admin pede nova proposta à IA"]
    A5["Admin aciona Encaminhar para revisão"]
    A6["Grupo vê: aguardando revisão do administrador"]
    A7(["Fim — revisão humana (RF15)"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["GET /api/decia/sessions/{id}/decisions/current"]
    B2["PATCH /api/decia/sessions/{id}/decisions/{did}"]
    B3["POST /api/decia/sessions/{id}/decisions (nova proposta)"]
    B4["POST /api/decia/sessions/{id}/decisions/{did}/submit-review"]
    B5["Exibe 403 ACESSO_NEGADO"]
    B6["Exibe 409 RESUMO_AUSENTE ou 409 SESSAO_NAO_ATIVA"]
    B7["Exibe 422 VALIDACAO — cenário inválido ou texto vazio"]
    B8["Composer do chat em modo somente leitura"]
  end

  subgraph L3["ws-application (DecisionService)"]
    C0["Listener SummaryPublished (AFTER_COMMIT): propose automático"]
    C1{"status = EM_DECISAO e há resumo PUBLICADO?"}
    C2["Carrega resumo, cenários e citações"]
    C3["AiEnginePort.proposeDecision"]
    C4["Cria FinalDecision PROPOSTA (proposedByAi = true)"]
    C5["Rastro: nó DECISAO + aresta DECIDIU (RESUMO → DECISAO)"]
    C6{"actor = adminUserId?"}
    C7{"chosenScenarioId pertence ao summaryId e decisionText não vazio?"}
    C8["Atualiza FinalDecision (proposedByAi = false se texto alterado)"]
    C9["Decisão anterior → SUBSTITUIDA; aresta ORIGINOU para a nova"]
    C10["FinalDecision.status = EM_REVISAO"]
    C11["SessionLifecycleService: EM_DECISAO → EM_REVISAO"]
    C12["Publica DecisionSubmitted (outbox)"]
  end

  subgraph L4["IA (AiEngine)"]
    D1["DECISAO_FINAL: redige decisão + rationale a partir do cenário melhor pontuado"]
    D2["Reaproveita citações do resumo (baseado em …)"]
    D3["AiInferenceLog (capability, confidence)"]
  end

  subgraph L5["Persistência"]
    E1[("MySQL analytical_summaries · summary_scenarios")]
    E2[("MySQL final_decisions")]
    E3[("MySQL decision_trace_nodes/edges")]
    E4[("MySQL decia_sessions · domain_events")]
  end

  subgraph L6["Listeners AFTER_COMMIT"]
    F1["NotificationPort: adminUserId — Decisão aguardando sua revisão"]
    F2["NotificationPort: grupo — Decisão encaminhada para revisão"]
  end

  A0 --> C0 --> C1
  C1 -->|não| B6 --> A7
  C1 -->|sim| C2 --> E1
  C2 --> C3 --> D1 --> D2 --> D3 --> C4 --> E2
  C4 --> C5 --> E3
  C5 --> B1 --> A1 --> A2
  A2 -->|editar| A3 --> B2 --> C6
  A2 -->|reformular| A4 --> B3 --> C6
  A2 -->|aceitar| A5 --> B4 --> C6
  C6 -->|não| B5 --> A7
  C6 -->|sim, editar| C7
  C7 -->|não| B7 --> A1
  C7 -->|sim| C8 --> E2
  C8 --> A1
  C6 -->|sim, reformular| C9 --> E2
  C9 --> C2
  C6 -->|sim, encaminhar| C10 --> E2
  C10 --> C11 --> E4
  C11 --> C12 --> E4
  C12 --> F1
  C12 --> F2 --> A6
  C11 --> B8 --> A6
  A6 --> A7
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
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — proposta automática após o resumo, admin encaminha para revisão
    EV-->>S: DecisionService.onSummaryPublished(sessionId, summaryId)
    S->>DB: SELECT decia_sessions (status = EM_DECISAO, adminUserId)
    S->>DB: SELECT analytical_summaries (PUBLICADO) + summary_scenarios + recommendationsJson.citations
    S->>AI: proposeDecision(summary, scenarios, citations, aiMode)
    AI-->>S: DecisionDraft {decisionText, rationale, chosenScenarioId, citations[], confidence}
    S->>DB: INSERT ai_inference_log (DECISAO_FINAL)
    S->>DB: INSERT final_decisions (PROPOSTA, proposedByAi = true, proposedAt)
    S->>DB: INSERT decision_trace_nodes (DECISAO) + decision_trace_edges (RESUMO → DECISAO, DECIDIU)
    S->>DB: INSERT domain_events (DecisionProposed)
    EV-->>S: NotificationPort.notify(adminUserId, DECISAO_PROPOSTA)

    U->>FE: Abre aba Decisão
    FE->>C: GET /api/decia/sessions/{id}/decisions/current
    C->>S: DecisionService.getCurrent(sessionId)
    S->>DB: SELECT final_decisions WHERE status IN (PROPOSTA, EM_REVISAO)
    S-->>C: 200 FinalDecision + SummaryScenario escolhido + Citation[]
    C-->>FE: 200
    FE-->>U: Proposta da IA com faísca ✦, cenário e "baseado em"

    U->>FE: Clica "Encaminhar para revisão"
    FE->>C: POST /api/decia/sessions/{id}/decisions/{did}/submit-review
    C->>S: DecisionService.submitForReview(actor, sessionId, decisionId)
    S->>DB: SELECT decia_sessions.adminUserId = actor, status = EM_DECISAO
    S->>DB: UPDATE final_decisions SET status = EM_REVISAO
    S->>DB: UPDATE decia_sessions SET status = EM_REVISAO
    S->>DB: INSERT audit_log (DECISION_SUBMITTED, correlationId)
    S->>DB: INSERT domain_events (DecisionSubmitted)
    S-->>C: 200 {decision EM_REVISAO}
    C-->>FE: 200
    FE-->>U: "Aguardando revisão" — chat somente leitura
    EV-->>S: NotificationPort.notify(adminUserId, REVISAO_PENDENTE, link RF15)
    EV-->>S: NotificationPort.notify(participantes, DECISAO_ENCAMINHADA)
  end

  alt RF12.CA03 — cenário não pertence ao resumo ou texto vazio
    U->>FE: Edita a decisão e salva
    FE->>C: PATCH /api/decia/sessions/{id}/decisions/{did} {decisionText, chosenScenarioId}
    C->>S: DecisionService.update(actor, sessionId, decisionId, form)
    S->>DB: SELECT summary_scenarios WHERE id = chosenScenarioId AND summaryId = decision.summaryId → vazio
    S-->>C: 422 VALIDACAO
    C-->>FE: 422
  else RF12.CA03 — sem resumo publicado
    EV-->>S: onSummaryPublished / propose
    S->>DB: SELECT analytical_summaries PUBLICADO → nenhum
    S-->>C: 409 RESUMO_AUSENTE
  else RF12.CA05 — não é o administrador da sessão
    FE->>C: POST .../submit-review
    C->>S: submitForReview(...)
    S->>DB: SELECT decia_sessions.adminUserId ≠ actor
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
  else RF12.CA04 — admin pede nova proposta
    FE->>C: POST /api/decia/sessions/{id}/decisions
    C->>S: DecisionService.propose(actor, sessionId)
    S->>DB: UPDATE final_decisions SET status = SUBSTITUIDA WHERE status = PROPOSTA
    S->>AI: proposeDecision(...)
    AI-->>S: DecisionDraft
    S->>DB: INSERT final_decisions (PROPOSTA) + trace (ORIGINOU da substituída)
    S-->>C: 201 nova decisão
  end
```

## 4. Máquina de estados

Entidade central: `FinalDecision.status` (`DecisionStatus`). O RF12 cobre PROPOSTA → EM_REVISAO (e SUBSTITUIDA); VALIDADA/DEVOLVIDA são atribuídos no RF15.

```mermaid
stateDiagram-v2
  [*] --> PROPOSTA : IA propõe após resumo PUBLICADO (DECISAO_FINAL) — RF12.CA01
  PROPOSTA --> PROPOSTA : admin edita texto, justificativa ou cenário — RF12.CA03
  PROPOSTA --> SUBSTITUIDA : admin pede nova proposta (nova decisão PROPOSTA) — RF12.CA04
  PROPOSTA --> EM_REVISAO : admin encaminha ao administrador — RF12.CA02
  EM_REVISAO --> VALIDADA : revisão humana aprova (RF15)
  EM_REVISAO --> DEVOLVIDA : revisão humana devolve com motivo (RF15)
  DEVOLVIDA --> SUBSTITUIDA : sessão REABERTA gera nova decisão (RF14)
  VALIDADA --> [*]
  SUBSTITUIDA --> [*]

  note right of PROPOSTA
    summaryId = último resumo PUBLICADO
    chosenScenarioId ∈ SummaryScenario do resumo
    citationsJson (RF33.CA03)
    proposedByAi = true (false se o admin alterou o texto)
  end note
  note right of EM_REVISAO
    DeciaSession EM_DECISAO → EM_REVISAO
    chat somente leitura (RF6 → 409 SESSAO_NAO_ATIVA)
    Notification ao adminUserId com link para RF15
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/decia/[sessionId]/decision/page.tsx"]
    FE2["components/ui/DecisionProposalCard · ScenarioPicker · CitationChip · SubmitReviewButton"]
  end

  subgraph WEB["ws-web"]
    W1["DecisionController (REST /api/decia/sessions/{id}/decisions)"]
    W2["SessionAccessGuard (adminUserId)"]
  end

  subgraph APP["ws-application"]
    S1["DecisionService (+ listener SummaryPublished)"]
    S2["SessionLifecycleService"]
    S3["DecisionTraceService"]
    P1["AiEnginePort"]
    P2["NotificationPort"]
    P3["DomainEventPublisher (outbox)"]
  end

  subgraph DOM["ws-domain"]
    D1["FinalDecision · Citation"]
    D2["AnalyticalSummary · SummaryScenario · DeciaSession (leitura)"]
    D3["DecisionTraceNode · DecisionTraceEdge"]
    D4["Enums: DecisionStatus · SessionStatus · TraceRelation · AiCapability"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["persistence-mysql: FinalDecisionRepository, AnalyticalSummaryRepository, SummaryScenarioRepository, DeciaSessionRepository, DecisionTraceRepository, DomainEventOutboxRepository, AuditLogRepository"]
    I2["ai-providers: AiEngineAdapter (DECISAO_FINAL, fallback, ai_inference_log)"]
    I3["cache-redis: AiQuotaAdapter, CircuitStateAdapter"]
    I4["platform: NotificationAdapter, OutboxRelay, AuditLogAdapter"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini"]
  end

  MY[("MySQL 8")]
  RD[("Redis")]

  FE1 --> FE2 -->|HTTPS/JSON| W1 --> W2 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> P1
  S1 --> P2
  S1 --> P3
  P3 -.->|AFTER_COMMIT SummaryPublished| S1
  P3 -.->|AFTER_COMMIT DecisionSubmitted| P2
  S1 --> D1
  S1 --> D2
  S3 --> D3
  D1 --> D4
  P1 -.-> I2
  P2 -.-> I4
  I2 --> I3
  S1 --> I1
  S3 --> I1
  I1 --> MY
  I3 --> RD
  I2 --> X1
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF12.CA01 | `FinalDecision` (decisionText, rationale, chosenScenarioId, citationsJson, proposedByAi, proposedAt), `DecisionService.propose/onSummaryPublished`, `AiEnginePort.proposeDecision`, `AiCapability.DECISAO_FINAL` | A0, C0–C5, D1–D3 | 1–10 | [*] → PROPOSTA | `DecisionService`, `AiEngineAdapter`, `FinalDecisionRepository`, `DecisionTraceService` |
| RF12.CA02 | `FinalDecision.status = EM_REVISAO`, `DeciaSession.status = EM_REVISAO`, `SessionLifecycleService`, `NotificationPort` | A5, B4, C10–C12, F1, F2, B8 | 18–30 | PROPOSTA → EM_REVISAO | `DecisionController.submitForReview`, `SessionLifecycleService`, `NotificationAdapter`, `OutboxRelay` |
| RF12.CA03 | `FinalDecision.summaryId/chosenScenarioId`, `SummaryScenario`, `AnalyticalSummary.status PUBLICADO` | C1, C7, B6, B7 | `alt` 422 VALIDACAO; `alt` 409 RESUMO_AUSENTE | PROPOSTA → PROPOSTA (edição) | `AnalyticalSummaryRepository`, `ScenarioPicker` |
| RF12.CA04 | `FinalDecision.status = SUBSTITUIDA`, `DecisionService.supersede`, `DecisionTraceEdge` ORIGINOU | A4, B3, C9 | `alt` RF12.CA04 (UPDATE SUBSTITUIDA → INSERT nova) | PROPOSTA → SUBSTITUIDA | `DecisionService`, `DecisionTraceService` |
| RF12.CA05 | `SessionAccessGuard`, `DeciaSession.adminUserId`, `DecisionStatus` (VALIDADA só no RF15) | C6, B5 | `alt` 403 ACESSO_NEGADO | EM_REVISAO → VALIDADA apenas via RF15 | `SessionAccessGuard`, `AuditLogAdapter` |
