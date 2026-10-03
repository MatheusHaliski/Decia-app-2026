# RF18 — Exibir indicadores analíticos sobre uso do sistema do DECIA
**HU:** HU18 · **Sprint (board Work Station):** 3 · **Equivalente FAI:** aba **Gestão (admin) — Dashboard, usuários, moderação, sistema** do FAI → Gestão (+ painel IA do sistema) no Work AI (Mapa de equivalência, grupo "Gestão") · **Aba/rota:** Gestão › "Indicadores DECIA" (`/admin/dashboard`; rota a confirmar) — também consumido pelo dashboard do emissor EMPRESA/CHEFE (RF28.CA06)
**Critérios de aceite cobertos:** RF18.CA01 · RF18.CA02 · RF18.CA03 · RF18.CA04 · RF18.CA05 · RF18.CA06 (RF1–RF18 não têm CAs no board: derivados da HU18 + RF29.CA09, RF33.CA05, RF42.CA08, RF43.CA13, RF45.CA10 e marcados "CA a confirmar")

> **HU18** — COMO administrador do sistema POSSO visualizar indicadores analíticos sobre o uso do DECIA PARA acompanhar a adoção e o desempenho do sistema e subsidiar decisões de melhoria.

Fonte dos indicadores (`UsageIndicator`, TAXONOMIA §12.8): views/procedures MySQL `vw_sessions_by_period`, `vw_decisions_with_trace` (**objetivo 1**), `vw_decisions_with_sources` (**objetivo 3**), `sp_admin_kpis`, `sp_timeseries`; materializados em `MetricSnapshot` a partir de `MetricDefinition` (domínio DECIA) e do `analyticsSnapshotJson` de cada `SessionArchive` (RF17).

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF18.CA01** | Dado ADMIN (ou EMPRESA/CHEFE restritos à própria empresa/departamento, RF28.CA06), quando abre Gestão › Indicadores DECIA, então vê KPIs: sessões por período e por `SessionStatus`, participantes ativos, mensagens por `MessageClass`, divergências resolvidas ÷ abertas (RF10), perguntas respondidas (RF16), decisões VALIDADA/DEVOLVIDA (RF15), reaberturas (RF14), tempo médio até decisão; outro perfil → `403 ACESSO_NEGADO`. |
| **RF18.CA02** | Dado o painel, então exibe a **métrica do objetivo 1** (`vw_decisions_with_trace`: % de projetos CONCLUÍDOS com decisão registrada em sessão DECIA com rastro completo argumentos → tarefas → decisão validada, RF29.CA09) e a **métrica do objetivo 3** (`vw_decisions_with_sources`: proporção de decisões VALIDADAS com justificativa, critérios, fontes institucionais e projeto vinculado, RF33.CA05), cada uma com fórmula, fonte e proxy visíveis (`MetricDefinition`, RF43.CA13). |
| **RF18.CA03** | Dado filtros de período, empresa e departamento, quando aplicados, então `sp_admin_kpis(from, to, companyId, departmentId)` e `sp_timeseries(metricCode, granularity, …)` retornam os valores, as séries aparecem em gráfico e a URL guarda os filtros; filtro de período invertido → `422 VALIDACAO`. |
| **RF18.CA04** | Dado o fechamento diário (job `PipelineJob` tipo RECALC_METRICS — a confirmar) e cada `SessionArchived` (RF17), então `MetricSnapshot` materializa cada métrica (metricCode, scope, scopeId, periodStart/End, value, valuesJson); o painel lê dos snapshots e o período corrente é calculado sob demanda com cache Redis (TTL 5 min, chave por filtros). |
| **RF18.CA05** | Dado amostra abaixo de `MetricDefinition.minSamples`, então o indicador mostra "amostra insuficiente" em vez de valor; os agregados **nunca** expõem conteúdo de mensagens nem lista nominal (RF45.CA10) — somente contagens e proporções; DECIA Points por departamento e custo de IA comprado aparecem conforme RF42.CA08. |
| **RF18.CA06** | Dado o painel filtrado, quando aciono "Exportar", então recebo CSV/JSON dos `MetricSnapshot` filtrados (URL assinada S3 ou download direto), com registro em `audit_log` (KPI_EXPORTED, filtros, correlationId). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class MetricDefinition {
    <<entity>>
    +String code
    +MetricDomain domain
    +String name
    +String formula
    +String sourceDescription
    +String proxyNote
    +String unit
    +int minSamples
  }
  class MetricSnapshot {
    <<entity>>
    +UUID id
    +String metricCode
    +MetricScope scope
    +UUID scopeId
    +LocalDate periodStart
    +LocalDate periodEnd
    +BigDecimal value
    +String valuesJson
    +Instant computedAt
  }
  class UsageIndicator {
    <<entity>>
    vw_sessions_by_period
    vw_decisions_with_trace
    vw_decisions_with_sources
    sp_admin_kpis
    sp_timeseries
  }
  class DeciaSession {
    <<entity>>
    +UUID id
    +UUID companyId
    +UUID departmentId
    +SessionStatus status
    +UUID linkedProjectId
    +Instant startedAt
    +Instant closedAt
    +int messageCount
    +int participantCount
  }
  class SessionArchive {
    <<entity>>
    +UUID id
    +UUID sessionId
    +int messageCount
    +String analyticsSnapshotJson
  }
  class FinalDecision {
    <<entity>>
    +UUID id
    +UUID sessionId
    +DecisionStatus status
    +String citationsJson
    +UUID resultingTaskId
  }
  class DecisionReview {
    <<entity>>
    +UUID id
    +UUID decisionId
    +ReviewOutcome outcome
    +Instant reviewedAt
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +ProjectStatus status
    +UUID sourceSessionId
  }
  class DecisionTraceNode {
    <<entity>>
    +UUID id
    +UUID sessionId
    +TraceNodeType nodeType
  }
  class MessageClassification {
    <<entity>>
    +UUID id
    +UUID sessionId
    +MessageClass label
    +boolean hasEvidence
  }
  class Divergence {
    <<entity>>
    +UUID sessionId
    +DivergenceStatus status
  }
  class AiQuestion {
    <<entity>>
    +UUID sessionId
    +String status
  }
  class ReopenRequest {
    <<entity>>
    +UUID sessionId
    +ReopenStatus status
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +UUID sessionId
  }
  class AiInferenceLog {
    <<entity>>
    +UUID departmentId
    +BigDecimal estimatedCostUsd
    +String quotaSource
  }
  class AuditLog {
    <<entity>>
    +UUID actorId
    +String action
    +String metadataJson
  }

  class MetricDomain {
    <<enum>>
    INOVACAO
    TI
    PROJETOS
    EQUIPES
    DECIA
    PONTOS
  }
  class MetricScope {
    <<enum>>
    GLOBAL
    EMPRESA
    DEPARTAMENTO
  }
  class SessionStatus {
    <<enum>>
    PROPOSTA
    ATIVA
    EM_RESUMO
    EM_DECISAO
    EM_REVISAO
    REABERTA
    ENCERRADA
    ARQUIVADA
  }
  class DecisionStatus {
    <<enum>>
    PROPOSTA
    EM_REVISAO
    VALIDADA
    DEVOLVIDA
    SUBSTITUIDA
  }

  class AdminAnalyticsController {
    <<controller>>
    +kpis(from, to, companyId, departmentId) 200
    +timeseries(metricCode, granularity, filters) 200
    +objectives(filters) 200
    +export(filters, format) 302
  }
  class AnalyticsService {
    <<service>>
    Facade
    +kpis(actor, filters) KpiBoard
    +timeseries(actor, metricCode, filters) Series
    +objectiveMetrics(actor, filters) ObjectiveMetrics
    +export(actor, filters, format) MediaObject
    +onSessionArchived(event) AFTER_COMMIT
    +materializeDaily() scheduled
    -scopeFor(actor) MetricScope
  }
  class MetricCatalogService {
    <<service>>
    +definition(code) MetricDefinition
    +applyMinSamples(value, samples, def) MetricValue
  }
  class UsageIndicatorPort {
    <<port>>
    +adminKpis(filters) KpiRow
    +timeseries(metricCode, granularity, filters) List~Point~
    +decisionsWithTrace(filters) Ratio
    +decisionsWithSources(filters) Ratio
  }
  class MetricSnapshotRepositoryPort {
    <<port>>
    +find(metricCode, scope, scopeId, period) List~MetricSnapshot~
    +upsert(MetricSnapshot)
  }
  class CachePort {
    <<port>>
    +getOrCompute(key, ttl, supplier)
  }
  class MediaStoragePort {
    <<port>>
    +put(bucket, key, bytes) MediaObject
  }
  class MySqlUsageIndicatorAdapter {
    <<adapter>>
    CALL sp_admin_kpis / sp_timeseries
    SELECT vw_decisions_with_trace / vw_decisions_with_sources
  }
  class MetricSnapshotRepository {
    <<adapter>>
    MySQL metric_snapshots
  }
  class RedisCacheAdapter {
    <<adapter>>
    chave kpi por escopo, id e período
  }
  class S3MediaAdapter {
    <<adapter>>
    bucket wai-exports
  }

  MetricSnapshot "*" --> "1" MetricDefinition : metricCode
  MetricSnapshot --> MetricScope
  MetricDefinition --> MetricDomain
  UsageIndicator ..> DeciaSession : vw_sessions_by_period
  UsageIndicator ..> FinalDecision : vw_decisions_with_trace e vw_decisions_with_sources
  UsageIndicator ..> ProjectScheme : projetos CONCLUÍDOS (objetivo 1)
  UsageIndicator ..> DecisionTraceNode : rastro completo (objetivo 1)
  UsageIndicator ..> DecisionReview : VALIDADA / DEVOLVIDA
  UsageIndicator ..> MessageClassification : mensagens por classe
  UsageIndicator ..> Divergence : resolvidas ÷ abertas
  UsageIndicator ..> AiQuestion : respondidas
  UsageIndicator ..> ReopenRequest : reaberturas
  UsageIndicator ..> DeciaPointsLedgerEntry : pontos por departamento
  UsageIndicator ..> AiInferenceLog : custo de IA
  SessionArchive ..> MetricSnapshot : analyticsSnapshotJson materializado (RF17)
  DeciaSession --> SessionStatus
  FinalDecision --> DecisionStatus

  AdminAnalyticsController --> AnalyticsService
  AnalyticsService --> MetricCatalogService
  AnalyticsService --> UsageIndicatorPort
  AnalyticsService --> MetricSnapshotRepositoryPort
  AnalyticsService --> CachePort
  AnalyticsService --> MediaStoragePort
  AnalyticsService ..> AuditLog : KPI_EXPORTED
  MetricCatalogService --> MetricDefinition
  UsageIndicatorPort <|.. MySqlUsageIndicatorAdapter
  MetricSnapshotRepositoryPort <|.. MetricSnapshotRepository
  CachePort <|.. RedisCacheAdapter
  MediaStoragePort <|.. S3MediaAdapter
  MySqlUsageIndicatorAdapter ..> UsageIndicator

  note for UsageIndicator "views e procedures MySQL (TAXONOMIA §12.8) — não é tabela, é a fonte calculada dos KPIs"
  note for MetricSnapshot "tabela metric_snapshots — materialização diária e por SessionArchived .. único (metricCode, scope, scopeId, periodStart, periodEnd) .."
  note for MetricDefinition "catálogo metric_definitions (domínio DECIA) — fórmula, fonte, proxy e minSamples documentados em METRICAS_GESTAO.md (RF43.CA13)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["ADMIN / EMPRESA / CHEFE"]
    A0(["Abre Gestão › Indicadores DECIA"])
    A1["Ajusta filtros: período, empresa, departamento"]
    A2["Lê KPIs, métricas dos objetivos 1 e 3 e séries"]
    A3["Aciona Exportar CSV/JSON"]
    A4(["Fim"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["GET /api/admin/decia/kpis?from&to&companyId&departmentId"]
    B2["GET /api/admin/decia/timeseries?metricCode&granularity&…"]
    B3["GET /api/admin/decia/objectives?…"]
    B4["GET /api/admin/decia/export?format=csv&…"]
    B5["Exibe 403 ACESSO_NEGADO"]
    B6["Exibe 422 VALIDACAO — período inválido"]
    B7["Renderiza tiles, gráfico de séries e cards dos objetivos com fórmula/fonte; 'amostra insuficiente' quando aplicável"]
    B8["URL guarda os filtros (searchParams)"]
  end

  subgraph L3["wai-application (AnalyticsService — Facade)"]
    C1{"perfil ADMIN, EMPRESA ou CHEFE?"}
    C2["scopeFor(actor): GLOBAL · EMPRESA · DEPARTAMENTO (restringe filtros)"]
    C3{"from ≤ to?"}
    C4{"período fechado (≤ ontem)?"}
    C5["Lê MetricSnapshot do período"]
    C6["CachePort.getOrCompute(kpi:{scope}:{id}:{from}:{to}, TTL 5 min)"]
    C7["UsageIndicatorPort: CALL sp_admin_kpis + SELECT vw_decisions_with_trace, vw_decisions_with_sources"]
    C8["MetricCatalogService.applyMinSamples → valor ou 'amostra insuficiente'"]
    C9["Monta KpiBoard (só contagens e proporções, sem nomes nem mensagens)"]
    C10["Gera CSV/JSON dos snapshots filtrados → S3 wai-exports"]
    C11["AuditLog KPI_EXPORTED (filtros, correlationId)"]
  end

  subgraph L4["Jobs / Listeners"]
    D0(["Gatilhos de materialização"])
    D1["Scheduler diário 00:10: materializeDaily()"]
    D2["Listener SessionArchived (RF17): analyticsSnapshotJson"]
    D3["Para cada MetricDefinition domínio DECIA e cada escopo: CALL sp_timeseries → upsert MetricSnapshot"]
    D4["Invalida cache Redis do escopo"]
  end

  subgraph L5["Persistência"]
    E1[("MySQL metric_definitions · metric_snapshots")]
    E2[("MySQL views/procedures: vw_sessions_by_period · vw_decisions_with_trace · vw_decisions_with_sources · sp_admin_kpis · sp_timeseries")]
    E3[("Redis kpi cache")]
    E4[("S3 wai-exports + MySQL media_objects · audit_log")]
  end

  A0 --> B1 --> C1
  C1 -->|não| B5 --> A4
  C1 -->|sim| C2 --> C3
  C3 -->|não| B6 --> A1
  C3 -->|sim| C4
  C4 -->|sim| C5 --> E1
  C4 -->|não| C6 --> E3
  C6 -->|miss| C7 --> E2
  C7 --> C8
  C5 --> C8 --> C9 --> B7 --> A2
  A2 --> A1 --> B8 --> B1
  A1 --> B2 --> C2
  A1 --> B3 --> C2
  A2 --> A3 --> B4 --> C1
  C2 -->|export| C10 --> E4
  C10 --> C11 --> E4
  C11 --> A4
  D0 --> D1 --> D3
  D0 --> D2 --> D3
  D3 --> E2
  D3 --> E1
  D3 --> D4 --> E3
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (ADMIN)
  participant FE as Next.js (App Router)
  participant C as Controller (wai-web)
  participant S as Service (wai-application)
  participant DB as Repository/MySQL
  participant RD as Redis
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — KPIs com snapshots + período corrente em cache, métricas dos objetivos 1 e 3, exportação
    U->>FE: Abre /admin/dashboard › Indicadores DECIA (from, to, departmentId)
    FE->>C: GET /api/admin/decia/kpis?from&to&companyId&departmentId
    C->>S: AnalyticsService.kpis(actor, filters)
    S->>S: scopeFor(actor) = GLOBAL (ADMIN) e valida from ≤ to
    S->>DB: SELECT metric_snapshots WHERE metricCode IN (catálogo DECIA) AND period ⊂ [from, to - 1d]
    S->>RD: GET kpi:GLOBAL:dept:{from}:{to}
    RD-->>S: miss
    S->>DB: CALL sp_admin_kpis(from, to, companyId, departmentId)
    DB-->>S: sessões por status, participantes ativos, mensagens por classe, divergências resolvidas/abertas, perguntas respondidas, decisões VALIDADA/DEVOLVIDA, reaberturas, tempo médio até decisão
    S->>DB: SELECT vw_decisions_with_trace (objetivo 1) e vw_decisions_with_sources (objetivo 3)
    DB-->>S: ratios {numerador, denominador}
    S->>DB: SELECT metric_definitions (formula, sourceDescription, proxyNote, minSamples)
    S->>S: applyMinSamples → "amostra insuficiente" quando denominador < minSamples
    S->>RD: SET kpi:GLOBAL:dept:{from}:{to} TTL 300s
    S-->>C: 200 KpiBoard {tiles, objective1, objective3, definitions}
    C-->>FE: 200
    FE-->>U: Tiles + cards dos objetivos com fórmula e fonte
    FE->>C: GET /api/admin/decia/timeseries?metricCode=decia.sessions_closed&granularity=week
    C->>S: AnalyticsService.timeseries(actor, metricCode, filters)
    S->>DB: SELECT metric_snapshots (semanas fechadas) + CALL sp_timeseries (semana corrente)
    S-->>C: 200 Series
    C-->>FE: 200
    FE-->>U: Gráfico de evolução — URL guarda os filtros
    U->>FE: Clica "Exportar CSV"
    FE->>C: GET /api/admin/decia/export?format=csv&from&to&departmentId
    C->>S: AnalyticsService.export(actor, filters, CSV)
    S->>DB: SELECT metric_snapshots filtrados
    S->>S3: PUT wai-exports/kpis-{from}-{to}.csv
    S->>DB: INSERT media_objects + audit_log (KPI_EXPORTED, filtros, correlationId)
    S-->>C: 302 URL assinada
    C-->>FE: 302
    FE-->>U: Download do CSV
    Note over S,EV: Materialização assíncrona
    EV-->>S: AnalyticsService.onSessionArchived(sessionId, analyticsSnapshotJson) (RF17)
    S->>DB: CALL sp_timeseries(metricCode, day, scope) por métrica DECIA → UPSERT metric_snapshots
    S->>RD: DEL kpi:*:{scope}:* (invalida cache do escopo)
    Note over S,DB: Scheduler diário 00:10 → materializeDaily() repete o UPSERT para o dia fechado
  end

  alt RF18.CA01 — perfil sem acesso
    FE->>C: GET /api/admin/decia/kpis
    C->>S: kpis(actor EMPREGADO, filters)
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
  else RF18.CA01 — CHEFE fora do próprio departamento
    C->>S: kpis(actor CHEFE, departmentId ≠ actor.departmentId)
    S->>S: scopeFor(actor) = DEPARTAMENTO → filtro forçado ao próprio departamento
    S-->>C: 200 (escopo restrito) ou 403 ACESSO_NEGADO se explícito
  else RF18.CA03 — período inválido
    C->>S: kpis(actor, from > to)
    S-->>C: 422 VALIDACAO
    C-->>FE: 422
  else RF18.CA05 — amostra insuficiente
    DB-->>S: vw_decisions_with_sources {numerador 2, denominador 3}
    S->>S: denominador < minSamples (10) → valor = null, flag "amostra insuficiente"
    S-->>C: 200 objective3 {insufficientSample: true}
  end
```

## 4. Máquina de estados

O RF18 não tem estados próprios: ele **lê** `DeciaSession.status` (`SessionStatus`), entidade contada por `vw_sessions_by_period`. Abaixo, o ciclo com o indicador que cada estado/transição alimenta.

```mermaid
stateDiagram-v2
  [*] --> PROPOSTA : sessões propostas (adoção)
  PROPOSTA --> ATIVA : sessões ativas por período — vw_sessions_by_period
  ATIVA --> EM_RESUMO : taxa de sessões que chegam ao resumo (RF11)
  EM_RESUMO --> EM_DECISAO : resumos publicados
  EM_DECISAO --> EM_REVISAO : decisões encaminhadas (RF12)
  EM_REVISAO --> REABERTA : reaberturas ÷ decisões devolvidas (RF14)
  REABERTA --> EM_RESUMO : ciclos por sessão
  EM_REVISAO --> ENCERRADA : decisões VALIDADA ÷ DEVOLVIDA, tempo médio até decisão (RF15)
  ATIVA --> ENCERRADA : sessões encerradas sem decisão (RF17.CA02)
  ENCERRADA --> ARQUIVADA : SessionArchive → analyticsSnapshotJson → MetricSnapshot (RF17)
  ARQUIVADA --> [*]

  note right of ARQUIVADA
    objetivo 1 — vw_decisions_with_trace:
    projetos CONCLUÍDOS com decisão VALIDADA em sessão DECIA e rastro completo ÷ projetos CONCLUÍDOS
    objetivo 3 — vw_decisions_with_sources:
    decisões VALIDADAS com rationale, evaluationCriteria, citations ≠ vazio e linkedProjectId ÷ decisões VALIDADAS
  end note
  note left of ATIVA
    mensagens por MessageClass, argumentos com evidência
    divergências resolvidas ÷ abertas (RF10)
    perguntas respondidas (RF16)
    DECIA Points por departamento (RF42.CA08)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/admin/dashboard/page.tsx — Indicadores DECIA"]
    FE2["app/companies/[slug] · app/departments/[slug] — dashboard do emissor (RF28.CA06)"]
    FE3["components/ui/KpiTile · ObjectiveCard (fórmula/fonte) · TimeseriesChart · FilterBar · ExportButton"]
  end

  subgraph WEB["wai-web"]
    W1["AdminAnalyticsController (REST /api/admin/decia/kpis, /timeseries, /objectives, /export)"]
    W2["RoleGuard (ADMIN · EMPRESA · CHEFE) + escopo por perfil"]
  end

  subgraph APP["wai-application"]
    S1["AnalyticsService (Facade)"]
    S2["MetricCatalogService (MetricDefinition, minSamples)"]
    S3["Scheduler materializeDaily (00:10)"]
    P1["UsageIndicatorPort"]
    P2["MetricSnapshotRepositoryPort"]
    P3["CachePort"]
    P4["MediaStoragePort"]
    P5["DomainEventPublisher (outbox) — SessionArchived"]
  end

  subgraph DOM["wai-domain"]
    D1["MetricDefinition · MetricSnapshot"]
    D2["DeciaSession · FinalDecision · DecisionReview · ProjectScheme · DecisionTraceNode · MessageClassification · Divergence · AiQuestion · ReopenRequest · DeciaPointsLedgerEntry · AiInferenceLog (leitura agregada)"]
    D3["AuditLog"]
    D4["Enums: MetricDomain · MetricScope · SessionStatus · DecisionStatus"]
  end

  subgraph INFRA["wai-infrastructure"]
    I1["persistence-mysql: MySqlUsageIndicatorAdapter (CALL sp_admin_kpis, sp_timeseries; SELECT vw_sessions_by_period, vw_decisions_with_trace, vw_decisions_with_sources), MetricSnapshotRepository, MetricDefinitionRepository, AuditLogRepository — Flyway cria views/procedures"]
    I2["cache-redis: RedisCacheAdapter (kpi:{scope}:{id}:{from}:{to}, TTL 300s)"]
    I3["storage-s3: S3MediaAdapter (bucket wai-exports)"]
    I4["platform: SchedulerAdapter, OutboxRelay, AuditLogAdapter"]
  end

  MY[("MySQL 8 — views e procedures")]
  RD[("Redis")]
  S3[("S3 / MinIO")]

  FE1 --> FE3
  FE2 --> FE3
  FE3 -->|HTTPS/JSON| W1 --> W2 --> S1
  S1 --> S2
  S1 --> P1
  S1 --> P2
  S1 --> P3
  S1 --> P4
  S3 --> S1
  P5 -.->|AFTER_COMMIT SessionArchived| S1
  S1 --> D1
  S1 --> D3
  S2 --> D1
  P1 -.-> I1
  P2 -.-> I1
  P3 -.-> I2
  P4 -.-> I3
  I1 -.->|agrega| D2
  D1 --> D4
  I4 --> S3
  I1 --> MY
  I2 --> RD
  I3 --> S3
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF18.CA01 | `AnalyticsService.kpis/scopeFor`, `UsageIndicatorPort.adminKpis` (`sp_admin_kpis`, `vw_sessions_by_period`), `MetricScope`, `RoleGuard` | A0, B1, C1, C2, C7, C9, B5, B7 | 1–9, 15–17; `alt` 403 / escopo CHEFE | todos os estados contados em vw_sessions_by_period | `AdminAnalyticsController.kpis`, `RoleGuard`, `MySqlUsageIndicatorAdapter`, `KpiTile` |
| RF18.CA02 | `UsageIndicatorPort.decisionsWithTrace/decisionsWithSources` (`vw_decisions_with_trace`, `vw_decisions_with_sources`), `MetricDefinition` (formula, sourceDescription, proxyNote), `FinalDecision.citationsJson`, `DecisionTraceNode`, `ProjectScheme` | C7, C8, B7 | 10–12, 15 | nota de ARQUIVADA (objetivos 1 e 3) | `ObjectiveCard`, `MetricCatalogService`, Flyway (views) |
| RF18.CA03 | `AnalyticsService.timeseries`, `UsageIndicatorPort.timeseries` (`sp_timeseries`), validação from ≤ to | A1, B2, B3, B8, C3, B6 | 18–23; `alt` 422 VALIDACAO | — | `TimeseriesChart`, `FilterBar`, `MySqlUsageIndicatorAdapter` |
| RF18.CA04 | `MetricSnapshot`, `MetricSnapshotRepositoryPort.upsert`, `AnalyticsService.onSessionArchived/materializeDaily`, `CachePort` (TTL 300s), `SessionArchive.analyticsSnapshotJson` | C4–C6, D0–D4 | 5–7, 14, 33–36 | ENCERRADA → ARQUIVADA alimenta MetricSnapshot | `SchedulerAdapter`, `RedisCacheAdapter`, `MetricSnapshotRepository`, `OutboxRelay` |
| RF18.CA05 | `MetricDefinition.minSamples`, `MetricCatalogService.applyMinSamples`, KpiBoard só com agregados, `DeciaPointsLedgerEntry`/`AiInferenceLog` agregados por departamento | C8, C9 | 13; `alt` amostra insuficiente | nota de ATIVA (pontos por departamento) | `MetricCatalogService`, `ObjectiveCard` ("amostra insuficiente") |
| RF18.CA06 | `AnalyticsService.export`, `MediaStoragePort`, `MediaObject`, `AuditLog` KPI_EXPORTED | A3, B4, C10, C11 | 24–32 | — | `ExportButton`, `S3MediaAdapter`, `AuditLogAdapter` |
