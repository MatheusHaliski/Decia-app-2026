# RF31 — Simular cenários sobre um Esquema de Projeto (corte de orçamento, atraso, troca de fornecedor, mudança de escopo) antes de enviá-lo à aprovação
**HU:** HU31 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** RF18 Provador 2D (experimentar antes de decidir) · **Aba/rota:** Simulador de Cenários (`/projects/[id]/simulate`, comparação `?compare=a,b,c`), compartilhar na sessão (`/decia/[sessionId]`, RF29)
**Critérios de aceite cobertos:** RF31.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs.

Um `ProjectScenario` guarda as variáveis (`variablesJson`: `budgetDeltaPct`, `scheduleDeltaDays`, `removedTaskIds`, `addedTasksJson`, `responsibleSwaps`, `supplierSwaps`, `scopeChangeText`) e o **relatório de impacto** (`impactReportJson`) no mesmo formato dos cenários do resumo analítico (RF11, `SummaryScenario`). O recálculo de linha do tempo, caminho crítico e risco por fase é **determinístico** (`CriticalPathService`, `RiskMatrixService`, D-12); a IA (`SIMULAR_CENARIO`) só redige vantagens/desvantagens e cruza com o Espelho (RF32). **Salvar** cria uma variante (não altera o original); **aplicar** gera `ProjectVersion` com `sourceScenarioId` (RF22). Compartilhar na sessão cria `MessageAttachment` tipo SCENARIO e `SummaryScenario.linkedProjectScenarioId`.

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Todos são planejados: `/projects/[id]/simulate` é página-esqueleto. Só quem tem acesso de edição ao projeto (dono ou colaborador) simula.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  dono["«ator» Dono do recurso"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  subgraph SIS["Work Station — RF31 Simulador de Cenários"]
    direction TB
    UC1(["UC1 Montar um cenário sobre o projeto"]):::ucPlan
    UC2(["UC2 Calcular o impacto e redigir vantagens e desvantagens"]):::ucPlan
    UC3(["UC3 Comparar até três cenários"]):::ucPlan
    UC4(["UC4 Salvar o cenário como variante"]):::ucPlan
    UC5(["UC5 Aplicar o cenário ao projeto"]):::ucPlan
    UC6(["UC6 Compartilhar o cenário na sessão DECIA"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  dono --- UC1
  dono --- UC3
  dono --- UC4
  dono --- UC5
  dono --- UC6
  colaborador --- UC1
  colaborador --- UC3
  colaborador --- UC4
  colaborador --- UC5
  colaborador --- UC6
  UC1 -. "«include»" .-> UC2
  UC2 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Montar um cenário sobre o projeto | `dono`, `colaborador` | RF31.CA01 | planejado |
| UC2 Calcular o impacto e redigir vantagens e desvantagens | `ia` | RF31.CA02, RF31.CA05 | planejado (recálculo determinístico; a IA só redige) |
| UC3 Comparar até três cenários | `dono`, `colaborador` | RF31.CA03 | planejado |
| UC4 Salvar o cenário como variante | `dono`, `colaborador` | RF31.CA03 | planejado |
| UC5 Aplicar o cenário ao projeto | `dono`, `colaborador` | RF31.CA03 | planejado (gera `ProjectVersion`) |
| UC6 Compartilhar o cenário na sessão DECIA | `dono`, `colaborador` | RF31.CA04 | planejado |

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

Tela/aba: `/projects/[id]/simulate` (esqueleto em `app/(shell)/projects/[id]/simulate/page.tsx`)

## Estado da implementação (12/11/2026)

Frontend funcional com dados DEMO (sem API de cenários; `ScenarioService`/`ScenarioController` seguem planejados). A página
`/projects/[id]/simulate` deixou de ser esqueleto (o bloco de CAs fica recolhido embaixo).

- **Motor determinístico** (`lib/projects/simulation/`, D-12): um cenário é uma lista de alavancas aplicada a uma CÓPIA do
  `ProjectModel` (o projeto nunca muda). Alavancas: corte de orçamento (% do orçamento total ou valor; tirado da reserva gerencial e
  depois da contingência, das linhas do trabalho sem cortar escopo, ou do escopo não iniciado Won't → Could → Should, Must nunca),
  atraso de fornecedor (entrega atrasada = "não começa antes de", ou duração maior; por atividades escolhidas, palavra no título ou
  risco ligado), mudança de escopo (retirar entregas/atividades não iniciadas religando as dependências, incluir entrega com
  "depois de/antes de", % de esforço só no que falta), indisponibilidade de pessoa (ausência pausa/adia; capacidade reduzida estica)
  e reajuste de preço (linha de orçamento = custo certo; atividade = no que falta). Ordem canônica: escopo → pessoas → fornecedor →
  preço → corte. Resultado frente à LINHA DE BASE (o projeto sem alavancas, pelo mesmo motor): término e caminho crítico pelo CPM
  (`engine/schedule.ts`, o que entrou/saiu e o que ficou comandado pela restrição), P50/P80 e chance de cumprir o prazo-alvo por
  Monte Carlo Beta-PERT com semente fixa 31 e a mesma em todos os cenários (`engine/montecarlo.ts`), ENT/VNT/IDPT pelo valor
  agregado (`engine/evm.ts`), uso da reserva de contingência e falta além dela, riscos que disparam (prazo, chance < 50 %, reserva
  estourada, reserva < VME, IDPT > 1,1, corte descoberto, Must retirado, risco registrado ligado a atividade atingida, caminho
  crítico, conformidade) marcados "novo"/"já existia", e o porquê de cada número. Cruza com o Espelho (RF32): itens de conformidade
  que o cenário perde ou ganha.
- **Tela** (`components/projects/simulate/`): linha de base e premissas (prazo-alvo, sorteios, custo indireto por dia de atraso);
  até 3 cenários em abas, cada um com editor de alavancas (erro de validação visível) e relatório de impacto; comparação lado a lado
  em tabela acessível e dois gráficos SVG (prazo com faixa P50–P80 e prazo-alvo; ENT com orçamento aprovado e contingência);
  `?compare=a,b,c` (até 3; id desconhecido ou excedente é avisado); cenários salvos em repositório DEMO (`store.ts`, com retrato dos
  números e versão do projeto). Leitura ✦ da IA simulada montada só com os números do motor (`narrative.ts`), respeitando a
  autonomia pessoal (padrão "sob solicitação", D-136).
- **Enviar à aprovação** (CA03): o cenário vira `CHANGE_REQUEST` normal (impacto nas seis restrições calculado; 7 Rs preenchidos)
  e é levado ao comitê pelo `openChangeDecision` do DECIA (`lib/projects/decia.ts`); atividades, orçamento e linha de base não
  mudam antes da decisão. O cenário salvo guarda a mudança e a decisão abertas.
- **Fora desta entrega**: aplicar o cenário gerando `ProjectVersion.sourceScenarioId` (hoje a aprovação segue o fluxo normal de
  mudança da Mesa: Controle › Implementar), compartilhar na sessão DECIA (CA04: `MessageAttachment SCENARIO`), `AiInferenceLog`
  (CA05) e a API (`/api/projects/{id}/scenarios`).
- **Testes**: `lib/projects/simulation/simulation.test.ts` (cada alavanca, determinismo da semente, projeto pequeno e DEMO, envio à
  aprovação sem mudar o plano) e `components/projects/simulate/simulate.test.tsx` (tela e página).
