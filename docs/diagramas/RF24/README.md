# RF24 — Visualizar a aba metas & objetivos de minha equipe com insights analíticos gerados por IA
**HU:** HU24 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4; candidato à Sprint 5) · **Equivalente FAI:** RF13 DNA de Estilo (6 células) · **Aba/rota:** Plano Anual (`/plans`, `/plans/new`, `/plans/[id]`, `/plans/compare?a=&b=`) + aba **Metas & Objetivos** da equipe (`/departments/[slug]/goals`, proposta) que reúne eixos do plano, metas coletivas (`/goals`, RF35) e Insights › Equipe (`/insights/equipe`, RF43)
**Critérios de aceite cobertos:** RF24.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 (corpo do card — Plano Anual) · RF35.CA01 · RF35.CA02 (metas coletivas, citados como estão) · RF43.CA14 · RF43.CA15 (insights de equipe, citados como estão) — regra: o **título do card** define o RF; o corpo contém os CAs RF24.CA01–07 do Plano Anual (= `_anterior/RF24`); o título acrescenta "da equipe" e "insights da IA", cobertos pelos CAs do RF35 e do RF43 §4

A aba **Metas & Objetivos** é a visão da **equipe** (departamento) sobre três fontes já modeladas: (1) o **Plano Anual** (`AnnualPlan` = DNA de Estilo, 6 `PlanAxis` com meta, indicador e cor, projetos ligados por `PlanAxisProject`, derivação do plano oficial da EMPRESA, comparação entre exercícios); (2) as **metas coletivas** (`CollectiveGoal`/`GoalParticipant`, RF35) com progresso calculado de `MetricSnapshot`; (3) os **insights de equipe** (`Insight` com `scope = EQUIPE`, RF43 §4) — carga e balanceamento, gargalos, tendência por eixo, recomendações acionáveis — redigidos pela `AiEngine` **somente sobre números** do `MetricCalculator`, com amostra mínima (`MetricDefinition.minSamples`) e benchmarks anonimizados. CHEFE e EMPRESA veem a aba completa; EMPREGADO vê o plano do departamento, as metas em que pode entrar e os insights **agregados** (nunca nominais, RF45.CA10).

| Painel da aba | Entidades | Quem vê | CAs |
|---|---|---|---|
| Eixos do plano (grade 6 células) | `AnnualPlan`, `PlanAxis`, `PlanAxisProject`, `ProjectScheme.planAxisId` | todos da equipe | RF24.CA01–CA04 |
| Comparar exercícios | `AnnualPlan` ENCERRADO × PUBLICADO, enum `CompareBucket` | todos da equipe | RF24.CA05 |
| Social e chancela do plano | `Reaction`, `Comment`, `SavedItem`, `Share`, `SealBond` tier PLANO | todos | RF24.CA06 |
| Metas coletivas | `CollectiveGoal`, `GoalParticipant`, `MetricSnapshot` | todos (criar: EMPRESA/CHEFE) | RF35.CA01, CA02 |
| Insights da equipe ✦ | `Insight` EQUIPE, `MetricDefinition`, `MetricSnapshot`, `AiInferenceLog` | CHEFE/EMPRESA completo, EMPREGADO agregado | RF43.CA14, CA15 |
| Eixo citado pelo DECIA | `DeciaSession.planAxisId`, `AnalyticalSummary.recommendationsJson`, `Insight PROJETO_SEM_EIXO` | todos | RF24.CA07 |

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
    +creationMode: CreationMode
    +aiExplanationJson: JSON
    +sealIdsJson: JSON
    +publishedAt: Instant
    .. +6 campos ..
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
    +departmentId: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +exerciseYear: int
    +planAxisId: UUID
    +nextMilestoneAt: LocalDate
    +conformityPercent: BigDecimal
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
  }
}

namespace ws_domain_gamificacao {
  class CollectiveGoal {
    <<entity>>
    +id: UUID
    +creatorId: UUID
    +companyId: UUID
    +departmentId: UUID
    +title: String
    +criterionJson: JSON metricCode operator target
    +periodFrom: LocalDate
    +periodTo: LocalDate
    +rewardPointsPerParticipant: int
    +progress: BigDecimal 0 a 1
    +status: GoalStatus
    +achievedAt: Instant
  }
  class GoalParticipant {
    <<entity>>
    +goalId: UUID
    +userId: UUID
    +joinedAt: Instant
    +contributionJson: JSON
  }
}

namespace ws_domain_ia {
  class Insight {
    <<entity>>
    +id: UUID
    +scope: InsightScope EQUIPE
    +scopeId: UUID departmentId
    +kind: String CARGA GARGALO TENDENCIA_EIXO PROJETO_SEM_EIXO
    +title: String
    +bodyMd: String
    +metricRefsJson: JSON metricCode value formula source proxy
    +actionsJson: JSON 1 clique
    +severity: String
    +aiInferenceId: UUID
    +dismissedAt: Instant
    +generatedAt: Instant
  }
  class MetricDefinition {
    <<entity>>
    +code: String
    +domain: MetricDomain EQUIPES PROJETOS
    +formula: String
    +proxyNote: String
    +minSamples: int
  }
  class MetricSnapshot {
    <<entity>>
    +metricCode: String
    +scope: MetricScope DEPARTAMENTO
    +scopeId: UUID
    +periodStart: LocalDate
    +periodEnd: LocalDate
    +value: BigDecimal
  }
  class AiInferenceLog {
    <<entity>>
    +capability: AiCapability INSIGHT
    +mode: AiMode
    +result: InferenceResult
    +fallbackUsed: boolean
  }
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
}

namespace ws_domain_identidade_social {
  class Department {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +name: String
    +headUserId: UUID
  }
  class User {
    <<entity>>
    +id: UUID
    +profileType: ProfileType
    +departmentId: UUID
  }
  class Reaction {
    <<entity>>
    +targetType: TargetType PLAN
    +targetId: UUID
    +reactionType: ReactionType
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
  class CompareBucket {
    <<enum>>
    NOVO
    CONCLUIDO
    REPROGRAMADO
    MANTIDO
  }
  class GoalStatus {
    <<enum>>
    ABERTA
    ATINGIDA
    EXPIRADA
  }
  class InsightScope {
    <<enum>>
    ACERVO
    PERFIL
    EQUIPE
    PROJETO
  }
}

namespace ws_application {
  class PlanService {
    <<service>>
    +create(userId, PlanForm com 6 eixos) AnnualPlan
    +linkProject(userId, planId, axisId, projectId) PlanAxisProject
    +recomputeAxis(axisId) PlanAxis
    +derive(userId, officialPlanId, scope) AnnualPlan
    +compare(planA, planB) CompareResult por CompareBucket
    +publish(planId) AnnualPlan
    +projectsWithoutAxis(departmentId, year) List~ProjectScheme~
    -validateSixAxes(form) 422 EIXOS_INVALIDOS
    -validateOnePerPlan(planId, projectId) 409 PROJETO_JA_NO_PLANO
  }
  class TeamGoalsService {
    <<service>>
    +loadTab(viewer, departmentId, year) TeamGoalsView
    +visibleInsights(viewer, departmentId) List~Insight~ agregado para EMPREGADO
  }
  class RiskAggregationService {
    <<service>>
    +aggregate(axisId) RiskLevel
  }
  class GoalService {
    <<service>>
    +create(issuerId, form) CollectiveGoal
    +join(userId, goalId) GoalParticipant
    +recomputeProgress(goalId) CollectiveGoal
  }
  class InsightService {
    <<service>>
    +equipe(departmentId, viewer) List~Insight~
    +applyAction(insightId, actionCode)
  }
  class MetricCalculator {
    <<service>>
    +compute(metricCode, scope, period) MetricSnapshot
  }
  class SocialService {
    <<service>>
    +react(userId, PLAN, planId, type)
  }
  class SealService {
    <<service>>
    +suggestForPlan(planId) List~SealBond~
  }
  class AiEngine {
    <<service>>
    +run(capability, input, accessClass, mode) AiResult
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
}

namespace ws_web {
  class PlanController {
    <<controller>>
    +POST_api_plans(PlanForm)
    +GET_api_plans_id()
    +POST_api_plans_id_axes_axisId_projects(projectId)
    +POST_api_plans_id_derive(scope)
    +GET_api_plans_compare(a, b)
    +POST_api_plans_id_publish()
  }
  class TeamGoalsController {
    <<controller>>
    +GET_api_departments_id_goals_tab(year)
  }
  class GoalController {
    <<controller>>
    +POST_api_goals(body)
    +POST_api_goals_id_join()
  }
  class InsightController {
    <<controller>>
    +GET_api_insights_equipe(dept)
    +POST_api_insights_id_action()
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
}

AnnualPlan "1" --> "6" PlanAxis : exatamente 6 eixos
AnnualPlan "*" --> "0..1" AnnualPlan : derivedFromPlanId plano oficial
AnnualPlan "*" --> "0..1" Department : departmentId
PlanAxis "1" --> "*" PlanAxisProject
PlanAxisProject "*" --> "1" ProjectScheme : projectId único por plano
ProjectScheme "*" --> "0..1" PlanAxis : planAxisId
ProjectScheme "1" --> "*" ComplianceResult : conformidade RF32
ProjectScheme "1" --> "*" ProjectScenario : cenários RF31
CollectiveGoal "1" --> "*" GoalParticipant
CollectiveGoal "*" --> "1" Department : departmentId
CollectiveGoal ..> MetricSnapshot : criterionJson metricCode
Insight "*" --> "1" Department : scopeId quando EQUIPE
Insight ..> MetricDefinition : metricRefsJson
Insight ..> AiInferenceLog : aiInferenceId
MetricSnapshot ..> MetricDefinition : metricCode
DeciaSession "*" --> "0..1" PlanAxis : planAxisId
AnalyticalSummary ..> PlanAxis : recommendationsJson cita eixo
Reaction ..> AnnualPlan : targetType PLAN
SealBond ..> AnnualPlan : tier PLANO
User "*" --> "0..1" Department : lotação
AnnualPlan --> PlanScope
AnnualPlan --> PlanStatus
PlanAxis --> RiskLevel : aggregatedRisk
CollectiveGoal --> GoalStatus
Insight --> InsightScope

TeamGoalsController ..> TeamGoalsService
TeamGoalsService ..> PlanService
TeamGoalsService ..> GoalService
TeamGoalsService ..> InsightService
PlanController ..> PlanService
GoalController ..> GoalService
InsightController ..> InsightService
PlanService ..> RiskAggregationService
PlanService ..> SealService
PlanService ..> SocialService
PlanService ..> CachePort
PlanService ..> SearchIndexPort
GoalService ..> MetricCalculator : progresso
InsightService ..> MetricCalculator : só números calculados
InsightService ..> AiEngine : INSIGHT scope EQUIPE
RiskAggregationService ..> AiEngine : risco agregado RF31 e RF32
RedisCacheAdapter ..|> CachePort
OpenSearchIndexAdapter ..|> SearchIndexPort
ClaudeGeminiAdapter ..> AiEngine

note for AnnualPlan "tabela annual_plans · exercício, título, 6 eixos (CA01) · plano EMPRESA é o oficial, derivação mantém derivedFromPlanId (CA04) · visibilidade e capa (CA06)"
note for PlanAxisProject "tabela plan_axis_projects · único planId + projectId — 1 eixo por plano (CA02)"
note for PlanAxis "projectsCount, completedPct, nearestDueAt recalculados a cada vínculo · aggregatedRisk pela IA (CA03)"
note for Insight "tabela insights · scope EQUIPE (RF43.CA14) · gerado só quando MetricDefinition.minSamples é atendido (RF43.CA15) · EMPREGADO recebe versão agregada e anonimizada"
note for TeamGoalsService "proposta: compõe a aba Metas & Objetivos a partir de PlanService, GoalService e InsightService — não possui tabela própria"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Abre a aba Metas & Objetivos da equipe"]
    U2["CHEFE/EMPRESA: cria plano com exercício, título e 6 eixos com meta, indicador e cor"]
    U3["Arrasta projeto meu, do departamento ou da empresa para um eixo"]
    U4["Clica Derivar do plano oficial da EMPRESA"]
    U5["Abre comparação 2025 x 2026"]
    U6["Curte, comenta, salva o plano"]
    U7["Entra em uma meta coletiva"]
    U8["Clica em uma ação de 1 clique de um insight"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Painéis: eixos do plano, metas coletivas, insights da equipe ✦, eixos citados no DECIA"]
    W2["Grade 6 células: nº de projetos, % concluídos, prazo mais próximo, risco agregado"]
    W3["Toast: projeto já está em um eixo deste plano"]
    W4["Colunas lado a lado: novos, concluídos, reprogramados"]
    W5["Barra de progresso da meta e participantes"]
    W6["Insights com métrica, valor, fórmula e fonte · aviso de fallback quando houver"]
    W7["Tela explica o que falta coletar quando a amostra é insuficiente"]
    W8["Lista de projetos sem eixo com botão Vincular"]
  end

  subgraph LA["ws-application"]
    A1["TeamGoalsService.loadTab"]
    A2{"viewer é CHEFE ou EMPRESA do departamento?"}
    A3["Insights completos + metas + plano"]
    A4["Insights agregados e anonimizados + metas + plano"]
    A5["PlanService.create → validateSixAxes"]
    A6{"Exatamente 6 eixos nomeados?"}
    A7["422 EIXOS_INVALIDOS"]
    A8["PlanService.linkProject → validateOnePerPlan"]
    A9{"Projeto já em outro eixo deste plano?"}
    A10["409 PROJETO_JA_NO_PLANO"]
    A11{"Projeto visível para mim?"}
    A12["403 ACESSO_NEGADO"]
    A13["INSERT PlanAxisProject + UPDATE ProjectScheme.planAxisId · recomputeAxis · evict cache"]
    A14["PlanService.derive"]
    A15{"Origem é plano EMPRESA publicado?"}
    A16["422 DERIVACAO_INVALIDA"]
    A17["PlanService.compare: NOVO, CONCLUIDO, REPROGRAMADO, MANTIDO por eixo"]
    A18["SocialService targetType PLAN · SealService tier PLANO"]
    A19["GoalService.join · recomputeProgress a partir de MetricSnapshot"]
    A20["InsightService.equipe"]
    A21{"MetricDefinition.minSamples atendido?"}
    A22["MetricCalculator por métrica: carga x wipLimit, gargalos, tendência por eixo, SPI médio"]
    A23["PlanService.projectsWithoutAxis → Insight PROJETO_SEM_EIXO"]
    A24["InsightService.applyAction: abrir sessão DECIA, redistribuir, vincular eixo"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["INSIGHT scope EQUIPE: redige só sobre números do MetricCalculator, cita métrica e valor, benchmarks anonimizados, recomendações acionáveis"]
    I2["Risco agregado por eixo a partir de ComplianceResult RF32 e ProjectScenario RF31"]
    I3["RESUMO_ANALITICO do DECIA cita planAxisId ao recomendar"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: annual_plans, plan_axes, plan_axis_projects, project_schemes")]
    P2[("Redis: agregados por eixo")]
    P3[("MySQL: collective_goals, goal_participants, metric_snapshots")]
    P4[("MySQL: insights, metric_definitions, ai_inference_log")]
    P5[("MySQL: reactions, comments, saved_items, seal_bonds")]
  end

  U1 --> A1 --> A2
  A2 -->|"sim"| A3 --> W1
  A2 -->|"não"| A4 --> W1
  W1 --> U2 --> A5 --> A6
  A6 -->|"não"| A7
  A6 -->|"sim"| P1 --> W2
  W1 --> U3 --> A8 --> A9
  A9 -->|"sim"| A10 --> W3
  A9 -->|"não"| A11
  A11 -->|"não"| A12
  A11 -->|"sim"| A13 --> P1
  A13 --> P2
  A13 --> I2 --> P4
  I2 --> W2
  W1 --> U4 --> A14 --> A15
  A15 -->|"não"| A16
  A15 -->|"sim"| P1
  W1 --> U5 --> A17 --> W4
  W1 --> U6 --> A18 --> P5
  W1 --> U7 --> A19 --> P3
  A19 --> W5
  A3 --> A20 --> A21
  A4 --> A20
  A21 -->|"não"| W7
  A21 -->|"sim"| A22 --> P3
  A22 --> I1 --> P4
  I1 --> W6
  A1 --> A23 --> P4
  A23 --> W8
  A23 -.-> I3
  W6 --> U8 --> A24

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A7,A10,A12,A16 err
  class W7,A4 warn
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

  Note over U,DE: Abrir a aba Metas & Objetivos da equipe (plano + metas + insights)
  U->>NX: abre /departments/secid-uts/goals?year=2026
  NX->>C: GET /api/departments/{deptId}/goals-tab?year=2026
  C->>S: TeamGoalsService.loadTab(viewer, deptId, 2026)
  S->>R: GET plan:{planId}:aggregates
  S->>DB: annual_plans scope DEPARTAMENTO + plan_axes + projetos por eixo + collective_goals ABERTA
  S->>S: viewer é CHEFE ou EMPRESA? define nível dos insights
  S->>S: InsightService.equipe(deptId, viewer)
  S->>DB: metric_definitions (domain EQUIPES, PROJETOS) + metric_snapshots scope DEPARTAMENTO
  alt amostra abaixo de minSamples (RF43.CA15)
    S-->>C: 200 aba sem insights + explicação do que falta coletar
    C-->>NX: 200
    NX-->>U: painéis do plano e metas, painel de insights explica a amostra insuficiente
  else amostra suficiente (RF43.CA14)
    S->>S: MetricCalculator.compute para carga x wipLimit, gargalos, tendência por eixo, SPI médio
    S->>AI: run(INSIGHT, {números calculados, scope EQUIPE}, accessClass INTERNO, ECONOMIA)
    alt provedor externo indisponível
      AI-->>S: narrativa simplificada do motor local, result FALLBACK
    else ok
      AI-->>S: insights que citam métrica e valor + ações de 1 clique
    end
    S->>DB: INSERT insights (scope EQUIPE, scopeId deptId, metricRefsJson, actionsJson) · INSERT ai_inference_log (INSIGHT)
    S->>S: viewer EMPREGADO recebe só insights agregados e anonimizados
    S-->>C: 200 TeamGoalsView {plan, axes, goals, insights, projectsWithoutAxis}
    C-->>NX: 200
    NX-->>U: 6 células, metas com progresso, insights ✦ com fórmula e fonte, projetos sem eixo
  end

  Note over U,DE: Vincular projeto a um eixo (RF24.CA02, CA03)
  U->>NX: arrasta projeto P1 para o eixo Saneamento
  NX->>C: POST /api/plans/{planId}/axes/{axisId}/projects {projectId P1}
  C->>S: PlanService.linkProject(userId, planId, axisId, P1)
  S->>DB: SELECT plan_axis_projects JOIN plan_axes WHERE planId AND projectId = P1
  alt P1 já em outro eixo do mesmo plano
    S-->>C: 409 PROJETO_JA_NO_PLANO {currentAxisId}
    C-->>NX: 409
    NX-->>U: já está em Habitação — mover?
  else livre
    S->>DB: INSERT plan_axis_projects · UPDATE project_schemes SET planAxisId
    S->>S: recomputeAxis — projectsCount, completedPct, nearestDueAt
    S->>DB: UPDATE plan_axes
    S->>R: DEL plan:{planId}:aggregates
    S->>DE: publish ProjectLinkedToAxis
    S-->>C: 201 PlanAxisProject
    C-->>NX: 201
  end
  DE->>AI: run(CONFORMIDADE agregada, {complianceResults, scenarios dos projetos do eixo})
  AI-->>DE: aggregatedRisk ALTO + justificativa
  DE->>DB: UPDATE plan_axes SET aggregatedRisk

  Note over U,DE: Derivar o plano oficial para o departamento (RF24.CA04)
  U->>NX: CHEFE clica Derivar para o departamento
  NX->>C: POST /api/plans/{officialId}/derive {scope DEPARTAMENTO}
  C->>S: PlanService.derive(userId, officialId, DEPARTAMENTO)
  alt plano de origem não é EMPRESA publicado
    S-->>C: 422 DERIVACAO_INVALIDA
    C-->>NX: 422
  else oficial
    S->>DB: INSERT annual_plans (scope DEPARTAMENTO, derivedFromPlanId officialId, RASCUNHO) · INSERT plan_axes x6 copiados
    S-->>C: 201 plano derivado com vínculo ao oficial
    C-->>NX: 201
  end

  Note over U,DE: Comparar exercícios, publicar e reagir (RF24.CA05, CA06)
  U->>NX: compara 2025 x 2026
  NX->>C: GET /api/plans/compare?a={plan2025}&b={plan2026}
  C->>S: PlanService.compare(a, b)
  S->>DB: projetos dos dois planos por eixo + status + exerciseYear
  S-->>C: 200 CompareResult {porEixo [{axis, novos, concluidos, reprogramados, mantidos}]}
  C-->>NX: 200
  U->>NX: publica o plano e reage BEM_FUNDAMENTADO
  NX->>C: POST /api/plans/{planId}/publish · POST /api/interactions/PLAN/{planId}/reactions
  C->>S: PlanService.publish · SocialService.react
  S->>DB: UPDATE annual_plans SET status PUBLICADO, publishedAt · INSERT reactions (targetType PLAN)
  S->>OS: indexPlan

  Note over U,DE: Meta coletiva da equipe (RF35.CA01, CA02)
  U->>NX: entra na meta 10 decisões validadas com rastro no trimestre
  NX->>C: POST /api/goals/{goalId}/join
  C->>S: GoalService.join(userId, goalId)
  S->>DB: INSERT goal_participants
  S-->>NX: 201 · progresso recalculado pelo scheduler a partir de metric_snapshots

  Note over AI,DB: RF24.CA07 — ao gerar RESUMO_ANALITICO de sessão com linkedProjectId, o AiEngine inclui planAxisId em cada recomendação e, se o projeto não tem eixo, grava Insight PROJETO_SEM_EIXO que aparece nesta aba.
```

## 4. Máquina de estados

Entidade central: **`AnnualPlan.status`** (`PlanStatus` RASCUNHO · PUBLICADO · ENCERRADO). A derivação (CA04) nasce de um plano EMPRESA **PUBLICADO** e cria um novo plano RASCUNHO com `derivedFromPlanId`. Como composto auxiliar, o ciclo de `CollectiveGoal.status` (`GoalStatus`, RF35) que alimenta o painel de metas; `Insight` não tem enum de status (só `dismissedAt`).

```mermaid
stateDiagram-v2
  state "AnnualPlan.status" as Plan {
    [*] --> RASCUNHO : POST plans com exatamente 6 eixos
    RASCUNHO --> RASCUNHO : nomear eixos, vincular e desvincular projetos, trocar capa
    RASCUNHO --> PUBLICADO : publicar, indexa para Buscar e Mural
    PUBLICADO --> PUBLICADO : vincular projetos, recomputar agregados e risco, interações RF26, chancela tier PLANO, insights de equipe
    PUBLICADO --> DERIVADO : derivar para DEPARTAMENTO ou PESSOAL, só se scope EMPRESA
    state "Novo plano RASCUNHO com derivedFromPlanId" as DERIVADO
    DERIVADO --> RASCUNHO : segue o ciclo próprio mantendo vínculo com o oficial
    PUBLICADO --> ENCERRADO : fim do exercício ou encerramento manual
    ENCERRADO --> ENCERRADO : somente leitura, usado em comparação de exercícios
    ENCERRADO --> [*]
  }
  state "CollectiveGoal.status (RF35)" as Goal {
    [*] --> ABERTA : CHEFE ou EMPRESA cria meta com critério mensurável
    ABERTA --> ABERTA : scheduler recomputeProgress por MetricSnapshot
    ABERTA --> ATINGIDA : progress maior ou igual a 1 dentro do período
    ABERTA --> EXPIRADA : periodTo passou sem atingir
    ATINGIDA --> [*]
    EXPIRADA --> [*]
  }
  note right of Plan
    Exatamente 6 PlanAxis position 1..6 (CA01).
    Projeto já no plano 409 PROJETO_JA_NO_PLANO (CA02).
    Por eixo projectsCount, completedPct, nearestDueAt, aggregatedRisk (CA03).
    Plano EMPRESA publicado é o oficial (CA04).
    Comparação 2025 x 2026 NOVO, CONCLUIDO, REPROGRAMADO (CA05).
  end note
  note right of Goal
    ATINGIDA credita META_ATINGIDA por participante (RF35.CA02).
    Progresso aparece no painel de metas da aba.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/departments/[slug]/goals — aba Metas & Objetivos da equipe"]
    F2["app/plans, app/plans/new, app/plans/[id], app/plans/compare"]
    F3["app/goals RF35 · app/insights/equipe RF43"]
    F4["components/ui: AxisGrid 6 células, AxisCard meta/indicador/cor/risco, ProjectDragDrop, DeriveButton, CompareColumns, GoalProgressBar, InsightCard ✦ com métrica/fórmula/fonte, InsufficientDataState, OneClickAction, InteractionBar RF26, SealWax"]
  end

  subgraph WEB["ws-web"]
    C1["TeamGoalsController — GET /api/departments/{id}/goals-tab"]
    C2["PlanController — /api/plans, /axes/{id}/projects, /derive, /compare, /publish"]
    C3["GoalController RF35 — /api/goals, /join"]
    C4["InsightController RF43 — /api/insights/equipe, /insights/{id}/action"]
    C5["InteractionController RF26 — /api/interactions/PLAN/{id}/*"]
  end

  subgraph APP["ws-application"]
    S1["TeamGoalsService (proposta)"]
    S2["PlanService"]
    S3["RiskAggregationService"]
    S4["GoalService RF35"]
    S5["InsightService RF43"]
    S6["SocialService RF26 · SealService RF39"]
    S7["AiEngine (Strategy + Chain) · INSIGHT · CONFORMIDADE"]
    P1["CachePort"]
    P2["SearchIndexPort"]
  end

  subgraph DOM["ws-domain"]
    D1["AnnualPlan · PlanAxis · PlanAxisProject"]
    D2["ProjectScheme · ComplianceResult · ProjectScenario"]
    D3["CollectiveGoal · GoalParticipant · MetricSnapshot"]
    D4["Insight · MetricDefinition · MetricCalculator · AiInferenceLog · DeciaSession · AnalyticalSummary"]
    D5["Department · User · Reaction · Comment · SavedItem · Share · SealBond"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: annual_plans, plan_axes, plan_axis_projects, project_schemes, collective_goals, goal_participants, metric_snapshots, metric_definitions, insights, ai_inference_log, reactions, seal_bonds")]
    I2[("cache-redis: agregados por eixo, saldo de metas")]
    I3[("search-opensearch: índice de planos para Buscar RF27")]
    I4["ai-providers: ClaudeAdapter · GeminiAdapter · LocalEngine — INSIGHT, risco agregado, RESUMO_ANALITICO cita eixo"]
    I5["platform: GoalProgressScheduler · scheduler de insights · DomainEventOutbox"]
  end

  subgraph EXT["Serviços externos"]
    E1(("Claude / Gemini"))
  end

  F1 --- F4
  F2 --- F4
  F3 --- F4
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C2
  F3 -->|"HTTPS/JSON"| C3
  F3 -->|"HTTPS/JSON"| C4
  F4 -->|"HTTPS/JSON"| C5
  C1 --> S1
  C2 --> S2
  C3 --> S4
  C4 --> S5
  C5 --> S6
  S1 --> S2
  S1 --> S4
  S1 --> S5
  S2 --> S3
  S2 --> S6
  S2 --> P1
  S2 --> P2
  S3 --> S7
  S5 --> S7
  S2 --> D1
  S2 --> D2
  S3 --> D2
  S4 --> D3
  S5 --> D4
  S6 --> D5
  D1 --> I1
  D2 --> I1
  D3 --> I1
  D4 --> I1
  D5 --> I1
  P1 --> I2
  P2 --> I3
  S7 --> I4
  I5 --> S4
  I5 --> S5
  I4 -.-> E1
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF24.CA01 | `AnnualPlan` (exerciseYear, title), `PlanAxis` (position 1..6, name, goal, indicator, color), relação `AnnualPlan "1" --> "6" PlanAxis`, `PlanService.create/validateSixAxes` · Atividades `U2 → A5 → A6 → A7 422 EIXOS_INVALIDOS / P1 → W2` · Sequência (bloco "Vincular"/derivação usam o plano criado) · Transição `[*] → RASCUNHO` + nota · Componentes `AxisGrid 6 células`, `AxisCard`, `app/plans/new` |
| RF24.CA02 | `PlanAxisProject` (nota índice único planId + projectId), `ProjectScheme.planAxisId`, `PlanService.linkProject/validateOnePerPlan` · Atividades `U3 → A8 → A9 → A10 409 PROJETO_JA_NO_PLANO`, `A11 → A12 403`, `A13 → P1` · Sequência `POST /api/plans/{planId}/axes/{axisId}/projects` → `alt P1 já em outro eixo → 409` / `INSERT plan_axis_projects · UPDATE project_schemes SET planAxisId` · Nota do estado *Plan* · Componente `ProjectDragDrop` |
| RF24.CA03 | `PlanAxis.projectsCount/completedPct/nearestDueAt/aggregatedRisk`, enum `RiskLevel`, `PlanService.recomputeAxis`, `RiskAggregationService.aggregate`, `ComplianceResult`, `ProjectScenario`, `CachePort` · Atividades `A13 → P2`, `A13 → I2 → W2` · Sequência `recomputeAxis`, `DE->>AI run(CONFORMIDADE agregada …)` → `UPDATE plan_axes SET aggregatedRisk`, `GET /api/departments/{deptId}/goals-tab` (agregados do Redis) · Componentes `cache-redis`, `ai-providers` |
| RF24.CA04 | `AnnualPlan.derivedFromPlanId/scope`, enum `PlanScope`, `PlanService.derive` · Atividades `U4 → A14 → A15 → A16 422 / P1` · Sequência `POST /api/plans/{officialId}/derive` → `alt não é EMPRESA publicado → 422 DERIVACAO_INVALIDA` / `INSERT annual_plans (scope DEPARTAMENTO, derivedFromPlanId …)` · Transição `PUBLICADO → DERIVADO → RASCUNHO` · Componente `DeriveButton` |
| RF24.CA05 | Enum `CompareBucket` (NOVO, CONCLUIDO, REPROGRAMADO, MANTIDO), `PlanService.compare` · Atividades `U5 → A17 → W4` · Sequência `GET /api/plans/compare?a=&b=` → `CompareResult {porEixo …}` · Transição `ENCERRADO → ENCERRADO : usado em comparação` · Componentes `app/plans/compare`, `CompareColumns` |
| RF24.CA06 | `Reaction` (targetType PLAN), `SealBond` (tier PLANO, PLANO_MATCH), `AnnualPlan.visibility/coverUrl/sealIdsJson`, `SocialService.react`, `SealService.suggestForPlan` · Atividades `U6 → A18 → P5` · Sequência `POST /api/plans/{planId}/publish · POST /api/interactions/PLAN/{planId}/reactions` · Transição `PUBLICADO → PUBLICADO : interações RF26, chancela tier PLANO` · Componentes `InteractionBar RF26`, `SealWax`, `InteractionController RF26` |
| RF24.CA07 | `DeciaSession.planAxisId`, `AnalyticalSummary.recommendationsJson (planAxisId)`, `Insight PROJETO_SEM_EIXO`, `PlanService.projectsWithoutAxis` · Atividades `A1 → A23 → P4 → W8`, `A23 -.-> I3` · Sequência nota final "RF24.CA07 — … inclui planAxisId em cada recomendação … Insight PROJETO_SEM_EIXO que aparece nesta aba" · Componentes `ai-providers RESUMO_ANALITICO cita eixo`, painel "eixos citados no DECIA" em `W1` |
| RF35.CA01 (meta coletiva: período, critério mensurável, recompensa) | `CollectiveGoal` (criterionJson, periodFrom/To, rewardPointsPerParticipant, progress), `GoalParticipant`, `GoalService.create/join/recomputeProgress`, `MetricSnapshot` · Atividades `U7 → A19 → P3 → W5` · Sequência bloco "Meta coletiva da equipe" (`POST /api/goals/{goalId}/join`) · Estado composto *Goal* `[*] → ABERTA → ABERTA` · Componentes `app/goals RF35`, `GoalProgressBar`, `GoalProgressScheduler` |
| RF35.CA02 (progresso automático e meta atingida) | `CollectiveGoal.status/achievedAt`, enum `GoalStatus`, `GoalService.recomputeProgress` · Atividade `A19` (recomputeProgress a partir de MetricSnapshot) · Transição `ABERTA → ATINGIDA / EXPIRADA` e nota (META_ATINGIDA por participante) · Componente `platform GoalProgressScheduler` |
| RF43.CA14 (insights de equipe para CHEFE/EMPRESA, benchmarks anonimizados, recomendações acionáveis) | `Insight` (scope EQUIPE, metricRefsJson, actionsJson, severity), `InsightService.equipe/applyAction`, `MetricCalculator`, `TeamGoalsService.visibleInsights`, `AiEngine INSIGHT` · Atividades `A1 → A2 → A3/A4`, `A20 → A22 → I1 → P4 → W6`, `U8 → A24` · Sequência bloco "Abrir a aba" (`InsightService.equipe`, `MetricCalculator.compute`, `run(INSIGHT …)`, `viewer EMPREGADO recebe só insights agregados`) · Componentes `InsightCard ✦`, `OneClickAction`, `InsightController RF43`, `ai-providers INSIGHT` |
| RF43.CA15 (amostra mínima) | `MetricDefinition.minSamples` · Atividades `A21 (não) → W7` · Sequência `alt amostra abaixo de minSamples → 200 aba sem insights + explicação do que falta coletar` · Nota de `Insight` · Componente `InsufficientDataState` |

> Dúvidas para `docs/DECISOES.md`: (1) a aba "Metas & Objetivos da equipe" é uma rota nova (`/departments/[slug]/goals`) ou é a sub-aba *Meus Planos Anuais / Trilhas* do perfil (RF19 sub-aba 6) com filtro de departamento? Modelei como rota nova com `TeamGoalsService`/`TeamGoalsController` (**propostas**, sem tabela própria); (2) o que o EMPREGADO vê dos insights de equipe — modelei "agregado e anonimizado" seguindo RF45.CA10 e ABAS_POR_PERFIL §7.b, mas o RF43.CA14 restringe a aba Insights › Equipe a CHEFE/EMPRESA; (3) `kind` do `Insight` (CARGA, GARGALO, TENDENCIA_EIXO, PROJETO_SEM_EIXO) não é enum nomeado na TAXONOMIA; (4) `409 PROJETO_JA_NO_PLANO`, `422 EIXOS_INVALIDOS`, `422 DERIVACAO_INVALIDA` herdados de `_anterior/RF24` continuam propostas.
