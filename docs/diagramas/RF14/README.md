# RF14 — Visualizar perfil de um chefe de departamento
**HU:** HU14 · **Sprint (board Work Station):** lista *Requisitos Funcionais* (card renumerado, sem sprint atribuída — a confirmar) · **Equivalente FAI:** RF22 Perfil institucional (página da CELEBRIDADE, `brands/[slug]/page.tsx` abas públicas × `admin`) + RF17 perfil de outros · **Aba/rota:** **página do departamento** `/departments/[slug]` (Matriz D de `docs/produto/ABAS_POR_PERFIL.md` §5 — é o que o board chama de "perfil do chefe"), alcançada pela aba Buscar (RF27), por `/companies/[slug]` › Departamentos (RF15) ou pelo atalho no perfil pessoal do chefe (`/u/[username]`, RF16/RF19); API `GET /api/departments/{slug}` + `GET /api/departments/{id}/tabs/{tab}`
**Critérios de aceite cobertos:** RF14.CA01 · RF14.CA02 · RF14.CA03 · RF14.CA04 · RF14.CA05 · RF14.CA06 — corpo do card vazio: CAs derivados do título + HU14 + RF28.CA02/CA03/CA04/CA06/CA08 (`docs/diagramas/RF28/README.md`) + RF27.CA06 (seguir) + RF45.CA06/CA10 (Hype) + Matriz D, marcados **(CA a confirmar)**

> **HU14** — COMO usuário dentro do sistema Work Station POSSO procurar o perfil de um chefe de departamento PARA obter informação relevante ou realizar alguma funcionalidade.

O CHEFE é uma **pessoa** (perfil pessoal com as 15 sub-abas do RF19 em `/u/[username]`) **e** o `headUserId` de um `Department`. O "perfil de chefe" do board é a **página institucional do departamento**: cabeçalho com sigla, cor, monograma, capa e o chefe (avatar, nome, cargo "Chefe de {sigla}"), métricas públicas do período e sub-abas **públicas** (Sobre · Projetos · Sessões DECIA · Chancelas · Reconhecimentos · Equipe) + sub-abas de **gestão** só para o chefe/EMPRESA (Minha equipe RF9/RF10, Dashboard do emissor, Insights da Equipe), **negadas no serviço** e não só ocultas. Este RF é de **leitura**; a única escrita própria é **Seguir** (`Follow` targetType DEPARTMENT). Reaproveita `InstitutionalService.publicPage` e `RedisMetricsCache` do RF28.

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF14.CA01** | Dado qualquer usuário (inclusive visitante), quando busca um chefe/departamento (aba Buscar por nome, sigla ou nome do chefe; lista de departamentos da empresa; menção `@sigla`) e abre `/departments/[slug]`, então vê o cabeçalho: `Department.acronym`, `name`, `color`, `monogram`, `coverUrl`, `about`, chefe (`User` de `headUserId`: avatar, `fullName`, `jobTitle` → "Chefe de {acronym}"), `Company` (logo + link para RF15), contadores (pessoas com `DepartmentMembership` vigente, projetos publicados, decisões validadas, chancelas emitidas, seguidores) e botão **Seguir**; slug inexistente ou `active = false` → `404 DEPARTAMENTO_NAO_ENCONTRADO`. |
| **RF14.CA02** | Dado o cabeçalho, então as sub-abas públicas são: **Sobre** · **Projetos do departamento** (filtros fase, exercício; `canView` por item) · **Sessões DECIA** (abertas/encerradas: membro vê as suas, mesma empresa vê PÚBLICAS/encerradas com resumo, visitante não vê) · **Chancelas do departamento** (`Seal` ativas; a fila de revisão só para chefe/curador) · **Reconhecimentos emitidos** (`Recognition` com `publicOnMural`) · **Equipe** (modo público: nome, cargo, monograma, etiqueta "Curador" por `CuratorAppointment` ativo); tab + filtros + página ficam na URL (RF19.CA03). |
| **RF14.CA03** | Dado o período selecionado (padrão: exercício corrente), então as **métricas públicas** (RF28.CA04) são agregadas: projetos publicados, modelos oficiais/chancelas APROVADAS, decisões VALIDADAS, tempo médio até decisão, pessoas; vêm de `MetricSnapshot` (DEPARTAMENTO) com cache Redis `metrics:department:{id}:{period}` TTL 300 s; **nunca** expõem HSE, Hype ou DECIA Points nominais (RF45.CA10) — só histograma anonimizado quando o viewer é chefe. |
| **RF14.CA04** | Dado o viewer autenticado, quando aciona **Seguir**, então é criado `Follow {followerId, targetType DEPARTMENT, targetId, status ATIVO}` (único; repetir é idempotente → 200 com o mesmo registro); **Deixar de seguir** → `status REMOVIDO`; os eventos do departamento (projeto publicado, decisão validada, reconhecimento) entram na sub-aba Seguindo do Mural (RF27) e em `TimelineEvent` do seguidor; visitante anônimo → `401` com convite a entrar. |
| **RF14.CA05** | Dado o viewer, então as **ações** disponíveis a partir da página dependem do papel: membro do departamento → "Pedir chancela", "Indicar colega", "Propor chancela" (RF39.CA06), "Mensagem ao chefe" (RF46); mesma empresa → "Levar ao meu acervo" nos modelos oficiais (RF41.CA08), "Mensagem"; chefe (`headUserId`) e EMPRESA dona → "Gerir" (Minha equipe RF9/RF10, Dashboard do emissor RF28.CA06, Insights da Equipe RF43.CA14); link "Ver perfil pessoal" abre `/u/[username]` do chefe (sub-abas 1–5 e Hype conforme `hypeVisibility`, RF16/RF19). |
| **RF14.CA06** | Dado o viewer, então a **visibilidade por item** segue `AccessPolicy.visibilityFilter`: anônimo/outra empresa → só `PUBLICA`; mesma empresa → + `EMPRESA`; membro → + `DEPARTAMENTO`; sub-abas de gestão → `403 ACESSO_NEGADO` no serviço para quem não é `headUserId` nem `Company.ownerUserId` (curador com escopo FILA_REVISAO/PREMIACAO vê só a fila/premiação); dados pessoais (`email`, `phone`) nunca saem na API da equipe; página em pt-BR/en/es e responsiva (RF19.CA07). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class Department {
    <<entity>>
    +UUID id
    +UUID companyId
    +String name
    +String acronym
    +String slug
    +String color
    +String monogram
    +UUID headUserId
    +String about
    +String coverUrl
    +boolean active
  }
  class User {
    <<entity>>
    +UUID id
    +String username
    +String fullName
    +String jobTitle
    +ProfileType profileType
    +UUID companyId
    +UUID departmentId
    +String avatarUrl
    +HypeVisibility hypeVisibility
  }
  class Company {
    <<entity>>
    +UUID id
    +UUID ownerUserId
    +String legalName
    +String slug
    +String logoUrl
    +String accentColor
  }
  class DepartmentMembership {
    <<entity>>
    +UUID userId
    +UUID departmentId
    +DeptRole roleInDept
    +Instant startedAt
    +Instant endedAt
  }
  class CuratorAppointment {
    <<entity>>
    +UUID departmentId
    +UUID curatorUserId
    +CuratorScope scope
    +Instant revokedAt
  }
  class Follow {
    <<entity>>
    +UUID id
    +UUID followerId
    +FollowTargetType targetType
    +UUID targetId
    +FollowStatus status
    +Instant at
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID departmentId
    +String title
    +ProjectStatus status
    +ProjectPhase currentPhase
    +int exerciseYear
    +Visibility visibility
  }
  class DeciaSession {
    <<entity>>
    +UUID id
    +UUID departmentId
    +String topic
    +SessionAccess accessMode
    +SessionStatus status
  }
  class Seal {
    <<entity>>
    +UUID id
    +UUID departmentId
    +String name
    +SealTier tier
    +SealStatus status
    +String artJson
  }
  class SealBond {
    <<entity>>
    +UUID sealId
    +UUID targetId
    +SealBondStatus status
  }
  class Recognition {
    <<entity>>
    +UUID id
    +UUID issuerUserId
    +UUID recipientUserId
    +String name
    +String medalArtJson
    +boolean publicOnMural
  }
  class FinalDecision {
    <<entity>>
    +UUID sessionId
    +DecisionStatus status
  }
  class MetricSnapshot {
    <<entity>>
    +String metricCode
    +MetricScope scope
    +UUID scopeId
    +LocalDate periodStart
    +LocalDate periodEnd
    +BigDecimal value
  }
  class TimelineEvent {
    <<entity>>
    +UUID userId
    +Instant at
    +String eventType
    +String targetType
    +UUID targetId
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
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
  class CuratorScope {
    <<enum>>
    FILA_REVISAO
    PREMIACAO
    AMBOS
  }

  class DepartmentPageController {
    <<controller>>
    +GET_api_departments_slug(period) 200
    +GET_api_departments_id_tabs_tab(filters, page) 200
    +GET_api_departments_id_team() 200
    +GET_api_departments_id_team_manage() 200 ou 403
    +POST_api_follows(targetType, targetId) 200
    +DELETE_api_follows_id() 204
    +GET_api_search(q, type) 200
  }
  class InstitutionalService {
    <<service>>
    +departmentPage(viewer, slug, period) DepartmentPageView
    +listTabs(viewer, department) List~Tab~
    +loadTab(viewer, deptId, tab, filters, page) Page
    +publicMetrics(deptId, period) Metrics
  }
  class SocialService {
    <<service>>
    +follow(viewer, DEPARTMENT, deptId) Follow
    +unfollow(viewer, followId) Follow
    +followersCount(deptId) long
  }
  class CuratorService {
    <<service>>
    +isCurator(userId, deptId, scope) boolean
  }
  class AccessPolicy {
    <<service>>
    +visibilityFilter(viewer, deptId, companyId) Visibility[]
    +canManage(viewer, department) boolean
    +canView(viewer, item) boolean
  }
  class SearchService {
    <<service>>
    +search(viewer, q, type DEPARTMENT) Page
  }
  class MetricsCachePort {
    <<port>>
    +get(key) Metrics
    +put(key, metrics, ttl)
  }
  class SearchIndexPort {
    <<port>>
    +query(index, q, filters) Page
  }
  class DepartmentJpaRepository {
    <<adapter>>
    MySQL departments
  }
  class RedisMetricsCache {
    <<adapter>>
    metrics department id period
  }
  class OpenSearchDepartmentIndex {
    <<adapter>>
    indice ws-departments
  }

  Company "1" --> "*" Department
  Department --> User : headUserId CHEFE
  Department "1" --> "*" DepartmentMembership
  DepartmentMembership --> User
  Department "1" --> "*" CuratorAppointment
  CuratorAppointment --> CuratorScope
  Department "1" --> "*" ProjectScheme
  Department "1" --> "*" DeciaSession
  Department "1" --> "*" Seal
  Seal "1" --> "*" SealBond
  DeciaSession "1" --> "0..1" FinalDecision
  Recognition --> User : issuerUserId CHEFE
  Follow --> FollowTargetType
  Follow --> FollowStatus
  Follow ..> Department : targetId quando DEPARTMENT
  TimelineEvent ..> Follow : eventos do seguido
  MetricSnapshot ..> Department : scope DEPARTAMENTO
  ProjectScheme --> Visibility
  User --> Company

  DepartmentPageController --> InstitutionalService
  DepartmentPageController --> SocialService
  DepartmentPageController --> SearchService
  InstitutionalService --> AccessPolicy
  InstitutionalService --> CuratorService
  InstitutionalService --> MetricsCachePort
  InstitutionalService --> DepartmentJpaRepository
  SearchService --> SearchIndexPort
  MetricsCachePort <|.. RedisMetricsCache
  SearchIndexPort <|.. OpenSearchDepartmentIndex

  note for Department "tabela departments (RF28.CA02) · slug e a rota publica · active false devolve 404"
  note for InstitutionalService "reaproveita publicPage do RF28 · sub-abas publicas para todos, gestao so headUserId ou Company.ownerUserId (403 no servico)"
  note for MetricSnapshot "metricas publicas agregadas (RF28.CA04) · nunca HSE, Hype ou DP nominal (RF45.CA10)"
  note for Follow "unico (followerId, targetType, targetId) · unica escrita deste RF (CA04)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef ai fill:#fff3d6,stroke:#d68910,color:#5c3b00

  subgraph L1["Ator humano · qualquer usuário ou visitante"]
    U1["Busca chefe/departamento na aba Buscar, na página da empresa ou por menção"]
    U2["Abre /departments/[slug]"]
    U3["Escolhe sub-aba, filtros, período"]
    U4["Clica Seguir / Deixar de seguir"]
    U5["Aciona uma funcionalidade: pedir chancela, indicar colega, mensagem ao chefe, levar ao acervo, ver perfil pessoal, Gerir"]
    U6(["Fim"])
  end

  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["GET /api/search?q=&type=DEPARTMENT (nome, sigla, nome do chefe)"]
    W2["GET /api/departments/{slug}?period= · resolve locale e layout responsivo"]
    W3["Renderiza cabeçalho: DepartmentBadge (monograma + cor), capa, chefe com cargo Chefe de {sigla}, CompanyLogo, contadores, botão Seguir"]
    W4["Sub-abas públicas: Sobre · Projetos · Sessões DECIA · Chancelas · Reconhecimentos · Equipe · (+ Gerir se canManage) · URL com tab e filtros"]
    W5["GET /api/departments/{id}/tabs/{tab}?filters&page"]
    W6["POST /api/follows {DEPARTMENT, id} · DELETE /api/follows/{id}"]
    W7["Botões de ação por papel (RoleGate): membro, mesma empresa, chefe/EMPRESA"]
    W8["Exibe 404 DEPARTAMENTO_NAO_ENCONTRADO"]
    W9["Exibe 403 ACESSO_NEGADO (sub-aba de gestão)"]
    W10["Exibe 401 — entre para seguir"]
  end

  subgraph L3["ws-application · InstitutionalService · SocialService"]
    S1{"Department encontrado por slug e active?"}
    S2["Carrega Department + User(headUserId) + Company + contadores"]
    S3["publicMetrics: MetricsCachePort.get metrics:department:{id}:{period}"]
    S4{"cache vazio?"}
    S5["Agrega MetricSnapshot DEPARTAMENTO: projetos publicados, chancelas APROVADAS, decisões VALIDADAS, tempo até decisão, pessoas · SET TTL 300 s"]
    S6["AccessPolicy.visibilityFilter: PUBLICA + EMPRESA se mesma empresa + DEPARTAMENTO se membro"]
    S7{"canManage: viewer é headUserId ou Company.ownerUserId?"}
    S8["listTabs: públicas (+ Gerir) · curador com escopo vê só fila/premiação"]
    S9{"Sub-aba de gestão pedida sem canManage?"}
    S10["loadTab com visibilityFilter e paginação (Projetos, Sessões, Chancelas, Reconhecimentos, Equipe pública com etiqueta Curador)"]
    S11{"viewer autenticado?"}
    S12["SocialService.follow: Follow DEPARTMENT ATIVO (idempotente) / unfollow → REMOVIDO"]
    S13["Encaminha para o RF alvo: RF39 (chancela), RF46 (mensagem), RF41 (levar ao acervo), RF19/RF16 (perfil pessoal), RF9/RF10/RF28/RF43 (Gerir)"]
  end

  subgraph L4["IA (AiEngine)"]
    A1["Não usada neste RF — leitura institucional · Insights da Equipe (RF43.CA14) só no modo Gerir"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL departments · users · companies · department_memberships · curator_appointments")]
    D2[("Redis metrics:department:{id}:{period} · counters")]
    D3[("MySQL project_schemes · decia_sessions · seals · seal_bonds · recognitions · metric_snapshots")]
    D4[("MySQL follows · Cassandra timeline_by_user")]
    D5[("OpenSearch ws-departments")]
  end

  U1 --> W1 --> D5
  W1 --> U2 --> W2 --> S1
  S1 -->|"não"| W8 --> U6
  S1 -->|"sim"| S2 --> D1
  S2 --> S3 --> D2
  S3 --> S4
  S4 -->|"sim"| S5 --> D3
  S5 --> D2
  S4 -->|"não"| S6
  S5 --> S6 --> S7
  S7 -->|"sim"| S8
  S7 -->|"não"| S8
  S8 --> W3 --> W4 --> U3 --> W5 --> S9
  S9 -->|"sim"| W9 --> U6
  S9 -->|"não"| S10 --> D3
  S10 --> W4
  W3 --> U4 --> W6 --> S11
  S11 -->|"não"| W10 --> U6
  S11 -->|"sim"| S12 --> D4
  S12 --> W3
  W4 --> W7 --> U5 --> S13 --> U6
  S13 -. "modo Gerir" .-> A1

  class W8,W9,W10 err
  class A1 ai
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant R as Redis
  participant OS as OpenSearch
  participant CS as Cassandra

  rect rgb(245, 242, 239)
    Note over U,CS: Caminho feliz — busca o chefe, abre a página do departamento, navega nas sub-abas e segue
    U->>FE: Buscar "SECID-UTS" (ou nome do chefe)
    FE->>C: GET /api/search?q=SECID-UTS&type=DEPARTMENT
    C->>S: SearchService.search(viewer, q, DEPARTMENT)
    S->>OS: query ws-departments (name, acronym, headName)
    OS-->>S: hits
    S-->>C: 200 [{slug, acronym, headName}]
    C-->>FE: 200
    U->>FE: Abre /departments/secid-uts?tab=projetos&fase=ELABORACAO
    FE->>C: GET /api/departments/secid-uts?period=2026
    C->>S: InstitutionalService.departmentPage(viewer, slug, period)
    S->>DB: SELECT departments WHERE slug AND active · users (headUserId) · companies
    S->>DB: COUNT department_memberships vigentes · follows (DEPARTMENT) · curator_appointments ativos
    S->>R: GET metrics:department:{id}:2026
    R-->>S: miss
    S->>DB: SELECT metric_snapshots (DEPARTAMENTO) · COUNT project_schemes PUBLICADO · seal_bonds APROVADA · final_decisions VALIDADA
    S->>R: SET metrics:department:{id}:2026 TTL 300
    S->>S: AccessPolicy.visibilityFilter(viewer) = PUBLICA + EMPRESA (mesma empresa) · canManage = false
    S->>S: listTabs = Sobre, Projetos, Sessões DECIA, Chancelas, Reconhecimentos, Equipe
    S-->>C: 200 DepartmentPageView {header, chefe, metrics, tabs, following false}
    C-->>FE: 200
    FE-->>U: Cabeçalho com DepartmentBadge, chefe "Chefe de SECID-UTS", métricas públicas, botão Seguir
    FE->>C: GET /api/departments/{id}/tabs/projetos?fase=ELABORACAO&page=1
    C->>S: InstitutionalService.loadTab(viewer, deptId, PROJETOS, filters, page)
    S->>DB: SELECT project_schemes WHERE departmentId AND visibility IN (PUBLICA, EMPRESA) AND currentPhase = ELABORACAO
    S-->>C: 200 Page de ProjectScheme (cards MOSAICO)
    C-->>FE: 200
    FE-->>U: Grade paginada · URL com tab e filtros
    U->>FE: Seguir
    FE->>C: POST /api/follows {targetType DEPARTMENT, targetId}
    C->>S: SocialService.follow(viewer, DEPARTMENT, deptId)
    S->>DB: INSERT follows (ATIVO) ON DUPLICATE KEY UPDATE status = ATIVO
    S->>CS: INSERT timeline_by_user (viewer, FOLLOW_STARTED)
    S->>R: INCR counters:department:{id}:followers
    S-->>C: 200 Follow {status ATIVO}
    C-->>FE: 200
    FE-->>U: Botão vira Seguindo · eventos do departamento entram em Seguindo (RF27)
    U->>FE: Equipe › clica no chefe › Ver perfil pessoal
    FE-->>U: Navega para /u/[username] (RF16/RF19 sub-abas 1–5)
  end

  alt RF14.CA01 — slug inexistente ou departamento inativo
    FE->>C: GET /api/departments/xpto
    C->>S: departmentPage(viewer, "xpto", period)
    S->>DB: SELECT departments WHERE slug = xpto AND active → vazio
    S-->>C: 404 DEPARTAMENTO_NAO_ENCONTRADO
    C-->>FE: 404
  else RF14.CA06 — sub-aba de gestão sem permissão
    FE->>C: GET /api/departments/{id}/team/manage
    C->>S: InstitutionalService.loadTab(viewer, deptId, MINHA_EQUIPE)
    S->>S: canManage = viewer não é headUserId nem Company.ownerUserId
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
  else RF14.CA04 — visitante anônimo tenta seguir
    FE->>C: POST /api/follows (sem sessão)
    C-->>FE: 401 (entrar para seguir)
  end
```

## 4. Máquina de estados

O RF14 é de leitura e não tem estados próprios. A única entidade que ele altera é **`Follow.status`** (enum `FollowStatus`), e a página só existe enquanto **`Department.active = true`** (alterado pela EMPRESA no RF28). Ambas abaixo.

```mermaid
stateDiagram-v2
  direction LR

  state "Follow (targetType DEPARTMENT) — CA04" as F {
    [*] --> NaoSegue
    NaoSegue --> ATIVO : POST /api/follows — INSERT follows (unico followerId, targetType, targetId)
    ATIVO --> ATIVO : POST repetido — idempotente, 200 com o mesmo registro
    ATIVO --> REMOVIDO : DELETE /api/follows/{id} — Deixar de seguir
    REMOVIDO --> ATIVO : Seguir de novo — reativa o mesmo registro
  }

  state "Department.active — página pública (CA01)" as D {
    [*] --> Ativo : EMPRESA cria departamento (RF28.CA02)
    Ativo --> Inativo : EMPRESA desativa — página devolve 404 DEPARTAMENTO_NAO_ENCONTRADO
    Inativo --> Ativo : EMPRESA reativa
    Ativo --> Ativo : troca de chefe (RF28.CA07) — cabecalho muda, seguidores mantidos
  }

  note right of F
    Eventos do departamento (projeto publicado, decisao validada,
    reconhecimento) entram na sub-aba Seguindo do Mural (RF27)
    e em timeline_by_user do seguidor enquanto ATIVO
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    F1["app/departments/[slug]/page.tsx · sub-abas públicas + Gerir (RoleGate)"]
    F2["app/search · aba Buscar (RF27) com tipo Departamento"]
    F3["app/u/[username] · perfil pessoal do chefe (RF16/RF19)"]
    F4["components/ui: DepartmentBadge (monograma + cor) · HeadCard (avatar, Chefe de {sigla}) · CompanyLogo · PublicMetrics · SubTabs · FilterBar · Pagination · FollowButton · TeamList (etiqueta Curador) · SealWax · MedalBadge · ActionBar (pedir chancela, indicar, mensagem, levar ao acervo)"]
    F5["i18n next-intl pt-BR/en/es · layout responsivo"]
  end

  subgraph WEB["ws-web"]
    C1["DepartmentPageController (GET /api/departments/{slug} · GET .../tabs/{tab} · GET .../team · GET .../team/manage)"]
    C2["FollowController (POST/DELETE /api/follows)"]
    C3["SearchController (GET /api/search)"]
    C4["RoleGate / AccessPolicy (canManage, visibilityFilter)"]
  end

  subgraph APP["ws-application"]
    S1["InstitutionalService (departmentPage, listTabs, loadTab, publicMetrics) — RF28"]
    S2["SocialService (follow, unfollow, followersCount) — RF26/RF27"]
    S3["CuratorService.isCurator — RF28"]
    S4["SearchService — RF27"]
    S5["AccessPolicy"]
    P1["MetricsCachePort"]
    P2["SearchIndexPort"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["Department · User (headUserId) · Company · DepartmentMembership · CuratorAppointment"]
    D2["Follow · TimelineEvent · MetricSnapshot"]
    D3["ProjectScheme · DeciaSession · Seal · SealBond · Recognition · FinalDecision (leitura)"]
    D4["Enums: FollowTargetType · FollowStatus · Visibility · CuratorScope · ProfileType"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1["persistence-mysql: DepartmentJpaRepository · UserRepository · DepartmentMembershipRepository · CuratorAppointmentRepository · FollowRepository · ProjectSchemeRepository · SealRepository · RecognitionRepository · MetricSnapshotRepository"]
    I2["cache-redis: RedisMetricsCache (metrics:department:*) · counters"]
    I3["search-opensearch: OpenSearchDepartmentIndex (ws-departments)"]
    I4["persistence-cassandra: TimelineAdapter (timeline_by_user)"]
  end

  subgraph EXT["Serviços externos"]
    X1(["Nenhum provedor de IA neste RF · Insights da Equipe (RF43) só no modo Gerir"])
  end

  MY[("MySQL 8")]
  RD[("Redis")]
  OS[("OpenSearch")]
  CA[("Cassandra")]

  F2 --> C3
  F1 --> F4
  F5 -.-> F1
  F4 -->|"HTTPS/JSON"| C1 --> C4 --> S1
  F4 -->|"HTTPS/JSON"| C2 --> S2
  C3 --> S4
  F1 -. "Ver perfil pessoal" .-> F3
  S1 --> S5
  S1 --> S3
  S1 --> P1
  S4 --> P2
  S1 --> D1
  S1 --> D3
  S2 --> D2
  S1 --> D2
  D1 --> D4
  S1 --> I1
  S2 --> I1
  S2 -.-> I4
  P1 -.-> I2
  P2 -.-> I3
  I1 --> MY
  I2 --> RD
  I3 --> OS
  I4 --> CA
  S1 -.-> X1
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF14.CA01 | `Department` (slug, acronym, color, monogram, coverUrl, about, headUserId, active), `User` (jobTitle, avatarUrl), `Company`, `DepartmentMembership`, `InstitutionalService.departmentPage`, `SearchService.search` | U1, U2, W1, W2, W3, S1, S2, W8 | 1–13, 20–21; `alt` 404 DEPARTAMENTO_NAO_ENCONTRADO | `Department.active` Ativo/Inativo | `app/search`, `DepartmentBadge`, `HeadCard`, `CompanyLogo`, `OpenSearchDepartmentIndex`, `DepartmentJpaRepository` |
| RF14.CA02 | `InstitutionalService.listTabs/loadTab`, `ProjectScheme`, `DeciaSession` (accessMode), `Seal`, `Recognition.publicOnMural`, `CuratorAppointment` (etiqueta Curador), `CuratorService.isCurator` | U3, W4, W5, S8, S10 | 18, 22–27 | — | `SubTabs`, `FilterBar`, `Pagination`, `TeamList`, `SealWax`, `MedalBadge` |
| RF14.CA03 | `MetricSnapshot` (scope DEPARTAMENTO), `InstitutionalService.publicMetrics`, `MetricsCachePort`, `RedisMetricsCache` | S3, S4, S5, D2, D3 | 14–17 | — | `PublicMetrics`, `RedisMetricsCache`, `MetricSnapshotRepository` |
| RF14.CA04 | `Follow` (targetType DEPARTMENT, status), enums `FollowTargetType`/`FollowStatus`, `SocialService.follow/unfollow`, `TimelineEvent` | U4, W6, S11, S12, W10, D4 | 28–35; `alt` 401 | `NaoSegue → ATIVO → REMOVIDO → ATIVO` | `FollowButton`, `FollowController`, `FollowRepository`, `TimelineAdapter` |
| RF14.CA05 | `AccessPolicy.canManage`, `Department.headUserId`, `Company.ownerUserId`, `User.username/hypeVisibility` (perfil pessoal) | U5, W7, S7, S13 | 36–37 | — | `ActionBar`, `RoleGate`, link para `app/u/[username]`, RFs alvo (RF39, RF46, RF41, RF9/RF10, RF28, RF43) |
| RF14.CA06 | `AccessPolicy.visibilityFilter/canView`, enum `Visibility`, `CuratorScope`, `InstitutionalService.loadTab` (403 no serviço) | S6, S9, W9 | 17, 24; `alt` 403 ACESSO_NEGADO | nota de `Follow` (eventos só enquanto ATIVO) | `RoleGate / AccessPolicy`, `i18n next-intl`, layout responsivo |

**Dúvidas para confirmar:** (a) "perfil de um chefe" = página do departamento (`/departments/[slug]`) com atalho ao perfil pessoal, ou o inverso (perfil pessoal `/u/[username]` com bloco institucional) — o board usa as duas leituras (ABAS_POR_PERFIL §5 e §7.d); (b) quais métricas públicas entram (RF28.CA04 lista 3; aqui propomos 5); (c) a busca de chefe pelo **nome da pessoa** na aba Buscar deve resolver para o departamento ou para o perfil pessoal; (d) visitante anônimo vê a página (Sobre, Equipe nomes/cargos, Projetos PÚBLICOS) ou só usuários autenticados; (e) sprint do card.
