# RF31 — Simular cenários sobre um Esquema de Projeto (corte de orçamento, atraso, troca de fornecedor, mudança de escopo) antes de enviá-lo à aprovação

**HU:** HU31 · **Sprint (board Work Station):** Product Backlog (pós-Sprint 4, a priorizar) · **Equivalente FAI:** RF18 Provador 2D (experimentar antes de decidir) · **Aba/rota:** Simulador de Cenários (`/projects/[id]/simulate`)

**Critérios de aceite cobertos:** RF31.CA01 · RF31.CA02 · RF31.CA03 · RF31.CA04 · RF31.CA05

> Contextos da TAXONOMIA: **3. Criador de Projetos** (`ProjectScenario`, `ProjectScheme`, `ProjectTask` com PERT/EVM, `ProjectTaskDependency`, `ProjectVersion.sourceScenarioId`, `ComplianceResult`), **5. DECIA** (`SummaryScenario.linkedProjectScenarioId`, `FinalDecision.chosenScenarioId`, `MessageAttachment targetType SCENARIO`) e **10. IA** (`AiInferenceLog` capability `SIMULAR_CENARIO`). O **motor local** (CPM/PERT) cobre linha do tempo e caminho crítico sem IA externa; a IA externa acrescenta riscos novos e vantagens/desvantagens no formato dos cenários do RF11 (`SummaryScenario`).

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR
  namespace ws-domain {
    class ProjectScenario {
      <<entity>>
      +UUID id
      +UUID projectId
      +UUID authorId
      +String name
      +JSON variablesJson
      +JSON impactReportJson
      +JSON recalculatedTimelineJson
      +JSON riskByPhaseJson
      +String status
      +UUID appliedVersionId
      +UUID sharedInSessionId
      +UUID aiInferenceId
    }
    class ProjectScheme {
      <<entity>>
      +UUID id
      +UUID ownerId
      +String title
      +ProjectStatus status
      +ProjectPhase currentPhase
      +JSON criticalPathJson
      +JSON evmJson
      +LocalDate nextMilestoneAt
      +BigDecimal conformityPercent
      +boolean hasBlockingPending
      +long version
    }
    class ProjectTask {
      <<entity>>
      +UUID id
      +UUID projectId
      +UUID taskId
      +ProjectPhase phase
      +UUID responsibleId
      +LocalDate startAt
      +LocalDate dueAt
      +BigDecimal pertOptimistic
      +BigDecimal pertMostLikely
      +BigDecimal pertPessimistic
      +BigDecimal plannedValue
      +BigDecimal earnedValue
      +BigDecimal actualCost
      +boolean isCritical
      +int slackDays
    }
    class ProjectTaskDependency {
      <<entity>>
      +UUID id
      +UUID predecessorProjectTaskId
      +UUID successorProjectTaskId
      +String type
      +int lagDays
    }
    class ProjectVersion {
      <<entity>>
      +UUID id
      +UUID projectId
      +int versionNumber
      +UUID authorId
      +JSON diffJson
      +JSON snapshotJson
      +String reason
      +UUID sourceScenarioId
    }
    class ComplianceResult {
      <<entity>>
      +UUID id
      +UUID projectId
      +BigDecimal percent
      +int blockingCount
    }
    class SummaryScenario {
      <<entity>>
      +UUID id
      +UUID summaryId
      +String name
      +JSON advantagesJson
      +JSON disadvantagesJson
      +JSON criteriaScoresJson
      +UUID linkedProjectScenarioId
    }
    class FinalDecision {
      <<entity>>
      +UUID id
      +UUID sessionId
      +UUID chosenScenarioId
      +DecisionStatus status
    }
    class MessageAttachment {
      <<entity>>
      +UUID id
      +UUID messageId
      +String targetType
      +UUID targetId
      +JSON snapshotJson
    }
    class AiInferenceLog {
      <<entity>>
      +UUID id
      +AiCapability capability
      +String provider
      +String result
      +boolean fallbackUsed
      +int latencyMs
      +BigDecimal estimatedCostUsd
    }
    class ScenarioStatus {
      <<enum>>
      RASCUNHO
      SALVO
      APLICADO
      DESCARTADO
    }
    class ProjectPhase {
      <<enum>>
      DEMANDA
      PLANEJAMENTO
      ELABORACAO
      ANALISE
      APROVACAO
      EXECUCAO
      ENCERRAMENTO
    }
  }
  namespace ws-application {
    class ScenarioService {
      <<service>>
      +create(actorId, projectId, name, variables) ProjectScenario
      +simulate(scenarioId) ProjectScenario
      +compare(projectId, scenarioIds) ScenarioComparison
      +save(actorId, scenarioId) ProjectScenario
      +apply(actorId, scenarioId, expectedVersion) ProjectVersion
      +discard(actorId, scenarioId) ProjectScenario
      +shareInSession(actorId, scenarioId, sessionId) MessageAttachment
    }
    class ComplianceService {
      <<service>>
      +evaluateHypothetical(project, tasksAfterScenario) ComplianceResult
    }
    class DeciaBridgeService {
      <<service>>
      +attachToMessage(actorId, sessionId, draft, targetRefs) SessionMessage
    }
    class AiEngine {
      <<service>>
      +impactNarrative(project, timeline, compliance, variables) ImpactReport
    }
    class SchedulePort {
      <<port>>
      +recalc(tasks, deps, variables) Timeline
      +criticalPath(tasks, deps) List~UUID~
      +riskByPhase(timeline) Map
    }
    class AiProviderPort {
      <<port>>
      +complete(prompt, mode, accessClass) AiResult
    }
  }
  namespace ws-web {
    class ScenarioController {
      <<controller>>
      +create(projectId, body)
      +compare(projectId, ids)
      +save(scenarioId)
      +apply(scenarioId, ifMatchVersion)
      +discard(scenarioId)
      +share(scenarioId, sessionId)
    }
  }
  namespace ws-infrastructure {
    class LocalCpmEngine {
      <<adapter>>
      CPM + PERT local
    }
    class ClaudeAdapter {
      <<adapter>>
    }
    class GeminiAdapter {
      <<adapter>>
    }
    class ProjectScenarioJpaRepository {
      <<adapter>>
    }
    class CassandraMessageStore {
      <<adapter>>
    }
  }
  ProjectScheme "1" --> "*" ProjectScenario : cenários
  ProjectScheme "1" --> "*" ProjectTask
  ProjectScheme "1" --> "*" ProjectTaskDependency
  ProjectScheme "1" --> "*" ProjectVersion
  ProjectScenario --> ScenarioStatus : status
  ProjectScenario --> ProjectVersion : appliedVersionId
  ProjectVersion --> ProjectScenario : sourceScenarioId
  ProjectScenario --> AiInferenceLog : aiInferenceId
  ProjectScenario ..> ComplianceResult : conformidade no impactReportJson
  SummaryScenario --> ProjectScenario : linkedProjectScenarioId
  FinalDecision --> SummaryScenario : chosenScenarioId
  MessageAttachment ..> ProjectScenario : targetType SCENARIO
  ProjectTask --> ProjectPhase
  ScenarioService ..> ProjectScenario
  ScenarioService ..> SchedulePort : prazo e caminho crítico sem IA externa
  ScenarioService ..> ComplianceService : RF32
  ScenarioService ..> AiEngine : riscos e vantagens ✦
  ScenarioService ..> ProjectVersion : apply
  ScenarioService ..> DeciaBridgeService : compartilhar na sessão
  AiEngine ..> AiProviderPort
  ScenarioController ..> ScenarioService
  LocalCpmEngine ..|> SchedulePort
  ClaudeAdapter ..|> AiProviderPort
  GeminiAdapter ..|> AiProviderPort
  ProjectScenarioJpaRepository ..> ProjectScenario : MySQL
  CassandraMessageStore ..> MessageAttachment : mensagem com anexo SCENARIO
  note for ProjectScenario "tabela project_scenarios · variablesJson {budgetDeltaPct, scheduleDeltaDays, removedTaskIds, addedTasksJson, responsibleSwaps, supplierSwaps, scopeChangeText}"
  note for ProjectScenario "impactReportJson {affectedTasks, newEndDate, newRisks, conformity, pros, cons} no formato do RF11"
  note for ProjectScheme "tabela project_schemes · .. +30 campos .."
  note for ProjectTask "tabela project_tasks · .. +15 campos .."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Ator humano"]
    U1["Dono do projeto abre /projects/[id]/simulate"]
    U2["Escolhe variáveis: orçamento ±%, prazo ±dias, remover ou adicionar tarefa, trocar responsável ou fornecedor, mudança de escopo (texto)"]
    U3["Seleciona até 3 cenários para comparar lado a lado"]
    U4{"Salvar como variante, aplicar ao projeto ou descartar?"}
    U5["Compartilha o cenário na sessão DECIA"]
    U6["Grupo decide entre os cenários · chefe valida (RF15)"]
  end
  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["Relatório de impacto com faísca ✦ ou aviso de cálculo só local"]
    W2["Comparação em colunas: prazo final, tarefas afetadas, riscos, conformidade, vantagens e desvantagens"]
    W3["Projeto original inalterado · variante listada em Cenários"]
    W4["Histórico RF22 mostra nova versão com reason = cenário aplicado"]
  end
  subgraph L3["ws-application"]
    S1{"Ator é dono ou responsável do projeto?"}
    S2{"Ao menos uma variável e deltas válidos?"}
    S3["ProjectScenario RASCUNHO com variablesJson"]
    S4["SchedulePort.recalc: linha do tempo, caminho crítico, folgas, risco por fase (motor local)"]
    S5["ComplianceService.evaluateHypothetical sobre as tarefas pós-cenário (RF32)"]
    S6{"IA externa disponível?"}
    S7["impactReportJson {affectedTasks, newEndDate, newRisks, conformity, pros, cons} · AiInferenceLog SIMULAR_CENARIO"]
    S8{"Até 3 ids do mesmo projeto?"}
    S9["Monta ScenarioComparison lado a lado"]
    S10["status SALVO (não altera o original)"]
    S11{"version do projeto igual ao esperado?"}
    S12["Transação: ProjectVersion (sourceScenarioId, diffJson) · aplica tarefas, prazos, responsáveis · recalcula criticalPathJson e evmJson · status APLICADO, appliedVersionId"]
    S13["status DESCARTADO"]
    S14["DeciaBridgeService.attachToMessage targetType SCENARIO · sharedInSessionId · SummaryScenario.linkedProjectScenarioId"]
    S15["FinalDecision.chosenScenarioId = cenário escolhido · nó CENARIO no rastro (RF29)"]
    E1["403 ACESSO_NEGADO"]
    E2["422 VALIDACAO"]
    E3["422 VALIDACAO (máx. 3 cenários)"]
    E4["409 VERSAO_CONFLITO"]
  end
  subgraph L4["IA (AiEngine)"]
    A1["impactNarrative ✦: riscos novos, vantagens e desvantagens no formato do RF11"]
    A2["Sem IA externa: relatório só com prazo, caminho crítico e conformidade (result FALLBACK)"]
  end
  subgraph L5["Persistência"]
    D1[("MySQL: project_scenarios · ai_inference_log")]
    D2[("MySQL: project_schemes · project_tasks · project_task_dependencies · compliance_results")]
    D3[("MySQL: project_versions")]
    D4[("Cassandra: messages_by_session · MySQL: message_attachments · summary_scenarios · final_decisions")]
  end
  U1 --> S1
  S1 -->|"não"| E1
  S1 -->|"sim"| U2 --> S2
  S2 -->|"não"| E2
  S2 -->|"sim"| S3 --> D1
  S3 --> S4 --> D2
  S4 --> S5 --> S6
  S6 -->|"sim"| A1 --> S7
  S6 -->|"não"| A2 --> S7
  S7 --> D1
  S7 --> W1 --> U3 --> S8
  S8 -->|"não"| E3
  S8 -->|"sim"| S9 --> W2 --> U4
  U4 -->|"salvar"| S10 --> D1
  S10 --> W3
  U4 -->|"aplicar"| S11
  S11 -->|"não"| E4
  S11 -->|"sim"| S12 --> D3
  S12 --> D2
  S12 --> W4
  U4 -->|"descartar"| S13 --> D1
  W3 --> U5 --> S14 --> D4
  S14 --> U6 --> S15 --> D4
  classDef err fill:#fde2e2,stroke:#b91c1c,color:#7f1d1d
  class E1,E2,E3,E4 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01, CA02 e CA05 — criar cenário e obter o relatório de impacto
  U->>NX: define corte de 20% e atraso de 60 dias em /projects/[id]/simulate
  NX->>C: POST /api/projects/{projectId}/scenarios {name, variables}
  C->>S: ScenarioService.create(actorId, projectId, name, variables)
  alt não é dono nem responsável
    S-->>C: 403 ACESSO_NEGADO
  else nenhuma variável informada
    S-->>C: 422 VALIDACAO
  else ok
    S->>DB: SELECT project_schemes, project_tasks, project_task_dependencies
    S->>S: SchedulePort.recalc (LocalCpmEngine: PERT, CPM, folgas, risco por fase)
    S->>S: ComplianceService.evaluateHypothetical (RF32)
    alt provider externo disponível
      S->>AI: impactNarrative(project, timeline, compliance, variables)
      AI-->>S: newRisks, pros, cons ✦ (formato RF11)
    else sem IA externa (CA05)
      S->>S: relatório só com prazo, caminho crítico e conformidade · fallbackUsed
    end
    S->>DB: INSERT project_scenarios (RASCUNHO, impactReportJson, recalculatedTimelineJson, riskByPhaseJson)
    S->>DB: INSERT ai_inference_log (SIMULAR_CENARIO, provider, latência, custo)
    S-->>C: 201 ProjectScenario
    C-->>NX: relatório de impacto com faísca ✦
  end

  Note over U,EV: CA03 — comparar até 3, salvar variante ou aplicar
  U->>NX: compara A, B e C
  NX->>C: GET /api/projects/{projectId}/scenarios/compare?ids=A,B,C
  C->>S: ScenarioService.compare(projectId, ids)
  alt mais de 3 ids
    S-->>C: 422 VALIDACAO
  else ok
    S->>DB: SELECT project_scenarios WHERE id IN (...)
    S-->>NX: 200 ScenarioComparison lado a lado
  end
  U->>NX: salva B como variante
  NX->>C: POST /api/scenarios/{B}/save
  C->>S: ScenarioService.save(actorId, B)
  S->>DB: UPDATE project_scenarios SET status = SALVO
  S-->>NX: 200 (original inalterado)
  U->>NX: aplica C ao projeto
  NX->>C: POST /api/scenarios/{C}/apply (If-Match version)
  C->>S: ScenarioService.apply(actorId, C, expectedVersion)
  alt projeto mudou desde a simulação
    S-->>C: 409 VERSAO_CONFLITO
  else ok
    S->>DB: INSERT project_versions (sourceScenarioId = C, diffJson, reason)
    S->>DB: UPDATE project_tasks (prazos, responsáveis, remoções) · UPDATE project_schemes (criticalPathJson, evmJson, version+1)
    S->>DB: UPDATE project_scenarios SET status = APLICADO, appliedVersionId
    S-)EV: ScenarioApplied
    EV->>DB: ComplianceService re-avalia (RF32) · mosaico e capa (RF38)
    S-->>NX: 200 ProjectVersion
  end

  Note over U,EV: CA04 — compartilhar na sessão DECIA e decidir entre cenários
  U->>NX: compartilha A e B na sessão
  NX->>C: POST /api/scenarios/{A}/share {sessionId}
  C->>S: ScenarioService.shareInSession(actorId, A, sessionId)
  S->>CS: INSERT messages_by_session (mensagem com anexo)
  S->>DB: INSERT message_attachments (targetType SCENARIO, snapshotJson) · UPDATE project_scenarios SET sharedInSessionId
  S->>DB: INSERT summary_scenarios (linkedProjectScenarioId) ao gerar o resumo RF11
  S-)EV: ScenarioShared → nó CENARIO no DecisionTrace (RF29)
  S-->>NX: 201 anexo inline
  Note over S,DB: na validação (RF15) FinalDecision.chosenScenarioId referencia o cenário escolhido
```

## 4. Máquina de estados

Entidade central: `ProjectScenario.status`. Compartilhar na sessão (CA04) não muda o status — grava `sharedInSessionId` em qualquer estado não descartado.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> RASCUNHO : POST /api/projects/{id}/scenarios (CA01) · simulação calculada (CA02)
  RASCUNHO --> RASCUNHO : recalcular com novas variáveis
  RASCUNHO --> SALVO : POST scenarios/{id}/save (variante, original intacto)
  RASCUNHO --> APLICADO : POST scenarios/{id}/apply → ProjectVersion (CA03)
  SALVO --> APLICADO : POST scenarios/{id}/apply → ProjectVersion (CA03)
  RASCUNHO --> DESCARTADO : descartar
  SALVO --> DESCARTADO : descartar
  APLICADO --> [*]
  DESCARTADO --> [*]
  note right of SALVO
    Pode ser comparado (até 3) e compartilhado
    na sessão DECIA (sharedInSessionId, CA04)
  end note
  note right of APLICADO
    appliedVersionId aponta para project_versions
    FinalDecision.chosenScenarioId pode referenciá-lo
  end note
  note left of RASCUNHO
    impactReportJson com faísca ✦ e aiInferenceId
    ou fallback local sem narrativa (CA05)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Next.js (frontend)"]
    direction TB
    P1["app/projects/[id]/simulate/page.tsx"]
    P2["app/projects/[id]/history · versões (RF22)"]
    P3["app/decia/[sessionId] · anexo SCENARIO inline (RF29)"]
    UI1["components/ui: ScenarioForm · ImpactReport ✦ · ScenarioCompare (3 colunas) · TimelineGantt · RiskByPhase"]
  end
  subgraph WEB["ws-web (REST · br.gov.pr.secid.workstation.web)"]
    direction TB
    C1["ScenarioController"]
  end
  subgraph APP["ws-application"]
    direction TB
    S1["ScenarioService"]
    S2["ComplianceService (RF32)"]
    S3["DeciaBridgeService (RF29)"]
    S4["AiEngine"]
    PT1["SchedulePort"]
    PT2["AiProviderPort"]
  end
  subgraph DOM["ws-domain"]
    direction TB
    E1["ProjectScenario · ProjectScheme · ProjectTask · ProjectTaskDependency · ProjectVersion"]
    E2["ComplianceResult · SummaryScenario · FinalDecision · MessageAttachment · AiInferenceLog"]
  end
  subgraph INFRA["ws-infrastructure"]
    direction TB
    I1["persistence-mysql: ProjectScenarioJpaRepository · ProjectVersionJpaRepository"]
    I2["persistence-cassandra: CassandraMessageStore"]
    I3["ai-providers: LocalCpmEngine · ClaudeAdapter · GeminiAdapter"]
    I4["platform: DomainEventOutbox"]
  end
  subgraph EXT["Serviços externos"]
    X1(["Claude / Gemini"])
  end
  P1 --> C1
  P2 -.-> C1
  P3 -.-> C1
  UI1 -.-> P1
  C1 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 -.-> PT1
  S4 -.-> PT2
  S1 --> E1
  S1 --> E2
  S1 --> I1
  S3 --> I2
  S1 --> I4
  I3 -. implementa .-> PT1
  I3 -. implementa .-> PT2
  I3 --> X1
  classDef port stroke-dasharray: 4 3
  class PT1,PT2 port
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF31.CA01 | Classes `ProjectScenario.variablesJson` (budgetDeltaPct, scheduleDeltaDays, removedTaskIds, addedTasksJson, responsibleSwaps, supplierSwaps, scopeChangeText), `ScenarioService.create`; atividades `U1 → S1 → U2 → S2 → S3` (403 ACESSO_NEGADO, 422 VALIDACAO); sequência bloco «CA01, CA02 e CA05» (`POST /api/projects/{id}/scenarios`); transição `[*] → RASCUNHO`; componentes `ScenarioForm`, `app/projects/[id]/simulate` |
| RF31.CA02 | Classes `SchedulePort.recalc/criticalPath/riskByPhase`, `ProjectScenario.impactReportJson/recalculatedTimelineJson/riskByPhaseJson`, `ComplianceService.evaluateHypothetical`, `AiEngine.impactNarrative`, `ProjectTask.pert*/isCritical/slackDays`; atividades `S4 → S5 → S6 → A1/A2 → S7 → W1`; sequência bloco «CA01, CA02 e CA05» (recalc, evaluateHypothetical, impactNarrative ✦); componentes `ImpactReport`, `TimelineGantt`, `RiskByPhase`, `LocalCpmEngine` |
| RF31.CA03 | Classes `ScenarioService.compare/save/apply`, `ProjectVersion.sourceScenarioId`, `ProjectScenario.appliedVersionId`, `ScenarioStatus`; atividades `U3 → S8 → S9 → W2`, `U4 → S10/S11 → S12 → W4` (422 máx. 3, 409 VERSAO_CONFLITO); sequência bloco «CA03»; transições `RASCUNHO/SALVO → APLICADO` e `→ SALVO`; componentes `ScenarioCompare`, `app/projects/[id]/history` |
| RF31.CA04 | Classes `MessageAttachment targetType SCENARIO`, `ProjectScenario.sharedInSessionId`, `SummaryScenario.linkedProjectScenarioId`, `FinalDecision.chosenScenarioId`, `ScenarioService.shareInSession`, `DeciaBridgeService`; atividades `U5 → S14 → U6 → S15`; sequência bloco «CA04» (nó CENARIO no rastro); nota do estado `SALVO`; componentes `app/decia/[sessionId]`, `CassandraMessageStore` |
| RF31.CA05 | Classes `AiInferenceLog` (SIMULAR_CENARIO, fallbackUsed), `ProjectScenario.aiInferenceId`, `LocalCpmEngine ..|> SchedulePort`; atividades `S6 → A2 → S7` e `W1` (aviso de cálculo só local); sequência bloco «CA01, CA02 e CA05» alt «sem IA externa»; nota do estado `RASCUNHO`; componente `ai-providers: LocalCpmEngine` |

> Dúvidas para `docs/DECISOES.md`: `ScenarioStatus` não é enum nomeado na TAXONOMIA (status listado inline em `ProjectScenario`); `SchedulePort` e `409 VERSAO_CONFLITO` (optimistic lock por `ProjectScheme.version`) são propostas; quem pode simular um projeto alheio (chefe revisor, RF32.CA06) — aqui só dono/responsável criam cenários.
