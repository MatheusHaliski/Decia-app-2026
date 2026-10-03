# RF33 — Consultar a Memória Institucional (busca semântica sobre sessões encerradas, artefatos, projetos e tarefas) e fazer a IA do DECIA citar fontes institucionais

**HU:** HU33 · **Sprint (board Work Station):** Product Backlog (pós-Sprint 4, a priorizar) · **Equivalente FAI:** RF26 Explorador Global + RF24 IA (serviços externos) · **Aba/rota:** Memória Institucional (`/memory`); explorador visual em `/memory/explore` (rota a confirmar)

**Critérios de aceite cobertos:** RF33.CA01 · RF33.CA02 · RF33.CA03 · RF33.CA04 · RF33.CA05 · RF33.CA06

> Contextos da TAXONOMIA: **10. IA do sistema** (`InstitutionalMemoryDocument` no índice OpenSearch `wai-memory`, `Citation` valor embutido, `MemoryQuery`, `AiInferenceLog` capability `MEMORIA_BUSCA`), **5. DECIA** (`DeciaSession.indexedInMemory`, `AiQuestion.citationsJson`, `AnalyticalSummary.recommendationsJson[].citations`, `FinalDecision.citationsJson`, `SessionArtifact`), **12. Plataforma** (`DomainEventOutbox`, `PipelineJob INDEXAR_MEMORIA`, `FeatureFlag opensearch.enabled`). Base do **objetivo 3**: recomendação sem fonte é marcada **"sem precedente"**; indexação é assíncrona (`AFTER_COMMIT`) e nunca bloqueia a operação de negócio. Conteúdo `RESTRITO`/`SIGILOSO` nunca vai a IA externa: indexa só metadados ou usa embedding local.

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR
  namespace wai-domain {
    class InstitutionalMemoryDocument {
      <<entity>>
      +String docId
      +String sourceType
      +UUID sourceId
      +UUID companyId
      +UUID departmentId
      +String category
      +int exerciseYear
      +UUID authorId
      +String title
      +String text
      +float[] embedding
      +Visibility visibility
      +AccessClassification accessClass
      +Instant indexedAt
    }
    class Citation {
      <<entity>>
      +String sourceType
      +UUID sourceId
      +String excerpt
      +String url
      +BigDecimal score
    }
    class MemoryQuery {
      <<entity>>
      +UUID id
      +UUID userId
      +String queryText
      +JSON filtersJson
      +JSON resultsJson
      +UUID aiInferenceId
      +Instant at
    }
    class DeciaSession {
      <<entity>>
      +UUID id
      +String topic
      +SessionStatus status
      +boolean indexedInMemory
    }
    class SessionArtifact {
      <<entity>>
      +UUID id
      +UUID sessionId
      +String kind
      +String contentMd
    }
    class FinalDecision {
      <<entity>>
      +UUID id
      +UUID sessionId
      +DecisionStatus status
      +JSON citationsJson
    }
    class AiQuestion {
      <<entity>>
      +UUID id
      +UUID sessionId
      +String questionText
      +JSON citationsJson
    }
    class AnalyticalSummary {
      <<entity>>
      +UUID id
      +UUID sessionId
      +JSON recommendationsJson
    }
    class ProjectScheme {
      <<entity>>
      +UUID id
      +String title
      +ProjectStatus status
      +Visibility visibility
    }
    class TaskItem {
      <<entity>>
      +UUID id
      +String title
      +TaskState state
      +AccessClassification accessClass
      +Visibility visibility
    }
    class PipelineJob {
      <<entity>>
      +UUID id
      +String type
      +String targetType
      +UUID targetId
      +String status
      +int attempts
      +String lastError
    }
    class DomainEventOutbox {
      <<entity>>
      +UUID id
      +String aggregateType
      +UUID aggregateId
      +String eventType
      +Instant publishedAt
    }
    class AiInferenceLog {
      <<entity>>
      +UUID id
      +AiCapability capability
      +String provider
      +String result
      +int latencyMs
    }
    class MetricSnapshot {
      <<entity>>
      +UUID id
      +String metricCode
      +BigDecimal value
    }
    class MemorySourceType {
      <<enum>>
      SESSAO
      ARTEFATO
      DECISAO
      PROJETO
      TAREFA
      DOCUMENTO
    }
    class PipelineJobStatus {
      <<enum>>
      PENDENTE
      RODANDO
      OK
      FALHA
      REPROCESSAR
    }
  }
  namespace wai-application {
    class MemoryService {
      <<service>>
      +index(sourceType, sourceId) InstitutionalMemoryDocument
      +query(userId, text, filters) MemoryAnswer
      +retrieveForSession(sessionId, context) List~Citation~
      +explore(companyId, facets) MemoryExplorerView
      +similarProjects(projectId) List~Citation~
      +citationIndicator(period, deptId) BigDecimal
    }
    class AiEngine {
      <<service>>
      +answerWithCitations(question, hits) MemoryAnswer
      +recommendWithSources(context, citations) Recommendation
    }
    class AccessPolicy {
      <<service>>
      +visibilityFilter(user) SearchFilter
    }
    class EmbeddingPort {
      <<port>>
      +embed(text, accessClass) float[]
    }
    class SearchIndexPort {
      <<port>>
      +upsert(index, doc) void
      +knn(index, vector, filters, k) List~Hit~
      +aggregate(index, facets, filters) Facets
    }
    class AiProviderPort {
      <<port>>
      +complete(prompt, mode, accessClass) AiResult
    }
    class MemoryIndexingListener {
      <<service>>
      +onSessionClosed(event) void
      +onArtifactGenerated(event) void
      +onDecisionValidated(event) void
      +onProjectCompleted(event) void
      +onTaskPublishedAsModel(event) void
    }
  }
  namespace wai-web {
    class MemoryController {
      <<controller>>
      +query(body)
      +explore(params)
      +similar(projectId)
    }
  }
  namespace wai-infrastructure {
    class OpenSearchIndexAdapter {
      <<adapter>>
      índice wai-memory dense_vector
    }
    class GeminiEmbeddingAdapter {
      <<adapter>>
    }
    class LocalEmbeddingAdapter {
      <<adapter>>
      RESTRITO e SIGILOSO
    }
    class ClaudeAdapter {
      <<adapter>>
    }
    class OutboxPublisher {
      <<adapter>>
      AFTER_COMMIT
    }
  }
  InstitutionalMemoryDocument --> MemorySourceType : sourceType
  InstitutionalMemoryDocument ..> DeciaSession : sourceId SESSAO
  InstitutionalMemoryDocument ..> SessionArtifact : sourceId ARTEFATO
  InstitutionalMemoryDocument ..> FinalDecision : sourceId DECISAO
  InstitutionalMemoryDocument ..> ProjectScheme : sourceId PROJETO CONCLUIDO
  InstitutionalMemoryDocument ..> TaskItem : sourceId TAREFA MODELO_PUBLICO
  MemoryQuery "1" --> "*" Citation : resultsJson
  AiQuestion "1" --> "*" Citation : citationsJson
  FinalDecision "1" --> "*" Citation : citationsJson
  AnalyticalSummary "1" --> "*" Citation : recommendationsJson citations
  PipelineJob --> PipelineJobStatus : status
  PipelineJob ..> InstitutionalMemoryDocument : type INDEXAR_MEMORIA
  DomainEventOutbox ..> MemoryIndexingListener : evento publicado
  MemoryIndexingListener ..> MemoryService : index
  MemoryIndexingListener ..> PipelineJob : cria e atualiza
  MemoryService ..> EmbeddingPort
  MemoryService ..> SearchIndexPort
  MemoryService ..> AiEngine : resposta com citações ✦
  MemoryService ..> AccessPolicy : visibilidade e perfil
  MemoryService ..> MemoryQuery
  MemoryService ..> AiInferenceLog : MEMORIA_BUSCA
  MemoryService ..> MetricSnapshot : indicador CA05
  AiEngine ..> AiProviderPort
  MemoryController ..> MemoryService
  OpenSearchIndexAdapter ..|> SearchIndexPort
  GeminiEmbeddingAdapter ..|> EmbeddingPort
  LocalEmbeddingAdapter ..|> EmbeddingPort
  ClaudeAdapter ..|> AiProviderPort
  OutboxPublisher ..> DomainEventOutbox : publica
  note for InstitutionalMemoryDocument "OpenSearch índice wai-memory · metadados empresa, departamento, categoria, exercício, autor, data (CA01)"
  note for Citation "valor embutido · lista vazia = sem precedente (CA03)"
  note for PipelineJob "tabela pipeline_jobs · falha não bloqueia a operação de negócio (CA06)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Ator humano"]
    U1["Chefe encerra sessão, IA gera artefato, decisão é validada, projeto é concluído, tarefa vira MODELO_PUBLICO"]
    U2["Usuário pergunta em /memory: quem já fez convênio de pavimentação com a Caixa?"]
    U3["Participante pede recomendação na sessão DECIA (RF8, RF11, RF16)"]
    U4["Usuário abre o explorador visual e filtra por departamento, categoria e exercício"]
    U5["ADMIN abre o dashboard RF18"]
  end
  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["Resposta com trechos e links para sessão, tarefa ou projeto"]
    W2["Recomendação com chip baseado em: sessão X, projeto Y · ou etiqueta sem precedente"]
    W3["Mapa ou grade por departamento, categoria e exercício · projetos semelhantes a este"]
  end
  subgraph L3["wai-application"]
    S1["Commit da operação de negócio"]
    S2["Outbox AFTER_COMMIT: MemoryIndexingListener cria PipelineJob INDEXAR_MEMORIA PENDENTE"]
    S3{"accessClass RESTRITO ou SIGILOSO?"}
    S4["Monta InstitutionalMemoryDocument com metadados e texto"]
    S5["SearchIndexPort.upsert wai-memory · DeciaSession.indexedInMemory = true · job OK"]
    S6["Job FALHA ou REPROCESSAR · lastError · AiInferenceLog result ERRO · negócio segue intacto"]
    S7{"Pergunta vazia?"}
    S8["AccessPolicy.visibilityFilter: empresa, departamento, visibility, perfil"]
    S9["SearchIndexPort.knn com filtros · hits com excerpt e score"]
    S10["MemoryQuery salva · AiInferenceLog MEMORIA_BUSCA"]
    S11["retrieveForSession: kNN sobre o contexto da sessão"]
    S12{"Alguma citação com score mínimo?"}
    S13["Recomendação com citationsJson baseado em"]
    S14["Recomendação marcada sem precedente"]
    S15["SearchIndexPort.aggregate por departamento, categoria, exercício · similarProjects (RF27.CA05)"]
    S16["citationIndicator: % decisões VALIDADA com citationsJson não vazio (vw_decisions_with_sources)"]
    E1["422 VALIDACAO"]
    E2["403 ACESSO_NEGADO ao abrir fonte sem permissão"]
  end
  subgraph L4["IA (AiEngine)"]
    A1["EmbeddingPort externo (Gemini) gera dense_vector"]
    A2["LocalEmbeddingAdapter ou só metadados, sem IA externa"]
    A3["answerWithCitations ✦: resposta em linguagem natural com trechos"]
    A4["recommendWithSources ✦"]
    A5["Embedding da pergunta"]
  end
  subgraph L5["Persistência"]
    D1[("MySQL: domain_events · pipeline_jobs · decia_sessions · ai_inference_log")]
    D2[("OpenSearch: wai-memory")]
    D3[("MySQL: memory_queries · ai_questions · analytical_summaries · final_decisions")]
    D4[("Redis: cache de facetas do explorador")]
    D5[("MySQL: vw_decisions_with_sources · metric_snapshots")]
  end
  U1 --> S1 --> S2 --> D1
  S2 --> S3
  S3 -->|"sim"| A2 --> S4
  S3 -->|"não"| A1 --> S4
  S4 --> S5 --> D2
  S5 --> D1
  S4 -. "erro de indexação" .-> S6 --> D1
  U2 --> S7
  S7 -->|"sim"| E1
  S7 -->|"não"| S8 --> A5 --> S9 --> D2
  S9 --> A3 --> S10 --> D3
  S10 --> W1
  W1 -. "abrir fonte" .-> E2
  U3 --> S11 --> D2
  S11 --> S12
  S12 -->|"sim"| A4 --> S13 --> D3
  S12 -->|"não"| S14 --> D3
  S13 --> W2
  S14 --> W2
  U4 --> S15 --> D2
  S15 --> D4
  S15 --> W3
  U5 --> S16 --> D5
  classDef err fill:#fde2e2,stroke:#b91c1c,color:#7f1d1d
  class E1,E2 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (wai-web)
  participant S as Service (wai-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01 e CA06 — indexação assíncrona após o commit
  U->>NX: chefe encerra a sessão (RF17)
  NX->>C: POST /api/sessions/{id}/close
  C->>S: SessionService.close (RF17)
  S->>DB: UPDATE decia_sessions SET status = ENCERRADA · INSERT domain_events (SessionClosed)
  S-->>NX: 200 (negócio concluído, sem esperar a indexação)
  EV->>S: MemoryIndexingListener.onSessionClosed(SessionClosed)
  S->>DB: INSERT pipeline_jobs (INDEXAR_MEMORIA, PENDENTE) → RODANDO
  S->>DB: SELECT sessão, mensagens resumidas, artefatos, decisão, metadados
  alt accessClass RESTRITO ou SIGILOSO
    S->>AI: EmbeddingPort local (LocalEmbeddingAdapter)
  else conteúdo PUBLICO ou INTERNO
    S->>AI: EmbeddingPort externo (GeminiEmbeddingAdapter)
  end
  AI-->>S: dense_vector
  S->>OS: PUT wai-memory/_doc (sourceType SESSAO, empresa, departamento, categoria, exercício, autor, data, visibility)
  alt OpenSearch indisponível
    OS-->>S: erro
    S->>DB: UPDATE pipeline_jobs SET status = REPROCESSAR, attempts+1, lastError · INSERT ai_inference_log (result ERRO)
    Note over S,DB: a sessão continua ENCERRADA (CA06)
  else ok
    S->>DB: UPDATE pipeline_jobs SET status = OK · UPDATE decia_sessions SET indexedInMemory = true
  end

  Note over U,EV: CA02 — pergunta em linguagem natural
  U->>NX: quem já fez convênio de pavimentação com a Caixa?
  NX->>C: POST /api/memory/query {text, filters}
  C->>S: MemoryService.query(userId, text, filters)
  alt texto vazio
    S-->>C: 422 VALIDACAO
  else ok
    S->>AI: embed(text)
    AI-->>S: vetor
    S->>OS: kNN wai-memory com filtros (companyId, visibility, departamento, perfil)
    OS-->>S: hits (excerpt, score, sourceType, sourceId)
    S->>AI: answerWithCitations(question, hits)
    AI-->>S: resposta + Citation[] ✦
    S->>DB: INSERT memory_queries · INSERT ai_inference_log (MEMORIA_BUSCA)
    S-->>NX: 200 resposta com trechos e links para sessão, tarefa, projeto
  end

  Note over U,EV: CA03 — IA do DECIA cita fontes por padrão
  U->>NX: participante pede recomendação na sessão
  NX->>C: POST /api/sessions/{id}/ai/recommend
  C->>S: AiEngine (RF8, RF11, RF16) → MemoryService.retrieveForSession(sessionId, context)
  S->>OS: kNN sobre o contexto da sessão
  OS-->>S: citações candidatas
  alt nenhuma citação acima do score mínimo
    S->>AI: recommendWithSources(context, [])
    AI-->>S: recomendação marcada sem precedente
  else há precedentes
    S->>AI: recommendWithSources(context, citations)
    AI-->>S: recomendação com baseado em sessão X, projeto Y ✦
  end
  S->>DB: INSERT ai_questions ou analytical_summaries com citationsJson
  S-->>NX: 200 recomendação com chips de fonte

  Note over U,EV: CA04 e CA05 — explorador e indicador
  U->>NX: abre /memory/explore
  NX->>C: GET /api/memory/explore?dept=SECID-UTS&year=2026
  C->>S: MemoryService.explore(companyId, facets)
  S->>R: GET memory:facets:{companyId}:{hash}
  alt cache vazio
    S->>OS: aggregate por departamento, categoria, exercício
    S->>R: SET com TTL
  end
  S-->>NX: 200 mapa ou grade + projetos semelhantes a este
  U->>NX: ADMIN abre dashboard RF18
  NX->>C: GET /api/admin/kpis
  C->>S: MemoryService.citationIndicator(period, deptId)
  S->>DB: SELECT vw_decisions_with_sources → metric_snapshots
  S-->>NX: 200 proporção de decisões com fontes institucionais
```

## 4. Máquina de estados

`InstitutionalMemoryDocument` não tem estados próprios (é um documento de índice). A máquina abaixo é a do **`PipelineJob` do tipo `INDEXAR_MEMORIA`** que o produz, com o reflexo em `DeciaSession.indexedInMemory`.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> PENDENTE : evento AFTER_COMMIT (SessionClosed, ArtifactGenerated, DecisionValidated, ProjectCompleted, TaskPublishedAsModel)
  PENDENTE --> RODANDO : worker pega o job
  RODANDO --> OK : documento indexado em wai-memory (CA01)
  RODANDO --> FALHA : erro não recuperável (ex. fonte apagada)
  RODANDO --> REPROCESSAR : OpenSearch ou embedding indisponível (CA06)
  REPROCESSAR --> RODANDO : retry com backoff (attempts+1)
  REPROCESSAR --> FALHA : attempts acima do máximo
  OK --> PENDENTE : fonte alterada ou reaberta (RF14) → reindexar
  OK --> [*]
  FALHA --> [*]
  note right of OK
    DeciaSession.indexedInMemory = true
    Documento passa a aparecer em /memory e nas citações (CA02, CA03)
  end note
  note right of REPROCESSAR
    A operação de negócio já foi confirmada
    Log em ai_inference_log (result ERRO)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Next.js (frontend)"]
    direction TB
    P1["app/memory/page.tsx · busca em linguagem natural"]
    P2["app/memory/explore/page.tsx · mapa ou grade por departamento, categoria, exercício"]
    P3["app/decia/[sessionId] · chips baseado em e sem precedente"]
    P4["app/admin/dashboard · indicador objetivo 3"]
    UI1["components/ui: CitationChip · NoPrecedentBadge · MemoryResultCard · FacetMap"]
  end
  subgraph WEB["wai-web (REST · br.gov.pr.secid.workai.web)"]
    direction TB
    C1["MemoryController"]
    C2["SessionAiController (RF8, RF11, RF16)"]
  end
  subgraph APP["wai-application"]
    direction TB
    S1["MemoryService"]
    S2["MemoryIndexingListener (AFTER_COMMIT)"]
    S3["AiEngine"]
    S4["AccessPolicy"]
    PT1["SearchIndexPort"]
    PT2["EmbeddingPort"]
    PT3["AiProviderPort"]
  end
  subgraph DOM["wai-domain"]
    direction TB
    E1["InstitutionalMemoryDocument · Citation · MemoryQuery"]
    E2["DeciaSession · SessionArtifact · FinalDecision · AiQuestion · AnalyticalSummary · ProjectScheme · TaskItem"]
    E3["PipelineJob · DomainEventOutbox · AiInferenceLog · MetricSnapshot"]
  end
  subgraph INFRA["wai-infrastructure"]
    direction TB
    I1["search-opensearch: OpenSearchIndexAdapter (wai-memory, dense_vector)"]
    I2["ai-providers: GeminiEmbeddingAdapter · LocalEmbeddingAdapter · ClaudeAdapter"]
    I3["persistence-mysql: MemoryQuery/PipelineJob/AiInferenceLog repositories · vw_decisions_with_sources"]
    I4["cache-redis: facetas do explorador"]
    I5["platform: OutboxPublisher · PipelineJob worker · FeatureFlag opensearch.enabled"]
  end
  subgraph EXT["Serviços externos"]
    X1(["Claude / Gemini"])
  end
  P1 --> C1
  P2 --> C1
  P3 --> C2
  P4 --> C1
  UI1 -.-> P1
  UI1 -.-> P3
  C1 --> S1
  C2 --> S3
  S3 --> S1
  S2 --> S1
  S1 --> S4
  S1 -.-> PT1
  S1 -.-> PT2
  S3 -.-> PT3
  S1 --> E1
  S2 --> E2
  S2 --> E3
  S1 --> I3
  S1 --> I4
  I5 --> S2
  I1 -. implementa .-> PT1
  I2 -. implementa .-> PT2
  I2 -. implementa .-> PT3
  I2 --> X1
  classDef port stroke-dasharray: 4 3
  class PT1,PT2,PT3 port
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF33.CA01 | Classes `InstitutionalMemoryDocument` (metadados empresa, departamento, categoria, exercício, autor, indexedAt, embedding), `MemorySourceType`, `MemoryIndexingListener.on*`, `DeciaSession.indexedInMemory`; atividades `U1 → S1 → S2 → S3 → A1/A2 → S4 → S5`; sequência bloco «CA01 e CA06» (PUT wai-memory/_doc); transições `PENDENTE → RODANDO → OK`; componentes `search-opensearch`, `MemoryIndexingListener` |
| RF33.CA02 | Classes `MemoryService.query`, `Citation` (excerpt, url, score), `MemoryQuery`, `AccessPolicy.visibilityFilter`, `AiEngine.answerWithCitations`; atividades `U2 → S7 → S8 → A5 → S9 → A3 → S10 → W1` (422 VALIDACAO, 403 ACESSO_NEGADO ao abrir fonte); sequência bloco «CA02»; nota do estado `OK`; componentes `app/memory`, `MemoryResultCard`, `MemoryController` |
| RF33.CA03 | Classes `MemoryService.retrieveForSession`, `AiEngine.recommendWithSources`, `AiQuestion.citationsJson`, `AnalyticalSummary.recommendationsJson[].citations`, `FinalDecision.citationsJson`, nota de `Citation` (vazio = sem precedente); atividades `U3 → S11 → S12 → S13/S14 → W2`; sequência bloco «CA03»; componentes `CitationChip`, `NoPrecedentBadge`, `SessionAiController` |
| RF33.CA04 | Classes `MemoryService.explore/similarProjects`, `SearchIndexPort.aggregate`; atividades `U4 → S15 → D2/D4 → W3`; sequência bloco «CA04 e CA05» (aggregate + cache Redis); componentes `app/memory/explore`, `FacetMap`, `cache-redis` |
| RF33.CA05 | Classes `MemoryService.citationIndicator`, `MetricSnapshot`; atividades `U5 → S16 → D5` (`vw_decisions_with_sources`); sequência bloco «CA04 e CA05» (GET /api/admin/kpis); componentes `app/admin/dashboard`, `persistence-mysql: vw_decisions_with_sources` |
| RF33.CA06 | Classes `DomainEventOutbox`, `PipelineJob` (status, attempts, lastError), `PipelineJobStatus`, `AiInferenceLog result ERRO`, `OutboxPublisher`; atividades `S2`, `S4 -.-> S6` (negócio intacto); sequência bloco «CA01 e CA06» alt «OpenSearch indisponível»; transições `RODANDO → REPROCESSAR → RODANDO/FALHA` e nota; componentes `platform: OutboxPublisher · PipelineJob worker` |

> Dúvidas para `docs/DECISOES.md`: Claude não oferece API de embeddings — `EmbeddingPort` precisa de Gemini (text-embedding) ou modelo local (`ai.local.only`), e a TAXONOMIA lista só CLAUDE · GEMINI · LOCAL como providers; comportamento com `opensearch.enabled = false` (fallback MySQL FULLTEXT sem semântica ou funcionalidade desativada); `MemorySourceType` e `PipelineJobStatus` não são enums nomeados na TAXONOMIA; score mínimo para "sem precedente" é parâmetro a definir.
