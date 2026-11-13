# RF33 — Consultar a Memória Institucional (busca semântica sobre sessões encerradas, artefatos, projetos e tarefas) e fazer a IA do DECIA citar fontes institucionais
**HU:** HU33 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** RF26 Explorador Global + RF24 IA (serviços externos) · **Aba/rota:** Memória Institucional (`/memory`: pergunta em linguagem natural, explorador visual por departamento/categoria/exercício), citações dentro da sessão (`/decia/[sessionId]`), "projetos parecidos" em `/search` (RF27.CA05), indicador em `/admin/dashboard` (RF18)
**Critérios de aceite cobertos:** RF33.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs. Base do objetivo 3 (justificativa rastreável correlacionada à base de conhecimento institucional).

Índice OpenSearch `ws-memory` (`InstitutionalMemoryDocument`: `sourceType` SESSAO · ARTEFATO · DECISAO · PROJETO · TAREFA · DOCUMENTO, `embedding dense_vector`, metadados empresa/departamento/categoria/exercício/autor/data, `visibility`, `accessClass`). Indexação **assíncrona** por `PipelineJob INDEXAR_MEMORIA` disparado AFTER_COMMIT quando algo é encerrado/publicado (sessão ARQUIVADA, artefato, decisão VALIDADA, projeto CONCLUIDO, tarefa MODELO_PUBLICO, documento indexável); falha não bloqueia o negócio (`PipelineJob FALHA/REPROCESSAR`, log em `ai_inference_log`). Toda consulta passa pelo filtro de visibilidade/perfil; RESTRITO/SIGILOSO nunca é embeddado por provedor externo (só `LocalEngine`). Respostas carregam `Citation[]` (sourceType, sourceId, excerpt, url, score); vazio = **"sem precedente"**. Flag `opensearch.enabled`; sem ela, `/memory` mostra EmptyState "índice desligado" e a IA marca tudo "sem precedente".

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Todos são planejados: `/memory` é página-esqueleto e não há índice `ws-memory` nem `MemoryService`.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  autenticado["«ator» Pessoa autenticada"]:::ator
  participante_sessao["«ator» Admin · Membro · Observador da sessão"]:::ator
  admin["«ator» Administrador"]:::ator
  subgraph SIS["Work Station — RF33 Memória Institucional"]
    direction TB
    UC1(["UC1 Indexar o que foi encerrado ou publicado"]):::ucPlan
    UC2(["UC2 Perguntar à Memória em linguagem natural"]):::ucPlan
    UC3(["UC3 Explorar por departamento, categoria e exercício"]):::ucPlan
    UC4(["UC4 Ver projetos parecidos"]):::ucPlan
    UC5(["UC5 Ler recomendação com fontes ou sem precedente"]):::ucPlan
    UC6(["UC6 Acompanhar a proporção de decisões com fontes"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  autenticado --- UC2
  autenticado --- UC3
  autenticado --- UC4
  participante_sessao --- UC5
  admin --- UC6
  UC1 --- ia
  UC2 --- ia
  UC5 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Indexar o que foi encerrado ou publicado | `ia` | RF33.CA01, RF33.CA06 | planejado (assíncrono; falha não bloqueia o negócio) |
| UC2 Perguntar à Memória em linguagem natural | `autenticado`, `ia` | RF33.CA02 | planejado |
| UC3 Explorar por departamento, categoria e exercício | `autenticado` | RF33.CA04 | planejado |
| UC4 Ver projetos parecidos | `autenticado` | RF33.CA04 | planejado (em `/search`, RF27.CA05) |
| UC5 Ler recomendação com fontes ou sem precedente | `participante_sessao`, `ia` | RF33.CA03 | planejado |
| UC6 Acompanhar a proporção de decisões com fontes | `admin` | RF33.CA05 | planejado |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_ia {
  class InstitutionalMemoryDocument {
    <<entity>>
    +docId: String
    +sourceType: MemorySourceType
    +sourceId: UUID
    +companyId: UUID
    +departmentId: UUID
    +category: String
    +exerciseYear: int
    +authorId: UUID
    +title: String
    +text: String
    +embedding: dense_vector
    +visibility: Visibility
    +accessClass: AccessClassification
    +indexedAt: Instant
  }
  class Citation {
    <<entity>>
    +sourceType: MemorySourceType
    +sourceId: UUID
    +excerpt: String
    +url: String
    +score: BigDecimal
  }
  class MemoryQuery {
    <<entity>>
    +id: UUID
    +userId: UUID
    +queryText: String
    +filtersJson: JSON
    +resultsJson: JSON
    +aiInferenceId: UUID
    +at: Instant
  }
  class AiInferenceLog {
    <<entity>>
    +capability: AiCapability
    +provider: AiProvider
    +result: InferenceResult
    +fallbackUsed: boolean
    +correlationId: String
  }
  class MetricSnapshot {
    <<entity>>
    +metricCode: String
    +scope: MetricScope
    +value: BigDecimal
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
}

namespace ws_domain_fontes {
  class DeciaSession {
    <<entity>>
    +id: UUID
    +status: SessionStatus
    +indexedInMemory: boolean
  }
  class SessionArtifact {
    <<entity>>
    +sessionId: UUID
    +kind: String
    +contentMd: String
  }
  class FinalDecision {
    <<entity>>
    +sessionId: UUID
    +status: DecisionStatus
    +citationsJson: JSON
  }
  class AnalyticalSummary {
    <<entity>>
    +sessionId: UUID
    +recommendationsJson: JSON
  }
  class AiQuestion {
    <<entity>>
    +sessionId: UUID
    +citationsJson: JSON
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +status: ProjectStatus
    +visibility: Visibility
  }
  class TaskItem {
    <<entity>>
    +id: UUID
    +state: TaskState
    +accessClass: AccessClassification
  }
  class SessionArchive {
    <<entity>>
    +sessionId: UUID
    +exportJsonMediaId: UUID
  }
}

namespace ws_domain_platform {
  class PipelineJob {
    <<entity>>
    +id: UUID
    +type: String
    +targetType: String
    +targetId: UUID
    +status: PipelineJobStatus
    +attempts: int
    +lastError: String
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

namespace ws_application {
  class MemoryService {
    <<service>>
    +ask(actor, question, filters) MemoryAnswer
    +explore(actor, facets) ExplorerView
    +similar(actor, projectId) List~Citation~
  }
  class MemoryIndexer {
    <<service>>
    +onClosedOrPublished(event) PipelineJob
    +index(job) InstitutionalMemoryDocument
  }
  class CitationService {
    <<service>>
    +citeFor(sessionId, text) List~Citation~
    +markNoPrecedent(recommendation)
  }
  class VisibilityFilter {
    <<service>>
    +allowedFor(viewer) Filter
  }
  class MetricCalculator {
    <<service>>
    +decisionsWithSources(scope, period) MetricSnapshot
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
    +embed(text, accessClass) float[]
  }
  class SearchIndexPort {
    <<port>>
    +index(ws_memory, doc)
    +knn(ws_memory, embedding, filter, k)
  }
  class JobPort {
    <<port>>
    +enqueue(PipelineJob)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class MemoryController {
    <<controller>>
    +POST_api_memory_ask(question, filters)
    +GET_api_memory_explore(facets)
    +GET_api_memory_similar(projectId)
  }
}

namespace ws_infrastructure {
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
  class LocalEmbeddingEngine {
    <<adapter>>
  }
  class ClaudeProvider {
    <<adapter>>
  }
}

DeciaSession ..> InstitutionalMemoryDocument : SESSAO
SessionArtifact ..> InstitutionalMemoryDocument : ARTEFATO
FinalDecision ..> InstitutionalMemoryDocument : DECISAO
ProjectScheme ..> InstitutionalMemoryDocument : PROJETO CONCLUIDO
TaskItem ..> InstitutionalMemoryDocument : TAREFA MODELO_PUBLICO
SessionArchive ..> InstitutionalMemoryDocument : texto exportado
PipelineJob ..> InstitutionalMemoryDocument : INDEXAR_MEMORIA
FinalDecision "1" o-- "0..*" Citation : citationsJson
AnalyticalSummary "1" o-- "0..*" Citation : recommendationsJson citations
AiQuestion "1" o-- "0..*" Citation : citationsJson
MemoryQuery "1" o-- "0..*" Citation : resultsJson
MemoryController --> MemoryService
MemoryService --> VisibilityFilter
MemoryService --> AiEngine
MemoryService --> SearchIndexPort
MemoryService ..> MemoryQuery
MemoryIndexer --> JobPort
MemoryIndexer --> AiEngine
MemoryIndexer --> SearchIndexPort
DomainEvents ..> MemoryIndexer : AFTER_COMMIT
CitationService --> SearchIndexPort
CitationService --> AiEngine
MetricCalculator ..> FinalDecision : vw_decisions_with_sources
AiEngine ..> AiInferenceLog
OpenSearchIndexAdapter ..|> SearchIndexPort
LocalEmbeddingEngine ..> AiEngine : RESTRITO SIGILOSO
ClaudeProvider ..> AiEngine
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (usuário autenticado · participante de sessão · ADMIN)"]
    A0([Algo é encerrado ou publicado]) --> A1["Sessão ARQUIVADA · artefato · decisão VALIDADA · projeto CONCLUIDO · tarefa MODELO_PUBLICO · documento"]
    A2([Abre /memory]) --> A3["Pergunta em linguagem natural ou navega no explorador"]
    A4([Dentro da sessão DECIA]) --> A5["Lê recomendação da IA com fontes ou sem precedente"]
    A6([ADMIN abre o dashboard]) --> A7["Proporção de decisões com fontes institucionais"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/memory · decia/[sessionId] · admin/dashboard)"]
    F1["AskBox + Facets (departamento, categoria, exercício) · POST /api/memory/ask"]
    F2["ExplorerGrid (mapa/grade) · GET /api/memory/explore"]
    F3["Resposta com trechos e CitationChip com link para sessão, tarefa ou projeto · Spark ✦"]
    F4["CitationChip inline nas mensagens da IA · Tag sem precedente"]
    F5["EmptyState índice desligado quando opensearch.enabled = false"]
  end

  subgraph WEB["ws-web · MemoryController"]
    W1["JWT · CorrelationIdFilter · rate limit por usuário"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    P1["DomainEvents AFTER_COMMIT → MemoryIndexer.onClosedOrPublished → PipelineJob INDEXAR_MEMORIA PENDENTE"]
    P2{"Item RESTRITO/SIGILOSO?"}
    P2 -->|sim| P3["Embedding só com LocalEmbeddingEngine"]
    P2 -->|não| P4["Masking + embedding pelo provedor"]
    P5["Indexa InstitutionalMemoryDocument com metadados e visibilidade"]
    P6{"Falhou?"}
    P6 -->|sim| P7["PipelineJob FALHA → REPROCESSAR (retry com backoff) · ai_inference_log ERRO · negócio não bloqueia"]
    P6 -->|não| P8["PipelineJob OK · DeciaSession.indexedInMemory = true"]
    P9{"Pergunta vazia ou acima de 500 chars?"}
    P9 -->|sim| E1["422 VALIDACAO details.question"]
    P10["VisibilityFilter.allowedFor(viewer) aplicado ao kNN"]
    P11["MemoryService.ask: embed → kNN top-k → IA redige resposta citando trechos"]
    P12{"Resultados vazios?"}
    P12 -->|sim| P13["Resposta marcada sem precedente"]
    P12 -->|não| P14["MemoryAnswer com Citation[] (trecho, link, score) · MemoryQuery gravada"]
    P15["CitationService.citeFor em RF8/RF11/RF16: cada recomendação traz baseado em: [sessão X, projeto Y] ou sem precedente"]
    P16["MetricCalculator.decisionsWithSources → vw_decisions_with_sources → MetricSnapshot"]
  end

  subgraph IA["AiEngine (MEMORIA_BUSCA)"]
    I1["embed(text, accessClass): Claude/Gemini embeddings ou LocalEmbeddingEngine"]
    I2["Redação da resposta só sobre os trechos recuperados (nunca inventa fonte)"]
    I3["AiInferenceLog (provider, fallbackUsed, correlationId)"]
  end

  subgraph DB["Persistência"]
    D1[("OpenSearch ws-memory dense_vector · flag opensearch.enabled")]
    D2[("MySQL pipeline_jobs · memory_queries · ai_inference_log · metric_snapshots · view vw_decisions_with_sources")]
    D3[("S3 session_archives export JSON (texto-fonte) · flag storage.s3")]
  end

  A1 --> P1 --> P2
  P3 --> P5
  P4 --> P5
  P5 --> D1 --> P6
  P7 --> D2
  P8 --> D2
  P1 --> D3
  A3 --> F1 --> W1 --> P9 -->|não| P10 --> P11 --> I1 --> D1
  P11 --> I2 --> I3 --> P12
  P13 --> F3
  P14 --> D2
  P14 --> F3
  A3 --> F2 --> W1 --> P10
  A5 --> F4
  P15 --> I1
  P15 --> F4
  A7 --> P16 --> D2
  F5 -.-> F1
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
  participant OS as OpenSearch
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over EV,OS: CA01 + CA06 — indexação assíncrona
  EV->>S: SessionArchived(sessionId) (RF17)
  S->>DB: insert pipeline_jobs (INDEXAR_MEMORIA, PENDENTE)
  S->>S3: get export JSON da sessão (texto-fonte)
  S->>AI: embed(texto, accessClass)
  alt RESTRITO ou SIGILOSO
    AI->>AI: LocalEmbeddingEngine (nunca sai)
  else provedor externo
    AI->>AI: Claude embeddings → fallback Gemini → fallback local
  end
  AI->>DB: insert ai_inference_log
  alt OpenSearch indisponível
    S->>DB: pipeline_jobs FALHA → REPROCESSAR (backoff) · negócio já commitado
  else ok
    S->>OS: index ws-memory (metadados, visibility, accessClass)
    S->>DB: pipeline_jobs OK · decia_sessions.indexed_in_memory = true
  end

  Note over U,OS: CA02 — pergunta em linguagem natural
  U->>FE: quem já fez convênio de pavimentação com a Caixa?
  FE->>C: POST /api/memory/ask {question, filters}
  C->>S: MemoryService.ask(actor, question, filters)
  alt pergunta vazia ou longa demais
    S-->>C: 422 VALIDACAO details.question
  else ok
    S->>S: VisibilityFilter.allowedFor(actor)
    S->>AI: embed(question)
    S->>OS: knn ws-memory (k = 10, filtro de visibilidade e perfil)
    OS-->>S: hits com trechos e score
    alt sem hits
      S-->>FE: MemoryAnswer sem precedente
    else com hits
      S->>AI: run(MEMORIA_BUSCA, redigir sobre os trechos)
      AI-->>S: resposta + Citation[] (sourceType, sourceId, excerpt, url, score) ✦
      S->>DB: insert memory_queries
      S-->>FE: MemoryAnswer com CitationChips e links
    end
  end

  Note over U,OS: CA03 — IA do DECIA cita fontes
  U->>FE: participante envia mensagem na sessão
  FE->>C: POST /api/decia/sessions/{id}/messages
  C->>S: DeciaMessageService.send → DomainEvents MessageSent
  EV->>S: SummaryService / AiQuestionService (RF8, RF11, RF16)
  S->>S: CitationService.citeFor(sessionId, texto)
  S->>OS: knn ws-memory (filtro da empresa e visibilidade)
  alt sem precedente
    S->>DB: recomendação marcada sem precedente
  else com fontes
    S->>DB: recommendationsJson[].citations / ai_questions.citationsJson
  end
  S-->>FE: mensagem da IA com baseado em: [sessão X, projeto Y]

  Note over U,DB: CA05 — indicador do objetivo 3
  U->>FE: ADMIN abre dashboard
  FE->>C: GET /api/admin/dashboard
  C->>S: MetricCalculator.decisionsWithSources(EMPRESA, período)
  S->>DB: vw_decisions_with_sources → metric_snapshots
  S-->>FE: proporção de decisões com fontes institucionais
```

## 4. Máquina de estados

Entidade central: `PipelineJob.status` (`PipelineJobStatus`) do job `INDEXAR_MEMORIA` — a Memória em si é um índice sem estado; `DeciaSession.indexedInMemory` espelha o OK.

```mermaid
stateDiagram-v2
  [*] --> PENDENTE: AFTER_COMMIT de encerrar/publicar (sessão, artefato, decisão, projeto, tarefa, documento) (CA01)
  PENDENTE --> RODANDO: worker pega o job (embedding + index)
  RODANDO --> OK: documento indexado em ws-memory · indexedInMemory = true
  RODANDO --> FALHA: OpenSearch ou embedding indisponível · ai_inference_log ERRO (CA06)
  FALHA --> REPROCESSAR: retry com backoff (attempts menor que o máximo)
  REPROCESSAR --> RODANDO: próxima tentativa
  FALHA --> [*]: attempts esgotados → alerta no painel admin, negócio intacto
  OK --> PENDENTE: fonte reeditada ou visibilidade alterada → reindexação
  OK --> [*]
  note right of FALHA
    Falha de indexação nunca bloqueia a operação
    de negócio que a disparou (CA06).
  end note
  note right of OK
    RESTRITO/SIGILOSO indexado só com embedding local
    e nunca devolvido a quem não tem acesso (CA02).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/memory · decia/[sessionId] (CitationChip) · search (parecidos) · admin/dashboard"]
    R2["components: AskBox · Facets · ExplorerGrid · CitationChip · Tag sem precedente · Spark ✦ · EmptyState (índice desligado)"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    MC["MemoryController (@Operation RF33.CA01-CA06)"]
    SEC["SecurityConfig · CorrelationIdFilter · AuthRateLimitFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    MS["ai/MemoryService"]
    MI["ai/MemoryIndexer (listener AFTER_COMMIT)"]
    CIT["ai/CitationService (usado por RF8 · RF11 · RF16)"]
    VF["social/VisibilityFilter"]
    MC2["metrics/MetricCalculator (vw_decisions_with_sources)"]
    AIE["ai/AiEngine (MEMORIA_BUSCA · embed) · Masking (main)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    PORTS["ports: SearchIndexPort · JobPort · AiProviderPort · StoragePort"]
  end
  subgraph DOM["ws-domain"]
    ENT["InstitutionalMemoryDocument · Citation · MemoryQuery · PipelineJob (planejado) · AiInferenceLog (V2)"]
  end
  subgraph INFRA["ws-infrastructure"]
    OSA["search-opensearch ws-memory dense_vector (flag opensearch.enabled)"]
    MY["persistence-mysql pipeline_jobs · memory_queries · views"]
    S3A["storage-s3 session_archives (flag storage.s3)"]
    AIC["ai-providers/ai-claude embeddings (ai.provider.claude)"]
    AIG["ai-providers/ai-gemini (ai.provider.gemini)"]
    AIL["ai-providers/ai-local LocalEmbeddingEngine (ai.local.only)"]
  end
  BFF --> MC --> SEC
  MC --> MS
  MS --> VF
  MS --> AIE
  MS --> PORTS
  DE --> MI --> AIE
  MI --> PORTS
  CIT --> AIE
  CIT --> PORTS
  MC2 --> MY
  MS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> OSA --> OPENS[("OpenSearch")]
  PORTS --> S3A --> S3[("S3 / MinIO")]
  PORTS --> AIC --> CLAUDE["Claude"]
  PORTS --> AIG --> GEM["Gemini"]
  PORTS --> AIL
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF33.CA01 | `InstitutionalMemoryDocument` (sourceType, metadados), `MemoryIndexer.onClosedOrPublished/index`, `PipelineJob INDEXAR_MEMORIA`, `DeciaSession.indexedInMemory` | A1 → P1 → P2 → P3/P4 → P5 → P8 | 1–13 | `[*] → PENDENTE → RODANDO → OK` | `MI`, `OSA`, `S3A` |
| RF33.CA02 | `MemoryService.ask`, `Citation` (excerpt, url, score), `MemoryQuery`, `VisibilityFilter` | A3 → F1 → P9 (422) → P10 → P11 → P12 → P13/P14 → F3 | 14–28 | nota de OK (visibilidade) | `MS`, `AskBox`, `CitationChip`, `VF` |
| RF33.CA03 | `CitationService.citeFor/markNoPrecedent`, `AnalyticalSummary.recommendationsJson[].citations`, `AiQuestion.citationsJson`, `FinalDecision.citationsJson` | A5 → F4 · P15 | 29–37 | — | `CIT`, `Tag sem precedente` |
| RF33.CA04 | `MemoryService.explore/similar`, facets departamento/categoria/exercício, RF27.CA05 | A3 → F2 → P10 | — (GET /explore, /similar) | — | `ExplorerGrid`, `Facets` |
| RF33.CA05 | `MetricCalculator.decisionsWithSources`, view `vw_decisions_with_sources`, `MetricSnapshot` | A7 → P16 | 38–42 | — | `MC2`, `MY`, `admin/dashboard` |
| RF33.CA06 | `DomainEvents` AFTER_COMMIT, `PipelineJob FALHA/REPROCESSAR`, `AiInferenceLog ERRO` | P1 → P6 → P7 | 1, 9–11 | `RODANDO → FALHA → REPROCESSAR` + nota | `DE`, `MI`, `MY` |

Tela/aba: `/memory` (esqueleto em `app/(shell)/memory/page.tsx`)

## Estado da implementação (12/11/2026)

Front DEMO, sem API nem OpenSearch: `/memory` é funcional sobre um **índice vetorial determinístico e local** (`lib/memory`, sem serviço externo nem embeddings de provedor — o mesmo caminho vale para RESTRITO/SIGILOSO). Acervo da aba = corpus de exemplo fictício (24 documentos: relatórios, portarias, atas, normas internas, sessão, projeto, tarefa-modelo e artefatos; unidades SECID, SECID-UTS, CPOE, GOF, AJUR; exercícios 2023–2026; PÚBLICO a SIGILOSO) + decisões encerradas do DECIA DEMO + documentos ingeridos na aba. Trecho = janela de até 2 frases com sobreposição, posições exatas (`body.slice(start, end) === text`); nota 0–1 = 0,45 · cosseno TF-IDF dos radicais (radicalização leve do português, sinônimos do serviço público com peso 0,6, grafia aproximada por Dice de trigramas) + 0,20 · cosseno de trigramas de caracteres por hashing (FNV-1a, 2^18) + 0,35 · BM25 normalizado (k1 = 1,2; b = 0,75). Mínimo padrão 0,05; abaixo disso nada volta. A Q-21 continua aberta; no DEMO valem: índice local (sem provedor de embeddings), nota mínima 0,05 para a busca e 0,2 com cobertura de 60 % dos termos da pergunta para a IA citar.

| CA | Situação | Onde |
|---|---|---|
| RF33.CA01 | DEMO: documento da Memória com tipo, unidade, exercício, data, classe de acesso, origem e público restrito; indexação local na hora. Decisões do DECIA DEMO já decididas (DECIDIDA → ARQUIVADA) viram documentos por adaptador somente leitura, relidos quando o repositório do DECIA muda (decisão PRIVADA só para participantes, salvo lição compartilhada). Ingestão local de texto colado ou .txt/.md (até 400 KB) com classe de acesso. `PipelineJob INDEXAR_MEMORIA`, OpenSearch `ws-memory`, `indexedInMemory` e indexação automática de sessão arquivada/projeto concluído/tarefa modelo público não feitos | `lib/memory/corpus.ts`, `lib/memory/adapters.ts`, `lib/memory/ingest.ts`, `lib/memory/store.ts`, `lib/memory/engine.ts` |
| RF33.CA02 | DEMO: pergunta em linguagem natural (vazia ou acima de 500 caracteres recusada), trechos exatos com destaque, citação curta ("Portaria 12/2025 — SECID, art. 3º"), link para o leitor, pontuação e "por que entrou" (termos casados — exato, sinônimo, aproximado —, cobertura, componentes da nota). Filtro de visibilidade ANTES da nota: PÚBLICO para visitante; RESTRITO só da própria unidade (EMPRESA lê todas); SIGILOSO nunca sem concessão; ADMIN não lê restrito. `MemoryQuery` persistida e rate limit dependem da API | `lib/memory/engine.ts`, `lib/memory/access.ts`, `components/memory/MemoryResults.tsx`, `components/memory/MemoryWorkspace.tsx` |
| RF33.CA03 | DEMO: contrato `searchMemory` ligado à implementação real (`lib/memory/index.ts` registra; no navegador o contrato se liga sozinho ao ser carregado) — a sessão do DECIA e a Transição citam por ele. "Perguntar à IA ✦" em `/memory`: resposta simulada só com frases exatas dos trechos, citações numeradas [1], [2] que levam ao cartão do trecho; sem trecho relevante, "sem fonte" (D-12). Respeita a autonomia da IA (Manual desliga). `citationsJson` em resumo/decisão final no servidor não feito | `lib/memory/answer.ts`, `lib/memory/index.ts`, `lib/memory/search.ts`, `components/memory/MemoryAnswer.tsx` |
| RF33.CA04 | DEMO: explorador visual com contagens só do que a pessoa lê — tipos com contagem e grade unidade × exercício (tabela acessível; a célula filtra e lista os documentos) —, filtros de tipo, unidade e exercício na busca e leitor com o trecho citado destacado (`/memory?doc=<id>&trecho=<início>-<fim>`). "Projetos parecidos" em `/search` (RF27.CA05) não feito | `lib/memory/explore.ts`, `components/memory/MemoryExplorer.tsx`, `components/memory/MemoryReader.tsx` |
| RF33.CA05 | Não feito: indicador de decisões com fontes no painel do administrador (`vw_decisions_with_sources`) | — |
| RF33.CA06 | Não se aplica ao DEMO (índice síncrono na aba; ingestão inválida não muda nada). Fila assíncrona com FALHA/REPROCESSAR e `ai_inference_log` dependem do backend | — |

Testes: `lib/memory/*.test.ts` (trecho exato, ordenação numa pergunta conhecida, acento/flexão/erro de digitação, sinônimo, filtro de acesso, mínimo, determinismo, resposta citada e "sem fonte", adaptador do DECIA, ingestão, contrato) e `components/memory/memory.test.tsx` (tela e página).
