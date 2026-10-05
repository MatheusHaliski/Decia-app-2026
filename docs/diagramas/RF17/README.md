# RF17 — Visualizar esquemas de tarefa & projetos criados por outros usuários na rede social do Work Station, através da aba "Buscar"
**HU:** HU17 · **Sprint (board Work Station):** a confirmar (card renomeado em 2026-10-02; origem RF27 = Sprint 4) · **Equivalente FAI:** RF8 Buscar/Explorar (busca textual com abas e contadores, "looks parecidos com este") · **Aba/rota:** Buscar (`/search`, abas PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO) e páginas de leitura de esquema de terceiros (`/tasks/[id]`, `/projects/[id]`)
**Critérios de aceite cobertos:** RF17.CA01 … RF17.CA06 — corpo do card vazio: CAs derivados do título + HU17 + RF27 (CA03 busca, CA04 visibilidade, CA05 semântica); todos marcados "(CA a confirmar)". O Mural (RF27.CA01/CA02/CA06) continua no RF27.

> **HU17** — COMO usuário autenticado no sistema POSSO visualizar esquemas de tarefa ou projeto criados por outros usuários, chefes ou empresas na aba "Buscar/Explorar" PARA me inspirar em outras combinações e ampliar minhas referências de projetos.

A aba **Buscar** é a porta de **descoberta de esquemas de terceiros**: busca textual (título, descrição, tags, texto OCR dos anexos via `TaskAttachment.ocrTextRef`) nos índices OpenSearch `ws-tasks`, `ws-projects`, `ws-people`, `ws-orgs`, devolvendo **5 abas com contadores**. Todo resultado passa pelo `visibilityFilter` do viewer (outra empresa só vê `PUBLICA`; `accessClass` SIGILOSO nunca é indexado para terceiros). Ao abrir um resultado o usuário vê o **esquema completo em modo leitura** (anatomia do card e ficha — `docs/design-system/ANATOMIAS_E_ESTUDIO.md` §2/§3) com **crédito do autor**, as ações sociais inline (RF18/RF19), "Levar ao meu acervo" (RF7/RF41.CA08) e, para projetos, **"projetos parecidos com este"** (kNN em `ws-memory`, RF33). A indexação é assíncrona: publicar ou mudar visibilidade emite evento AFTER_COMMIT → `PipelineJob INDEXAR_BUSCA` (proposta de novo tipo, hoje só existe `INDEXAR_MEMORIA`).

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF17.CA01** (CA a confirmar) | Dado um usuário autenticado em `/search`, quando digita um termo, então o sistema busca em título, descrição, tags e texto OCR (OpenSearch `ws-tasks`, `ws-projects`, `ws-people`, `ws-orgs`) e devolve **5 abas com contadores** (PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO) em ≤ 1 s p95; termo vazio mostra sugestões (recentes, em alta, chancelados). |
| **RF17.CA02** (CA a confirmar) | Dado uma aba, quando aplico filtros (categoria, tipo, fase, departamento, exercício, chancelado, prazo) e pagino (20 por página), então a URL reflete `q`, `tab`, filtros e `page`; a tela mostra skeleton ao carregar, estado vazio ilustrado e botão "tentar de novo" em erro (`503 INDISPONIVEL`). |
| **RF17.CA03** (CA a confirmar) | Dado os resultados, quando são devolvidos, então só contêm itens que o viewer pode ver: `PUBLICA` sempre; `EMPRESA` se mesma empresa; `DEPARTAMENTO` se membro; `PRIVADA` só os meus; `RASCUNHO` nunca aparece para terceiros; `accessClass` SIGILOSO nunca é indexado e RESTRITO só para o departamento dono. Resultados de outra empresa só se `PUBLICA`. |
| **RF17.CA04** (CA a confirmar) | Dado um resultado de tarefa ou projeto de outro usuário, quando o abro, então vejo o esquema completo em **modo leitura** (ficha, fases e tarefas do projeto, capa, chancelas) com o **crédito do autor** (avatar + link para RF16/RF14/RF15), as ações inline do RF18/RF19 e "Levar ao meu acervo" (RF7/RF41.CA08); edição é `403 ACESSO_NEGADO`; item que ficou PRIVADA depois de indexado responde `404` e sai do índice. |
| **RF17.CA05** (CA a confirmar) | Dado um projeto aberto, quando clico em "projetos parecidos com este", então o sistema gera o embedding (`AiEngine` `MEMORIA_BUSCA`) e faz kNN em `ws-memory` com o mesmo `visibilityFilter`, devolvendo até 10 projetos com score e motivo ("mesmo processo, 4 tarefas em comum"); sem IA disponível cai para "mais do mesmo processo/departamento" (busca textual). |
| **RF17.CA06** (CA a confirmar) | Dado que um autor publica, altera a visibilidade ou arquiva uma tarefa/projeto, quando a transação é confirmada, então o evento AFTER_COMMIT agenda `PipelineJob INDEXAR_BUSCA` e o índice reflete a mudança em ≤ 60 s; falha deixa o job `REPROCESSAR` sem afetar a operação do autor. |

| Aba de Buscar | Índice OpenSearch | Entidade | Filtros |
|---|---|---|---|
| PROJETOS | `ws-projects` | `ProjectScheme` | fase, departamento, exercício, chancelado, prazo |
| TAREFAS | `ws-tasks` (+ texto OCR) | `TaskItem`, `TaskAttachment.ocrTextRef` | categoria, tipo, departamento, chancelado, prazo |
| PESSOAS | `ws-people` | `User` (EMPREGADO) | departamento, empresa |
| EMPRESAS | `ws-orgs` | `Company` | — |
| CHEFES DE DEPARTAMENTO | `ws-people` (profileType CHEFE_DEPARTAMENTO) | `User`, `Department.headUserId` | empresa, departamento |
| semântica | `ws-memory` kNN | `InstitutionalMemoryDocument` | sourceType PROJETO/TAREFA |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_alvos {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +companyId: UUID
    +departmentId: UUID
    +title: String
    +objective: String
    +descriptionMd: String
    +processTags: Set~ProcessTag~
    +currentPhase: ProjectPhase
    +status: ProjectStatus
    +visibility: Visibility
    +exerciseYear: int
    +sealIdsJson: JSON
    +coverUrl: String
    +nextMilestoneAt: LocalDate
    +viewsCount: long
    .. +25 campos ..
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +snapshotJson: JSON
  }
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +summary: String
    +descriptionMd: String
    +tags: Set~String~
    +category: TaskCategory
    +type: TaskType
    +processTags: Set~ProcessTag~
    +state: TaskState
    +visibility: Visibility
    +accessClass: AccessClassification
    +sealIdsJson: JSON
    +thumbnailUrl: String
    +viewsCount: long
    .. +40 campos ..
  }
  class TaskAttachment {
    <<entity>>
    +taskId: UUID
    +ocrTextRef: String OpenSearch
  }
  class User {
    <<entity>>
    +id: UUID
    +username: String
    +fullName: String
    +jobTitle: String
    +profileType: ProfileType
    +companyId: UUID
    +departmentId: UUID
    +avatarUrl: String
  }
  class Company {
    <<entity>>
    +id: UUID
    +legalName: String
    +slug: String
    +logoUrl: String
  }
  class Department {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +acronym: String
    +headUserId: UUID
  }
  class InstitutionalMemoryDocument {
    <<entity>>
    +docId: String
    +sourceType: MemorySourceType PROJETO TAREFA
    +sourceId: UUID
    +companyId: UUID
    +departmentId: UUID
    +visibility: Visibility
    +accessClass: AccessClassification
    +embedding: dense_vector
  }
  class MemoryQuery {
    <<entity>>
    +id: UUID
    +userId: UUID
    +queryText: String
    +filtersJson: JSON
    +resultsJson: JSON
    +aiInferenceId: UUID
  }
}

namespace ws_domain_plataforma {
  class PipelineJob {
    <<entity>>
    +id: UUID
    +type: String INDEXAR_BUSCA proposta
    +targetType: String TASK PROJECT
    +targetId: UUID
    +status: PipelineJobStatus
    +attempts: int
  }
  class DomainEventOutbox {
    <<entity>>
    +aggregateType: String
    +aggregateId: UUID
    +eventType: String VisibilityChanged Published Archived
    +publishedAt: Instant
  }
  class AiInferenceLog {
    <<entity>>
    +capability: AiCapability MEMORIA_BUSCA
    +result: InferenceResult
  }
}

namespace ws_domain_enums {
  class SearchTab {
    <<enum>>
    PROJETOS
    TAREFAS
    PESSOAS
    EMPRESAS
    CHEFES_DE_DEPARTAMENTO
  }
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
  class AccessClassification {
    <<enum>>
    PUBLICO
    INTERNO
    RESTRITO
    SIGILOSO
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
  class SearchService {
    <<service>>
    +search(viewerId, q, tab, filters, page 20) SearchResult 5 abas com contadores
    +suggestions(viewerId) Suggestions recentes em alta chancelados
    +similar(viewerId, PROJECT, id) List~Hit~ kNN ou fallback textual
    -visibilityFilter(viewer) PUBLICA EMPRESA DEPARTAMENTO PRIVADA só minhas
    -accessClassFilter(viewer) exclui SIGILOSO e RESTRITO de outro departamento
  }
  class SchemeReadService {
    <<service>>
    +openTask(viewerId, taskId) TaskView modo leitura + crédito
    +openProject(viewerId, projectId) ProjectView fases, tarefas, capa, chancelas
    +incrementViews(type, id)
  }
  class AccessPolicy {
    <<service>>
    +canView(viewer, item) boolean
    +canEdit(viewer, item) boolean
  }
  class SearchIndexingService {
    <<service>>
    +onPublishedOrVisibilityChanged(event) PipelineJob INDEXAR_BUSCA
    +index(type, id) upsert no índice com visibility e accessClass
    +remove(type, id) item PRIVADA ou RASCUNHO
  }
  class AiEngine {
    <<service>>
    +embed(text) vector MEMORIA_BUSCA
  }
  class SearchIndexPort {
    <<port>>
    +msearch(query, indices, filters) SearchResult
    +count(query, indices, filters) Map~SearchTab, long~
    +knn(index ws-memory, vector, filters) List~Hit~
    +upsert(index, doc)
    +delete(index, docId)
  }
  class CachePort {
    <<port>>
    +getSuggestions(companyId)
    +incrViews(type, id)
  }
}

namespace ws_web {
  class SearchController {
    <<controller>>
    +GET_api_search(q, tab, filters, page)
    +GET_api_search_counts(q, filters)
    +GET_api_search_suggestions()
    +POST_api_search_similar(type, id)
  }
  class SchemeReadController {
    <<controller>>
    +GET_api_tasks_id(id)
    +GET_api_projects_id(id)
  }
}

namespace ws_infrastructure {
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
  class RedisCacheAdapter {
    <<adapter>>
  }
  class ClaudeGeminiAdapter {
    <<adapter>>
  }
  class OutboxRelay {
    <<adapter>>
  }
}

ProjectScheme "1" --> "*" ProjectTask : fases e tarefas
ProjectTask ..> TaskItem : taskId ou snapshotJson
TaskItem "1" --> "*" TaskAttachment : ocrTextRef indexado
ProjectScheme "*" --> "1" User : ownerId crédito
TaskItem "*" --> "1" User : ownerId crédito
User "*" --> "0..1" Company : companyId
User "*" --> "0..1" Department : departmentId
Department "*" --> "1" User : headUserId aba CHEFES
InstitutionalMemoryDocument ..> ProjectScheme : sourceId quando PROJETO
InstitutionalMemoryDocument ..> TaskItem : sourceId quando TAREFA
MemoryQuery ..> AiInferenceLog : aiInferenceId
PipelineJob ..> ProjectScheme : targetId quando PROJECT
PipelineJob ..> TaskItem : targetId quando TASK
DomainEventOutbox ..> PipelineJob : relay agenda INDEXAR_BUSCA
TaskItem --> Visibility
TaskItem --> AccessClassification
ProjectScheme --> Visibility
PipelineJob --> PipelineJobStatus

SearchController ..> SearchService
SchemeReadController ..> SchemeReadService
SearchService ..> SearchIndexPort
SearchService ..> AiEngine : embed MEMORIA_BUSCA
SearchService ..> CachePort : sugestões
SearchService ..> MemoryQuery : registra consulta semântica
SchemeReadService ..> AccessPolicy : canView 404 canEdit 403
SchemeReadService ..> CachePort : incrViews
SearchIndexingService ..> SearchIndexPort : upsert delete
SearchIndexingService ..> PipelineJob
OpenSearchIndexAdapter ..|> SearchIndexPort
RedisCacheAdapter ..|> CachePort
ClaudeGeminiAdapter ..> AiEngine
OutboxRelay ..> SearchIndexingService : AFTER_COMMIT

note for SearchService "msearch em ws-projects, ws-tasks com OCR, ws-people, ws-orgs — 5 abas com contadores (CA01) · visibilityFilter + accessClassFilter: outra empresa só PUBLICA, SIGILOSO nunca (CA03) · similar via ws-memory kNN com fallback textual (CA05)"
note for SchemeReadService "modo leitura com crédito do autor, InteractionBar RF18/RF19 e Levar ao meu acervo RF7/RF41.CA08 · canEdit falso → 403 (CA04)"
note for PipelineJob "tipo INDEXAR_BUSCA (proposta — TAXONOMIA só tem INDEXAR_MEMORIA) · ≤ 60 s · FALHA → REPROCESSAR (CA06)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Abre /search e digita um termo"]
    U2["Escolhe aba, filtros e página"]
    U3["Abre um resultado de tarefa ou projeto de outro usuário"]
    U4["Clica em projetos parecidos com este"]
    U5["Aciona ação inline: curtir, salvar, remixar, Levar ao meu acervo"]
    A0["Autor publica, muda visibilidade ou arquiva um esquema"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Skeleton; termo vazio mostra sugestões"]
    W2{"Resposta ok?"}
    W3["Erro: botão tentar de novo"]
    W4{"Lista vazia?"}
    W5["Estado vazio ilustrado"]
    W6["5 abas com contadores, filtros e paginação 20; URL com q, tab, filtros, page"]
    W7["Página do esquema em modo leitura: ficha, fases, capa, chancelas, crédito do autor, InteractionBar, Levar ao meu acervo"]
    W8["Lista de parecidos com score e motivo"]
  end

  subgraph LA["ws-application"]
    A1["SearchService.search → visibilityFilter + accessClassFilter"]
    A2["SearchIndexPort.msearch em ws-projects, ws-tasks com OCR, ws-people, ws-orgs + count por aba"]
    A3["SchemeReadService.openTask / openProject"]
    A4{"AccessPolicy.canView(viewer, item)?"}
    A5["404 NAO_ENCONTRADO (item PRIVADA, RASCUNHO ou de outra empresa não PUBLICA)"]
    A6["Monta view de leitura + crédito do autor; incrViews"]
    A7{"Tentativa de edição?"}
    A8["403 ACESSO_NEGADO"]
    A9["SearchService.similar: AiEngine.embed → knn ws-memory com visibilityFilter"]
    A10{"IA disponível?"}
    A11["Fallback: busca textual por processTag e departamento"]
    A12["SocialService / AcervoService — RF18, RF19, RF7"]
    A13["SearchIndexingService.onPublishedOrVisibilityChanged → PipelineJob INDEXAR_BUSCA PENDENTE"]
    A14{"Novo estado visível a terceiros?"}
    A15["upsert no índice com visibility e accessClass"]
    A16["delete do índice (PRIVADA, RASCUNHO, SIGILOSO)"]
    A17{"Job ok?"}
    A18["status REPROCESSAR, retry com backoff"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["MEMORIA_BUSCA: embedding do título + objetivo + descrição do projeto; AiInferenceLog"]
  end

  subgraph LP["Persistência"]
    P1[("OpenSearch: ws-projects, ws-tasks, ws-people, ws-orgs")]
    P2[("OpenSearch: ws-memory dense_vector")]
    P3[("MySQL: project_schemes, project_tasks, tasks, users, companies, departments · Redis: viewsCount, sugestões")]
    P4[("MySQL: domain_events outbox, pipeline_jobs, memory_queries, ai_inference_log")]
  end

  U1 --> W1 --> A1 --> A2 --> P1 --> W2
  W2 -->|"não"| W3 --> W1
  W2 -->|"sim"| W4
  W4 -->|"sim"| W5
  W4 -->|"não"| W6 --> U2 --> A1
  W6 --> U3 --> A3 --> A4
  A4 -->|"não"| A5
  A4 -->|"sim"| A6 --> P3 --> W7
  W7 --> A7
  A7 -->|"sim"| A8
  W7 --> U4 --> A9 --> A10
  A10 -->|"sim"| I1 --> P2 --> W8
  A10 -->|"não"| A11 --> P1
  A11 --> W8
  A9 --> P4
  W7 --> U5 --> A12
  A0 --> A13 --> P4
  A13 --> A14
  A14 -->|"sim"| A15 --> P1
  A14 -->|"não"| A16 --> P1
  A15 --> A17
  A16 --> A17
  A17 -->|"não"| A18 --> P4

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class W3,A5,A8 err
  class W5,A11,A18 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  actor A as Autor do esquema
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant R as Redis
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: digita "pavimentação" em /search, aba TAREFAS, filtro categoria TERMO_REFERENCIA (CA01, CA02)
  NX->>NX: skeleton, URL ?q=pavimentacao&tab=TAREFAS&categoria=TERMO_REFERENCIA&page=1
  NX->>C: GET /api/search?q=pavimentacao&tab=TAREFAS&categoria=TERMO_REFERENCIA&page=1&size=20
  C->>S: SearchService.search(viewerId, q, TAREFAS, filters, 1)
  S->>S: visibilityFilter(viewer) = PUBLICA + EMPRESA (minha empresa) + DEPARTAMENTO (minhas lotações) + PRIVADA (ownerId = eu) (CA03)
  S->>S: accessClassFilter exclui SIGILOSO e RESTRITO de outro departamento (CA03)
  S->>OS: msearch ws-tasks (title, summary, descriptionMd, tags, ocrText), ws-projects, ws-people, ws-orgs com filtros + count por índice
  alt OpenSearch indisponível (CA02)
    OS-->>S: timeout
    S-->>C: 503 INDISPONIVEL {correlationId}
    C-->>NX: 503
    NX-->>U: erro com botão tentar de novo
  else ok
    OS-->>S: hits da aba TAREFAS + counts por aba
    S-->>C: 200 {tabs {PROJETOS 8, TAREFAS 31, PESSOAS 2, EMPRESAS 1, CHEFES_DE_DEPARTAMENTO 1}, items 20, nextPage}
    C-->>NX: 200
    alt lista vazia
      NX-->>U: estado vazio ilustrado
    else itens
      NX-->>U: 5 abas com contadores, cards de outros usuários com crédito e InteractionBar
    end
  end

  U->>NX: abre o projeto P7 de outro departamento (CA04)
  NX->>C: GET /api/projects/P7
  C->>S: SchemeReadService.openProject(viewerId, P7)
  S->>DB: project_schemes P7 + project_tasks + tasks (snapshot) + users (autor) + seal_bonds APROVADA
  S->>S: AccessPolicy.canView(viewer, P7)
  alt P7 PRIVADA, RASCUNHO ou de outra empresa sem ser PUBLICA
    S-->>C: 404 NAO_ENCONTRADO
    C-->>NX: 404
    NX-->>U: esquema indisponível
  else visível
    S->>R: INCR views:PROJECT:P7
    S-->>C: 200 ProjectView {readOnly true, author, phases, tasks, cover, seals}
    C-->>NX: 200
    NX-->>U: ficha completa em modo leitura, crédito do autor, InteractionBar RF18/RF19, Levar ao meu acervo
  end
  U->>NX: tenta editar o título de P7
  NX->>C: PATCH /api/projects/P7
  C->>S: AccessPolicy.canEdit(viewer, P7)
  S-->>C: 403 ACESSO_NEGADO (CA04)
  C-->>NX: 403

  U->>NX: clica projetos parecidos com este (CA05)
  NX->>C: POST /api/search/similar {type PROJECT, id P7}
  C->>S: SearchService.similar(viewerId, PROJECT, P7)
  S->>AI: embed(título + objetivo + descrição de P7) MEMORIA_BUSCA
  alt IA indisponível ou cota esgotada
    AI-->>S: FALLBACK
    S->>OS: busca textual ws-projects por processTags e departmentId de P7
  else embedding ok
    AI-->>S: vector + AiInferenceLog
    S->>OS: knn ws-memory (dense_vector) filtros sourceType PROJETO, visibilityFilter, accessClass não SIGILOSO
  end
  OS-->>S: top 10 com score
  S->>DB: INSERT memory_queries (queryText, filtersJson, resultsJson, aiInferenceId)
  S-->>C: 200 projetos parecidos com score e motivo
  C-->>NX: 200
  NX-->>U: lista de parecidos

  A->>NX: muda a visibilidade da tarefa T9 de DEPARTAMENTO para PUBLICA (CA06)
  NX->>C: PATCH /api/tasks/T9 {visibility PUBLICA}
  C->>S: TaskService.update (RF12)
  S->>DB: UPDATE tasks SET visibility, INSERT domain_events VisibilityChanged
  S->>DE: publish VisibilityChanged {TASK, T9}
  S-->>C: 200
  DE->>S: SearchIndexingService.onPublishedOrVisibilityChanged
  S->>DB: INSERT pipeline_jobs (type INDEXAR_BUSCA, targetType TASK, targetId T9, PENDENTE)
  S->>OS: upsert ws-tasks doc T9 {visibility PUBLICA, accessClass, ocrText}
  alt falha no OpenSearch
    S->>DB: UPDATE pipeline_jobs SET status REPROCESSAR, attempts + 1
  else ok
    S->>DB: UPDATE pipeline_jobs SET status OK
  end
  Note over DE,OS: ≤ 60 s entre o commit do autor e o índice refletir a mudança (CA06)
```

## 4. Máquina de estados

O RF17 é majoritariamente leitura e não tem estados próprios. O que ele governa é a **descobribilidade** de um esquema de terceiros, função de `ProjectScheme.status` / `TaskItem.state` (nunca RASCUNHO) e de `Visibility` + `AccessClassification`. O diagrama mostra o ciclo do **documento no índice OpenSearch** (`PipelineJob INDEXAR_BUSCA`, proposta — enum `PipelineJobStatus`) e, ao lado, os estados de `ProjectStatus` sob a ótica "aparece na Buscar para terceiros".

```mermaid
stateDiagram-v2
  state "PipelineJob INDEXAR_BUSCA (proposta) — CA06" as PJ {
    [*] --> PENDENTE : evento AFTER_COMMIT Published, VisibilityChanged ou Archived
    PENDENTE --> RODANDO : worker pega o job
    RODANDO --> OK : upsert ou delete no índice concluído
    RODANDO --> FALHA : OpenSearch indisponível
    FALHA --> REPROCESSAR : attempts menor que o limite, backoff
    REPROCESSAR --> RODANDO : nova tentativa
    OK --> [*]
  }
  state "ProjectScheme.status — visível na Buscar para terceiros? (CA03)" as PS {
    [*] --> RASCUNHO
    RASCUNHO --> PUBLICADO : publicar — entra no índice se visibility permitir
    PUBLICADO --> EM_DECISAO : abrir sessão DECIA — continua indexado
    EM_DECISAO --> APROVADO : decisão validada
    EM_DECISAO --> DEVOLVIDO : decisão devolvida
    APROVADO --> EM_EXECUCAO : iniciar execução
    EM_EXECUCAO --> CONCLUIDO : concluir — permanece indexado como referência
    CONCLUIDO --> ARQUIVADO : arquivar — sai do índice de terceiros
    PUBLICADO --> ARQUIVADO : arquivar
  }
  note right of PJ
    Índice reflete a mudança em ≤ 60 s.
    PRIVADA, RASCUNHO e SIGILOSO disparam delete, não upsert.
  end note
  note right of PS
    RASCUNHO nunca aparece para terceiros.
    Em qualquer estado indexado, o viewer ainda passa pelo visibilityFilter:
    outra empresa só vê PUBLICA (CA03).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/search — abas PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO"]
    F2["app/tasks/[id] e app/projects/[id] — modo leitura de esquema de terceiros"]
    F3["components/ui: SearchBox, SearchSuggestions, SearchTabs com contadores, SearchFilters, FeedSkeleton, EmptyStateIllustrated, RetryButton, Pagination 20, TaskCard, ProjectCard, AuthorCredit, ReadOnlyBanner, SimilarProjectsButton, InteractionBar RF18/RF19, TakeToMyAcervoButton RF7"]
  end

  subgraph WEB["ws-web"]
    C1["SearchController — /api/search, /counts, /suggestions, /similar"]
    C2["SchemeReadController — /api/tasks/{id}, /api/projects/{id}"]
    C3["InteractionController RF18/RF19 · AcervoController RF7/RF41"]
  end

  subgraph APP["ws-application"]
    S1["SearchService"]
    S2["SchemeReadService + AccessPolicy"]
    S3["SearchIndexingService"]
    S4["AiEngine — embed MEMORIA_BUSCA"]
    P1["SearchIndexPort"]
    P2["CachePort"]
  end

  subgraph DOM["ws-domain"]
    D1["ProjectScheme · ProjectTask · TaskItem · TaskAttachment · User · Company · Department"]
    D2["InstitutionalMemoryDocument · MemoryQuery RF33"]
    D3["PipelineJob INDEXAR_BUSCA (proposta) · DomainEventOutbox · AiInferenceLog"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("search-opensearch: OpenSearchIndexAdapter — ws-projects, ws-tasks + OCR, ws-people, ws-orgs, ws-memory kNN")]
    I2[("persistence-mysql: project_schemes, project_tasks, tasks, users, companies, departments, pipeline_jobs, domain_events, memory_queries, ai_inference_log")]
    I3[("cache-redis: sugestões, viewsCount")]
    I4["ai-providers: ClaudeGeminiAdapter — embeddings, fallback textual"]
    I5["platform: OutboxRelay AFTER_COMMIT, PipelineJob worker INDEXAR_BUSCA"]
  end

  subgraph EXT["Serviços externos"]
    E1(("Claude / Gemini embeddings"))
  end

  F1 --- F3
  F2 --- F3
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C2
  F3 -->|"HTTPS/JSON"| C3
  C1 --> S1
  C2 --> S2
  S1 --> P1
  S1 --> P2
  S1 --> S4
  S1 --> D2
  S2 --> D1
  S2 --> P2
  S3 --> P1
  S3 --> D3
  D1 --> I2
  D2 --> I2
  D3 --> I2
  D3 --> I5
  I5 --> S3
  P1 --> I1
  P2 --> I3
  S4 --> I4
  I4 -.-> E1
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF17.CA01 | `SearchService.search/suggestions`, `SearchIndexPort.msearch/count`, enum `SearchTab`, `TaskAttachment.ocrTextRef`, tabela de índices do cabeçalho · Atividades `U1 → W1 → A1 → A2 → P1 → W6` · Sequência msgs 1–7 e 13–15 (`msearch … + count por índice`, `{tabs {PROJETOS 8, TAREFAS 31 …}}`) · Componentes `SearchBox`, `SearchSuggestions`, `SearchTabs com contadores`, `search-opensearch` |
| RF17.CA02 | `SearchController.GET_api_search(q, tab, filters, page)` · Atividades `W1` (skeleton), `W2 → W3` (tentar de novo), `W4 → W5` (vazio), `U2 → A1` (filtros e página), `W6` (URL) · Sequência msg 2 (URL com q, tab, filtros, page) e blocos `alt OpenSearch indisponível → 503 … tentar de novo` / `alt lista vazia` · Componentes `SearchFilters`, `FeedSkeleton`, `EmptyStateIllustrated`, `RetryButton`, `Pagination 20` |
| RF17.CA03 | `SearchService.visibilityFilter/accessClassFilter` (nota), enums `Visibility`, `AccessClassification`, `SearchIndexingService.remove` · Atividades `A1`, `A4 → A5 404`, `A14 → A16` · Sequência msgs 5–6 (filtros) e `alt P7 PRIVADA, RASCUNHO ou de outra empresa → 404` · Máquina *ProjectScheme.status — visível na Buscar?* e notas |
| RF17.CA04 | `SchemeReadService.openTask/openProject/incrementViews` (nota), `AccessPolicy.canView/canEdit`, `ProjectTask.snapshotJson`, `User` (crédito) · Atividades `U3 → A3 → A4 → A6 → P3 → W7`, `A7 → A8 403`, `U5 → A12` · Sequência msgs 20–31 (`ProjectView {readOnly true, author …}`) e 32–36 (`PATCH → 403 ACESSO_NEGADO`) · Componentes `app/tasks/[id]`, `app/projects/[id]`, `AuthorCredit`, `ReadOnlyBanner`, `InteractionBar RF18/RF19`, `TakeToMyAcervoButton RF7` |
| RF17.CA05 | `InstitutionalMemoryDocument` (embedding), `MemoryQuery`, `SearchService.similar`, `SearchIndexPort.knn`, `AiEngine.embed` · Atividades `U4 → A9 → A10 → I1 → P2 → W8` e `A10 (não) → A11` (fallback textual) · Sequência msgs 37–50 (`embed … MEMORIA_BUSCA`, `alt IA indisponível → busca textual`, `knn ws-memory`, `INSERT memory_queries`) · Componentes `SimilarProjectsButton`, `ws-memory kNN`, `ai-providers`, `Claude / Gemini embeddings` |
| RF17.CA06 | `PipelineJob` (tipo INDEXAR_BUSCA, proposta), `DomainEventOutbox`, `SearchIndexingService.onPublishedOrVisibilityChanged/index/remove`, `SearchIndexPort.upsert/delete`, `OutboxRelay` · Atividades `A0 → A13 → A14 → A15 / A16 → P1`, `A17 → A18 REPROCESSAR` · Sequência msgs 51–62 (`publish VisibilityChanged`, `INSERT pipeline_jobs INDEXAR_BUSCA`, `upsert ws-tasks`, `alt falha → REPROCESSAR`, nota ≤ 60 s) · Máquina *PipelineJob INDEXAR_BUSCA* · Componentes `platform: OutboxRelay, PipelineJob worker` |
