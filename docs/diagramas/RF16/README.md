# RF16 — Visualizar perfil de um usuário comum que é empregado dentro de uma empresa
**HU:** HU16 · **Sprint (board Work Station):** a confirmar (card renomeado em 2026-10-02; origem `_anterior/RF19` = Sprint 4) · **Equivalente FAI:** RF17 Perfil de outros usuários (Lookbook de terceiros, `LookbookService` com `!self`) · **Aba/rota:** perfil de terceiros em `/u/[username]` (API `GET /api/users/{username}` e `GET /api/users/{username}/tabs/{tab}`)
**Critérios de aceite cobertos:** RF16.CA01 … RF16.CA06 — corpo do card vazio: CAs derivados do título + HU16 + `_anterior/RF19` CA02 (perfil de terceiros) e `docs/produto/ABAS_POR_PERFIL.md` Matriz B (colunas "terceiros"); todos marcados "(CA a confirmar)"

> **HU16** — COMO usuário dentro do sistema Work Station POSSO visualizar o perfil de um usuário que trabalha dentro de uma organização PARA realizar alguma funcionalidade.

O RF16 é a **visão de terceiros** do perfil pessoal (RF19 anterior / RF26 atual): quem abre `/u/[username]` de um **EMPREGADO** vê o cabeçalho público (avatar, nome, cargo, empresa, departamento, contadores) e apenas as **sub-abas 1–5** (Acervo de Tarefas · Meus Projetos · Programas & Agrupamentos · Decisões · Perfil deliberativo resumo); as sub-abas 6–15 são **omitidas** na lista e respondem `403 ACESSO_NEGADO` em chamada direta. Cada item listado passa pelo filtro de **visibilidade** (`PUBLICA` sempre · `EMPRESA` se mesma empresa · `DEPARTAMENTO` se membro do departamento · `PRIVADA` nunca). O **Hype Score** aparece no cabeçalho só conforme `User.hypeVisibility` (RF45.CA06). O RF16 é **somente leitura**; a única escrita é o botão **Seguir** (`Follow`, RF27.CA06) e as ações sociais inline dos cards (RF18/RF19), que pertencem aos seus RFs. Se o `username` for de uma conta EMPRESA ou CHEFE, o cabeçalho oferece o atalho para a página institucional (RF15 / RF14).

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF16.CA01** (CA a confirmar) | Dado um usuário autenticado, quando abre `/u/{username}` de um EMPREGADO, então vê o cabeçalho público: avatar, nome, cargo (`jobTitle`), empresa, departamento (sigla, cor, monograma), contadores (tarefas, projetos, decisões, seguidores) e o botão Seguir; `username` inexistente → `404 USUARIO_NAO_ENCONTRADO`; conta `SUSPENDED`/`DELETION_SCHEDULED` → `404` (não enumera contas). |
| **RF16.CA02** (CA a confirmar) | Dado o perfil de terceiro, quando a API devolve a lista de sub-abas, então só vêm as sub-abas **1–5**; as 6–15 são omitidas e uma chamada direta a `/tabs/{6..15}` responde `403 ACESSO_NEGADO` (sem bypass para ADMIN nas sub-abas 9, 13, 14, 15). |
| **RF16.CA03** (CA a confirmar) | Dado uma sub-aba 1–4, quando listo os itens, então cada `TaskItem`, `ProjectScheme`, `Grouping` e `FinalDecision` passa pelo `visibilityFilter`: `PUBLICA` sempre; `EMPRESA` se `viewer.companyId == owner.companyId`; `DEPARTAMENTO` se o viewer tem `DepartmentMembership` vigente no departamento do item; `PRIVADA` nunca. Contadores do cabeçalho contam só o que o viewer pode ver. |
| **RF16.CA04** (CA a confirmar) | Dado o cabeçalho, quando `owner.hypeVisibility` é `PUBLICO` então o Hype Score aparece para todos; `EMPRESA` só para a mesma empresa; `SO_EU` nunca — a API **não devolve** o campo (nem para CHEFE nem para ADMIN). A sub-aba 5 mostra só `DeliberativeProfile.publicIndicatorsJson` e `badgesJson` escolhidos pelo dono. |
| **RF16.CA05** (CA a confirmar) | Dado uma sub-aba aberta, quando aplico filtros e paginação (`?tab=&fase=&categoria=&page=&size=20`), então a URL reflete o estado e cada card traz as ações inline do RF18/RF19 (curtir, comentar, salvar, compartilhar, remixar) e, no Acervo, "Levar ao meu acervo" (RF7/RF41.CA08) — todas respeitando a visibilidade do item. |
| **RF16.CA06** (CA a confirmar) | Dado que o `username` pertence a uma conta `EMPRESA` ou `CHEFE_DEPARTAMENTO`, quando abro o perfil, então o cabeçalho mostra a etiqueta institucional ("Chefe de {sigla}" com monograma, ou logo da empresa) e o atalho para a página do departamento (RF14) ou da empresa (RF15); textos em pt-BR/en/es e layout responsivo. |

| # | Sub-aba visível a terceiros | Entidade lida | Filtro |
|---|---|---|---|
| 1 | Acervo de Tarefas | `TaskItem` | `visibility` ∈ visibilityFilter · `state` ≠ RASCUNHO |
| 2 | Meus Projetos | `ProjectScheme` | `visibility` ∈ visibilityFilter · `status` ≠ RASCUNHO |
| 3 | Programas & Agrupamentos | `Grouping`, `GroupingItem` | itens filtrados individualmente |
| 4 | Decisões | `FinalDecision`, `DecisionTraceNode` | `canView` da `DeciaSession` (accessMode) |
| 5 | Perfil deliberativo (resumo) | `DeliberativeProfile.publicIndicatorsJson`, `badgesJson` | só o que o dono publicou |

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
    +status: AccountStatus
    +companyId: UUID
    +departmentId: UUID
    +avatarUrl: String
    +coverUrl: String
    +bio: String
    +verified: boolean
    +hypeVisibility: HypeVisibility
    .. +18 campos ..
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
    +headUserId: UUID
  }
  class DepartmentMembership {
    <<entity>>
    +userId: UUID
    +departmentId: UUID
    +roleInDept: DeptRole
    +endedAt: Instant
  }
}

namespace ws_domain_portfolio {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +category: TaskCategory
    +state: TaskState
    +visibility: Visibility
    +thumbnailUrl: String
    +likesCount: long
    .. +45 campos ..
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +visibility: Visibility
    +coverUrl: String
    .. +30 campos ..
  }
  class Grouping {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +type: GroupingType
    +label: String
  }
  class FinalDecision {
    <<entity>>
    +id: UUID
    +sessionId: UUID
    +decisionText: String
    +status: DecisionStatus
    +stampJson: JSON
  }
  class DeciaSession {
    <<entity>>
    +id: UUID
    +accessMode: SessionAccess
    +companyId: UUID
    +departmentId: UUID
  }
  class DeliberativeProfile {
    <<entity>>
    +userId: UUID
    +periodKey: String
    +publicIndicatorsJson: JSON
    +badgesJson: JSON
  }
  class ProfileHypeScore {
    <<entity>>
    +userId: UUID
    +scoreDate: LocalDate
    +score: int
    +bandCode: String
  }
  class Follow {
    <<entity>>
    +id: UUID
    +followerId: UUID
    +targetType: FollowTargetType
    +targetId: UUID
    +status: FollowStatus
  }
}

namespace ws_domain_enums {
  class ProfileType {
    <<enum>>
    EMPREGADO
    EMPRESA
    CHEFE_DEPARTAMENTO
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
  class AccountStatus {
    <<enum>>
    PENDING_EMAIL_VERIFICATION
    PENDING_VALIDATION
    ACTIVE
    SUSPENDED
    DELETION_SCHEDULED
  }
}

namespace ws_application {
  class ProfileService {
    <<service>>
    +loadHeader(viewerId, username) ProfileHeader
    +listTabs(viewerId, ownerId) List~ProfileTab~ terceiro recebe 1 a 5
    +loadTab(viewerId, ownerId, tab, filters, page) Page
    +visibilityFilter(viewer, owner) Visibility[]
    +canSeeHype(viewer, owner) boolean
    +institutionalShortcut(owner) Link RF14 RF15
  }
  class AccessPolicy {
    <<service>>
    +canView(viewer, item) boolean
    +requireOwnerStrict(viewer, owner) 403 sem bypass ADMIN
    +isSameCompany(viewer, owner) boolean
    +isDeptMember(viewer, departmentId) boolean
  }
  class SocialService {
    <<service>>
    +counters(ownerId, viewer) Counters só itens visíveis
    +follow(followerId, USER, ownerId) Follow
  }
  class ReputationService {
    <<service>>
    +publicDeliberativeSummary(ownerId) PublicIndicators
    +hypeScoreIfAllowed(viewer, owner) ProfileHypeScore
  }
  class CachePort {
    <<port>>
    +getCounters(ownerId, viewerLevel) Counters
    +putCounters(ownerId, viewerLevel, counters, ttl)
  }
}

namespace ws_web {
  class ProfileController {
    <<controller>>
    +GET_api_users_username(username)
    +GET_api_users_username_tabs_tab(username, tab, query)
    +GET_api_users_username_hype(username)
  }
  class FollowController {
    <<controller>>
    +POST_api_follows(targetType, targetId)
  }
}

namespace ws_infrastructure {
  class RedisCacheAdapter {
    <<adapter>>
  }
  class MySqlProfileReadAdapter {
    <<adapter>>
  }
  class CassandraTraceReadAdapter {
    <<adapter>>
  }
}

User "1" --> "0..1" Company : companyId
User "1" --> "0..1" Department : departmentId
User "1" --> "*" DepartmentMembership : lotações
User --> ProfileType
User --> HypeVisibility
User --> AccountStatus
TaskItem "*" --> "1" User : ownerId
ProjectScheme "*" --> "1" User : ownerId
Grouping "*" --> "1" User : ownerId
FinalDecision "*" --> "1" DeciaSession : sessionId
DeliberativeProfile "*" --> "1" User : userId
ProfileHypeScore "*" --> "1" User : userId
Follow "*" --> "1" User : followerId
Follow ..> User : targetId quando USER
TaskItem --> Visibility
ProjectScheme --> Visibility

ProfileController ..> ProfileService
FollowController ..> SocialService
ProfileService ..> AccessPolicy
ProfileService ..> SocialService
ProfileService ..> ReputationService
ProfileService ..> CachePort
AccessPolicy ..> DepartmentMembership : isDeptMember
RedisCacheAdapter ..|> CachePort
MySqlProfileReadAdapter ..> ProfileService : users, tasks, project_schemes, groupings, final_decisions
CassandraTraceReadAdapter ..> ProfileService : trace_by_entity sub-aba 4

note for ProfileService "listTabs para terceiro = sub-abas 1 a 5 (CA02) · visibilityFilter = PUBLICA + EMPRESA se mesma empresa + DEPARTAMENTO se membro (CA03) · canSeeHype por hypeVisibility (CA04)"
note for AccessPolicy "requireOwnerStrict: sub-abas 9, 13, 14, 15 sem bypass de ADMIN (ABAS_POR_PERFIL P-05, proposta)"
note for User "tabela users · cabeçalho público usa jobTitle, companyId, departmentId, hypeVisibility · status SUSPENDED ou DELETION_SCHEDULED responde 404 (CA01)"
note for Follow "única escrita do RF16: botão Seguir (RF27.CA06)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário (viewer)"]
    U1["Abre /u/[username] de um colega"]
    U2["Escolhe sub-aba 1 a 5, filtros e página"]
    U3["Clica Seguir ou ação social inline do card"]
    U4["Clica no atalho institucional"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Resolve locale pt-BR / en / es, layout responsivo"]
    W2["Renderiza skeleton, lê tab + filtros + page da URL"]
    W3["Cabeçalho público + lista de sub-abas 1 a 5 + botão Seguir"]
    W4["Página perfil não encontrado"]
    W5["Grade paginada, URL com tab e filtros, InteractionBar RF18/RF19"]
    W6["Redireciona para /departments/[slug] (RF14) ou /companies/[slug] (RF15)"]
  end

  subgraph LA["ws-application"]
    A1["ProfileService.loadHeader(viewer, username)"]
    A2{"Usuário existe e status ACTIVE?"}
    A3["404 USUARIO_NAO_ENCONTRADO"]
    A4{"profileType do dono?"}
    A5["institutionalShortcut: etiqueta Chefe de sigla ou logo da empresa + link RF14/RF15"]
    A6["visibilityFilter: PUBLICA + EMPRESA se mesma empresa + DEPARTAMENTO se membro"]
    A7["SocialService.counters só com itens visíveis ao viewer"]
    A8{"canSeeHype? PUBLICO sim · EMPRESA se mesma empresa · SO_EU nunca"}
    A9["Cabeçalho com Hype Score e faixa"]
    A10["Cabeçalho sem o campo hype"]
    A11["listTabs: terceiro recebe sub-abas 1 a 5"]
    A12["ProfileService.loadTab(viewer, owner, tab, filters, page)"]
    A13{"tab entre 6 e 15?"}
    A14["403 ACESSO_NEGADO (requireOwnerStrict, sem bypass ADMIN)"]
    A15["Aplica visibilityFilter por item; sub-aba 4 usa canView da DeciaSession; sub-aba 5 só publicIndicatorsJson"]
    A16["SocialService.follow(viewer, USER, owner) — RF27.CA06"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["Não há inferência no RF16 — Hype e indicadores já calculados em RF45/RF43"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: users, companies, departments, department_memberships")]
    P2[("Redis: counters:{ownerId}:{viewerLevel}, hype do dia")]
    P3[("MySQL: tasks, project_schemes, groupings, final_decisions, deliberative_profiles, profile_hype_scores")]
    P4[("Cassandra: trace_by_entity — fio de decisão da sub-aba 4")]
    P5[("MySQL: follows")]
  end

  U1 --> W1 --> W2 --> A1 --> P1
  A1 --> A2
  A2 -->|"não"| A3 --> W4
  A2 -->|"sim"| A4
  A4 -->|"EMPRESA ou CHEFE"| A5 --> A6
  A4 -->|"EMPREGADO"| A6
  A6 --> A7 --> P2
  A7 --> A8
  A8 -->|"sim"| A9 --> A11
  A8 -->|"não"| A10 --> A11
  A11 --> W3
  W3 --> U2 --> A12 --> A13
  A13 -->|"sim"| A14
  A13 -->|"não"| A15 --> P3
  A15 --> P4
  P3 --> W5
  W5 --> U3 --> A16 --> P5
  W3 --> U4 --> W6
  A9 -.-> I1

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  class A3,A14 err
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
  participant CS as Cassandra
  participant R as Redis

  U->>NX: GET /u/maria?tab=projetos&fase=ELABORACAO&page=1
  NX->>NX: resolve locale e lê tab, filtros e page da URL (CA05, CA06)
  NX->>C: GET /api/users/maria
  C->>S: ProfileService.loadHeader(viewerId, "maria")
  S->>DB: users WHERE username = maria JOIN companies, departments
  alt username inexistente ou status SUSPENDED / DELETION_SCHEDULED (CA01)
    DB-->>S: vazio ou conta indisponível
    S-->>C: 404 USUARIO_NAO_ENCONTRADO
    C-->>NX: 404
    NX-->>U: página perfil não encontrado
  else EMPREGADO ACTIVE
    S->>S: visibilityFilter(viewer, maria) = PUBLICA + EMPRESA (mesma empresa) + DEPARTAMENTO (membro) (CA03)
    S->>R: GET counters:{ownerId}:{viewerLevel}
    opt miss no cache
      S->>DB: COUNT tasks, project_schemes, final_decisions, follows filtrados pelo visibilityFilter
      S->>R: SET counters TTL 60s
    end
    S->>S: canSeeHype(viewer, maria) por hypeVisibility (CA04)
    alt hypeVisibility SO_EU ou EMPRESA de outra empresa
      S->>S: omite o campo hype da resposta
    else PUBLICO ou EMPRESA da mesma empresa
      S->>DB: profile_hype_scores WHERE userId AND scoreDate = hoje
    end
    S->>S: listTabs(viewer, maria) = sub-abas 1 a 5 (CA02)
    S-->>C: ProfileHeader + tabs 1 a 5 + follow state
    C-->>NX: 200
    NX-->>U: cabeçalho público com botão Seguir
  end

  NX->>C: GET /api/users/maria/tabs/projetos?fase=ELABORACAO&page=1&size=20
  C->>S: ProfileService.loadTab(viewerId, ownerId, PROJETOS, filters, page)
  S->>DB: project_schemes WHERE ownerId AND visibility IN filtro AND status <> RASCUNHO AND currentPhase = ELABORACAO
  DB-->>S: Page de ProjectScheme
  S-->>C: 200 Page {items, total, page}
  C-->>NX: 200
  NX-->>U: grade paginada com InteractionBar RF18/RF19 (CA05)

  NX->>C: GET /api/users/maria/tabs/decisoes?page=1
  C->>S: ProfileService.loadTab(viewerId, ownerId, DECISOES)
  S->>DB: final_decisions JOIN decia_sessions WHERE canView(viewer, accessMode)
  S->>CS: trace_by_entity para o fio de decisão de cada decisão visível
  S-->>C: 200 decisões com carimbo VALIDADO ou DEVOLVIDO
  C-->>NX: 200

  U->>NX: tenta abrir a sub-aba 13 DECIA Points pela URL
  NX->>C: GET /api/users/maria/tabs/pontos
  C->>S: ProfileService.loadTab(viewerId, ownerId, PONTOS)
  alt viewer não é o dono (CA02)
    S-->>C: 403 ACESSO_NEGADO (requireOwnerStrict, sem bypass ADMIN)
    C-->>NX: 403
    NX-->>U: aba indisponível, volta para a sub-aba 1
  end

  U->>NX: clica Seguir
  NX->>C: POST /api/follows {targetType USER, targetId maria}
  C->>S: SocialService.follow(viewerId, USER, maria) (RF27.CA06)
  S->>DB: INSERT follows (ATIVO) ou idempotente
  S-->>C: 201 Follow
  C-->>NX: 201
  NX-->>U: botão vira Seguindo
```

## 4. Máquina de estados

O RF16 é **somente leitura** e não tem estados próprios. Dois ciclos governam o que o terceiro vê: **`User.hypeVisibility`** (enum `HypeVisibility`, alterado pelo dono no RF45.CA06 — define se o Hype Score aparece no cabeçalho, CA04) e o **`Follow.status`** (enum `FollowStatus`, única escrita disparada a partir desta tela, RF27.CA06).

```mermaid
stateDiagram-v2
  state "User.hypeVisibility — decide o cabeçalho visto por terceiros (CA04)" as HV {
    [*] --> SO_EU : padrão ao criar a conta
    SO_EU --> EMPRESA : dono escolhe EMPRESA em /profile/hype
    SO_EU --> PUBLICO : dono escolhe PUBLICO
    EMPRESA --> PUBLICO : dono amplia
    PUBLICO --> EMPRESA : dono restringe
    EMPRESA --> SO_EU : dono oculta
    PUBLICO --> SO_EU : dono oculta
  }
  state "Follow (viewer → dono do perfil) — RF27.CA06" as FO {
    [*] --> NAO_SEGUE
    NAO_SEGUE --> ATIVO : POST follows USER
    ATIVO --> REMOVIDO : DELETE follows
    REMOVIDO --> ATIVO : seguir novamente
  }
  note right of HV
    SO_EU: a API nunca devolve o campo hype a terceiros, nem a CHEFE ou ADMIN.
    EMPRESA: só viewer com companyId igual ao do dono.
    PUBLICO: qualquer usuário autenticado.
  end note
  note right of FO
    Follow ATIVO alimenta a sub-aba Seguindo do Mural (RF27)
    e o contador de seguidores do cabeçalho (CA01).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/u/[username] — cabeçalho público + sub-abas 1 a 5"]
    F2["components/ui: ProfileHeader, HypeBadge condicional, InstitutionalShortcut, SubTabs 1 a 5, FilterBar, Pagination, TaskCard, ProjectCard, DecisionThread, PublicIndicators, FollowButton, InteractionBar RF18/RF19"]
    F3["i18n next-intl pt-BR / en / es · layout responsivo"]
  end

  subgraph WEB["ws-web"]
    C1["ProfileController — /api/users/{username}, /tabs/{tab}, /hype"]
    C2["FollowController RF27 — /api/follows"]
    C3["InteractionController RF18/RF19"]
  end

  subgraph APP["ws-application"]
    S1["ProfileService"]
    S2["AccessPolicy — canView, visibilityFilter, requireOwnerStrict"]
    S3["SocialService — counters, follow"]
    S4["ReputationService RF43/RF45 — indicadores públicos, hype se permitido"]
    P1["CachePort"]
  end

  subgraph DOM["ws-domain"]
    D1["User · Company · Department · DepartmentMembership"]
    D2["TaskItem · ProjectScheme · Grouping · FinalDecision · DeciaSession · Follow"]
    D3["DeliberativeProfile · ProfileHypeScore · HypeBand"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: users, companies, departments, department_memberships, tasks, project_schemes, groupings, final_decisions, deliberative_profiles, profile_hype_scores, follows")]
    I2[("cache-redis: counters:{ownerId}:{viewerLevel}, hype do dia")]
    I3[("persistence-cassandra: trace_by_entity — fio de decisão da sub-aba 4")]
  end

  F1 --- F2
  F1 --- F3
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C2
  F2 -->|"HTTPS/JSON"| C3
  C1 --> S1
  C2 --> S3
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> P1
  S1 --> D1
  S1 --> D2
  S4 --> D3
  D1 --> I1
  D2 --> I1
  D3 --> I1
  P1 --> I2
  S1 --> I3
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF16.CA01 | Classes `User` (jobTitle, companyId, departmentId, status), `Company`, `Department` (acronym, color, monogram), `ProfileService.loadHeader`, `SocialService.counters`, `CachePort` · Atividades `U1 → A1 → A2 → A3 404 / A6 → A7 → P2 → W3` · Sequência msgs 3–8 (`alt` 404) e 9–20 (contadores filtrados, cabeçalho) · Componentes `ProfileHeader`, `FollowButton`, `cache-redis` |
| RF16.CA02 | `ProfileService.listTabs` (nota "terceiro = 1 a 5"), `AccessPolicy.requireOwnerStrict` (nota P-05) · Atividades `A11`, `A13 → A14 403 ACESSO_NEGADO` · Sequência msg 17 (listTabs 1 a 5) e bloco `alt viewer não é o dono → 403` (msgs 37–40) · Componente `SubTabs 1 a 5` |
| RF16.CA03 | `ProfileService.visibilityFilter`, `AccessPolicy.canView/isSameCompany/isDeptMember`, `DepartmentMembership`, enum `Visibility` · Atividades `A6`, `A15` · Sequência msg 9 (visibilityFilter), msg 12 (COUNT filtrado), msgs 23–24 (`visibility IN filtro AND status <> RASCUNHO`), msgs 29–30 (`canView` da `DeciaSession`) · Tabela de sub-abas do cabeçalho |
| RF16.CA04 | `User.hypeVisibility`, enum `HypeVisibility`, `ProfileService.canSeeHype`, `ReputationService.hypeScoreIfAllowed/publicDeliberativeSummary`, `DeliberativeProfile.publicIndicatorsJson` · Atividades `A8 → A9 / A10`, `A15` (sub-aba 5) · Sequência msgs 14–16 (`alt SO_EU → omite o campo hype`) · Máquina de estados *User.hypeVisibility* e nota · Componentes `HypeBadge condicional`, `PublicIndicators` |
| RF16.CA05 | `ProfileController.GET_api_users_username_tabs_tab`, `ProfileService.loadTab` · Atividades `W2` (lê tab + filtros + page), `U2 → A12`, `W5` (InteractionBar) · Sequência msgs 1–2 e 22–27 (`?fase=&page=&size=20`, grade com InteractionBar) · Componentes `FilterBar`, `Pagination`, `InteractionBar RF18/RF19`, `InteractionController RF18/RF19` |
| RF16.CA06 | Enum `ProfileType`, `ProfileService.institutionalShortcut` · Atividades `W1` (locale, responsivo), `A4 → A5`, `U4 → W6` (RF14 / RF15) · Sequência msg 2 (locale) · Componentes `InstitutionalShortcut`, `i18n next-intl` |
| (escrita única) Seguir | `Follow`, `SocialService.follow`, `FollowController` · Atividades `U3 → A16 → P5` · Sequência msgs 41–46 · Máquina de estados *Follow* · pertence ao RF27.CA06 |
