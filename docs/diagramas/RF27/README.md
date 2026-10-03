# RF27 — Navegar no Mural (mural da empresa e vitrine de projetos) e Buscar projetos, tarefas, pessoas, empresas e chefes de departamento
**HU:** HU27 · **Sprint (board Work Station):** 4 · **Equivalente FAI:** Feed (Comunidade/Passarela) + RF8 Buscar/Explorar · **Aba/rota:** Mural (`/mural`, sub-abas Mural da empresa · Vitrine de projetos · Seguindo) e Buscar (`/search`, abas PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO)
**Critérios de aceite cobertos:** RF27.CA01 · CA02 · CA03 · CA04 · CA05 · CA06

**Mural** — três sub-abas: **Mural da empresa** (`MuralEntry` da minha empresa: compartilhamentos, decisões validadas, projetos publicados, reconhecimentos — ordem cronológica, filtros por departamento e tipo de item), **Vitrine de projetos** (= Passarela: projetos chancelados `sealIdsJson` e modelos `MODELO_PUBLICO`, capa grande e "remixar") e **Seguindo** (atividade das pessoas/departamentos/empresas que sigo, via `Follow` + Cassandra `timeline_by_user`). Páginas de 20 itens, skeleton, estado vazio ilustrado e "tentar de novo" em erro; cada item traz as ações do RF26 inline. **Buscar** — textual (título, descrição, tags, texto OCR de documentos via `TaskAttachment.ocrTextRef`) nos índices OpenSearch, devolvendo as **5 abas com contadores**, respeitando visibilidade e perfil (outra empresa só se PUBLICA); busca **semântica** opcional ("projetos parecidos com este") sobre a Memória Institucional (`InstitutionalMemoryDocument`, RF33). **Seguir/deixar de seguir** pessoas, departamentos e empresas com vínculo único.

| Aba de Buscar | Índice OpenSearch | Entidade | Filtros |
|---|---|---|---|
| PROJETOS | `ws-projects` | `ProjectScheme` | fase, departamento, exercício, chancelado, prazo |
| TAREFAS | `ws-tasks` (+ texto OCR) | `TaskItem`, `TaskAttachment.ocrTextRef` | categoria, tipo, departamento, chancelado, prazo |
| PESSOAS | `ws-people` | `User` (EMPREGADO) | departamento, empresa |
| EMPRESAS | `ws-orgs` | `Company` | — |
| CHEFES DE DEPARTAMENTO | `ws-people` (profileType CHEFE_DEPARTAMENTO) | `User`, `Department.headUserId` | empresa, departamento |
| semântica (opcional) | `ws-memory` kNN | `InstitutionalMemoryDocument` | sourceType PROJETO/TAREFA |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_social_descoberta {
  class MuralEntry {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +departmentId: UUID
    +kind: MuralKind
    +targetType: TargetType
    +targetId: UUID
    +actorId: UUID
    +boostUntil: Instant
    +at: Instant
  }
  class TimelineEvent {
    <<entity>>
    +userId: UUID partição
    +at: Instant cluster desc
    +eventType: String
    +targetType: TargetType
    +targetId: UUID
    +payloadJson: JSON
  }
  class Follow {
    <<entity>>
    +id: UUID
    +followerId: UUID
    +targetType: FollowTargetType
    +targetId: UUID
    +status: FollowStatus
    +at: Instant
  }
  class Reaction {
    <<entity>>
    +targetType: TargetType
    +targetId: UUID
    +reactionType: ReactionType
  }
}

namespace ws_domain_alvos {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +title: String
    +descriptionMd: String
    +currentPhase: ProjectPhase
    +status: ProjectStatus
    +departmentId: UUID
    +companyId: UUID
    +exerciseYear: int
    +visibility: Visibility
    +sealIdsJson: JSON chancelado
    +coverUrl: String
    +nextMilestoneAt: LocalDate
  }
  class TaskItem {
    <<entity>>
    +id: UUID
    +title: String
    +descriptionMd: String
    +tags: Set~String~
    +category: TaskCategory
    +type: TaskType
    +state: TaskState MODELO_PUBLICO
    +visibility: Visibility
    +accessClass: AccessClassification
    +sealIdsJson: JSON
    +dueAt: LocalDate
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
    +sourceType: String PROJETO TAREFA
    +sourceId: UUID
    +companyId: UUID
    +visibility: Visibility
    +accessClass: AccessClassification
    +embedding: dense_vector
  }
  class Recognition {
    <<entity>>
    +recipientUserId: UUID
    +publicOnMural: boolean
  }
}

namespace ws_domain_enums {
  class MuralKind {
    <<enum>>
    COMPARTILHAMENTO
    DECISAO_VALIDADA
    PROJETO_PUBLICADO
    RECONHECIMENTO
    META
    DESTAQUE
    IMPULSO
  }
  class FollowTargetType {
    <<enum>>
    USER
    DEPARTMENT
    COMPANY
  }
  class FollowStatus {
    <<enum>>
    ATIVO
    REMOVIDO
  }
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
}

namespace ws_application {
  class MuralService {
    <<service>>
    +companyFeed(viewerId, filters, page 20) Page~MuralEntry~
    +showcase(viewerId, page) Page~ProjectScheme~ chancelados e MODELO_PUBLICO
    +following(viewerId, page) Page~TimelineEvent~
    +fanOut(MuralEntry) timeline_by_user dos seguidores
  }
  class SearchService {
    <<service>>
    +search(viewerId, q, tab, filters, page) SearchResult 5 abas com contadores
    +similar(viewerId, type, id) List~Hit~ Memória Institucional
    -visibilityFilter(viewer) PUBLICA, EMPRESA se mesma empresa, DEPARTAMENTO se membro, PRIVADA se dono
  }
  class SocialService {
    <<service>>
    +follow(followerId, FollowTargetType, targetId) Follow
    +unfollow(followerId, FollowTargetType, targetId)
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
  }
  class TimelinePort {
    <<port>>
    +append(userId, TimelineEvent)
    +read(userId, page) List~TimelineEvent~
  }
  class CachePort {
    <<port>>
    +getFeedPage(companyId, filters, page)
    +putFeedPage(key, page, ttl)
  }
}

namespace ws_web {
  class MuralController {
    <<controller>>
    +GET_api_mural(tab, departmentId, kind, page)
    +GET_api_mural_showcase(page)
    +GET_api_mural_following(page)
  }
  class SearchController {
    <<controller>>
    +GET_api_search(q, tab, filters, page)
    +GET_api_search_counts(q, filters)
    +POST_api_search_similar(type, id)
  }
  class FollowController {
    <<controller>>
    +POST_api_follows(targetType, targetId)
    +DELETE_api_follows_targetType_targetId()
  }
}

namespace ws_infrastructure {
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
  class CassandraTimelineAdapter {
    <<adapter>>
  }
  class RedisCacheAdapter {
    <<adapter>>
  }
  class ClaudeGeminiAdapter {
    <<adapter>>
  }
}

MuralEntry --> MuralKind
MuralEntry --> TargetType
MuralEntry "*" --> "1" Company : companyId
MuralEntry ..> ProjectScheme : targetId quando PROJECT
MuralEntry ..> TaskItem : targetId quando TASK
MuralEntry ..> Recognition : kind RECONHECIMENTO
MuralEntry "1" --> "*" TimelineEvent : fan-out aos seguidores
Follow --> FollowTargetType
Follow --> FollowStatus
Follow "*" --> "1" User : followerId
Follow ..> User : targetId quando USER
Follow ..> Department : targetId quando DEPARTMENT
Follow ..> Company : targetId quando COMPANY
Reaction ..> MuralEntry : ações RF26 inline
TaskItem "1" --> "*" TaskAttachment : ocrTextRef indexado
InstitutionalMemoryDocument ..> ProjectScheme : sourceId quando PROJETO
InstitutionalMemoryDocument ..> TaskItem : sourceId quando TAREFA
Department "*" --> "1" User : headUserId CHEFE
ProjectScheme --> Visibility
TaskItem --> Visibility

MuralController ..> MuralService
SearchController ..> SearchService
FollowController ..> SocialService
MuralService ..> TimelinePort
MuralService ..> CachePort
SearchService ..> SearchIndexPort
SearchService ..> AiEngine : embed para busca semântica
SocialService ..> Follow
SocialService ..> MuralService : follow aciona fan-out futuro
OpenSearchIndexAdapter ..|> SearchIndexPort
CassandraTimelineAdapter ..|> TimelinePort
RedisCacheAdapter ..|> CachePort
ClaudeGeminiAdapter ..> AiEngine

note for MuralEntry "tabela mural_entries + Cassandra timeline_by_user · páginas de 20 (CA01) · ações RF26 inline (CA02)"
note for Follow "tabela follows · único followerId + targetType + targetId (CA06)"
note for SearchService "índices ws-projects, ws-tasks com texto OCR, ws-people, ws-orgs — 5 abas com contadores (CA03) · visibilityFilter: outra empresa só PUBLICA (CA04) · similar via ws-memory kNN (CA05)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Abre /mural e escolhe sub-aba: Mural da empresa, Vitrine ou Seguindo"]
    U2["Rola até o fim da página"]
    U3["Aciona ação RF26 inline em um item"]
    U4["Digita em /search e escolhe aba"]
    U5["Clica em projetos parecidos com este"]
    U6["Clica Seguir / Deixar de seguir em pessoa, departamento ou empresa"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Skeleton enquanto carrega"]
    W2{"Resposta ok?"}
    W3["Erro: botão tentar de novo"]
    W4{"Lista vazia?"}
    W5["Estado vazio ilustrado"]
    W6["Renderiza 20 itens com InteractionBar RF26"]
    W7["Carrega próxima página de 20"]
    W8["5 abas com contadores; filtros categoria, tipo, fase, departamento, exercício, chancelado, prazo"]
    W9["Botão Seguir alterna estado"]
  end

  subgraph LA["ws-application"]
    A1{"Sub-aba"}
    A2["MuralService.companyFeed: MuralEntry da minha empresa, filtros departamento e tipo, ordem cronológica, cache por página"]
    A3["MuralService.showcase: projetos com sealIdsJson ou MODELO_PUBLICO, capa grande, remixar"]
    A4["MuralService.following: Follow ATIVO → timeline_by_user"]
    A5["SearchService.search → visibilityFilter: PUBLICA, EMPRESA se mesma empresa, DEPARTAMENTO se membro, PRIVADA se dono; outra empresa só PUBLICA"]
    A6["SearchIndexPort.msearch em ws-projects, ws-tasks com OCR, ws-people, ws-orgs + count por aba"]
    A7["SearchService.similar: AiEngine.embed → knn em ws-memory com o mesmo visibilityFilter"]
    A8["SocialService.follow → validateUnique"]
    A9{"Já segue?"}
    A10["409 JA_SEGUE ou idempotente: mantém ATIVO"]
    A11["INSERT Follow ATIVO; unfollow → status REMOVIDO"]
    A12["SocialService: ações RF26 com checkVisibility"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["MEMORIA_BUSCA: embedding da consulta ou do projeto de referência"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: mural_entries, project_schemes, tasks · Redis: cache de páginas do feed")]
    P2[("Cassandra: timeline_by_user")]
    P3[("OpenSearch: ws-projects, ws-tasks, ws-people, ws-orgs")]
    P4[("OpenSearch: ws-memory dense_vector")]
    P5[("MySQL: follows")]
  end

  U1 --> W1 --> A1
  A1 -->|"Mural da empresa"| A2 --> P1
  A1 -->|"Vitrine"| A3 --> P1
  A1 -->|"Seguindo"| A4 --> P2
  P1 --> W2
  P2 --> W2
  W2 -->|"não"| W3 --> W1
  W2 -->|"sim"| W4
  W4 -->|"sim"| W5
  W4 -->|"não"| W6 --> U2 --> W7 --> A1
  W6 --> U3 --> A12
  U4 --> A5 --> A6 --> P3 --> W8
  W8 --> U5 --> A7 --> I1 --> P4 --> W8
  U6 --> A8 --> A9
  A9 -->|"sim"| A10
  A9 -->|"não"| A11 --> P5 --> W9

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class W3,A10 err
  class W5 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant OS as OpenSearch
  participant R as Redis
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: abre /mural (Mural da empresa, filtro departamento SECID-UTS)
  NX->>NX: renderiza skeleton (CA01)
  NX->>C: GET /api/mural?tab=EMPRESA&departmentId=UTS&page=1&size=20
  C->>S: MuralService.companyFeed(viewerId, filters, page 1)
  S->>R: GET feed:{companyId}:{filtersHash}:1
  alt cache miss
    S->>DB: mural_entries WHERE companyId AND departmentId ORDER BY at DESC LIMIT 20
    S->>R: SET feed:… TTL 30s
  end
  alt falha de infraestrutura
    S-->>C: 503 INDISPONIVEL {correlationId}
    C-->>NX: 503
    NX-->>U: erro com botão "tentar de novo" (CA01)
  else ok
    S-->>C: 200 Page {items 20, nextPage}
    C-->>NX: 200
    alt lista vazia
      NX-->>U: estado vazio ilustrado (CA01)
    else itens
      NX-->>U: 20 cards com ações do RF26 inline (CA02)
    end
  end

  U->>NX: sub-aba Seguindo
  NX->>C: GET /api/mural/following?page=1
  C->>S: MuralService.following(viewerId, 1)
  S->>CS: timeline_by_user WHERE userId = viewer ORDER BY at DESC LIMIT 20
  CS-->>S: eventos das pessoas e departamentos seguidos
  S-->>C: 200 Page
  C-->>NX: 200

  U->>NX: sub-aba Vitrine de projetos
  NX->>C: GET /api/mural/showcase?page=1
  C->>S: MuralService.showcase
  S->>DB: project_schemes WHERE sealIdsJson não vazio OR tasks.state MODELO_PUBLICO, visibility PUBLICA ou EMPRESA
  S-->>C: 200 projetos com capa grande e ação remixar
  C-->>NX: 200

  U->>NX: busca "pavimentação" em /search (CA03)
  NX->>C: GET /api/search?q=pavimentacao&tab=PROJETOS&fase=ELABORACAO&page=1
  C->>S: SearchService.search(viewerId, q, PROJETOS, filters, 1)
  S->>S: visibilityFilter(viewer) = PUBLICA + EMPRESA (minha empresa) + DEPARTAMENTO (minhas lotações) + PRIVADA (ownerId = eu) (CA04)
  S->>OS: msearch ws-projects, ws-tasks (title, descriptionMd, tags, ocrText), ws-people, ws-orgs com filtros de visibilidade e perfil
  OS-->>S: hits da aba PROJETOS + counts por índice
  S-->>C: 200 {tabs: {PROJETOS 12, TAREFAS 31, PESSOAS 2, EMPRESAS 1, CHEFES_DE_DEPARTAMENTO 1}, items}
  C-->>NX: 200
  NX-->>U: 5 abas com contadores e filtros — resultados de outra empresa só se PUBLICA (CA04)

  U->>NX: "projetos parecidos com este" no projeto P1 (CA05)
  NX->>C: POST /api/search/similar {type PROJECT, id P1}
  C->>S: SearchService.similar(viewerId, PROJECT, P1)
  S->>AI: embed(título + objetivo + descrição de P1) MEMORIA_BUSCA
  AI-->>S: vector
  S->>OS: knn ws-memory (dense_vector) filtros sourceType PROJETO, visibilityFilter, accessClass não SIGILOSO
  OS-->>S: top 10 InstitutionalMemoryDocument
  S-->>C: 200 projetos parecidos com score
  C-->>NX: 200

  U->>NX: Seguir o departamento CPOE (CA06)
  NX->>C: POST /api/follows {targetType DEPARTMENT, targetId CPOE}
  C->>S: SocialService.follow(followerId, DEPARTMENT, CPOE)
  S->>DB: SELECT follows WHERE followerId AND DEPARTMENT AND CPOE (índice único)
  alt já segue
    S-->>C: 200 Follow existente (idempotente)
  else novo
    S->>DB: INSERT follows (status ATIVO)
    S->>DE: publish FollowCreated
    S-->>C: 201 Follow
  end
  C-->>NX: 201
  NX-->>U: botão vira "Seguindo"
  DE->>CS: backfill opcional dos últimos eventos de CPOE em timeline_by_user do seguidor
  Note over DE,CS: a cada nova MuralEntry de CPOE, MuralService.fanOut grava TimelineEvent em timeline_by_user de cada seguidor ATIVO
  U->>NX: Deixar de seguir
  NX->>C: DELETE /api/follows/DEPARTMENT/CPOE
  C->>S: SocialService.unfollow
  S->>DB: UPDATE follows SET status REMOVIDO
  S-->>C: 204
```

## 4. Máquina de estados

O RF27 é majoritariamente leitura. A entidade que ele altera é o **`Follow`** (`status` ATIVO · REMOVIDO, CA06); o segundo bloco mostra o ciclo do **`MuralEntry`** (sem campo de status, apenas `boostUntil` do impulso comprado na Loja, RF42) para contextualizar a ordem do Mural.

```mermaid
stateDiagram-v2
  state "Follow" as FO {
    [*] --> NAO_SEGUE
    NAO_SEGUE --> ATIVO : POST follows, único followerId + targetType + targetId
    ATIVO --> ATIVO : POST repetido é idempotente
    ATIVO --> REMOVIDO : DELETE follows, status REMOVIDO
    REMOVIDO --> ATIVO : seguir novamente, mesmo registro reativado
  }
  state "MuralEntry" as ME {
    [*] --> PUBLICADA : Share MURAL, decisão validada, projeto publicado, reconhecimento
    PUBLICADA --> IMPULSIONADA : compra IMPULSO_MURAL na Loja, boostUntil
    IMPULSIONADA --> PUBLICADA : passa boostUntil
    PUBLICADA --> PUBLICADA : fan-out TimelineEvent aos seguidores ATIVOS
  }
  note right of FO
    Alvos USER, DEPARTMENT, COMPANY (CA06).
    Só vínculos ATIVOS alimentam a sub-aba Seguindo.
  end note
  note right of ME
    Mural da empresa em ordem cronológica, páginas de 20 (CA01).
    Ações do RF26 inline em cada item (CA02).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/mural — sub-abas Mural da empresa · Vitrine · Seguindo"]
    F2["app/search — abas PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO"]
    F3["components/ui: FeedCard, ShowcaseCard capa grande + remixar, FeedSkeleton, EmptyStateIllustrated, RetryButton, InfiniteScroll 20, FeedFilters departamento/tipo, SearchBox, SearchTabs com contadores, SearchFilters, SimilarProjectsButton, FollowButton, InteractionBar RF26"]
  end

  subgraph WEB["ws-web"]
    C1["MuralController — /api/mural, /showcase, /following"]
    C2["SearchController — /api/search, /counts, /similar"]
    C3["FollowController — /api/follows"]
    C4["InteractionController RF26"]
  end

  subgraph APP["ws-application"]
    S1["MuralService"]
    S2["SearchService"]
    S3["SocialService RF26"]
    S4["AiEngine"]
    P1["SearchIndexPort"]
    P2["TimelinePort"]
    P3["CachePort"]
  end

  subgraph DOM["ws-domain"]
    D1["MuralEntry · TimelineEvent · Follow"]
    D2["ProjectScheme · TaskItem · TaskAttachment · User · Company · Department · Recognition"]
    D3["InstitutionalMemoryDocument RF33"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: mural_entries, follows, project_schemes, tasks, users, companies, departments")]
    I2[("persistence-cassandra: CassandraTimelineAdapter timeline_by_user")]
    I3[("search-opensearch: OpenSearchIndexAdapter — ws-projects, ws-tasks + OCR, ws-people, ws-orgs, ws-memory kNN")]
    I4[("cache-redis: páginas do feed, contadores")]
    I5["ai-providers: ClaudeGeminiAdapter — embeddings MEMORIA_BUSCA"]
    I6["platform: outbox AFTER_COMMIT FollowCreated, fan-out de MuralEntry"]
  end

  subgraph EXT["Serviços externos"]
    E1(("Claude / Gemini embeddings"))
  end

  F1 --- F3
  F2 --- F3
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C2
  F3 -->|"HTTPS/JSON"| C3
  F3 -->|"HTTPS/JSON"| C4
  C1 --> S1
  C2 --> S2
  C3 --> S3
  C4 --> S3
  S1 --> P2
  S1 --> P3
  S2 --> P1
  S2 --> S4
  S1 --> D1
  S1 --> D2
  S2 --> D2
  S2 --> D3
  S3 --> D1
  D1 --> I1
  D2 --> I1
  D1 --> I6
  I6 --> S1
  P1 --> I3
  P2 --> I2
  P3 --> I4
  S4 --> I5
  I5 -.-> E1
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF27.CA01 | `MuralEntry` (nota páginas de 20), `MuralService.companyFeed/showcase/following`, `CachePort`, `TimelinePort` · Atividades `U1 → W1 (skeleton) → A1 → A2/A3/A4 → W2 (não) → W3 tentar de novo`, `W4 (sim) → W5 estado vazio`, `W6 → U2 → W7 próxima página` · Sequência `GET /api/mural?…&size=20` com `alt falha de infraestrutura → 503 … tentar de novo` e `alt lista vazia → estado vazio ilustrado` · Nota de *MuralEntry* · Componentes `FeedSkeleton`, `EmptyStateIllustrated`, `RetryButton`, `InfiniteScroll 20`, `cache-redis` |
| RF27.CA02 | `Reaction ..> MuralEntry : ações RF26 inline`, `SocialService` · Atividades `W6 → U3 → A12` · Sequência "20 cards com ações do RF26 inline" · Transição `PUBLICADA` (nota) · Componentes `InteractionBar RF26`, `InteractionController RF26` |
| RF27.CA03 | `SearchService.search`, `SearchIndexPort.msearch/count`, enum `SearchTab`, `TaskAttachment.ocrTextRef`, tabela de índices do cabeçalho · Atividades `U4 → A5 → A6 → P3 → W8` · Sequência `GET /api/search?q=…&tab=PROJETOS` → `msearch ws-projects, ws-tasks (title, descriptionMd, tags, ocrText), ws-people, ws-orgs` → `{tabs: {PROJETOS 12, TAREFAS 31, …}}` · Componentes `SearchBox`, `SearchTabs com contadores`, `SearchFilters`, `search-opensearch` |
| RF27.CA04 | `SearchService.visibilityFilter` (nota outra empresa só PUBLICA), enum `Visibility`, `User.profileType`, `Department.headUserId` (aba CHEFES) · Atividades `A5` · Sequência `visibilityFilter(viewer) = PUBLICA + EMPRESA (minha empresa) + …` e "resultados de outra empresa só se PUBLICA" |
| RF27.CA05 | `InstitutionalMemoryDocument` (embedding dense_vector), `SearchService.similar`, `SearchIndexPort.knn`, `AiEngine.embed` · Atividades `U5 → A7 → I1 → P4 → W8` · Sequência `POST /api/search/similar {PROJECT, P1}` → `embed(…) MEMORIA_BUSCA` → `knn ws-memory … accessClass não SIGILOSO` · Componentes `SimilarProjectsButton`, `ws-memory kNN`, `ai-providers embeddings`, `Claude / Gemini embeddings` |
| RF27.CA06 | `Follow` (nota índice único), enums `FollowTargetType`, `FollowStatus`, `SocialService.follow/unfollow`, `MuralService.fanOut`, `TimelineEvent` · Atividades `U6 → A8 → A9 → A10 / A11 → P5 → W9` · Sequência `POST /api/follows {DEPARTMENT, CPOE}` → `alt já segue → idempotente` / `INSERT follows (ATIVO)` → `DELETE /api/follows/DEPARTMENT/CPOE` → `status REMOVIDO`, nota de fan-out · Máquina *Follow* (NAO_SEGUE → ATIVO → REMOVIDO → ATIVO) · Componentes `FollowButton`, `FollowController`, `persistence-cassandra timeline_by_user` |
