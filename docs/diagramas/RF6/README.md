# RF6 — Acessar e gerenciar o Perfil  Empresarial (Acervo Digital + Projetos Salvos)
**HU:** HU6 · **Sprint (board Work Station):** lista *Requisitos Funcionais* (sem sprint atribuída) · **Equivalente FAI:** RF6 Perfil Lookbook (Closet Digital + Looks Salvos): abas Closet · Looks · Looks salvos · Peças salvas, toggles de estado no topo do card · **Aba/rota:** Meu perfil (`/profile`, sub-abas `?tab=acervo|projetos|projetos-salvos|tarefas-salvas`), perfil de terceiros em `/u/[username]`; Acervo também em `/tasks`
**Critérios de aceite cobertos:** RF6.CA01 … RF6.CA06 — **todos "(CA a confirmar)"**: o corpo do card RF6 está vazio; os CAs foram derivados do título + HU6 e reaproveitam o já validado em `_anterior/RF19` (sub-abas 1–2 e 7–8), RF41 (estados do Acervo) e RF26.CA04 (salvar)

> **HU6** — COMO usuário autenticado dentro do sistema POSSO visualizar meu perfil com tudo o que criei (tarefas, projetos, planos, decisões) em sub-abas e o meu perfil deliberativo gerado pela IA PARA acompanhar e mostrar minha produção e minha evolução desde que entrei no sistema.

O **Perfil Empresarial** é o perfil de trabalho do usuário (= Perfil Lookbook do FAI): cabeçalho (avatar, nome, cargo, empresa, departamento, contadores) e as sub-abas que o título do card recorta — **Acervo Digital** (sub-aba 1 do RF19: `TaskItem` do dono com os 8 estados do `TaskState`, RF41) e **Projetos** (sub-aba 2: `ProjectScheme`) para todos, mais **Projetos salvos / Tarefas salvas** (sub-abas 7–8: `SavedItem`, RF26.CA04) só para o dono. "Gerenciar" = ações rápidas do card (favoritar, mudar estado via `TaskStateMachine`, arquivar, duplicar, levar ao projeto, remover dos salvos). As demais sub-abas da HU6 (planos, decisões, perfil deliberativo) ficam no card RF26 (corpo = antigo RF19) e não são repetidas aqui.

## Critérios de aceite derivados do título + HU6 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) | Fonte reaproveitada |
|---|---|---|
| **RF6.CA01** (CA a confirmar) | Dado um usuário autenticado, quando abre `/profile`, então vê o cabeçalho (avatar, nome, `jobTitle`, empresa, departamento, contadores de tarefas, projetos e salvos via Redis) e as sub-abas **Acervo Digital**, **Projetos**, **Projetos salvos** e **Tarefas salvas**; em `/u/[username]` um terceiro vê só Acervo Digital e Projetos, com itens filtrados por `Visibility`; sub-aba restrita acessada por terceiro → `403 ACESSO_NEGADO`. | RF19.CA01, RF19.CA02 |
| **RF6.CA02** (CA a confirmar) | Dado a sub-aba Acervo Digital, então ela lista os `TaskItem` do dono em grade compacta com **sub-filtros por estado** (`TaskState`: RASCUNHO · DISPONIVEL · EM_USO · BLOQUEADA · CONCLUIDA · ARQUIVADA · MODELO_PUBLICO · OFERECIDA) com contadores, filtros por categoria/tipo/processo/natureza, ordenação (recentes, mais usadas, nome, prazo), busca (OpenSearch), paginação de 20 e querystring restaurável; skeleton, estado vazio ilustrado e "tentar de novo" em `503 BUSCA_INDISPONIVEL`. | RF41.CA01, RF41.CA09 |
| **RF6.CA03** (CA a confirmar) | Dado um card do meu Acervo, quando aciono uma ação rápida (favoritar ⭐, mudar estado, arquivar, duplicar, levar ao projeto), então a transição passa por `TaskStateMachine` e grava `TaskStateLog`; transição inválida → `422 TRANSICAO_INVALIDA`; EM_USO é automático ao entrar em projeto ativo e MODELO_PUBLICO só via chancela/publicação; a etiqueta de estado aparece em texto no topo do card. | RF41.CA02, RF41.CA07, RF38.CA05 |
| **RF6.CA04** (CA a confirmar) | Dado a sub-aba Projetos, então ela lista os `ProjectScheme` do dono com capa-mosaico, barra de fases, `status` e `currentPhase`, filtráveis por status/fase/exercício e paginados; abrir um card leva ao detalhe do projeto (lista por fase, RF7) e, para o dono, à edição (RF8/RF22). | RF19 sub-aba 2, RF21.CA10 |
| **RF6.CA05** (CA a confirmar) | Dado a sub-aba Projetos salvos ou Tarefas salvas, então ela lista os `SavedItem` do dono (`targetType` PROJECT ou TASK) com marcador `favorite`, respeitando a visibilidade atual do alvo (alvo que ficou PRIVADO aparece como "indisponível"); "Remover dos salvos" apaga o `SavedItem` e decrementa `savesCount`; só o dono acessa (`requireOwner`). | RF26.CA04, RF19 sub-abas 7–8 |
| **RF6.CA06** (CA a confirmar) | Dado o perfil de um terceiro, quando vejo seu Acervo Digital, então só aparecem tarefas com `visibility` compatível (PUBLICA; EMPRESA se mesma empresa; DEPARTAMENTO se membro), nunca PRIVADA; cada card oferece **"Levar ao meu acervo"** (RF7/RF23) e interações sociais (RF19 atual); a API devolve `403 ACESSO_NEGADO` para item fora da visibilidade. | RF41.CA08, RF26.CA08 |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_identidade {
  class User {
    <<entity>>
    +id: UUID
    +username: String
    +fullName: String
    +displayName: String
    +jobTitle: String
    +profileType: ProfileType
    +companyId: UUID
    +departmentId: UUID
    +avatarUrl: String
    +coverUrl: String
    +bio: String
    .. +25 campos ..
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
    +name: String
    +acronym: String
    +color: String
    +monogram: String
  }
}

namespace ws_domain_acervo {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +type: TaskType
    +category: TaskCategory
    +state: TaskState
    +visibility: Visibility
    +favorite: boolean
    +dueAt: LocalDate
    +legalDueAt: LocalDate
    +thumbnailUrl: String
    +projectUsageCount: int
    +reuseCount: int
    +savesCount: long
    +version: long
    .. +40 campos ..
  }
  class TaskStateLog {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +fromState: TaskState
    +toState: TaskState
    +actorId: UUID
    +reason: String
    +projectId: UUID
    +at: Instant
  }
}

namespace ws_domain_projetos {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +exerciseYear: int
    +visibility: Visibility
    +coverMode: CoverMode
    +coverUrl: String
    +mosaicJson: JSON
    +savesCount: long
    .. +30 campos ..
  }
}

namespace ws_domain_social {
  class SavedItem {
    <<entity>>
    +id: UUID
    +userId: UUID
    +targetType: TargetType
    +targetId: UUID
    +favorite: boolean
    +savedAt: Instant
  }
}

namespace ws_domain_enums {
  class TaskState {
    <<enum>>
    RASCUNHO
    DISPONIVEL
    EM_USO
    BLOQUEADA
    CONCLUIDA
    ARQUIVADA
    MODELO_PUBLICO
    OFERECIDA
  }
  class ProjectStatus {
    <<enum>>
    RASCUNHO
    PUBLICADO
    EM_DECISAO
    APROVADO
    EM_EXECUCAO
    CONCLUIDO
    ARQUIVADO
    DEVOLVIDO
  }
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
  class TargetType {
    <<enum>>
    TASK
    PROJECT
    PLAN
    KIT
    PROJECT_TASK
    MESSAGE
    RECOGNITION
  }
}

namespace ws_application {
  class ProfileService {
    <<service>>
    +loadHeader(viewerId, username) ProfileHeader
    +listTabs(viewerId, ownerId) List~ProfileTab~
    +loadTab(viewerId, ownerId, tab, filters, page) Page
    +visibilityFilter(viewer, owner) Visibility[]
  }
  class AcervoService {
    <<service>>
    +list(ownerId, filters, sort, page) Page~TaskItem~
    +counters(ownerId) Map~TaskState, int~
    +listForViewer(viewerId, ownerId, filters, page) Page~TaskItem~
    +favorite(userId, taskId, on) TaskItem
    +duplicate(userId, taskId) TaskItem
    +archive(userId, taskId) TaskItem
    +takeToMyAcervo(viewerId, taskId) TaskItem
  }
  class TaskStateMachine {
    <<service>>
    +canTransition(from, to) boolean
    +transition(taskId, to, actorId, reason) TaskStateLog
    +onProjectActivated(taskIds, projectId)
    +onProjectTaskRemoved(taskId)
  }
  class ProjectService {
    <<service>>
    +listByOwner(viewerId, ownerId, filters, page) Page~ProjectScheme~
  }
  class SocialService {
    <<service>>
    +save(userId, targetType, targetId, favorite) SavedItem
    +unsave(userId, targetType, targetId)
    +savedItems(userId, targetType, page) Page~SavedItem~
    +checkVisibility(viewer, target) boolean
  }
  class CachePort {
    <<port>>
    +getCounters(ownerId) Counters
    +putCounters(ownerId, counters, ttl)
  }
  class SearchPort {
    <<port>>
    +searchTasks(ownerId, query, filters, page) Page~UUID~
  }
}

namespace ws_web {
  class ProfileController {
    <<controller>>
    +GET_api_profile_me()
    +GET_api_users_username(username)
    +GET_api_users_username_tabs_tab(username, tab, query)
  }
  class TaskController {
    <<controller>>
    +GET_api_me_tasks(estado, categoria, tipo, q, sort, page)
    +GET_api_me_tasks_counters()
    +POST_api_tasks_id_transition(to, reason)
    +POST_api_tasks_id_favorite()
    +POST_api_tasks_id_duplicate()
    +POST_api_tasks_id_take()
  }
  class InteractionController {
    <<controller>>
    +GET_api_me_saved(type, page)
    +POST_api_interactions_type_id_saves(favorite)
    +DELETE_api_interactions_type_id_saves()
  }
}

namespace ws_infrastructure {
  class RedisCacheAdapter {
    <<adapter>>
  }
  class OpenSearchAdapter {
    <<adapter>>
  }
  class TaskJpaRepository {
    <<adapter>>
  }
  class SavedItemJpaRepository {
    <<adapter>>
  }
}

User "1" --> "0..1" Company : companyId
User "1" --> "0..1" Department : departmentId
TaskItem "*" --> "1" User : ownerId
TaskItem "1" --> "*" TaskStateLog : transições
ProjectScheme "*" --> "1" User : ownerId
SavedItem "*" --> "1" User : userId
SavedItem ..> TaskItem : targetType TASK
SavedItem ..> ProjectScheme : targetType PROJECT
SavedItem --> TargetType
TaskItem --> TaskState
TaskItem --> Visibility
ProjectScheme --> ProjectStatus
ProjectScheme --> Visibility

ProfileController ..> ProfileService
TaskController ..> AcervoService
TaskController ..> TaskStateMachine
InteractionController ..> SocialService
ProfileService ..> AcervoService : sub-aba Acervo Digital
ProfileService ..> ProjectService : sub-aba Projetos
ProfileService ..> SocialService : sub-abas Salvos
ProfileService ..> CachePort : contadores
AcervoService ..> TaskStateMachine
AcervoService ..> SearchPort
RedisCacheAdapter ..|> CachePort
OpenSearchAdapter ..|> SearchPort
TaskJpaRepository ..> TaskItem : JPA
SavedItemJpaRepository ..> SavedItem : JPA

note for ProfileService "sub-abas Acervo Digital e Projetos para todos (visibilityFilter), Projetos salvos e Tarefas salvas só para o dono — 403 para terceiros (CA01, CA06)"
note for TaskStateMachine "toda transição grava TaskStateLog · inválida = 422 TRANSICAO_INVALIDA · EM_USO automático ao entrar em projeto · MODELO_PUBLICO só via chancela/publicação (CA03)"
note for SavedItem "tabela saved_items · único (userId, targetType, targetId) · favorite · savesCount desnormalizado no alvo (CA05)"
note for TaskItem "tabela tasks · sub-filtros por state com contadores em Redis · busca por OpenSearch · 20 por página (CA02)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Abre /profile ou /u/[username]"]
    U2["Escolhe sub-aba: Acervo Digital · Projetos · Projetos salvos · Tarefas salvas"]
    U3["Acervo: sub-filtro por estado, filtros, busca, ordenação, página"]
    U4["Ação rápida no card: favoritar, mudar estado, arquivar, duplicar, levar ao projeto"]
    U5["Salvos: remover dos salvos ou marcar favorito"]
    U6["Terceiro: Levar ao meu acervo"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Lê tab + filtros + page da URL, renderiza skeleton"]
    W2["Cabeçalho com contadores e lista de sub-abas"]
    W3["Grade compacta de cards com etiqueta de estado em texto e ⭐ só para o dono"]
    W4["Atualiza a URL com tab e filtros ativos"]
    W5["Estado vazio ilustrado / banner tentar de novo"]
    W6["Toast de erro: transição não permitida, com o motivo"]
  end

  subgraph LA["ws-application"]
    A1["ProfileService.loadHeader + listTabs"]
    A2{"viewer == dono?"}
    A3["4 sub-abas"]
    A4["Só Acervo Digital e Projetos"]
    A5["ProfileService.loadTab"]
    A6{"Sub-aba de salvos e viewer não é dono?"}
    A7["403 ACESSO_NEGADO"]
    A8["AcervoService.list ou listForViewer com visibilityFilter"]
    A9["AcervoService.counters por TaskState"]
    A10{"SearchPort disponível?"}
    A11["503 BUSCA_INDISPONIVEL"]
    A12["ProjectService.listByOwner com visibilityFilter"]
    A13["SocialService.savedItems TASK ou PROJECT, checkVisibility do alvo"]
    A14["TaskStateMachine.canTransition"]
    A15{"Transição permitida?"}
    A16["422 TRANSICAO_INVALIDA"]
    A17["TaskStateMachine.transition → TaskStateLog"]
    A18["AcervoService.favorite / duplicate / archive"]
    A19["SocialService.unsave → savesCount − 1"]
    A20["AcervoService.takeToMyAcervo → cópia EXTRAIDA_DE_PROJETO ou REMIX, RF7/RF23"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: users, companies, departments")]
    P2[("Redis: contadores do perfil e por estado")]
    P3[("MySQL: tasks, task_state_log")]
    P4[("OpenSearch: índice de tarefas")]
    P5[("MySQL: project_schemes")]
    P6[("MySQL: saved_items")]
  end

  U1 --> W1 --> A1
  A1 --> P1
  A1 --> P2
  A1 --> A2
  A2 -->|"sim"| A3 --> W2
  A2 -->|"não"| A4 --> W2
  W2 --> U2 --> W4 --> A5 --> A6
  A6 -->|"sim"| A7
  A6 -->|"não, Acervo Digital"| A8
  A6 -->|"não, Projetos"| A12 --> P5 --> W3
  A6 -->|"não, Salvos e dono"| A13 --> P6 --> W3
  A8 --> A9 --> P2
  A8 --> A10
  A10 -->|"não"| A11 --> W5
  A10 -->|"sim"| P4 --> P3 --> W3
  W3 --> U3 --> W4
  W3 --> U4 --> A14 --> A15
  A15 -->|"não"| A16 --> W6
  A15 -->|"sim"| A17 --> P3
  U4 --> A18 --> P3
  W3 --> U5 --> A19 --> P6
  W3 --> U6 --> A20 --> P3

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A7,A11,A16 err
  class W5,W6 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant R as Redis

  U->>NX: GET /profile?tab=acervo&estado=EM_USO&categoria=ETP&page=1
  NX->>C: GET /api/profile/me
  C->>S: ProfileService.loadHeader(viewerId, me)
  S->>DB: users + company + department
  S->>R: GET counters:{ownerId}
  alt miss no cache
    S->>DB: COUNT tasks por state, project_schemes, saved_items
    S->>R: SET counters:{ownerId} TTL 60s
  end
  S->>S: listTabs: dono = Acervo Digital, Projetos, Projetos salvos, Tarefas salvas (CA01)
  S-->>C: 200 ProfileHeader + tabs
  C-->>NX: 200

  NX->>C: GET /api/me/tasks?estado=EM_USO&categoria=ETP&page=1&size=20
  C->>S: AcervoService.list(ownerId, filters, sort, page)
  S->>OS: searchTasks(ownerId, q, filters, page)
  alt OpenSearch indisponível (CA02)
    OS-->>S: timeout
    S-->>C: 503 BUSCA_INDISPONIVEL
    C-->>NX: 503
    NX-->>U: banner "tentar de novo"
  else ok
    OS-->>S: ids paginados + total
    S->>DB: tasks WHERE id IN ids
    S->>R: GET counters por state
    S-->>C: 200 Page {items, total, countersByState}
    C-->>NX: 200
    NX-->>U: grade compacta, sub-filtros com contadores, URL restaurável (CA02)
  end

  U->>NX: ação rápida "marcar CONCLUIDA" em uma tarefa RASCUNHO (CA03)
  NX->>C: POST /api/tasks/T1/transition {to: CONCLUIDA}
  C->>S: TaskStateMachine.transition(T1, CONCLUIDA, actorId, reason)
  S->>S: canTransition(RASCUNHO, CONCLUIDA) = false
  alt transição inválida
    S-->>C: 422 TRANSICAO_INVALIDA {from RASCUNHO, to CONCLUIDA}
    C-->>NX: 422
    NX-->>U: toast com o motivo
  else permitida, por exemplo DISPONIVEL para ARQUIVADA
    S->>DB: UPDATE tasks SET state, version + 1
    S->>DB: INSERT task_state_log (fromState, toState, actorId, reason)
    S->>R: DEL counters:{ownerId}
    S-->>C: 200 TaskItem
    C-->>NX: 200
    NX-->>U: etiqueta de estado atualizada no card
  end

  U->>NX: sub-aba Projetos salvos (CA05)
  NX->>C: GET /api/me/saved?type=PROJECT&page=1
  C->>S: SocialService.savedItems(userId, PROJECT, page)
  S->>DB: saved_items JOIN project_schemes WHERE userId
  S->>S: checkVisibility de cada alvo, PRIVADO alheio vira "indisponível"
  S-->>C: 200 Page de SavedItem com alvo resumido
  C-->>NX: 200
  U->>NX: Remover dos salvos
  NX->>C: DELETE /api/interactions/PROJECT/P7/saves
  C->>S: SocialService.unsave(userId, PROJECT, P7)
  S->>DB: DELETE saved_items · UPDATE project_schemes SET savesCount = savesCount - 1
  S-->>C: 204

  U->>NX: terceiro abre /u/maria?tab=tarefas-salvas (CA01, CA06)
  NX->>C: GET /api/users/maria/tabs/tarefas-salvas
  C->>S: ProfileService.loadTab(viewerId, ownerId, TAREFAS_SALVAS)
  S-->>C: 403 ACESSO_NEGADO (sub-aba só do dono)
  C-->>NX: 403
  NX->>C: GET /api/users/maria/tabs/acervo?page=1
  C->>S: AcervoService.listForViewer(viewerId, ownerId, filters, page)
  S->>S: visibilityFilter = PUBLICA + EMPRESA se mesma empresa + DEPARTAMENTO se membro
  S->>DB: tasks WHERE ownerId AND visibility IN filtro
  S-->>C: 200 Page com ação "Levar ao meu acervo"
  C-->>NX: 200
```

## 4. Máquina de estados

Entidade central: **`TaskItem.state`** (enum `TaskState`), que o Acervo Digital exibe como sub-filtros e etiqueta de estado e que a ação rápida "mudar estado" altera via `TaskStateMachine` (RF41.CA02). `ProjectScheme.status` e `SavedItem` não têm máquina própria neste RF — o perfil só os lê.

```mermaid
stateDiagram-v2
  [*] --> RASCUNHO : criador de tarefas RF4 salva como rascunho
  [*] --> DISPONIVEL : criador de tarefas RF4 salva com estado inicial DISPONIVEL
  RASCUNHO --> DISPONIVEL : completar obrigatórios
  RASCUNHO --> ARQUIVADA : descartar
  DISPONIVEL --> EM_USO : automático ao entrar em projeto ativo, RF5
  EM_USO --> DISPONIVEL : removida de todos os projetos
  DISPONIVEL --> BLOQUEADA : bloquear com motivo
  EM_USO --> BLOQUEADA : predecessora pendente
  BLOQUEADA --> EM_USO : desbloquear
  BLOQUEADA --> DISPONIVEL : desbloquear sem projeto
  EM_USO --> CONCLUIDA : concluir
  DISPONIVEL --> CONCLUIDA : concluir
  CONCLUIDA --> ARQUIVADA : arquivar
  DISPONIVEL --> ARQUIVADA : arquivar
  ARQUIVADA --> DISPONIVEL : desarquivar
  DISPONIVEL --> MODELO_PUBLICO : chancela APROVADA ou publicar como modelo, RF39
  CONCLUIDA --> MODELO_PUBLICO : chancela APROVADA
  DISPONIVEL --> OFERECIDA : oferecer no Balcão, RF40
  MODELO_PUBLICO --> OFERECIDA : oferecer modelo chancelado
  OFERECIDA --> DISPONIVEL : retirar oferta
  ARQUIVADA --> [*] : exclusão com snapshot nos projetos de terceiros, RF41.CA05
  note right of DISPONIVEL
    Sub-filtros do Acervo Digital mostram contadores por estado (CA02).
    Transição pela ação rápida passa por TaskStateMachine e grava
    TaskStateLog; inválida = 422 TRANSICAO_INVALIDA (CA03).
  end note
  note left of MODELO_PUBLICO
    Nunca por ação rápida direta: só via chancela ou publicação (CA03).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/profile — cabeçalho + sub-abas Acervo Digital · Projetos · Projetos salvos · Tarefas salvas"]
    F2["app/u/[username] — Acervo Digital e Projetos com visibilidade"]
    F3["components/ui: ProfileHeader, SubTabs, SubFilterTabs por estado, FilterBar, Pagination, TaskCard com etiqueta de estado e ⭐, ProjectCard mosaico + barra de fases, QuickActions, SaveButton, EmptyState, RetryBanner"]
  end

  subgraph WEB["ws-web"]
    C1["ProfileController — /api/profile/me, /api/users/{username}, /tabs/{tab}"]
    C2["TaskController — /api/me/tasks, /counters, /api/tasks/{id}/transition, /favorite, /duplicate, /take"]
    C3["InteractionController RF26 — /api/me/saved, /api/interactions/{type}/{id}/saves"]
  end

  subgraph APP["ws-application"]
    S1["ProfileService"]
    S2["AcervoService RF41"]
    S3["TaskStateMachine RF41"]
    S4["ProjectService"]
    S5["SocialService RF26"]
    P1["CachePort"]
    P2["SearchPort"]
  end

  subgraph DOM["ws-domain"]
    D1["User · Company · Department"]
    D2["TaskItem · TaskStateLog · TaskState · Visibility"]
    D3["ProjectScheme · ProjectStatus"]
    D4["SavedItem · TargetType"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: users, tasks, task_state_log, project_schemes, saved_items")]
    I2[("cache-redis: contadores do perfil e por estado")]
    I3[("search-opensearch: índice de tarefas — busca e filtros do Acervo")]
  end

  F1 --- F3
  F2 --- F3
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C1
  F3 -->|"HTTPS/JSON"| C2
  F3 -->|"HTTPS/JSON"| C3
  C1 --> S1
  C2 --> S2
  C2 --> S3
  C3 --> S5
  S1 --> S2
  S1 --> S4
  S1 --> S5
  S1 --> P1
  S2 --> S3
  S2 --> P2
  S1 --> D1
  S2 --> D2
  S3 --> D2
  S4 --> D3
  S5 --> D4
  D1 --> I1
  D2 --> I1
  D3 --> I1
  D4 --> I1
  P1 --> I2
  P2 --> I3
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF6.CA01 (a confirmar) | Classes `User` (jobTitle, companyId, departmentId), `Company`, `Department`, `ProfileService.loadHeader/listTabs/loadTab`, `CachePort` · Atividades `U1 → W1 → A1 → A2 → A3/A4 → W2`, `A6 → A7 403 ACESSO_NEGADO` · Sequência msgs 1–11 (header, contadores Redis, listTabs) e `GET /api/users/maria/tabs/tarefas-salvas → 403` · Componentes `app/profile`, `app/u/[username]`, `ProfileHeader`, `SubTabs`, `cache-redis` |
| RF6.CA02 (a confirmar) | Classes `TaskItem.state/favorite/thumbnailUrl`, enum `TaskState`, `AcervoService.list/counters`, `SearchPort` · Atividades `A8 → A9 → P2`, `A10 → A11 503 BUSCA_INDISPONIVEL → W5` / `A10 → P4 → P3 → W3`, `U3 → W4` (URL restaurável) · Sequência `GET /api/me/tasks?estado=EM_USO…` com `alt OpenSearch indisponível` · Nota do estado DISPONIVEL · Componentes `SubFilterTabs`, `FilterBar`, `Pagination`, `EmptyState`, `RetryBanner`, `search-opensearch` |
| RF6.CA03 (a confirmar) | Classes `TaskStateMachine` (canTransition, transition), `TaskStateLog`, `AcervoService.favorite/duplicate/archive` · Atividades `U4 → A14 → A15 → A16 422 TRANSICAO_INVALIDA → W6` / `A15 → A17 → P3`, `A18` · Sequência `POST /api/tasks/T1/transition` com `alt transição inválida` / `else permitida` · Máquina de estados inteira e notas (MODELO_PUBLICO só via chancela) · Componentes `QuickActions`, `TaskCard` (etiqueta de estado em texto, ⭐ só dono), `TaskStateMachine RF41` |
| RF6.CA04 (a confirmar) | Classes `ProjectScheme` (status, currentPhase, coverMode, mosaicJson), enum `ProjectStatus`, `ProjectService.listByOwner` · Atividades `A6 → A12 → P5 → W3` · Componentes `ProjectCard mosaico + barra de fases`, `ProjectService` |
| RF6.CA05 (a confirmar) | Classes `SavedItem` (favorite, savedAt, nota de unicidade), enum `TargetType`, `SocialService.save/unsave/savedItems`, `InteractionController` · Atividades `A6 → A13 → P6 → W3`, `U5 → A19 → P6` · Sequência `GET /api/me/saved?type=PROJECT` → checkVisibility → `DELETE …/saves` → `savesCount - 1` · Componentes `SaveButton`, `InteractionController RF26`, `SocialService RF26` |
| RF6.CA06 (a confirmar) | `ProfileService.visibilityFilter`, `AcervoService.listForViewer/takeToMyAcervo`, enum `Visibility`, `SocialService.checkVisibility` · Atividades `A2 (não) → A4`, `A8` (visibilityFilter), `U6 → A20 → P3` · Sequência `GET /api/users/maria/tabs/acervo` → "visibilityFilter = PUBLICA + EMPRESA + DEPARTAMENTO" → "Levar ao meu acervo" · Componente `app/u/[username]` |
