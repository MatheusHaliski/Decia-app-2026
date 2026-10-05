# RF45 — Calcular com a IA o Hype Score do Perfil (0–1000) a partir de tudo o que o usuário produziu, das interações recebidas (curtidas, reações, comentários, salvos, remixes) e da participação no DECIA — exibível ou oculto a critério do usuário, sempre explicável
**HU:** HU45 · **Sprint (board Work Station):** Product Backlog (não priorizado — pós-Sprint 4) · **Equivalente FAI:** Hype Score do look/perfil (RF6 painel do Look do Dia) + Inventory Score (RF29) + contadores sociais (RF19) — consolidados em um índice de reputação profissional por pessoa · **Aba/rota:** cabeçalho do perfil (RF19) com o selo do Hype Score (se exibido), página `/profile/hype` (só o dono) com a decomposição
**Critérios de aceite cobertos:** RF45.CA01 · RF45.CA02 · RF45.CA03 · RF45.CA04 · RF45.CA05 · RF45.CA06 · RF45.CA07 · RF45.CA08 · RF45.CA09 · RF45.CA10

> Contexto Gamificação & Reputação (bounded context 9). Entidade central: `ProfileHypeScore` (única por `userId + scoreDate`, `idempotencyKey`), com `blocksJson` em 5 blocos (produção 25, reconhecimento social 25, participação DECIA 25, eficiência e impacto 15, reconhecimentos e chancelas 10), `bayesianPriorsJson`, `halfLifeDays` 180, `percentileInDept`, `bandCode` (`HypeBand`). Eventos descartados vão para `HypeIgnoredEvent` (NAO_VERIFICADO, AUTO_INTERACAO, ANTIFRAUDE). Visibilidade em `User.hypeVisibility` (`HypeVisibility` PUBLICO | EMPRESA | SO_EU, padrão SO_EU). O job diário é `PipelineJob RECALC_HYPE` → `HypeScoreService`; a IA só redige a explicação.

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class ProfileHypeScore {
    <<entity>>
    +UUID id
    +UUID userId
    +LocalDate scoreDate
    +int score
    +String bandCode
    +String blocksJson
    +String bayesianPriorsJson
    +int halfLifeDays
    +BigDecimal percentileInDept
    +String topPositiveEventsJson
    +String topNegativeEventsJson
    +String suggestionsJson
    +int weightsVersion
    +UUID aiInferenceId
    +String idempotencyKey
  }
  class HypeBand {
    <<entity>>
    +UUID id
    +UUID companyId
    +int min
    +int max
    +String name
  }
  class HypeIgnoredEvent {
    <<entity>>
    +UUID id
    +UUID userId
    +String eventType
    +UUID eventId
    +IgnoredReason reason
    +Instant at
  }
  class User {
    <<entity>>
    +UUID id
    +boolean verified
    +HypeVisibility hypeVisibility
    +boolean rankingOptOut
    +UUID departmentId
    +UUID companyId
  }
  class Company {
    <<entity>>
    +UUID id
    +String hypePolicyJson
  }
  class Reaction {
    <<entity>>
    +UUID id
    +UUID actorId
    +String targetType
    +UUID targetId
    +ReactionType reactionType
    +Instant at
    +int actorHypeAtTime
    +String ignoredReason
  }
  class Comment {
    <<entity>>
    +UUID authorId
    +UUID targetId
    +UUID parentCommentId
  }
  class SavedItem {
    <<entity>>
    +UUID userId
    +UUID targetId
  }
  class Share {
    <<entity>>
    +UUID actorId
    +UUID targetId
    +ShareChannel channel
  }
  class Remix {
    <<entity>>
    +UUID actorId
    +UUID sourceId
    +UUID modelOfferId
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +String status
  }
  class DeliberativeProfile {
    <<entity>>
    +UUID userId
    +String periodKey
    +BigDecimal clarity
    +BigDecimal evidenceUse
    +BigDecimal consistency
  }
  class EfficiencyScoreSnapshot {
    <<entity>>
    +UUID userId
    +LocalDate date
    +BigDecimal hse
    +BigDecimal movingAvg7
  }
  class SealBond {
    <<entity>>
    +UUID targetOwnerId
    +SealBondStatus status
    +UUID sealId
  }
  class Seal {
    <<entity>>
    +UUID id
    +SealTier tier
    +boolean excellence
  }
  class Recognition {
    <<entity>>
    +UUID recipientUserId
    +String source
    +Instant issuedAt
  }
  class Highlight {
    <<entity>>
    +String monthKey
    +String targetType
    +UUID targetId
  }
  class TaskItem {
    <<entity>>
    +UUID ownerId
    +TaskState state
    +String sealIdsJson
    +int reuseCount
    +String aiConfidenceJson
  }
  class ProjectScheme {
    <<entity>>
    +UUID ownerId
    +ProjectStatus status
    +BigDecimal conformityPercent
  }
  class RankingEntry {
    <<entity>>
    +RankingDimension dimension
    +UUID userId
    +BigDecimal value
    +int position
  }
  class PipelineJob {
    <<entity>>
    +String type
    +UUID targetId
    +String status
    +int attempts
  }
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +String provider
    +String result
  }
  class AuditLog {
    <<entity>>
    +UUID actorId
    +String action
    +String metadataJson
  }
  class MetricSnapshot {
    <<entity>>
    +String metricCode
    +String scope
    +UUID scopeId
    +String valuesJson
  }

  class HypeVisibility {
    <<enum>>
    PUBLICO
    EMPRESA
    SO_EU
  }
  class IgnoredReason {
    <<enum>>
    NAO_VERIFICADO
    AUTO_INTERACAO
    ANTIFRAUDE
  }
  class ReactionType {
    <<enum>>
    CURTIR
    UTIL
    BEM_FUNDAMENTADO
    INOVADOR
    CONFORME
  }
  class RankingDimension {
    <<enum>>
    HYPE_PERFIL
    HSE_MEDIO
    ...5 valores
  }

  class HypeController {
    <<controller>>
    +GET profile_hype
    +GET profile_hype_ignored
    +POST profile_hype_recalculate
    +GET users_id_hype
    +GET hype_how_it_works
  }
  class PreferencesController {
    <<controller>>
    +PATCH me_hype_visibility
  }
  class CompanyPolicyController {
    <<controller>>
    +PUT companies_id_hype_policy
  }
  class DashboardController {
    <<controller>>
    +GET dashboard_hype_distribution
  }
  class HypeScoreService {
    <<service>>
    +recalculate(userId, scoreDate) ProfileHypeScore
    +runDailyJob(companyId) int
    +explain(userId) HypeExplanation
    +ignored(userId) List~HypeIgnoredEvent~
    +visibleTo(targetUserId, viewer) Optional~int~
    +updatePolicy(companyId, policy, editor) Company
  }
  class HypeCalculator {
    <<service>>
    +bayesianMean(values, deptPrior, k) BigDecimal
    +decay(eventAt, halfLifeDays180) BigDecimal
    +normalizePercentile(score, deptScores) BigDecimal
    +reputationWeight(actorHypePrevMonth, base, cap3x) BigDecimal
    +blocks(inputs, weightsVersion) BlocksBreakdown
    +band(score, bands) HypeBand
  }
  class AntiFraudService {
    <<service>>
    +isSelfInteraction(actorId, ownerId) boolean
    +isCollusion(actorId, ownerId, window) boolean
    +isVerified(actorId) boolean
  }
  class RankingService {
    <<service>>
    +compute(scope, scopeId, period, HYPE_PERFIL) List~RankingEntry~
  }
  class AiEngine {
    <<service>>
    +run(capability, input, accessClass) AiResult
  }

  ProfileHypeScore --> User : userId
  ProfileHypeScore ..> HypeBand : bandCode
  ProfileHypeScore ..> AiInferenceLog : aiInferenceId (HYPE_PERFIL)
  HypeIgnoredEvent --> IgnoredReason : reason
  HypeIgnoredEvent --> User : userId (dono)
  User --> HypeVisibility : hypeVisibility
  Company ..> HypeBand : nomes das faixas (hypePolicyJson)
  Company ..> ProfileHypeScore : pesos e meia-vida (weightsVersion)
  Reaction --> ReactionType : reactionType
  Reaction ..> ProfileHypeScore : actorHypeAtTime (peso PageRank)
  Comment ..> ProfileHypeScore : bloco reconhecimento social
  SavedItem ..> ProfileHypeScore : bloco reconhecimento social
  Share ..> ProfileHypeScore : bloco reconhecimento social
  Remix ..> ProfileHypeScore : bloco reconhecimento social
  DeciaPointsLedgerEntry ..> ProfileHypeScore : bloco participação DECIA
  DeliberativeProfile ..> ProfileHypeScore : consistência (objetivo 2)
  EfficiencyScoreSnapshot ..> ProfileHypeScore : bloco eficiência e impacto
  TaskItem ..> ProfileHypeScore : bloco produção e reutilizações
  ProjectScheme ..> ProfileHypeScore : bloco produção (conformidade)
  SealBond --> Seal : sealId
  SealBond ..> ProfileHypeScore : bloco reconhecimentos e chancelas (tier, Excelência x2)
  Recognition ..> ProfileHypeScore : bloco reconhecimentos
  Highlight ..> ProfileHypeScore : destaques do mês
  RankingEntry --> RankingDimension : HYPE_PERFIL
  PipelineJob ..> HypeScoreService : RECALC_HYPE diário

  HypeController --> HypeScoreService
  PreferencesController ..> User : hypeVisibility
  CompanyPolicyController --> HypeScoreService : updatePolicy
  DashboardController --> HypeScoreService : distribuição anonimizada
  HypeScoreService --> HypeCalculator
  HypeScoreService --> AntiFraudService
  HypeScoreService --> RankingService : HYPE_PERFIL (opt-out)
  HypeScoreService --> AiEngine : HYPE_PERFIL (redação)
  HypeScoreService ..> ProfileHypeScore
  HypeScoreService ..> HypeIgnoredEvent
  HypeScoreService ..> MetricSnapshot
  HypeScoreService ..> AuditLog

  note for ProfileHypeScore "tabela profile_hype_scores · único (userId, scoreDate) · blocksJson producao 25, reconhecimentoSocial 25, participacaoDecia 25, eficienciaImpacto 15, reconhecimentosChancelas 10"
  note for HypeCalculator "ws-domain · determinístico e testável (média bayesiana, decaimento 180 d, normalização, antifraude) · METRICAS_GESTAO.md seção Hype do Perfil"
  note for HypeBand "tabela hype_bands · 0–199 Iniciante · 200–399 Contribuinte · 400–599 Referência · 600–799 Líder de prática · 800–1000 Lenda do departamento"
  note for IgnoredReason "nome do enum a confirmar · TAXONOMIA só lista valores em HypeIgnoredEvent.reason"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#FFE3E3,stroke:#C0392B,color:#5B1A12
  classDef ai fill:#FFF3D6,stroke:#D68910,color:#5C3B00
  classDef store fill:#EEF6FF,stroke:#4A4852,color:#1F2937
  classDef dom fill:#F3F0FA,stroke:#7E57C2,color:#2D2438

  subgraph L_user["Ator humano · usuário dono · outro usuário · EMPRESA / CHEFE"]
    U1["Dono abre /profile/hype (Por que meu Hype é 640?) ou pede recálculo"]
    U2["Dono escolhe PÚBLICO / EMPRESA / SÓ EU nas preferências"]
    U3["Outro usuário abre o perfil ou um card de autoria"]
    U4["EMPRESA edita pesos dos blocos, meia-vida ou nomes das faixas"]
    U5["EMPRESA/CHEFE abre o dashboard (RF18/RF28)"]
  end

  subgraph L_web["Web/BFF · Next.js /profile/hype · cabeçalho do perfil · cards · dashboard"]
    W1["GET /profile/hype → score, faixa, blocos, histórico 12 meses, top 5 ±, 3 sugestões (✦) · aba ignoradas"]
    W2["PATCH /me/hype-visibility"]
    W3["GET /users/id/hype ou campo hype no card: HypeBadge só se permitido"]
    W4["PUT /companies/id/hype-policy (vigência futura)"]
    W5["GET /dashboard/hype-distribution → histograma anonimizado por departamento + evolução média"]
    W6["Página pública Como o Hype é calculado (pesos, meia-vida, faixas, regras)"]
  end

  subgraph L_job["Persistência / plataforma · job diário"]
    J1["Scheduler 03h: PipelineJob RECALC_HYPE por usuário ativo"]
    D1["MySQL profile_hype_scores (único userId + scoreDate) · hype_ignored_events · hype_bands"]
    D2["MySQL reactions, comments, saved_items, shares, remixes, decia_points_ledger, deliberative_profiles, hse_snapshots, seal_bonds, recognitions, highlights, tasks, project_schemes"]
    D3["Redis lock hype:userId:data · ranking:HYPE_PERFIL"]
    D4["MySQL ai_inference_log · audit_log (política editada) · companies.hypePolicyJson · metric_snapshots"]
  end

  subgraph L_app["ws-application · HypeScoreService"]
    S1{"Já existe ProfileHypeScore (userId, scoreDate)?"}
    S2["Coleta eventos do usuário (produção, interações recebidas, DECIA, eficiência, reconhecimentos) + pesos vigentes (weightsVersion) + priors do departamento"]
    S3{"Para cada interação recebida: autor verificado? não é auto-interação? não marcada pelo antifraude (RF42)?"}
    S4["HypeIgnoredEvent (NAO_VERIFICADO | AUTO_INTERACAO | ANTIFRAUDE) visível na aba ignoradas"]
    S5["Peso da interação = reputationWeight(Hype do autor no mês anterior, cap 3× o base) · teto por dia por tipo de evento"]
    S6["Upsert ProfileHypeScore (idempotencyKey = userId + scoreDate + weightsVersion) · score 0–1000 · bandCode"]
    S7["RankingService HYPE_PERFIL: exclui rankingOptOut · nunca expõe número de quem é SÓ EU"]
    S8{"viewer é o dono?"}
    S9{"hypeVisibility permite ao viewer (PUBLICO · EMPRESA mesma empresa · SÓ EU nunca)?"}
    S10["Campo hype omitido (ou 403 na rota dedicada)"]
    S11["Política nova: weightsVersion+1, validFrom futuro · audit_log · meses passados não recalculados"]
    S12["Distribuição: histograma por departamento anonimizado · evolução média · nunca lista nominal de quem ocultou"]
    E1["403 ACESSO_NEGADO"]
    E2["422 VALIDACAO (pesos não somam 100, meia-vida inválida)"]
    X1(["Retorna o score do dia (idempotente)"])
  end

  subgraph L_dom["ws-domain · HypeCalculator"]
    H1["decay: peso × 0,5^(dias ÷ 180) para todos os eventos (nunca zera)"]
    H2["bayesianMean por bloco: puxa para a média do departamento quando a amostra é pequena · flag amostra pequena"]
    H3["blocks: produção 25 · reconhecimento social 25 · participação DECIA 25 · eficiência e impacto 15 · reconhecimentos e chancelas 10 (tier PROJETO/PLANO mais, Excelência x2)"]
    H4["normalizePercentile por departamento/empresa · band(score)"]
    H5["top 5 eventos positivos e negativos · 3 sugestões candidatas (números)"]
  end

  subgraph L_ai["IA (AiEngine) · HYPE_PERFIL"]
    I1["Redige a explicação e as 3 sugestões sobre os números (✦) · motor local se externo indisponível"]
    I2["AiInferenceLog"]
  end

  J1 --> S1
  U1 --> W1 --> S1
  S1 -- "sim e não é pedido de recálculo" --> X1
  S1 -- "não" --> S2 --> D2
  S2 --> S3
  S3 -- "não" --> S4 --> D1
  S3 -- "sim" --> S5 --> H1 --> H2 --> H3 --> H4 --> H5 --> I1 --> I2 --> D4
  I1 --> S6 --> D1
  S6 --> D3
  S6 --> S7 --> D3
  S6 --> W1

  U2 --> W2 --> D1
  U3 --> W3 --> S8
  S8 -- "sim" --> W1
  S8 -- "não" --> S9
  S9 -- "não" --> S10 --> E1
  S9 -- "sim" --> W3

  U4 --> W4 --> S11
  S11 -- "inválido" --> E2
  S11 -- "ok" --> D4
  S11 --> W6

  U5 --> W5 --> S12 --> D1

  class E1,E2 err
  class I1,I2 ai
  class D1,D2,D3,D4,J1 store
  class H1,H2,H3,H4,H5 dom
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over S,EV: Job diário (PipelineJob RECALC_HYPE) por usuário
  EV->>S: HypeScoreService.recalculate(userId, hoje)
  S->>R: SET NX hype:userId:hoje (lock)
  S->>DB: SELECT profile_hype_scores WHERE userId AND scoreDate = hoje
  alt já calculado hoje
    S-->>EV: no-op (idempotente)
  else calcular
    S->>DB: SELECT companies.hypePolicyJson (pesos, meia-vida 180, faixas, weightsVersion) · priors do departamento
    S->>DB: SELECT tasks, project_schemes, process_kits do dono (estado, conformidade, chancela, Score do Acervo)
    S->>DB: SELECT reactions, comments, saved_items, shares, remixes recebidos + users.verified dos autores + Hype dos autores no mês anterior
    S->>DB: SELECT decia_points_ledger CONFIRMADO, deliberative_profiles, hse_snapshots, seal_bonds APROVADA (tier, excellence), recognitions, highlights
    loop para cada interação recebida
      S->>S: AntiFraudService: verified? auto-interação? antifraude RF42?
      alt descartada
        S->>DB: INSERT hype_ignored_events (eventType, eventId, reason)
      else aceita
        S->>S: peso = reputationWeight(hype do autor no mês anterior, cap 3x) × decay(180 d)
      end
    end
    S->>S: HypeCalculator: bayesianMean por bloco (prior do departamento, flag amostra pequena) → blocks (25/25/25/15/10) → score 0–1000 → percentil no departamento → band
    S->>AI: run(HYPE_PERFIL, números dos blocos + top 5 ± + candidatas a sugestão)
    alt provedor externo indisponível
      AI-->>S: motor local → explicação simplificada (números inalterados)
    else ok
      AI-->>S: explicação e 3 sugestões redigidas sobre os números (✦)
    end
    S->>DB: INSERT ai_inference_log · UPSERT profile_hype_scores (score, bandCode, blocksJson, bayesianPriorsJson, halfLifeDays, percentileInDept, top±, suggestionsJson, weightsVersion, idempotencyKey)
    S->>EV: HypeScoreUpdated(userId, score)
    EV->>S: RankingService.compute(DEPARTAMENTO, deptId, mês, HYPE_PERFIL) excluindo rankingOptOut
    S->>R: ZADD ranking:HYPE_PERFIL:deptId:mês (sem o número de quem é SO_EU)
    S->>R: DEL lock
  end

  Note over U,EV: Dono vê a decomposição
  U->>N: Abre /profile/hype
  N->>C: GET /profile/hype
  C->>S: HypeScoreService.explain(userId)
  S->>DB: SELECT profile_hype_scores últimos 12 meses · hype_ignored_events · hype_bands
  S-->>N: 200 score 640, faixa Líder de prática, blocos, histórico, top 5 ±, 3 sugestões ✦, flag amostra pequena, aba ignoradas
  N-->>U: Por que meu Hype é 640?

  Note over U,EV: Visibilidade e acesso de terceiros
  U->>N: Preferências › Hype: EMPRESA
  N->>C: PATCH /me/hype-visibility (EMPRESA)
  C->>S: PreferencesService.update
  S->>DB: UPDATE users hypeVisibility = EMPRESA
  S-->>N: 200 (cabeçalho e cards respeitam imediatamente)
  U->>N: Colega de outra empresa abre o perfil
  N->>C: GET /users/id/hype
  C->>S: visibleTo(targetUserId, viewer)
  alt viewer sem permissão (SO_EU, ou EMPRESA e viewer de outra empresa)
    S-->>N: 403 ACESSO_NEGADO (campo hype omitido nos cards)
  else permitido
    S-->>N: 200 score e faixa
  end

  Note over U,EV: EMPRESA edita a política
  U->>N: Pesos 30/20/25/15/10, meia-vida 180, faixa 5 = Lenda da SECID
  N->>C: PUT /companies/id/hype-policy
  C->>S: updatePolicy(companyId, policy, editor)
  alt pesos não somam 100
    S-->>N: 422 VALIDACAO
  else ok
    S->>DB: UPDATE companies.hypePolicyJson (weightsVersion+1, validFrom futuro) · hype_bands · INSERT audit_log (editor, diff)
    S-->>N: 200 (meses passados não recalculados · página Como o Hype é calculado atualizada)
  end
```

## 4. Máquina de estados

`ProfileHypeScore` não tem campo de status. Usam-se os estados que o RF afeta: a **faixa** (`ProfileHypeScore.bandCode` ↔ `HypeBand`) e a **visibilidade** (`User.hypeVisibility`), além do ciclo do `PipelineJob RECALC_HYPE`.

```mermaid
stateDiagram-v2
  direction LR

  state "bandCode (HypeBand, 0–1000)" as Band {
    [*] --> Iniciante : primeiro cálculo (0–199)
    Iniciante --> Contribuinte : score chega a 200
    Contribuinte --> Referencia : 400
    Referencia --> LiderDePratica : 600
    LiderDePratica --> Lenda : 800
    Lenda --> LiderDePratica : decaimento 180 d sem novos eventos
    LiderDePratica --> Referencia : decaimento
    Referencia --> Contribuinte : decaimento
    Contribuinte --> Iniciante : decaimento
  }

  state "User.hypeVisibility" as Vis {
    [*] --> SO_EU : padrão inicial
    SO_EU --> EMPRESA : usuário escolhe
    SO_EU --> PUBLICO : usuário escolhe
    EMPRESA --> PUBLICO : usuário escolhe
    PUBLICO --> EMPRESA : usuário restringe
    EMPRESA --> SO_EU : usuário oculta
    PUBLICO --> SO_EU : usuário oculta
  }

  state "PipelineJob RECALC_HYPE (diário)" as Job {
    [*] --> PENDENTE : scheduler 03h ou pedido do dono
    PENDENTE --> RODANDO
    RODANDO --> OK : upsert idempotente (userId, scoreDate)
    RODANDO --> FALHA : erro
    FALHA --> REPROCESSAR : attempts menor que 3
    REPROCESSAR --> PENDENTE
    OK --> [*]
  }

  note right of Vis
    Ocultar não impede o cálculo nem o uso no ranking (RF43),
    que respeita o opt-out próprio do ranking e nunca
    expõe o número de quem escolheu SO_EU (RF45.CA08).
  end note
  note right of Band
    Nomes das faixas editáveis pela EMPRESA (hypePolicyJson),
    com vigência futura e auditoria (RF45.CA07).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    FE1["app/profile (cabeçalho com HypeBadge se permitido) · app/profile/hype (só o dono: decomposição, histórico 12 meses, top 5 ±, sugestões, aba ignoradas) · app/hype/how-it-works (pesos e regras públicos) · app/settings/preferences (visibilidade) · app/admin e app/companies (dashboard: histograma anonimizado)"]
    FE2["components/ui · HypeBadge (score + faixa) · BlockBreakdown · HypeHistoryChart · TopEventsList · IgnoredEventsTable · SmallSampleHint · AiSpark ✦ · HypeHistogram"]
  end

  subgraph WEB["ws-web"]
    C1["HypeController"]
    C2["PreferencesController"]
    C3["CompanyPolicyController"]
    C4["DashboardController"]
  end

  subgraph APP["ws-application"]
    S1["HypeScoreService"]
    S2["AntiFraudService (RF42)"]
    S3["RankingService (RF43) · HYPE_PERFIL"]
    S4["AiEngine (RF43) · HYPE_PERFIL"]
    S5["PreferencesService (RF3)"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["HypeCalculator (bayesianMean, decay 180 d, normalizePercentile, reputationWeight cap 3x, blocks, band) — testes unitários"]
    D2["ProfileHypeScore · HypeBand · HypeIgnoredEvent · User.hypeVisibility · Company.hypePolicyJson · RankingEntry"]
    D3["Fontes: Reaction (actorHypeAtTime) · Comment · SavedItem · Share · Remix · DeciaPointsLedgerEntry · DeliberativeProfile · EfficiencyScoreSnapshot · SealBond/Seal · Recognition · Highlight · TaskItem · ProjectScheme"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1["persistence-mysql · profile_hype_scores, hype_bands, hype_ignored_events, companies, ranking_entries"]
    I2["cache-redis · lock diário · ranking HYPE_PERFIL · cache do badge"]
    I3["ai-providers · ClaudeAdapter · GeminiAdapter · LocalEngine"]
    I4["platform · scheduler diário · PipelineJob RECALC_HYPE · DomainEventOutbox · AuditLog · i18n"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini (redação da explicação)"]
  end

  FE1 --> C1
  FE1 --> C2
  FE1 --> C3
  FE1 --> C4
  FE2 -.-> FE1
  C1 --> S1
  C2 --> S5
  C3 --> S1
  C4 --> S1
  S1 --> D1
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> D2
  S1 --> D3
  S5 --> D2
  D2 --> I1
  D3 --> I1
  S1 --> I2
  S3 --> I2
  S4 --> I3 --> X1
  I4 --> S1
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF45.CA01 | Classes `ProfileHypeScore` (scoreDate, score 0–1000, weightsVersion, blocksJson, idempotencyKey), `HypeScoreService.recalculate/runDailyJob`, `PipelineJob RECALC_HYPE`; atividades J1, U1, S1 → X1 (idempotente), S2, S6; sequência msgs 1–4 e 16 (lock, no-op se já calculado, UPSERT); máquina de estados `PipelineJob RECALC_HYPE`; componentes `platform · scheduler diário · PipelineJob RECALC_HYPE`. |
| RF45.CA02 | Classes `HypeCalculator.bayesianMean/decay`, `ProfileHypeScore.bayesianPriorsJson/halfLifeDays`; atividades H1 (0,5^(dias ÷ 180), nunca zera), H2 (prior do departamento, flag amostra pequena); sequência msgs 11–12; componente `SmallSampleHint`. |
| RF45.CA03 | Classes `HypeIgnoredEvent` (eventType, eventId, reason), enum `IgnoredReason`, `User.verified`, `AntiFraudService` (isVerified, isSelfInteraction, isCollusion), `Reaction.ignoredReason`; atividades S3 → S4 (aba ignoradas com motivo); sequência msgs 9–10; componentes `IgnoredEventsTable`, `HypeController.GET profile_hype_ignored`, `AntiFraudService (RF42)`. |
| RF45.CA04 | Classes `HypeCalculator.reputationWeight(actorHypePrevMonth, base, cap3x)`, `Reaction.actorHypeAtTime`; atividade S5 (Hype do autor no mês anterior, cap 3×); sequência msgs 7 e 11 (Hype dos autores no mês anterior, cap 3x). |
| RF45.CA05 | Classes `ProfileHypeScore.topPositiveEventsJson/topNegativeEventsJson/suggestionsJson/aiInferenceId`, `HypeScoreService.explain`, `AiCapability HYPE_PERFIL`, `AiInferenceLog`; atividades U1, W1, H5, I1, I2; sequência msgs 13–16 e 21–26 (score, faixa, blocos, 12 meses, top 5 ±, 3 sugestões ✦); componentes `app/profile/hype`, `BlockBreakdown`, `HypeHistoryChart`, `TopEventsList`, `AiSpark ✦`. |
| RF45.CA06 | Classes `User.hypeVisibility`, enum `HypeVisibility` (PUBLICO, EMPRESA, SO_EU padrão), `HypeScoreService.visibleTo`, `PreferencesController`; atividades U2, W2, U3, W3, S8, S9, S10 → E1 (403 / campo omitido); sequência msgs 27–36; máquina de estados `User.hypeVisibility`; componentes `HypeBadge`, `app/settings/preferences`. |
| RF45.CA07 | Classes `Company.hypePolicyJson`, `HypeBand.name/min/max`, `ProfileHypeScore.weightsVersion`, `HypeScoreService.updatePolicy`, `CompanyPolicyController`, `AuditLog`; atividades U4, W4, S11 → E2 (422), W6 (página pública); sequência msgs 37–42 (weightsVersion+1, validFrom futuro, audit_log, meses passados não recalculados); nota da máquina de estados `Band`; componente `app/hype/how-it-works`. |
| RF45.CA08 | Classes `RankingEntry` (dimension HYPE_PERFIL), `User.rankingOptOut`, `RankingService.compute`; atividade S7 (exclui opt-out, nunca expõe número de quem é SÓ EU); sequência msgs 17–19 (ranking sem o número de quem é SO_EU); nota da máquina de estados `Vis`; componentes `RankingService (RF43) · HYPE_PERFIL`, `cache-redis · ranking HYPE_PERFIL`. |
| RF45.CA09 | Classe `HypeCalculator` em `ws-domain` (bayesianMean, decay, normalizePercentile, reputationWeight, blocks, band) com nota (determinístico, testável, METRICAS_GESTAO.md seção Hype do Perfil); lane L_dom (H1–H5); atividade I1 (IA só redige); componente `ws-domain · HypeCalculator — testes unitários`. |
| RF45.CA10 | Classes `DashboardController.GET dashboard_hype_distribution`, `MetricSnapshot`; atividades U5, W5, S12 (histograma anonimizado por departamento, evolução média, nunca lista nominal de quem ocultou); componentes `HypeHistogram`, `app/admin e app/companies (dashboard)`. |


Tela/aba: `/profile` (esqueleto em `app/(shell)/profile/page.tsx`)
