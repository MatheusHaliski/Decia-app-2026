# RF31 — Simular cenários sobre um Esquema de Projeto (corte de orçamento, atraso, troca de fornecedor, mudança de escopo) antes de enviá-lo à aprovação
**HU:** HU31 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** RF18 Provador 2D (experimentar antes de decidir) · **Aba/rota:** Simulador de Cenários (`/projects/[id]/simulate`, comparação `?compare=a,b,c`), compartilhar na sessão (`/decia/[sessionId]`, RF29)
**Critérios de aceite cobertos:** RF31.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs.

Um `ProjectScenario` guarda as variáveis (`variablesJson`: `budgetDeltaPct`, `scheduleDeltaDays`, `removedTaskIds`, `addedTasksJson`, `responsibleSwaps`, `supplierSwaps`, `scopeChangeText`) e o **relatório de impacto** (`impactReportJson`) no mesmo formato dos cenários do resumo analítico (RF11, `SummaryScenario`). O recálculo de linha do tempo, caminho crítico e risco por fase é **determinístico** (`CriticalPathService`, `RiskMatrixService`, D-12); a IA (`SIMULAR_CENARIO`) só redige vantagens/desvantagens e cruza com o Espelho (RF32). **Salvar** cria uma variante (não altera o original); **aplicar** gera `ProjectVersion` com `sourceScenarioId` (RF22). Compartilhar na sessão cria `MessageAttachment` tipo SCENARIO e `SummaryScenario.linkedProjectScenarioId`.

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_projects {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +criticalPathJson: JSON
    +evmJson: JSON
    +conformityPercent: BigDecimal
    +nextMilestoneAt: LocalDate
    .. +30 campos ..
  }
  class ProjectScenario {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +authorId: UUID
    +name: String
    +variablesJson: JSON
    +impactReportJson: JSON
    +recalculatedTimelineJson: JSON
    +riskByPhaseJson: JSON
    +status: ScenarioStatus
    +appliedVersionId: UUID
    +sharedInSessionId: UUID
    +aiInferenceId: UUID
  }
  class ProjectVersion {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +versionNumber: int
    +authorId: UUID
    +diffJson: JSON
    +snapshotJson: JSON
    +reason: String
    +sourceScenarioId: UUID
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +responsibleId: UUID
    +dueAt: LocalDate
    +pertMostLikely: BigDecimal
    +plannedValue: BigDecimal
    +isCritical: boolean
    +slackDays: int
  }
  class ProjectTaskDependency {
    <<entity>>
    +predecessorProjectTaskId: UUID
    +successorProjectTaskId: UUID
    +type: String
    +lagDays: int
  }
  class ComplianceResult {
    <<entity>>
    +projectId: UUID
    +percent: BigDecimal
    +blockingCount: int
  }
  class ScenarioStatus {
    <<enum>>
    RASCUNHO
    SALVO
    APLICADO
    DESCARTADO
  }
}

namespace ws_domain_decia {
  class SummaryScenario {
    <<entity>>
    +summaryId: UUID
    +name: String
    +advantagesJson: JSON
    +disadvantagesJson: JSON
    +criteriaScoresJson: JSON
    +linkedProjectScenarioId: UUID
  }
  class MessageAttachment {
    <<entity>>
    +messageId: UUID
    +targetType: String
    +targetId: UUID
    +snapshotJson: JSON
  }
  class FinalDecision {
    <<entity>>
    +sessionId: UUID
    +chosenScenarioId: UUID
    +status: DecisionStatus
  }
  class DecisionTraceNode {
    <<entity>>
    +nodeType: TraceNodeType
    +refId: UUID
  }
}

namespace ws_domain_ia {
  class AiInferenceLog {
    <<entity>>
    +capability: AiCapability
    +provider: AiProvider
    +result: InferenceResult
    +fallbackUsed: boolean
    +correlationId: String
  }
}

namespace ws_application {
  class ScenarioService {
    <<service>>
    +create(actor, projectId, ScenarioVariables) ProjectScenario
    +recalculate(actor, scenarioId) ProjectScenario
    +compare(actor, ids) CompareView
    +save(actor, scenarioId) ProjectScenario
    +apply(actor, scenarioId) ProjectVersion
    +discard(actor, scenarioId)
    +shareInSession(actor, scenarioId, sessionId) MessageAttachment
  }
  class CriticalPathService {
    <<service>>
    +compute(tasks, deps) CriticalPath
    +shift(timeline, deltaDays) Timeline
  }
  class RiskMatrixService {
    <<service>>
    +byPhase(project, variables) RiskByPhase
  }
  class ComplianceService {
    <<service>>
    +evaluate(projectSnapshot) ComplianceResult
  }
  class ProjectVersionService {
    <<service>>
    +createVersion(projectId, diff, reason, sourceScenarioId) ProjectVersion
  }
  class DeciaBridgeService {
    <<service>>
    +attachToMessage(actor, sessionId, draft, attachments)
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
    +requireParticipant(actor, sessionId)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class ScenarioController {
    <<controller>>
    +POST_api_projects_id_scenarios(variables)
    +GET_api_projects_id_scenarios_compare(ids)
    +POST_api_scenarios_id_save()
    +POST_api_scenarios_id_apply()
    +DELETE_api_scenarios_id()
    +POST_api_scenarios_id_share(sessionId)
  }
}

namespace ws_infrastructure {
  class LocalEngine {
    <<adapter>>
  }
  class ClaudeProvider {
    <<adapter>>
  }
}

ProjectScheme "1" o-- "0..*" ProjectScenario
ProjectScheme "1" *-- "0..*" ProjectTask
ProjectScheme "1" *-- "0..*" ProjectTaskDependency
ProjectScheme "1" o-- "0..*" ProjectVersion
ProjectScenario "0..1" --> "0..1" ProjectVersion : appliedVersionId
ProjectVersion "0..*" --> "0..1" ProjectScenario : sourceScenarioId
ProjectScenario ..> ComplianceResult : conformidade do cenario
SummaryScenario "0..*" --> "0..1" ProjectScenario : linkedProjectScenarioId
MessageAttachment ..> ProjectScenario : targetType SCENARIO
FinalDecision ..> SummaryScenario : chosenScenarioId
DecisionTraceNode ..> ProjectScenario : CENARIO
ScenarioController --> ScenarioService
ScenarioService --> CriticalPathService
ScenarioService --> RiskMatrixService
ScenarioService --> ComplianceService
ScenarioService --> ProjectVersionService
ScenarioService --> DeciaBridgeService
ScenarioService --> AiEngine
ScenarioService --> Guard
ScenarioService --> DomainEvents
AiEngine ..> AiInferenceLog
LocalEngine ..> AiEngine : prazo e caminho critico sem IA externa
ClaudeProvider ..> AiEngine
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (dono do projeto · chefe)"]
    A0([Abre /projects/id/simulate]) --> A1["Escolhe variáveis: orçamento ±%, prazo ±dias, remover/adicionar tarefa, trocar responsável/fornecedor, mudança de escopo"]
    A2["Lê o relatório de impacto ✦"]
    A3{"Ação"}
    A3 -->|comparar| A4["Seleciona até 3 cenários lado a lado"]
    A3 -->|salvar| A5["Salvar como variante"]
    A3 -->|aplicar| A6["Aplicar ao projeto"]
    A3 -->|compartilhar| A7["Compartilhar na sessão DECIA"]
    A3 -->|descartar| A8["Descartar"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/projects/[id]/simulate)"]
    F1["ScenarioForm (Input ±%, Due, SelectList de tarefas, Textarea de escopo)"]
    F2["POST /api/projects/{id}/scenarios"]
    F3["ImpactReport: tarefas afetadas, novo prazo final, riscos novos, conformidade, prós/contras · Spark ✦"]
    F4["GET /scenarios/compare?ids=a,b,c (CompareTable)"]
    F5["POST /scenarios/{id}/save · /apply · /share · DELETE"]
  end

  subgraph WEB["ws-web · ScenarioController"]
    W1["JWT · CorrelationIdFilter"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application · ScenarioService"]
    P1{"Guard.requireOwner(projeto) ou chefe do departamento?"}
    P1 -->|não| E1["403 ACESSO_NEGADO"]
    P2{"Variáveis válidas? (tarefa removida existe, delta numérico)"}
    P2 -->|não| E2["422 VALIDACAO details.variables"]
    P3["Clona ProjectTask/Dependency em memória e aplica as variáveis"]
    P4["CriticalPathService.compute + shift · RiskMatrixService.byPhase (determinístico)"]
    P5["ComplianceService.evaluate no snapshot do cenário (RF32)"]
    P6["ProjectScenario RASCUNHO com impactReportJson"]
    P7{"Mais de 3 ids?"}
    P7 -->|sim| E3["422 VALIDACAO details.ids"]
    P8["save: status SALVO (variante, original intacto)"]
    P9["apply: ProjectVersionService.createVersion(diff, reason, sourceScenarioId) · status APLICADO · ProjectScheme atualizado"]
    P10{"Guard.requireParticipant(sessão) e sessão ATIVA?"}
    P10 -->|não| E4["403 ou 409 SESSAO_NAO_ATIVA"]
    P11["DeciaBridgeService.attachToMessage(SCENARIO) · sharedInSessionId · DecisionTrace CENARIO → ANEXOU"]
    P12["discard: status DESCARTADO"]
  end

  subgraph IA["AiEngine (SIMULAR_CENARIO)"]
    I1["Redige vantagens/desvantagens e riscos novos sobre os números calculados"]
    I2["Claude → Gemini → LocalEngine (só prazo/caminho crítico, redação simplificada)"]
    I3["AiInferenceLog (faísca ✦)"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL project_scenarios · project_versions · project_tasks · compliance_results · ai_inference_log")]
    D2[("Cassandra trace_by_entity · flag cassandra.enabled")]
  end

  A1 --> F1 --> F2 --> W1 --> P1 -->|sim| P2 -->|sim| P3 --> P4 --> P5 --> I1 --> I2 --> I3 --> P6 --> D1 --> F3 --> A2 --> A3
  A4 --> F4 --> W1 --> P7 -->|não| D1
  A5 --> F5 --> W1 --> P1 --> P8 --> D1
  A6 --> F5 --> W1 --> P1 --> P9 --> D1
  A7 --> F5 --> W1 --> P10 -->|sim| P11 --> D1
  P11 --> D2
  A8 --> F5 --> P12 --> D1
  E1 --> W2
  E2 --> W2
  E3 --> W2
  E4 --> W2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CAS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: cria cenário Corte de 15% + atraso 30 dias
  FE->>C: POST /api/projects/{id}/scenarios {variables}
  C->>S: ScenarioService.create(actor, projectId, variables)
  S->>S: Guard.requireOwner(actor, project.ownerId)
  alt variáveis inválidas
    S-->>C: 422 VALIDACAO details.variables
  else ok
    S->>DB: load project_tasks + dependencies + compliance_results
    S->>S: CriticalPathService.compute e shift · RiskMatrixService.byPhase
    S->>S: ComplianceService.evaluate(snapshot do cenário)
    S->>AI: run(SIMULAR_CENARIO, números calculados)
    alt sem provedor externo
      AI-->>S: LocalEngine devolve prazo e caminho crítico, redação simplificada (fallbackUsed)
    else ok
      AI-->>S: vantagens, desvantagens, riscos novos ✦
    end
    AI->>DB: insert ai_inference_log
    S->>DB: insert project_scenarios (RASCUNHO, impactReportJson, riskByPhaseJson)
    S-->>FE: 201 ProjectScenario + relatório de impacto
  end

  U->>FE: compara 3 cenários
  FE->>C: GET /api/projects/{id}/scenarios/compare?ids=a,b,c
  C->>S: ScenarioService.compare(actor, ids)
  alt mais de 3 ids
    S-->>C: 422 VALIDACAO details.ids
  else ok
    S->>DB: select project_scenarios in ids
    S-->>FE: CompareView lado a lado
  end

  U->>FE: aplica o cenário B
  FE->>C: POST /api/scenarios/{id}/apply
  C->>S: ScenarioService.apply(actor, id)
  S->>DB: insert project_versions (diff, reason, sourceScenarioId) + update project_tasks + project_scenarios APLICADO
  S->>EV: ScenarioApplied
  S-->>FE: 200 ProjectVersion
  EV->>EV: recalcula evmJson e criticalPathJson do projeto · thumbnail da capa

  U->>FE: compartilha o cenário A na sessão
  FE->>C: POST /api/scenarios/{id}/share {sessionId}
  C->>S: ScenarioService.shareInSession(actor, id, sessionId)
  S->>S: Guard.requireParticipant(actor, sessionId)
  alt sessão não ativa
    S-->>C: 409 SESSAO_NAO_ATIVA
  else ok
    S->>DB: update sharedInSessionId + insert message_attachments (SCENARIO) + decision_trace_nodes CENARIO
    S->>CAS: messages_by_session + trace_by_entity
    S-->>FE: 201
  end
  Note over S,DB: decisão final (RF12/RF15) grava FinalDecision.chosenScenarioId → SummaryScenario.linkedProjectScenarioId
```

## 4. Máquina de estados

Entidade central: `ProjectScenario.status` (`ScenarioStatus`). O projeto segue `ProjectStatus` (RF22); aplicar um cenário não muda o status do projeto, só cria versão.

```mermaid
stateDiagram-v2
  [*] --> RASCUNHO: POST /scenarios → recálculo determinístico + relatório ✦ (CA01, CA02)
  RASCUNHO --> RASCUNHO: edita variáveis e recalcula · compara até 3 (CA03)
  RASCUNHO --> SALVO: POST /save → variante do projeto, original intacto (CA03)
  RASCUNHO --> APLICADO: POST /apply → ProjectVersion com sourceScenarioId (CA03)
  SALVO --> APLICADO: POST /apply
  SALVO --> SALVO: compartilhado na sessão DECIA (sharedInSessionId, CA04)
  RASCUNHO --> DESCARTADO: DELETE
  SALVO --> DESCARTADO: DELETE
  APLICADO --> [*]
  DESCARTADO --> [*]
  note right of APLICADO
    Imutável depois de aplicado: a versão do projeto
    referencia o cenário (RF22 histórico).
  end note
  note right of SALVO
    A decisão final da sessão referencia o cenário escolhido
    (FinalDecision.chosenScenarioId, CA04).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/projects/[id]/simulate (+ compare)"]
    R2["components: ScenarioForm · SelectList · Due · ImpactReport · CompareTable · PhaseBar · Spark ✦ · Button abrir-decia"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    SC["ScenarioController (@Operation RF31.CA01-CA05)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    SS["projects/ScenarioService"]
    CP["metrics/CriticalPathService · RiskMatrixService (determinísticos, METRICAS_GESTAO.md)"]
    CS["projects/ComplianceService (RF32)"]
    PV["projects/ProjectVersionService (RF22)"]
    BS["decia/DeciaBridgeService (RF29)"]
    AIE["ai/AiEngine (SIMULAR_CENARIO) · AiBudget"]
    GD["security/Guard (main)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    PORTS["ports: AiProviderPort · MessagePort · TracePort"]
  end
  subgraph DOM["ws-domain"]
    ENT["ProjectScenario · ScenarioStatus · ProjectVersion · ProjectTask · ProjectTaskDependency · SummaryScenario (planejado) · AiInferenceLog (V2)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql project_scenarios · project_versions"]
    CASA["persistence-cassandra (flag cassandra.enabled)"]
    AIP["ai-providers ai-claude · ai-gemini · ai-local (LocalEngine cobre prazo/caminho crítico)"]
  end
  BFF --> SC --> SEC
  SC --> SS
  SS --> CP
  SS --> CS
  SS --> PV
  SS --> BS
  SS --> AIE
  SS --> GD
  SS --> DE
  AIE --> PORTS
  BS --> PORTS
  SS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> CASA --> CASS[("Cassandra")]
  PORTS --> AIP --> AI["Claude / Gemini / local"]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF31.CA01 | `ProjectScenario.variablesJson` (budgetDeltaPct, scheduleDeltaDays, removedTaskIds, addedTasksJson, responsibleSwaps, supplierSwaps, scopeChangeText), `ScenarioService.create` | A1 → F1 → F2 → P1 (403) → P2 (422) → P3 | 1–6 | `[*] → RASCUNHO` | `ScenarioForm`, `SC` |
| RF31.CA02 | `CriticalPathService`, `RiskMatrixService`, `ComplianceService.evaluate`, `impactReportJson` (formato `SummaryScenario`), `AiCapability SIMULAR_CENARIO` | P4 → P5 → I1 → I2 → P6 → F3 | 7–16 | `RASCUNHO` | `CP`, `CS`, `AIE`, `ImpactReport` |
| RF31.CA03 | `ScenarioService.compare/save/apply`, `ScenarioStatus SALVO/APLICADO`, `ProjectVersion.sourceScenarioId` | A4 → F4 → P7 (422) · A5 → P8 · A6 → P9 | 17–30 | `RASCUNHO → SALVO → APLICADO` | `CompareTable`, `PV` |
| RF31.CA04 | `ScenarioService.shareInSession`, `MessageAttachment SCENARIO`, `sharedInSessionId`, `SummaryScenario.linkedProjectScenarioId`, `FinalDecision.chosenScenarioId`, nó CENARIO | A7 → F5 → P10 (403/409) → P11 | 31–40 | `SALVO → self (compartilhado)` + nota | `BS`, `CASA` |
| RF31.CA05 | `AiInferenceLog` (faísca ✦), `LocalEngine` (prazo/caminho crítico sem IA externa) | I2 → I3 | 11–14 | — | `AIP`, `Spark ✦` |
