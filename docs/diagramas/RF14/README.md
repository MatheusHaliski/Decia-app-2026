# RF14 — Visualizar perfil de um chefe de departamento
**HU:** HU14 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (card renumerado; o card "SPRINT 3" cita "RF14 Reabertura da sessão", escopo antigo preservado em `_anterior/RF14` — `RENUMERACAO.md`; fase (g) da ARQUITETURA §6: "RF14–RF19 perfis, busca, social") · **Equivalente FAI:** RF22 Perfil institucional (página da CELEBRIDADE, abas públicas × `admin`) + RF17 perfil de outros · **Aba/rota:** **página do departamento** `/departments/[slug]` (Matriz D de ABAS_POR_PERFIL §5 — é o que o board chama de "perfil do chefe"), alcançada pela aba Buscar (RF17), por `/companies/[slug]` › Departamentos (RF15) ou pelo perfil pessoal do chefe (`/u/[username]`, RF16); API `GET /api/departments/{slug}`, `GET /api/departments/{id}/tabs/{tab}`, `GET /api/departments/{id}/metrics?period=`, `POST|DELETE /api/follows`
**Critérios de aceite cobertos:** RF14.CA01 · RF14.CA02 · RF14.CA03 · RF14.CA04 · RF14.CA05 · RF14.CA06 — corpo do card vazio: CAs derivados do título + HU14 + RF28.CA02/CA03/CA04/CA06/CA08 (`docs/diagramas/RF28/README.md`) + RF27.CA06 (seguir) + RF45.CA06/CA10 (Hype) + Matriz D, marcados **(CA a confirmar)**. Todas as classes do RF são **(planejado)**; reais: `User` (`companyId`/`departmentId` sem FK até o RF28, D-23), `Guard`, `SecurityConfig`. Atualização 17/10/2026: o cabeçalho público de **pessoa** do chefe já tem fonte real em `GET /api/people/by-username/{username}` (`PeopleController` → `PeopleService.byUsername` → `PublicProfileView`, **em curso, Onda 1**); a API institucional do departamento segue **(planejado)**.

> **HU14** — COMO usuário dentro do sistema Work Station POSSO procurar o perfil de um chefe de departamento PARA obter informação relevante ou realizar alguma funcionalidade.

O "perfil do chefe" é a **página do departamento** (`Department`, TAXONOMIA §1.5) que ele chefia (`headUserId`): cabeçalho institucional, sub-abas públicas e **ações por papel** (`AccessPolicy`); a conta pessoal do chefe (`/u/[username]`) é o RF16. Métricas vêm de `MetricSnapshot` (scope DEPARTAMENTO) e nunca expõem dados nominais de desempenho (RF45.CA10).

**Atualização 17/10/2026.** A página do departamento e sua API (`/api/departments/*`) continuam **(planejado)**. O que já mudou: (1) o cabeçalho público da **pessoa** do chefe (avatar, nome, cargo, `profileType`, empresa e departamento, sem e-mail nem telefone) tem fonte **(real)** em `PeopleService.byUsername` → `PublicProfileView`, servido por `GET /api/people/by-username/{username}` com `404 NAO_ENCONTRADO` uniforme para conta não `ACTIVE` — o front sobre essa rota está **(em curso, Onda 1)** (`docs/auditoria/2026-10-17/PLANO_ONDAS.md`, P19); (2) no front de demonstração, os contadores e a composição de projeto respeitam a ACL do viewer — SIGILOSO equivale a PRIVADA e tarefas ocultas não entram em título nem total (`lib/social/rules.ts`, `lib/social/view-model.ts`, commit `b602d34`).

## Critérios de aceite derivados da HU14 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF14.CA01** (CA a confirmar) | Dado qualquer usuário (inclusive visitante), quando busca um chefe/departamento (aba Buscar por nome, sigla ou nome do chefe; lista de departamentos da empresa; menção `@sigla`) e abre `/departments/[slug]`, então vê o cabeçalho: `Department.acronym`, `name`, `color`, `monogram`, `coverUrl`, `about`, chefe (`User` de `headUserId`: avatar, `fullName`, `jobTitle` → "Chefe de {acronym}"), `Company` (logo + link para RF15), contadores (pessoas com `DepartmentMembership` vigente, projetos publicados, decisões validadas, chancelas emitidas, seguidores) e botão **Seguir**; slug inexistente ou `active = false` → `404 DEPARTAMENTO_NAO_ENCONTRADO`. **Fonte real do bloco do chefe (em curso, Onda 1):** `PublicProfileView` de `GET /api/people/by-username/{username}` (avatar, `fullName`, `jobTitle`, `profileType`); o cabeçalho do departamento segue planejado. |
| **RF14.CA02** (CA a confirmar) | Dado o cabeçalho, então as sub-abas públicas são: **Sobre** · **Projetos do departamento** (filtros fase, exercício; `canView` por item) · **Sessões DECIA** (membro vê as suas, mesma empresa vê PÚBLICAS/encerradas com resumo, visitante não vê) · **Chancelas do departamento** (`Seal` ATIVA; a fila de revisão só para chefe/curador) · **Reconhecimentos emitidos** (`Recognition.publicOnMural`) · **Equipe** (modo público: nome, cargo, monograma, etiqueta "Curador" por `CuratorAppointment` ativo); tab + filtros + página ficam na URL. |
| **RF14.CA03** (CA a confirmar) | Dado o período selecionado (padrão: exercício corrente), então as **métricas públicas** (RF28.CA04) são agregadas: projetos publicados, modelos oficiais/chancelas APROVADAS, decisões VALIDADAS, tempo médio até decisão, pessoas; vêm de `MetricSnapshot` (DEPARTAMENTO) com cache Redis `metrics:department:{id}:{period}` TTL 300 s; **nunca** expõem HSE, Hype ou DECIA Points nominais (RF45.CA10) — só histograma anonimizado quando o viewer é o chefe. |
| **RF14.CA04** (CA a confirmar) | Dado o viewer autenticado, quando aciona **Seguir**, então é criado `Follow {followerId, targetType DEPARTMENT, targetId, status ATIVO}` (único; repetir é idempotente → 200 com o mesmo registro); **Deixar de seguir** → `status REMOVIDO`; os eventos do departamento (projeto publicado, decisão validada, reconhecimento) entram na sub-aba Seguindo do Mural (RF27) e em `TimelineEvent` do seguidor; visitante anônimo → `401 NAO_AUTENTICADO` com convite a entrar. |
| **RF14.CA05** (CA a confirmar) | Dado o viewer, então as **ações** da página dependem do papel: membro do departamento → "Pedir chancela", "Indicar colega", "Propor chancela" (RF39.CA06), "Mensagem ao chefe" (RF46); mesma empresa → "Levar ao meu acervo" nos modelos oficiais (RF41.CA08), "Mensagem"; chefe (`headUserId`) e EMPRESA dona → "Gerir" (Minha equipe RF9/RF10, Dashboard do emissor RF28.CA06, Insights da Equipe RF43.CA14); link "Ver perfil pessoal" abre `/u/[username]` do chefe (RF16). |
| **RF14.CA06** (CA a confirmar) | Dado o viewer, então a **visibilidade por item** segue `AccessPolicy.visibilityFilter`: anônimo/outra empresa → só `PUBLICA`; mesma empresa → + `EMPRESA`; membro → + `DEPARTAMENTO`; sub-abas de gestão → `403 ACESSO_NEGADO` no serviço para quem não é `headUserId` nem `Company.ownerUserId` (curador com escopo FILA_REVISAO/PREMIACAO vê só a fila/premiação); dados pessoais (`email`, `phone`) nunca saem na API da equipe; página em pt-BR/en/es e responsiva. **Real (17/10/2026):** a projeção pública de pessoa (`PublicProfileView`) já não carrega contato; no front, contadores e composição de projeto contam só o que o viewer vê (`b602d34`, `lib/social/rules.ts`). |

## 0. Diagrama de casos de uso

Quem visita a página do departamento (o "perfil do chefe") e o que cada um pode fazer nela. Borda contínua: existe no código em 17/10/2026; tracejada: planejado ou em curso (a página roda sobre o repositório DEMO e a API `/api/departments/*` não existe).

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  classDef ucDemo fill:#fff8e6,stroke:#b26a00,stroke-dasharray:2 2,color:#1b1b1b
  visitante["«ator» Visitante"]:::ator
  autenticado["«ator» Pessoa autenticada"]:::ator
  empregado["«ator» Empregado"]:::ator
  chefe["«ator» Chefe de departamento"]:::ator
  empresa["«ator» Empresa ou órgão"]:::ator
  curador["«ator» Curador"]:::ator
  subgraph SIS["Work Station — RF14 Página do departamento"]
    direction TB
    UC1(["UC1 Buscar e abrir a página do departamento"]):::ucDemo
    UC2(["UC2 Navegar pelas sub-abas públicas"]):::ucPlan
    UC3(["UC3 Filtrar itens pela visibilidade"]):::ucPlan
    UC4(["UC4 Ver as métricas públicas"]):::ucPlan
    UC5(["UC5 Seguir o departamento"]):::ucDemo
    UC6(["UC6 Ver o perfil pessoal do chefe"]):::ucDemo
    UC7(["UC7 Enviar mensagem ao chefe"]):::ucPlan
    UC8(["UC8 Pedir ou propor chancela e indicar colega"]):::ucPlan
    UC9(["UC9 Gerir o departamento"]):::ucPlan
  end
  empregado -- "é um" --> autenticado
  chefe -- "é um" --> autenticado
  empresa -- "é um" --> autenticado
  visitante --- UC1
  visitante --- UC2
  visitante --- UC4
  autenticado --- UC1
  autenticado --- UC2
  autenticado --- UC4
  autenticado --- UC5
  autenticado --- UC6
  autenticado --- UC7
  empregado --- UC8
  chefe --- UC9
  empresa --- UC9
  curador --- UC9
  UC2 -. "«include»" .-> UC3
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Buscar e abrir a página do departamento | visitante, autenticado | RF14.CA01 | planejado (`GET /api/departments/{slug}`); cabeçalho DEMO no front |
| UC2 Navegar pelas sub-abas públicas | visitante, autenticado | RF14.CA02 | planejado (Sobre, Projetos, Sessões DECIA, Chancelas, Reconhecimentos, Equipe) |
| UC3 Filtrar itens pela visibilidade | — (incluído por UC2) | RF14.CA06 | planejado na página; a regra existe em `AccessPolicy.visible` (real para tarefas) |
| UC4 Ver as métricas públicas | visitante, autenticado | RF14.CA03 | planejado (`MetricSnapshot`; nunca dados nominais) |
| UC5 Seguir o departamento | autenticado | RF14.CA04 | planejado (`Follow`); botão DEMO no front |
| UC6 Ver o perfil pessoal do chefe | autenticado | RF14.CA01, RF14.CA05 | em curso (Onda 1): `GET /api/people/by-username/{username}` é real; `/u/[username]` ainda é DEMO |
| UC7 Enviar mensagem ao chefe | autenticado | RF14.CA05 | planejado (RF46) |
| UC8 Pedir ou propor chancela e indicar colega | empregado (membro do departamento) | RF14.CA05 | planejado (RF39.CA06) |
| UC9 Gerir o departamento | chefe, empresa (dona); curador só fila e premiação | RF14.CA05, RF14.CA06 | planejado (Minha equipe RF9/RF10, Dashboard do emissor, Insights da Equipe; `403` no serviço para os demais) |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class DepartmentPageController {
    <<controller>>
    +header(slug, viewer) DepartmentHeaderView
    +tab(id, tab, filters, viewer) Page
    +metrics(id, period, viewer) DepartmentMetricsView
  }
  class FollowController {
    <<controller>>
    +follow(FollowRequest, CurrentUser) FollowView
    +unfollow(targetType, targetId, CurrentUser) void
  }
  class DepartmentPageService {
    <<facade>>
    +header(slug, viewer) DepartmentHeaderView
    +tabsFor(department, viewer) List~TabKey~
    +tab(department, tab, filters, viewer) Page
    +actionsFor(department, viewer) List~Action~
  }
  class DepartmentMetricsService {
    <<service>>
    +publicMetrics(deptId, period, viewer) DepartmentMetricsView
  }
  class FollowService {
    <<service>>
    +follow(followerId, targetType, targetId) Follow
    +unfollow(followerId, targetType, targetId) void
  }
  class AccessPolicy {
    <<service>>
    +visibilityFilter(viewer, department) Set~Visibility~
    +roleOn(viewer, department) ViewerRole
  }
  class Guard {
    <<service>>
    +requireDeptHead(CurrentUser, Department) void
  }
  class DepartmentRepositoryPort {
    <<port>>
    +findBySlug(slug) Optional
  }
  class MembershipRepositoryPort {
    <<port>>
    +findCurrentByDept(deptId, page) Page
    +countCurrent(deptId) int
  }
  class ProjectRepositoryPort {
    <<port>>
    +findByDepartment(deptId, visibilities, filters) Page
  }
  class SessionRepositoryPort {
    <<port>>
    +findByDepartment(deptId, viewerScope) Page
  }
  class SealRepositoryPort {
    <<port>>
    +findActiveByDepartment(deptId) List
  }
  class RecognitionRepositoryPort {
    <<port>>
    +findPublicByIssuer(deptId) Page
  }
  class MetricSnapshotPort {
    <<port>>
    +latest(scope, scopeId, period) List~MetricSnapshot~
  }
  class FollowRepositoryPort {
    <<port>>
    +upsert(Follow) Follow
    +countFollowers(targetType, targetId) long
  }
  class CounterCachePort {
    <<port>>
    +getOrLoad(key, ttl, loader) Object
  }

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
  class Company {
    <<entity>>
    +UUID id
    +UUID ownerUserId
    +String legalName
    +String slug
    +String logoUrl
  }
  class User {
    <<entity>>
    +UUID id
    +String username
    +String fullName
    +String jobTitle
    +String avatarUrl
    +HypeVisibility hypeVisibility
  }
  class DepartmentMembership {
    <<entity>>
    +UUID userId
    +UUID departmentId
    +DeptRole roleInDept
    +Instant endedAt
  }
  class CuratorAppointment {
    <<entity>>
    +UUID curatorUserId
    +CuratorScope scope
    +Instant revokedAt
  }
  class ProjectScheme {
    <<entity>>
    +UUID departmentId
    +ProjectStatus status
    +ProjectPhase currentPhase
    +Visibility visibility
    +int exerciseYear
  }
  class DeciaSession {
    <<entity>>
    +UUID departmentId
    +SessionAccess accessMode
    +SessionStatus status
  }
  class Seal {
    <<entity>>
    +UUID departmentId
    +String name
    +SealTier tier
    +SealStatus status
  }
  class Recognition {
    <<entity>>
    +UUID issuerUserId
    +UUID recipientUserId
    +boolean publicOnMural
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
  class Follow {
    <<entity>>
    +UUID followerId
    +FollowTargetType targetType
    +UUID targetId
    +FollowStatus status
    +Instant at
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
  class CuratorScope {
    <<enum>>
    FILA_REVISAO
    PREMIACAO
    AMBOS
  }
  class ViewerRole {
    <<enum>>
    ANONIMO
    OUTRA_EMPRESA
    MESMA_EMPRESA
    MEMBRO
    CURADOR
    CHEFE
    EMPRESA_DONA
    ADMIN
  }

  DepartmentPageController --> DepartmentPageService
  DepartmentPageController --> DepartmentMetricsService
  FollowController --> FollowService
  DepartmentPageService --> AccessPolicy
  DepartmentPageService --> Guard
  DepartmentPageService --> DepartmentRepositoryPort
  DepartmentPageService --> MembershipRepositoryPort
  DepartmentPageService --> ProjectRepositoryPort
  DepartmentPageService --> SessionRepositoryPort
  DepartmentPageService --> SealRepositoryPort
  DepartmentPageService --> RecognitionRepositoryPort
  DepartmentPageService --> FollowRepositoryPort
  DepartmentMetricsService --> MetricSnapshotPort
  DepartmentMetricsService --> CounterCachePort
  FollowService --> FollowRepositoryPort
  AccessPolicy ..> ViewerRole
  Company "1" *-- "1..*" Department
  Department "1" --> "1" User : headUserId (chefe)
  Department "1" --> "0..*" DepartmentMembership : equipe (endedAt nulo)
  Department "1" --> "0..*" CuratorAppointment
  Department "1" --> "0..*" ProjectScheme
  Department "1" --> "0..*" DeciaSession
  Department "1" --> "0..*" Seal
  Department "1" --> "0..*" MetricSnapshot : scope DEPARTAMENTO
  Department "1" --> "0..*" Follow : targetType DEPARTMENT
  User "1" --> "0..*" Recognition : issuerUserId (chefe)
  Follow --> FollowTargetType
  Follow --> FollowStatus
  CuratorAppointment --> CuratorScope
  note for Follow "Único (followerId, targetType, targetId). Repetir Seguir é idempotente (200 com o mesmo registro)."
  class PeopleService {
    <<service>>
    +byUsername(CurrentUser, username) PublicProfileView
  }
  class PublicProfileView {
    <<value>>
    +String username
    +String fullName
    +String jobTitle
    +String avatarUrl
    +String profileType
    +UUID companyId
    +UUID departmentId
  }
  PeopleService ..> PublicProfileView
  User ..> PublicProfileView : projeção pública sem contato
  note for PeopleService "Real, em curso na Onda 1 (RF16). Fonte do cabeçalho público de pessoa do chefe. Conta não ACTIVE → 404 NAO_ENCONTRADO."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Visitante · Empregado · Membro · Chefe · EMPRESA dona"]
    A1["Busca o chefe/departamento (Buscar, lista da empresa, @sigla) e abre /departments/{slug}"]
    A2["Navega nas sub-abas e muda o período das métricas"]
    A3["Clica Seguir / Deixar de seguir"]
    A4["Aciona uma ação do seu papel (Pedir chancela, Mensagem ao chefe, Levar ao meu acervo, Gerir…)"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["GET /api/departments/{slug} → cabeçalho + tabs permitidas + ações por papel"]
    F2["GET /api/departments/{id}/tabs/{tab}?fase=&exercicio=&page= (URL reflete tab, filtros e página)"]
    F3["GET /api/departments/{id}/metrics?period="]
    F4["POST /api/follows {DEPARTMENT, id} · DELETE /api/follows/DEPARTMENT/{id}"]
    F5["Cabeçalho: Monogram na cor, Avatar do chefe, Counters, Button Seguir · Tabs · ProjectCard · Seal · Medal · Skeleton · EmptyState"]
  end
  subgraph WEB["ws-web"]
    W1["Rotas públicas de leitura (permitAll GET) · JWT opcional → viewer ou ANONIMO"]
    W2["DepartmentPageController · FollowController"]
    E404["404 DEPARTAMENTO_NAO_ENCONTRADO (slug inexistente ou active = false)"]
    E401["401 NAO_AUTENTICADO (Seguir ou ação sem login)"]
    E403["403 ACESSO_NEGADO (sub-aba de gestão sem ser chefe/dona · curador fora do escopo)"]
  end
  subgraph APP["ws-application"]
    S1["DepartmentRepositoryPort.findBySlug · active?"]
    S2["AccessPolicy.roleOn(viewer, department) → ANONIMO · OUTRA_EMPRESA · MESMA_EMPRESA · MEMBRO · CURADOR · CHEFE · EMPRESA_DONA · ADMIN"]
    S3["header: Department + chefe (User sem email/phone) + Company + contadores (membros vigentes, projetos publicados, decisões VALIDADAS, chancelas, seguidores)"]
    S4["tabsFor: Sobre · Projetos · Sessões DECIA · Chancelas · Reconhecimentos · Equipe (+ gestão só para CHEFE/EMPRESA_DONA; fila/premiação para CURADOR)"]
    S5["actionsFor por papel"]
    T1["tab: visibilityFilter → PUBLICA | +EMPRESA | +DEPARTAMENTO · Sessões: membro vê as suas, mesma empresa vê públicas/encerradas"]
    T2{"sub-aba de gestão?"}
    T3["Guard.requireDeptHead (ou curador no escopo)"]
    M1["DepartmentMetricsService: CounterCachePort metrics:department:{id}:{period} TTL 300 s → MetricSnapshot (DEPARTAMENTO) · sem HSE/Hype/DP nominais"]
    FO1["FollowService.follow: upsert único (idempotente) · status ATIVO | REMOVIDO"]
    EV["AFTER_COMMIT: Followed → TimelineEvent do seguidor recebe eventos do departamento (Mural › Seguindo, RF27) · contador de seguidores"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: departments, companies, users, department_memberships, curator_appointments, project_schemes, decia_sessions, seals, recognitions, metric_snapshots, follows")]
    P2[("Redis: metrics:department:{id}:{period} · contadores")]
    P3[("Cassandra: timeline_by_user")]
    P4[("OpenSearch ws-orgs (busca por sigla/nome/chefe, RF17)")]
  end

  A1 --> P4
  A1 --> F1 --> W1 --> W2 --> S1
  S1 -->|"não existe / inativo"| E404
  S1 --> S2 --> S3 --> S4 --> S5 --> F5
  S3 --> P1
  A2 --> F2 --> W2 --> T1 --> T2
  T2 -->|"sim"| T3
  T3 -->|"não autorizado"| E403
  T3 -->|"ok"| F5
  T2 -->|"não"| F5
  T1 --> P1
  A2 --> F3 --> W2 --> M1 --> P2
  M1 --> P1
  M1 --> F5
  A3 --> F4 --> W1
  W1 -->|"anônimo"| E401
  W2 --> FO1 --> P1
  FO1 --> EV --> P3
  EV --> P2
  A4 --> RF["RF39 chancelas · RF46 mensagem · RF41 levar ao acervo · RF9/RF10 Minha equipe · RF28 dashboard · RF43 insights · RF16 perfil pessoal"]
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
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: abre /departments/secid-uts (vindo da Buscar)
  N->>C: GET /api/departments/secid-uts (JWT opcional)
  C->>S: DepartmentPageService.header(slug, viewer)
  S->>R: departments.findBySlug
  alt slug inexistente ou active = false
    S-->>C: 404 DEPARTAMENTO_NAO_ENCONTRADO
    C-->>N: 404
  else ok
    S->>S: AccessPolicy.roleOn(viewer, department)
    S->>R: chefe (users.headUserId sem email/phone) · company · count memberships vigentes · projetos publicados · decisões VALIDADAS · chancelas · follows
    S->>S: tabsFor(role) · actionsFor(role)
    S-->>C: DepartmentHeaderView {header, tabs, actions, following}
    C-->>N: 200
    N-->>U: cabeçalho (Monogram, Avatar "Chefe de SECID-UTS", Counters, Seguir) + Tabs
  end

  U->>N: sub-aba Projetos do departamento, fase ELABORACAO
  N->>C: GET /api/departments/{id}/tabs/projetos?fase=ELABORACAO&page=0
  C->>S: DepartmentPageService.tab(department, projetos, filters, viewer)
  S->>S: visibilityFilter(viewer) → PUBLICA (+EMPRESA se mesma empresa, +DEPARTAMENTO se membro)
  S->>R: project_schemes do departamento filtrados
  S-->>C: Page ProjectCardView
  C-->>N: 200 (URL com tab, fase e page)

  U->>N: muda o período das métricas para 2025
  N->>C: GET /api/departments/{id}/metrics?period=2025
  C->>S: DepartmentMetricsService.publicMetrics(deptId, 2025, viewer)
  S->>RD: GET metrics:department:{id}:2025
  alt cache frio
    S->>R: metric_snapshots (scope DEPARTAMENTO, período)
    S->>RD: SET metrics:department:{id}:2025 TTL 300 s
  end
  S-->>C: DepartmentMetricsView (projetos publicados, modelos oficiais, decisões validadas, tempo médio até decisão, pessoas) — sem HSE/Hype/DP nominais
  C-->>N: 200

  U->>N: clica Seguir
  alt visitante anônimo
    N-->>U: 401 NAO_AUTENTICADO → convite a entrar
  else autenticado
    N->>C: POST /api/follows {DEPARTMENT, id}
    C->>S: FollowService.follow(viewer, DEPARTMENT, id)
    S->>R: upsert follows (único — repetir devolve o mesmo registro, status ATIVO)
    S-->>C: FollowView
    C-->>N: 200
    EV->>CS: timeline_by_user do seguidor passa a receber eventos do departamento (Mural › Seguindo)
    EV->>RD: INCR followers:department:{id}
  end

  U->>N: abre a sub-aba de gestão (fila de revisão de chancelas)
  N->>C: GET /api/departments/{id}/tabs/fila-revisao
  C->>S: DepartmentPageService.tab(…)
  S->>S: Guard.requireDeptHead ou curador com escopo FILA_REVISAO
  alt sem papel
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403 (sub-aba nem aparece no menu)
  else autorizado
    S-->>C: Page (fila, RF39)
    C-->>N: 200
  end
```

## 4. Máquina de estados

Entidade central: **`Follow.status`** (`FollowStatus`, TAXONOMIA §8.6) — a única entidade com estado que este RF cria/altera (CA04). `Department.active` (CA01) e o papel do viewer (`ViewerRole`, derivado) são leituras.

```mermaid
stateDiagram-v2
  direction LR
  state "Follow" as F {
    state "SEM_FOLLOW (não existe linha)" as SEM
    state "ATIVO" as ATV
    state "REMOVIDO" as REM
    [*] --> SEM
    SEM --> ATV : POST /api/follows {DEPARTMENT, id} (CA04) · único (followerId, targetType, targetId) · Followed → Mural › Seguindo
    ATV --> ATV : POST repetido → 200 com o mesmo registro (idempotente)
    ATV --> REM : DELETE /api/follows/DEPARTMENT/{id} · status REMOVIDO (linha mantida)
    REM --> ATV : Seguir de novo → status ATIVO na mesma linha
  }
  state "Department.active (leitura)" as D {
    state "ATIVO (página pública)" as DA
    state "INATIVO (404 DEPARTAMENTO_NAO_ENCONTRADO)" as DI
    [*] --> DA : criado pela EMPRESA (RF28.CA02)
    DA --> DI : EMPRESA desativa (RF28)
    DI --> DA : EMPRESA reativa
  }
  note right of ATV
    Visitante anônimo: 401 NAO_AUTENTICADO.
    Eventos do departamento (projeto publicado, decisão validada,
    reconhecimento) entram na TimelineEvent do seguidor.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/departments/[slug] · ?tab=sobre|projetos|sessoes|chancelas|reconhecimentos|equipe (+ gestão)"]
    UI["packages/ui: Avatar/Monogram (cor do departamento), Counters, Button (Seguir), Tabs, ProjectCard (mural), Seal, Medal, Tag, Skeleton, EmptyState"]
    SN["TopBar (busca global) · SidebarNav › Descobrir › Buscar · bottom-nav"]
    BFF["app/bff/departments/* · app/bff/follows/*"]
    SR["lib/social/rules.ts + view-model.ts: contadores e composição só do visível (real no front, b602d34)"]
    PG --> SR
    PG --> UI
    PG --> BFF
    SN --> PG
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig: GET públicos (permitAll) + JWT opcional · SessionActiveFilter · CurrentUserArgumentResolver"]
    DC["DepartmentPageController · FollowController"]
    GEH["GlobalExceptionHandler (401, 403, 404)"]
  end
  subgraph WSAPP["ws-application"]
    DP["org: DepartmentPageService (Facade) · DepartmentMetricsService"]
    SOC["social: FollowService"]
    SECU["security: AccessPolicy.roleOn/visibilityFilter · Guard.requireDeptHead"]
    PORTS["ports: DepartmentRepositoryPort · MembershipRepositoryPort · ProjectRepositoryPort · SessionRepositoryPort · SealRepositoryPort · RecognitionRepositoryPort · MetricSnapshotPort · FollowRepositoryPort · CounterCachePort"]
    EVT["events: Followed · Unfollowed (AFTER_COMMIT)"]
    PPL["people: PeopleService.byUsername → PublicProfileView (real, em curso, Onda 1) · cabeçalho público do chefe como pessoa"]
    PPL --> PORTS
    DP --> SECU
    DP --> PORTS
    SOC --> PORTS
    SOC --> EVT
  end
  subgraph WSDOM["ws-domain"]
    DOM["identity: Company · Department · DepartmentMembership · CuratorAppointment · User (real) · projects: ProjectScheme · decia: DeciaSession · seals: Seal · Recognition · social: Follow · metrics: MetricSnapshot · enums FollowStatus/FollowTargetType/CuratorScope"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: Jpa*Repository · Flyway V__rf28_companies_departments"]
    RDS["cache-redis: metrics:department:{id}:{period} TTL 300 s · followers"]
    CAS["persistence-cassandra: timeline_by_user (Seguindo)"]
    OSE["search-opensearch: ws-orgs (RF17)"]
  end

  BFF -->|"REST JSON"| SEC --> DC --> DP
  DC --> SOC
  DC --> GEH
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  CAS -.implementa.-> PORTS
  OSE -.implementa.-> PORTS
  DP --> DOM
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  CAS --> CDB[("Cassandra 4.1")]
  OSE --> OSX[("OpenSearch 2.19")]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF14.CA01 | `DepartmentPageController.header`, `DepartmentPageService.header`, `Department`, `User.headUserId`, `Company`, `FollowRepositoryPort.countFollowers` | `A1`→`F1`→`S1`→`S3`→`F5`, `E404` | 1–11 | `DA`/`DI` | `PG`, `UI` (`Monogram`, `Avatar`, `Counters`), `OSE`, `PPL`, `SR` | planejado; bloco do chefe com fonte **real (em curso, Onda 1)**: `PeopleService.byUsername` → `PublicProfileView` (`GET /api/people/by-username/{username}`, `PeopleServiceTest`); contadores do front respeitam a ACL (`b602d34`); **Real (31/10/2026):** `GET /api/departments/{slug}` (`InstitutionController` → `InstitutionPageService.department` → `DepartmentPageView`; `?company=` desambigua o slug, único só dentro da empresa; sem ele vale o da empresa de quem vê) devolve sigla, nome, cor, monograma, sobre, capa (só `https://`/caminho interno), chefe (`PersonCard`, projeção pública sem contato, escondido se o controle de publicação do RF3 não deixar ver), empresa com link e contadores do servidor: pessoas com conta ATIVA e lotação vigente (`InstitutionDirectoryPort.countActiveMembers`) e seguidores ATIVOS; inexistente, inativo, ambíguo ou de empresa não visível → o MESMO `404 NAO_ENCONTRADO` (`ResourceAuthorizer.requireDepartmentVisible`). Visibilidade: qualquer conta autenticada. Tela real fora do laboratório (`components/institutional/DepartmentPage`); projetos, decisões e chancelas ainda sem fonte real não aparecem nos contadores. |
| RF14.CA02 | `DepartmentPageService.tabsFor/tab`, `ProjectRepositoryPort`, `SessionRepositoryPort`, `SealRepositoryPort`, `RecognitionRepositoryPort`, `MembershipRepositoryPort`, `CuratorAppointment` | `A2`→`F2`→`T1`→`F5` | 12–17 | — | `DP`, `UI` (`Tabs`, `ProjectCard`, `Seal`, `Medal`) | planejado; **Real (31/10/2026):** sub-aba **Sobre** (texto do departamento) e **Equipe** por `GET /api/departments/{slug}/members` (pessoas ATIVAS com lotação vigente, papel mais forte, chefia primeiro; só quem o controle de publicação do RF3 deixa ver; sem contato). Demais sub-abas seguem planejadas. |
| RF14.CA03 | `DepartmentMetricsService.publicMetrics`, `MetricSnapshotPort`, `MetricSnapshot`, `CounterCachePort` | `F3`→`M1` | 18–25 | — | `RDS`, `MY` (`metric_snapshots`) | planejado (RF28.CA04, RF45.CA10) |
| RF14.CA04 | `FollowController`, `FollowService.follow/unfollow`, `Follow`, `FollowStatus` | `A3`→`F4`→`FO1`→`EV`, `E401` | 26–35 | `SEM`→`ATV`→`REM`→`ATV` | `SOC`, `EVT`, `CAS` | planejado (RF27.CA06); **Real (31/10/2026):** `GET/PUT/DELETE /api/departments/{slug}/follow` (`FollowService.departmentStatus/followDepartment/unfollowDepartment`, `Follow` DEPARTMENT): idempotente, reativável (uma linha por par), contador só do ATIVO, departamento não visível → 404; botão com `aria-pressed` (`FollowInstitutionButton`). Eventos no Mural seguem planejados. |
| RF14.CA05 | `DepartmentPageService.actionsFor`, `AccessPolicy.roleOn`, `ViewerRole` | `S5`, `A4`→`RF` | 8–10 | — | `DP`, `UI` (`Button`) | planejado (RF39, RF46, RF41, RF9/RF10, RF28, RF43, RF16) |
| RF14.CA06 | `AccessPolicy.visibilityFilter`, `Guard.requireDeptHead`, `CuratorScope`, `User` sem `email`/`phone` na API | `T1`→`T2`→`T3`→`E403` | 14, 36–43 | — | `SECU`, `GEH`, `PPL`, `SR` | planejado (`Guard` base real); `PublicProfileView` sem contato **(real, em curso, Onda 1)**; contadores filtrados no front (`lib/social/rules.ts`, `b602d34`); **Real (31/10/2026):** `PersonCard` (chefe e equipe) não tem e-mail nem telefone; a equipe e o chefe respeitam o controle de publicação do RF3 (perfil "só minha empresa" some para quem é de fora); `InstitutionAndProfileVisibilityWebTest` confere. |
