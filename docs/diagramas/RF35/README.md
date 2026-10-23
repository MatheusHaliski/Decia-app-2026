# RF35 — Participar de Metas coletivas, aparecer nos Destaques e receber Reconhecimentos (gamificação ligada ao perfil deliberativo, com DECIA Points como moeda)
**HU:** HU35 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** RF32 Desafios + Destaques + RF38 Cupons · **Aba/rota:** Metas coletivas (`/goals`), Destaques (`/highlights`), Reconhecimentos (`/recognitions`), barra de progresso no Mural (`/mural`), medalhas no perfil (`/profile?tab=reconhecimentos`, RF26 corpo/RF19)
**Critérios de aceite cobertos:** RF35.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs. A moeda é o **DECIA Points** (RF42); a HU35 ainda diz "Pontos de Contribuição" (nome antigo).

`CollectiveGoal` (criador EMPRESA/CHEFE; `criterionJson {metricCode, operator, target}` sobre o catálogo `MetricDefinition`; `minEffortCheck` anti-trivial; `progress` 0–1 calculado por `MetricCalculator` em job agendado e AFTER_COMMIT dos eventos relevantes) com `GoalParticipant`s. Meta ATINGIDA → `DeciaPointsLedgerEntry META_ATINGIDA` por participante com `idempotencyKey` (`ledgerBatchId`) e `Recognition source META`. `Highlight` do mês por departamento: algoritmo **transparente** (`algorithmScoreJson` com critérios visíveis: reações BEM_FUNDAMENTADO/CONFORME, reutilizações, rastro completo, conformidade) + curadoria do chefe (`curatedBy`); aparece na Vitrine (RF27) e alimenta a Chancela de Excelência (RF39.CA05). `Recognition` (= cupom/medalha) emitido manualmente, por meta ou por benefício; limite por emissor/mês (`Company.pointsPolicyJson`) e tudo em `AuditLog`.

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Todos são planejados: `/goals`, `/highlights` e `/recognitions` são páginas-esqueleto.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  empresa["«ator» Empresa ou órgão"]:::ator
  chefe["«ator» Chefe de departamento"]:::ator
  empregado["«ator» Empregado"]:::ator
  curador["«ator» Curador"]:::ator
  subgraph SIS["Work Station — RF35 Metas, Destaques e Reconhecimentos"]
    direction TB
    UC1(["UC1 Criar meta coletiva"]):::ucPlan
    UC2(["UC2 Participar de meta e acompanhar o progresso"]):::ucPlan
    UC3(["UC3 Recalcular o progresso e premiar a meta atingida"]):::ucPlan
    UC4(["UC4 Propor os Destaques do mês"]):::ucPlan
    UC5(["UC5 Curar e publicar os Destaques"]):::ucPlan
    UC6(["UC6 Emitir reconhecimento"]):::ucPlan
    UC7(["UC7 Exibir metas, destaques e reconhecimentos no perfil"]):::ucPlan
  end
  agendador["«ator» Agendador de trabalhos"]:::atorSis
  ia["«ator» IA (AiGateway)"]:::atorSis
  empresa --- UC1
  empresa --- UC5
  empresa --- UC6
  chefe --- UC1
  chefe --- UC5
  chefe --- UC6
  empregado --- UC2
  empregado --- UC7
  curador --- UC5
  UC3 --- agendador
  UC4 --- agendador
  UC4 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Criar meta coletiva | `empresa`, `chefe` | RF35.CA01, RF35.CA06 | planejado |
| UC2 Participar de meta e acompanhar o progresso | `empregado` | RF35.CA01 | planejado |
| UC3 Recalcular o progresso e premiar a meta atingida | `agendador` | RF35.CA01, RF35.CA02 | planejado (DP com `idempotencyKey`) |
| UC4 Propor os Destaques do mês | `agendador`, `ia` | RF35.CA03 | planejado (algoritmo transparente) |
| UC5 Curar e publicar os Destaques | `empresa`, `chefe`, `curador` | RF35.CA03 | planejado (curador só com escopo PREMIACAO) |
| UC6 Emitir reconhecimento | `empresa`, `chefe` | RF35.CA04, RF35.CA06 | planejado |
| UC7 Exibir metas, destaques e reconhecimentos no perfil | `empregado` | RF35.CA05 | planejado |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_gamification {
  class CollectiveGoal {
    <<entity>>
    +id: UUID
    +creatorId: UUID
    +companyId: UUID
    +departmentId: UUID
    +title: String
    +description: String
    +criterionJson: JSON
    +periodFrom: LocalDate
    +periodTo: LocalDate
    +rewardPointsPerParticipant: int
    +recognitionTemplateJson: JSON
    +minEffortCheck: boolean
    +progress: BigDecimal
    +status: GoalStatus
    +achievedAt: Instant
    +ledgerBatchId: UUID
  }
  class GoalParticipant {
    <<entity>>
    +id: UUID
    +goalId: UUID
    +userId: UUID
    +joinedAt: Instant
    +contributionJson: JSON
  }
  class Highlight {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +departmentId: UUID
    +monthKey: String
    +targetType: String
    +targetId: UUID
    +algorithmScoreJson: JSON
    +curatedBy: UUID
    +position: int
    +publishedAt: Instant
  }
  class DeliberativeProfile {
    <<entity>>
    +userId: UUID
    +periodKey: String
    +clarity: BigDecimal
    +evidenceUse: BigDecimal
    +consistency: BigDecimal
    +badgesJson: JSON
    +publicIndicatorsJson: JSON
  }
  class GoalStatus {
    <<enum>>
    ABERTA
    ATINGIDA
    EXPIRADA
  }
}

namespace ws_domain_seals_points {
  class Recognition {
    <<entity>>
    +id: UUID
    +issuerUserId: UUID
    +recipientUserId: UUID
    +name: String
    +medalArtJson: JSON
    +criterion: String
    +source: RecognitionSource
    +sourceId: UUID
    +validUntil: LocalDate
    +issuedAt: Instant
    +publicOnMural: boolean
    +certificateMediaId: UUID
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +id: UUID
    +userId: UUID
    +delta: int
    +eventCode: PointsEvent
    +refType: String
    +refId: UUID
    +idempotencyKey: String
    +status: LedgerStatus
    +correlationId: String
  }
  class SealBond {
    <<entity>>
    +basis: SealBondBasis
    +origin: SealBondOrigin
    +status: SealBondStatus
  }
  class RecognitionSource {
    <<enum>>
    MANUAL
    META
    BENEFICIO
  }
}

namespace ws_domain_ia_social {
  class MetricDefinition {
    <<entity>>
    +code: String
    +domain: MetricDomain
    +formula: String
    +minSamples: int
  }
  class MetricSnapshot {
    <<entity>>
    +metricCode: String
    +scope: MetricScope
    +scopeId: UUID
    +value: BigDecimal
  }
  class MuralEntry {
    <<entity>>
    +kind: MuralKind
    +targetType: TargetType
    +targetId: UUID
  }
  class Company {
    <<entity>>
    +id: UUID
    +pointsPolicyJson: JSON
  }
  class AuditLog {
    <<entity>>
    +actorId: UUID
    +action: String
    +resourceId: String
    +correlationId: String
  }
}

namespace ws_application {
  class GoalService {
    <<service>>
    +create(actor, GoalForm) CollectiveGoal
    +join(actor, goalId) GoalParticipant
    +recomputeProgress(goalId) CollectiveGoal
    +onAchieved(goal) void
    -checkMinEffort(form) 422 META_TRIVIAL
  }
  class HighlightService {
    <<service>>
    +computeMonth(companyId, departmentId, monthKey) List~Highlight~
    +curate(actor, highlightId, position) Highlight
    +publish(actor, departmentId, monthKey)
  }
  class RecognitionService {
    <<service>>
    +issue(actor, recipientId, RecognitionForm, source, sourceId) Recognition
    -checkMonthlyLimit(issuerId) 409 LIMITE_ESGOTADO
  }
  class DeciaPointsService {
    <<service>>
    +award(userId, eventCode, refId, batchId) DeciaPointsLedgerEntry
  }
  class MetricCalculator {
    <<service>>
    +compute(metricCode, scope, period) MetricSnapshot
  }
  class Guard {
    <<service>>
    +requireRole(actor, role)
    +requireDeptHead(actor, deptId)
    +requireSameCompany(actor, companyId)
  }
  class AuditLogPort {
    <<port>>
    +record(AuditEvent)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class GoalController {
    <<controller>>
    +POST_api_goals(form)
    +POST_api_goals_id_join()
    +GET_api_goals(status, deptId)
  }
  class HighlightController {
    <<controller>>
    +GET_api_highlights(monthKey, deptId)
    +POST_api_highlights_id_curate(position)
    +POST_api_highlights_publish(deptId, monthKey)
  }
  class RecognitionController {
    <<controller>>
    +POST_api_recognitions(form)
    +GET_api_users_id_recognitions()
  }
}

CollectiveGoal "1" o-- "0..*" GoalParticipant
CollectiveGoal ..> MetricDefinition : criterionJson.metricCode
CollectiveGoal ..> MetricSnapshot : progresso
CollectiveGoal "1" --> "0..*" DeciaPointsLedgerEntry : META_ATINGIDA por participante
CollectiveGoal "1" --> "0..*" Recognition : source META
Highlight ..> SealBond : Chancela de Excelencia RF39
Highlight ..> MuralEntry : DESTAQUE na Vitrine
Recognition ..> MuralEntry : RECONHECIMENTO
Recognition ..> AuditLog : emissao auditada
Company ..> RecognitionService : limite por emissor mes
DeliberativeProfile ..> Recognition : badgesJson
GoalController --> GoalService
HighlightController --> HighlightService
RecognitionController --> RecognitionService
GoalService --> MetricCalculator
GoalService --> DeciaPointsService
GoalService --> RecognitionService
GoalService --> Guard
GoalService --> DomainEvents
HighlightService --> MetricCalculator
HighlightService --> Guard
RecognitionService --> Guard
RecognitionService --> AuditLogPort
DomainEvents ..> GoalService : recomputeProgress AFTER_COMMIT
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPRESA · CHEFE · EMPREGADO)"]
    A0([EMPRESA/CHEFE cria meta coletiva]) --> A1["Período, critério mensurável (métrica do catálogo), recompensa em DP e/ou reconhecimento"]
    A2([EMPREGADO entra na meta]) --> A3["Vê progresso e participantes no Mural"]
    A4([Fim do mês]) --> A5["Chefe cura os Destaques propostos pelo algoritmo"]
    A6([EMPRESA/CHEFE emite reconhecimento]) --> A7["Nome, medalha, critério, validade"]
    A8([Perfil deliberativo]) --> A9["Metas cumpridas, destaques, reconhecimentos e DP por origem"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/goals · highlights · recognitions · mural · profile)"]
    F1["GoalForm (Select metricCode do catálogo, operator, target, Due) · POST /api/goals"]
    F2["POST /api/goals/{id}/join · GoalCard com barra de progresso e avatares"]
    F3["HighlightsBoard: critérios visíveis por item · POST /curate · /publish"]
    F4["RecognitionForm · POST /api/recognitions · Medal no perfil e Mural"]
    F5["Perfil deliberativo: medalhas, metas, destaques, DpChip por origem"]
  end

  subgraph WEB["ws-web"]
    W1["JWT · CorrelationIdFilter"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    P1{"Guard.requireRole EMPRESA ou requireDeptHead?"}
    P1 -->|não| E1["403 ACESSO_NEGADO"]
    P2{"Critério atende minEffortCheck da empresa?"}
    P2 -->|não| E2["422 META_TRIVIAL details.criterion"]
    P3{"periodFrom menor ou igual a periodTo?"}
    P3 -->|não| E3["400 PERIODO_INVALIDO"]
    P4["CollectiveGoal ABERTA"]
    P5{"Mesma empresa e meta ABERTA?"}
    P5 -->|não| E4["403 ou 409 META_ENCERRADA"]
    P6["GoalParticipant"]
    P7["AFTER_COMMIT de eventos relevantes e job diário → MetricCalculator → progress"]
    P8{"progress maior ou igual a 1?"}
    P8 -->|sim| P9["status ATINGIDA · DeciaPointsService.award META_ATINGIDA por participante (idempotencyKey = META+goalId+userId) · Recognition source META"]
    P8 -->|não, prazo vencido| P10["status EXPIRADA"]
    P11["HighlightService.computeMonth: score transparente (reações BEM_FUNDAMENTADO/CONFORME, reutilizações, rastro completo, conformidade)"]
    P12["Chefe cura (curatedBy, position) e publica → MuralEntry DESTAQUE na Vitrine · candidatos à Chancela de Excelência (RF39.CA05)"]
    P13{"Limite do emissor no mês (pointsPolicyJson)?"}
    P13 -->|esgotado| E5["409 LIMITE_ESGOTADO"]
    P13 -->|ok| P14["Recognition + AuditLog RECOGNITION_ISSUED + MuralEntry RECONHECIMENTO + Notification"]
  end

  subgraph IA["AiEngine (INSIGHT)"]
    I1["Só redige o texto explicativo dos Destaques e do perfil deliberativo sobre os números do MetricCalculator ✦"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL collective_goals · goal_participants · highlights · recognitions · decia_points_ledger · metric_snapshots · audit_log")]
    D2[("Cassandra timeline_by_user · notifications_by_user · flag cassandra.enabled")]
    D3[("Redis saldo DP · ranking · flag redis.enabled")]
  end

  A1 --> F1 --> W1 --> P1 -->|sim| P2 -->|sim| P3 -->|sim| P4 --> D1
  A2 --> F2 --> W1 --> P5 -->|sim| P6 --> D1
  P7 --> P8
  P9 --> D1
  P9 --> D3
  P9 --> D2
  P10 --> D1
  A4 --> P11 --> I1 --> A5 --> F3 --> W1 --> P1 --> P12 --> D1
  A6 --> A7 --> F4 --> W1 --> P1 --> P13
  P14 --> D1
  P14 --> D2
  A8 --> F5 --> D1
  A3 --> F2
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
  participant R as Redis
  participant CAS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: CHEFE cria meta 10 decisões validadas com rastro no trimestre
  FE->>C: POST /api/goals {criterion, period, reward}
  C->>S: GoalService.create(actor, form)
  S->>S: Guard.requireDeptHead(actor, deptId)
  alt critério trivial (minEffortCheck)
    S-->>C: 422 META_TRIVIAL
  else período invertido
    S-->>C: 400 PERIODO_INVALIDO
  else ok
    S->>DB: insert collective_goals (ABERTA, progress 0)
    S->>EV: GoalCreated → MuralEntry META + Notification ao departamento
    S-->>C: 201
  end

  U->>FE: EMPREGADO entra na meta
  FE->>C: POST /api/goals/{id}/join
  C->>S: GoalService.join(actor, goalId)
  S->>DB: insert goal_participants
  S-->>C: 201

  EV->>S: DecisionValidated (RF15) → GoalService.recomputeProgress(goalId)
  S->>S: MetricCalculator.compute(metricCode, DEPARTAMENTO, período)
  S->>DB: update collective_goals.progress
  alt progress maior ou igual a 1
    S->>DB: update status ATINGIDA, achievedAt, ledgerBatchId
    loop cada participante
      S->>DB: insert decia_points_ledger META_ATINGIDA (idempotencyKey META+goalId+userId)
      S->>R: incr saldo (redis.enabled)
      S->>DB: insert recognitions (source META, sourceId goalId)
    end
    S->>DB: audit_log GOAL_ACHIEVED
    S->>EV: GoalAchieved → Notification META + MuralEntry
    EV->>CAS: notifications_by_user · timeline_by_user
  end

  Note over U,EV: CA03 — Destaques do mês
  EV->>S: job mensal → HighlightService.computeMonth(companyId, deptId, monthKey)
  S->>DB: reações BEM_FUNDAMENTADO/CONFORME, reutilizações, rastro completo, conformidade por projeto/decisão/pessoa
  S->>AI: run(INSIGHT, redigir critérios visíveis)
  AI-->>S: texto ✦ (sem inventar números)
  S->>DB: insert highlights (algorithmScoreJson, sem publishedAt)
  U->>FE: CHEFE cura e publica
  FE->>C: POST /api/highlights/publish {deptId, monthKey}
  C->>S: HighlightService.publish(actor, deptId, monthKey)
  S->>S: Guard.requireDeptHead
  S->>DB: update highlights curatedBy, position, publishedAt
  S->>EV: HighlightsPublished → MuralEntry DESTAQUE (Vitrine) + candidatos RF39.CA05
  S-->>C: 200

  Note over U,EV: CA04 + CA06 — reconhecimento manual com limite
  U->>FE: EMPRESA emite reconhecimento
  FE->>C: POST /api/recognitions
  C->>S: RecognitionService.issue(actor, recipientId, form, MANUAL)
  S->>DB: count recognitions do emissor no mês × pointsPolicyJson
  alt limite atingido
    S-->>C: 409 LIMITE_ESGOTADO
  else ok
    S->>DB: insert recognitions · audit_log RECOGNITION_ISSUED
    S->>EV: RecognitionIssued → Medal no perfil + MuralEntry RECONHECIMENTO + Notification
    S-->>C: 201
  end
```

## 4. Máquina de estados

Entidade central: `CollectiveGoal.status` (`GoalStatus`). `Highlight` e `Recognition` não têm enum de estado (publicado = `publishedAt` preenchido; reconhecimento vence em `validUntil`).

```mermaid
stateDiagram-v2
  [*] --> ABERTA: POST /api/goals (EMPRESA/CHEFE, critério não trivial, CA01, CA06)
  ABERTA --> ABERTA: participantes entram · progress recalculado AFTER_COMMIT e no job diário · barra no Mural (CA01)
  ABERTA --> ATINGIDA: progress maior ou igual a 1 → DP META_ATINGIDA idempotente por participante + Recognition source META (CA02)
  ABERTA --> EXPIRADA: periodTo vencido sem atingir
  ATINGIDA --> [*]
  EXPIRADA --> [*]
  note right of ATINGIDA
    ledgerBatchId agrupa os lançamentos.
    Reprocessar o evento não duplica pontos (RF42.CA01).
  end note
  note right of ABERTA
    Critério vem do catálogo MetricDefinition (RF43 §8).
    A IA não calcula progresso, só explica.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/goals · highlights · recognitions · mural (barra da meta) · profile (sub-aba Reconhecimentos e Chancelas, Perfil deliberativo)"]
    R2["components: GoalForm · GoalCard (barra + avatares) · HighlightsBoard · RecognitionForm · Medal · DpChip · ProjectCard hero (Vitrine)"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    CTRL["GoalController · HighlightController · RecognitionController (@Operation RF35.CA01-CA06)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    GS["gamification/GoalService"]
    HS["gamification/HighlightService (algoritmo transparente)"]
    RS["seals/RecognitionService"]
    DPS["points/DeciaPointsService (ledger idempotente, RF42)"]
    MC["metrics/MetricCalculator (catálogo RF43 §8)"]
    AIE["ai/AiEngine (INSIGHT, só redação)"]
    GD["security/Guard (main: requireRole · planejado: requireDeptHead)"]
    AUD["audit/AuditLogPort (main)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    SCH["schedulers (ws-bootstrap): progresso diário · destaques mensais"]
  end
  subgraph DOM["ws-domain"]
    ENT["CollectiveGoal · GoalParticipant · Highlight · Recognition · DeciaPointsLedgerEntry · MetricDefinition (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql collective_goals · highlights · recognitions · decia_points_ledger"]
    RD["cache-redis saldo DP (flag redis.enabled)"]
    CASA["persistence-cassandra notifications · timeline (flag cassandra.enabled)"]
    AIP["ai-providers"]
  end
  BFF --> CTRL --> SEC
  CTRL --> GS
  CTRL --> HS
  CTRL --> RS
  GS --> MC
  GS --> DPS
  GS --> RS
  GS --> GD
  HS --> MC
  HS --> AIE
  RS --> AUD
  DE --> GS
  SCH --> GS
  SCH --> HS
  GS --> ENT --> MY --> MYSQL[("MySQL 8")]
  DPS --> RD --> REDIS[("Redis")]
  DE --> CASA --> CASS[("Cassandra")]
  AIE --> AIP --> AI["Claude / Gemini / local"]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF35.CA01 | `CollectiveGoal` (criterionJson, period, rewardPointsPerParticipant, recognitionTemplateJson, progress), `GoalParticipant`, `GoalService.create/join/recomputeProgress`, `MetricCalculator`, `MuralEntry META` | A1 → F1 → P1 (403) → P2 → P3 (400) → P4 · A2 → F2 → P5 → P6 · P7 | 1–16, 17–19 | `[*] → ABERTA → self` | `GS`, `MC`, `GoalCard`, `SCH` |
| RF35.CA02 | `GoalStatus ATINGIDA`, `DeciaPointsService.award META_ATINGIDA` (idempotencyKey, `ledgerBatchId`), `Recognition source META` | P8 → P9 | 20–28 | `ABERTA → ATINGIDA` + nota | `DPS`, `RD`, `CASA` |
| RF35.CA03 | `Highlight.algorithmScoreJson/curatedBy/position`, `HighlightService.computeMonth/curate/publish`, `MuralEntry DESTAQUE`, candidatos RF39.CA05 | A4 → P11 → I1 → A5 → F3 → P12 | 29–40 | — | `HS`, `HighlightsBoard`, `SCH` |
| RF35.CA04 | `Recognition` (name, medalArtJson, criterion, validUntil), `RecognitionSource MANUAL/META/BENEFICIO`, `RecognitionService.issue`, `MuralEntry RECONHECIMENTO` | A6 → A7 → F4 → P13 → P14 | 41–49 | — | `RS`, `Medal`, `RecognitionForm` |
| RF35.CA05 | `DeliberativeProfile.badgesJson/publicIndicatorsJson`, `DeciaPointsLedgerEntry.eventCode` por origem | A8 → A9 → F5 | — (RF19/RF43 leem) | — | `R1 profile`, `DpChip` |
| RF35.CA06 | `GoalService.checkMinEffort` (422 META_TRIVIAL), `RecognitionService.checkMonthlyLimit` (409 LIMITE_ESGOTADO, `Company.pointsPolicyJson`), `AuditLog GOAL_ACHIEVED/RECOGNITION_ISSUED` | P2 → E2 · P13 → E5 · P14 | 5–6, 27, 44–47 | nota de ABERTA | `AUD`, `GD` |
