# RF6 — Acessar e gerenciar o Perfil Empresarial (Acervo Digital + Projetos Salvos)
**HU:** HU6 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (o card "SPRINT 1" cita "RF6 Enviar mensagens", escopo antigo — `RENUMERACAO.md`; fase (d) da ARQUITETURA §6 junto com RF41) · **Equivalente FAI:** RF6 Perfil Lookbook (Closet Digital + Looks Salvos: abas Closet · Looks · Looks salvos · Peças salvas, toggles de estado no topo do card) · **Aba/rota:** Meu perfil (`/profile`, sub-abas `?tab=acervo|projetos|projetos-salvos|tarefas-salvas`, Matriz B de ABAS_POR_PERFIL §3), perfil de terceiros `/u/[username]` (RF16); Acervo também em `/tasks` (RF41); API `GET /api/me` (real), `GET /api/me/tasks`, `GET /api/me/projects`, `GET /api/me/saved?type=`, `POST /api/tasks/{id}/state`
**Critérios de aceite cobertos:** RF6.CA01 … RF6.CA06 — **todos "(CA a confirmar)"**: o corpo do card está vazio; os CAs foram derivados do título + HU6 e reaproveitam `_anterior/RF19` (sub-abas 1–2 e 7–8), RF41 (estados do Acervo) e RF26.CA04 (salvar). Real: `MeController.me`, `AccountService.me/profile`, `UserView` (Bloco 3); o resto **(planejado)**.

> **HU6** — COMO usuário autenticado dentro do sistema POSSO visualizar meu perfil com tudo o que criei (tarefas, projetos, planos, decisões) em sub-abas e o meu perfil deliberativo gerado pela IA PARA acompanhar e mostrar minha produção e minha evolução desde que entrei no sistema.

O título do card recorta, das 15 sub-abas do perfil (Matriz B), as quatro do **Perfil Empresarial**: **Acervo Digital** (= Closet: inventário `TaskItem` com sub-filtros por `TaskState`), **Projetos** (`ProjectScheme` do dono), **Projetos salvos** e **Tarefas salvas** (`SavedItem`). As demais sub-abas (planos, decisões, perfil deliberativo, pontos…) ficam no RF16 (terceiros) e nos RFs de origem (RF24, RF29, RF42, RF45).

## Critérios de aceite derivados da HU6 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) | Origem |
|---|---|---|
| **RF6.CA01** (CA a confirmar) | Dado um usuário autenticado, quando abre `/profile`, então vê o cabeçalho (`UserView`: avatar, nome, `jobTitle`, empresa, departamento; contadores de tarefas, projetos e salvos via Redis) e as sub-abas **Acervo Digital**, **Projetos**, **Projetos salvos** e **Tarefas salvas**; em `/u/[username]` um terceiro vê só Acervo Digital e Projetos, filtrados por `Visibility` (RF16); sub-aba reservada ao dono → `403 ACESSO_NEGADO` (`Guard.ownerOrAdmin`). | `_anterior/RF19` CA01, Matriz B |
| **RF6.CA02** (CA a confirmar) | Dado a sub-aba Acervo Digital, então ela lista os `TaskItem` do dono em grade compacta (`TaskCard` compact) com **sub-filtros por estado** (`TaskState`: RASCUNHO · DISPONIVEL · EM_USO · BLOQUEADA · CONCLUIDA · ARQUIVADA · MODELO_PUBLICO · OFERECIDA) com contadores, filtros por categoria/tipo/processo/natureza, ordenação (recentes, mais usadas, nome, prazo), busca (OpenSearch `ws-tasks`) e paginação (20); a URL reflete filtros e página. | RF41.CA01/CA04 |
| **RF6.CA03** (CA a confirmar) | Dado um card do meu Acervo, quando aciono uma ação rápida (favoritar ⭐, mudar estado, arquivar, duplicar, levar ao projeto), então a transição passa por `TaskStateMachine` e grava `TaskStateLog`; transição inválida → `422 TRANSICAO_INVALIDA`; EM_USO é automático ao entrar em projeto ativo e MODELO_PUBLICO só via chancela/publicação; a etiqueta de estado (`Tag`) aparece no card. | RF41.CA02 |
| **RF6.CA04** (CA a confirmar) | Dado a sub-aba Projetos, então ela lista os `ProjectScheme` do dono (`ProjectCard` mosaic) com capa-mosaico, `PhaseBar`, `status` e `currentPhase`, filtráveis por status/fase/exercício e paginados; abrir um card leva ao detalhe (lista por fase, RF7) e, para o dono, à edição (RF8/RF12/RF22). | `_anterior/RF19` sub-aba 2, RF21.CA10 |
| **RF6.CA05** (CA a confirmar) | Dado a sub-aba Projetos salvos ou Tarefas salvas, então ela lista os `SavedItem` do dono (`targetType` PROJECT ou TASK) com marcador `favorite`, respeitando a visibilidade atual do alvo (alvo que ficou PRIVADA aparece como "indisponível"); "Remover dos salvos" apaga o `SavedItem` e decrementa `savesCount`; só o dono acessa. | RF26.CA04, `_anterior/RF19` sub-abas 7–8 |
| **RF6.CA06** (CA a confirmar) | Dado o perfil de um terceiro, quando vejo seu Acervo Digital, então só aparecem tarefas com `visibility` compatível (`AccessPolicy.visibilityFilter`: PUBLICA; EMPRESA se mesma empresa; DEPARTAMENTO se membro), nunca PRIVADA; cada card oferece **"Levar ao meu acervo"** (RF7/RF23) e interações sociais (RF18/RF19); item fora da visibilidade → `403 ACESSO_NEGADO`. | RF41.CA08, RF26.CA08 |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class MeController {
    <<controller>>
    +me(CurrentUser) UserView
    +profile(CurrentUser, UUID id) UserView
  }
  class ProfileController {
    <<controller>>
    +header(username, CurrentUser) ProfileHeader
    +tab(username, tab, filters, CurrentUser) Page
  }
  class AcervoController {
    <<controller>>
    +listMine(filters, CurrentUser) Page~TaskCardView~
    +changeState(id, StateRequest, CurrentUser, ctx) TaskCardView
    +favorite(id, CurrentUser) void
  }
  class SavedItemController {
    <<controller>>
    +list(type, CurrentUser) Page
    +remove(targetType, targetId, CurrentUser) void
  }
  class ProfileService {
    <<facade>>
    +header(username, viewer) ProfileHeader
    +tabsFor(owner, viewer) List~TabKey~
    +tab(owner, viewer, tab, filters) Page
  }
  class AccountService {
    <<service>>
    +me(CurrentUser) UserView
    +profile(CurrentUser, userId) UserView
  }
  class AcervoService {
    <<service>>
    +listMine(ownerId, filters) Page
    +stateCounters(ownerId) Map
    +changeState(id, TaskState, actor, reason) TaskItem
    +toggleFavorite(id, actor) void
    +duplicate(id, actor) TaskItem
  }
  class TaskStateMachine {
    <<service>>
    +canTransition(from, to) boolean
    +transition(TaskItem, TaskState, actor, reason) TaskStateLog
  }
  class SavedItemService {
    <<service>>
    +listMine(userId, targetType) Page
    +remove(userId, targetType, targetId) void
  }
  class AccessPolicy {
    <<service>>
    +visibilityFilter(viewer, owner) Set~Visibility~
    +canView(viewer, item) boolean
  }
  class Guard {
    <<service>>
    +ownerOrAdmin(CurrentUser, ownerId) void
  }
  class TaskRepositoryPort {
    <<port>>
    +findByOwner(ownerId, filters) Page
    +countByState(ownerId) Map
  }
  class ProjectRepositoryPort {
    <<port>>
    +findByOwner(ownerId, filters) Page
  }
  class SavedItemRepositoryPort {
    <<port>>
    +findByUser(userId, targetType) Page
    +delete(id) void
  }
  class CounterCachePort {
    <<port>>
    +profileCounters(userId) Counters
    +decrement(key) void
  }
  class SearchIndexPort {
    <<port>>
    +searchOwn(ownerId, q, filters) Page
  }

  class User {
    <<entity>>
    +UUID id
    +String username
    +String fullName
    +String jobTitle
    +UUID companyId
    +UUID departmentId
    +String avatarUrl
    +String coverUrl
    +ProfileType profileType
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +TaskType type
    +TaskCategory category
    +TaskState state
    +Visibility visibility
    +boolean favorite
    +LocalDate dueAt
    +String thumbnailUrl
    +int projectUsageCount
    +long savesCount
    +long version
  }
  class TaskStateLog {
    <<entity>>
    +UUID taskId
    +TaskState fromState
    +TaskState toState
    +UUID actorId
    +String reason
    +UUID projectId
    +String correlationId
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +ProjectStatus status
    +ProjectPhase currentPhase
    +Visibility visibility
    +int exerciseYear
    +JSON mosaicJson
    +long savesCount
  }
  class SavedItem {
    <<entity>>
    +UUID id
    +UUID userId
    +TargetType targetType
    +UUID targetId
    +boolean favorite
    +Instant savedAt
  }
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

  MeController --> AccountService
  ProfileController --> ProfileService
  AcervoController --> AcervoService
  SavedItemController --> SavedItemService
  ProfileService --> AccountService
  ProfileService --> AcervoService
  ProfileService --> SavedItemService
  ProfileService --> AccessPolicy
  ProfileService --> Guard
  ProfileService --> CounterCachePort
  ProfileService --> ProjectRepositoryPort
  AcervoService --> TaskStateMachine
  AcervoService --> TaskRepositoryPort
  AcervoService --> SearchIndexPort
  SavedItemService --> SavedItemRepositoryPort
  SavedItemService --> AccessPolicy
  SavedItemService --> CounterCachePort
  User "1" --> "0..*" TaskItem : ownerId
  User "1" --> "0..*" ProjectScheme : ownerId
  User "1" --> "0..*" SavedItem : userId
  TaskItem "1" --> "0..*" TaskStateLog
  SavedItem "0..*" --> "0..1" TaskItem : targetType TASK
  SavedItem "0..*" --> "0..1" ProjectScheme : targetType PROJECT
  TaskItem --> TaskState
  TaskItem --> Visibility
  SavedItem --> TargetType
  note for TaskItem "+40 campos (TAXONOMIA §2.1). Único (userId, targetType, targetId) em saved_items."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Usuário autenticado (dono) · Terceiro"]
    A1["Abre /profile (ou /u/{username})"]
    A2["Escolhe a sub-aba: Acervo Digital · Projetos · Projetos salvos · Tarefas salvas"]
    A3["Aplica sub-filtro por estado, categoria, ordenação ou busca"]
    A4["Ação rápida no card: ⭐ favoritar · mudar estado · arquivar · duplicar · levar ao projeto"]
    A5["Remover dos salvos"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["GET /api/me (cabeçalho) + GET /api/users/{username}/tabs (lista de sub-abas permitidas)"]
    F2["GET /api/me/tasks?state=&category=&sort=&q=&page= · URL reflete filtros"]
    F3["GET /api/me/projects?status=&phase=&exercise=&page="]
    F4["GET /api/me/saved?type=PROJECT|TASK"]
    F5["POST /api/tasks/{id}/state {to, reason} · POST /api/tasks/{id}/favorite"]
    F6["DELETE /api/me/saved/{targetType}/{targetId}"]
    F7["Grade TaskCard compact com Tag de estado · ProjectCard mosaic com PhaseBar · Skeleton · EmptyState"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["ProfileController · AcervoController · SavedItemController"]
    E403["403 ACESSO_NEGADO (sub-aba do dono vista por terceiro · item fora da visibilidade)"]
    E404["404 USUARIO_NAO_ENCONTRADO"]
    E422["422 TRANSICAO_INVALIDA"]
    E409["409 CONFLITO_VERSAO (If-Match)"]
  end
  subgraph APP["ws-application"]
    S1["ProfileService.header: UserView + CounterCachePort (tarefas, projetos, salvos)"]
    S2{"viewer == dono?"}
    S3["tabsFor: 4 sub-abas"]
    S4["tabsFor: Acervo Digital + Projetos · AccessPolicy.visibilityFilter"]
    S5["AcervoService.listMine: TaskRepositoryPort/SearchIndexPort · stateCounters"]
    S6["ProjectRepositoryPort.findByOwner"]
    S7["SavedItemService.listMine: alvo PRIVADO para o viewer → 'indisponível'"]
    S8["TaskStateMachine.canTransition?"]
    S9{"transição válida?"}
    S10["transition → TaskStateLog · AuditLog TASK_STATE_CHANGED"]
    S11["SavedItemService.remove → CounterCachePort.decrement(savesCount)"]
    EV["AFTER_COMMIT: TaskStateChanged → reindexa ws-tasks · invalida contadores Redis · atualiza snapshot nos projetos de terceiros"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: users, tasks, task_state_log, project_schemes, saved_items, audit_log")]
    P2[("Redis: profile:counters:{userId} · card cache")]
    P3[("OpenSearch ws-tasks · ws-projects")]
  end

  A1 --> F1 --> W1 --> W2 --> S1 --> S2
  W2 -->|"username inexistente"| E404
  S2 -->|"sim"| S3
  S2 -->|"não"| S4
  S1 --> P2
  S3 --> A2
  S4 --> A2
  A2 -->|"Acervo"| F2 --> S5 --> P3
  S5 --> P1
  A2 -->|"Projetos"| F3 --> S6 --> P1
  A2 -->|"Salvos"| F4 --> S7 --> P1
  S4 -->|"sub-aba do dono"| E403
  A3 --> F2
  S5 --> F7
  S6 --> F7
  S7 --> F7
  A4 --> F5 --> W2 --> S8 --> S9
  S9 -->|"não"| E422
  S9 -->|"versão antiga"| E409
  S9 -->|"sim"| S10 --> P1
  S10 --> EV --> P2
  EV --> P3
  A5 --> F6 --> S11 --> P1
  S11 --> P2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant R as Repository/MySQL
  participant RD as Redis
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: abre /profile
  N->>C: GET /api/me
  C->>S: AccountService.me(current)
  S->>R: findById
  S-->>C: UserView
  C-->>N: 200 UserView
  N->>C: GET /api/users/{username}/tabs
  C->>S: ProfileService.tabsFor(owner, viewer)
  S->>RD: profile:counters:{userId} (tarefas, projetos, salvos)
  alt viewer é o dono
    S-->>C: [acervo, projetos, projetos-salvos, tarefas-salvas] + contadores
  else terceiro
    S->>S: AccessPolicy.visibilityFilter(viewer, owner)
    S-->>C: [acervo, projetos] (filtrados)
  end
  C-->>N: 200

  U->>N: sub-aba Acervo Digital, sub-filtro EM_USO, busca "ofício"
  N->>C: GET /api/me/tasks?state=EM_USO&q=oficio&page=0
  C->>S: AcervoService.listMine(ownerId, filters)
  alt busca textual
    S->>OS: search ws-tasks (ownerId, q, filtros)
    OS-->>S: ids ordenados
    S->>R: tasks por id
  else só filtros
    S->>R: findByOwner(ownerId, state, category, sort, page)
  end
  S->>R: countByState(ownerId)
  S-->>C: Page TaskCardView + stateCounters
  C-->>N: 200 (grade TaskCard compact, Tag de estado, URL com filtros)

  U->>N: ação rápida "Arquivar" no card
  N->>C: POST /api/tasks/{id}/state {to ARQUIVADA, reason} If-Match version
  C->>S: AcervoService.changeState(id, ARQUIVADA, actor, reason)
  S->>R: findById + Guard.ownerOrAdmin
  alt transição inválida
    S-->>C: 422 TRANSICAO_INVALIDA
    C-->>N: 422
  else ok
    S->>S: TaskStateMachine.transition
    S->>R: update tasks.state + insert task_state_log + audit_log TASK_STATE_CHANGED
    S-->>C: TaskCardView
    C-->>N: 200
    EV->>OS: reindexa ws-tasks
    EV->>RD: DEL profile:counters:{userId}
  end

  U->>N: sub-aba Tarefas salvas → "Remover dos salvos"
  N->>C: DELETE /api/me/saved/TASK/{taskId}
  C->>S: SavedItemService.remove(userId, TASK, taskId)
  S->>R: delete saved_items + tasks.savesCount - 1
  S->>RD: decrement counters
  S-->>C: 204
  C-->>N: 204
```

## 4. Máquina de estados

Entidade central: **`TaskItem.state`** (`TaskState`), operado pelas ações rápidas do Acervo Digital (CA03) via `TaskStateMachine`; a máquina completa com origem no criador está no RF4 §4 e a visão do inventário no RF41. `SavedItem` não tem estados (existe/não existe; `favorite` é um marcador).

```mermaid
stateDiagram-v2
  direction LR
  state "RASCUNHO" as RAS
  state "DISPONIVEL" as DIS
  state "EM_USO" as USO
  state "BLOQUEADA" as BLO
  state "CONCLUIDA" as CON
  state "ARQUIVADA" as ARQ
  state "MODELO_PUBLICO" as MOD
  state "OFERECIDA" as OFE

  [*] --> RAS : criador (RF4)
  [*] --> DIS : criador (RF4) · Levar ao meu acervo (RF7/RF23) · duplicar (ação rápida)
  RAS --> DIS : ação rápida "publicar no Acervo" [obrigatórios completos]
  DIS --> USO : automático ao entrar em projeto ativo (RF5) — nunca à mão
  USO --> DIS : saiu de todos os projetos ativos
  DIS --> BLO : ação rápida "bloquear" com blockReason
  USO --> BLO : predecessora pendente (RF5.CA08)
  BLO --> DIS : "desbloquear"
  BLO --> USO : "desbloquear" [ainda em projeto ativo]
  DIS --> CON : "concluir"
  USO --> CON : "concluir" (RF8.CA05)
  CON --> ARQ : "arquivar"
  DIS --> ARQ : "arquivar"
  RAS --> ARQ : "descartar"
  ARQ --> DIS : "reabrir" com justificativa (RF12.CA05)
  DIS --> MOD : chancela APROVADA / publicação como modelo (RF39) — nunca à mão
  MOD --> OFE : Oferecer no Balcão (RF40)
  OFE --> MOD : retirar oferta
  CON --> [*]
  ARQ --> [*]
  note right of DIS
    Toda transição: TaskStateMachine.canTransition
    → TaskStateLog(from, to, actor, reason, correlationId).
    Inválida: 422 TRANSICAO_INVALIDA. Favoritar não muda estado.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/profile · app/(shell)/u/[username] · ?tab="]
    UI["packages/ui: Tabs, TaskCard (compact), ProjectCard (mosaic), Tag (TaskState), PhaseBar, Mosaic, Avatar/Monogram, Counters, Skeleton, EmptyState, Popover (ações rápidas)"]
    SN["SidebarNav › Meu trabalho › Meu perfil · TopBar"]
    BFF["app/bff/me/* · app/bff/users/*"]
    PG --> UI
    PG --> BFF
    SN --> PG
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    MC["MeController (real) · ProfileController · AcervoController · SavedItemController"]
    GEH["GlobalExceptionHandler"]
  end
  subgraph WSAPP["ws-application"]
    PF["profile: ProfileService (Facade) · AccessPolicy"]
    AC["account: AccountService (real)"]
    ACV["acervo: AcervoService · TaskStateMachine"]
    SOC["social: SavedItemService"]
    GD["security.Guard.ownerOrAdmin (real)"]
    PORTS["ports: TaskRepositoryPort · ProjectRepositoryPort · SavedItemRepositoryPort · CounterCachePort · SearchIndexPort · AuditLogPort"]
    EVT["events: TaskStateChanged · SavedItemRemoved (AFTER_COMMIT)"]
    PF --> AC
    PF --> ACV
    PF --> SOC
    PF --> GD
    ACV --> PORTS
    SOC --> PORTS
    ACV --> EVT
  end
  subgraph WSDOM["ws-domain"]
    DOM["identity: User (real) · acervo: TaskItem · TaskStateLog · projects: ProjectScheme · social: SavedItem · enums TaskState/Visibility/TargetType"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: UserEntity (real) · JpaTaskRepository · JpaProjectRepository · JpaSavedItemRepository"]
    RDS["cache-redis: contadores do perfil, cache de cards"]
    OSE["search-opensearch: ws-tasks, ws-projects"]
    S3["storage-s3: thumbnails (leitura)"]
  end

  BFF -->|"REST JSON"| SEC --> MC --> PF
  MC --> GEH
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  OSE -.implementa.-> PORTS
  PF --> DOM
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  OSE --> OSX[("OpenSearch 2.19")]
  S3 --> MINIO[("S3 / MinIO")]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF6.CA01 | `MeController.me/profile`, `AccountService`, `UserView`, `ProfileService.header/tabsFor`, `CounterCachePort`, `Guard.ownerOrAdmin` | `A1`→`F1`→`S1`→`S2`→`S3`/`S4`, `E403`, `E404` | 1–16 | — | `MC`, `PF`, `AC`, `RDS`, `UI` (`Avatar`, `Counters`) | cabeçalho real (`GET /api/me`, `GET /api/users/{id}`); sub-abas planejadas |
| RF6.CA02 | `AcervoService.listMine/stateCounters`, `TaskRepositoryPort`, `SearchIndexPort`, `TaskState` | `A2`→`F2`→`S5`→`F7`, `A3` | 17–27 | — | `ACV`, `OSE`, `UI` (`TaskCard`, `Tag`) | planejado (RF41) |
| RF6.CA03 | `AcervoService.changeState/toggleFavorite/duplicate`, `TaskStateMachine`, `TaskStateLog` | `A4`→`F5`→`S8`→`S9`→`S10`, `E422`, `E409` | 28–38 | todas as transições com aspas (ações rápidas) e as automáticas anotadas | `ACV`, `EVT`, `MY` | planejado |
| RF6.CA04 | `ProjectRepositoryPort.findByOwner`, `ProjectScheme.status/currentPhase/mosaicJson` | `A2`→`F3`→`S6`→`F7` | — | — | `UI` (`ProjectCard`, `PhaseBar`, `Mosaic`) | planejado |
| RF6.CA05 | `SavedItemService.listMine/remove`, `SavedItem`, `CounterCachePort.decrement` | `A2`→`F4`→`S7`, `A5`→`F6`→`S11` | 39–44 | — | `SOC`, `RDS` | planejado (RF18/RF19, origem RF26.CA04) |
| RF6.CA06 | `AccessPolicy.visibilityFilter/canView`, `Visibility` | `S4`, `E403` | 12–15 | — | `PF` | planejado (RF16, RF7) |

## 7. Front implementado (onda Social, DEMO)

`/profile` (`components/social/ProfileView.tsx`) funcional sobre o repositório DEMO: cabeçalho com contadores reais (CA01), **Acervo Digital** em grade/lista de `TaskSchemeCard` com sub-filtros por `TaskState` e contadores (CA02, filtros locais), inclusive as tarefas aceitas por delegação ("delegada por"), **Projetos** (`ProjectCard`, CA04), **Projetos salvos** / **Tarefas salvas** com "indisponível" + "Remover dos salvos" (CA05), **Decisões** com atalho ao DECIA, e os painéis "Delegadas a mim" e notificações da rede. Remixes feitos em perfis de terceiros entram aqui (RASCUNHO, PRIVADA, crédito ao original). Captura `40-perfil-proprio.png`.
