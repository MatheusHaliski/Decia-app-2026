# RF32 — Verificar a conformidade de um Esquema de Projeto no Espelho de Conformidade (checklists legais e do departamento) e sugerir as tarefas faltantes
**HU:** HU32 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** Espelho / Smart Mirror (RF28) · **Aba/rota:** Espelho de Conformidade (`/projects/[id]/mirror`), gestão de checklists na página da empresa/departamento (`/companies/[slug]/manage/checklists`, `/departments/[slug]/checklists`), selo de conformidade no `ProjectCard`
**Critérios de aceite cobertos:** RF32.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs.

`ComplianceChecklist` (por `processTag`, empresa ou departamento, com `legalBasis`, ex.: Lei 14.133/2021) tem `ComplianceItem`s (OBRIGATORIO · RECOMENDADO, `expectedPhase`, `expectedCategory`, `expectedType`, `mustPrecedeItemId`). Abrir o Espelho gera um `ComplianceResult` (`itemsJson` com ATENDIDO · RECOMENDADO_AUSENTE · OBRIGATORIO_AUSENTE · FORA_DE_ORDEM, `percent`, `blockingCount`). O cruzamento é **determinístico** (`ComplianceService`); a IA (`CONFORMIDADE`) só sugere qual tarefa atende cada item e redige a explicação ✦. O selo (%) vai para `ProjectScheme.conformityPercent/hasBlockingPending`; a passagem para APROVACAO com ⛔ pendente exige **justificativa do chefe** (`overrideByUserId/overrideReason`, autoridade humana). O resultado entra no resumo analítico (`AnalyticalSummary.complianceResultId`) e no rastro (nó CONFORMIDADE → VERIFICOU).

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Todos são planejados: `/projects/[id]/mirror` é página-esqueleto e a gestão de checklists ainda não tem rota.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  empresa["«ator» Empresa ou órgão"]:::ator
  chefe["«ator» Chefe de departamento"]:::ator
  dono["«ator» Dono do recurso"]:::ator
  subgraph SIS["Work Station — RF32 Espelho de Conformidade"]
    direction TB
    UC1(["UC1 Manter checklists de conformidade"]):::ucPlan
    UC2(["UC2 Abrir o Espelho de Conformidade do projeto"]):::ucPlan
    UC3(["UC3 Sugerir a tarefa que atende cada item"]):::ucPlan
    UC4(["UC4 Criar a tarefa faltante"]):::ucPlan
    UC5(["UC5 Enviar o projeto à aprovação com o selo"]):::ucPlan
    UC6(["UC6 Liberar a aprovação com justificativa"]):::ucPlan
    UC7(["UC7 Registrar a verificação no resumo e no rastro"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  empresa --- UC1
  chefe --- UC1
  chefe --- UC2
  chefe --- UC6
  dono --- UC2
  dono --- UC4
  dono --- UC5
  UC2 -. "«include»" .-> UC3
  UC2 -. "«include»" .-> UC7
  UC4 -. "«extend»" .-> UC2
  UC6 -. "«extend»" .-> UC5
  UC3 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Manter checklists de conformidade | `empresa`, `chefe` | RF32.CA01 | planejado |
| UC2 Abrir o Espelho de Conformidade do projeto | `dono`, `chefe` | RF32.CA02, RF32.CA06 | planejado (o chefe revisor só lê) |
| UC3 Sugerir a tarefa que atende cada item | `ia` | RF32.CA02 | planejado |
| UC4 Criar a tarefa faltante | `dono` | RF32.CA03, RF32.CA06 | planejado |
| UC5 Enviar o projeto à aprovação com o selo | `dono` | RF32.CA04 | planejado |
| UC6 Liberar a aprovação com justificativa | `chefe` | RF32.CA04 | planejado |
| UC7 Registrar a verificação no resumo e no rastro | — (incluído por UC2) | RF32.CA05 | planejado |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_projects {
  class ComplianceChecklist {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +departmentId: UUID
    +processTag: ProcessTag
    +name: String
    +legalBasis: String
    +active: boolean
    +version: int
  }
  class ComplianceItem {
    <<entity>>
    +id: UUID
    +checklistId: UUID
    +label: String
    +requirement: Requirement
    +expectedPhase: ProjectPhase
    +expectedCategory: TaskCategory
    +expectedType: TaskType
    +mustPrecedeItemId: UUID
    +sortOrder: int
  }
  class ComplianceResult {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +checklistId: UUID
    +evaluatedAt: Instant
    +itemsJson: JSON
    +percent: BigDecimal
    +blockingCount: int
    +overrideByUserId: UUID
    +overrideReason: String
    +aiInferenceId: UUID
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +processTags: Set~ProcessTag~
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +conformityPercent: BigDecimal
    +hasBlockingPending: boolean
    .. +30 campos ..
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +sortOrder: int
  }
  class Requirement {
    <<enum>>
    OBRIGATORIO
    RECOMENDADO
  }
  class ItemStatus {
    <<enum>>
    ATENDIDO
    RECOMENDADO_AUSENTE
    OBRIGATORIO_AUSENTE
    FORA_DE_ORDEM
  }
}

namespace ws_domain_acervo_decia {
  class TaskItem {
    <<entity>>
    +id: UUID
    +title: String
    +type: TaskType
    +category: TaskCategory
    +state: TaskState
    +checklistItemId: UUID
    .. +50 campos ..
  }
  class AnalyticalSummary {
    <<entity>>
    +sessionId: UUID
    +complianceResultId: UUID
  }
  class DecisionTraceNode {
    <<entity>>
    +nodeType: TraceNodeType
    +refId: UUID
  }
  class AiInferenceLog {
    <<entity>>
    +capability: AiCapability
    +result: InferenceResult
    +fallbackUsed: boolean
  }
}

namespace ws_application {
  class ChecklistService {
    <<service>>
    +create(actor, ChecklistForm) ComplianceChecklist
    +update(actor, id, ChecklistForm) ComplianceChecklist
    +applicableTo(project) List~ComplianceChecklist~
  }
  class ComplianceService {
    <<service>>
    +evaluate(actor, projectId) ComplianceResult
    +createMissingTask(actor, resultId, itemId) TaskItem
    +override(actor, projectId, reason) ComplianceResult
    +gateToApproval(project) GateResult
  }
  class ProjectStateMachine {
    <<service>>
    +transition(project, APROVACAO, actor, override)
  }
  class DecisionTraceService {
    <<service>>
    +append(CONFORMIDADE, VERIFICOU)
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
  }
  class Guard {
    <<service>>
    +requireRole(actor, role)
    +requireDeptHead(actor, deptId)
    +requireOwner(actor, ownerId)
    +requireSameCompany(actor, companyId)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class ChecklistController {
    <<controller>>
    +POST_api_checklists(form)
    +PATCH_api_checklists_id(form)
    +GET_api_checklists(processTag)
  }
  class MirrorController {
    <<controller>>
    +POST_api_projects_id_mirror()
    +GET_api_projects_id_mirror()
    +POST_api_projects_id_mirror_items_itemId_task()
    +POST_api_projects_id_mirror_override(reason)
  }
}

ComplianceChecklist "1" *-- "1..*" ComplianceItem
ComplianceItem "0..*" --> "0..1" ComplianceItem : mustPrecedeItemId
ComplianceChecklist "1" o-- "0..*" ComplianceResult
ProjectScheme "1" o-- "0..*" ComplianceResult
ProjectScheme "1" *-- "0..*" ProjectTask
ProjectTask "0..*" --> "1" TaskItem
TaskItem "0..*" --> "0..1" ComplianceItem : checklistItemId tarefa faltante
AnalyticalSummary "0..*" --> "0..1" ComplianceResult : complianceResultId
DecisionTraceNode ..> ComplianceResult : CONFORMIDADE
ChecklistController --> ChecklistService
MirrorController --> ComplianceService
ComplianceService --> ChecklistService
ComplianceService --> ProjectStateMachine
ComplianceService --> DecisionTraceService
ComplianceService --> AiEngine
ComplianceService --> Guard
ChecklistService --> Guard
ComplianceService --> DomainEvents
AiEngine ..> AiInferenceLog
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPRESA · CHEFE · dono do projeto)"]
    A0([EMPRESA/CHEFE mantém checklists]) --> A1["Cria checklist por categoria de processo com itens obrigatórios/recomendados e fase esperada"]
    A2([Dono ou chefe revisor abre o Espelho]) --> A3["Lê itens atendidos, recomendados ausentes e obrigatórios ausentes"]
    A3 --> A4{"Item ausente?"}
    A4 -->|sim| A5["Clica Criar tarefa faltante"]
    A6([Tenta mover o projeto para APROVACAO])
    A7{"Chefe aprova mesmo assim?"}
    A7 -->|sim| A8["Registra justificativa"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/projects/[id]/mirror · companies/[slug]/manage/checklists)"]
    F1["ChecklistForm (Select processTag, itens com Requirement, fase e categoria)"]
    F2["POST /api/projects/{id}/mirror → MirrorView (Tag por item, selo %)"]
    F3["POST /mirror/items/{itemId}/task"]
    F4["Dialog de justificativa · POST /mirror/override"]
    F5["ProjectCard com selo de conformidade (%) e bloqueio pendente"]
  end

  subgraph WEB["ws-web"]
    W1["JWT · CorrelationIdFilter"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    P1{"Guard.requireRole EMPRESA ou requireDeptHead?"}
    P1 -->|não| E1["403 ACESSO_NEGADO"]
    P2{"Itens com ciclo em mustPrecedeItemId?"}
    P2 -->|sim| E2["422 VALIDACAO details.items"]
    P3["Grava ComplianceChecklist + itens (versão ++)"]
    P4{"Projeto visível ao ator? (dono ou chefe revisor, CA06 só leitura)"}
    P4 -->|não| E3["403 ACESSO_NEGADO"]
    P5["ChecklistService.applicableTo(processTags, departamento)"]
    P6["Cruzamento determinístico: por item, procura ProjectTask com categoria/tipo esperados e checa fase e ordem"]
    P7["ComplianceResult(itemsJson, percent, blockingCount) · ProjectScheme.conformityPercent/hasBlockingPending"]
    P8{"Ator pode editar o projeto?"}
    P8 -->|não, revisão de terceiro| E4["403 ACESSO_NEGADO"]
    P9["TaskItem RASCUNHO (tipo/categoria do item, checklistItemId) + ProjectTask na expectedPhase"]
    P10{"blockingCount maior que 0?"}
    P10 -->|sim, sem override| E5["409 CONFORMIDADE_PENDENTE (aviso, não impedimento)"]
    P10 -->|sim, com justificativa do chefe| P11["override registrado (overrideByUserId, overrideReason) + AuditLog"]
    P10 -->|não| P12["ProjectStateMachine → APROVACAO"]
    P13["DecisionTrace CONFORMIDADE → VERIFICOU · AnalyticalSummary.complianceResultId"]
  end

  subgraph IA["AiEngine (CONFORMIDADE)"]
    I1["Sugere qual tarefa atende item ambíguo e redige explicação ✦ (só sobre o cruzamento)"]
    I2["AiInferenceLog"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL compliance_checklists · compliance_items · compliance_results · project_schemes · tasks · project_tasks")]
    D2[("Cassandra trace_by_entity · flag cassandra.enabled")]
  end

  A1 --> F1 --> W1 --> P1 -->|sim| P2 -->|não| P3 --> D1
  A2 --> F2 --> W1 --> P4 -->|sim| P5 --> P6 --> I1 --> I2 --> P7 --> D1 --> F5
  P7 --> P13 --> D2
  A5 --> F3 --> W1 --> P8 -->|sim| P9 --> D1
  A6 --> P10
  A7 --> A8 --> F4 --> W1 --> P1 --> P11 --> P12 --> D1
  P12 --> D1
  E1 --> W2
  E2 --> W2
  E3 --> W2
  E4 --> W2
  E5 --> W2
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

  U->>FE: CHEFE cria checklist Licitação (Lei 14.133/2021)
  FE->>C: POST /api/checklists
  C->>S: ChecklistService.create(actor, form)
  S->>S: Guard.requireDeptHead(actor, deptId)
  alt item com ordem cíclica
    S-->>C: 422 VALIDACAO details.items
  else ok
    S->>DB: insert compliance_checklists + compliance_items
    S-->>C: 201
  end

  U->>FE: abre o Espelho do projeto
  FE->>C: POST /api/projects/{id}/mirror
  C->>S: ComplianceService.evaluate(actor, projectId)
  S->>S: Guard.requireOwner ou chefe revisor (CA06 só leitura)
  S->>DB: load project_tasks + tasks + checklists aplicáveis por processTag
  S->>S: cruzamento determinístico por item (fase, categoria, tipo, ordem)
  S->>AI: run(CONFORMIDADE, itens ambíguos + cruzamento)
  alt provedor indisponível
    AI-->>S: LocalEngine (sem redação) · fallbackUsed
  else ok
    AI-->>S: tarefa sugerida por item + explicação ✦
  end
  AI->>DB: insert ai_inference_log
  S->>DB: insert compliance_results + update project_schemes (conformityPercent, hasBlockingPending)
  S->>EV: ComplianceEvaluated
  S-->>FE: MirrorView (ATENDIDO, RECOMENDADO_AUSENTE, OBRIGATORIO_AUSENTE, FORA_DE_ORDEM)
  EV->>DB: decision_trace_nodes CONFORMIDADE + edge VERIFICOU (se projeto EM_DECISAO)
  EV->>CAS: trace_by_entity

  U->>FE: Criar tarefa faltante (ETP)
  FE->>C: POST /api/projects/{id}/mirror/items/{itemId}/task
  C->>S: ComplianceService.createMissingTask(actor, resultId, itemId)
  alt ator só revisa (projeto de outra pessoa)
    S-->>C: 403 ACESSO_NEGADO
  else dono
    S->>DB: insert tasks (RASCUNHO, type ETP, checklistItemId) + project_tasks (expectedPhase)
    S-->>FE: 201 TaskItem
  end

  U->>FE: move o projeto para APROVACAO com ⛔ pendente
  FE->>C: PATCH /api/projects/{id}/phase {APROVACAO}
  C->>S: ProjectStateMachine.transition via ComplianceService.gateToApproval
  alt blockingCount maior que 0 e sem justificativa
    S-->>C: 409 CONFORMIDADE_PENDENTE
    FE->>U: Dialog de justificativa (só CHEFE)
    FE->>C: POST /api/projects/{id}/mirror/override {reason}
    C->>S: ComplianceService.override(actor, id, reason)
    S->>S: Guard.requireDeptHead
    S->>DB: update compliance_results overrideByUserId, overrideReason · audit_log COMPLIANCE_OVERRIDE
    S->>DB: update project_schemes currentPhase APROVACAO
    S-->>FE: 200
  else sem bloqueio
    S->>DB: update project_schemes currentPhase APROVACAO
    S-->>FE: 200
  end
```

## 4. Máquina de estados

Entidade central: a avaliação de um item (`ItemStatus` dentro de `ComplianceResult.itemsJson`); o projeto segue `ProjectStatus`/`ProjectPhase` (RF22) com o **gate** para APROVACAO.

```mermaid
stateDiagram-v2
  [*] --> OBRIGATORIO_AUSENTE: item OBRIGATORIO sem tarefa correspondente (CA02)
  [*] --> RECOMENDADO_AUSENTE: item RECOMENDADO sem tarefa (CA02)
  [*] --> FORA_DE_ORDEM: tarefa existe mas em fase posterior à esperada ou após o item que deveria preceder
  [*] --> ATENDIDO: tarefa com categoria/tipo esperados na fase certa (satisfiedByProjectTaskId)
  OBRIGATORIO_AUSENTE --> ATENDIDO: Criar tarefa faltante (CA03) ou tarefa adicionada e nova avaliação
  RECOMENDADO_AUSENTE --> ATENDIDO: Criar tarefa faltante (CA03)
  FORA_DE_ORDEM --> ATENDIDO: tarefa movida para a fase esperada (Mesa, RF22) e reavaliação
  ATENDIDO --> OBRIGATORIO_AUSENTE: tarefa removida do projeto · reavaliação
  state GateAprovacao {
    [*] --> Bloqueado: blockingCount maior que 0 → 409 CONFORMIDADE_PENDENTE (CA04)
    Bloqueado --> Liberado: override do chefe com justificativa (autoridade humana)
    Bloqueado --> Liberado: todos os obrigatórios ATENDIDOS
  }
  note right of ATENDIDO
    percent = atendidos / total · selo no card (CA04)
    resultado vai ao resumo analítico e ao rastro (CA05)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/projects/[id]/mirror · companies/[slug]/manage/checklists · departments/[slug]/checklists"]
    R2["components: MirrorView · Tag (ATENDIDO/AUSENTE) · ChecklistForm · ProjectCard (selo %) · Dialog (justificativa) · Spark ✦ · Button criar-tarefa"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    MC["MirrorController · ChecklistController (@Operation RF32.CA01-CA06)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    CS["projects/ComplianceService (cruzamento determinístico)"]
    CL["projects/ChecklistService"]
    PSM["projects/ProjectStateMachine (gate APROVACAO)"]
    TS["decia/DecisionTraceService (RF29)"]
    SUM["decia/SummaryService (RF11, complianceResultId)"]
    AIE["ai/AiEngine (CONFORMIDADE)"]
    GD["security/Guard (main: requireRole · planejado: requireDeptHead)"]
    AUD["audit/AuditLogPort (main)"]
    DE["events/DomainEvents AFTER_COMMIT"]
  end
  subgraph DOM["ws-domain"]
    ENT["ComplianceChecklist · ComplianceItem · ComplianceResult · ProjectScheme.conformityPercent · TaskItem.checklistItemId (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql compliance_* (V__rf32)"]
    CASA["persistence-cassandra trace_by_entity (flag cassandra.enabled)"]
    AIP["ai-providers (ai-claude · ai-gemini · ai-local)"]
  end
  BFF --> MC --> SEC
  MC --> CS
  MC --> CL
  CS --> CL
  CS --> PSM
  CS --> TS
  CS --> AIE
  CS --> GD
  CS --> AUD
  CS --> DE --> SUM
  CS --> ENT --> MY --> MYSQL[("MySQL 8")]
  TS --> CASA --> CASS[("Cassandra")]
  AIE --> AIP --> AI["Claude / Gemini / local"]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF32.CA01 | `ComplianceChecklist`, `ComplianceItem` (requirement, expectedPhase, mustPrecedeItemId), `ChecklistService.create/update`, `Guard.requireRole/requireDeptHead` | A1 → F1 → P1 (403) → P2 (422) → P3 | 1–8 | — | `CL`, `ChecklistForm`, `MY` |
| RF32.CA02 | `ComplianceService.evaluate`, `ComplianceResult.itemsJson` (`ItemStatus`), `AiCapability CONFORMIDADE` | A2 → F2 → P4 → P5 → P6 → I1 → P7 | 9–22 | `[*] → ATENDIDO / RECOMENDADO_AUSENTE / OBRIGATORIO_AUSENTE / FORA_DE_ORDEM` | `CS`, `MirrorView`, `AIE` |
| RF32.CA03 | `ComplianceService.createMissingTask`, `TaskItem.checklistItemId`, `ProjectTask.phase = expectedPhase` | A4 → A5 → F3 → P8 (403) → P9 | 25–31 | `*_AUSENTE → ATENDIDO` | `Button criar-tarefa`, `CS` |
| RF32.CA04 | `ProjectScheme.conformityPercent/hasBlockingPending`, `ComplianceService.gateToApproval/override`, `overrideByUserId/overrideReason`, `AuditLog COMPLIANCE_OVERRIDE` | A6 → P10 (409 CONFORMIDADE_PENDENTE) → A7 → A8 → F4 → P11 → P12 · F5 | 32–44 | `GateAprovacao: Bloqueado → Liberado` | `PSM`, `ProjectCard`, `Dialog`, `AUD` |
| RF32.CA05 | `AnalyticalSummary.complianceResultId`, nó `CONFORMIDADE` + aresta `VERIFICOU`, `DomainEvents ComplianceEvaluated` | P13 | 20–24 | nota de ATENDIDO | `TS`, `SUM`, `CASA` |
| RF32.CA06 | `Guard` (chefe revisor lê, não edita), `ComplianceService.createMissingTask` 403 para revisor | P4 → P8 (403) | 12, 27–28 | — | `GD` |

Tela/aba: `/projects/[id]/mirror` (esqueleto em `app/(shell)/projects/[id]/mirror/page.tsx`)
