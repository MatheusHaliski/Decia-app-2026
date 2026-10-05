# RF24 — Visualizar a aba metas & objetivos de minha equipe com insights analíticos gerados por IA
**HU:** HU24 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** RF13 DNA de Estilo (6 células) · **Aba/rota:** Plano Anual (`/plans`, `/plans/new`, `/plans/[id]`, `/plans/compare?a=&b=`) + visão da equipe em `/departments/[slug]` (sub-aba Plano Anual, RF28) e `/insights` › Equipe (RF43)
**Critérios de aceite cobertos:** RF24.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 (corpo do card) — regra: o **título do card** define o RF; o corpo contém os CAs do Plano Anual (RF24.CA01–07). O título acrescenta "insights analíticos gerados por IA": cobertos pelo CA03 (risco agregado da IA) e pelo CA07 (IA do DECIA cita o eixo e sinaliza projetos sem eixo), com apoio dos insights de equipe do RF43 §4 (citados, não reescritos aqui).

O **Plano Anual** (`AnnualPlan`, = DNA de Estilo) tem 6 eixos (`PlanAxis`) com meta, indicador e cor; projetos entram nos eixos por `PlanAxisProject` (1 eixo por plano). O plano da EMPRESA é o oficial; CHEFE e EMPREGADO **derivam** (`derivedFromPlanId`). A IA só **interpreta números calculados pelo sistema** (D-12): `aggregatedRisk` vem de `ComplianceResult`/`ProjectScenario` (RF31/RF32) e os insights da aba (`Insight` com `scope EQUIPE`) citam `MetricSnapshot`.

| Painel da aba | Entidades | Quem vê | CAs |
|---|---|---|---|
| Grade de 6 eixos | `AnnualPlan`, `PlanAxis`, `PlanAxisProject`, `ProjectScheme.planAxisId` | equipe (visibilidade do plano) | CA01–CA04 |
| Comparar exercícios | dois `AnnualPlan` do mesmo escopo, enum `CompareBucket` | equipe | CA05 |
| Social e chancela | `Reaction`, `Comment`, `SavedItem`, `Share`, `SealBond` tier PLANO | todos | CA06 |
| Eixo citado pelo DECIA · projetos sem eixo | `DeciaSession.planAxisId`, `AnalyticalSummary.recommendationsJson[].planAxisId`, `Insight PROJETO_SEM_EIXO` | todos | CA07 |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_planning {
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
    +creationMode: CreationMode
    +aiExplanationJson: JSON
    +sealIdsJson: JSON
    +publishedAt: Instant
    .. +5 campos ..
  }
  class PlanAxis {
    <<entity>>
    +id: UUID
    +planId: UUID
    +position: int
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
  class CompareBucket {
    <<enum>>
    NOVO
    CONCLUIDO
    REPROGRAMADO
    MANTIDO
  }
}

namespace ws_domain_projects {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +exerciseYear: int
    +planAxisId: UUID
    +nextMilestoneAt: LocalDate
    +conformityPercent: BigDecimal
    +hasBlockingPending: boolean
    .. +30 campos ..
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
  }
}

namespace ws_domain_decia_ia {
  class DeciaSession {
    <<entity>>
    +id: UUID
    +linkedProjectId: UUID
    +planAxisId: UUID
  }
  class AnalyticalSummary {
    <<entity>>
    +sessionId: UUID
    +recommendationsJson: JSON
  }
  class Insight {
    <<entity>>
    +scope: InsightScope
    +scopeId: UUID
    +kind: String
    +metricRefsJson: JSON
    +actionsJson: JSON
    +aiInferenceId: UUID
  }
  class AiInferenceLog {
    <<entity>>
    +capability: AiCapability
    +provider: AiProvider
    +result: InferenceResult
    +fallbackUsed: boolean
  }
}

namespace ws_domain_social_seals {
  class Reaction {
    <<entity>>
    +targetType: TargetType
    +targetId: UUID
    +reactionType: ReactionType
  }
  class SealBond {
    <<entity>>
    +targetType: String
    +targetId: UUID
    +basis: SealBondBasis
    +status: SealBondStatus
  }
}

namespace ws_application {
  class PlanService {
    <<service>>
    +create(actor, PlanForm) AnnualPlan
    +publish(actor, planId) AnnualPlan
    +linkProject(actor, planId, axisId, projectId) PlanAxisProject
    +unlinkProject(actor, planId, projectId)
    +derive(actor, officialPlanId, scope) AnnualPlan
    +compare(actor, planA, planB) CompareResult
    +projectsWithoutAxis(departmentId, year) List~ProjectScheme~
  }
  class AxisAggregationService {
    <<service>>
    +recompute(axisId) PlanAxis
    +aggregateRisk(axisId) RiskLevel
  }
  class InsightService {
    <<service>>
    +equipe(viewer, departmentId) List~Insight~
  }
  class SocialService {
    <<service>>
    +react(actor, PLAN, planId, type)
  }
  class SealService {
    <<service>>
    +suggest(targetType, targetId) List~SealBond~
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
    +requireRole(actor, role)
    +requireSameCompany(actor, companyId)
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
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class PlanController {
    <<controller>>
    +POST_api_plans(PlanForm)
    +GET_api_plans_id()
    +PATCH_api_plans_id(PlanForm)
    +POST_api_plans_id_publish()
    +POST_api_plans_id_axes_axisId_projects(projectId)
    +DELETE_api_plans_id_projects_projectId()
    +POST_api_plans_id_derive(scope)
    +GET_api_plans_compare(a, b)
  }
}

namespace ws_infrastructure {
  class RedisCacheAdapter {
    <<adapter>>
  }
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
}

AnnualPlan "1" *-- "6" PlanAxis : eixos
PlanAxis "1" o-- "0..*" PlanAxisProject : vincula
PlanAxisProject "0..*" --> "1" ProjectScheme : projeto
AnnualPlan "0..*" --> "0..1" AnnualPlan : derivedFromPlanId
ProjectScheme "0..*" --> "0..1" PlanAxis : planAxisId
PlanAxis ..> ComplianceResult : risco agregado
PlanAxis ..> ProjectScenario : risco agregado
DeciaSession "0..*" --> "0..1" PlanAxis : cita eixo
AnalyticalSummary ..> PlanAxis : recomendacao cita eixo
Insight ..> PlanAxis : PROJETO_SEM_EIXO
Reaction ..> AnnualPlan : targetType PLAN
SealBond ..> AnnualPlan : tier PLANO
PlanController --> PlanService
PlanService --> AxisAggregationService
PlanService --> Guard
PlanService --> CachePort
PlanService --> SearchIndexPort
PlanService --> DomainEvents
AxisAggregationService --> AiEngine : redige explicacao do risco
AiEngine ..> AiInferenceLog
InsightService --> AiEngine
RedisCacheAdapter ..|> CachePort
OpenSearchIndexAdapter ..|> SearchIndexPort
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPRESA · CHEFE · EMPREGADO)"]
    A0([Abre /plans]) --> A1{"O que quer fazer?"}
    A1 -->|criar| A2["Preenche exercício, título e 6 eixos (meta, indicador, cor)"]
    A1 -->|arrastar projeto| A3["Arrasta projeto para um eixo"]
    A1 -->|derivar| A4["Clica Derivar plano oficial"]
    A1 -->|comparar| A5["Escolhe exercícios A e B"]
    A1 -->|interagir| A6["Curte, comenta, salva ou pede chancela do plano"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/plans)"]
    F1["PlanForm valida 6 eixos no cliente (erro por campo i18n)"]
    F2["POST /api/plans ou PATCH /api/plans/{id}"]
    F3["POST /api/plans/{id}/axes/{axisId}/projects"]
    F4["POST /api/plans/{id}/derive"]
    F5["GET /api/plans/compare?a=&b="]
    F6["Ações sociais do RF26 com targetType PLAN"]
    F7["Grade 6 células: nº projetos, % concluídos, prazo mais próximo, risco agregado ✦"]
  end

  subgraph WEB["ws-web · PlanController"]
    W1["JWT + CorrelationIdFilter + rate limit por rota"]
    W2["GlobalExceptionHandler → {code, message, details, correlationId}"]
  end

  subgraph APP["ws-application · PlanService"]
    P1{"6 eixos, nomes únicos, cor válida?"}
    P1 -->|não| E1["422 VALIDACAO details.axes"]
    P2["Guard.requireOwner ou requireRole EMPRESA/CHEFE por scope"]
    P2 -->|falha| E2["403 ACESSO_NEGADO"]
    P3{"Projeto já está em outro eixo deste plano?"}
    P3 -->|sim| E3["409 PROJETO_JA_NO_PLANO"]
    P4{"Visibilidade do projeto compatível com o plano?"}
    P4 -->|não| E4["403 ACESSO_NEGADO"]
    P5["Grava PlanAxisProject + ProjectScheme.planAxisId"]
    P6["Copia 6 eixos, derivedFromPlanId = oficial, scope DEPARTAMENTO/PESSOAL"]
    P7["CompareService classifica projetos em NOVO · CONCLUIDO · REPROGRAMADO · MANTIDO"]
    P8["DomainEvents.publish(PlanProjectLinked) AFTER_COMMIT"]
  end

  subgraph IA["AiEngine (capability INSIGHT)"]
    I1["Lê ComplianceResult e ProjectScenario dos projetos do eixo (números do sistema)"]
    I2["aggregatedRisk = max ponderado · redige explicação ✦"]
    I3{"Projetos do departamento sem eixo?"}
    I3 -->|sim| I4["Insight PROJETO_SEM_EIXO (scope EQUIPE)"]
    I5["AiInferenceLog (provider, fallbackUsed, correlationId)"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL annual_plans · plan_axes · plan_axis_projects")]
    D2[("Redis cache agregados por eixo · flag redis.enabled")]
    D3[("OpenSearch ws-plans · flag opensearch.enabled")]
  end

  A2 --> F1 --> F2 --> W1 --> P1 -->|sim| P2 --> D1
  A3 --> F3 --> W1 --> P2 --> P3 -->|não| P4 -->|sim| P5 --> D1 --> P8
  A4 --> F4 --> W1 --> P2 --> P6 --> D1
  A5 --> F5 --> W1 --> P7 --> F7
  A6 --> F6 --> W1
  P8 --> I1 --> I2 --> I5 --> D2 --> F7
  P8 --> D3
  P8 --> I3
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
  participant R as Redis
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: cria plano 2026 com 6 eixos
  FE->>C: POST /api/plans (PlanForm)
  C->>S: PlanService.create(actor, form)
  S->>S: Guard.requireRole(actor, EMPRESA ou CHEFE) para scope EMPRESA/DEPARTAMENTO
  alt menos ou mais de 6 eixos
    S-->>C: 422 VALIDACAO details.axes
    C-->>FE: erro por campo i18n
  else formulário válido
    S->>DB: insert annual_plans + 6 plan_axes
    S->>EV: PlanCreated
    S-->>C: 201 AnnualPlan RASCUNHO
    C-->>FE: plano criado
  end

  U->>FE: arrasta projeto para o eixo Mobilidade
  FE->>C: POST /api/plans/{id}/axes/{axisId}/projects {projectId}
  C->>S: PlanService.linkProject(actor, planId, axisId, projectId)
  S->>DB: select plan_axis_projects where planId and projectId
  alt projeto já em outro eixo do plano
    S-->>C: 409 PROJETO_JA_NO_PLANO
  else livre
    S->>DB: insert plan_axis_projects + update project_schemes.plan_axis_id
    S->>EV: PlanProjectLinked
    S-->>C: 201 PlanAxisProject
  end
  EV->>S: AxisAggregationService.recompute(axisId)
  S->>DB: count projetos, % CONCLUIDO, min nextMilestoneAt, compliance_results, project_scenarios
  S->>AI: run(INSIGHT, números do eixo, mode ECONOMIA)
  alt provedor externo indisponível
    AI-->>S: LocalEngine redige explicação simplificada (fallbackUsed)
  else ok
    AI-->>S: aggregatedRisk + explicação ✦
  end
  AI->>DB: insert ai_inference_log
  S->>DB: update plan_axes (projectsCount, completedPct, nearestDueAt, aggregatedRisk)
  S->>R: evict agregados do plano (se redis.enabled)
  EV->>OS: index ws-plans (se opensearch.enabled, falha não bloqueia)
  FE->>C: GET /api/plans/{id}
  C->>S: PlanService.get(actor, id)
  S->>R: agregados em cache
  S-->>FE: plano com 6 células e eixo citado por sessões DECIA
```

## 4. Máquina de estados

Entidade central: `AnnualPlan.status` (`PlanStatus`). O vínculo projeto-eixo (`PlanAxisProject`) não tem estado próprio: existe ou não.

```mermaid
stateDiagram-v2
  [*] --> RASCUNHO: POST /api/plans (CA01)
  RASCUNHO --> RASCUNHO: edita eixos · arrasta projetos (CA02)
  RASCUNHO --> PUBLICADO: POST /publish (EMPRESA publica o oficial · CHEFE/EMPREGADO publicam derivado, CA04)
  PUBLICADO --> PUBLICADO: arrasta projetos · interações sociais · chancela PLANO (CA06) · agregados recalculados AFTER_COMMIT (CA03)
  PUBLICADO --> ENCERRADO: fim do exercício ou encerramento manual
  ENCERRADO --> ENCERRADO: só leitura · base da comparação (CA05)
  ENCERRADO --> [*]
  note right of PUBLICADO
    Plano oficial (scope EMPRESA) é a origem dos derivados.
    Sessões DECIA e resumos citam o eixo (CA07).
  end note
  note right of RASCUNHO
    Derivar copia os 6 eixos de um PUBLICADO oficial
    e nasce RASCUNHO com derivedFromPlanId.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/plans · /plans/new · /plans/[id] · /plans/compare"]
    R2["components: PlanGrid (6 células) · AxisCard · DragProjectToAxis · CompareTable · Spark ✦ · Counters · Seal"]
    BFF["app/bff (cookies httpOnly, X-Correlation-Id)"]
    R1 --> R2 --> BFF
  end

  subgraph WEB["ws-web"]
    PC["PlanController (@Operation RF24.CA01-CA07)"]
    SEC["SecurityConfig · JwtConfig · CorrelationIdFilter · GlobalExceptionHandler (existem no main)"]
  end

  subgraph APPL["ws-application"]
    PS["planning/PlanService"]
    AG["planning/AxisAggregationService (determinístico, D-12)"]
    CMP["planning/CompareService (CompareBucket)"]
    INS["ai/InsightService"]
    AIE["ai/AiEngine (Claude → Gemini → LocalEngine)"]
    GD["security/Guard (existe em sec-b3: requireRole, ownerOrAdmin)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    PORTS["ports: CachePort · SearchIndexPort · AiProviderPort"]
  end

  subgraph DOM["ws-domain"]
    ENT["AnnualPlan · PlanAxis · PlanAxisProject · enums PlanScope/PlanStatus/RiskLevel/CompareBucket (planejado)"]
  end

  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql (Flyway V__rf24_annual_plans)"]
    RD["cache-redis (flag redis.enabled)"]
    OSA["search-opensearch ws-plans (flag opensearch.enabled)"]
    AIP["ai-providers: ai-claude · ai-gemini · ai-local (flags ai.provider.*, ai.local.only)"]
  end

  BFF -->|REST JSON JWT| PC --> PS
  PC --> SEC
  PS --> AG --> AIE
  PS --> CMP
  PS --> GD
  PS --> DE --> INS --> AIE
  PS --> PORTS
  PS --> ENT
  PORTS --> RD
  PORTS --> OSA
  PORTS --> AIP
  ENT --> MY
  MY --> MYSQL[("MySQL 8")]
  RD --> REDIS[("Redis")]
  OSA --> OPENS[("OpenSearch")]
  AIP --> CLAUDE["Claude / Gemini"]
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF24.CA01 | `AnnualPlan`, `PlanAxis` (6, position 1..6), `PlanService.create` | A2 → F1 → F2 → P1 (422 VALIDACAO) | 1–9 | `[*] → RASCUNHO` | `PlanController`, `PlanGrid`, `MY` |
| RF24.CA02 | `PlanAxisProject`, `ProjectScheme.planAxisId`, `PlanService.linkProject` | A3 → F3 → P2 → P3 (409 PROJETO_JA_NO_PLANO) → P4 → P5 | 10–17 | `RASCUNHO/PUBLICADO → self (arrasta)` | `DragProjectToAxis`, `PS` |
| RF24.CA03 | `PlanAxis.projectsCount/completedPct/nearestDueAt/aggregatedRisk`, `AxisAggregationService`, `ComplianceResult`, `ProjectScenario` | P8 → I1 → I2 → I5 → D2 → F7 | 18–26 | `PUBLICADO → self (agregados AFTER_COMMIT)` | `AG`, `AIE`, `RD` |
| RF24.CA04 | `AnnualPlan.derivedFromPlanId`, `PlanScope`, `PlanService.derive` | A4 → F4 → P2 → P6 | — (POST /derive segue o fluxo 1–9) | nota de RASCUNHO · `RASCUNHO → PUBLICADO` | `PS`, `GD` |
| RF24.CA05 | `CompareBucket`, `PlanService.compare` | A5 → F5 → P7 → F7 | — (GET /compare) | `ENCERRADO → self (base da comparação)` | `CMP`, `CompareTable` |
| RF24.CA06 | `Reaction/Comment/SavedItem/Share` com `TargetType PLAN`, `SealBond` tier PLANO, `AnnualPlan.visibility/coverUrl` | A6 → F6 | — (RF26/RF39) | `PUBLICADO → self (interações · chancela)` | `Counters`, `Seal`, `SocialService`, `SealService` |
| RF24.CA07 | `DeciaSession.planAxisId`, `AnalyticalSummary.recommendationsJson[].planAxisId`, `Insight PROJETO_SEM_EIXO`, `PlanService.projectsWithoutAxis` | I3 → I4 | 27–30 (eixo citado no GET) | nota de PUBLICADO | `INS`, `AIE`, `AIP` |

Tela/aba: `/companies/[slug]` (esqueleto em `app/(shell)/companies/[slug]/page.tsx`) · `/plans` (esqueleto em `app/(shell)/plans/page.tsx`) · `/goals` (esqueleto em `app/(shell)/goals/page.tsx`)
