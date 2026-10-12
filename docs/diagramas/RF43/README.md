# RF43 — Usar a IA do sistema — insights do Acervo e do Perfil, ranking de usuários, motor do DECIA e Autopilot para criar tarefas e sugerir novos projetos com custo, tempo, prazo e viabilidade (EVM, CPM, PERT, Monte Carlo, ROI, matriz de risco)
**HU:** HU43 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4; o `AiEngine` é base de todo RF com IA) · **Equivalente FAI:** RF24 Usar a IA do sistema (Strategy + Chain of Responsibility, `ai_inference_log`, circuit breaker, fallback) + Copilot (RF10) + Inventory Score (RF29) + Hype Score · **Aba/rota:** Insights (`/insights`: Acervo · Perfil · Equipe · Ranking · Projetos sugeridos), Autopilot (`/autopilot`, estende RF30), sessão em modo Avançado (`/decia/[sessionId]`), painel admin **IA do sistema** (`/admin/ai`, RF18), página "Como o ranking é calculado"
**Critérios de aceite cobertos:** RF43.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 · CA15 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs.

**Motor** (`AiEngine`, ARQUITETURA §3.1): `AiRequest(capability, hostRf, userId, deptId, accessClass, payload, mode)` → governança (feature flag por função, `AccessClassification` RESTRITO/SIGILOSO só `LocalEngine`, `Masking` de dados pessoais — existe no main —, `AiQuota` em Redis, `AiBudget` teto diário Q-50, consentimento) → Claude (primário) → Gemini (alternativo) → `LocalEngine` (regras, embeddings locais, PERT/CPM/Monte Carlo/EVM); circuit breaker + retry + timeout (Resilience4j, `AiProviderCircuitState`); **sempre** `AiInferenceLog` (`ai_inference_log` já existe no V2). **Regra de ouro (D-12):** a IA só **interpreta números calculados pelo sistema** — `MetricCalculator` + `MetricDefinition` (catálogo §8 em `docs/arquitetura/METRICAS_GESTAO.md`: fórmula, fonte, proxy, `minSamples`) → `MetricSnapshot` → `Insight` (ACERVO · PERFIL · EQUIPE · PROJETO, `metricRefsJson`, `actionsJson`), `RankingEntry` (dimensões separadas, `RankingWeights` públicos, `rankingOptOut`, "Explique minha posição"), `FeasibilitySheet` (custo P10/P50/P90, PERT/CPM, Monte Carlo 1.000 execuções, score decomposto, top 5 riscos, WBS, RACI, premissas e desconhecidos). Nada vira decisão, chancela, ranking oficial ou projeto sem confirmação humana.

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_application_ai {
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
    -govern(AiRequest) Route
    -chain(primary, secondary, local)
  }
  class AiRequest {
    <<service>>
    +capability: AiCapability
    +hostRf: String
    +userId: UUID
    +departmentId: UUID
    +accessClass: AccessClassification
    +payload: JSON
    +mode: AiMode
  }
  class AiResponse {
    <<service>>
    +output: JSON
    +explanation: String
    +confidence: BigDecimal
    +citations: List~Citation~
    +fallbackUsed: boolean
    +inferenceId: UUID
  }
  class AiGovernance {
    <<service>>
    +featureFlag(capability)
    +accessClassRoute(accessClass)
    +mask(payload) MaskedPayload
    +quota(userId, deptId) QuotaSource
    +budget(estimatedUsd)
    +consent(userId, purpose)
  }
  class AiBudget {
    <<service>>
    +reserve(estimatedUsd) boolean
  }
  class AiProviderPort {
    <<port>>
    +complete(prompt, model, timeout)
    +embed(text)
  }
  class QuotaPort {
    <<port>>
    +tryConsume(scope, id, units)
  }
  class CircuitBreakerPort {
    <<port>>
    +state(provider) CircuitState
  }
  class MetricCalculator {
    <<service>>
    +compute(metricCode, scope, scopeId, period) MetricSnapshot
    +evm(project) EvmValues
    +pert(tasks) PertValues
    +cpm(tasks, deps) CriticalPath
    +monteCarlo(project, runs) Probability
    +riskMatrix(project) RiskExposure
    +roi(costs, benefits) RoiValues
    +littlesLaw(wip, throughput) CycleTime
  }
  class InsightService {
    <<service>>
    +acervo(actor) List~Insight~
    +perfil(actor, consent) List~Insight~
    +equipe(actor, deptId) List~Insight~
    +applyAction(actor, insightId, action)
  }
  class RankingService {
    <<service>>
    +compute(scope, scopeId, period) List~RankingEntry~
    +explain(actor, dimension) Explanation
    +optOut(actor, boolean)
    +updateWeights(actor, RankingWeightsForm) RankingWeights
  }
  class AutopilotService {
    <<service>>
    +tasksFrom(actor, source) List~TaskDraft~
    +projectCandidates(actor, deptId) List~FeasibilitySheet~
    +accept(actor, sheetId, target) AcceptResult
    +discard(actor, sheetId, reason)
  }
  class FeasibilityService {
    <<service>>
    +build(candidate) FeasibilitySheet
  }
  class SurveyService {
    <<service>>
    +psychSafety(deptId, period) Result
    +healthCheck(deptId, quarter) Result
    +enps(deptId, period) Result
    -minRespondents 5
  }
}

namespace ws_domain_ia {
  class AiInferenceLog {
    <<entity>>
    +id: UUID
    +userId: UUID
    +departmentId: UUID
    +capability: AiCapability
    +hostRf: String
    +provider: AiProvider
    +model: String
    +mode: AiMode
    +latencyMs: int
    +inputTokens: int
    +outputTokens: int
    +estimatedCostUsd: BigDecimal
    +result: InferenceResult
    +fallbackUsed: boolean
    +maskedFieldsJson: JSON
    +confidence: BigDecimal
    +reviewedBy: UUID
    +quotaSource: String
    +correlationId: String
  }
  class AiQuota {
    <<entity>>
    +scope: String
    +scopeId: UUID
    +monthKey: String
    +monthlyLimit: int
    +consumed: int
    +purchasedCredits: int
  }
  class AiProviderCircuitState {
    <<entity>>
    +provider: AiProvider
    +state: CircuitState
    +failures: int
    +openedAt: Instant
  }
  class Insight {
    <<entity>>
    +id: UUID
    +scope: InsightScope
    +scopeId: UUID
    +kind: String
    +title: String
    +bodyMd: String
    +metricRefsJson: JSON
    +actionsJson: JSON
    +severity: String
    +aiInferenceId: UUID
    +dismissedAt: Instant
  }
  class FeasibilitySheet {
    <<entity>>
    +id: UUID
    +candidateTitle: String
    +demandRef: String
    +costJson: JSON
    +timeJson: JSON
    +deadlineJson: JSON
    +viabilityScoreJson: JSON
    +risksJson: JSON
    +wbsJson: JSON
    +raciJson: JSON
    +assumptionsJson: JSON
    +unknownsJson: JSON
    +status: SheetStatus
    +discardReason: String
    +resultingProjectId: UUID
    +resultingTaskId: UUID
  }
  class MetricDefinition {
    <<entity>>
    +code: String
    +domain: MetricDomain
    +name: String
    +formula: String
    +sourceDescription: String
    +proxyNote: String
    +unit: String
    +minSamples: int
  }
  class MetricSnapshot {
    <<entity>>
    +metricCode: String
    +scope: MetricScope
    +scopeId: UUID
    +periodStart: LocalDate
    +periodEnd: LocalDate
    +value: BigDecimal
    +valuesJson: JSON
  }
  class RankingEntry {
    <<entity>>
    +scope: String
    +scopeId: UUID
    +periodKey: String
    +dimension: RankingDimension
    +userId: UUID
    +value: BigDecimal
    +position: int
    +explanationJson: JSON
  }
  class RankingWeights {
    <<entity>>
    +companyId: UUID
    +version: int
    +weightsJson: JSON
    +criteriaPublicText: String
    +validFrom: Instant
    +editedBy: UUID
  }
  class AiCapability {
    <<enum>>
    CLASSIFICAR_MENSAGEM
    RESUMO_ANALITICO
    AUTOPILOT_PROJETO
    AUTOPILOT_TAREFAS
    SIMULAR_CENARIO
    CONFORMIDADE
    MEMORIA_BUSCA
    INSIGHT
    TAREFA_DO_DIA
    HSE
    HYPE_PERFIL
    DOSSIE
    THUMBNAIL
    CAPA_IA
  }
  class AiProvider {
    <<enum>>
    CLAUDE
    GEMINI
    LOCAL
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
  class MetricDomain {
    <<enum>>
    INOVACAO
    TI
    PROJETOS
    EQUIPES
    DECIA
    PONTOS
  }
}

namespace ws_domain_contexto {
  class User {
    <<entity>>
    +id: UUID
    +rankingOptOut: boolean
    +hypeVisibility: HypeVisibility
  }
  class UserConsent {
    <<entity>>
    +purpose: ConsentPurpose
    +granted: boolean
  }
  class TaskItem {
    <<entity>>
    +accessClass: AccessClassification
    +state: TaskState
  }
  class ProjectScheme {
    <<entity>>
    +evmJson: JSON
    +criticalPathJson: JSON
    +status: ProjectStatus
  }
  class DeciaSession {
    <<entity>>
    +aiMode: AiMode
  }
  class FeatureFlag {
    <<entity>>
    +flagKey: String
    +enabled: boolean
    +scope: String
  }
}

namespace ws_web {
  class InsightController {
    <<controller>>
    +GET_api_insights_acervo()
    +GET_api_insights_perfil()
    +GET_api_insights_equipe(deptId)
    +POST_api_insights_id_action(code)
  }
  class RankingController {
    <<controller>>
    +GET_api_rankings(scope, dimension, period)
    +GET_api_rankings_explain(dimension)
    +POST_api_me_ranking_opt_out(value)
    +PUT_api_rankings_weights(form)
  }
  class AutopilotController {
    <<controller>>
    +POST_api_autopilot_tasks(source)
    +GET_api_autopilot_projects(deptId)
    +POST_api_feasibility_id_accept(target)
    +POST_api_feasibility_id_discard(reason)
  }
  class AdminAiController {
    <<controller>>
    +GET_api_admin_ai(period, deptId)
  }
}

namespace ws_infrastructure {
  class ClaudeProvider {
    <<adapter>>
  }
  class GeminiProvider {
    <<adapter>>
  }
  class LocalEngine {
    <<adapter>>
  }
  class RedisQuotaAdapter {
    <<adapter>>
  }
  class Resilience4jCircuit {
    <<adapter>>
  }
}

AiEngine --> AiRequest
AiEngine --> AiResponse
AiEngine --> AiGovernance
AiGovernance --> AiBudget
AiGovernance --> QuotaPort
AiGovernance ..> FeatureFlag
AiGovernance ..> UserConsent
AiEngine --> AiProviderPort
AiEngine --> CircuitBreakerPort
AiEngine ..> AiInferenceLog : grava sempre
QuotaPort ..> AiQuota
CircuitBreakerPort ..> AiProviderCircuitState
InsightService --> MetricCalculator
InsightService --> AiEngine
InsightService ..> Insight
InsightService --> SurveyService
RankingService --> MetricCalculator
RankingService ..> RankingEntry
RankingService ..> RankingWeights
RankingService ..> User : rankingOptOut
AutopilotService --> FeasibilityService
AutopilotService --> AiEngine
FeasibilityService --> MetricCalculator
FeasibilityService ..> FeasibilitySheet
MetricCalculator ..> MetricDefinition
MetricCalculator ..> MetricSnapshot
MetricCalculator ..> ProjectScheme : evmJson criticalPathJson
TaskItem ..> AiGovernance : RESTRITO SIGILOSO so LOCAL
DeciaSession ..> AiEngine : aiMode AVANCADO
InsightController --> InsightService
RankingController --> RankingService
AutopilotController --> AutopilotService
AdminAiController ..> AiInferenceLog : custo latencia fallback aceitacao
ClaudeProvider ..|> AiProviderPort
GeminiProvider ..|> AiProviderPort
LocalEngine ..|> AiProviderPort
RedisQuotaAdapter ..|> QuotaPort
Resilience4jCircuit ..|> CircuitBreakerPort
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPREGADO · CHEFE · EMPRESA · ADMIN)"]
    A0([Qualquer função de IA]) --> A1["Pede insight, ranking, sessão avançada, Autopilot…"]
    A2([Insights › Acervo]) --> A3["Score do Acervo, paradas, duplicadas, fantasma, lacunas, modelos recomendados · ação em 1 clique"]
    A4([Insights › Perfil, só dono]) --> A5["Competências com evidências, evolução, recomendações, comparação anonimizada · resumo profissional só com consentimento"]
    A6([Insights › Equipe, CHEFE/EMPRESA]) --> A7["Métricas D com tendência e benchmarks anonimizados · pesquisas anônimas (mínimo 5)"]
    A8([Ranking]) --> A9["Dimensões separadas, período, pesos públicos · Explique minha posição · opt-out"]
    A10([Autopilot]) --> A11{"Tarefas ou projetos?"}
    A11 -->|tarefas| A12["N tarefas em rascunho"]
    A11 -->|projetos| A13["Até 5 candidatos com Ficha de Viabilidade · aceitar, abrir sessão ou descartar com motivo"]
    A14([ADMIN › IA do sistema]) --> A15["Custo/latência por função e departamento, taxa de fallback, aceitação, cotas, alertas"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/insights · autopilot · decia/[sessionId] · admin/ai)"]
    F1["InsightCard (metricRefs com fórmula, fonte, proxy · ação em 1 clique) · Spark ✦ · banner de fallback"]
    F2["RankingTable por dimensão · Dialog Explique minha posição · Switch opt-out · página Como o ranking é calculado"]
    F3["FeasibilitySheetView: P10/P50/P90, PERT/CPM, Monte Carlo, score decomposto, top 5 riscos, WBS, RACI, premissas, desconhecidos"]
    F4["EmptyState explicativo quando faltam dados (mínimo 3 projetos/sinais)"]
    F5["AdminAiPanel"]
  end

  subgraph WEB["ws-web"]
    W1["JWT · CorrelationIdFilter · rate limit por usuário"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    G1["AiGovernance: feature flag da função ativa?"]
    G1 -->|não| E1["404 ou 503 FUNCAO_DESLIGADA"]
    G2{"Payload contém RESTRITO/SIGILOSO?"}
    G2 -->|sim| G3["Rota só LocalEngine · aviso · result BLOQUEADO_SIGILO para externos"]
    G2 -->|não| G4["Masking de dados pessoais (Masking existe no main)"]
    G5{"QuotaPort.tryConsume (créditos comprados antes da cota mensal)?"}
    G5 -->|não| E2["429 COTA_ESGOTADA + Loja"]
    G6{"AiBudget.reserve (teto diário USD)?"}
    G6 -->|não| E3["503 IA_INDISPONIVEL"]
    G7["MetricCalculator calcula TODOS os números (seção 8) antes da IA · MetricSnapshot"]
    G8{"Amostra suficiente? (minSamples · 3 projetos/sinais · 5 respondentes)"}
    G8 -->|não| G9["Tela explica o que falta coletar (sem números vazios)"]
    G10["InsightService: Score do Acervo, listas, lacunas por processo, modelos recomendados · actionsJson (arquivar, repassar, criar faltante, mesclar)"]
    G11{"Resumo profissional: UserConsent RESUMO_PROFISSIONAL_IA?"}
    G11 -->|não| E4["403 CONSENTIMENTO_NECESSARIO"]
    G12["RankingService: dimensões separadas · pesos de RankingWeights (vigência, auditoria) · nunca volume bruto de mensagens · opt-out oculta · explanationJson"]
    G13["AutopilotService.tasksFrom: tarefas RASCUNHO (tipo, categoria, prazo legal, responsável, dependências) — nada DISPONIVEL sem revisão"]
    G14["FeasibilityService.build: custo P10/P50/P90 (paramétrica + análoga), PERT, CPM, Monte Carlo 1.000 runs, score 0–100 decomposto, matriz P×I top 5, ROI/payback/VPL, WBS, RACI, SMART"]
    G15{"Aceitar ou descartar?"}
    G15 -->|aceitar| G16["ProjectScheme RASCUNHO + ESTUDO_TECNICO_PRELIMINAR ✦ ou sessão DECIA (RF29)"]
    G15 -->|descartar| G17["Motivo obrigatório (422) → alimenta próximas sugestões"]
    G18["Projeto em execução: EVM (PV, EV, AC, CPI, SPI, EAC, ETC, VAC, TCPI), caminho crítico, burndown/fluxo cumulativo · alerta SPI menor que 0,9 há 2 semanas → link Simulador (RF31)"]
    G19["Sessão aiMode AVANCADO: cita fontes (RF33), traz métricas reais do projeto, sugere relacionados · debita cota ou DP com aviso prévio"]
  end

  subgraph IA["AiEngine (Strategy + Chain)"]
    I1["Claude (primário) · circuit breaker · retry · timeout"]
    I1 -->|falha ou circuito OPEN| I2["Gemini (alternativo)"]
    I2 -->|falha| I3["LocalEngine: regras, embeddings locais, PERT/CPM/Monte Carlo/EVM, heurísticas de PM — redação simplificada"]
    I4["AiInferenceLog: modelo, custo, latência, fallbackUsed, maskedFields, confidence, correlationId"]
    I5["Saída: faísca ✦ + gerado por IA em [data] — modelo — revisado por + confiança + explicação + métrica citada"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL ai_inference_log (V2) · ai_quotas · insights · feasibility_sheets · metric_definitions · metric_snapshots · ranking_entries · ranking_weights · feature_flags (V2)")]
    D2[("Redis quota:{scope}:{id}:{month} · circuit state · ranking cache · flag redis.enabled")]
    D3[("OpenSearch ws-memory embeddings · flag opensearch.enabled")]
  end

  A1 --> W1 --> G1 -->|sim| G2
  G3 --> G5
  G4 --> G5
  G5 -->|sim| G6 -->|sim| G7 --> G8 -->|sim| I1
  G9 --> F4
  I1 --> I4
  I2 --> I4
  I3 --> I4 --> I5 --> D1
  A2 --> A3 --> G10 --> F1
  A4 --> A5 --> G11 -->|sim| G10
  A6 --> A7 --> G10
  A8 --> A9 --> G12 --> F2
  G12 --> D2
  A10 --> A11
  A12 --> G13
  A13 --> G14 --> F3 --> G15
  G16 --> D1
  G17 --> D1
  G18 --> F1
  G19 --> D3
  A14 --> A15 --> F5 --> D1
  G5 --> D2
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

  Note over U,OS: CA01 + CA02 + CA11 — chain com governança (vale para toda capability)
  U->>FE: Insights › Acervo
  FE->>C: GET /api/insights/acervo
  C->>S: InsightService.acervo(actor)
  S->>S: MetricCalculator: Score do Acervo (completude, prazos, reutilização, conformidade), paradas, duplicadas (similaridade), fantasma, lacunas por processo
  S->>DB: metric_snapshots (fórmula e proxy de metric_definitions)
  S->>AI: run(INSIGHT, números + referências, mode ECONOMIA)
  AI->>AI: AiGovernance: feature flag · accessClass (RESTRITO/SIGILOSO → LOCAL) · Masking · quota · AiBudget
  AI->>R: QuotaPort.tryConsume (créditos comprados antes da cota mensal)
  alt cota esgotada
    AI-->>S: 429 COTA_ESGOTADA
    S-->>FE: aviso + atalho /store
  else ok
    AI->>AI: Claude (circuit CLOSED, retry, timeout)
    alt timeout ou circuito OPEN
      AI->>AI: Gemini
      alt falha
        AI->>AI: LocalEngine (cálculos determinísticos completos, redação simplificada)
      end
    end
    AI->>DB: insert ai_inference_log (modelo, custo, latência, fallbackUsed, maskedFields, correlationId)
    AI-->>S: AiResponse (explicação cita a métrica e o valor, confidence)
    S->>DB: insert insights (scope ACERVO, metricRefsJson, actionsJson)
    S-->>FE: InsightCards com Spark ✦ e aviso de fallback se houver
  end
  U->>FE: ação em 1 clique: arquivar tarefa parada
  FE->>C: POST /api/insights/{id}/action {ARQUIVAR}
  C->>S: InsightService.applyAction → TaskStateMachine (RF41)
  S-->>FE: 200

  Note over U,OS: CA04 — Insights › Perfil com consentimento
  U->>FE: pede resumo profissional exportável
  FE->>C: GET /api/insights/perfil?resumo=true
  C->>S: InsightService.perfil(actor, consent)
  S->>DB: user_consents RESUMO_PROFISSIONAL_IA
  alt sem consentimento
    S-->>C: 403 CONSENTIMENTO_NECESSARIO
  else ok
    S->>AI: run(INSIGHT perfil, métricas do perfil deliberativo + comparação anonimizada)
    AI-->>S: texto ✦
    S-->>FE: competências com evidências, evolução mensal, recomendações, resumo
  end

  Note over U,OS: CA05 — ranking transparente
  U->>FE: abre ranking do departamento, dimensão PONTUALIDADE_SPI
  FE->>C: GET /api/rankings?scope=DEPARTAMENTO&dimension=PONTUALIDADE_SPI&period=2026-Q3
  C->>S: RankingService.compute(...)
  S->>R: ranking cache
  S->>DB: ranking_weights vigente · metric_snapshots · users.ranking_opt_out
  S-->>FE: RankingEntry[] (opt-out ocultos) + critérios e pesos públicos
  U->>FE: Explique minha posição
  FE->>C: GET /api/rankings/explain?dimension=PONTUALIDADE_SPI
  C->>S: RankingService.explain(actor, dimension)
  S-->>FE: explanationJson (métricas, pesos, posição) ✦

  Note over U,OS: CA08 + CA10 — Autopilot de Projetos com Ficha de Viabilidade
  U->>FE: Projetos sugeridos para o departamento
  FE->>C: GET /api/autopilot/projects?deptId=
  C->>S: AutopilotService.projectCandidates(actor, deptId)
  S->>DB: eixos sem projeto (RF24), lacunas do acervo, decisões sem projeto (RF29), metas (RF35), histórico
  S->>OS: knn ws-memory projetos semelhantes (RF33)
  S->>S: FeasibilityService.build por candidato: custo P10/P50/P90, PERT, CPM, Monte Carlo 1.000 runs, score decomposto, top 5 riscos, ROI/payback/VPL, WBS, RACI
  S->>AI: run(AUTOPILOT_PROJETO, redigir premissas e desconhecidos sobre os números)
  AI-->>S: texto ✦ + AiInferenceLog
  S->>DB: insert feasibility_sheets (PROPOSTA) até 5 ordenados por viabilidade
  S-->>FE: FeasibilitySheetView[]
  U->>FE: aceita o candidato 2
  FE->>C: POST /api/feasibility/{id}/accept {PROJETO}
  C->>S: AutopilotService.accept(actor, id, PROJETO)
  S->>DB: insert project_schemes (RASCUNHO, origin AUTOPILOTO) + tasks ESTUDO_TECNICO_PRELIMINAR (aiGenerated) · feasibility_sheets ACEITA
  S-->>FE: 201 → /desk

  Note over U,OS: CA09 — EVM no projeto em execução
  U->>FE: abre projeto EM_EXECUCAO
  FE->>C: GET /api/projects/{id}/metrics
  C->>S: MetricCalculator.evm + cpm + burndown
  S->>DB: project_tasks (PV, EV, AC, percentComplete) → project_schemes.evm_json
  S-->>FE: CPI, SPI, EAC, ETC, VAC, TCPI, caminho crítico, fluxo cumulativo + alerta SPI menor que 0,9 há 2 semanas com link /simulate

  Note over U,OS: CA12 — painel admin
  U->>FE: ADMIN abre IA do sistema
  FE->>C: GET /api/admin/ai?period=
  C->>S: AdminAiService.load
  S->>DB: ai_inference_log agregado por capability e departamento · ai_quotas · taxa de fallback · taxa de aceitação (feasibility_sheets, seal_bonds)
  S-->>FE: AdminAiPanel com alertas de custo
```

## 4. Máquina de estados

Entidade central: `AiProviderCircuitState.state` (`CircuitState`) do circuit breaker por provedor — decide a cadeia primário → alternativo → local. A `FeasibilitySheet` (PROPOSTA · ACEITA · DESCARTADA) está no RF26 §4.

```mermaid
stateDiagram-v2
  [*] --> CLOSED: provedor saudável · recebe as chamadas (Claude primário, Gemini alternativo)
  CLOSED --> OPEN: falhas ou timeouts acima do limiar na janela (Resilience4j) · result FALLBACK no AiInferenceLog
  OPEN --> HALF_OPEN: waitDuration vencido · deixa passar chamadas de teste
  HALF_OPEN --> CLOSED: chamadas de teste OK
  HALF_OPEN --> OPEN: chamada de teste falhou
  OPEN --> OPEN: chamadas vão direto ao próximo da cadeia (Gemini → LocalEngine) com aviso de fallback (CA01)
  note right of OPEN
    Com todos OPEN ou sem chave: LocalEngine executa
    PERT, CPM, Monte Carlo, EVM, scores e todas as métricas
    integralmente · só a redação fica simplificada (CA11).
  end note
  note left of CLOSED
    RESTRITO/SIGILOSO nunca chega ao provedor externo,
    independente do estado (CA02).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/insights (Acervo · Perfil · Equipe · Ranking · Projetos sugeridos) · autopilot · decia/[sessionId] (modo Avançado) · admin/ai · projects/[id] (painel EVM)"]
    R2["components: InsightCard · MetricRef (fórmula, fonte, proxy) · RankingTable · Dialog Explique minha posição · FeasibilitySheetView · EvmPanel · ProjectCard composition PAINEL_METRICAS · Spark ✦ · EmptyState explicativo · AdminAiPanel"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    CTRL["InsightController · RankingController · AutopilotController · AdminAiController (@Operation RF43.CA01-CA15)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    AIE["ai/AiEngine (Strategy + Chain of Responsibility) · AiGovernance · AiBudget (Q-50)"]
    MSK["common/Masking (main)"]
    MC["metrics/MetricCalculator + metrics/* por domínio (A inovação · B TI · C projetos · D equipes) — METRICAS_GESTAO.md, testes unitários"]
    INS["ai/InsightService · SurveyService (anônimas, mínimo 5)"]
    RK["gamification/RankingService (dimensões separadas, pesos públicos, opt-out)"]
    AP["ai/AutopilotService · FeasibilityService"]
    AQ["ai/AiQuotaService"]
    GD["security/Guard (main)"]
    DE["events/DomainEvents AFTER_COMMIT (RECALC_METRICS · RECALC_RANKING)"]
    PORTS["ports: AiProviderPort · QuotaPort · CircuitBreakerPort · SearchIndexPort"]
  end
  subgraph DOM["ws-domain"]
    ENT["AiInferenceLog (V2) · FeatureFlag (V2, ai.local.only = TRUE) · AiQuota · AiProviderCircuitState · Insight · FeasibilitySheet · MetricDefinition · MetricSnapshot · RankingEntry · RankingWeights · User.rankingOptOut (main) · UserConsent (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    AIC["ai-providers/ai-claude (flag ai.provider.claude) · AiProvidersConfig (main)"]
    AIG["ai-providers/ai-gemini (flag ai.provider.gemini)"]
    AIL["ai-providers/ai-local LocalEngine (ai.local.only) · embeddings locais"]
    R4J["resilience4j-spring-boot4 circuit breaker · retry · time limiter (D-13)"]
    RD["cache-redis quotas · circuit state · ranking cache (RedisAdaptersConfig no main)"]
    OSA["search-opensearch ws-memory (flag opensearch.enabled)"]
    MY["persistence-mysql ai_inference_log · feature_flags (V2) · insights · feasibility_sheets · metric_* · ranking_*"]
  end
  BFF --> CTRL --> SEC
  CTRL --> INS
  CTRL --> RK
  CTRL --> AP
  INS --> MC
  RK --> MC
  AP --> MC
  INS --> AIE
  AP --> AIE
  AIE --> MSK
  AIE --> AQ
  AIE --> PORTS
  DE --> MC
  DE --> RK
  AIE --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> AIC --> CLAUDE["Claude"]
  PORTS --> AIG --> GEM["Gemini"]
  PORTS --> AIL
  PORTS --> R4J
  PORTS --> RD --> REDIS[("Redis")]
  PORTS --> OSA --> OPENS[("OpenSearch")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF43.CA01 | `AiEngine.chain`, `CircuitBreakerPort`, `AiProviderCircuitState`, `AiInferenceLog` (model, cost, latency, fallbackUsed, correlationId), aviso de fallback | I1 → I2 → I3 → I4 | 11–18 | toda a máquina | `AIE`, `R4J`, `AIC/AIG/AIL` |
| RF43.CA02 | `AiGovernance.accessClassRoute/mask`, `Masking` (main), `InferenceResult BLOQUEADO_SIGILO`, `maskedFieldsJson` | G2 → G3/G4 | 8 | nota de CLOSED | `MSK`, `AIL` |
| RF43.CA03 | `InsightService.acervo/applyAction`, `Insight scope ACERVO` (Score, paradas, duplicadas, fantasma, lacunas, modelos recomendados, `actionsJson`), `MetricCalculator` | A2 → A3 → G7 → G10 → F1 | 1–25 | — | `INS`, `MC`, `InsightCard`, `MetricRef` |
| RF43.CA04 | `InsightService.perfil`, `UserConsent RESUMO_PROFISSIONAL_IA` (403 CONSENTIMENTO_NECESSARIO), comparação anonimizada, `DeliberativeProfile` | A4 → A5 → G11 → G10 | 26–34 | — | `INS`, `R1 insights/perfil` |
| RF43.CA05 | `RankingService.compute/explain/optOut/updateWeights`, `RankingEntry.dimension/explanationJson`, `RankingWeights` (vigência, `editedBy`), `User.rankingOptOut` (main), nunca volume bruto | A8 → A9 → G12 → F2 | 35–43 | — | `RK`, `RankingTable`, `RD` |
| RF43.CA06 | `DeciaSession.aiMode AVANCADO`, `CitationService` (RF33), métricas reais do projeto na sessão, débito de cota/DP com aviso | G19 | — (RF8/RF11/RF16 em modo AVANCADO) | — | `AIE`, `OSA`, `AQ` |
| RF43.CA07 | `AutopilotService.tasksFrom`, `TaskItem RASCUNHO` (tipo, categoria, prazo legal, responsável, dependências), nada DISPONIVEL sem revisão (RF4) | A10 → A11 → A12 → G13 | — (RF26 §3) | — | `AP` |
| RF43.CA08 | `AutopilotService.projectCandidates`, `FeasibilityService.build`, `FeasibilitySheet` (costJson P10/P50/P90, timeJson PERT/CPM, deadlineJson Monte Carlo 1.000, viabilityScoreJson, risksJson top 5, wbsJson, raciJson, assumptionsJson, unknownsJson), até 5 por viabilidade | A13 → G14 → F3 | 44–52 | — (RF26 §4 PROPOSTA) | `AP`, `MC`, `FeasibilitySheetView` |
| RF43.CA09 | `MetricCalculator.evm/cpm`, `ProjectScheme.evmJson/criticalPathJson`, burndown/fluxo cumulativo, alerta SPI → RF31 | G18 | 58–62 | — | `MC`, `EvmPanel`, `PAINEL_METRICAS` |
| RF43.CA10 | `AutopilotService.accept/discard`, `ProjectScheme RASCUNHO origin AUTOPILOTO`, `TaskType ESTUDO_TECNICO_PRELIMINAR`, `FeasibilitySheet.discardReason`, sessão DECIA (RF29) | G15 → G16/G17 | 53–57 | `PROPOSTA → ACEITA / DESCARTADA` (RF26 §4) | `AP` |
| RF43.CA11 | `LocalEngine` executa PERT, CPM, Monte Carlo, EVM, scores e métricas integralmente; só redação simplificada | I3 · G7 | 15–16 | nota de OPEN | `AIL`, `MC` |
| RF43.CA12 | `AdminAiController`, agregados de `AiInferenceLog` por capability/departamento, taxa de fallback, taxa de aceitação, `AiQuota`, alertas de custo | A14 → A15 → F5 | 63–67 | — | `AdminAiPanel`, `MY` |
| RF43.CA13 | `MetricDefinition` (code, formula, sourceDescription, proxyNote, minSamples), `MetricCalculator` por domínio com testes unitários, `METRICAS_GESTAO.md`, IA cita a métrica | G7 | 4–5 | — | `MC`, `MY (metric_definitions)` |
| RF43.CA14 | `InsightService.equipe`, `Insight scope EQUIPE` (carga, gargalos, segurança psicológica, rede, bus factor, eNPS), `SurveyService` (anônimas, mínimo 5), benchmarks anonimizados, `Guard.requireDeptHead/requireRole EMPRESA` | A6 → A7 → G8 → G10 | — (GET /insights/equipe) | — | `INS`, `SurveyService`, `GD` |
| RF43.CA15 | `MetricDefinition.minSamples`, mínimo 3 projetos/sinais para domínios A e B, `EmptyState` explicativo | G8 → G9 → F4 | — | — | `F4 EmptyState`, `MC` |
