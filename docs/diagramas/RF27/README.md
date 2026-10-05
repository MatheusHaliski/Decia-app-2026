# RF27 — Navegar no Mural (mural da empresa e vitrine de projetos) e Buscar projetos, tarefas, pessoas, empresas e chefes de departamento
**HU:** HU27 · **Sprint (board Work Station):** Sprint 4 (comprometido) · **Equivalente FAI:** Feed (Comunidade/Passarela) + RF8 Buscar/Explorar · **Aba/rota:** Mural (`/mural`, sub-abas Mural da empresa · Vitrine de projetos · Seguindo) e Buscar (`/search?q=&tab=PROJETOS|TAREFAS|PESSOAS|EMPRESAS|CHEFES`)
**Critérios de aceite cobertos:** RF27.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs.

O Mural é a projeção cronológica `MuralEntry` (MySQL) espelhada em Cassandra `timeline_by_user` (flag `cassandra.enabled`; sem a flag, consulta MySQL paginada). A Busca é textual (OpenSearch `ws-tasks`, `ws-projects`, `ws-users`, `ws-companies`; OCR de anexos em `TaskAttachment.ocrTextRef`) e, opcionalmente, semântica via Memória Institucional (`ws-memory`, RF33). Toda leitura passa pelo filtro de **visibilidade e perfil** (`VisibilityFilter`: itens de outra empresa só se `PUBLICA`). Seguir é `Follow` único por (followerId, targetType, targetId).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_social {
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
    +userId: UUID
    +at: Instant
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
    +actorId: UUID
    +targetType: TargetType
    +targetId: UUID
    +reactionType: ReactionType
  }
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
}

namespace ws_domain_indexados {
  class TaskItem {
    <<entity>>
    +id: UUID
    +title: String
    +summary: String
    +tags: Set~String~
    +visibility: Visibility
    +accessClass: AccessClassification
    +companyId: UUID
    .. +50 campos ..
  }
  class TaskAttachment {
    <<entity>>
    +taskId: UUID
    +ocrStatus: String
    +ocrTextRef: String
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +title: String
    +status: ProjectStatus
    +visibility: Visibility
    +sealIdsJson: JSON
    +offeredInCounter: boolean
    .. +32 campos ..
  }
  class User {
    <<entity>>
    +id: UUID
    +username: String
    +fullName: String
    +profileType: ProfileType
    +companyId: UUID
    +departmentId: UUID
  }
  class Company {
    <<entity>>
    +id: UUID
    +legalName: String
    +slug: String
  }
  class Department {
    <<entity>>
    +id: UUID
    +name: String
    +acronym: String
    +headUserId: UUID
  }
  class InstitutionalMemoryDocument {
    <<entity>>
    +docId: String
    +sourceType: MemorySourceType
    +embedding: dense_vector
    +visibility: Visibility
  }
}

namespace ws_application {
  class MuralService {
    <<service>>
    +company(viewer, companyId, filters, page) Page~MuralItemView~
    +showcase(viewer, page) Page~ProjectCardView~
    +following(viewer, page) Page~MuralItemView~
  }
  class SearchService {
    <<service>>
    +search(viewer, q, tab, filters, page) SearchResult
    +similar(viewer, projectId) List~ProjectCardView~
  }
  class FollowService {
    <<service>>
    +follow(actor, targetType, targetId) Follow
    +unfollow(actor, targetType, targetId)
  }
  class VisibilityFilter {
    <<service>>
    +allowedFor(viewer) Filter
  }
  class SocialService {
    <<service>>
    +react(actor, targetType, targetId, type)
  }
  class Guard {
    <<service>>
    +requireSameCompany(actor, companyId)
  }
  class TimelinePort {
    <<port>>
    +append(userId, TimelineEvent)
    +page(userId, cursor)
  }
  class SearchIndexPort {
    <<port>>
    +search(index, query, filter, page)
    +knn(index, embedding, filter)
  }
  class CachePort {
    <<port>>
    +counters(targetIds)
  }
}

namespace ws_web {
  class MuralController {
    <<controller>>
    +GET_api_mural(tab, departmentId, kind, page)
    +GET_api_mural_showcase(page)
  }
  class SearchController {
    <<controller>>
    +GET_api_search(q, tab, filters, page)
    +GET_api_search_similar(projectId)
  }
  class FollowController {
    <<controller>>
    +POST_api_follows(targetType, targetId)
    +DELETE_api_follows(targetType, targetId)
  }
}

namespace ws_infrastructure {
  class CassandraTimelineAdapter {
    <<adapter>>
  }
  class MysqlTimelineAdapter {
    <<adapter>>
  }
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
  class RedisCountersAdapter {
    <<adapter>>
  }
}

MuralEntry ..> TaskItem : targetType TASK
MuralEntry ..> ProjectScheme : targetType PROJECT
TimelineEvent ..> MuralEntry : projecao por seguidor
Follow ..> User : USER
Follow ..> Department : DEPARTMENT
Follow ..> Company : COMPANY
Department "0..1" --> "0..1" User : headUserId CHEFES
TaskAttachment "0..*" --> "1" TaskItem
MuralController --> MuralService
SearchController --> SearchService
FollowController --> FollowService
MuralService --> VisibilityFilter
SearchService --> VisibilityFilter
MuralService --> TimelinePort
MuralService --> CachePort
SearchService --> SearchIndexPort
SearchService ..> InstitutionalMemoryDocument : similar RF33
FollowService --> Guard
MuralService ..> SocialService : acoes inline RF26
CassandraTimelineAdapter ..|> TimelinePort
MysqlTimelineAdapter ..|> TimelinePort
OpenSearchIndexAdapter ..|> SearchIndexPort
RedisCountersAdapter ..|> CachePort
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (usuário autenticado)"]
    A0([Abre /mural ou /search]) --> A1{"Aba"}
    A1 -->|Mural da empresa| A2["Rola a lista, filtra por departamento e tipo"]
    A1 -->|Vitrine| A3["Vê projetos chancelados em destaque, clica Remixar"]
    A1 -->|Seguindo| A4["Atividade de quem sigo"]
    A1 -->|Buscar| A5["Digita termo, escolhe aba e filtros"]
    A6["Curte, comenta, salva, compartilha inline"]
    A7["Clica Seguir / Deixar de seguir"]
    A8["Clica Projetos parecidos com este"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/mural · search)"]
    F1["Skeleton · páginas de 20 · EmptyState ilustrado · ErrorState tentar de novo"]
    F2["GET /api/mural?tab=&page="]
    F3["GET /api/search?q=&tab=&filters="]
    F4["Contadores por aba (PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES)"]
    F5["POST /api/follows · DELETE /api/follows"]
    F6["GET /api/search/similar?projectId="]
  end

  subgraph WEB["ws-web"]
    W1["JWT · CorrelationIdFilter · rate limit por IP+rota (busca)"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    P1["VisibilityFilter.allowedFor(viewer): PUBLICA de qualquer empresa · EMPRESA/DEPARTAMENTO só da minha · PRIVADA só minha"]
    P2{"TimelinePort = Cassandra?"}
    P2 -->|cassandra.enabled| P3["timeline_by_user cursor por at desc"]
    P2 -->|não| P4["mural_entries paginado MySQL"]
    P5["SearchService: multi-index query com filtro de visibilidade + OCR"]
    P6{"Query vazia ou maior que 200 chars?"}
    P6 -->|sim| E1["422 VALIDACAO details.q"]
    P7{"Follow já existe?"}
    P7 -->|sim| E2["409 JA_SEGUINDO"]
    P7 -->|não| P8["Grava Follow ATIVO + Notification"]
    P9{"Projeto visível ao viewer?"}
    P9 -->|não| E3["403 ACESSO_NEGADO"]
    P10["Contadores sociais em cache"]
  end

  subgraph IA["AiEngine (MEMORIA_BUSCA, RF33)"]
    I1["Embedding da consulta ou do projeto"]
    I2["kNN em ws-memory com filtro de visibilidade"]
    I3["AiInferenceLog"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL mural_entries · follows · tasks · project_schemes")]
    D2[("Cassandra timeline_by_user · flag cassandra.enabled")]
    D3[("OpenSearch ws-tasks · ws-projects · ws-users · ws-companies · ws-memory · flag opensearch.enabled")]
    D4[("Redis contadores · flag redis.enabled")]
  end

  A2 --> F1 --> F2 --> W1 --> P1 --> P2
  A4 --> F2
  A3 --> F2
  P3 --> D2
  P4 --> D1
  P3 --> P10 --> D4
  P4 --> P10
  A5 --> F3 --> W1 --> P6 -->|não| P1 --> P5 --> D3 --> F4
  A6 --> F1
  A7 --> F5 --> W1 --> P7
  P8 --> D1
  A8 --> F6 --> W1 --> P9 -->|sim| I1 --> I2 --> D3
  I2 --> I3
  E1 --> W2
  E2 --> W2
  E3 --> W2
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
  participant CAS as Cassandra
  participant OS as OpenSearch
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: abre /mural (Mural da empresa)
  FE->>C: GET /api/mural?tab=EMPRESA&page=1
  C->>S: MuralService.company(viewer, companyId, filters, page)
  S->>S: VisibilityFilter.allowedFor(viewer)
  alt cassandra.enabled
    S->>CAS: timeline_by_user (20 itens, cursor)
  else só MySQL
    S->>DB: mural_entries where companyId order by at desc limit 20
  end
  S->>R: contadores sociais dos 20 alvos
  S-->>C: Page de 20 MuralItemView com ações do RF26
  C-->>FE: lista (skeleton até chegar, EmptyState se vazio)
  alt falha de rede ou 5xx
    FE-->>U: ErrorState com tentar de novo
  end

  U->>FE: busca pavimentação Caixa (aba PROJETOS)
  FE->>C: GET /api/search?q=pavimentacao+Caixa&tab=PROJETOS
  C->>S: SearchService.search(viewer, q, tab, filters, page)
  alt q vazio ou acima de 200 caracteres
    S-->>C: 422 VALIDACAO details.q
  else ok
    S->>OS: msearch ws-projects, ws-tasks, ws-users, ws-companies (filtro de visibilidade, OCR incluído)
    OS-->>S: hits + contadores por aba
    S-->>C: SearchResult (5 abas com contadores)
    C-->>FE: resultados da aba + badges
  end

  U->>FE: Projetos parecidos com este
  FE->>C: GET /api/search/similar?projectId=
  C->>S: SearchService.similar(viewer, projectId)
  S->>S: VisibilityFilter (403 ACESSO_NEGADO se não visível)
  S->>AI: run(MEMORIA_BUSCA, embedding do projeto)
  AI->>OS: knn ws-memory com filtro de visibilidade
  AI->>DB: insert ai_inference_log
  AI-->>S: projetos semelhantes com score
  S-->>FE: lista com Spark ✦

  U->>FE: Seguir departamento SECID-UTS
  FE->>C: POST /api/follows {DEPARTMENT, id}
  C->>S: FollowService.follow(actor, DEPARTMENT, id)
  alt já existe ATIVO
    S-->>C: 409 JA_SEGUINDO
  else novo
    S->>DB: insert follows (único)
    S->>EV: Followed → Notification + timeline fan-out
    S-->>C: 201
  end
```

## 4. Máquina de estados

Entidade central: `Follow.status` (`FollowStatus`). `MuralEntry` não tem estado (append-only; o impulso é só `boostUntil`, RF42). Os itens exibidos seguem as máquinas de `TaskState` (RF41) e `ProjectStatus` (RF22).

```mermaid
stateDiagram-v2
  [*] --> ATIVO: POST /api/follows (CA06, vínculo único por alvo)
  ATIVO --> ATIVO: atividade do alvo entra em Seguindo (fan-out AFTER_COMMIT)
  ATIVO --> REMOVIDO: DELETE /api/follows
  REMOVIDO --> ATIVO: seguir de novo (reativa o mesmo registro)
  REMOVIDO --> [*]
  note right of ATIVO
    Alvos: USER · DEPARTMENT · COMPANY.
    Único (followerId, targetType, targetId) → 409 JA_SEGUINDO.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/mural (3 sub-abas) · app/(shell)/search (5 abas)"]
    R2["components: TopBar (busca global) · TaskCard · ProjectCard (mural · hero) · Counters · Skeleton · EmptyState · ErrorState · FollowButton"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    MC["MuralController · SearchController · FollowController (@Operation RF27.CA01-CA06)"]
    SEC["SecurityConfig · CorrelationIdFilter · AuthRateLimitFilter (sec-b3) · GlobalExceptionHandler"]
  end
  subgraph APPL["ws-application"]
    MS["social/MuralService"]
    SS["social/SearchService"]
    FS["social/FollowService"]
    VF["social/VisibilityFilter"]
    AIE["ai/AiEngine (MEMORIA_BUSCA)"]
    DE["events/DomainEvents AFTER_COMMIT (fan-out timeline)"]
    PORTS["ports: TimelinePort · SearchIndexPort · CachePort · AiProviderPort"]
  end
  subgraph DOM["ws-domain"]
    ENT["MuralEntry · TimelineEvent · Follow · enums MuralKind/FollowTargetType/FollowStatus (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    CASA["persistence-cassandra timeline_by_user (flag cassandra.enabled)"]
    MY["persistence-mysql mural_entries · follows (fallback de timeline)"]
    OSA["search-opensearch ws-tasks · ws-projects · ws-users · ws-companies · ws-memory (flag opensearch.enabled)"]
    RD["cache-redis contadores (flag redis.enabled)"]
    AIP["ai-providers (embeddings: ai-claude · ai-gemini · ai-local)"]
  end
  BFF --> MC
  MC --> SEC
  MC --> MS
  MC --> SS
  MC --> FS
  MS --> VF
  SS --> VF
  SS --> AIE
  FS --> DE
  MS --> PORTS
  SS --> PORTS
  AIE --> PORTS
  FS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> CASA --> CASS[("Cassandra")]
  PORTS --> MY
  PORTS --> OSA --> OPENS[("OpenSearch")]
  PORTS --> RD --> REDIS[("Redis")]
  PORTS --> AIP
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF27.CA01 | `MuralService.company/showcase/following`, `TimelinePort.page` (20 por página) | A2/A3/A4 → F1 → F2 → P2 → P3/P4 → P10 | 1–12 | — | `Skeleton · EmptyState · ErrorState`, `CASA`, `MY` |
| RF27.CA02 | `SocialService.react`, `Reaction`, `MuralItemView.actions` | A6 → F1 | 9 (ações do RF26 na view) | — | `Counters`, `TaskCard`, `ProjectCard` |
| RF27.CA03 | `SearchService.search`, `SearchIndexPort.search`, `TaskAttachment.ocrTextRef`, contadores por aba | A5 → F3 → P6 (422) → P5 → F4 | 13–21 | — | `SS`, `OSA` |
| RF27.CA04 | `VisibilityFilter.allowedFor`, `Visibility`, `Guard.requireSameCompany` | P1 (toda leitura) · P9 (403 ACESSO_NEGADO) | 4, 25 | — | `VF` |
| RF27.CA05 | `SearchService.similar`, `InstitutionalMemoryDocument`, `AiEngine MEMORIA_BUSCA` | A8 → F6 → P9 → I1 → I2 → I3 | 22–29 | — | `AIE`, `AIP`, `OSA (ws-memory)` |
| RF27.CA06 | `Follow` (único), `FollowService.follow/unfollow`, `Notification`, fan-out `TimelineEvent` | A7 → F5 → P7 (409 JA_SEGUINDO) → P8 | 30–37 | `[*] → ATIVO → REMOVIDO → ATIVO` | `FS`, `FollowButton`, `DE` |
