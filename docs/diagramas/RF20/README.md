# RF20 — Utilizar o construtor de projetos do Work Station para compreender se as tarefas de meu acervo são adequadas dentro de meu ambiente empresarial
**HU:** HU20 · **Sprint (board Work Station):** a confirmar (card renomeado em 2026-10-02; o card "SPRINT 4" cita "HU20 / RF20 Criador de Tarefas" = escopo antigo, preservado em `_anterior/RF20`; a HU20 do Product Backlog remete a "RF22 — Editar esquema + Canvas 2D + Meu Quarto") · **Equivalente FAI:** Inventory Score (RF29 do FAI: "o que falta no meu closet") + Smart Mirror (RF28: "o que falta neste look") + Criar Look (RF5) · **Aba/rota:** painel **Adequação do acervo** dentro do Criador de Projetos (`/projects/new?painel=adequacao`, proposta) e sub-aba Insights › Acervo (`/insights/acervo`, RF43); API `GET /api/insights/acervo/score`, `POST /api/insights/acervo/evaluate {processTag}`, `GET /api/insights?scope=ACERVO`, `POST /api/projects/from-hypothetical`
**Critérios de aceite cobertos:** RF20.A01 … RF20.A06 — o **título** define o RF: CAs derivados do título + HU20, numerados `RF20.A01…A06` e marcados "(CA a confirmar)". **Corpo do card = criador de tarefas** (RF20.CA01–CA15: Fonte · Detecção por IA · Dados · Mais detalhes · Arte do card) — esses CAs são citados abaixo como estão escritos e estão **diagramados no RF4** (Criador de tarefas) e em `_anterior/RF20`; não são modelados aqui. Todas as classes do RF são **(planejado)**; reais: `Guard`, `AiProvidersConfig`, `RedisAdaptersConfig`.

> **HU20** — COMO usuário autenticado dentro do sistema Work Station POSSO utilizar o construtor de projetos PARA compreender de maneira mais estratégica e funcional se os dados qualitativos ou quantitativos de meu acervo de trabalho constituem projetos sólidos e bem elaborados.

O "construtor" aqui é o **painel Adequação do acervo** do Criador de Projetos (RF5): mede o **Score do Acervo** (`MetricDefinition`/`MetricSnapshot`, RF43.CA03), monta um **projeto hipotético** com as tarefas compatíveis do Acervo (`PhaseCompatibility`, como no RF5) e o avalia contra o **Espelho de Conformidade** (`ComplianceChecklist`/`ComplianceItem`, RF32) **sem persistir** `ProjectScheme` nem `ComplianceResult`. A IA só redige a explicação (`AiEngine INSIGHT`); o resultado vira um `Insight` (scope ACERVO) com ações de 1 clique e pode abrir o compositor do RF5 pré-preenchido.

Corpo do card (criador de tarefas, modelado no RF4): RF20.CA01 formatos e limite de upload, antivírus · CA02 detecção por IA pré-preenche · CA03 IA sem confiança → formulário vazio · CA04 obrigatórios → Acervo e projeto/fase · CA05 lote/.zip · CA06 colar · CA07 vinculado Google/Microsoft · CA08 e-mail · CA09 protocolo · CA10 busca web de órgão · CA11 prazo legal · CA12 OCR indisponível · CA13 chancelas sugeridas · CA14 422 por campo · CA15 Oferecer no Balcão.

## Critérios de aceite derivados do título + HU20 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF20.A01** (CA a confirmar) | Dado um empregado no Criador de Projetos, quando abre o painel **Adequação do acervo**, então vê o **Score do Acervo** (0–100) com decomposição (cobertura por processo, tarefas paradas, duplicadas, "fantasma" sem anexo, prazos legais em risco, reutilização) e o **mapa de lacunas por processo** (`ProcessTag` × categorias esperadas), calculados por `AcervoInsightService` sobre `MetricDefinition`/`MetricSnapshot` (RF43.CA03); acervo com menos de 3 tarefas mostra "o que coletar" em vez de números. |
| **RF20.A02** (CA a confirmar) | Dado um processo escolhido (ex.: LICITACAO), quando peço "avaliar adequação", então o sistema monta um **projeto hipotético** com as tarefas compatíveis do meu Acervo (`PhaseCompatibility.phasesFor`, só DISPONIVEL/EM_USO/MODELO_PUBLICO) e roda `ComplianceService.evaluateHypothetical` contra o checklist ativo da empresa/departamento (RF32.CA01), devolvendo % de conformidade, itens ATENDIDO / RECOMENDADO_AUSENTE / OBRIGATORIO_AUSENTE ⛔ / FORA_DE_ORDEM e qual tarefa satisfaz cada item; **nada é persistido** como `ProjectScheme` nem `ComplianceResult`. |
| **RF20.A03** (CA a confirmar) | Dado o resultado, quando a IA está disponível, então `AiEngine INSIGHT` (`hostRf RF20`) redige em até 3 frases por lacuna "por que isto falta e o que fazer", citando métrica e valor (faísca ✦, `AiInferenceLog`); IA indisponível, sem cota ou `accessClass` RESTRITO/SIGILOSO → texto-padrão do `LocalEngine`, com os mesmos números. |
| **RF20.A04** (CA a confirmar) | Dado uma lacuna OBRIGATORIO_AUSENTE, quando aciono a ação de 1 clique, então posso: **criar a tarefa faltante** (abre o RF4 pré-preenchido com categoria/tipo/fase esperados e `checklistItemId`, RF32.CA03), **buscar modelo** no Balcão (RF40) ou na Buscar (RF17), ou **levar ao meu acervo** uma tarefa compatível de colega (RF7); a ação fica em `Insight.actionsJson` e o painel recalcula ao voltar. |
| **RF20.A05** (CA a confirmar) | Dado um resultado com conformidade ≥ limiar do checklist e sem ⛔, quando clico **Compor projeto com estas tarefas**, então o compositor (RF5) abre com as fases pré-preenchidas pelo projeto hipotético e o `ProjectScheme` nasce RASCUNHO com `aiOrientation` = processo escolhido; com ⛔ o botão fica disponível com aviso "projeto nascerá com pendência bloqueante" (`hasBlockingPending`) — aviso, não impedimento (RF32.CA04). |
| **RF20.A06** (CA a confirmar) | Dado o painel, quando a avaliação termina, então um `Insight` (scope ACERVO, kind ADEQUACAO_PROCESSO, `metricRefsJson`, `actionsJson`, `severity`) é gravado para o usuário e aparece em Insights › Acervo (RF43) até ser dispensado (`dismissedAt`) ou até o próximo recálculo; avaliação de acervo de **terceiro** → `403 ACESSO_NEGADO` (RF43.CA04 "só o dono"); checklist inexistente para o processo → `404 CHECKLIST_NAO_ENCONTRADO` com sugestão de propor um (RF32). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class AcervoInsightController {
    <<controller>>
    +score(CurrentUser) AcervoScoreView
    +evaluate(EvaluateRequest, CurrentUser, ctx) AdequacyResultView
    +insights(scope, CurrentUser) List~InsightView~
    +dismiss(insightId, CurrentUser) void
  }
  class ProjectController {
    <<controller>>
    +fromHypothetical(HypotheticalRequest, CurrentUser, ctx) DraftView
  }
  class AcervoInsightService {
    <<service>>
    +score(ownerId) AcervoScore
    +gapMap(ownerId) Map~ProcessTag, List~
    +evaluate(ownerId, ProcessTag, actor, ctx) AdequacyResult
    -explain(AdequacyResult, accessClass) List~Explanation~
  }
  class HypotheticalProjectBuilder {
    <<service>>
    +build(ownerId, ProcessTag) HypotheticalProject
  }
  class PhaseCompatibility {
    <<service>>
    +phasesFor(TaskCategory) Set~ProjectPhase~
  }
  class ComplianceService {
    <<service>>
    +activeChecklist(companyId, departmentId, ProcessTag) Optional~ComplianceChecklist~
    +evaluateHypothetical(HypotheticalProject, ComplianceChecklist) AdequacyResult
  }
  class MetricService {
    <<service>>
    +compute(scope, scopeId, codes) List~MetricValue~
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
    capability INSIGHT
  }
  class Guard {
    <<service>>
    +ownerOrAdmin(CurrentUser, ownerId) void
  }
  class HypotheticalProject {
    <<value>>
    +ProcessTag processTag
    +Map~ProjectPhase, List~ tasksByPhase
    +List~UUID~ taskIds
  }
  class AdequacyResult {
    <<value>>
    +BigDecimal percent
    +int blockingCount
    +List~ItemResult~ items
    +boolean composable
    +JSON metricRefs
  }
  class ItemResult {
    <<value>>
    +UUID itemId
    +ItemStatus status
    +UUID satisfiedByTaskId
    +String explanation
  }
  class TaskRepositoryPort {
    <<port>>
    +findMineByStates(ownerId, states) List
    +countMine(ownerId) long
  }
  class ChecklistRepositoryPort {
    <<port>>
    +findActive(companyId, departmentId, processTag) Optional
  }
  class InsightRepositoryPort {
    <<port>>
    +save(Insight) Insight
    +findByScope(scope, scopeId, kind) List
    +dismiss(id) void
  }
  class MetricSnapshotPort {
    <<port>>
    +latest(scope, scopeId) List~MetricSnapshot~
  }
  class CounterCachePort {
    <<port>>
    +getOrLoad(key, ttl, loader) Object
  }

  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +TaskCategory category
    +TaskType type
    +Set~ProcessTag~ processTags
    +TaskState state
    +AccessClassification accessClass
    +LocalDate legalDueAt
    +int reuseCount
    +UUID checklistItemId
  }
  class ComplianceChecklist {
    <<entity>>
    +UUID id
    +UUID companyId
    +UUID departmentId
    +ProcessTag processTag
    +String name
    +String legalBasis
    +boolean active
    +int version
  }
  class ComplianceItem {
    <<entity>>
    +UUID checklistId
    +String label
    +String requirement
    +ProjectPhase expectedPhase
    +TaskCategory expectedCategory
    +TaskType expectedType
    +UUID mustPrecedeItemId
  }
  class Insight {
    <<entity>>
    +UUID id
    +InsightScope scope
    +UUID scopeId
    +String kind
    +String title
    +String bodyMd
    +JSON metricRefsJson
    +JSON actionsJson
    +String severity
    +UUID aiInferenceId
    +Instant dismissedAt
    +Instant generatedAt
  }
  class MetricDefinition {
    <<entity>>
    +String code
    +MetricDomain domain
    +String name
    +String formula
    +int minSamples
  }
  class MetricSnapshot {
    <<entity>>
    +String metricCode
    +MetricScope scope
    +UUID scopeId
    +BigDecimal value
  }
  class AiInferenceLog {
    <<entity>>
    +AiCapability capability
    +String hostRf
    +InferenceResult result
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +ProjectStatus status
    +String aiOrientation
    +boolean hasBlockingPending
  }
  class ItemStatus {
    <<enum>>
    ATENDIDO
    RECOMENDADO_AUSENTE
    OBRIGATORIO_AUSENTE
    FORA_DE_ORDEM
  }
  class InsightScope {
    <<enum>>
    ACERVO
    PERFIL
    EQUIPE
    PROJETO
  }
  class ProcessTag {
    <<enum>>
    LICITACAO
    CONVENIO
    OBRA
    REGULARIZACAO_FUNDIARIA
    PLANEJAMENTO_URBANO
    ORCAMENTO
    PESSOAL
    JURIDICO
  }

  AcervoInsightController --> AcervoInsightService
  ProjectController --> HypotheticalProjectBuilder
  AcervoInsightService --> HypotheticalProjectBuilder
  AcervoInsightService --> ComplianceService
  AcervoInsightService --> MetricService
  AcervoInsightService --> AiEngine
  AcervoInsightService --> Guard
  AcervoInsightService --> TaskRepositoryPort
  AcervoInsightService --> InsightRepositoryPort
  AcervoInsightService --> CounterCachePort
  HypotheticalProjectBuilder --> PhaseCompatibility
  HypotheticalProjectBuilder --> TaskRepositoryPort
  HypotheticalProjectBuilder ..> HypotheticalProject
  ComplianceService --> ChecklistRepositoryPort
  ComplianceService ..> AdequacyResult
  AdequacyResult *-- ItemResult
  ItemResult --> ItemStatus
  MetricService --> MetricSnapshotPort
  MetricService ..> MetricDefinition
  ComplianceChecklist "1" *-- "1..*" ComplianceItem
  ComplianceChecklist --> ProcessTag
  Insight --> InsightScope
  Insight "0..*" --> "0..1" AiInferenceLog
  TaskItem "0..*" --> "0..1" ComplianceItem : checklistItemId (tarefa faltante criada)
  HypotheticalProject ..> TaskItem : só referências, nada persistido
  HypotheticalProject ..> ProjectScheme : vira RASCUNHO só em A05
  note for AdequacyResult "Valor de retorno (não persistido): o mesmo formato de ComplianceResult.itemsJson do RF32, sem gravar compliance_results nem project_schemes."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Empregado"]
    A1["Abre /projects/new?painel=adequacao (ou Insights › Acervo)"]
    A2["Escolhe um processo (ex.: LICITACAO) e clica 'avaliar adequação'"]
    A3["Lê o resultado: % conformidade, itens ⛔, explicações ✦"]
    A4["Ação de 1 clique numa lacuna: criar tarefa faltante · buscar modelo · levar ao meu acervo"]
    A5["Clica 'Compor projeto com estas tarefas'"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["GET /api/insights/acervo/score → Score 0–100 + decomposição + mapa de lacunas (ProcessTag × categorias)"]
    F2["EmptyState 'o que coletar' quando < 3 tarefas"]
    F3["POST /api/insights/acervo/evaluate {processTag}"]
    F4["Painel: PercentBar, lista ItemResult com Tag (ATENDIDO · RECOMENDADO_AUSENTE · OBRIGATORIO_AUSENTE ⛔ · FORA_DE_ORDEM), TaskCard que satisfaz, Spark ✦ nas explicações"]
    F5["Ações: /tasks/new?categoria=&tipo=&fase=&checklistItemId= · /models?q= · /search?tab=TAREFAS · POST /api/tasks/{id}/extract"]
    F6["POST /api/projects/from-hypothetical {processTag, taskIds} → /projects/new pré-preenchido (RF5)"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["AcervoInsightController · ProjectController.fromHypothetical"]
    E403["403 ACESSO_NEGADO (acervo de terceiro)"]
    E404["404 CHECKLIST_NAO_ENCONTRADO (+ sugestão de propor, RF32)"]
    E422["422 VALIDACAO (processTag inválido)"]
  end
  subgraph APP["ws-application"]
    S1["Guard.ownerOrAdmin(actor, ownerId) — só o dono"]
    S2{"≥ 3 tarefas?"}
    S3["MetricService.compute(USUARIO, ownerId): cobertura por processo, paradas, duplicadas, fantasma (sem anexo), prazos legais em risco, reutilização → Score + gapMap (cache Redis 5 min)"]
    S4["HypotheticalProjectBuilder.build: tarefas DISPONIVEL/EM_USO/MODELO_PUBLICO com o processTag → PhaseCompatibility.phasesFor → tasksByPhase"]
    S5["ComplianceService.activeChecklist(company, dept, processTag)"]
    S6{"checklist existe?"}
    S7["evaluateHypothetical: por ComplianceItem → ATENDIDO (satisfiedByTaskId) · RECOMENDADO_AUSENTE · OBRIGATORIO_AUSENTE ⛔ · FORA_DE_ORDEM (mustPrecedeItemId) → percent, blockingCount, composable"]
    S8{"IA disponível, com cota e acervo sem RESTRITO/SIGILOSO?"}
    S9["AiEngine INSIGHT hostRf RF20: ≤ 3 frases por lacuna citando métrica e valor · AiInferenceLog"]
    S10["LocalEngine: texto-padrão com os mesmos números"]
    S11["Insight(scope ACERVO, kind ADEQUACAO_PROCESSO, metricRefsJson, actionsJson, severity) · substitui o anterior não dispensado"]
    H1["fromHypothetical: DraftService.save(slots pré-preenchidos, aiOrientation = processTag) → compositor RF5 · com ⛔: aviso 'nascerá com pendência bloqueante' (hasBlockingPending), não impede"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: tasks, compliance_checklists, compliance_items, insights, metric_definitions, metric_snapshots, ai_inference_log")]
    P2[("Redis: acervo:score:{userId} TTL 5 min · draft:project:{userId} · AiQuota")]
  end

  A1 --> F1 --> W1 --> W2 --> S1
  S1 -->|"terceiro"| E403
  S1 --> S2
  S2 -->|"não"| F2
  S2 -->|"sim"| S3 --> P2
  S3 --> P1
  S3 --> F1
  A2 --> F3 --> W2 --> S4 --> S5 --> S6
  F3 -->|"processTag inválido"| E422
  S6 -->|"não"| E404
  S6 -->|"sim"| S7 --> S8
  S8 -->|"sim"| S9 --> S11
  S8 -->|"não"| S10 --> S11
  S9 --> P1
  S11 --> P1
  S11 --> F4 --> A3 --> A4 --> F5
  F5 -->|"ao voltar"| F3
  A3 --> A5 --> F6 --> W2 --> H1 --> P2
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
  participant R as Repository/MySQL
  participant RD as Redis

  U->>N: abre o painel Adequação do acervo
  N->>C: GET /api/insights/acervo/score
  C->>S: AcervoInsightService.score(ownerId)
  S->>S: Guard.ownerOrAdmin(actor, ownerId)
  S->>R: tasks.countMine(ownerId)
  alt menos de 3 tarefas
    S-->>C: AcervoScoreView {empty: "o que coletar"}
    C-->>N: 200 (EmptyState)
  else ok
    S->>RD: GET acervo:score:{userId}
    opt cache frio
      S->>R: MetricService.compute (cobertura por processo, paradas, duplicadas, fantasma, prazos legais em risco, reutilização) sobre metric_definitions/metric_snapshots
      S->>RD: SET acervo:score:{userId} TTL 5 min
    end
    S-->>C: AcervoScoreView {score 0–100, decomposição, gapMap ProcessTag × categorias}
    C-->>N: 200
  end

  U->>N: escolhe LICITACAO e pede "avaliar adequação"
  N->>C: POST /api/insights/acervo/evaluate {processTag LICITACAO}
  C->>S: AcervoInsightService.evaluate(ownerId, LICITACAO, actor, ctx)
  S->>R: tasks DISPONIVEL/EM_USO/MODELO_PUBLICO com processTag LICITACAO
  S->>S: HypotheticalProjectBuilder.build → PhaseCompatibility.phasesFor → tasksByPhase (nada persistido)
  S->>R: ComplianceService.activeChecklist(companyId, departmentId, LICITACAO)
  alt checklist inexistente
    S-->>C: 404 CHECKLIST_NAO_ENCONTRADO {sugestao: propor checklist (RF32)}
    C-->>N: 404
  else checklist ativo
    S->>S: evaluateHypothetical → percent, blockingCount, itens ATENDIDO/RECOMENDADO_AUSENTE/OBRIGATORIO_AUSENTE/FORA_DE_ORDEM com satisfiedByTaskId
    alt IA disponível, cota ok, nenhum item RESTRITO/SIGILOSO
      S->>AI: run(INSIGHT, hostRf RF20, lacunas + métricas mascaradas)
      AI->>RD: AiQuota.tryConsume
      AI->>R: insert ai_inference_log
      AI-->>S: ≤ 3 frases por lacuna ("por que falta e o que fazer", métrica + valor)
    else indisponível / sem cota / sigilo
      S->>S: LocalEngine texto-padrão com os mesmos números
    end
    S->>R: insert insights (ACERVO, ADEQUACAO_PROCESSO, metricRefsJson, actionsJson, severity, aiInferenceId) · dispensa o anterior
    S-->>C: AdequacyResultView {percent, items, explanations ✦, composable, actions}
    C-->>N: 200 (PercentBar, Tags, TaskCards, Spark)
  end

  U->>N: clica "criar a tarefa faltante" num item OBRIGATORIO_AUSENTE
  N->>N: push /tasks/new?categoria=TERMO_REFERENCIA&tipo=DOCUMENTO&fase=PLANEJAMENTO&checklistItemId=… (RF4)
  Note over N,R: ao salvar, TaskItem.checklistItemId é preenchido (RF32.CA03) e o painel recalcula ao voltar

  U->>N: "Compor projeto com estas tarefas"
  N->>C: POST /api/projects/from-hypothetical {processTag, taskIds}
  C->>S: HypotheticalProjectBuilder.build + DraftService.save(slots, aiOrientation = LICITACAO)
  S->>RD: SET draft:project:{userId}
  alt havia ⛔ (blockingCount > 0)
    S-->>C: DraftView {warning "projeto nascerá com pendência bloqueante"}
  else sem ⛔
    S-->>C: DraftView
  end
  C-->>N: 200 → /projects/new com as fases pré-preenchidas (RF5) · ProjectScheme nasce RASCUNHO ao salvar

  U->>N: dispensa o insight em Insights › Acervo
  N->>C: POST /api/insights/{id}/dismiss
  C->>S: InsightRepositoryPort.dismiss (dismissedAt)
  C-->>N: 204
```

## 4. Máquina de estados

Entidade central: **`Insight`** (scope ACERVO, kind ADEQUACAO_PROCESSO) — ciclo derivado de `generatedAt`/`dismissedAt` e do recálculo (A06); a avaliação em si é efêmera (`AdequacyResult`, nada persistido, A02). O projeto só ganha estado (`ProjectStatus` RASCUNHO, RF5 §4) depois de "Compor projeto" (A05).

```mermaid
stateDiagram-v2
  direction LR
  state "SEM_AVALIACAO (painel mostra Score e mapa de lacunas)" as SEM
  state "AVALIANDO (projeto hipotético + checklist, efêmero)" as AVA
  state "INSIGHT_ATIVO (Insight ACERVO/ADEQUACAO_PROCESSO)" as ATV
  state "INSIGHT_DISPENSADO (dismissedAt)" as DIS
  state "RASCUNHO de projeto (RF5)" as RAS

  [*] --> SEM : abre o painel (A01) [dono do acervo, ≥ 3 tarefas]
  SEM --> AVA : POST …/evaluate {processTag} (A02) [checklist ativo existe, senão 404 CHECKLIST_NAO_ENCONTRADO]
  AVA --> ATV : AdequacyResult calculado · explicações ✦ (A03) · Insight gravado (A06), anterior não dispensado é substituído
  ATV --> AVA : ação de 1 clique executada e volta ao painel → recálculo (A04)
  ATV --> ATV : nova avaliação do mesmo processo substitui o Insight
  ATV --> DIS : POST /api/insights/{id}/dismiss
  DIS --> AVA : nova avaliação
  ATV --> RAS : "Compor projeto com estas tarefas" (A05) → DraftService → POST /api/projects (RF5) · aiOrientation = processo · hasBlockingPending se havia ⛔
  RAS --> [*] : segue ProjectStatus (RF5 §4)
  note right of AVA
    Nada é persistido como ProjectScheme nem ComplianceResult.
    Acervo de terceiro: 403 ACESSO_NEGADO.
  end note
  note right of ATV
    Aparece em Insights › Acervo (RF43) com
    metricRefsJson (métrica, valor, fórmula) e actionsJson.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/projects/new (painel ?painel=adequacao) · app/(shell)/insights/acervo"]
    UI["packages/ui: PercentBar, Tag (status do item, ⛔), TaskCard (compact), Spark ✦, Button (ações 1 clique), Select (processo), EmptyState ('o que coletar'), Skeleton"]
    BFF["app/bff/insights/* · app/bff/projects/*"]
    PG --> UI
    PG --> BFF
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    IC["AcervoInsightController · ProjectController.fromHypothetical"]
    GEH["GlobalExceptionHandler (403, 404, 422)"]
  end
  subgraph WSAPP["ws-application"]
    INS["ai/insights: AcervoInsightService · HypotheticalProjectBuilder"]
    CMP["projects: PhaseCompatibility (RF5) · DraftService (RF5)"]
    COMPL["compliance: ComplianceService.evaluateHypothetical (RF32)"]
    MET["metrics: MetricService (catálogo RF43 §8, METRICAS_GESTAO.md)"]
    AIE["ai: AiEngine INSIGHT · AiQuota · LocalEngine (texto-padrão)"]
    GD["security.Guard.ownerOrAdmin (real)"]
    PORTS["ports: TaskRepositoryPort · ChecklistRepositoryPort · InsightRepositoryPort · MetricSnapshotPort · CounterCachePort · DraftStorePort"]
    INS --> CMP
    INS --> COMPL
    INS --> MET
    INS --> AIE
    INS --> GD
    INS --> PORTS
  end
  subgraph WSDOM["ws-domain"]
    DOM["acervo: TaskItem · compliance: ComplianceChecklist · ComplianceItem · ai: Insight · AiInferenceLog · metrics: MetricDefinition · MetricSnapshot · projects: ProjectScheme (só em A05) · enums ProcessTag/InsightScope/ItemStatus"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: JpaTaskRepository · JpaChecklistRepository · JpaInsightRepository · metric_snapshots"]
    RDS["cache-redis (RedisAdaptersConfig): acervo:score:{userId} TTL 5 min · draft:project:{userId} · AiQuota"]
    AIP["ai-providers (AiProvidersConfig): Claude → Gemini → LocalEngine"]
  end

  BFF -->|"REST JSON"| SEC --> IC --> INS
  IC --> GEH
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  AIP -.implementa.-> AIE
  INS --> DOM
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  AIP --> CL["Claude · Gemini"]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF20.A01 | `AcervoInsightController.score`, `AcervoInsightService.score/gapMap`, `MetricService`, `MetricDefinition`, `MetricSnapshot`, `CounterCachePort` | `A1`→`F1`→`S1`→`S2`→`S3`, `F2` | 1–14 | `[*]`→`SEM` | `INS`, `MET`, `RDS`, `UI` (`PercentBar`, `EmptyState`) | planejado (RF43.CA03) |
| RF20.A02 | `HypotheticalProjectBuilder.build`, `PhaseCompatibility.phasesFor`, `ComplianceService.activeChecklist/evaluateHypothetical`, `AdequacyResult`, `ItemResult`, `ItemStatus` | `A2`→`F3`→`S4`→`S7`, `E422`, `E404` | 15–24 | `SEM`→`AVA` | `CMP`, `COMPL`, `MY` | planejado (RF32.CA01) |
| RF20.A03 | `AcervoInsightService.explain`, `AiEngine` (INSIGHT, `hostRf RF20`), `AiInferenceLog`, `LocalEngine` | `S8`→`S9`/`S10` | 25–31 | `AVA`→`ATV` | `AIE`, `AIP` | planejado (RF43.CA02) |
| RF20.A04 | `Insight.actionsJson`, rotas `/tasks/new?…&checklistItemId=`, `/models`, `/search`, `POST /api/tasks/{id}/extract`, `TaskItem.checklistItemId` | `A4`→`F5`→`F3` | 35–37 | `ATV`→`AVA` | `UI` (`Button`), `PG` | planejado (RF4, RF7, RF17, RF32.CA03, RF40) |
| RF20.A05 | `ProjectController.fromHypothetical`, `DraftService`, `ProjectScheme.aiOrientation/hasBlockingPending` | `A5`→`F6`→`H1` | 38–46 | `ATV`→`RAS` | `CMP`, `RDS` (`draft:project`) | planejado (RF5, RF32.CA04) |
| RF20.A06 | `Insight` (ACERVO, ADEQUACAO_PROCESSO, `dismissedAt`), `InsightRepositoryPort.save/dismiss`, `Guard.ownerOrAdmin`, `ChecklistRepositoryPort` | `S1`→`E403`, `S6`→`E404`, `S11` | 4, 21–23, 32–34, 47–50 | `ATV`→`DIS`, notas | `INS`, `GD`, `MY` (`insights`) | planejado (RF43.CA04, RF32) |
| RF20.CA01 … RF20.CA15 (corpo = criador de tarefas) | — | — | — | — | — | diagramados no **RF4** e em `_anterior/RF20`; não modelados aqui |
