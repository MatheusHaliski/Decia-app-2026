# RF43 — Usar a IA do sistema — insights do Acervo e do Perfil, ranking de usuários, motor do DECIA e Autopilot para criar tarefas e sugerir novos projetos com custo, tempo, prazo e viabilidade (EVM, CPM, PERT, Monte Carlo, ROI, matriz de risco)
**HU:** HU43 · **Sprint (board Work Station):** Product Backlog (não priorizado — pós-Sprint 4) · **Equivalente FAI:** RF24 Usar a IA do sistema (Strategy + Chain of Responsibility primário → alternativa → motor local, `ai_inference_log`, circuit breaker, fallback) + sugestões do Copilot (RF10) + Inventory Score (RF29) + Hype Score · **Aba/rota:** Insights (`/insights`: Acervo · Perfil · Equipe · Ranking · Projetos sugeridos), Autopilot (`/autopilot`, estende o RF30), painel "IA do sistema" no admin (RF18)
**Critérios de aceite cobertos:** RF43.CA01 · RF43.CA02 · RF43.CA03 · RF43.CA04 · RF43.CA05 · RF43.CA06 · RF43.CA07 · RF43.CA08 · RF43.CA09 · RF43.CA10 · RF43.CA11 · RF43.CA12 · RF43.CA13 · RF43.CA14 · RF43.CA15

> Contexto IA do sistema (bounded context 10). Núcleo: `AiEngine` (Strategy + Chain of Responsibility: `ClaudeAdapter` → `GeminiAdapter` → `LocalEngine`) com `AiProviderCircuitState` (CLOSED → OPEN → HALF_OPEN), retry/timeout, `AiQuota` (mensal + créditos comprados, RF42) e `FeatureFlag` por função. **Privacidade:** `accessClass` RESTRITO/SIGILOSO nunca sai para provedor externo. **Regra de ouro:** a IA só redige sobre números calculados por serviços de domínio testáveis (`MetricDefinition`, `FeasibilityService`), nunca inventa. Entidades de saída: `Insight`, `RankingEntry`, `FeasibilitySheet` (status PROPOSTA → ACEITA | DESCARTADA), `AiInferenceLog`.

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class AiInferenceLog {
    <<entity>>
    +UUID id
    +UUID userId
    +UUID departmentId
    +AiCapability capability
    +String hostRf
    +AiProvider provider
    +String model
    +AiMode mode
    +int latencyMs
    +int inputTokens
    +int outputTokens
    +BigDecimal estimatedCostUsd
    +InferenceResult result
    +boolean fallbackUsed
    +String maskedFields
    +BigDecimal confidence
    +String quotaSource
    +String correlationId
  }
  class AiQuota {
    <<entity>>
    +String scope
    +UUID scopeId
    +String monthKey
    +int monthlyLimit
    +int consumed
    +int purchasedCredits
    +Instant resetAt
  }
  class AiProviderCircuitState {
    <<entity>>
    +AiProvider provider
    +CircuitState state
    +int failures
    +Instant openedAt
  }
  class FeatureFlag {
    <<entity>>
    +String key
    +boolean enabled
    +String scope
    +String rolloutJson
  }
  class Insight {
    <<entity>>
    +UUID id
    +InsightScope scope
    +UUID scopeId
    +String kind
    +String title
    +String bodyMd
    +List~MetricRef~ metricRefsJson
    +List~Action~ actionsJson
    +String severity
    +UUID aiInferenceId
    +Instant dismissedAt
    +Instant generatedAt
  }
  class FeasibilitySheet {
    <<entity>>
    +UUID id
    +String candidateTitle
    +String demandRef
    +String costJson
    +String timeJson
    +String deadlineJson
    +String viabilityScoreJson
    +String risksJson
    +String wbsJson
    +String raciJson
    +String assumptionsJson
    +String unknownsJson
    +SheetStatus status
    +String discardReason
    +UUID resultingProjectId
    +UUID resultingTaskId
    +UUID aiInferenceId
  }
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
    +String scope
    +UUID scopeId
    +LocalDate periodStart
    +LocalDate periodEnd
    +BigDecimal value
    +String valuesJson
  }
  class RankingEntry {
    <<entity>>
    +UUID id
    +String scope
    +UUID scopeId
    +String periodKey
    +RankingDimension dimension
    +UUID userId
    +BigDecimal value
    +int position
    +String explanationJson
  }
  class RankingWeights {
    <<entity>>
    +UUID id
    +UUID companyId
    +int version
    +String weightsJson
    +String criteriaPublicText
    +Instant validFrom
    +UUID editedBy
  }
  class User {
    <<entity>>
    +UUID id
    +boolean rankingOptOut
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +AccessClassification accessClass
    +TaskState state
    +SourceKind sourceKind
    +boolean aiGenerated
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +SchemeOrigin origin
    +ProjectStatus status
    +String criticalPathJson
    +String evmJson
  }
  class ProjectTask {
    <<entity>>
    +BigDecimal pertOptimistic
    +BigDecimal pertMostLikely
    +BigDecimal pertPessimistic
    +BigDecimal plannedValue
    +BigDecimal earnedValue
    +BigDecimal actualCost
    +boolean isCritical
    +int slackDays
  }
  class DeciaSession {
    <<entity>>
    +UUID id
    +AiMode aiMode
    +UUID linkedProjectId
  }
  class Citation {
    <<entity>>
    +String sourceType
    +UUID sourceId
    +String excerpt
    +BigDecimal score
  }
  class AiCreditLedgerEntry {
    <<entity>>
    +UUID userId
    +int delta
    +String source
  }

  class AiCapability {
    <<enum>>
    CLASSIFICAR_MENSAGEM
    RESUMO_ANALITICO
    AUTOPILOT_PROJETO
    AUTOPILOT_TAREFAS
    INSIGHT
    MEMORIA_BUSCA
    ...21 valores
  }
  class AiProvider {
    <<enum>>
    CLAUDE
    GEMINI
    LOCAL
  }
  class AiMode {
    <<enum>>
    ECONOMIA
    AVANCADO
  }
  class InferenceResult {
    <<enum>>
    OK
    FALLBACK
    ERRO
    BLOQUEADO_SIGILO
  }
  class CircuitState {
    <<enum>>
    CLOSED
    OPEN
    HALF_OPEN
  }
  class InsightScope {
    <<enum>>
    ACERVO
    PERFIL
    EQUIPE
    PROJETO
  }
  class SheetStatus {
    <<enum>>
    PROPOSTA
    ACEITA
    DESCARTADA
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
  class RankingDimension {
    <<enum>>
    QUALIDADE_DELIBERATIVA
    DECIA_POINTS
    REUTILIZACAO
    RASTRO_CONFORMIDADE
    PONTUALIDADE_SPI
    HSE_MEDIO
    HYPE_PERFIL
  }

  class InsightController {
    <<controller>>
    +GET insights_acervo
    +GET insights_perfil
    +GET insights_equipe
    +POST insights_id_action
  }
  class RankingController {
    <<controller>>
    +GET rankings
    +GET rankings_explain_me
    +PUT rankings_weights
    +POST rankings_opt_out
  }
  class AutopilotController {
    <<controller>>
    +POST autopilot_tasks
    +POST autopilot_projects
    +POST feasibility_id_accept
    +POST feasibility_id_discard
    +GET projects_id_evm
  }
  class AdminAiController {
    <<controller>>
    +GET admin_ai_dashboard
  }
  class AiEngine {
    <<service>>
    +run(capability, input, accessClass, mode) AiResult
    -guardPrivacy(input, accessClass) MaskedInput
    -guardQuota(userId, departmentId) QuotaSource
    -chain() List~AiProviderPort~
    -log(result) AiInferenceLog
  }
  class AiProviderPort {
    <<port>>
    +infer(prompt, model, timeout) ProviderResult
    +name() AiProvider
  }
  class ClaudeAdapter {
    <<adapter>>
  }
  class GeminiAdapter {
    <<adapter>>
  }
  class LocalEngine {
    <<adapter>>
    +rules()
    +localEmbeddings()
    +pmHeuristics()
  }
  class CircuitBreaker {
    <<service>>
    +allow(provider) boolean
    +onSuccess(provider) void
    +onFailure(provider) void
  }
  class InsightService {
    <<service>>
    +acervo(userId) List~Insight~
    +perfil(userId, consent) List~Insight~
    +equipe(departmentId, viewer) List~Insight~
    +applyAction(insightId, actionCode) void
  }
  class RankingService {
    <<service>>
    +compute(scope, scopeId, period, dimension) List~RankingEntry~
    +explain(userId, dimension) Explanation
    +updateWeights(companyId, weights, editor) RankingWeights
  }
  class AutopilotService {
    <<service>>
    +tasksFrom(source, text) List~TaskItem~
    +suggestProjects(userId, max5) List~FeasibilitySheet~
    +accept(sheetId, target) ProjectScheme
    +discard(sheetId, reason) FeasibilitySheet
  }
  class FeasibilityService {
    <<service>>
    +pert(o, m, p) Estimate
    +cpm(tasks, deps) CriticalPath
    +monteCarlo(tasks, runs1000) ProbabilityOnTime
    +evm(project) EvmIndicators
    +costBands(wbs) P10P50P90
    +riskMatrix(risks) Top5
    +viabilityScore(dims) Score0to100
  }
  class MetricCalculator {
    <<service>>
    +compute(metricCode, scope, period) MetricSnapshot
  }

  AiInferenceLog --> AiCapability : capability
  AiInferenceLog --> AiProvider : provider
  AiInferenceLog --> AiMode : mode
  AiInferenceLog --> InferenceResult : result
  AiProviderCircuitState --> CircuitState : state
  AiProviderCircuitState --> AiProvider : provider
  Insight --> InsightScope : scope
  Insight ..> MetricDefinition : metricRefsJson cita code, value, formula, source, proxy
  Insight ..> AiInferenceLog : aiInferenceId
  FeasibilitySheet --> SheetStatus : status
  FeasibilitySheet ..> ProjectScheme : resultingProjectId (origin AUTOPILOTO)
  FeasibilitySheet ..> TaskItem : resultingTaskId ESTUDO_TECNICO_PRELIMINAR
  MetricDefinition --> MetricDomain : domain
  MetricSnapshot --> MetricDefinition : metricCode
  RankingEntry --> RankingDimension : dimension
  RankingEntry ..> RankingWeights : pesos públicos
  RankingEntry ..> User : rankingOptOut
  ProjectScheme "1" --> "*" ProjectTask : PERT e EVM por tarefa
  DeciaSession --> AiMode : aiMode
  AiQuota ..> AiCreditLedgerEntry : purchasedCredits

  InsightController --> InsightService
  RankingController --> RankingService
  AutopilotController --> AutopilotService
  AdminAiController ..> AiInferenceLog
  InsightService --> AiEngine : INSIGHT
  InsightService --> MetricCalculator
  RankingService --> MetricCalculator
  AutopilotService --> AiEngine : AUTOPILOT_PROJETO e AUTOPILOT_TAREFAS
  AutopilotService --> FeasibilityService
  AiEngine --> AiProviderPort : chain primário → alternativo → local
  AiProviderPort <|.. ClaudeAdapter
  AiProviderPort <|.. GeminiAdapter
  AiProviderPort <|.. LocalEngine
  AiEngine --> CircuitBreaker
  CircuitBreaker ..> AiProviderCircuitState
  AiEngine ..> AiQuota
  AiEngine ..> FeatureFlag
  AiEngine ..> AiInferenceLog
  AiEngine ..> Citation : MEMORIA_BUSCA (RF33)
  MetricCalculator ..> MetricSnapshot

  note for AiEngine "Strategy + Chain of Responsibility · timeout e retry por provedor · nada vira decisão, chancela, ranking ou projeto sem confirmação humana"
  note for FeasibilityService "wai-domain · determinístico e testável · funciona sem chave externa (RF43.CA11) · documentado em METRICAS_GESTAO.md"
  note for MetricCalculator "um serviço de domínio por métrica do catálogo A–D · fórmula, fonte e proxy (RF43.CA13)"
  note for AiProviderCircuitState "Redis · nomes AiProvider, InferenceResult, CircuitState, InsightScope, SheetStatus, MetricDomain a confirmar"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#FFE3E3,stroke:#C0392B,color:#5B1A12
  classDef ai fill:#FFF3D6,stroke:#D68910,color:#5C3B00
  classDef store fill:#EEF6FF,stroke:#4A4852,color:#1F2937

  subgraph L_user["Ator humano · EMPREGADO · CHEFE · EMPRESA · ADMIN"]
    U1["Abre /autopilot › Projetos sugeridos"]
    U2["Revisa até 5 candidatos ordenados por viabilidade, cada um com Ficha de Viabilidade"]
    U3{"Aceita, abre sessão DECIA ou descarta?"}
    U4["Informa motivo do descarte"]
    U5["Abre /insights (Acervo · Perfil · Equipe · Ranking) e clica Explique minha posição ou uma ação de 1 clique"]
    U6["ADMIN abre painel IA do sistema"]
  end

  subgraph L_web["Web/BFF · Next.js /autopilot · /insights · /admin/ai"]
    W1["POST /autopilot/projects"]
    W2["Ficha: custo P10/P50/P90, PERT/CPM, Monte Carlo pOnTime, score decomposto, top 5 riscos, WBS, RACI, premissas, o que a IA não sabe · faísca ✦ + aviso de fallback ou motor local"]
    W3["POST /feasibility/id/accept (PROJETO | SESSAO) · POST /feasibility/id/discard (reason)"]
    W4["GET /insights/* · GET /rankings?dimension=&period= · GET /rankings/explain-me · POST /insights/id/action"]
    W5["Tela explica o que falta coletar quando amostra insuficiente (sem números vazios)"]
    W6["GET /admin/ai/dashboard: custo e latência por função e departamento, taxa de fallback, taxa de aceitação, cotas, alertas de custo"]
  end

  subgraph L_app["wai-application · AutopilotService · FeasibilityService · InsightService · RankingService"]
    S1["AutopilotService.suggestProjects: candidatos de eixos do plano sem projeto, lacunas por processo, decisões sem projeto, metas, histórico (RF33)"]
    S2["FeasibilityService (determinístico): PERT O/M/P por tarefa · CPM caminho crítico e folgas · Monte Carlo 1000 execuções → pOnTime · custo paramétrico + análogo P10/P50/P90 · matriz P×I top 5 · ROI/payback/VPL · WBS · RACI · SMART · score 0–100"]
    S3["Persiste FeasibilitySheet PROPOSTA (≤5) com assumptionsJson e unknownsJson"]
    S4{"Ação?"}
    S5["accept PROJETO: ProjectScheme RASCUNHO (origin AUTOPILOTO) + tarefas/kits pré-selecionados + TaskItem ESTUDO_TECNICO_PRELIMINAR (✦) · FeasibilitySheet ACEITA"]
    S6["accept SESSAO: DeciaSession com topic da ficha (RF29) · ACEITA"]
    S7{"Motivo informado?"}
    S8["FeasibilitySheet DESCARTADA (discardReason alimenta próximas sugestões)"]
    S9["InsightService: Score do Acervo (0–100) com decomposição · paradas, duplicadas, fantasma, lacunas, prazos em risco · modelos recomendados do Balcão · ações 1 clique (arquivar, repassar, criar faltante, mesclar)"]
    S10{"Perfil: viewer é o dono? Equipe: viewer é CHEFE/EMPRESA do departamento?"}
    S11{"Amostra mínima? (A/B: 3 projetos ou sinais · pesquisas D: 5 respondentes)"}
    S12["MetricCalculator por métrica do catálogo A–D (fórmula, fonte, proxy) → MetricSnapshot · comparação anonimizada · resumo profissional só com consentimento"]
    S13["RankingService.compute: dimensões separadas, pesos públicos (RankingWeights vigente), opt-out respeitado, volume bruto de mensagens nunca é critério · explain(userId)"]
    S14["Projeto em execução: evm(PV, EV, AC, CPI, SPI, EAC, ETC, VAC, TCPI) + caminho crítico + burndown/fluxo cumulativo · alerta SPI menor que 0,9 há 2 semanas → recomendação + link Simulador (RF31)"]
    E1["422 MOTIVO_OBRIGATORIO"]
    E2["403 ACESSO_NEGADO"]
    E3["409 COTA_ESGOTADA → Loja Work AI"]
  end

  subgraph L_ai["IA (AiEngine) · Strategy + Chain"]
    I1{"FeatureFlag da função habilitada?"}
    I2{"accessClass RESTRITO ou SIGILOSO?"}
    I3["guardPrivacy: mascara dados pessoais (LGPD) → maskedFields"]
    I4{"guardQuota: créditos comprados → cota mensal → DECIA Points (modo AVANCADO)?"}
    I5{"CircuitBreaker.allow(primário)?"}
    I6["Provedor primário (Claude ou Gemini) com timeout e retry"]
    I7{"Sucesso?"}
    I8["onFailure → failures+1 · OPEN se limiar · tenta alternativo"]
    I9{"Alternativo ok?"}
    I10["LocalEngine: regras, embeddings locais, heurísticas de PM · redação simplificada · aviso de fallback"]
    I11["Redige narrativa SÓ sobre números do FeasibilityService/MetricCalculator · cita métrica e valor · confiança + explicação"]
    I12["AiInferenceLog: provider, model, mode, latency, tokens, custo, result (OK | FALLBACK | ERRO | BLOQUEADO_SIGILO), fallbackUsed, maskedFields, quotaSource, correlationId"]
  end

  subgraph L_db["Persistência"]
    D1["MySQL feasibility_sheets · project_schemes · project_tasks (PERT, EVM) · tasks ESTUDO_TECNICO_PRELIMINAR"]
    D2["MySQL insights · metric_definitions · metric_snapshots · ranking_entries · ranking_weights · Redis rankings"]
    D3["Redis quota:scope:id:mês · circuit:provider · MySQL ai_quotas · ai_credit_ledger"]
    D4["MySQL ai_inference_log · feature_flags · audit_log (pesos editados com vigência)"]
    D5["OpenSearch wai-memory (projetos semelhantes, citações RF33)"]
  end

  U1 --> W1 --> S1 --> D5
  S1 --> S2 --> S3 --> D1
  S3 --> I1
  I1 -- "não" --> I10
  I1 -- "sim" --> I2
  I2 -- "sim" --> I10
  I2 -- "não" --> I3 --> I4
  I4 -- "sem cota" --> E3
  I4 -- "ok" --> I5
  I5 -- "OPEN" --> I9
  I5 -- "CLOSED ou HALF_OPEN" --> I6 --> I7
  I7 -- "sim" --> I11
  I7 -- "não (timeout, erro)" --> I8 --> I9
  I9 -- "sim" --> I11
  I9 -- "não" --> I10 --> I11
  I11 --> I12 --> D4
  I4 --> D3
  I5 --> D3
  I11 --> W2 --> U2 --> U3
  U3 -- "aceitar" --> W3 --> S4
  U3 -- "descartar" --> U4 --> W3
  S4 -- "PROJETO" --> S5 --> D1
  S4 -- "SESSAO" --> S6 --> D1
  S4 -- "descartar" --> S7
  S7 -- "não" --> E1
  S7 -- "sim" --> S8 --> D1

  U5 --> W4 --> S10
  S10 -- "não" --> E2
  S10 -- "sim" --> S11
  S11 -- "não" --> W5
  S11 -- "sim" --> S12 --> D2
  S12 --> S9 --> I1
  S12 --> S13 --> D2
  S12 --> S14 --> D1
  S9 --> D2
  S13 --> I1

  U6 --> W6 --> D4
  W6 --> D3

  class E1,E2,E3 err
  class I1,I2,I3,I4,I5,I6,I7,I8,I9,I10,I11,I12 ai
  class D1,D2,D3,D4,D5 store
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (wai-web)
  participant S as Service (wai-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: Autopilot de Projetos com Ficha de Viabilidade
  U->>N: Sugerir novos projetos
  N->>C: POST /autopilot/projects
  C->>S: AutopilotService.suggestProjects(userId, 5)
  S->>DB: SELECT plan_axes sem projeto · final_decisions sem projeto · collective_goals · metric_snapshots
  S->>OS: kNN wai-memory (projetos e planilhas semelhantes, RF33) → citações
  S->>S: FeasibilityService: PERT, CPM, Monte Carlo 1000 runs, custo P10/P50/P90, EVM histórico, matriz P×I, ROI/VPL, WBS, RACI, score
  S->>DB: INSERT feasibility_sheets (PROPOSTA ×5, assumptionsJson, unknownsJson)
  S->>AI: run(AUTOPILOT_PROJETO, números das fichas, accessClass INTERNO, ECONOMIA)
  AI->>R: GET quota:USER:id:mês (créditos comprados antes da mensal)
  alt sem cota nem créditos
    AI-->>S: QuotaExceeded
    S-->>N: 409 COTA_ESGOTADA (atalho para a Loja Work AI)
  else accessClass RESTRITO ou SIGILOSO em alguma fonte
    AI->>AI: LocalEngine redige (sem saída externa) · result BLOQUEADO_SIGILO
    AI->>DB: INSERT ai_inference_log (provider LOCAL, maskedFields)
    AI-->>S: narrativa simplificada + aviso motor local
  else cota ok
    AI->>R: GET circuit:CLAUDE
    AI->>AI: ClaudeAdapter.infer (timeout 20 s, retry 1)
    alt primário falha ou timeout
      AI->>R: INCR failures · SET circuit:CLAUDE OPEN se limiar
      AI->>AI: GeminiAdapter.infer
      alt alternativo também falha
        AI->>AI: LocalEngine (regras + heurísticas de PM) · redação simplificada
        AI->>DB: INSERT ai_inference_log (result FALLBACK, fallbackUsed, latency, custo 0, correlationId)
        AI-->>S: narrativa + aviso de fallback
      else alternativo ok
        AI->>DB: INSERT ai_inference_log (provider GEMINI, result FALLBACK, fallbackUsed)
        AI-->>S: narrativa + aviso de fallback
      end
    else primário ok
      AI->>R: onSuccess → circuit CLOSED
      AI->>DB: INSERT ai_inference_log (provider CLAUDE, model, latency, tokens, custo, quotaSource, correlationId)
      AI-->>S: narrativa que cita métrica e valor + confiança + explicação
    end
  end
  S->>DB: UPDATE feasibility_sheets aiInferenceId
  S-->>N: 200 até 5 fichas ordenadas por viabilidade (✦)
  N-->>U: Fichas com premissas, intervalos e o que a IA não sabe

  U->>N: Aceitar ficha 2 como projeto
  N->>C: POST /feasibility/id/accept (PROJETO)
  C->>S: AutopilotService.accept(sheetId, PROJETO)
  S->>DB: INSERT project_schemes (RASCUNHO, origin AUTOPILOTO) · project_tasks (PERT O/M/P, isCritical, slackDays) · tasks ESTUDO_TECNICO_PRELIMINAR (aiGenerated, RASCUNHO)
  S->>DB: UPDATE feasibility_sheets (ACEITA, resultingProjectId, resultingTaskId)
  S->>EV: ProjectCreatedFromAutopilot(projectId)
  S-->>N: 201 ProjectScheme RASCUNHO (RF21)

  U->>N: Descartar ficha 4
  N->>C: POST /feasibility/id/discard (reason vazio)
  C->>S: discard(sheetId, reason)
  alt motivo vazio
    S-->>N: 422 MOTIVO_OBRIGATORIO
  else motivo informado
    S->>DB: UPDATE feasibility_sheets (DESCARTADA, discardReason)
    S-->>N: 200 (motivo alimenta próximas sugestões)
  end

  Note over U,EV: Ranking transparente
  U->>N: Ranking › Pontualidade (SPI) › Explique minha posição
  N->>C: GET /rankings/explain-me?dimension=PONTUALIDADE_SPI
  C->>S: RankingService.explain(userId, PONTUALIDADE_SPI)
  S->>R: GET ranking:DEPARTAMENTO:id:periodo:PONTUALIDADE_SPI
  S->>DB: SELECT ranking_weights vigente · metric_snapshots do usuário
  alt usuário com rankingOptOut
    S-->>N: 200 posição omitida + critérios públicos
  else ok
    S-->>N: 200 posição, valor, pesos públicos, explicação (volume de mensagens não é critério)
  end
```

## 4. Máquina de estados

Duas entidades do RF têm estados próprios: `AiProviderCircuitState.state` (circuit breaker por provedor, §1) e `FeasibilitySheet.status` (§7).

```mermaid
stateDiagram-v2
  direction LR

  state "AiProviderCircuitState (por provedor, Redis)" as CB {
    [*] --> CLOSED
    CLOSED --> CLOSED : sucesso (failures = 0)
    CLOSED --> OPEN : failures atinge o limiar (timeout, 5xx, erro de auth)
    OPEN --> HALF_OPEN : cooldown após openedAt expira
    HALF_OPEN --> CLOSED : requisição de prova ok
    HALF_OPEN --> OPEN : requisição de prova falha
  }

  state "FeasibilitySheet.status" as FS {
    [*] --> PROPOSTA : AutopilotService.suggestProjects (até 5, ordenadas por viabilidade)
    PROPOSTA --> ACEITA : aceitar → ProjectScheme RASCUNHO + ETP ✦ ou DeciaSession (RF29)
    PROPOSTA --> DESCARTADA : descartar com motivo (422 MOTIVO_OBRIGATORIO sem motivo)
    ACEITA --> [*]
    DESCARTADA --> [*]
  }

  note right of CB
    Enquanto OPEN, a Chain pula o provedor:
    primário → alternativo → LocalEngine.
    O resultado registra FALLBACK e fallbackUsed (RF43.CA01).
  end note
  note right of FS
    discardReason alimenta as próximas sugestões (RF43.CA10).
    Nada vira projeto sem o aceite humano.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    FE1["app/insights (Acervo · Perfil · Equipe · Ranking · Projetos sugeridos) · app/autopilot · app/projects/[id] (EVM, caminho crítico, burndown) · app/admin/ai (painel IA do sistema)"]
    FE2["components/ui · AiSpark ✦ + tooltip (modelo, data, revisor) · FallbackBanner · FeasibilityCard · ScoreBreakdown · RiskMatrix · EvmPanel · RankingTable + ExplainMe · InsufficientDataState · OneClickAction"]
  end

  subgraph WEB["wai-web"]
    C1["InsightController"]
    C2["RankingController"]
    C3["AutopilotController"]
    C4["AdminAiController"]
  end

  subgraph APP["wai-application"]
    S1["AiEngine (Strategy + Chain) · guardPrivacy · guardQuota · CircuitBreaker"]
    S2["InsightService"]
    S3["RankingService"]
    S4["AutopilotService"]
    S5["SessionService (RF7–RF16) · modo ECONOMIA/AVANCADO · citações RF33"]
    P1["AiProviderPort"]
    P2["SearchPort (wai-memory)"]
  end

  subgraph DOM["wai-domain · br.gov.pr.secid.workai"]
    D1["FeasibilityService (PERT, CPM, Monte Carlo, EVM, custo, risco, ROI, WBS, RACI, SMART)"]
    D2["MetricCalculator por métrica A–D (METRICAS_GESTAO.md)"]
    D3["AiInferenceLog · AiQuota · AiProviderCircuitState · FeatureFlag · Insight · FeasibilitySheet · MetricDefinition · MetricSnapshot · RankingEntry · RankingWeights · Citation"]
  end

  subgraph INFRA["wai-infrastructure/*"]
    I1["ai-providers · ClaudeAdapter · GeminiAdapter · LocalEngine (regras, embeddings locais, heurísticas de PM) · PII masker"]
    I2["cache-redis · quota por usuário/departamento · circuit state · rankings"]
    I3["persistence-mysql · ai_inference_log, ai_quotas, insights, feasibility_sheets, metric_definitions, metric_snapshots, ranking_entries, ranking_weights, feature_flags"]
    I4["search-opensearch · índice wai-memory (dense_vector)"]
    I5["platform · FeatureFlag (ai.provider.claude, ai.provider.gemini, ai.local.only) · DomainEventOutbox · PipelineJob RECALC_RANKING · AuditLog · scheduler de insights"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude"]
    X2["Gemini"]
    X3["Google Workspace · Microsoft 365 · e-Protocolo (disponibilidade e SLA — métricas B)"]
    X4["SINAPI / SICRO (referência de custo, quando disponíveis)"]
  end

  FE1 --> C1
  FE1 --> C2
  FE1 --> C3
  FE1 --> C4
  FE2 -.-> FE1
  C1 --> S2
  C2 --> S3
  C3 --> S4
  C4 --> D3
  S2 --> S1
  S3 --> D2
  S4 --> S1
  S4 --> D1
  S5 --> S1
  S2 --> D2
  S1 --> P1
  S4 --> P2
  P1 --> I1
  I1 --> X1
  I1 --> X2
  S1 --> I2
  S3 --> I2
  D3 --> I3
  P2 --> I4
  I5 --> S1
  I5 --> S3
  D2 -.-> X3
  D1 -.-> X4
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF43.CA01 | Classes `AiEngine.chain`, `AiProviderPort` + `ClaudeAdapter`/`GeminiAdapter`/`LocalEngine`, `CircuitBreaker`, `AiProviderCircuitState`, `AiInferenceLog` (provider, model, estimatedCostUsd, latencyMs, result FALLBACK, fallbackUsed, correlationId); atividades I5–I10, I12; sequência msgs 16–26 (primário falha → alternativo → local, log completo); máquina de estados `AiProviderCircuitState` (CLOSED → OPEN → HALF_OPEN); componentes `ai-providers`, `FallbackBanner`, `cache-redis · circuit state`. |
| RF43.CA02 | Classes `TaskItem.accessClass`, `AiEngine.guardPrivacy`, `AiInferenceLog.maskedFields/result BLOQUEADO_SIGILO`, enum `InferenceResult`; atividades I2 → I10, I3; sequência msgs 12–14 (LocalEngine, BLOQUEADO_SIGILO, maskedFields); componente `ai-providers · PII masker`. |
| RF43.CA03 | Classes `Insight` (scope ACERVO, metricRefsJson, actionsJson, severity), `InsightService.acervo/applyAction`; atividades U5, W4, S9 (Score 0–100 com decomposição, paradas, duplicadas, fantasma, lacunas, modelos recomendados, ações 1 clique); componentes `ScoreBreakdown`, `OneClickAction`, `app/insights`. |
| RF43.CA04 | Classes `InsightService.perfil(userId, consent)`, `Insight.scope PERFIL`; atividades S10 → E2 (403 só o dono), S12 (comparação anonimizada, resumo profissional só com consentimento); componente `InsightController.GET insights_perfil`. |
| RF43.CA05 | Classes `RankingEntry` (dimension, position, explanationJson), `RankingWeights` (weightsJson, criteriaPublicText, validFrom, editedBy), `User.rankingOptOut`, enum `RankingDimension` (7 dimensões), `RankingService.compute/explain/updateWeights`; atividade S13 (volume bruto nunca é critério); sequência msgs 43–49 (explain-me, opt-out); componentes `RankingTable + ExplainMe`, `PipelineJob RECALC_RANKING`, `AuditLog` (pesos com vigência). |
| RF43.CA06 | Classes `DeciaSession.aiMode`, enum `AiMode`, `Citation`, `AiEngine.guardQuota` (créditos → cota → DECIA Points), `AiQuota`; atividade I4 (modo AVANCADO debita cota ou DP com aviso) e E3; componentes `SessionService · modo ECONOMIA/AVANCADO · citações RF33`, `search-opensearch · wai-memory`. |
| RF43.CA07 | Classes `AutopilotService.tasksFrom`, `TaskItem` (state RASCUNHO, sourceKind AUTOPILOT, aiGenerated), `AiCapability.AUTOPILOT_TAREFAS`; relação `AutopilotService → AiEngine (AUTOPILOT_TAREFAS)`; componente `AutopilotController.POST autopilot_tasks` — nada vira DISPONIVEL sem revisão (RF20/RF41). |
| RF43.CA08 | Classes `FeasibilitySheet` (costJson P10/P50/P90, timeJson PERT/CPM, deadlineJson Monte Carlo 1000, viabilityScoreJson, risksJson top 5, wbsJson, raciJson, assumptionsJson, unknownsJson), `FeasibilityService` (7 métodos), `AutopilotService.suggestProjects(max5)`; atividades S1, S2, S3, W2, U2; sequência msgs 1–7 e 30–32 (até 5 fichas ordenadas); transição `[*] → PROPOSTA`; componentes `FeasibilityCard`, `RiskMatrix`. |
| RF43.CA09 | Classes `ProjectScheme.evmJson/criticalPathJson`, `ProjectTask` (plannedValue, earnedValue, actualCost, isCritical, slackDays), `FeasibilityService.evm/cpm`; atividade S14 (EVM PV, EV, AC, CPI, SPI, EAC, ETC, VAC, TCPI, burndown, alerta SPI menor que 0,9 há 2 semanas → Simulador RF31); componentes `EvmPanel`, `AutopilotController.GET projects_id_evm`. |
| RF43.CA10 | Classes `FeasibilitySheet.status/discardReason/resultingProjectId/resultingTaskId`, `AutopilotService.accept/discard`, `ProjectScheme.origin AUTOPILOTO`, `TaskItem ESTUDO_TECNICO_PRELIMINAR`; atividades U3, W3, S4 → S5/S6, S7 → E1 (422 MOTIVO_OBRIGATORIO), S8; sequência msgs 33–42; transições `PROPOSTA → ACEITA / DESCARTADA` e nota. |
| RF43.CA11 | Nota de `FeasibilityService` (determinístico, sem chave externa), `LocalEngine`; atividades I1 → I10 (flag desabilitada ou sem provedor → motor local, redação simplificada com aviso); sequência msgs 12–14 e 20–22; componentes `wai-domain · FeasibilityService`, `MetricCalculator`, `FeatureFlag ai.local.only`. |
| RF43.CA12 | Classes `AiInferenceLog` (estimatedCostUsd, latencyMs, capability, departmentId, fallbackUsed, quotaSource), `AiQuota`, `FeasibilitySheet.status` (taxa de aceitação), `AdminAiController`; atividades U6, W6; componente `app/admin/ai`. |
| RF43.CA13 | Classes `MetricDefinition` (code, domain, formula, sourceDescription, proxyNote, unit, minSamples), `MetricSnapshot`, `MetricCalculator`, `Insight.metricRefsJson`; atividades S12 (fórmula, fonte, proxy) e I11 (redige só sobre números calculados, cita métrica e valor); nota de `MetricCalculator`; componente `wai-domain · MetricCalculator por métrica A–D (METRICAS_GESTAO.md)`. |
| RF43.CA14 | Classes `InsightService.equipe(departmentId, viewer)`, `Insight.scope EQUIPE`, `MetricDefinition.minSamples`; atividades S10 (CHEFE/EMPRESA) → E2, S11 (pesquisas D: mínimo 5 respondentes), S12 (benchmarks internos anonimizados, tendência, recomendações acionáveis); componente `InsightController.GET insights_equipe`. |
| RF43.CA15 | Classe `MetricDefinition.minSamples` (A/B: 3 projetos ou sinais); atividades S11 → W5 (tela explica o que falta coletar em vez de números vazios); componente `InsufficientDataState`. |
