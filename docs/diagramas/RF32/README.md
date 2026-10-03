# RF32 — Verificar a conformidade de um Esquema de Projeto no Espelho de Conformidade (checklists legais e do departamento) e sugerir as tarefas faltantes

**HU:** HU32 · **Sprint (board Work Station):** Product Backlog (pós-Sprint 4, a priorizar) · **Equivalente FAI:** Espelho / Smart Mirror (RF28) — a IA "olha" o projeto e diz o que falta · **Aba/rota:** Espelho de Conformidade (`/projects/[id]/mirror`); manutenção de checklists na página da empresa/departamento (`/companies/[slug]/checklists`, rota a confirmar)

**Critérios de aceite cobertos:** RF32.CA01 · RF32.CA02 · RF32.CA03 · RF32.CA04 · RF32.CA05 · RF32.CA06

> Contextos da TAXONOMIA: **3. Criador de Projetos** (`ComplianceChecklist`, `ComplianceItem`, `ComplianceResult`, `ProjectScheme.conformityPercent/hasBlockingPending`, `ProjectTask`), **2. Acervo** (`TaskItem.checklistItemId` = tarefa faltante criada pelo Espelho), **5. DECIA** (`AnalyticalSummary.complianceResultId`, `DecisionTraceNode CONFORMIDADE`, aresta `VERIFICOU`) e **10. IA** (`AiInferenceLog` capability `CONFORMIDADE`). Exemplos de checklist do card: licitação — Lei 14.133/2021 (ETP antes do TR, parecer jurídico antes da APROVACAO, pesquisa de preços); obra — licença ambiental, ART/RRT, projeto básico antes da EXECUCAO. O bloqueio em ⛔ é **aviso, não impedimento**: o chefe aprova com `overrideReason` (autoridade humana).

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR
  namespace wai-domain {
    class ComplianceChecklist {
      <<entity>>
      +UUID id
      +UUID companyId
      +UUID departmentId
      +ProcessTag processTag
      +String name
      +String legalBasis
      +boolean active
      +int version
    }
    class ComplianceItem {
      <<entity>>
      +UUID id
      +UUID checklistId
      +String label
      +String requirement
      +ProjectPhase expectedPhase
      +TaskCategory expectedCategory
      +TaskType expectedType
      +UUID mustPrecedeItemId
      +int sortOrder
    }
    class ComplianceResult {
      <<entity>>
      +UUID id
      +UUID projectId
      +UUID checklistId
      +Instant evaluatedAt
      +JSON itemsJson
      +BigDecimal percent
      +int blockingCount
      +UUID overrideByUserId
      +String overrideReason
      +UUID aiInferenceId
    }
    class ProjectScheme {
      <<entity>>
      +UUID id
      +UUID ownerId
      +UUID companyId
      +UUID departmentId
      +Set~ProcessTag~ processTags
      +ProjectStatus status
      +ProjectPhase currentPhase
      +BigDecimal conformityPercent
      +boolean hasBlockingPending
    }
    class ProjectTask {
      <<entity>>
      +UUID id
      +UUID projectId
      +UUID taskId
      +ProjectPhase phase
      +int sortOrder
      +JSON snapshotJson
    }
    class TaskItem {
      <<entity>>
      +UUID id
      +UUID ownerId
      +String title
      +TaskType type
      +TaskCategory category
      +TaskState state
      +UUID checklistItemId
      +UUID sourceProjectId
    }
    class AnalyticalSummary {
      <<entity>>
      +UUID id
      +UUID sessionId
      +UUID complianceResultId
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
      +String result
      +boolean fallbackUsed
    }
    class AuditLog {
      <<entity>>
      +UUID id
      +UUID actorId
      +String action
      +UUID resourceId
    }
    class ItemStatus {
      <<enum>>
      ATENDIDO
      RECOMENDADO_AUSENTE
      OBRIGATORIO_AUSENTE
      FORA_DE_ORDEM
    }
    class Requirement {
      <<enum>>
      OBRIGATORIO
      RECOMENDADO
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
  namespace wai-application {
    class ComplianceService {
      <<service>>
      +createChecklist(issuerId, form) ComplianceChecklist
      +upsertItem(issuerId, checklistId, itemForm) ComplianceItem
      +evaluate(actorId, projectId) ComplianceResult
      +evaluateHypothetical(project, tasks) ComplianceResult
      +createMissingTask(actorId, projectId, itemId) TaskItem
      +gatePhaseChange(actorId, projectId, targetPhase, overrideReason) ComplianceResult
    }
    class TaskService {
      <<service>>
      +create(ownerId, form) TaskItem
    }
    class DecisionTraceService {
      <<service>>
      +appendNode(sessionId, type, refId, label, classLabel, actorId, snapshot) DecisionTraceNode
    }
    class AccessPolicy {
      <<service>>
      +requireIssuer(user) void
      +canEditProject(user, project) boolean
    }
    class AiEngine {
      <<service>>
      +matchItems(project, tasks, items) List~ItemMatch~
    }
    class AiProviderPort {
      <<port>>
      +complete(prompt, mode, accessClass) AiResult
    }
    class RuleEnginePort {
      <<port>>
      +crossDeterministic(tasks, items) List~ItemMatch~
    }
  }
  namespace wai-web {
    class ComplianceChecklistController {
      <<controller>>
      +create(body)
      +upsertItem(checklistId, body)
      +list(companyId, processTag)
    }
    class MirrorController {
      <<controller>>
      +evaluate(projectId)
      +createMissingTask(projectId, itemId)
      +changePhase(projectId, body)
    }
  }
  namespace wai-infrastructure {
    class LocalComplianceEngine {
      <<adapter>>
      cruzamento determinístico
    }
    class ClaudeAdapter {
      <<adapter>>
    }
    class ComplianceJpaRepository {
      <<adapter>>
    }
    class CassandraTraceMirror {
      <<adapter>>
    }
  }
  ComplianceChecklist "1" --> "*" ComplianceItem
  ComplianceItem --> ComplianceItem : mustPrecedeItemId
  ComplianceItem --> Requirement : requirement
  ComplianceItem --> ProjectPhase : expectedPhase
  ComplianceResult --> ComplianceChecklist : checklistId
  ComplianceResult --> ProjectScheme : projectId
  ComplianceResult ..> ItemStatus : itemsJson status
  ComplianceResult --> AiInferenceLog : aiInferenceId
  ProjectScheme "1" --> "*" ProjectTask
  ProjectTask --> TaskItem : taskId satisfiedByProjectTaskId
  TaskItem --> ComplianceItem : checklistItemId
  AnalyticalSummary --> ComplianceResult : complianceResultId
  DecisionTraceNode ..> ComplianceResult : nodeType CONFORMIDADE
  ComplianceService ..> ComplianceChecklist
  ComplianceService ..> ComplianceResult
  ComplianceService ..> RuleEnginePort : cruzamento base
  ComplianceService ..> AiEngine : match semântico ✦
  ComplianceService ..> TaskService : tarefa faltante RF20
  ComplianceService ..> DecisionTraceService : nó CONFORMIDADE
  ComplianceService ..> AccessPolicy
  ComplianceService ..> AuditLog : override
  AiEngine ..> AiProviderPort
  ComplianceChecklistController ..> ComplianceService
  MirrorController ..> ComplianceService
  LocalComplianceEngine ..|> RuleEnginePort
  ClaudeAdapter ..|> AiProviderPort
  ComplianceJpaRepository ..> ComplianceResult : MySQL
  CassandraTraceMirror ..> DecisionTraceNode : espelho
  note for ComplianceResult "itemsJson [{itemId, status, satisfiedByProjectTaskId}] · percent · blockingCount · overrideReason (CA04)"
  note for ComplianceChecklist "tabela compliance_checklists · departmentId null = checklist da empresa"
  note for ProjectScheme "tabela project_schemes · .. +30 campos .."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Ator humano"]
    U1["EMPRESA ou CHEFE mantém checklist por categoria de processo: itens obrigatórios ou recomendados, fase esperada, precedência"]
    U2["Usuário abre /projects/[id]/mirror"]
    U3["Clica Criar tarefa faltante num item ausente"]
    U4["Dono tenta mover o projeto para APROVACAO"]
    U5["Chefe aprova mesmo assim e registra justificativa"]
    U6["Chefe abre o Espelho de um projeto de outra pessoa em revisão"]
  end
  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["Lista: atendido com a tarefa que atende · recomendado ausente · obrigatório ausente ou fora de ordem"]
    W2["Selo de conformidade % no card do projeto"]
    W3["Aviso de bloqueio com itens pendentes e campo de justificativa"]
    W4["Modo leitura: sem Criar tarefa faltante nem edição"]
  end
  subgraph L3["wai-application"]
    S1{"Ator é EMPRESA ou CHEFE?"}
    S2{"mustPrecedeItemId sem ciclo e fase esperada válida?"}
    S3["Salva ComplianceChecklist e ComplianceItem (version+1)"]
    S4{"Ator pode ver o projeto?"}
    S5["Seleciona checklists ativos por processTag do projeto, empresa e departamento"]
    S6["RuleEnginePort: cruza ProjectTask (fase, categoria, tipo) com itens e precedências"]
    S7["ComplianceResult itemsJson, percent, blockingCount · AiInferenceLog CONFORMIDADE"]
    S8["ProjectScheme.conformityPercent e hasBlockingPending atualizados"]
    S9{"Ator pode editar o projeto?"}
    S10["TaskService.create: tipo e categoria do item, checklistItemId · ProjectTask na expectedPhase · re-avalia"]
    S11{"blockingCount maior que zero?"}
    S12{"overrideReason informado e ator é CHEFE?"}
    S13["ComplianceResult.overrideByUserId e overrideReason · AuditLog COMPLIANCE_OVERRIDE · fase muda"]
    S14["Fase muda normalmente"]
    S15["Evento ConformityEvaluated: AnalyticalSummary.complianceResultId e nó CONFORMIDADE no rastro (RF29)"]
    E1["403 ACESSO_NEGADO"]
    E2["422 VALIDACAO"]
    E3["403 ACESSO_NEGADO"]
    E4["403 ACESSO_NEGADO"]
    E5["409 CONFORMIDADE_PENDENTE (aviso, exige justificativa)"]
  end
  subgraph L4["IA (AiEngine)"]
    A1["matchItems ✦: reconhece parecer jurídico em DOCUMENTO sem categoria, ETP antes do TR, licença sem prazo"]
    A2["Sem IA externa: só o cruzamento determinístico (result FALLBACK)"]
  end
  subgraph L5["Persistência"]
    D1[("MySQL: compliance_checklists · compliance_items")]
    D2[("MySQL: compliance_results · project_schemes · ai_inference_log")]
    D3[("MySQL: tasks · project_tasks")]
    D4[("MySQL: audit_log · analytical_summaries · decision_trace_nodes · Cassandra: trace_by_entity")]
  end
  U1 --> S1
  S1 -->|"não"| E1
  S1 -->|"sim"| S2
  S2 -->|"não"| E2
  S2 -->|"sim"| S3 --> D1
  U2 --> S4
  S4 -->|"não"| E3
  S4 -->|"sim"| S5 --> D1
  S5 --> S6 --> A1
  S6 --> A2
  A1 --> S7
  A2 --> S7
  S7 --> D2
  S7 --> S8 --> W2
  S7 --> W1 --> U3 --> S9
  S9 -->|"não"| E4
  S9 -->|"sim"| S10 --> D3
  S10 --> S6
  U4 --> S11
  S11 -->|"não"| S14 --> D2
  S11 -->|"sim"| W3 --> S12
  S12 -->|"não"| E5
  S12 -->|"sim"| U5 --> S13 --> D4
  S13 --> D2
  S7 --> S15 --> D4
  U6 --> S4
  S8 --> W4
  classDef err fill:#fde2e2,stroke:#b91c1c,color:#7f1d1d
  class E1,E2,E3,E4,E5 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (wai-web)
  participant S as Service (wai-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01 — EMPRESA ou CHEFE mantém o checklist do processo
  U->>NX: CHEFE cria checklist Licitação (Lei 14.133/2021)
  NX->>C: POST /api/compliance/checklists {processTag LICITACAO, name, legalBasis, items[]}
  C->>S: ComplianceService.createChecklist(issuerId, form)
  alt ator EMPREGADO
    S-->>C: 403 ACESSO_NEGADO
  else precedência cíclica (ETP antes do TR antes do ETP)
    S-->>C: 422 VALIDACAO
  else ok
    S->>DB: INSERT compliance_checklists · INSERT compliance_items (requirement, expectedPhase, mustPrecedeItemId)
    S-->>C: 201 ComplianceChecklist
  end

  Note over U,EV: CA02, CA05 e CA06 — abrir o Espelho (dono ou chefe revisor)
  U->>NX: abre /projects/[id]/mirror
  NX->>C: GET /api/projects/{projectId}/mirror
  C->>S: ComplianceService.evaluate(actorId, projectId)
  alt sem permissão de leitura do projeto
    S-->>C: 403 ACESSO_NEGADO
  else ok
    S->>DB: SELECT project_schemes, project_tasks, tasks · compliance_checklists ativos por processTag
    S->>S: RuleEnginePort.crossDeterministic (fase, categoria, tipo, precedência)
    alt provider externo disponível
      S->>AI: matchItems(project, tasks, items)
      AI-->>S: matches semânticos com confiança ✦
    else sem IA externa
      S->>S: mantém só o cruzamento determinístico · fallbackUsed
    end
    S->>DB: INSERT compliance_results (itemsJson, percent, blockingCount) · INSERT ai_inference_log (CONFORMIDADE)
    S->>DB: UPDATE project_schemes SET conformityPercent, hasBlockingPending
    S-)EV: ConformityEvaluated(projectId, resultId)
    EV->>DB: UPDATE analytical_summaries SET complianceResultId (sessão vinculada, RF11)
    EV->>DB: INSERT decision_trace_nodes (CONFORMIDADE) · edges (VERIFICOU)
    EV->>CS: INSERT trace_by_entity
    S-->>NX: 200 itens ✅ ⚠️ ⛔ com satisfiedByProjectTaskId · modo leitura se ator não edita (CA06)
  end

  Note over U,EV: CA03 — criar tarefa faltante
  U->>NX: Criar tarefa faltante em Parecer jurídico
  NX->>C: POST /api/projects/{projectId}/mirror/items/{itemId}/create-task
  C->>S: ComplianceService.createMissingTask(actorId, projectId, itemId)
  alt ator não edita o projeto (revisor, CA06)
    S-->>C: 403 ACESSO_NEGADO
  else ok
    S->>DB: INSERT tasks (type e category do item, checklistItemId, sourceProjectId) · INSERT project_tasks (expectedPhase)
    S->>S: evaluate(projectId) novamente
    S-->>NX: 201 TaskItem + ComplianceResult atualizado
  end

  Note over U,EV: CA04 — selo % e bloqueio com aviso na passagem para APROVACAO
  U->>NX: move o projeto para APROVACAO
  NX->>C: POST /api/projects/{projectId}/phase {targetPhase APROVACAO}
  C->>S: ComplianceService.gatePhaseChange(actorId, projectId, APROVACAO, null)
  alt blockingCount maior que zero e sem justificativa
    S-->>NX: 409 CONFORMIDADE_PENDENTE (lista de ⛔, pede justificativa)
    U->>NX: CHEFE informa a justificativa
    NX->>C: POST /api/projects/{projectId}/phase {targetPhase APROVACAO, overrideReason}
    C->>S: ComplianceService.gatePhaseChange(chefeId, projectId, APROVACAO, reason)
    alt ator não é CHEFE
      S-->>C: 403 ACESSO_NEGADO
    else CHEFE
      S->>DB: UPDATE compliance_results SET overrideByUserId, overrideReason · INSERT audit_log (COMPLIANCE_OVERRIDE)
      S->>DB: UPDATE project_schemes SET currentPhase = APROVACAO
      S-->>NX: 200
    end
  else sem pendência ⛔
    S->>DB: UPDATE project_schemes SET currentPhase = APROVACAO
    S-->>NX: 200
  end
```

## 4. Máquina de estados

Entidades centrais: o **status de cada item** em `ComplianceResult.itemsJson` (não há enum nomeado na TAXONOMIA — valores ATENDIDO · RECOMENDADO_AUSENTE · OBRIGATORIO_AUSENTE · FORA_DE_ORDEM) e o **portão de fase** do projeto derivado de `ProjectScheme.hasBlockingPending`.

```mermaid
stateDiagram-v2
  direction LR
  state "Item do checklist (ComplianceResult.itemsJson)" as Item {
    [*] --> NaoAvaliado
    NaoAvaliado --> ATENDIDO : tarefa compatível na fase esperada (CA02)
    NaoAvaliado --> RECOMENDADO_AUSENTE : requirement RECOMENDADO sem tarefa
    NaoAvaliado --> OBRIGATORIO_AUSENTE : requirement OBRIGATORIO sem tarefa
    NaoAvaliado --> FORA_DE_ORDEM : tarefa existe mas viola mustPrecedeItemId ou fase
    RECOMENDADO_AUSENTE --> ATENDIDO : Criar tarefa faltante (CA03) ou tarefa adicionada
    OBRIGATORIO_AUSENTE --> ATENDIDO : Criar tarefa faltante (CA03) ou tarefa adicionada
    FORA_DE_ORDEM --> ATENDIDO : reordenação de fase ou dependência
    ATENDIDO --> OBRIGATORIO_AUSENTE : tarefa removida do projeto (re-avaliação)
  }
  state "Portão de fase do projeto" as Gate {
    [*] --> SemPendencia
    SemPendencia --> ComPendencia : blockingCount maior que zero
    ComPendencia --> SemPendencia : todos os obrigatórios ATENDIDO
    ComPendencia --> AprovacaoComJustificativa : CHEFE informa overrideReason (CA04)
    SemPendencia --> Aprovacao : passagem para APROVACAO liberada
    AprovacaoComJustificativa --> [*]
    Aprovacao --> [*]
  }
  Item --> Gate : percent e blockingCount agregados
  note right of Gate
    hasBlockingPending = true mostra aviso 409 CONFORMIDADE_PENDENTE
    Não é impedimento absoluto - autoridade humana (CA04)
    Override vai para audit_log e para o rastro (CA05)
  end note
  note left of Item
    Selo de conformidade % = atendidos / total (CA04)
    Avaliação em modo leitura para revisor (CA06)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Next.js (frontend)"]
    direction TB
    P1["app/projects/[id]/mirror/page.tsx"]
    P2["app/companies/[slug]/checklists · manutenção (EMPRESA e CHEFE)"]
    P3["app/projects/[id] · card com ConformitySeal %"]
    UI1["components/ui: ChecklistItemRow (✅ ⚠️ ⛔) · ConformitySeal · OverrideDialog · CreateMissingTaskButton"]
  end
  subgraph WEB["wai-web (REST · br.gov.pr.secid.workai.web)"]
    direction TB
    C1["MirrorController"]
    C2["ComplianceChecklistController"]
  end
  subgraph APP["wai-application"]
    direction TB
    S1["ComplianceService"]
    S2["TaskService (RF20)"]
    S3["DecisionTraceService (RF29)"]
    S4["AccessPolicy"]
    S5["AiEngine"]
    PT1["RuleEnginePort"]
    PT2["AiProviderPort"]
  end
  subgraph DOM["wai-domain"]
    direction TB
    E1["ComplianceChecklist · ComplianceItem · ComplianceResult"]
    E2["ProjectScheme · ProjectTask · TaskItem.checklistItemId"]
    E3["AnalyticalSummary · DecisionTraceNode · AiInferenceLog · AuditLog"]
  end
  subgraph INFRA["wai-infrastructure"]
    direction TB
    I1["persistence-mysql: ComplianceJpaRepository · ProjectScheme/Task repositories"]
    I2["persistence-cassandra: CassandraTraceMirror"]
    I3["ai-providers: LocalComplianceEngine · ClaudeAdapter · GeminiAdapter"]
    I4["platform: DomainEventOutbox · AuditLog"]
  end
  subgraph EXT["Serviços externos"]
    X1(["Claude / Gemini"])
  end
  P1 --> C1
  P2 --> C2
  P3 -.-> C1
  UI1 -.-> P1
  C1 --> S1
  C2 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> S5
  S1 -.-> PT1
  S5 -.-> PT2
  S1 --> E1
  S1 --> E2
  S3 --> E3
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
| RF32.CA01 | Classes `ComplianceChecklist` (processTag, legalBasis, departmentId null = empresa), `ComplianceItem` (requirement, expectedPhase, expectedCategory, expectedType, mustPrecedeItemId), `ComplianceService.createChecklist/upsertItem`, `AccessPolicy.requireIssuer`; atividades `U1 → S1 → S2 → S3` (403 ACESSO_NEGADO, 422 VALIDACAO); sequência bloco «CA01»; componentes `app/companies/[slug]/checklists`, `ComplianceChecklistController` |
| RF32.CA02 | Classes `ComplianceService.evaluate`, `RuleEnginePort`, `AiEngine.matchItems`, `ComplianceResult.itemsJson` (ATENDIDO com satisfiedByProjectTaskId, RECOMENDADO_AUSENTE, OBRIGATORIO_AUSENTE, FORA_DE_ORDEM); atividades `U2 → S4 → S5 → S6 → A1/A2 → S7 → W1`; sequência bloco «CA02, CA05 e CA06»; transições de `NaoAvaliado` no estado `Item`; componentes `ChecklistItemRow`, `LocalComplianceEngine` |
| RF32.CA03 | Classes `ComplianceService.createMissingTask`, `TaskItem.checklistItemId`, `TaskService.create`, `ProjectTask.phase = expectedPhase`; atividades `U3 → S9 → S10 → S6` (403 para revisor); sequência bloco «CA03»; transições `*_AUSENTE → ATENDIDO`; componente `CreateMissingTaskButton` |
| RF32.CA04 | Classes `ProjectScheme.conformityPercent/hasBlockingPending`, `ComplianceResult.percent/blockingCount/overrideByUserId/overrideReason`, `ComplianceService.gatePhaseChange`, `AuditLog`; atividades `S8 → W2`, `U4 → S11 → W3 → S12 → U5 → S13` (409 CONFORMIDADE_PENDENTE como aviso); sequência bloco «CA04»; estado `Gate` (`ComPendencia → AprovacaoComJustificativa`); componentes `ConformitySeal`, `OverrideDialog` |
| RF32.CA05 | Classes `AnalyticalSummary.complianceResultId`, `DecisionTraceNode nodeType CONFORMIDADE`, `DecisionTraceService.appendNode`; atividade `S7 → S15 → D4`; sequência bloco «CA02, CA05 e CA06» (evento ConformityEvaluated → analytical_summaries, decision_trace_nodes, trace_by_entity); nota do estado `Gate`; componentes `DecisionTraceService (RF29)`, `CassandraTraceMirror` |
| RF32.CA06 | Classe `AccessPolicy.canEditProject`; atividades `U6 → S4 → ... → S8 → W4` (modo leitura) e `S9 → E4`; sequência bloco «CA02, CA05 e CA06» (resposta em modo leitura) e bloco «CA03» alt 403 para revisor; nota do estado `Item`; componente `MirrorController` |

> Dúvidas para `docs/DECISOES.md`: `ItemStatus` e `Requirement` não são enums nomeados na TAXONOMIA (valores inline); `RuleEnginePort` e `409 CONFORMIDADE_PENDENTE` são propostas (o card pede "aviso, não impedimento" — alternativa: 200 com flag `requiresOverride`); a tarefa faltante recebe `sourceProjectId` mas não há `SourceKind` específico para "criada pelo Espelho".
