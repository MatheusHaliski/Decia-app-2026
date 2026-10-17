# RF9 — Permitir que um chefe de departamento possa adicionar ou remover um usuário da sua lista de empregados atuais
**HU:** HU9 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (o card "SPRINT 2" cita "RF9 Adicionar/remover usuários" da **sessão DECIA**, escopo antigo preservado em `_anterior/RF9`; fase (g) da ARQUITETURA §6: "RF9/RF10/RF46 (equipe, atribuição, chat)") · **Equivalente FAI:** RF22 Perfil institucional (celebridade) — abas "do administrador" negadas no serviço (`guard.deny`); o FAI não tem lotação de pessoas, a gestão de equipe é nova · **Aba/rota:** página do departamento `/departments/[slug]` → aba **Equipe** → modo **Minha equipe (gestão)** só para o chefe (`/departments/[slug]/team?mode=manage`); atalho **Minha equipe** no grupo Gestão do `SidebarNav` (ABAS_POR_PERFIL §1.2, §7.b); API `GET /api/departments/{id}/members`, `GET /api/departments/{id}/members/history`, `POST /api/departments/{id}/members`, `DELETE /api/departments/{id}/members/{userId}`, `GET /api/departments/{id}/members/{userId}/pending`
**Critérios de aceite cobertos:** RF9.CA01 … RF9.CA06 — **todos "(CA a confirmar)"**: o corpo do card está vazio e o **escopo é novo**; os CAs foram derivados do título + HU9 e reaproveitam RF28.CA02 (lotação 1 por vez com histórico em `DepartmentMembership`), RF28.CA03 (auditoria do chefe), o guard `requireDeptHead` e a aba "Minha equipe" propostos em `docs/produto/ABAS_POR_PERFIL.md`. Todas as classes do RF são **(planejado)**; reais: `Guard.requireRole/ownerOrAdmin`, `User.companyId/departmentId` (colunas sem FK até o RF28, D-23), `AuditLogPort`, `SecurityConfig`.

> **HU9** — COMO chefe de departamento de uma empresa POSSO adicionar ou remover um usuário de minha lista de empregados ativos PARA melhorar a minha gestão empresarial.

## Critérios de aceite derivados da HU9 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) | Origem |
|---|---|---|
| **RF9.CA01** (CA a confirmar) | Dado um CHEFE_DEPARTAMENTO com `Department.headUserId == eu` (ou EMPRESA dona da `Company`, ou ADMIN — `Guard.requireDeptHead`), quando abro a aba Equipe no modo **Minha equipe**, então vejo os `DepartmentMembership` vigentes (nome, username, `jobTitle`, `roleInDept`, `startedAt`, etiqueta Curador) com busca e paginação (> 50), mais o histórico de lotações encerradas; quem não é chefe vê só a lista pública (RF14) e a API de gestão responde `403 ACESSO_NEGADO`. | ABAS §7.b, RF28.CA02 |
| **RF9.CA02** (CA a confirmar) | Dado o modo gestão, quando **adiciono** um usuário (busca por nome/username na mesma `Company`, `AccountStatus ACTIVE`), então nasce um `DepartmentMembership` MEMBRO com `startedAt`, a lotação vigente anterior (em outro departamento) é encerrada com `endedAt` e `reason TRANSFERENCIA` e `User.departmentId` passa a ser o meu departamento; já membro vigente → `409 MEMBRO_DUPLICADO`; usuário de outra empresa, não ACTIVE ou perfil EMPRESA → `422 VALIDACAO`. | RF28.CA02 (1 lotação por vez) |
| **RF9.CA03** (CA a confirmar) | Dado um membro vigente, quando **removo** informando `reason` (obrigatório, `422 VALIDACAO`), então o `DepartmentMembership` recebe `endedAt` e `reason` (sem apagar), `User.departmentId` fica nulo, o `CuratorAppointment` vigente dele é revogado (`revokeReason` = saída do departamento) e suas tarefas/projetos **permanecem** com o dono; remover o próprio chefe (`headUserId`) → `409 CHEFE_NAO_REMOVIVEL` (trocar o chefe é RF28). | RF28.CA02/CA03 |
| **RF9.CA04** (CA a confirmar) | Dado que o removido tem pendências (responsável em `ProjectTask` aberta, `TaskItem` EM_USO/BLOQUEADA como responsável, `SessionParticipant` em sessão ATIVA, `SealBond` EM_REVISAO de que é alvo, `Assignment` ACEITA), quando confirmo a remoção, então o sistema lista as pendências (`GET …/pending`) e oferece **gerar Dossiê de Transição** (`HandoffDossier` reason TRANSFERENCIA/SAIDA, RF36) ou **transferir** para outro membro; sem escolha, a remoção prossegue e as pendências ficam marcadas "sem responsável no departamento". | RF36, RF10 |
| **RF9.CA05** (CA a confirmar) | Dado a inclusão ou remoção, então `MemberAdded`/`MemberRemoved` (AFTER_COMMIT) gravam `AuditLog MEMBER_ADDED/MEMBER_REMOVED` com `correlationId`, notificam o empregado (`Notification` tipo SISTEMA, categoria SISTEMA: "você foi adicionado/removido do departamento X", com motivo), invalidam o cache Redis de métricas/contadores do departamento e atualizam a aba pública Equipe e a página da empresa (RF14/RF15). | RF28.CA03 |
| **RF9.CA06** (CA a confirmar) | Dado o histórico, então re-adicionar alguém cria um **novo** `DepartmentMembership` (o anterior permanece encerrado), a linha do tempo de lotações aparece no modo gestão e no perfil do empregado (empresa/departamento atual, RF16), e todas as mensagens são i18n (pt-BR/en/es). | RF28.CA02 (histórico) |

## 0. Diagrama de casos de uso

Quem gere a lista de empregados de um departamento e o que cada um consegue fazer. Borda contínua: existe no código em 17/10/2026; tracejada: planejado (a gestão de equipe é escopo novo e a aba Minha equipe ainda é esqueleto).

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  chefe["«ator» Chefe de departamento"]:::ator
  empresa["«ator» Empresa ou órgão"]:::ator
  admin["«ator» Administrador"]:::ator
  empregado["«ator» Empregado"]:::ator
  subgraph SIS["Work Station — RF9 Minha equipe"]
    direction TB
    UC1(["UC1 Ver minha equipe e o histórico"]):::ucPlan
    UC2(["UC2 Adicionar empregado ao departamento"]):::ucPlan
    UC3(["UC3 Remover empregado do departamento"]):::ucPlan
    UC4(["UC4 Tratar as pendências de quem sai"]):::ucPlan
    UC5(["UC5 Verificar a chefia do departamento"]):::ucPlan
    UC6(["UC6 Ver minhas lotações"]):::ucPlan
  end
  chefe --- UC1
  chefe --- UC2
  chefe --- UC3
  empresa --- UC1
  admin --- UC1
  empregado --- UC6
  UC1 -. "«include»" .-> UC5
  UC2 -. "«include»" .-> UC5
  UC3 -. "«include»" .-> UC5
  UC4 -. "«extend»" .-> UC3
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Ver minha equipe e o histórico | chefe; empresa e admin só veem (ABAS_POR_PERFIL §2.5) | RF9.CA01, RF9.CA06 | planejado (`GET /api/departments/{id}/members`) |
| UC2 Adicionar empregado ao departamento | chefe | RF9.CA02, RF9.CA05, RF9.CA06 | planejado (`DepartmentMembership`; `409 MEMBRO_DUPLICADO`) |
| UC3 Remover empregado do departamento | chefe | RF9.CA03, RF9.CA05 | planejado (motivo obrigatório; revoga o curador; `409 CHEFE_NAO_REMOVIVEL`) |
| UC4 Tratar as pendências de quem sai | chefe | RF9.CA04 | planejado (Dossiê de Transição RF36 ou transferência) |
| UC5 Verificar a chefia do departamento | — (incluído por UC1, UC2, UC3) | RF9.CA01 | planejado (`Guard.requireDeptHead`; o CA também admite a EMPRESA dona e o ADMIN) |
| UC6 Ver minhas lotações | empregado | RF9.CA05, RF9.CA06 | planejado (linha do tempo no perfil, RF16; aviso por notificação) |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class DepartmentMembersController {
    <<controller>>
    +list(deptId, q, page, CurrentUser) Page~MemberView~
    +history(deptId, page, CurrentUser) Page~MembershipView~
    +add(deptId, AddMemberRequest, CurrentUser, ctx) MemberView
    +pending(deptId, userId, CurrentUser) PendingSummary
    +remove(deptId, userId, RemoveMemberRequest, CurrentUser, ctx) void
  }
  class TeamService {
    <<service>>
    +listMembers(deptId, q, page, actor) Page
    +history(deptId, page, actor) Page
    +addMember(deptId, userId, actor, ctx) DepartmentMembership
    +removeMember(deptId, userId, reason, handoff, actor, ctx) void
    +pendingOf(deptId, userId) PendingSummary
  }
  class Guard {
    <<service>>
    +requireRole(CurrentUser, Role) void
    +ownerOrAdmin(CurrentUser, ownerId) void
    +requireDeptHead(CurrentUser, Department) void
  }
  class CuratorService {
    <<service>>
    +revokeOnLeave(userId, deptId, reason) void
  }
  class HandoffService {
    <<service>>
    +generate(subjectUserId, reason, requestedBy) HandoffDossier
  }
  class DepartmentRepositoryPort {
    <<port>>
    +findById(id) Optional
    +findBySlug(slug) Optional
  }
  class MembershipRepositoryPort {
    <<port>>
    +findCurrent(userId) Optional
    +findCurrentByDept(deptId, q, page) Page
    +findHistoryByDept(deptId, page) Page
    +save(DepartmentMembership) DepartmentMembership
  }
  class UserRepositoryPort {
    <<port>>
    +findById(id) Optional
    +searchInCompany(companyId, q) List
    +save(User) User
  }
  class PendingWorkPort {
    <<port>>
    +openProjectTasks(userId) int
    +tasksInUse(userId) int
    +activeSessions(userId) int
    +sealBondsInReview(userId) int
    +acceptedAssignments(userId) int
  }
  class NotificationPort {
    <<port>>
    +notify(Notification) void
  }
  class CounterCachePort {
    <<port>>
    +evict(key) void
  }

  class Company {
    <<entity>>
    +UUID id
    +UUID ownerUserId
    +String legalName
    +String slug
    +String status
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
    +boolean active
  }
  class DepartmentMembership {
    <<entity>>
    +UUID id
    +UUID userId
    +UUID departmentId
    +DeptRole roleInDept
    +Instant startedAt
    +Instant endedAt
    +String reason
  }
  class User {
    <<entity>>
    +UUID id
    +String username
    +String fullName
    +String jobTitle
    +ProfileType profileType
    +AccountStatus status
    +UUID companyId
    +UUID departmentId
  }
  class CuratorAppointment {
    <<entity>>
    +UUID departmentId
    +UUID curatorUserId
    +Instant revokedAt
    +String revokeReason
    +CuratorScope scope
  }
  class HandoffDossier {
    <<entity>>
    +UUID subjectUserId
    +HandoffReason reason
    +HandoffStatus status
    +UUID successorUserId
  }
  class Notification {
    <<entity>>
    +UUID recipientId
    +NotificationType type
    +String category
    +String title
    +String body
  }
  class AuditLog {
    <<entity>>
    +UUID actorId
    +String action
    +String resourceType
    +String resourceId
    +String correlationId
  }
  class DeptRole {
    <<enum>>
    MEMBRO
    CHEFE
    CURADOR
  }
  class HandoffReason {
    <<enum>>
    SAIDA
    TRANSFERENCIA
    FIM_GESTAO
    TROCA_CHEFE
  }
  class ProfileType {
    <<enum>>
    EMPREGADO
    EMPRESA
    CHEFE_DEPARTAMENTO
  }

  DepartmentMembersController --> TeamService
  TeamService --> Guard
  TeamService --> CuratorService
  TeamService --> HandoffService
  TeamService --> DepartmentRepositoryPort
  TeamService --> MembershipRepositoryPort
  TeamService --> UserRepositoryPort
  TeamService --> PendingWorkPort
  TeamService --> NotificationPort
  TeamService --> CounterCachePort
  Company "1" *-- "1..*" Department
  Company "1" --> "1" User : ownerUserId (EMPRESA)
  Department "1" --> "1" User : headUserId (CHEFE)
  Department "1" --> "0..*" DepartmentMembership : histórico de lotações
  User "1" --> "0..*" DepartmentMembership : no máximo 1 vigente (endedAt nulo)
  User "0..*" --> "0..1" Department : departmentId = lotação atual
  Department "1" --> "0..*" CuratorAppointment
  HandoffDossier "0..*" --> "1" User : subjectUserId
  DepartmentMembership --> DeptRole
  HandoffDossier --> HandoffReason
  User --> ProfileType
  TeamService ..> Notification
  TeamService ..> AuditLog : MEMBER_ADDED / MEMBER_REMOVED
  note for DepartmentMembership "Invariante: por userId existe no máximo uma linha com endedAt nulo. Re-adicionar cria linha nova (CA06). FK users.department_id → departments RESTRICT entra no RF28 (D-23)."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Chefe de departamento (headUserId) · EMPRESA dona · ADMIN"]
    A1["Abre /departments/{slug}/team?mode=manage (atalho Minha equipe no grupo Gestão)"]
    A2["Busca um colega da mesma empresa e clica Adicionar"]
    A3["Clica Remover num membro vigente e informa o motivo"]
    A4["Escolhe o destino das pendências: gerar Dossiê de Transição · transferir para colega · prosseguir"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["GET /api/departments/{id}/members?q=&page= · GET …/members/history"]
    F2["GET /api/users/search?companyId=&q= (ACTIVE)"]
    F3["POST /api/departments/{id}/members {userId}"]
    F4["GET /api/departments/{id}/members/{userId}/pending → Dialog com pendências"]
    F5["DELETE /api/departments/{id}/members/{userId} {reason, handoff: DOSSIE | TRANSFER:{toUserId} | NONE}"]
    F6["Lista com Avatar/Monogram, jobTitle, roleInDept, Tag Curador, startedAt · linha do tempo do histórico"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["DepartmentMembersController"]
    E403["403 ACESSO_NEGADO (não é headUserId, nem dono da Company, nem ADMIN)"]
    E422["422 VALIDACAO (outra empresa · não ACTIVE · perfil EMPRESA · reason vazio)"]
    E409D["409 MEMBRO_DUPLICADO"]
    E409C["409 CHEFE_NAO_REMOVIVEL"]
    E404["404 DEPARTAMENTO_NAO_ENCONTRADO / USUARIO_NAO_ENCONTRADO"]
  end
  subgraph APP["ws-application · TeamService"]
    S1["Guard.requireDeptHead(actor, department)"]
    S2{"autorizado?"}
    S3["listMembers / history (MembershipRepositoryPort)"]
    ADD1["Valida alvo: mesma companyId · ACTIVE · profileType != EMPRESA"]
    ADD2{"já vigente neste departamento?"}
    ADD3["Encerra lotação vigente em outro departamento (endedAt, reason TRANSFERENCIA)"]
    ADD4["DepartmentMembership(MEMBRO, startedAt) · User.departmentId = deptId · AuditLog MEMBER_ADDED"]
    REM1{"userId == headUserId?"}
    REM2["pendingOf: ProjectTask abertas · TaskItem EM_USO/BLOQUEADA · SessionParticipant ATIVA · SealBond EM_REVISAO · Assignment ACEITA"]
    REM3{"há pendências?"}
    REM4["HandoffService.generate(SAIDA | TRANSFERENCIA) (RF36) ou transferência de responsáveis · ou marca 'sem responsável no departamento'"]
    REM5["membership.endedAt + reason · User.departmentId = null · CuratorService.revokeOnLeave · AuditLog MEMBER_REMOVED · tarefas/projetos ficam com o dono"]
    EV["AFTER_COMMIT: MemberAdded/MemberRemoved → Notification SISTEMA ao empregado (com motivo) · CounterCachePort.evict(metrics:department:{id}) · reindexa aba Equipe (RF14) e página da empresa (RF15)"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: departments, department_memberships, users (department_id), curator_appointments, handoff_dossiers, audit_log")]
    P2[("Redis: metrics:department:{id}:* · contadores")]
    P3[("Cassandra notifications_by_user · timeline_by_user")]
  end

  A1 --> F1 --> W1 --> W2 --> S1 --> S2
  S2 -->|"não"| E403
  S2 -->|"sim"| S3 --> F6
  S3 --> P1
  A2 --> F2 --> F3 --> W2 --> ADD1
  ADD1 -->|"inválido"| E422
  ADD1 --> ADD2
  ADD2 -->|"sim"| E409D
  ADD2 -->|"não"| ADD3 --> ADD4 --> P1
  ADD4 --> EV
  A3 --> F4 --> REM2
  F4 --> F5 --> W2 --> REM1
  REM1 -->|"sim"| E409C
  REM1 -->|"não"| REM2 --> REM3
  REM3 -->|"sim"| A4 --> REM4 --> REM5
  REM3 -->|"não"| REM5
  F5 -->|"reason vazio"| E422
  REM5 --> P1
  REM5 --> EV
  EV --> P2
  EV --> P3
  W2 -->|"slug/usuário inexistente"| E404
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (chefe)
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant R as Repository/MySQL
  participant RD as Redis
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: abre Minha equipe (modo gestão)
  N->>C: GET /api/departments/{id}/members?q=&page=0
  C->>S: TeamService.listMembers(deptId, q, page, actor)
  S->>R: departments.findById
  S->>S: Guard.requireDeptHead(actor, department)
  alt não é chefe, dona da empresa nem ADMIN
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403 (tela mostra só a lista pública, RF14)
  else autorizado
    S->>R: department_memberships vigentes (endedAt nulo) + users + curator_appointments
    S-->>C: Page MemberView
    C-->>N: 200 (lista com busca e paginação)
  end

  U->>N: busca "maria" e clica Adicionar
  N->>C: POST /api/departments/{id}/members {userId}
  C->>S: TeamService.addMember(deptId, userId, actor, ctx)
  S->>R: users.findById(userId)
  alt outra empresa, não ACTIVE ou perfil EMPRESA
    S-->>C: 422 VALIDACAO details.userId
    C-->>N: 422
  else já membro vigente deste departamento
    S->>R: findCurrent(userId) = mesmo deptId
    S-->>C: 409 MEMBRO_DUPLICADO
    C-->>N: 409
  else ok
    S->>R: findCurrent(userId) em outro departamento → endedAt = now, reason TRANSFERENCIA
    S->>R: insert department_memberships (MEMBRO, startedAt = now)
    S->>R: update users.department_id = deptId
    S->>R: insert audit_log MEMBER_ADDED {deptId, userId, correlationId}
    S-->>C: MemberView
    C-->>N: 201
    EV->>CS: notifications_by_user SISTEMA "você foi adicionado ao departamento X"
    EV->>RD: evict metrics:department:{id}:*
  end

  U->>N: clica Remover em um membro
  N->>C: GET /api/departments/{id}/members/{userId}/pending
  C->>S: TeamService.pendingOf(deptId, userId)
  S->>R: PendingWorkPort (ProjectTask abertas, EM_USO/BLOQUEADA, sessões ATIVAS, SealBond EM_REVISAO, Assignment ACEITA)
  S-->>C: PendingSummary
  C-->>N: 200 → Dialog "pendências encontradas"
  U->>N: informa motivo e escolhe "gerar Dossiê de Transição"
  N->>C: DELETE /api/departments/{id}/members/{userId} {reason, handoff: DOSSIE}
  C->>S: TeamService.removeMember(deptId, userId, reason, DOSSIE, actor, ctx)
  alt userId é o próprio headUserId
    S-->>C: 409 CHEFE_NAO_REMOVIVEL (trocar o chefe é RF28)
    C-->>N: 409
  else reason vazio
    S-->>C: 422 VALIDACAO details.reason
    C-->>N: 422
  else ok
    S->>S: HandoffService.generate(userId, TRANSFERENCIA, actor) (RF36)
    S->>R: insert handoff_dossiers
    S->>R: update department_memberships.endedAt, reason
    S->>R: update users.department_id = null
    S->>R: update curator_appointments.revokedAt, revokeReason = "saída do departamento"
    S->>R: insert audit_log MEMBER_REMOVED {reason, handoffId, correlationId}
    Note over S,R: tarefas e projetos permanecem com o dono (ownerId não muda)
    S-->>C: 204
    C-->>N: 204 (linha vai para o histórico)
    EV->>CS: notifications_by_user SISTEMA "você foi removido do departamento X" + motivo
    EV->>RD: evict metrics:department:{id}:*
  end
```

## 4. Máquina de estados

Entidade central: **`DepartmentMembership`** (TAXONOMIA §1.6) — estados derivados de `endedAt` (não há enum): **VIGENTE** (`endedAt` nulo) e **ENCERRADA** (`endedAt` + `reason`). A invariante "no máximo uma VIGENTE por `userId`" é garantida pelo `TeamService` (e, no RF28, por índice parcial). `DeptRole` muda por nomeação (CHEFE/CURADOR, RF28), não por este RF.

```mermaid
stateDiagram-v2
  direction LR
  state "SEM_LOTACAO (User.departmentId nulo)" as SEM
  state "VIGENTE (DepartmentMembership.endedAt nulo)" as VIG
  state "ENCERRADA (endedAt + reason)" as ENC
  state "VIGENTE em outro departamento" as OUTRO

  [*] --> SEM : cadastro EMPREGADO (RF1) · intendedDepartmentId não lota (RF1.CA23)
  SEM --> VIG : POST /api/departments/{id}/members pelo chefe (CA02) · MEMBRO · User.departmentId = deptId · MEMBER_ADDED
  OUTRO --> ENC : chefe de outro departamento adiciona → lotação anterior encerra com reason TRANSFERENCIA (CA02)
  VIG --> ENC : DELETE …/members/{userId} com reason (CA03) · User.departmentId = null · curadoria revogada · MEMBER_REMOVED
  ENC --> SEM : efeito imediato da remoção
  ENC --> VIG : re-adicionar cria NOVA linha (CA06) — a encerrada permanece no histórico
  VIG --> VIG : nomeação CHEFE/CURADOR (RF28) muda roleInDept, não a lotação
  VIG --> OUTRO : transferência iniciada pelo chefe de outro departamento
  note right of VIG
    headUserId não pode ser removido aqui:
    409 CHEFE_NAO_REMOVIVEL (troca de chefe = RF28).
  end note
  note right of ENC
    Pendências do removido → HandoffDossier (RF36)
    ou transferência de responsável (CA04).
    Tarefas e projetos ficam com o dono.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/departments/[slug]/team · ?mode=manage"]
    UI["packages/ui: Tabs (Equipe · Histórico), Input (busca), Avatar/Monogram, Tag (Curador), Button, Dialog (motivo + pendências), Toast, EmptyState"]
    SN["SidebarNav › Gestão › Minha equipe (só CHEFE / EMPRESA / ADMIN, P-15)"]
    BFF["app/bff/departments/*"]
    PG --> UI
    PG --> BFF
    SN --> PG
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    DC["DepartmentMembersController"]
    GEH["GlobalExceptionHandler (403, 404, 409, 422)"]
  end
  subgraph WSAPP["ws-application"]
    TS["identity/org: TeamService"]
    GD["security.Guard (real: requireRole, ownerOrAdmin · planejado: requireDeptHead)"]
    CUR["seals: CuratorService.revokeOnLeave"]
    HO["handoff: HandoffService (RF36)"]
    PORTS["ports: DepartmentRepositoryPort · MembershipRepositoryPort · UserRepositoryPort (real) · PendingWorkPort · NotificationPort · CounterCachePort · AuditLogPort (real)"]
    EVT["events: MemberAdded · MemberRemoved (AFTER_COMMIT)"]
    TS --> GD
    TS --> CUR
    TS --> HO
    TS --> PORTS
    TS --> EVT
  end
  subgraph WSDOM["ws-domain"]
    DOM["identity: User (real) · Company · Department · DepartmentMembership · CuratorAppointment · enums DeptRole/CuratorScope · handoff: HandoffDossier · social: Notification"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: UserEntity (real) · JpaDepartmentRepository · JpaMembershipRepository · Flyway V__rf28_companies_departments (FK RESTRICT em users.department_id, D-23)"]
    RDS["cache-redis: metrics:department:{id}, contadores"]
    CAS["persistence-cassandra: notifications_by_user, timeline_by_user"]
    OSE["search-opensearch: ws-people (lotação atual)"]
  end

  BFF -->|"REST JSON"| SEC --> DC --> TS
  DC --> GEH
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  CAS -.implementa.-> PORTS
  OSE -.implementa.-> PORTS
  TS --> DOM
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  CAS --> CDB[("Cassandra 4.1")]
  OSE --> OSX[("OpenSearch 2.19")]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF9.CA01 | `DepartmentMembersController.list/history`, `TeamService.listMembers/history`, `Guard.requireDeptHead`, `MembershipRepositoryPort.findCurrentByDept` | `A1`→`F1`→`S1`→`S2`→`S3`→`F6`, `E403` | 1–11 | — | `PG`, `SN`, `GD`, `UI` | planejado (`Guard` base real) |
| RF9.CA02 | `TeamService.addMember`, `DepartmentMembership`, `User.departmentId`, `UserRepositoryPort.searchInCompany` | `A2`→`F2`→`F3`→`ADD1`→`ADD4`, `E422`, `E409D` | 12–26 | `SEM`→`VIG`, `OUTRO`→`ENC` | `TS`, `MY` | planejado (RF28.CA02) |
| RF9.CA03 | `TeamService.removeMember`, `CuratorService.revokeOnLeave`, `CuratorAppointment.revokeReason` | `A3`→`F5`→`REM1`→`REM5`, `E409C`, `E422` | 36–47 | `VIG`→`ENC`→`SEM` | `TS`, `CUR` | planejado (RF28.CA03) |
| RF9.CA04 | `TeamService.pendingOf`, `PendingWorkPort`, `HandoffService.generate`, `HandoffDossier` | `F4`→`REM2`→`REM3`→`A4`→`REM4` | 29–35, 43–44 | nota de `ENC` | `HO`, `PORTS` | planejado (RF36, RF10) |
| RF9.CA05 | eventos `MemberAdded`/`MemberRemoved`, `AuditLogPort` (`MEMBER_ADDED`/`MEMBER_REMOVED`), `NotificationPort`, `CounterCachePort.evict` | `EV` | 23, 27–28, 47, 51–52 | — | `EVT`, `CAS`, `RDS`, `OSE` | planejado (`AuditLogPort` real) |
| RF9.CA06 | `MembershipRepositoryPort.findHistoryByDept`, invariante de 1 vigente, `lib/i18n` | `F1` (history), `F6` | 10–11 | `ENC`→`VIG` (nova linha) | `UI` (linha do tempo), `PG` | planejado |
