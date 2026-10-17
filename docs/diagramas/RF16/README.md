# RF16 — Visualizar perfil de um usuário comum que é empregado dentro de uma empresa
**HU:** HU16 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (card renomeado em 2026-10-02; origem `_anterior/RF19` = Sprint 4; o card "SPRINT 3" cita "RF16 Perguntas em pontos críticos", escopo antigo — `RENUMERACAO.md`) · **Equivalente FAI:** RF17 Perfil de outros usuários (Lookbook de terceiros, `LookbookService` com `!self`) · **Aba/rota:** perfil de terceiros `/u/[username]` (Matriz B de ABAS_POR_PERFIL §3, colunas "terceiros"); API `GET /api/users/{username}` (real como `GET /api/users/{id}` → `UserView`), `GET /api/users/{username}/tabs`, `GET /api/users/{username}/tabs/{tab}`, `POST|DELETE /api/follows` · **real (em curso, Onda 1):** `GET /api/people/by-username/{username}` (cabeçalho público), `GET /api/people/{id}/tasks?limit` (tarefas que o viewer vê) e `GET /api/people?q&limit` (busca na própria empresa) em `PeopleController`; o front `/u/[username]` ainda migra da fixture para essa API
**Critérios de aceite cobertos:** RF16.CA01 … RF16.CA06 — corpo do card vazio: CAs derivados do título + HU16 + `_anterior/RF19` CA02 (perfil de terceiros) e Matriz B (colunas "terceiros"); todos marcados "(CA a confirmar)". Real (Bloco 3): `MeController.profile` (`GET /api/users/{id}`, `Guard.ownerOrAdmin` para campos privados), `AccountService.profile`, `UserView`, `User.hypeVisibility`; o resto **(planejado)**. Atualização 17/10/2026 **(real, em curso, Onda 1, P19)**: `PeopleService` (`PublicProfileView`, `byUsername`, `visibleById`, `search`), `PeopleController`, `ResourceAuthorizer.requireProfileVisible`, `TaskService.listOf` e `AccessPolicy.sigiloso` (D-139).

> **HU16** — COMO usuário dentro do sistema Work Station POSSO visualizar o perfil de um usuário que trabalha dentro uma organização PARA realizar alguma funcionalidade.

O perfil de terceiros é o mesmo `/u/[username]` do RF6, mas com `viewer != owner`: só as sub-abas **1–5** (Acervo Digital, Projetos, Planos, Decisões, Perfil deliberativo público), itens filtrados por `AccessPolicy.visibilityFilter`, Hype conforme `User.hypeVisibility` e ações sociais inline (RF18/RF19) + "Levar ao meu acervo" (RF7). Contas institucionais (EMPRESA/CHEFE) recebem a etiqueta e o atalho para a página da empresa (RF15) ou do departamento (RF14).

**Atualização 17/10/2026 — pessoas reais (em curso, Onda 1)** (Onda 1 do `docs/auditoria/2026-10-17/PLANO_ONDAS.md`; achado **P19** de `PROBLEMAS.md`). Backend **(real)**: `ws-application/.../people/PeopleService.java` — `byUsername` normaliza com `Usernames.normalize`, busca `UserRepositoryPort.findByUsername` e chama `ResourceAuthorizer.requireProfileVisible`, que responde **`404 NAO_ENCONTRADO` uniforme** ("Perfil não encontrado(a)") para conta inexistente ou não `ACTIVE` (pendente, suspensa, em exclusão, anonimizada); devolve `PublicProfileView {id, username, name, fullName, profileType, jobTitle, bio, avatarUrl, coverUrl, verified, companyId, departmentId, self}`, sem e-mail nem telefone. `visibleById` aplica a mesma recusa nas rotas aninhadas e `TaskService.listOf(actor, ownerId, limit)` filtra item a item por `AccessPolicy.visible` (SIGILOSO só para dono e colaboradores explícitos, nem ADMIN — `AccessPolicy.sigiloso`, D-139). `search` (`PersonView`) fica na mesma empresa, só contas `ACTIVE`, exclui a própria pessoa, `MIN_QUERY = 2`, `MAX_RESULTS = 20` (`UserRepositoryPort.searchInCompany` → `UserJpaRepository.searchInCompany`). Web **(real)**: `ws-web/.../people/PeopleController.java` com `@AuthorizedBy("requireProfileVisible")` nas rotas por pessoa. Teste: `PeopleServiceTest` (`buscaSoNaPropriaEmpresaSemEuMesmoESoAtivas`, `semEmpresaNaoHaBusca`, `perfilPublicoNaoExpoeContatoE404UniformeParaNaoAtivos`). Front `/profile` e `/u/[username]` sobre essa API: **(em curso, Onda 1)**; até lá a tela segue na fixture da §7, já com contadores e composição de projeto filtrados pela ACL (`lib/social/rules.ts`, `lib/social/view-model.ts`, commit `b602d34`). Sub-abas por API (`/tabs`), Hype, filtros por URL e etiqueta institucional servidos pela API seguem **(planejado)**.

## Critérios de aceite derivados da HU16 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF16.CA01** (CA a confirmar) | Dado um usuário autenticado, quando abre `/u/{username}` de um EMPREGADO, então vê o cabeçalho público: avatar, nome, cargo (`jobTitle`), empresa, departamento (sigla, cor, monograma), contadores (tarefas, projetos, decisões, seguidores) e o botão Seguir; `username` inexistente → `404 USUARIO_NAO_ENCONTRADO`; conta `SUSPENDED`/`DELETION_SCHEDULED`/`ANONYMIZED` → `404` (não enumera contas); `email`/`phone` nunca saem (`UserView` público). **Real (em curso, Onda 1):** `GET /api/people/by-username/{username}` → `PeopleService.byUsername` → `PublicProfileView` (sem contato); o código real da recusa é `404 NAO_ENCONTRADO`, igual para inexistente e para qualquer conta não `ACTIVE` (`ResourceAuthorizer.requireProfileVisible`). Contadores servidos pela API: (planejado). |
| **RF16.CA02** (CA a confirmar) | Dado o perfil de terceiro, quando a API devolve a lista de sub-abas, então só vêm as sub-abas **1–5** (Acervo Digital · Projetos · Planos · Decisões · Perfil deliberativo público); as 6–15 (salvos, pontos, Tarefa do Dia, HSE, configurações…) são omitidas e uma chamada direta a `/tabs/{6..15}` responde `403 ACESSO_NEGADO` (sem bypass para ADMIN nas sub-abas 9, 13, 14, 15 — dados de desempenho nominal, RF45.CA10). |
| **RF16.CA03** (CA a confirmar) | Dado uma sub-aba 1–4, quando listo os itens, então cada `TaskItem`, `ProjectScheme`, `AnnualPlan`/`Grouping` e `FinalDecision` passa pelo `visibilityFilter`: `PUBLICA` sempre; `EMPRESA` se `viewer.companyId == owner.companyId`; `DEPARTAMENTO` se o viewer tem `DepartmentMembership` vigente no departamento do item; `PRIVADA` nunca; `RASCUNHO` nunca. Contadores do cabeçalho contam só o que o viewer pode ver. **Real (17/10/2026):** `GET /api/people/{id}/tasks` → `TaskService.listOf` filtra por `AccessPolicy.visible` (nome real do `visibilityFilter`); SIGILOSO equivale a PRIVADA — só dono e colaboradores explícitos, sem acesso implícito do ADMIN (`AccessPolicy.sigiloso`, D-139, `AccessPolicyMatrixTest`); no front, contadores e composição de projeto já não contam nem titulam tarefas ocultas (`b602d34`). |
| **RF16.CA04** (CA a confirmar) | Dado o cabeçalho, quando `owner.hypeVisibility` é `PUBLICO` então o Hype Score (`ProfileHypeScore`) aparece para todos; `EMPRESA` só para a mesma empresa; `SO_EU` nunca — a API **não devolve** o campo (nem para CHEFE nem para ADMIN). A sub-aba 5 mostra só `DeliberativeProfile.publicIndicatorsJson` e `badgesJson` escolhidos pelo dono. |
| **RF16.CA05** (CA a confirmar) | Dado uma sub-aba aberta, quando aplico filtros e paginação (`?tab=&fase=&categoria=&page=&size=20`), então a URL reflete o estado e cada card traz as ações inline do RF18/RF19 (curtir, comentar, salvar, compartilhar, remixar, atribuir) e, no Acervo, "Levar ao meu acervo" (RF7/RF41.CA08) — todas respeitando a visibilidade do item. |
| **RF16.CA06** (CA a confirmar) | Dado que o `username` pertence a uma conta `EMPRESA` ou `CHEFE_DEPARTAMENTO`, quando abro o perfil, então o cabeçalho mostra a etiqueta institucional ("Chefe de {sigla}" com monograma, ou logo da empresa) e o atalho para a página do departamento (RF14) ou da empresa (RF15); textos em pt-BR/en/es e layout responsivo. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class MeController {
    <<controller>>
    +profile(CurrentUser, UUID id) UserView
  }
  class PeopleController {
    <<controller>>
    +search(CurrentUser, q, limit) List~PersonView~
    +byUsername(CurrentUser, username) PublicProfileView
    +tasksOf(CurrentUser, UUID id, limit) List~TaskView~
  }
  class PeopleService {
    <<service>>
    +int MAX_RESULTS$
    +int MIN_QUERY$
    +search(CurrentUser, query, limit) List~PersonView~
    +byUsername(CurrentUser, username) PublicProfileView
    +visibleById(CurrentUser, UUID id) User
  }
  class PublicProfileView {
    <<value>>
    +UUID id
    +String username
    +String name
    +String profileType
    +String jobTitle
    +String bio
    +String avatarUrl
    +boolean verified
    +UUID companyId
    +UUID departmentId
    +boolean self
  }
  class PersonView {
    <<value>>
    +UUID id
    +String username
    +String name
    +String jobTitle
    +String avatarUrl
    +UUID departmentId
  }
  class ResourceAuthorizer {
    <<service>>
    +viewer(CurrentUser) Viewer
    +requireProfileVisible(CurrentUser, User) Viewer
  }
  class TaskService {
    <<service>>
    +listOf(CurrentUser, ownerId, limit) List~TaskView~
  }
  class PublicProfileController {
    <<controller>>
    +header(username, viewer) ProfileHeaderView
    +tabs(username, viewer) List~TabKey~
    +tab(username, tab, filters, viewer) Page
  }
  class AccountService {
    <<service>>
    +profile(CurrentUser, userId) UserView
  }
  class ProfileService {
    <<facade>>
    +header(username, viewer) ProfileHeaderView
    +tabsFor(owner, viewer) List~TabKey~
    +tab(owner, viewer, tab, filters) Page
    -hypeFor(owner, viewer) Optional~Integer~
  }
  class AccessPolicy {
    <<service>>
    +visibilityFilter(viewer, owner) Set~Visibility~
    +canSeeHype(viewer, owner) boolean
    +isSelf(viewer, owner) boolean
    +visible(Viewer, ScopedResource)$ boolean
    +decide(Viewer, ScopedResource, ResourceAction)$ AccessDecision
    -sigiloso(ScopedResource)$ boolean
  }
  class Guard {
    <<service>>
    +ownerOrAdmin(CurrentUser, ownerId) void
  }
  class UserRepositoryPort {
    <<port>>
    +findByUsername(username) Optional
    +findById(UUID) Optional
    +searchInCompany(companyId, query, limit) List~User~
  }
  class TaskRepositoryPort {
    <<port>>
    +findByOwnerVisible(ownerId, visibilities, filters) Page
    +countVisible(ownerId, visibilities) long
  }
  class ProjectRepositoryPort {
    <<port>>
    +findByOwnerVisible(ownerId, visibilities, filters) Page
  }
  class PlanRepositoryPort {
    <<port>>
    +findByOwnerVisible(ownerId, visibilities) Page
  }
  class DecisionRepositoryPort {
    <<port>>
    +findParticipatedVisible(userId, viewer) Page
  }
  class HypeScorePort {
    <<port>>
    +latest(userId) Optional~ProfileHypeScore~
  }
  class DeliberativeProfilePort {
    <<port>>
    +latestPublic(userId) Optional
  }
  class MembershipRepositoryPort {
    <<port>>
    +findCurrent(userId) Optional
  }
  class CounterCachePort {
    <<port>>
    +profileCounters(userId, viewerScope) Counters
  }

  class User {
    <<entity>>
    +UUID id
    +String username
    +String fullName
    +String displayName
    +String jobTitle
    +String avatarUrl
    +String coverUrl
    +String bio
    +ProfileType profileType
    +AccountStatus status
    +UUID companyId
    +UUID departmentId
    +HypeVisibility hypeVisibility
    +boolean verified
  }
  class UserView {
    <<value>>
    +UUID id
    +String username
    +String fullName
    +String displayName
    +ProfileType profileType
    +String jobTitle
    +String avatarUrl
  }
  class Department {
    <<entity>>
    +String acronym
    +String color
    +String monogram
    +String slug
    +UUID headUserId
  }
  class Company {
    <<entity>>
    +String legalName
    +String slug
    +String logoUrl
    +UUID ownerUserId
  }
  class DepartmentMembership {
    <<entity>>
    +UUID userId
    +UUID departmentId
    +Instant endedAt
  }
  class TaskItem {
    <<entity>>
    +UUID ownerId
    +TaskState state
    +Visibility visibility
  }
  class ProjectScheme {
    <<entity>>
    +UUID ownerId
    +ProjectStatus status
    +Visibility visibility
  }
  class AnnualPlan {
    <<entity>>
    +UUID ownerId
    +PlanStatus status
    +Visibility visibility
  }
  class FinalDecision {
    <<entity>>
    +UUID sessionId
    +DecisionStatus status
  }
  class ProfileHypeScore {
    <<entity>>
    +UUID userId
    +LocalDate scoreDate
    +int score
    +String bandCode
  }
  class DeliberativeProfile {
    <<entity>>
    +UUID userId
    +JSON publicIndicatorsJson
    +JSON badgesJson
  }
  class Follow {
    <<entity>>
    +UUID followerId
    +FollowTargetType targetType
    +UUID targetId
    +FollowStatus status
  }
  class HypeVisibility {
    <<enum>>
    PUBLICO
    EMPRESA
    SO_EU
  }
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
  class ProfileType {
    <<enum>>
    EMPREGADO
    EMPRESA
    CHEFE_DEPARTAMENTO
  }
  class TabKey {
    <<enum>>
    ACERVO
    PROJETOS
    PLANOS
    DECISOES
    PERFIL_DELIBERATIVO
    PROJETOS_SALVOS
    TAREFAS_SALVAS
    PONTOS
    TAREFA_DO_DIA
    HSE
    HYPE_DETALHE
    RANKING
    INSIGHTS
    CONFIGURACOES
    SESSOES
  }

  MeController --> AccountService
  PeopleController --> PeopleService
  PeopleController --> TaskService : listOf
  PeopleService --> UserRepositoryPort
  PeopleService --> ResourceAuthorizer : requireProfileVisible
  PeopleService ..> PublicProfileView
  PeopleService ..> PersonView
  TaskService --> AccessPolicy : visible item a item
  PublicProfileController --> ProfileService
  ProfileService --> AccountService
  ProfileService --> AccessPolicy
  ProfileService --> Guard
  ProfileService --> UserRepositoryPort
  ProfileService --> TaskRepositoryPort
  ProfileService --> ProjectRepositoryPort
  ProfileService --> PlanRepositoryPort
  ProfileService --> DecisionRepositoryPort
  ProfileService --> HypeScorePort
  ProfileService --> DeliberativeProfilePort
  ProfileService --> MembershipRepositoryPort
  ProfileService --> CounterCachePort
  AccountService ..> UserView
  ProfileService ..> TabKey : 1–5 para terceiros
  User "0..*" --> "0..1" Company
  User "0..*" --> "0..1" Department
  User "1" --> "0..*" DepartmentMembership
  User "1" --> "0..*" TaskItem
  User "1" --> "0..*" ProjectScheme
  User "1" --> "0..*" AnnualPlan
  User "1" --> "0..*" ProfileHypeScore
  User "1" --> "0..1" DeliberativeProfile
  User "1" --> "0..*" Follow : targetType USER
  User --> HypeVisibility
  User --> ProfileType
  TaskItem --> Visibility
  note for UserView "Real (Bloco 3): UserView nunca carrega email nem phone para terceiros. GET /api/users/{id}: Guard.ownerOrAdmin só para os campos privados."
  note for PeopleService "Real, em curso na Onda 1 (P19). Conta inexistente ou não ACTIVE → 404 NAO_ENCONTRADO uniforme. search só na mesma empresa, contas ACTIVE, sem o próprio, MIN_QUERY 2, MAX_RESULTS 20."
  note for AccessPolicy "visible e decide só admitem ADMIN fora de SIGILOSO (D-139, AccessPolicyMatrixTest). visibilityFilter, canSeeHype e isSelf seguem planejados."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Usuário autenticado (viewer)"]
    A1["Abre /u/{username} (busca RF17, menção, card, equipe RF14)"]
    A2["Escolhe uma sub-aba (1–5) e aplica filtros/página"]
    A3["Interage num card: curtir, comentar, salvar, compartilhar, remixar, atribuir · Levar ao meu acervo · Seguir"]
    A4["Clica no atalho institucional (departamento/empresa)"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["GET /api/users/{username} (cabeçalho) + GET /api/users/{username}/tabs"]
    F2["GET /api/users/{username}/tabs/{tab}?fase=&categoria=&page=&size=20 · URL reflete o estado"]
    F3["Cabeçalho: Avatar, Monogram do departamento, Tag institucional, Counters, Hype (se devolvido), Button Seguir · Tabs 1–5 · TaskCard/ProjectCard com Counters e ações inline"]
    F4["Ações inline → RF18/RF19 (/api/interactions/*), RF7 (/api/tasks/{id}/extract), RF14 (/api/follows)"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["PublicProfileController · MeController.profile (real)"]
    E404["404 USUARIO_NAO_ENCONTRADO (inexistente · SUSPENDED · DELETION_SCHEDULED · ANONYMIZED)"]
    E403["403 ACESSO_NEGADO (sub-aba 6–15 de terceiro, inclusive ADMIN nas 9, 13, 14, 15)"]
    W3["PeopleController (real, em curso, Onda 1): GET /api/people/by-username/{username} · GET /api/people/{id}/tasks · GET /api/people?q&limit · @AuthorizedBy requireProfileVisible"]
    E404R["404 NAO_ENCONTRADO uniforme (requireProfileVisible: inexistente ou não ACTIVE)"]
  end
  subgraph APP["ws-application · ProfileService"]
    S1["UserRepositoryPort.findByUsername · status visível?"]
    S2{"viewer == owner?"}
    S3["RF6: 15 sub-abas do dono"]
    S4["tabsFor terceiro: ACERVO · PROJETOS · PLANOS · DECISOES · PERFIL_DELIBERATIVO"]
    S5["header: UserView público (sem email/phone) · Company/Department (sigla, cor, monograma) · contadores só do visível (CounterCachePort por escopo do viewer)"]
    S6["hypeFor: PUBLICO → todos · EMPRESA → mesma empresa · SO_EU → campo omitido (nem CHEFE nem ADMIN)"]
    S7{"profileType EMPRESA ou CHEFE?"}
    S8["Tag institucional + atalho /companies/{slug} ou /departments/{slug}"]
    T1{"tab ∈ 1–5?"}
    T2["AccessPolicy.visibilityFilter(viewer, owner): PUBLICA · +EMPRESA se mesma empresa · +DEPARTAMENTO se membro · nunca PRIVADA nem RASCUNHO"]
    T3["Repositórios por sub-aba: tasks · project_schemes · annual_plans/groupings · final_decisions participadas · DeliberativeProfile.publicIndicatorsJson + badgesJson"]
    Q1["PeopleService.byUsername (real): Usernames.normalize → findByUsername → ResourceAuthorizer.requireProfileVisible → PublicProfileView sem e-mail/telefone, com self"]
    Q2["PeopleService.visibleById → TaskService.listOf(actor, ownerId, limit) (real): AccessPolicy.visible item a item · SIGILOSO só dono e colaborador explícito, nem ADMIN (D-139)"]
    Q3["PeopleService.search (real): mesma empresa, só ACTIVE, sem o próprio, MIN_QUERY 2, MAX_RESULTS 20 → UserRepositoryPort.searchInCompany"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: users, companies, departments, department_memberships, tasks, project_schemes, annual_plans, final_decisions, profile_hype_scores, deliberative_profiles, follows")]
    P2[("Redis: profile:counters:{userId}:{scope} · hype cache")]
    P3[("OpenSearch ws-people (busca por nome/cargo, RF17)")]
  end

  A1 --> P3
  A1 --> F1 --> W1 --> W2 --> S1
  S1 -->|"não visível"| E404
  S1 --> S2
  S2 -->|"sim"| S3
  S2 -->|"não"| S4 --> S5 --> S6 --> S7
  S5 --> P1
  S5 --> P2
  S7 -->|"sim"| S8 --> F3
  S7 -->|"não"| F3
  A2 --> F2 --> W2 --> T1
  T1 -->|"não (6–15)"| E403
  T1 -->|"sim"| T2 --> T3 --> P1
  T3 --> F3
  A3 --> F4
  A4 --> S8
  F1 -.->|"em curso, Onda 1"| W3
  W3 --> Q1
  Q1 -->|"não visível"| E404R
  Q1 --> F3
  W3 --> Q2 --> P1
  Q2 --> F3
  W3 --> Q3 --> P1
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

  U->>N: abre /u/maria.silva (resultado da aba Pessoas)
  N->>C: GET /api/users/maria.silva
  C->>S: ProfileService.header(username, viewer)
  S->>R: users.findByUsername
  alt inexistente ou status SUSPENDED/DELETION_SCHEDULED/ANONYMIZED
    S-->>C: 404 USUARIO_NAO_ENCONTRADO
    C-->>N: 404 (não enumera contas)
  else visível
    S->>S: AccessPolicy.isSelf = false → visibilityFilter(viewer, owner)
    S->>R: company + department (sigla, cor, monograma) + membership vigente
    S->>RD: profile:counters:{userId}:{escopo do viewer} (tarefas, projetos, decisões, seguidores visíveis)
    S->>S: hypeFor(owner, viewer)
    alt hypeVisibility PUBLICO, ou EMPRESA e mesma empresa
      S->>R: profile_hype_scores.latest
      S-->>C: ProfileHeaderView {UserView público, hype, band}
    else SO_EU ou outra empresa
      S-->>C: ProfileHeaderView sem o campo hype (nem para CHEFE/ADMIN)
    end
    C-->>N: 200
    N->>C: GET /api/users/maria.silva/tabs
    C->>S: ProfileService.tabsFor(owner, viewer)
    S-->>C: [ACERVO, PROJETOS, PLANOS, DECISOES, PERFIL_DELIBERATIVO]
    C-->>N: 200
    N-->>U: cabeçalho (Avatar, Monogram, Counters, Seguir) + Tabs 1–5
  end

  U->>N: sub-aba Acervo Digital, categoria PARECER_TECNICO, página 2
  N->>C: GET /api/users/maria.silva/tabs/acervo?categoria=PARECER_TECNICO&page=1&size=20
  C->>S: ProfileService.tab(owner, viewer, ACERVO, filters)
  S->>S: visibilityFilter → {PUBLICA, EMPRESA} (mesma empresa, não membro do departamento)
  S->>R: tasks do owner com visibility no conjunto, state != RASCUNHO
  S-->>C: Page TaskCardView (Counters, ações inline, "Levar ao meu acervo")
  C-->>N: 200 (URL com tab, categoria e page)

  U->>N: tenta a sub-aba Pontos de Maria (URL manual)
  N->>C: GET /api/users/maria.silva/tabs/pontos
  C->>S: ProfileService.tab(owner, viewer, PONTOS)
  S-->>C: 403 ACESSO_NEGADO (sub-aba 6–15 de terceiro)
  C-->>N: 403

  U->>N: abre /u/{username} de um CHEFE_DEPARTAMENTO
  N->>C: GET /api/users/{username}
  C->>S: ProfileService.header
  S->>R: users (profileType CHEFE_DEPARTAMENTO) + departments.headUserId
  S-->>C: ProfileHeaderView {institutionalTag "Chefe de SECID-UTS", link /departments/secid-uts}
  C-->>N: 200 (Tag institucional + atalho RF14)

  Note over U,RD: Real (em curso, Onda 1) — PeopleController + PeopleService
  N->>C: GET /api/people/by-username/Maria.Silva
  C->>S: PeopleService.byUsername(actor, username) com Usernames.normalize
  S->>R: users.findByUsername(maria.silva)
  S->>S: ResourceAuthorizer.requireProfileVisible(actor, alvo)
  alt inexistente ou conta não ACTIVE
    S-->>C: 404 NAO_ENCONTRADO (Perfil não encontrado)
    C-->>N: 404 uniforme (não enumera contas)
  else conta ACTIVE
    S-->>C: PublicProfileView (sem e-mail ou telefone, self = false)
    C-->>N: 200
    N->>C: GET /api/people/{id}/tasks?limit=50
    C->>S: PeopleService.visibleById e TaskService.listOf(actor, ownerId, limit)
    S->>R: tasks.findByOwner(ownerId, limit)
    S->>S: AccessPolicy.visible item a item (SIGILOSO sem vínculo explícito fica fora, nem ADMIN, D-139)
    S-->>C: List TaskView só do visível
    C-->>N: 200
  end
```

## 4. Máquina de estados

Entidade central: este RF só lê. Usa **`User.status`** (`AccountStatus`, enum real) para decidir se o perfil existe para terceiros (CA01) e **`User.hypeVisibility`** (`HypeVisibility`) para a exposição do Hype (CA04); ambos mudam no RF3/RF28, não aqui.

```mermaid
stateDiagram-v2
  direction LR
  state "Perfil visível a terceiros" as VIS {
    state "PENDING_EMAIL_VERIFICATION" as PEV
    state "PENDING_VALIDATION" as PV
    state "ACTIVE" as ACT
    [*] --> PEV : cadastro (RF1)
    PEV --> ACT : confirmação (EMPREGADO)
    PEV --> PV : confirmação (EMPRESA/CHEFE)
    PV --> ACT : aprovação (RF28)
  }
  state "Perfil oculto (404 USUARIO_NAO_ENCONTRADO)" as OCU {
    state "SUSPENDED" as SUS
    state "DELETION_SCHEDULED" as DEL
    state "ANONYMIZED" as ANO
    SUS --> [*]
    DEL --> ANO : AccountAnonymizationJob (D-18)
    ANO --> [*]
  }
  note right of ACT
    Real (em curso, Onda 1): requireProfileVisible só mostra ACTIVE.
    PENDING_* também respondem 404 NAO_ENCONTRADO uniforme.
  end note
  ACT --> SUS : ADMIN suspende
  SUS --> ACT : ADMIN reativa
  ACT --> DEL : POST /api/me/deletion (RF3)
  DEL --> ACT : DELETE /api/me/deletion

  state "Hype no cabeçalho (User.hypeVisibility)" as HYPE {
    state "SO_EU (padrão) — campo omitido para todos" as SOEU
    state "EMPRESA — só mesma empresa" as EMP
    state "PUBLICO — todos" as PUB
    [*] --> SOEU
    SOEU --> EMP : PATCH /api/me {hypeVisibility EMPRESA} (RF3.CA04)
    EMP --> PUB : PATCH /api/me {hypeVisibility PUBLICO}
    PUB --> SOEU : PATCH /api/me {hypeVisibility SO_EU}
    EMP --> SOEU : PATCH /api/me
    PUB --> EMP : PATCH /api/me
  }
  note right of SOEU
    Nem CHEFE nem ADMIN recebem o campo (CA04, RF45.CA10).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/u/[username] · ?tab=acervo|projetos|planos|decisoes|deliberativo"]
    UI["packages/ui: Avatar/Monogram, Tag (institucional, estado), Counters, Button (Seguir), Tabs, TaskCard (compact), ProjectCard (mosaic), Stamp (decisões), Skeleton, EmptyState"]
    SN["TopBar (busca) · SidebarNav › Descobrir › Buscar"]
    BFF["app/bff/users/* · app/bff/interactions/* · app/bff/follows/*"]
    PG --> UI
    PG --> BFF
    SN --> PG
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    PC["PublicProfileController · MeController.profile (real)"]
    PPL["PeopleController (real, em curso, Onda 1): GET /api/people · /api/people/by-username/{username} · /api/people/{id}/tasks · @AuthorizedBy requireProfileVisible"]
    GEH["GlobalExceptionHandler (403, 404)"]
  end
  subgraph WSAPP["ws-application"]
    PF["profile: ProfileService (Facade) · AccessPolicy.visibilityFilter/canSeeHype"]
    AC["account: AccountService.profile (real) · UserView (real)"]
    GD["security.Guard.ownerOrAdmin (real)"]
    PORTS["ports: UserRepositoryPort (real, + searchInCompany) · TaskRepositoryPort · ProjectRepositoryPort · PlanRepositoryPort · DecisionRepositoryPort · HypeScorePort · DeliberativeProfilePort · MembershipRepositoryPort · CounterCachePort"]
    SOC["social: InteractionService (RF18/RF19) · FollowService (RF14) · TaskExtractionService (RF7)"]
    PS["people: PeopleService (PersonView, PublicProfileView) · security.ResourceAuthorizer.requireProfileVisible · acervo.TaskService.listOf (real, em curso, Onda 1)"]
    PS --> PORTS
    PF --> AC
    PF --> GD
    PF --> PORTS
    PG -.ações inline.-> SOC
  end
  subgraph WSDOM["ws-domain"]
    DOM["security: AccessPolicy.visible/decide/sigiloso (real, D-139) · identity: User (real) · HypeVisibility (real) · AccountStatus (real) · Company · Department · DepartmentMembership · acervo: TaskItem · projects: ProjectScheme · planning: AnnualPlan · decia: FinalDecision · gamification: ProfileHypeScore · DeliberativeProfile · social: Follow"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: UserEntity (real) · UserJpaRepository.searchInCompany (real) · Jpa*Repository"]
    RDS["cache-redis: profile:counters:{userId}:{scope} · hype cache"]
    OSE["search-opensearch: ws-people"]
  end

  BFF -->|"REST JSON"| SEC --> PC --> PF
  PC --> GEH
  SEC --> PPL --> PS
  PPL --> GEH
  PS --> DOM
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  OSE -.implementa.-> PORTS
  PF --> DOM
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  OSE --> OSX[("OpenSearch 2.19")]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF16.CA01 | `PublicProfileController.header`, `ProfileService.header`, `UserView` (sem `email`/`phone`), `User.status`, `UserRepositoryPort.findByUsername`, `CounterCachePort` | `A1`→`F1`→`S1`→`S5`→`F3`, `E404` | 1–8, 16–19 | `VIS` × `OCU` | `PG`, `UI` (`Avatar`, `Counters`), `AC`, `PPL`, `PS` | parcial: `GET /api/users/{id}` + `UserView` reais; **(real, em curso, Onda 1)** `PeopleController` `GET /api/people/by-username/{username}` → `PeopleService.byUsername` → `PublicProfileView` (classe `PeopleService`/`PublicProfileView`, passo `W3`→`Q1`→`E404R`, mensagens 38–45, nota de `ACT`), `404 NAO_ENCONTRADO` uniforme — `PeopleServiceTest.perfilPublicoNaoExpoeContatoE404UniformeParaNaoAtivos`; contadores pela API planejados (front já filtra pela ACL, `b602d34`) |
| RF16.CA02 | `ProfileService.tabsFor`, `TabKey`, `AccessPolicy.isSelf` | `S2`→`S4`, `T1`→`E403` | 17–20, 28–31 | — | `PF`, `GEH` | planejado |
| RF16.CA03 | `AccessPolicy.visibilityFilter`, `TaskRepositoryPort.findByOwnerVisible/countVisible`, `ProjectRepositoryPort`, `PlanRepositoryPort`, `DecisionRepositoryPort`, `Visibility` | `A2`→`F2`→`T2`→`T3` | 21–27 | — | `PF`, `MY`, `PS`, `DOM` | parcial **(real, em curso, Onda 1)**: `GET /api/people/{id}/tasks` → `TaskService.listOf` + `AccessPolicy.visible/sigiloso` (passo `Q2`, mensagens 46–51; D-139, `AccessPolicyMatrixTest`); front sem vazar título/contagem de oculto em projeto (`lib/social/view-model.ts`, `b602d34`); projetos, planos e decisões pela API planejados |
| RF16.CA04 | `ProfileService.hypeFor`, `AccessPolicy.canSeeHype`, `User.hypeVisibility`, `HypeScorePort`, `DeliberativeProfilePort` (`publicIndicatorsJson`, `badgesJson`) | `S6` | 9–15 | bloco `HYPE` | `PF`, `RDS` | `hypeVisibility` real (Bloco 3); exposição planejada (RF45.CA06/CA10) |
| RF16.CA05 | URL `?tab=&fase=&categoria=&page=&size=`, `InteractionService` (RF18/RF19), `TaskExtractionService` (RF7), `FollowService` (RF14) | `A2`→`F2`, `A3`→`F4` | 21–27 | — | `UI` (`TaskCard`, `Counters`), `SOC` | planejado |
| RF16.CA06 | `ProfileService.header` (`institutionalTag`), `User.profileType`, `Department.headUserId`, `Company.ownerUserId` | `S7`→`S8`, `A4` | 32–36 | — | `UI` (`Tag`, `Monogram`), `PG` | planejado (`ProfileType` real; fonte real da etiqueta em `PublicProfileView.profileType/companyId/departmentId`, em curso, Onda 1) |

## 7. Front implementado (onda Social, DEMO)

Rota `/u/[username]` funcional sobre o repositório **DEMO** em memória (`lib/social/repository.ts`, sem API até os Blocos 4–5): `app/(shell)/u/[username]/page.tsx` (servidor: username desconhecido → `notFound()` = 404, CA01) → `components/social/ProfileView.tsx`. Regras puras em `lib/social/rules.ts` (`canView`, `profileTasks`, `profileProjects`, `canSeeHype`, `toggleFollow`) e view models em `lib/social/view-model.ts` (`toProfileHeaderViewModel`, `profileTabsFor`).

| CA | O que a tela faz |
|---|---|
| RF16.CA01 | Cabeçalho com avatar, nome, cargo, departamento (monograma, link RF14), empresa (link RF15), contadores reais (tarefas e projetos que **o viewer** vê, decisões, seguidores ATIVO) e **Seguir** (`Follow` ATIVO ⇄ REMOVIDO no mesmo registro); 404 para username inexistente. |
| RF16.CA02 | Só as sub-abas 1–5 (`profileTabsFor`); dono EMPRESA sem a 5; independe do perfil de quem olha. |
| RF16.CA03 | Acervo e Projetos passam por `canView` (PUBLICA · EMPRESA mesma empresa · DEPARTAMENTO lotação · nunca PRIVADA/RASCUNHO; RESTRITO/SIGILOSO só o departamento dono — D-93). Revisto em 17/10/2026 (`b602d34`, D-139): SIGILOSO equivale a PRIVADA — só vínculo explícito; chefia, colega e ADMIN sem vínculo não leem; o card de projeto não mostra título nem total de tarefa oculta. |
| RF16.CA04 | DECIA Points nunca para terceiros ("—" com texto oculto para leitor de tela); Hype conforme `hypeVisibility`. |
| RF16.CA05 | Cada card traz a barra social inline (curtir, reagir, comentar, salvar, compartilhar, remixar, delegar, retornar) com motivo quando indisponível. Filtros por estado e grade/lista locais (URL fica para a API). |
| RF16.CA06 | Chefe: etiqueta "Chefe de {sigla}" + atalho `/departments/[slug]`; EMPRESA: etiqueta institucional + atalho `/companies/[slug]`, sem DP/Hype. |

```mermaid
flowchart LR
  P["/u/username (servidor)"] -->|"desconhecido"| N404["404"]
  P --> V["ProfileView"]
  V --> H["SocialProfileHeader"]
  V --> T["Sub-abas 1 a 5"]
  T --> C["TaskSchemeCard + SocialBar"]
  C --> R["lib/social/rules (canView)"]
  R --> D["Repositorio DEMO em memoria"]
```

Testes: `lib/social/rules.test.ts`, `lib/social/view-model.test.ts`, `components/social/social.test.tsx`, `e2e/social.spec.ts`; capturas `41-perfil-terceiros.png`, `47-remixar.png`, `49-perfil-mobile.png`.
