# RF35 — Participar de Metas coletivas, aparecer nos Destaques e receber Reconhecimentos (gamificação ligada ao perfil deliberativo, com DECIA Points como moeda)

**HU:** HU35 · **Sprint (board Work Station):** Product Backlog (pós-Sprint 4, a priorizar) · **Equivalente FAI:** RF32 Desafios + Destaques + RF38 Cupons · **Aba/rota:** Metas coletivas (`/goals`), Destaques (`/highlights`), Reconhecimentos (`/recognitions`)

**Critérios de aceite cobertos:** RF35.CA01 · RF35.CA02 · RF35.CA03 · RF35.CA04 · RF35.CA05 · RF35.CA06

> Contextos da TAXONOMIA: **9. Gamificação & Reputação** (`CollectiveGoal`, `GoalParticipant`, `Highlight`, `DeliberativeProfile`), **6. Chancelas & Benefícios** (`Recognition` source MANUAL · META · BENEFICIO, `Benefit`), **7. DECIA Points** (`DeciaPointsLedgerEntry` eventCode `META_ATINGIDA` idempotente, `DeciaPointsRule`), **8. Social** (`MuralEntry` kind META · DESTAQUE · RECONHECIMENTO, `Reaction` BEM_FUNDAMENTADO/CONFORME), **10/12** (`MetricSnapshot`, `AuditLog`). Destaques usam **algoritmo transparente** (critérios visíveis em `algorithmScoreJson`), não IA externa. Anti-abuso: `minEffortCheck` contra critério trivial, limite de reconhecimentos por emissor/mês em `Company.pointsPolicyJson`, tudo em `audit_log`.

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR
  namespace ws-domain {
    class CollectiveGoal {
      <<entity>>
      +UUID id
      +UUID creatorId
      +UUID companyId
      +UUID departmentId
      +String title
      +String description
      +JSON criterionJson
      +LocalDate periodFrom
      +LocalDate periodTo
      +int rewardPointsPerParticipant
      +JSON recognitionTemplateJson
      +boolean minEffortCheck
      +BigDecimal progress
      +String status
      +Instant achievedAt
      +UUID ledgerBatchId
    }
    class GoalParticipant {
      <<entity>>
      +UUID id
      +UUID goalId
      +UUID userId
      +Instant joinedAt
      +JSON contributionJson
    }
    class Highlight {
      <<entity>>
      +UUID id
      +UUID companyId
      +UUID departmentId
      +String monthKey
      +String targetType
      +UUID targetId
      +JSON algorithmScoreJson
      +UUID curatedBy
      +int position
      +Instant publishedAt
    }
    class Recognition {
      <<entity>>
      +UUID id
      +UUID issuerUserId
      +UUID recipientUserId
      +String name
      +JSON medalArtJson
      +String criterion
      +String source
      +UUID sourceId
      +LocalDate validUntil
      +Instant issuedAt
      +boolean publicOnMural
      +UUID certificateMediaId
    }
    class DeciaPointsLedgerEntry {
      <<entity>>
      +UUID id
      +UUID userId
      +int delta
      +PointsEvent eventCode
      +String refType
      +UUID refId
      +String idempotencyKey
      +String status
      +BigDecimal qualityMultiplier
    }
    class DeciaPointsRule {
      <<entity>>
      +UUID id
      +PointsEvent eventCode
      +int points
      +int dailyCap
      +boolean oncePerRef
      +boolean active
    }
    class MetricSnapshot {
      <<entity>>
      +UUID id
      +String metricCode
      +String scope
      +UUID scopeId
      +BigDecimal value
      +Instant computedAt
    }
    class MuralEntry {
      <<entity>>
      +UUID id
      +UUID companyId
      +String kind
      +String targetType
      +UUID targetId
      +UUID actorId
    }
    class DeliberativeProfile {
      <<entity>>
      +UUID id
      +UUID userId
      +String periodKey
      +JSON badgesJson
      +JSON publicIndicatorsJson
    }
    class Company {
      <<entity>>
      +UUID id
      +JSON pointsPolicyJson
    }
    class AuditLog {
      <<entity>>
      +UUID id
      +UUID actorId
      +String action
      +UUID resourceId
    }
    class GoalStatus {
      <<enum>>
      ABERTA
      ATINGIDA
      EXPIRADA
    }
    class RecognitionSource {
      <<enum>>
      MANUAL
      META
      BENEFICIO
    }
    class HighlightTargetType {
      <<enum>>
      PROJECT
      DECISION
      USER
    }
    class PointsEvent {
      <<enum>>
      META_ATINGIDA
      BENEFICIO_BONUS
      REACAO_QUALIDADE
    }
  }
  namespace ws-application {
    class GoalService {
      <<service>>
      +create(issuerId, form) CollectiveGoal
      +join(userId, goalId) GoalParticipant
      +recomputeProgress(goalId) CollectiveGoal
      +onAchieved(goalId) void
      +expire(goalId) CollectiveGoal
    }
    class HighlightService {
      <<service>>
      +compute(companyId, deptId, monthKey) List~Highlight~
      +curate(headId, highlightId, position) Highlight
      +publish(headId, deptId, monthKey) List~Highlight~
    }
    class RecognitionService {
      <<service>>
      +issue(issuerId, recipientId, form, source, sourceId) Recognition
      +issueFromGoal(goal, participant) Recognition
      +issueFromBenefit(redemption) Recognition
      +monthlyCount(issuerId, monthKey) int
    }
    class DeciaPointsService {
      <<service>>
      +credit(userId, eventCode, refType, refId, idempotencyKey) DeciaPointsLedgerEntry
    }
    class DeliberativeProfileService {
      <<service>>
      +appendGamification(userId, goals, highlights, recognitions, pointsByOrigin) DeliberativeProfile
    }
    class AccessPolicy {
      <<service>>
      +requireIssuer(user) void
    }
  }
  namespace ws-web {
    class GoalController {
      <<controller>>
      +create(body)
      +join(goalId)
      +list(scope)
    }
    class HighlightController {
      <<controller>>
      +compute(monthKey)
      +curate(highlightId, position)
      +publish(monthKey)
      +list(monthKey, deptId)
    }
    class RecognitionController {
      <<controller>>
      +issue(body)
      +listByUser(userId)
    }
  }
  namespace ws-infrastructure {
    class GoalJpaRepository {
      <<adapter>>
    }
    class RedisPointsBalanceCache {
      <<adapter>>
    }
    class CassandraTimelineWriter {
      <<adapter>>
      timeline_by_user
    }
    class GoalProgressScheduler {
      <<adapter>>
      platform
    }
  }
  CollectiveGoal "1" --> "*" GoalParticipant
  CollectiveGoal --> GoalStatus : status
  CollectiveGoal --> Company : companyId pointsPolicyJson minEffort
  CollectiveGoal ..> MetricSnapshot : criterionJson metricCode
  CollectiveGoal ..> DeciaPointsLedgerEntry : ledgerBatchId
  DeciaPointsLedgerEntry --> PointsEvent : eventCode
  DeciaPointsLedgerEntry --> DeciaPointsRule : ruleVersionId
  Recognition --> RecognitionSource : source
  Recognition ..> CollectiveGoal : sourceId quando META
  Highlight --> HighlightTargetType : targetType
  MuralEntry ..> CollectiveGoal : kind META
  MuralEntry ..> Highlight : kind DESTAQUE
  MuralEntry ..> Recognition : kind RECONHECIMENTO
  DeliberativeProfile ..> Recognition : badgesJson
  GoalService ..> CollectiveGoal
  GoalService ..> GoalParticipant
  GoalService ..> DeciaPointsService : crédito idempotente RF42
  GoalService ..> RecognitionService : reconhecimento configurado
  GoalService ..> AccessPolicy
  GoalService ..> AuditLog
  HighlightService ..> Highlight
  HighlightService ..> MetricSnapshot : reações, reutilizações, rastro, conformidade
  RecognitionService ..> Recognition
  RecognitionService ..> AccessPolicy
  RecognitionService ..> AuditLog : toda emissão
  DeliberativeProfileService ..> DeliberativeProfile
  GoalController ..> GoalService
  HighlightController ..> HighlightService
  RecognitionController ..> RecognitionService
  GoalJpaRepository ..> CollectiveGoal : MySQL
  RedisPointsBalanceCache ..> DeciaPointsLedgerEntry : saldo
  CassandraTimelineWriter ..> MuralEntry : timeline_by_user
  GoalProgressScheduler ..> GoalService : recomputeProgress e expire
  note for CollectiveGoal "tabela collective_goals · criterionJson {metricCode, operator, target} · progress 0 a 1"
  note for Highlight "tabela highlights · algorithmScoreJson com critérios visíveis (CA03) · alimenta Chancela de Excelência RF39"
  note for Recognition "tabela recognitions · limite por emissor e mês em Company.pointsPolicyJson (CA06)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Ator humano"]
    U1["EMPRESA ou CHEFE cria meta: período, critério mensurável, recompensa (DECIA Points e/ou reconhecimento)"]
    U2["Empregados entram na meta"]
    U3["CHEFE revisa a lista calculada de Destaques e ajusta posições"]
    U4["CHEFE publica os Destaques do mês"]
    U5["EMPRESA ou CHEFE emite reconhecimento manual"]
    U6["Empregado abre o próprio perfil deliberativo (RF19.CA12)"]
  end
  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["Mural: barra de progresso e participantes da meta"]
    W2["Vitrine RF27: Destaques com critérios visíveis"]
    W3["Medalhas no perfil e no Mural"]
    W4["Perfil: metas cumpridas, destaques, reconhecimentos e DECIA Points por origem"]
  end
  subgraph L3["ws-application"]
    S1{"Ator é EMPRESA ou CHEFE?"}
    S2{"Critério mensurável e esforço acima do mínimo da empresa?"}
    S3["CollectiveGoal ABERTA · MuralEntry META · AuditLog GOAL_CREATED"]
    S4["GoalParticipant joinedAt"]
    S5["Scheduler: recomputeProgress a partir de MetricSnapshot do critério"]
    S6{"progress maior ou igual a 1 e dentro do período?"}
    S7{"periodTo passou?"}
    S8["status ATINGIDA · achievedAt"]
    S9["Para cada participante: DeciaPointsService.credit META_ATINGIDA com idempotencyKey = META_ATINGIDA + goalId + userId · ledgerBatchId"]
    S10["RecognitionService.issueFromGoal (source META) se recognitionTemplateJson"]
    S11["status EXPIRADA"]
    S12["HighlightService.compute: score por reações BEM_FUNDAMENTADO e CONFORME, reutilizações, rastro completo, conformidade · algorithmScoreJson"]
    S13["curate: position e curatedBy"]
    S14["publish: publishedAt · MuralEntry DESTAQUE · candidatos à Chancela de Excelência (RF39)"]
    S15{"monthlyCount abaixo do limite por emissor e mês?"}
    S16["Recognition MANUAL · MuralEntry RECONHECIMENTO · Notification · AuditLog RECOGNITION_ISSUED"]
    S17["DeliberativeProfileService.appendGamification"]
    E1["403 ACESSO_NEGADO"]
    E2["422 VALIDACAO (META_TRIVIAL)"]
    E3["429 LIMITE_EMISSOR_MES"]
  end
  subgraph L4["IA (AiEngine)"]
    A1["Não usada neste RF: algoritmo determinístico e transparente"]
  end
  subgraph L5["Persistência"]
    D1[("MySQL: collective_goals · goal_participants · audit_log · mural_entries")]
    D2[("MySQL: metric_snapshots")]
    D3[("MySQL: decia_points_ledger · Redis: saldo de pontos")]
    D4[("MySQL: recognitions · highlights · deliberative_profiles · Cassandra: timeline_by_user · notifications_by_user")]
  end
  U1 --> S1
  S1 -->|"não"| E1
  S1 -->|"sim"| S2
  S2 -->|"não"| E2
  S2 -->|"sim"| S3 --> D1
  S3 --> W1
  U2 --> S4 --> D1
  S5 --> D2
  S5 --> S6
  S6 -->|"sim"| S8 --> S9 --> D3
  S9 --> S10 --> D4
  S6 -->|"não"| S7
  S7 -->|"sim"| S11 --> D1
  S7 -->|"não"| W1
  S12 --> D2
  S12 -. "critérios visíveis" .-> A1
  S12 --> U3 --> S13 --> D4
  S13 --> U4 --> S14 --> D4
  S14 --> W2
  U5 --> S1
  S1 -->|"sim, reconhecimento"| S15
  S15 -->|"não"| E3
  S15 -->|"sim"| S16 --> D4
  S16 --> W3
  S10 --> W3
  U6 --> S17 --> D4
  S17 --> W4
  classDef err fill:#fde2e2,stroke:#b91c1c,color:#7f1d1d
  class E1,E2,E3 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01 e CA06 — criar meta coletiva com anti-abuso
  U->>NX: CHEFE cria meta 10 decisões validadas com rastro completo no trimestre
  NX->>C: POST /api/goals {title, criterionJson, periodFrom, periodTo, rewardPointsPerParticipant, recognitionTemplateJson}
  C->>S: GoalService.create(issuerId, form)
  alt ator EMPREGADO
    S-->>C: 403 ACESSO_NEGADO
  else critério trivial (abaixo de pointsPolicyJson.minGoalEffort)
    S-->>C: 422 VALIDACAO (META_TRIVIAL)
  else ok
    S->>DB: INSERT collective_goals (ABERTA, minEffortCheck = true) · INSERT audit_log (GOAL_CREATED)
    S-)EV: GoalCreated
    EV->>DB: INSERT mural_entries (META)
    EV->>CS: INSERT timeline_by_user (seguidores do departamento)
    S-->>C: 201 CollectiveGoal
  end
  U->>NX: empregado entra na meta
  NX->>C: POST /api/goals/{goalId}/join
  C->>S: GoalService.join(userId, goalId)
  S->>DB: INSERT goal_participants
  S-->>NX: 201

  Note over U,EV: CA02 — progresso automático e meta atingida (crédito idempotente)
  EV->>S: GoalProgressScheduler → GoalService.recomputeProgress(goalId)
  S->>DB: SELECT metric_snapshots WHERE metricCode = criterionJson.metricCode AND scope
  S->>DB: UPDATE collective_goals SET progress
  alt progress maior ou igual a 1
    S->>DB: UPDATE collective_goals SET status = ATINGIDA, achievedAt, ledgerBatchId
    loop para cada GoalParticipant
      S->>S: DeciaPointsService.credit(userId, META_ATINGIDA, GOAL, goalId, META_ATINGIDA+goalId+userId)
      S->>DB: INSERT decia_points_ledger (idempotencyKey único, CONFIRMADO)
      S->>R: INCRBY points:balance:{userId}
      S->>S: RecognitionService.issueFromGoal(goal, participant)
      S->>DB: INSERT recognitions (source META, sourceId = goalId) · INSERT audit_log
    end
    S-)EV: GoalAchieved
    EV->>DB: INSERT mural_entries (META) · INSERT notifications
  else periodTo passou
    S->>DB: UPDATE collective_goals SET status = EXPIRADA
  end

  Note over U,EV: CA03 — Destaques do mês (algoritmo transparente + curadoria)
  U->>NX: CHEFE abre /highlights do mês
  NX->>C: POST /api/highlights/{monthKey}/compute
  C->>S: HighlightService.compute(companyId, deptId, monthKey)
  S->>DB: SELECT reações BEM_FUNDAMENTADO e CONFORME, reuseCount, vw_decisions_with_trace, conformityPercent
  S->>DB: INSERT highlights (algorithmScoreJson com cada critério e peso)
  S-->>NX: 200 lista ordenada
  U->>NX: CHEFE move um projeto para a posição 1 e publica
  NX->>C: PUT /api/highlights/{id} {position} · POST /api/highlights/{monthKey}/publish
  C->>S: HighlightService.curate / publish
  S->>DB: UPDATE highlights SET curatedBy, position, publishedAt
  S-)EV: HighlightsPublished
  EV->>DB: INSERT mural_entries (DESTAQUE) · candidatos à Chancela de Excelência (RF39)
  S-->>NX: 200

  Note over U,EV: CA04 e CA06 — reconhecimento manual com limite por emissor e mês
  U->>NX: CHEFE emite reconhecimento
  NX->>C: POST /api/recognitions {recipientId, name, medalArtJson, criterion, validUntil}
  C->>S: RecognitionService.issue(issuerId, recipientId, form, MANUAL, null)
  S->>DB: SELECT COUNT recognitions WHERE issuerUserId AND monthKey
  alt limite mensal do emissor atingido
    S-->>C: 429 LIMITE_EMISSOR_MES
  else ok
    S->>DB: INSERT recognitions (MANUAL) · INSERT audit_log (RECOGNITION_ISSUED)
    S-)EV: RecognitionIssued
    EV->>DB: INSERT mural_entries (RECONHECIMENTO) · INSERT notifications
    S-->>NX: 201 Recognition
  end

  Note over U,EV: CA05 — perfil deliberativo
  U->>NX: abre /profile
  NX->>C: GET /api/users/{id}/deliberative-profile
  C->>S: DeliberativeProfileService.appendGamification(userId, ...)
  S->>DB: SELECT metas ATINGIDA do usuário, highlights USER, recognitions, decia_points_ledger agrupado por eventCode
  S-->>NX: 200 metas cumpridas, destaques, reconhecimentos e DECIA Points por origem
```

## 4. Máquina de estados

Entidade central: `CollectiveGoal.status`. O `Highlight` não tem enum de status — seu ciclo deriva de `curatedBy`/`publishedAt` e aparece como composto auxiliar. `Recognition` não tem estados (só `validUntil`).

```mermaid
stateDiagram-v2
  direction LR
  state "CollectiveGoal.status" as Goal {
    [*] --> ABERTA : POST /api/goals aprovado pelo anti-abuso (CA01, CA06)
    ABERTA --> ABERTA : scheduler recomputeProgress
    ABERTA --> ATINGIDA : progress maior ou igual a 1 dentro do período (CA02)
    ABERTA --> EXPIRADA : periodTo passou sem atingir
    ATINGIDA --> [*]
    EXPIRADA --> [*]
  }
  state "Highlight (derivado de curatedBy e publishedAt)" as HL {
    [*] --> Calculado : HighlightService.compute (algorithmScoreJson)
    Calculado --> Curado : CHEFE define position (curatedBy)
    Calculado --> Publicado : publish sem ajustes
    Curado --> Publicado : publish (publishedAt)
    Publicado --> [*]
  }
  note right of Goal
    ATINGIDA credita META_ATINGIDA por participante
    com idempotencyKey e emite Recognition source META (CA02)
  end note
  note right of HL
    Publicado vai para a Vitrine (RF27)
    e alimenta a Chancela de Excelência (RF39)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Next.js (frontend)"]
    direction TB
    P1["app/goals/page.tsx"]
    P2["app/highlights/page.tsx · curadoria do chefe"]
    P3["app/recognitions/page.tsx"]
    P4["app/profile · perfil deliberativo (RF19.CA12)"]
    P5["app/mural · barra de meta, destaques, medalhas (RF27)"]
    UI1["components/ui: GoalProgressBar · HighlightCard (critérios visíveis) · MedalBadge · PointsByOriginChart"]
  end
  subgraph WEB["ws-web (REST · br.gov.pr.secid.workstation.web)"]
    direction TB
    C1["GoalController"]
    C2["HighlightController"]
    C3["RecognitionController"]
  end
  subgraph APP["ws-application"]
    direction TB
    S1["GoalService"]
    S2["HighlightService"]
    S3["RecognitionService"]
    S4["DeciaPointsService (RF42)"]
    S5["DeliberativeProfileService (RF19)"]
    S6["AccessPolicy"]
  end
  subgraph DOM["ws-domain"]
    direction TB
    E1["CollectiveGoal · GoalParticipant · Highlight"]
    E2["Recognition · DeciaPointsLedgerEntry · DeciaPointsRule"]
    E3["MetricSnapshot · MuralEntry · DeliberativeProfile · AuditLog"]
  end
  subgraph INFRA["ws-infrastructure"]
    direction TB
    I1["persistence-mysql: Goal/Highlight/Recognition/Ledger repositories"]
    I2["cache-redis: RedisPointsBalanceCache"]
    I3["persistence-cassandra: CassandraTimelineWriter · notifications_by_user"]
    I4["platform: GoalProgressScheduler · DomainEventOutbox · AuditLog"]
  end
  subgraph EXT["Serviços externos"]
    X1(["Nenhum provedor de IA: algoritmo transparente"])
  end
  P1 --> C1
  P2 --> C2
  P3 --> C3
  P4 -.-> C3
  P5 -.-> C1
  UI1 -.-> P5
  C1 --> S1
  C2 --> S2
  C3 --> S3
  S1 --> S3
  S1 --> S4
  S1 --> S6
  S3 --> S6
  S5 --> S3
  S1 --> E1
  S2 --> E1
  S3 --> E2
  S4 --> E2
  S2 --> E3
  S5 --> E3
  S1 --> I1
  S2 --> I1
  S3 --> I1
  S4 --> I2
  S3 --> I3
  I4 --> S1
  S2 -.-> X1
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF35.CA01 | Classes `CollectiveGoal` (criterionJson, periodFrom/To, rewardPointsPerParticipant, recognitionTemplateJson, progress), `GoalParticipant`, `GoalService.create/join/recomputeProgress`, `MuralEntry kind META`; atividades `U1 → S1 → S2 → S3 → W1`, `U2 → S4`, `S5 → S6/S7`; sequência bloco «CA01 e CA06» e início do bloco «CA02»; transições `[*] → ABERTA → ABERTA`; componentes `app/goals`, `GoalProgressBar`, `GoalProgressScheduler` |
| RF35.CA02 | Classes `DeciaPointsLedgerEntry` (eventCode META_ATINGIDA, idempotencyKey), `CollectiveGoal.ledgerBatchId/achievedAt`, `DeciaPointsService.credit`, `RecognitionService.issueFromGoal`; atividades `S6 → S8 → S9 → S10`; sequência bloco «CA02» (loop por participante, idempotencyKey único, INCRBY Redis); transição `ABERTA → ATINGIDA` e nota; componentes `DeciaPointsService (RF42)`, `cache-redis` |
| RF35.CA03 | Classes `Highlight` (monthKey, targetType PROJECT/DECISION/USER, algorithmScoreJson, curatedBy, position, publishedAt), `HighlightService.compute/curate/publish`; atividades `S12 → U3 → S13 → U4 → S14 → W2` (A1: sem IA); sequência bloco «CA03»; estado `HL` (`Calculado → Curado → Publicado`) e nota (Vitrine, Chancela de Excelência RF39); componentes `app/highlights`, `HighlightCard` |
| RF35.CA04 | Classes `Recognition` (name, medalArtJson, criterion, validUntil, source MANUAL/META/BENEFICIO, publicOnMural), `RecognitionService.issue/issueFromGoal/issueFromBenefit`, `MuralEntry kind RECONHECIMENTO`; atividades `U5 → S1 → S15 → S16 → W3`, `S10 → W3`; sequência bloco «CA04 e CA06»; componentes `app/recognitions`, `MedalBadge`, `RecognitionController` |
| RF35.CA05 | Classes `DeliberativeProfile.badgesJson/publicIndicatorsJson`, `DeliberativeProfileService.appendGamification`; atividades `U6 → S17 → W4`; sequência bloco «CA05» (metas ATINGIDA, highlights USER, recognitions, ledger por eventCode); componentes `app/profile`, `PointsByOriginChart` |
| RF35.CA06 | Classes `CollectiveGoal.minEffortCheck`, `Company.pointsPolicyJson` (mínimo de esforço, limite por emissor/mês), `RecognitionService.monthlyCount`, `AuditLog`; atividades `S2 → E2` (422 META_TRIVIAL), `S15 → E3` (429 LIMITE_EMISSOR_MES), `S3`/`S16` (AuditLog); sequência blocos «CA01 e CA06» e «CA04 e CA06» (alts de anti-abuso, INSERT audit_log); transição `[*] → ABERTA` condicionada ao anti-abuso; componente `platform: AuditLog` |

> Dúvidas para `docs/DECISOES.md`: `GoalStatus`, `RecognitionSource` e `HighlightTargetType` não são enums nomeados na TAXONOMIA (valores inline); `DeciaPointsService` (RF42) e `DeliberativeProfileService` (RF19) são dependências assumidas; código HTTP do limite mensal (429 LIMITE_EMISSOR_MES vs. 409) e onde fica o mínimo de esforço (`Company.pointsPolicyJson`) são propostas; `Highlight` não tem campo de status — se precisar de rascunho/publicado explícito, acrescentar.


Tela/aba: `/goals` (esqueleto em `app/(shell)/goals/page.tsx`) · `/highlights` (esqueleto em `app/(shell)/highlights/page.tsx`) · `/recognitions` (esqueleto em `app/(shell)/recognitions/page.tsx`) · `/curation` (esqueleto em `app/(shell)/curation/page.tsx`)
