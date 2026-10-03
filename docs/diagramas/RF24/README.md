# RF24 — Criar o Plano Anual / Trilha Estratégica (6 eixos) e vincular projetos a cada eixo, com comparação entre exercícios
**HU:** HU24 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4; candidato à Sprint 5) · **Equivalente FAI:** RF13 DNA de Estilo (6 células) · **Aba/rota:** Plano Anual (`/plans`, `/plans/new`, `/plans/[id]`, comparação em `/plans/compare?a=&b=`)
**Critérios de aceite cobertos:** RF24.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07

O **Plano Anual** (`AnnualPlan`, = DNA de Estilo) é o conjunto de **6 eixos estratégicos** (`PlanAxis`, position 1..6, cada um com meta, indicador e cor) que recebem projetos (`PlanAxisProject`, único por plano+projeto — um projeto fica em **1 eixo por plano**). A EMPRESA publica o plano oficial (`scope = EMPRESA`); chefes e empregados **derivam** (duplicam) o plano para DEPARTAMENTO/PESSOAL mantendo `derivedFromPlanId`. Cada eixo agrega nº de projetos, % concluídos, prazo mais próximo e **risco agregado** (IA, a partir de `ComplianceResult` RF32 e `ProjectScenario` RF31). A comparação lado a lado de dois exercícios classifica projetos em **novos, concluídos e reprogramados**. O plano recebe interações sociais (RF26) e chancela tier PLANO (RF39); a IA do DECIA cita `planAxisId` nas recomendações (RF11/RF29) e sinaliza projetos sem eixo (`Insight`).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_planejamento {
  class AnnualPlan {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +scope: PlanScope
    +companyId: UUID
    +departmentId: UUID
    +exerciseYear: int
    +title: String
    +identityPhrase: String
    +derivedFromPlanId: UUID
    +status: PlanStatus
    +visibility: Visibility
    +coverUrl: String
    +backgroundJson: JSON
    +creationMode: CreationMode
    +aiExplanationJson: JSON
    +likesCount: long
    +commentsCount: long
    +savesCount: long
    +sealIdsJson: JSON
    +publishedAt: Instant
  }
  class PlanAxis {
    <<entity>>
    +id: UUID
    +planId: UUID
    +position: int 1 a 6
    +name: String
    +goal: String
    +indicator: String
    +targetValue: BigDecimal
    +color: String
    +icon: String
    +projectsCount: int
    +completedPct: BigDecimal
    +nearestDueAt: LocalDate
    +aggregatedRisk: RiskLevel
  }
  class PlanAxisProject {
    <<entity>>
    +id: UUID
    +axisId: UUID
    +projectId: UUID
    +linkedBy: UUID
    +linkedAt: Instant
  }
}

namespace ws_domain_projetos {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +companyId: UUID
    +departmentId: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +exerciseYear: int
    +planAxisId: UUID
    +nextMilestoneAt: LocalDate
    +conformityPercent: BigDecimal
    +hasBlockingPending: boolean
    +evmJson: JSON
  }
  class ComplianceResult {
    <<entity>>
    +projectId: UUID
    +percent: BigDecimal
    +blockingCount: int
  }
  class ProjectScenario {
    <<entity>>
    +projectId: UUID
    +riskByPhaseJson: JSON
    +status: String
  }
}

namespace ws_domain_decia_ia {
  class DeciaSession {
    <<entity>>
    +id: UUID
    +planAxisId: UUID eixo citado
    +linkedProjectId: UUID
  }
  class AnalyticalSummary {
    <<entity>>
    +sessionId: UUID
    +recommendationsJson: JSON planAxisId por recomendação
  }
  class Insight {
    <<entity>>
    +scope: String PROJETO
    +scopeId: UUID
    +kind: String PROJETO_SEM_EIXO
    +severity: String
  }
  class AiInferenceLog {
    <<entity>>
    +capability: AiCapability
    +result: String
  }
}

namespace ws_domain_social_chancela {
  class Reaction {
    <<entity>>
    +targetType: TargetType PLAN
    +targetId: UUID
    +reactionType: ReactionType
  }
  class Comment {
    <<entity>>
    +targetType: TargetType PLAN
    +targetId: UUID
  }
  class SavedItem {
    <<entity>>
    +targetType: TargetType PLAN
    +targetId: UUID
  }
  class Share {
    <<entity>>
    +targetType: TargetType PLAN
    +channel: ShareChannel
  }
  class SealBond {
    <<entity>>
    +targetType: String PLAN
    +targetId: UUID
    +basis: SealBondBasis PLANO_MATCH
    +status: SealBondStatus
  }
}

namespace ws_domain_enums {
  class PlanScope {
    <<enum>>
    EMPRESA
    DEPARTAMENTO
    PESSOAL
  }
  class PlanStatus {
    <<enum>>
    RASCUNHO
    PUBLICADO
    ENCERRADO
  }
  class RiskLevel {
    <<enum>>
    BAIXO
    MEDIO
    ALTO
  }
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
  class CompareBucket {
    <<enum>>
    NOVO
    CONCLUIDO
    REPROGRAMADO
    MANTIDO
  }
}

namespace ws_application {
  class PlanService {
    <<service>>
    +create(userId, PlanForm com 6 eixos) AnnualPlan
    +linkProject(userId, planId, axisId, projectId) PlanAxisProject
    +unlinkProject(userId, planId, projectId)
    +recomputeAxis(axisId) PlanAxis
    +derive(userId, officialPlanId, scope) AnnualPlan
    +compare(planA, planB) CompareResult por CompareBucket
    +publish(planId) AnnualPlan
    +projectsWithoutAxis(companyId, year) List~ProjectScheme~
    -validateSixAxes(form) 422 EIXOS_INVALIDOS
    -validateOnePerPlan(planId, projectId) 409 PROJETO_JA_NO_PLANO
  }
  class RiskAggregationService {
    <<service>>
    +aggregate(axisId) RiskLevel
  }
  class SocialService {
    <<service>>
    +react(userId, PLAN, planId, type)
    +comment(userId, PLAN, planId, text)
    +save(userId, PLAN, planId)
    +share(userId, PLAN, planId, channel)
  }
  class SealService {
    <<service>>
    +suggestForPlan(planId) List~SealBond~
  }
  class AiEngine {
    <<service>>
    +infer(capability, input, mode) AiResult
  }
  class CachePort {
    <<port>>
    +getAxisAggregates(planId)
    +evict(planId)
  }
  class SearchIndexPort {
    <<port>>
    +indexPlan(AnnualPlan)
  }
  class MediaStoragePort {
    <<port>>
    +put(stream) MediaObject
  }
}

namespace ws_web {
  class PlanController {
    <<controller>>
    +POST_api_plans(PlanForm)
    +GET_api_plans_id()
    +POST_api_plans_id_axes_axisId_projects(projectId)
    +DELETE_api_plans_id_projects_projectId()
    +POST_api_plans_id_derive(scope)
    +GET_api_plans_compare(a, b)
    +POST_api_plans_id_publish()
    +GET_api_plans_id_projects_without_axis()
  }
}

namespace ws_infrastructure {
  class RedisCacheAdapter {
    <<adapter>>
  }
  class ClaudeGeminiAdapter {
    <<adapter>>
  }
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
  class S3StorageAdapter {
    <<adapter>>
  }
}

AnnualPlan "1" --> "6" PlanAxis : exatamente 6 eixos
AnnualPlan "*" --> "0..1" AnnualPlan : derivedFromPlanId plano oficial
PlanAxis "1" --> "*" PlanAxisProject
PlanAxisProject "*" --> "1" ProjectScheme : projectId único por plano
ProjectScheme "*" --> "0..1" PlanAxis : planAxisId
ProjectScheme "1" --> "*" ComplianceResult : conformidade RF32
ProjectScheme "1" --> "*" ProjectScenario : cenários RF31
DeciaSession "*" --> "0..1" PlanAxis : planAxisId
AnalyticalSummary ..> PlanAxis : recommendationsJson cita eixo
Insight ..> ProjectScheme : PROJETO_SEM_EIXO
Reaction ..> AnnualPlan : targetType PLAN
Comment ..> AnnualPlan : targetType PLAN
SavedItem ..> AnnualPlan : targetType PLAN
Share ..> AnnualPlan : targetType PLAN
SealBond ..> AnnualPlan : tier PLANO
AnnualPlan --> PlanScope
AnnualPlan --> PlanStatus
AnnualPlan --> Visibility
PlanAxis --> RiskLevel : aggregatedRisk

PlanController ..> PlanService
PlanController ..> SocialService
PlanService ..> RiskAggregationService
PlanService ..> SealService
PlanService ..> CachePort
PlanService ..> SearchIndexPort
PlanService ..> MediaStoragePort : capa
RiskAggregationService ..> AiEngine : risco agregado a partir de RF31 e RF32
RedisCacheAdapter ..|> CachePort
OpenSearchIndexAdapter ..|> SearchIndexPort
S3StorageAdapter ..|> MediaStoragePort
ClaudeGeminiAdapter ..> AiEngine

note for AnnualPlan "tabela annual_plans · exercício, título, 6 eixos (CA01) · plano EMPRESA é o oficial, derivação mantém derivedFromPlanId (CA04) · visibilidade e capa (CA06)"
note for PlanAxisProject "tabela plan_axis_projects · único planId + projectId via índice composto — 1 eixo por plano (CA02)"
note for PlanAxis "projectsCount, completedPct, nearestDueAt recalculados a cada vínculo · aggregatedRisk pela IA (CA03)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["EMPRESA, CHEFE ou EMPREGADO abre /plans/new"]
    U2["Informa exercício, título e nomeia 6 eixos com meta, indicador e cor"]
    U3["Arrasta projeto meu, do departamento ou da empresa para um eixo"]
    U4["Clica Derivar para o meu departamento / trilha pessoal"]
    U5["Abre comparação 2025 x 2026"]
    U6["Curte, comenta, salva, compartilha o plano"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Grade 6 células com cor, meta e indicador"]
    W2["Por eixo: nº de projetos, % concluídos, prazo mais próximo, risco agregado"]
    W3["Toast: projeto já está em um eixo deste plano"]
    W4["Colunas lado a lado: novos, concluídos, reprogramados"]
    W5["Capa, visibilidade e barra de interações RF26 + lacre de chancela"]
  end

  subgraph LA["ws-application"]
    A1["PlanService.create → validateSixAxes"]
    A2{"Exatamente 6 eixos nomeados?"}
    A3["422 EIXOS_INVALIDOS"]
    A4["Persiste AnnualPlan RASCUNHO + 6 PlanAxis position 1..6"]
    A5["PlanService.linkProject → validateOnePerPlan"]
    A6{"Projeto já vinculado a outro eixo deste plano?"}
    A7["409 PROJETO_JA_NO_PLANO"]
    A8{"Projeto visível para mim? meu, do departamento ou da empresa"}
    A9["403 ACESSO_NEGADO"]
    A10["INSERT PlanAxisProject + UPDATE ProjectScheme.planAxisId"]
    A11["recomputeAxis: projectsCount, completedPct, nearestDueAt; evict cache"]
    A12["RiskAggregationService.aggregate"]
    A13["PlanService.derive: duplica plano e eixos, scope DEPARTAMENTO ou PESSOAL, derivedFromPlanId = oficial"]
    A14{"Plano de origem é EMPRESA publicado?"}
    A15["422 DERIVACAO_INVALIDA"]
    A16["PlanService.compare: para cada projeto classifica NOVO, CONCLUIDO, REPROGRAMADO, MANTIDO"]
    A17["SocialService.* com targetType PLAN; SealService.suggestForPlan tier PLANO"]
    A18["PlanService.projectsWithoutAxis → Insight PROJETO_SEM_EIXO"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["Risco agregado por eixo a partir de ComplianceResult RF32 e ProjectScenario RF31: BAIXO, MEDIO, ALTO"]
    I2["RESUMO_ANALITICO do DECIA cita o planAxisId do projeto ao recomendar"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: annual_plans, plan_axes")]
    P2[("MySQL: plan_axis_projects, project_schemes.planAxisId")]
    P3[("Redis: agregados por eixo")]
    P4[("MySQL: ai_inference_log, insights")]
    P5[("MySQL: reactions, comments, saved_items, shares, seal_bonds")]
  end

  U1 --> U2 --> A1 --> A2
  A2 -->|"não"| A3
  A2 -->|"sim"| A4 --> P1 --> W1
  W1 --> U3 --> A5 --> A6
  A6 -->|"sim"| A7 --> W3
  A6 -->|"não"| A8
  A8 -->|"não"| A9
  A8 -->|"sim"| A10 --> P2 --> A11 --> P3
  A11 --> A12 --> I1 --> P4
  I1 --> W2
  W1 --> U4 --> A14
  A14 -->|"não"| A15
  A14 -->|"sim"| A13 --> P1
  W1 --> U5 --> A16 --> W4
  W1 --> U6 --> A17 --> P5 --> W5
  A18 --> P4
  A18 -.-> I2

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  class A3,A7,A9,A15 err
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
  participant R as Redis
  participant OS as OpenSearch
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: /plans/new — exercício 2026, título, 6 eixos (Mobilidade, Habitação, Saneamento, Regularização fundiária, Equipamentos públicos, Gestão interna)
  NX->>C: POST /api/plans {exerciseYear, title, axes[6]}
  C->>S: PlanService.create(userId, form)
  S->>S: validateSixAxes
  alt menos ou mais de 6 eixos, ou eixo sem nome (CA01)
    S-->>C: 422 EIXOS_INVALIDOS {details: [{field: axes, code: EXATAMENTE_6}], correlationId}
    C-->>NX: 422
  else válido
    S->>DB: INSERT annual_plans (scope por profileType, status RASCUNHO, visibility)
    S->>DB: INSERT plan_axes x6 (position 1..6, name, goal, indicator, color)
    S-->>C: 201 AnnualPlan
    C-->>NX: 201
    NX-->>U: grade de 6 células
  end

  U->>NX: arrasta projeto P1 para o eixo Saneamento (CA02)
  NX->>C: POST /api/plans/{planId}/axes/{axisId}/projects {projectId P1}
  C->>S: PlanService.linkProject(userId, planId, axisId, P1)
  S->>DB: SELECT plan_axis_projects JOIN plan_axes WHERE planId AND projectId = P1
  alt P1 já em outro eixo do mesmo plano
    S-->>C: 409 PROJETO_JA_NO_PLANO {currentAxisId}
    C-->>NX: 409
    NX-->>U: "já está em Habitação — mover?"
  else livre
    S->>DB: INSERT plan_axis_projects (axisId, P1, linkedBy, linkedAt)
    S->>DB: UPDATE project_schemes SET planAxisId WHERE id = P1
    S->>S: recomputeAxis — projectsCount, completedPct, nearestDueAt (CA03)
    S->>DB: UPDATE plan_axes SET projectsCount, completedPct, nearestDueAt
    S->>R: DEL plan:{planId}:aggregates
    S->>DE: publish ProjectLinkedToAxis
    S-->>C: 201 PlanAxisProject
    C-->>NX: 201
  end
  DE->>AI: infer(SIMULAR_CENARIO ou CONFORMIDADE agregada, {complianceResults, scenarios dos projetos do eixo})
  AI-->>DE: aggregatedRisk ALTO + justificativa, ai_inference_log
  DE->>DB: UPDATE plan_axes SET aggregatedRisk

  U->>NX: abre /plans/{planId}
  NX->>C: GET /api/plans/{planId}
  C->>S: PlanService.get
  S->>R: GET plan:{planId}:aggregates
  S->>DB: annual_plans + plan_axes + projetos por eixo
  S-->>C: 200 plano com 6 eixos, nº de projetos, % concluídos, prazo mais próximo, risco agregado, capa, contadores sociais, chancelas (CA03, CA06)
  C-->>NX: 200

  U->>NX: CHEFE clica Derivar para o departamento (CA04)
  NX->>C: POST /api/plans/{officialId}/derive {scope: DEPARTAMENTO}
  C->>S: PlanService.derive(userId, officialId, DEPARTAMENTO)
  alt plano de origem não é EMPRESA publicado
    S-->>C: 422 DERIVACAO_INVALIDA
    C-->>NX: 422
  else oficial
    S->>DB: INSERT annual_plans (scope DEPARTAMENTO, derivedFromPlanId officialId, status RASCUNHO)
    S->>DB: INSERT plan_axes x6 copiados
    S-->>C: 201 plano derivado com vínculo ao oficial
    C-->>NX: 201
  end

  U->>NX: compara 2025 x 2026 (CA05)
  NX->>C: GET /api/plans/compare?a={plan2025}&b={plan2026}
  C->>S: PlanService.compare(a, b)
  S->>DB: projetos dos dois planos por eixo + status + exerciseYear
  S->>S: classifica NOVO (só em b), CONCLUIDO (status CONCLUIDO em a), REPROGRAMADO (em a e b com exerciseYear alterado), MANTIDO
  S-->>C: 200 CompareResult {porEixo: [{axis, novos, concluidos, reprogramados}]}
  C-->>NX: 200
  NX-->>U: colunas lado a lado

  U->>NX: publica o plano e reage BEM_FUNDAMENTADO (CA06)
  NX->>C: POST /api/plans/{planId}/publish
  C->>S: PlanService.publish
  S->>DB: UPDATE annual_plans SET status PUBLICADO, publishedAt
  S->>OS: indexPlan
  NX->>C: POST /api/interactions/PLAN/{planId}/reactions {BEM_FUNDAMENTADO}
  C->>S: SocialService.react(userId, PLAN, planId)
  S->>DB: INSERT reactions (targetType PLAN)

  Note over AI,DB: RF11/RF29 (CA07): ao gerar RESUMO_ANALITICO de uma sessão com linkedProjectId, o AiEngine inclui planAxisId em cada recomendação e, se o projeto não tem eixo, grava Insight PROJETO_SEM_EIXO.
```

## 4. Máquina de estados

Entidade central: **`AnnualPlan.status`** (RASCUNHO · PUBLICADO · ENCERRADO). A derivação (CA04) nasce de um plano EMPRESA **PUBLICADO** e cria um novo plano RASCUNHO com `derivedFromPlanId`.

```mermaid
stateDiagram-v2
  [*] --> RASCUNHO : POST plans com exatamente 6 eixos
  RASCUNHO --> RASCUNHO : nomear eixos, vincular e desvincular projetos, trocar capa
  RASCUNHO --> PUBLICADO : publicar, indexa para Buscar e Mural
  PUBLICADO --> PUBLICADO : vincular projetos, recomputar agregados e risco, interações RF26, chancela tier PLANO
  PUBLICADO --> DERIVADO : derivar para DEPARTAMENTO ou PESSOAL, só se scope EMPRESA
  state "Novo plano RASCUNHO com derivedFromPlanId" as DERIVADO
  DERIVADO --> RASCUNHO : segue o ciclo próprio mantendo vínculo com o oficial
  PUBLICADO --> ENCERRADO : fim do exercício ou encerramento manual
  ENCERRADO --> ENCERRADO : somente leitura, usado em comparação de exercícios
  ENCERRADO --> [*]
  note right of RASCUNHO
    Exatamente 6 PlanAxis position 1..6 (CA01).
    Vincular projeto já presente no plano: 409 PROJETO_JA_NO_PLANO (CA02).
  end note
  note right of PUBLICADO
    Por eixo: projectsCount, completedPct, nearestDueAt,
    aggregatedRisk da IA (CA03). Plano EMPRESA publicado é o oficial (CA04).
  end note
  note left of ENCERRADO
    Comparação 2025 x 2026: NOVO, CONCLUIDO, REPROGRAMADO (CA05).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/plans, app/plans/new, app/plans/[id], app/plans/compare"]
    F2["components/ui: AxisGrid 6 células, AxisCard com meta/indicador/cor/risco, ProjectDragDrop, DeriveButton, CompareColumns, PlanCover, InteractionBar RF26, SealWax"]
  end

  subgraph WEB["ws-web"]
    C1["PlanController — /api/plans, /axes/{id}/projects, /derive, /compare, /publish, /projects-without-axis"]
    C2["InteractionController RF26 — /api/interactions/PLAN/{id}/*"]
  end

  subgraph APP["ws-application"]
    S1["PlanService"]
    S2["RiskAggregationService"]
    S3["SocialService RF26"]
    S4["SealService RF39"]
    S5["AiEngine"]
    P1["CachePort"]
    P2["SearchIndexPort"]
    P3["MediaStoragePort"]
  end

  subgraph DOM["ws-domain"]
    D1["AnnualPlan · PlanAxis · PlanAxisProject"]
    D2["ProjectScheme · ComplianceResult · ProjectScenario"]
    D3["DeciaSession · AnalyticalSummary · Insight · AiInferenceLog"]
    D4["Reaction · Comment · SavedItem · Share · SealBond"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: annual_plans, plan_axes, plan_axis_projects, project_schemes, compliance_results, project_scenarios, insights, reactions, comments, saved_items, shares, seal_bonds")]
    I2[("cache-redis: agregados por eixo")]
    I3[("search-opensearch: índice de planos para Buscar RF27")]
    I4[("storage-s3: capa do plano")]
    I5["ai-providers: ClaudeGeminiAdapter — risco agregado, RESUMO_ANALITICO cita eixo, INSIGHT"]
  end

  subgraph EXT["Serviços externos"]
    E1(("Claude / Gemini"))
  end

  F1 --- F2
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C2
  C1 --> S1
  C2 --> S3
  S1 --> S2
  S1 --> S4
  S1 --> P1
  S1 --> P2
  S1 --> P3
  S2 --> S5
  S4 --> S5
  S1 --> D1
  S1 --> D2
  S2 --> D2
  S3 --> D4
  S5 --> D3
  D1 --> I1
  D2 --> I1
  D3 --> I1
  D4 --> I1
  P1 --> I2
  P2 --> I3
  P3 --> I4
  S5 --> I5
  I5 -.-> E1
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF24.CA01 | `AnnualPlan` (exerciseYear, title), `PlanAxis` (position 1..6, name, goal, indicator, color), relação `AnnualPlan "1" --> "6" PlanAxis`, `PlanService.create/validateSixAxes` · Atividades `U2 → A1 → A2 → A3 422 EIXOS_INVALIDOS / A4 → P1 → W1` · Sequência `POST /api/plans` → `alt … 422 EIXOS_INVALIDOS` / `INSERT plan_axes x6` · Transição `[*] → RASCUNHO` + nota · Componentes `AxisGrid 6 células`, `AxisCard` |
| RF24.CA02 | `PlanAxisProject` (nota índice único planId + projectId), `ProjectScheme.planAxisId`, `PlanService.linkProject/validateOnePerPlan` · Atividades `U3 → A5 → A6 → A7 409 PROJETO_JA_NO_PLANO`, `A8 → A9 403`, `A10 → P2` · Sequência `POST /api/plans/{planId}/axes/{axisId}/projects` → `alt P1 já em outro eixo → 409` / `INSERT plan_axis_projects` + `UPDATE project_schemes SET planAxisId` · Nota de RASCUNHO · Componente `ProjectDragDrop` |
| RF24.CA03 | `PlanAxis.projectsCount/completedPct/nearestDueAt/aggregatedRisk`, enum `RiskLevel`, `PlanService.recomputeAxis`, `RiskAggregationService.aggregate`, `ComplianceResult`, `ProjectScenario`, `CachePort` · Atividades `A11 → P3`, `A12 → I1 → W2` · Sequência `recomputeAxis …`, `DE->>AI infer(… complianceResults, scenarios)` → `UPDATE plan_axes SET aggregatedRisk`, `GET /api/plans/{planId}` · Nota de PUBLICADO · Componentes `cache-redis`, `ai-providers` |
| RF24.CA04 | `AnnualPlan.derivedFromPlanId/scope`, enum `PlanScope`, `PlanService.derive` · Atividades `U4 → A14 → A15 422 / A13 → P1` · Sequência `POST /api/plans/{officialId}/derive` → `alt não é EMPRESA publicado → 422 DERIVACAO_INVALIDA` / `INSERT annual_plans (scope DEPARTAMENTO, derivedFromPlanId …)` · Transição `PUBLICADO → DERIVADO → RASCUNHO` · Componente `DeriveButton` |
| RF24.CA05 | Enum `CompareBucket` (NOVO, CONCLUIDO, REPROGRAMADO, MANTIDO), `PlanService.compare` · Atividades `U5 → A16 → W4` · Sequência `GET /api/plans/compare?a=&b=` → classificação → `CompareResult {porEixo …}` · Nota de ENCERRADO · Componentes `app/plans/compare`, `CompareColumns` |
| RF24.CA06 | Classes `Reaction/Comment/SavedItem/Share` (targetType PLAN), `SealBond` (tier PLANO, PLANO_MATCH), `AnnualPlan.visibility/coverUrl/likesCount…`, `SocialService`, `SealService.suggestForPlan`, `MediaStoragePort` · Atividades `U6 → A17 → P5 → W5` · Sequência `POST /api/plans/{planId}/publish` + `POST /api/interactions/PLAN/{planId}/reactions` · Transição `PUBLICADO → PUBLICADO : interações RF26, chancela tier PLANO` · Componentes `PlanCover`, `InteractionBar RF26`, `SealWax`, `InteractionController RF26`, `storage-s3` |
| RF24.CA07 | `DeciaSession.planAxisId`, `AnalyticalSummary.recommendationsJson (planAxisId)`, `Insight PROJETO_SEM_EIXO`, `PlanService.projectsWithoutAxis` · Atividades `A18 → P4`, `I2` · Sequência nota final "RF11/RF29 (CA07) … inclui planAxisId em cada recomendação … Insight PROJETO_SEM_EIXO" · Componentes `PlanController /projects-without-axis`, `ai-providers RESUMO_ANALITICO cita eixo` |
