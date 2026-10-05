# RF45 — Calcular com a IA o Hype Score do Perfil (0–1000) a partir de tudo o que o usuário produziu, das interações recebidas (curtidas, reações, comentários, salvos, remixes) e da participação no DECIA — exibível ou oculto a critério do usuário, sempre explicável
**HU:** HU45 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** Hype Score do look/perfil + Inventory Score (RF29) + contadores sociais (RF19), consolidados em um índice de reputação profissional por pessoa · **Aba/rota:** selo no cabeçalho do perfil (`/profile`, `/u/[username]`, se exibido), página **Por que meu Hype é X?** (`/profile/hype`, só o dono), aba "ignoradas", página pública "Como o Hype é calculado" (`/hype/como-e-calculado`), controle de exibição em `/settings` (RF3), recalibração da EMPRESA (`/hype/recalibration`), histograma no dashboard (`/admin/dashboard`, `/issuer/dashboard`)
**Critérios de aceite cobertos:** RF45.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs.

`ProfileHypeScore` (único `userId + scoreDate`; `score` 0–1000; `bandCode` → `HypeBand` Iniciante · Contribuinte · Referência · Líder de prática · Lenda do departamento, nomes editáveis pela EMPRESA; `blocksJson` produção 25 % · reconhecimento social 25 % · participação no DECIA 25 % · eficiência e impacto 15 % · reconhecimentos e chancelas 10 %; `bayesianPriorsJson`, `halfLifeDays` 180, `percentileInDept`, `topPositiveEventsJson`, `topNegativeEventsJson`, `suggestionsJson`, `weightsVersion`, `aiInferenceId`, `idempotencyKey`). Regras estatísticas em `HypeCalculator` (determinístico, D-12, `METRICAS_GESTAO.md` seção Hype): **média bayesiana** por bloco, **decaimento** meia-vida 180 d, **normalização por departamento/empresa** (percentil), tetos por dia, ponderação **PageRank** pela reputação de quem interage (`Reaction.actorHypeAtTime` do mês anterior, ≤ 3× o peso base), **antifraude** compartilhado com RF42 (`HypeIgnoredEvent` NAO_VERIFICADO · AUTO_INTERACAO · ANTIFRAUDE, só `User.verified`). Exibição: `User.hypeVisibility` PUBLICO · EMPRESA · SO_EU (padrão; **existe no main**: `HypeVisibility`) — a API omite o campo ou responde 403 a quem não pode ver; ocultar não impede o cálculo nem o ranking (RF43, que respeita `rankingOptOut`). A IA (`HYPE_PERFIL`) **só redige** a explicação ✦. Política de uso (LGPD): indicador de reputação e desenvolvimento, não instrumento disciplinar (`Company.hypePolicyJson`); revisão de decisão automatizada via `DataSubjectRequest` target HYPE (RF3).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_reputacao {
  class ProfileHypeScore {
    <<entity>>
    +id: UUID
    +userId: UUID
    +scoreDate: LocalDate
    +score: int
    +bandCode: String
    +blocksJson: JSON
    +bayesianPriorsJson: JSON
    +halfLifeDays: int
    +percentileInDept: BigDecimal
    +topPositiveEventsJson: JSON
    +topNegativeEventsJson: JSON
    +suggestionsJson: JSON
    +weightsVersion: int
    +aiInferenceId: UUID
    +idempotencyKey: String
  }
  class HypeBand {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +min: int
    +max: int
    +name: String
  }
  class HypeIgnoredEvent {
    <<entity>>
    +id: UUID
    +userId: UUID
    +eventType: String
    +eventId: UUID
    +reason: IgnoredReason
    +at: Instant
  }
  class IgnoredReason {
    <<enum>>
    NAO_VERIFICADO
    AUTO_INTERACAO
    ANTIFRAUDE
  }
  class HypeVisibility {
    <<enum>>
    PUBLICO
    EMPRESA
    SO_EU
  }
}

namespace ws_domain_entradas {
  class User {
    <<entity>>
    +id: UUID
    +verified: boolean
    +hypeVisibility: HypeVisibility
    +rankingOptOut: boolean
    +companyId: UUID
    +departmentId: UUID
  }
  class Company {
    <<entity>>
    +id: UUID
    +hypePolicyJson: JSON
  }
  class TaskItem {
    <<entity>>
    +ownerId: UUID
    +state: TaskState
    +sealIdsJson: JSON
    +reuseCount: int
  }
  class ProjectScheme {
    <<entity>>
    +ownerId: UUID
    +status: ProjectStatus
    +conformityPercent: BigDecimal
  }
  class Reaction {
    <<entity>>
    +actorId: UUID
    +targetId: UUID
    +reactionType: ReactionType
    +actorHypeAtTime: int
    +ignoredReason: String
  }
  class Comment {
    <<entity>>
    +authorId: UUID
    +targetId: UUID
    +parentCommentId: UUID
  }
  class Remix {
    <<entity>>
    +actorId: UUID
    +sourceId: UUID
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +userId: UUID
    +eventCode: PointsEvent
    +status: LedgerStatus
  }
  class DeliberativeProfile {
    <<entity>>
    +userId: UUID
    +consistency: BigDecimal
  }
  class EfficiencyScoreSnapshot {
    <<entity>>
    +userId: UUID
    +movingAvg7: BigDecimal
  }
  class Recognition {
    <<entity>>
    +recipientUserId: UUID
  }
  class SealBond {
    <<entity>>
    +targetOwnerId: UUID
    +status: SealBondStatus
  }
  class Highlight {
    <<entity>>
    +targetType: String
    +targetId: UUID
  }
  class RankingEntry {
    <<entity>>
    +dimension: RankingDimension
    +userId: UUID
  }
  class DataSubjectRequest {
    <<entity>>
    +kind: DsrKind
    +target: DsrTarget
    +targetId: UUID
  }
}

namespace ws_application {
  class HypeScoreService {
    <<service>>
    +recalculateAll(scoreDate) void
    +recalculate(userId, scoreDate) ProfileHypeScore
    +explain(actor) HypeExplanation
    +ignored(actor) List~HypeIgnoredEvent~
    +visibleTo(viewer, ownerId) Optional~HypeView~
    +distribution(actor, deptId) Histogram
  }
  class HypeCalculator {
    <<service>>
    +compute(inputs, weights, priors) HypeResult
    -bayesian(block, samples, prior) BigDecimal
    -decay(event, halfLifeDays) BigDecimal
    -normalize(value, deptDistribution) BigDecimal
    -actorWeight(actorHypePrevMonth) BigDecimal
    -dailyCap(eventType) int
  }
  class AntiFraudService {
    <<service>>
    +isIgnored(interaction) Optional~IgnoredReason~
  }
  class HypePolicyService {
    <<service>>
    +update(actor, HypePolicyForm) Company
    +bands(companyId) List~HypeBand~
  }
  class AiEngine {
    <<service>>
    +run(HYPE_PERFIL) AiResponse
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
    +requireRole(actor, role)
    +requireSameCompany(actor, companyId)
  }
  class CachePort {
    <<port>>
    +hype(userId)
  }
  class JobPort {
    <<port>>
    +enqueue(RECALC_HYPE)
  }
  class AuditLogPort {
    <<port>>
    +record(AuditEvent)
  }
}

namespace ws_web {
  class HypeController {
    <<controller>>
    +GET_api_me_hype()
    +GET_api_me_hype_ignored()
    +POST_api_me_hype_recalculate()
    +GET_api_users_id_hype()
    +GET_api_hype_how_it_works()
    +PUT_api_companies_id_hype_policy(form)
    +GET_api_dashboard_hype_distribution(deptId)
  }
}

ProfileHypeScore "0..*" --> "1" User
ProfileHypeScore ..> HypeBand : bandCode
User "1" o-- "0..*" HypeIgnoredEvent
Company "1" o-- "0..*" HypeBand
Company ..> HypeCalculator : hypePolicyJson pesos meia-vida faixas
TaskItem ..> HypeCalculator : bloco producao
ProjectScheme ..> HypeCalculator : bloco producao
Reaction ..> HypeCalculator : bloco social ponderado por actorHypeAtTime
Comment ..> HypeCalculator : bloco social
Remix ..> HypeCalculator : bloco social
DeciaPointsLedgerEntry ..> HypeCalculator : bloco DECIA
DeliberativeProfile ..> HypeCalculator : consistencia
EfficiencyScoreSnapshot ..> HypeCalculator : bloco eficiencia
Recognition ..> HypeCalculator : bloco reconhecimentos
SealBond ..> HypeCalculator : chancelas tier e Excelencia
Highlight ..> HypeCalculator : destaques
ProfileHypeScore ..> RankingEntry : HYPE_PERFIL respeita opt-out
DataSubjectRequest ..> ProfileHypeScore : revisao art 20
HypeController --> HypeScoreService
HypeController --> HypePolicyService
HypeScoreService --> HypeCalculator
HypeScoreService --> AntiFraudService
HypeScoreService --> AiEngine
HypeScoreService --> Guard
HypeScoreService --> CachePort
HypeScoreService --> JobPort
HypePolicyService --> Guard
HypePolicyService --> AuditLogPort
AntiFraudService ..> HypeIgnoredEvent : grava motivo
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (dono · outro usuário · EMPRESA · CHEFE)"]
    A0([Job diário ou sob demanda]) --> A1["Recalcula o Hype de cada usuário com atividade"]
    A2([Dono abre /profile/hype]) --> A3["Score, faixa, decomposição, histórico 12 meses, top 5 positivos e negativos, 3 sugestões ✦"]
    A4([Dono abre aba ignoradas]) --> A5["Interações descartadas com motivo"]
    A6([Dono escolhe exibição em /settings]) --> A7{"PUBLICO · EMPRESA · SO_EU"}
    A8([Outro usuário abre /u/username])
    A9([EMPRESA edita pesos, meia-vida, nomes das faixas])
    A10([EMPRESA/CHEFE abre dashboard]) --> A11["Histograma por departamento anonimizado e evolução média"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/profile/hype · u/[username] · settings · hype/como-e-calculado · hype/recalibration · admin/dashboard)"]
    F1["HypeBadge no cabeçalho do perfil (só se visível ao viewer) · autor com Hype 640 nos cards (TaskCard/ProjectCard)"]
    F2["HypePage: HypeGauge, BlocksBreakdown, HistoryChart 12m, TopEvents, Suggestions com Spark ✦ · GET /api/me/hype"]
    F3["IgnoredList · GET /api/me/hype/ignored"]
    F4["Select de visibilidade (RF3) · PATCH /api/me/preferences"]
    F5["Página pública Como o Hype é calculado (pesos e regras vigentes)"]
    F6["RecalibrationForm · PUT /api/companies/{id}/hype-policy"]
    F7["Histogram anonimizado · GET /api/dashboard/hype-distribution"]
  end

  subgraph WEB["ws-web"]
    W1["JWT · CorrelationIdFilter"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    P1["PipelineJob RECALC_HYPE por usuário (lock, idempotencyKey = userId + scoreDate + weightsVersion)"]
    P2{"Já calculado hoje com a mesma versão?"}
    P2 -->|sim| P3["Idempotente: retorna o existente"]
    P2 -->|não| P4["Coleta entradas: produção, interações recebidas, DP, perfil deliberativo, HSE médio, reutilizações, reconhecimentos, chancelas, destaques"]
    P4 --> P5["AntiFraudService.isIgnored: perfil não verificado · auto-interação · padrão antifraude (RF42) → HypeIgnoredEvent com motivo"]
    P5 --> P6["HypeCalculator: peso do ator = Hype do mês anterior (≤ 3× base) · decaimento meia-vida 180d · teto por dia · média bayesiana por bloco (prior = média do departamento) · normalização por percentil"]
    P6 --> P7{"Bloco com poucas amostras?"}
    P7 -->|sim| P8["Puxa para a média do departamento · flag amostra pequena"]
    P7 -->|não| P9["Score 0–1000 + bandCode (HypeBand da empresa)"]
    P8 --> P9
    P9 --> P10["Top 5 eventos positivos/negativos · 3 sugestões sobre os números"]
    P11["ProfileHypeScore (único userId+scoreDate) + cache"]
    P12{"Guard.requireOwner?"}
    P12 -->|não| E1["403 ACESSO_NEGADO"]
    P13["HypeScoreService.visibleTo(viewer, owner): SO_EU → omite campo · EMPRESA → só mesma empresa (requireSameCompany) · PUBLICO → todos"]
    P14["Ranking HYPE_PERFIL (RF43): respeita rankingOptOut · nunca expõe número de quem escolheu SO_EU"]
    P15["Guard.requireRole EMPRESA → Company.hypePolicyJson nova versão (validFrom futuro) · HypeBand · AuditLog HYPE_POLICY_UPDATED · meses passados intactos"]
    P16["distribution: histograma por departamento anonimizado + evolução média · nunca lista nominal de quem ocultou"]
  end

  subgraph IA["AiEngine (HYPE_PERFIL)"]
    I1["Redige Por que meu Hype é X? sobre blocksJson, top eventos e sugestões (nunca inventa números)"]
    I2["Claude → Gemini → LocalEngine (texto simplificado)"]
    I3["AiInferenceLog"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL profile_hype_scores (unique userId+scoreDate) · hype_bands · hype_ignored_events · companies.hype_policy_json · pipeline_jobs · audit_log")]
    D2[("Redis hype:{userId} · ranking cache · flag redis.enabled")]
  end

  A0 --> A1 --> P1 --> P2
  P3 --> D1
  P10 --> I1 --> I2 --> I3 --> P11 --> D1
  P11 --> D2
  A2 --> A3 --> F2 --> W1 --> P12 -->|sim| D1
  A4 --> A5 --> F3 --> W1 --> P12
  A6 --> A7 --> F4 --> W1 --> D1
  A8 --> F1 --> W1 --> P13 --> D1
  P13 --> P14 --> D2
  A9 --> F6 --> W1 --> P15 --> D1
  A10 --> A11 --> F7 --> W1 --> P16 --> D1
  F5 --> D1
  E1 --> W2
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
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over S,EV: CA01 a CA04 — job diário idempotente
  EV->>S: scheduler diário → HypeScoreService.recalculateAll(hoje) · PipelineJob RECALC_HYPE por usuário
  loop cada usuário com atividade
    S->>DB: profile_hype_scores where userId and scoreDate = hoje and weightsVersion = vigente
    alt já existe
      S-->>EV: idempotente, nada a fazer
    else calcula
      S->>DB: entradas: tasks, project_schemes, reactions (actorHypeAtTime), comments, saved_items, shares, remixes, decia_points_ledger CONFIRMADO, deliberative_profiles, hse_snapshots, recognitions, seal_bonds APROVADA, highlights
      S->>S: AntiFraudService.isIgnored por interação (não verificado · auto-interação · antifraude RF42)
      S->>DB: insert hype_ignored_events (motivo)
      S->>S: HypeCalculator: peso do ator pelo Hype do mês anterior (≤ 3×) · decaimento 180 d · teto por dia · bayesiana por bloco · percentil no departamento
      S->>DB: company.hype_policy_json (pesos, meia-vida, faixas) · hype_bands
      S->>AI: run(HYPE_PERFIL, blocos + top eventos + sugestões calculados)
      AI-->>S: texto explicativo ✦ + AiInferenceLog
      S->>DB: insert profile_hype_scores (score, bandCode, blocksJson, bayesianPriorsJson, percentileInDept, topPositive/Negative, suggestions, weightsVersion, idempotencyKey)
      S->>R: hype:{userId}
    end
  end

  Note over U,EV: CA05 — página do dono
  U->>FE: abre /profile/hype
  FE->>C: GET /api/me/hype
  C->>S: HypeScoreService.explain(actor)
  S->>S: Guard.requireOwner
  S->>DB: últimos 12 meses de profile_hype_scores + hype_ignored_events
  S-->>FE: score, faixa, decomposição, histórico, top 5 ±, 3 sugestões (Spark ✦), amostra pequena quando houver

  Note over U,EV: CA06 + CA08 — visibilidade
  U->>FE: escolhe EMPRESA em /settings
  FE->>C: PATCH /api/me/preferences {hypeVisibility EMPRESA}
  C->>S: AccountService (main) → users.hype_visibility
  S-->>FE: 200 (cabeçalho e cards atualizam imediatamente)
  U->>FE: colega de outra empresa abre /u/username
  FE->>C: GET /api/users/{id}/hype
  C->>S: HypeScoreService.visibleTo(viewer, owner)
  alt SO_EU ou viewer de outra empresa
    S-->>C: 403 ACESSO_NEGADO (ou campo omitido no perfil)
  else permitido
    S->>R: hype:{ownerId}
    S-->>FE: score + faixa
  end
  FE->>C: GET /api/rankings?dimension=HYPE_PERFIL
  C->>S: RankingService (RF43) → respeita rankingOptOut e nunca expõe SO_EU
  S-->>FE: posições sem o número de quem ocultou

  Note over U,EV: CA07 — recalibração pela EMPRESA
  U->>FE: EMPRESA altera meia-vida para 240 d e renomeia faixas
  FE->>C: PUT /api/companies/{id}/hype-policy
  C->>S: HypePolicyService.update(actor, form)
  S->>S: Guard.requireRole(EMPRESA)
  S->>DB: update companies.hype_policy_json (validFrom futuro, version+1) · hype_bands · audit_log HYPE_POLICY_UPDATED
  S-->>FE: 200 (meses passados não recalculam · página pública atualizada)

  Note over U,EV: CA10 — dashboard
  U->>FE: CHEFE abre dashboard
  FE->>C: GET /api/dashboard/hype-distribution?deptId=
  C->>S: HypeScoreService.distribution(actor, deptId)
  S->>DB: histograma por faixa (anonimizado) + média mensal
  S-->>FE: Histogram (nunca lista nominal)
```

## 4. Máquina de estados

Entidade central: `User.hypeVisibility` (`HypeVisibility`, enum e coluna **existem no main**) — o único estado que o titular controla; `ProfileHypeScore` é um snapshot diário imutável (recalcular o mesmo dia é idempotente).

```mermaid
stateDiagram-v2
  [*] --> SO_EU: padrão inicial no cadastro (RF1) · cálculo acontece igual (CA06)
  SO_EU --> EMPRESA: titular escolhe em /settings (RF3)
  SO_EU --> PUBLICO: titular escolhe
  EMPRESA --> PUBLICO: titular amplia
  EMPRESA --> SO_EU: titular restringe
  PUBLICO --> EMPRESA: titular restringe
  PUBLICO --> SO_EU: titular oculta
  note right of SO_EU
    API omite o campo ou responde 403 a terceiros.
    Ranking (RF43) nunca expõe o número (CA08).
    Cálculo e uso interno continuam.
  end note
  note right of PUBLICO
    Cabeçalho do perfil e cards de autoria mostram
    número e faixa imediatamente (CA06).
  end note
  note left of EMPRESA
    Só colegas da mesma empresa (Guard.requireSameCompany).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/profile/hype (dono) · profile e u/[username] (HypeBadge) · settings (visibilidade) · hype/como-e-calculado · hype/recalibration · admin/dashboard · issuer/dashboard"]
    R2["components: HypeBadge · HypeGauge · BlocksBreakdown · HistoryChart · TopEvents · Suggestions · IgnoredList · Histogram · Select (visibilidade) · TaskCard/ProjectCard (autor com Hype) · Spark ✦"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    HC["HypeController (@Operation RF45.CA01-CA10) · MeController (main: preferências)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    HSS["gamification/HypeScoreService"]
    HCAL["metrics/HypeCalculator (bayesiana · decaimento · normalização · PageRank · tetos — testes unitários, METRICAS_GESTAO.md)"]
    AF["points/AntiFraudService (compartilhado com RF42)"]
    HPS["gamification/HypePolicyService"]
    RK["gamification/RankingService (RF43, HYPE_PERFIL)"]
    AIE["ai/AiEngine (HYPE_PERFIL, só redação)"]
    ACC["account/AccountService (main: hypeVisibility)"]
    GD["security/Guard (main: requireRole, ownerOrAdmin · planejado: requireSameCompany)"]
    AUD["audit/AuditLogPort (main)"]
    SCH["schedulers (ws-bootstrap): Hype diário · PipelineJob RECALC_HYPE"]
  end
  subgraph DOM["ws-domain"]
    ENT["User.hypeVisibility · HypeVisibility · User.verified/rankingOptOut (main) · ProfileHypeScore · HypeBand · HypeIgnoredEvent · IgnoredReason · Company.hypePolicyJson (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql profile_hype_scores (unique userId+scoreDate) · hype_bands · hype_ignored_events (V__rf45) · users (V2/V3)"]
    RD["cache-redis hype:{userId} · ranking (flag redis.enabled)"]
    AIP["ai-providers (ai-claude · ai-gemini · ai-local)"]
  end
  BFF --> HC --> SEC
  HC --> HSS
  HC --> HPS
  HC --> ACC
  HSS --> HCAL
  HSS --> AF
  HSS --> AIE
  HSS --> GD
  HPS --> GD
  HPS --> AUD
  RK --> HSS
  SCH --> HSS
  HSS --> ENT --> MY --> MYSQL[("MySQL 8")]
  HSS --> RD --> REDIS[("Redis")]
  AIE --> AIP --> AI["Claude / Gemini / local"]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF45.CA01 | `ProfileHypeScore` (único userId+scoreDate, score, weightsVersion, blocksJson, idempotencyKey), `HypeScoreService.recalculateAll/recalculate`, `PipelineJob RECALC_HYPE` | A0 → A1 → P1 → P2 → P3/P4 → P9 → P11 | 1–15 | — (snapshot imutável) | `HSS`, `SCH`, `MY (unique)` |
| RF45.CA02 | `HypeCalculator.bayesian/decay`, `bayesianPriorsJson`, `halfLifeDays` 180, flag amostra pequena | P6 → P7 → P8 | 8, 19 | — | `HCAL` |
| RF45.CA03 | `AntiFraudService.isIgnored`, `HypeIgnoredEvent` (`IgnoredReason` NAO_VERIFICADO · AUTO_INTERACAO · ANTIFRAUDE), `User.verified`, aba ignoradas | P5 · A4 → A5 → F3 | 6–7, 18 | — | `AF`, `IgnoredList` |
| RF45.CA04 | `HypeCalculator.actorWeight`, `Reaction.actorHypeAtTime` (mês anterior, ≤ 3× base) | P6 | 5, 8 | — | `HCAL` |
| RF45.CA05 | `HypeScoreService.explain`, histórico 12 meses, `topPositiveEventsJson/topNegativeEventsJson/suggestionsJson`, `AiCapability HYPE_PERFIL`, `aiInferenceId` | A2 → A3 → F2 → P12 → I1 → I2 → I3 | 10–11, 16–19 | — | `HypePage`, `AIE`, `Spark ✦` |
| RF45.CA06 | `User.hypeVisibility` (`HypeVisibility`, main), `HypeScoreService.visibleTo`, `Guard.requireSameCompany`, 403/omissão do campo | A6 → A7 → F4 · A8 → F1 → P13 | 20–29 | toda a máquina | `ACC`, `HypeBadge`, `Select (visibilidade)` |
| RF45.CA07 | `HypePolicyService.update`, `Company.hypePolicyJson` (pesos, meia-vida, faixas, validFrom), `HypeBand`, `AuditLog HYPE_POLICY_UPDATED`, página "Como o Hype é calculado" | A9 → F6 → P15 · F5 | 34–38 | — | `HPS`, `AUD`, `R1 hype/como-e-calculado` |
| RF45.CA08 | `RankingService` dimensão `HYPE_PERFIL`, `User.rankingOptOut`, nunca expõe SO_EU | P14 | 30–32 | nota de SO_EU | `RK`, `RD` |
| RF45.CA09 | `HypeCalculator` determinístico com testes unitários (bayesiana, decaimento, normalização, antifraude), `METRICAS_GESTAO.md`, IA só redige | P6 · I1 | 8–11 | — | `HCAL`, `AIE` |
| RF45.CA10 | `HypeScoreService.distribution`, histograma anonimizado por departamento e evolução média, nunca lista nominal | A10 → A11 → F7 → P16 | 39–43 | — | `Histogram`, `admin/issuer dashboard` |
