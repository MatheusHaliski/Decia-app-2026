# RF9 — Permitir que um chefe de departamento possa adicionar ou remover um usuário da sua lista de empregados atuais
**HU:** HU9 · **Sprint (board Work Station):** lista *Requisitos Funcionais* (sem sprint atribuída) · **Equivalente FAI:** RF22 Perfil institucional (celebridade) — abas "do administrador" negadas no serviço (`guard.deny`) e não só escondidas; no FAI não há lotação de pessoas, a gestão de equipe é nova · **Aba/rota:** página do departamento `/departments/[slug]` → aba **Equipe**, modo **"Minha equipe" (gestão)** só para o chefe (`/departments/[slug]/team`); atalho **Minha equipe** no grupo Gestão do menu
**Critérios de aceite cobertos:** RF9.CA01 … RF9.CA06 — **todos "(CA a confirmar)"**: o corpo do card RF9 está vazio e o **escopo é novo** (antes RF9 = participantes da sessão DECIA, preservado em `_anterior/RF9`); os CAs foram derivados do título + HU9 e reaproveitam RF28.CA02 (lotação 1 por vez com histórico em `DepartmentMembership`), RF28.CA03 (auditoria do chefe), o guard `requireDeptHead` e a aba "Minha equipe" propostos em `docs/produto/ABAS_POR_PERFIL.md` §1.2 e §7.b

> **HU9** — COMO chefe de departamento de uma empresa POSSO adicionar ou remover um usuário de minha lista de empregados ativos PARA melhorar a minha gestão empresarial.

A **lista de empregados atuais** de um departamento é o conjunto de `DepartmentMembership` **vigentes** (`endedAt` nulo) daquele `Department`; `User.departmentId` espelha a lotação atual (1 por vez, RF28.CA02). O **CHEFE** (`Department.headUserId`, guard `requireDeptHead`, que também aceita a EMPRESA dona da `Company` e o ADMIN) **adiciona** (cria `DepartmentMembership` MEMBRO e encerra a lotação anterior em outro departamento — transferência), **remove** (fecha `endedAt` + `reason`, zera `User.departmentId`, revoga `CuratorAppointment` vigente) e **transfere** (remove + adiciona na mesma transação, com o chefe de destino ou a EMPRESA). O histórico nunca é apagado; remover avisa o empregado e, se ele tem pendências (tarefas EM_USO como responsável, sessões DECIA ativas, chancelas EM_REVISAO), oferece o **Dossiê de Transição** (RF36) antes de confirmar. A API da equipe só expõe nome, username, cargo e lotação — nunca `email`/`phone` (LGPD). Nenhuma IA neste RF.

## Critérios de aceite derivados do título + HU9 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) | Fonte reaproveitada |
|---|---|---|
| **RF9.CA01** (CA a confirmar) | Dado um CHEFE_DEPARTAMENTO com `Department.headUserId == eu` (ou EMPRESA dona da Company, ou ADMIN — `requireDeptHead`), quando abro a aba Equipe no modo **Minha equipe**, então vejo os `DepartmentMembership` vigentes (nome, username, `jobTitle`, `roleInDept`, `startedAt`, etiqueta Curador) com busca e paginação (> 50), mais o histórico de lotações encerradas; quem não é chefe não vê o modo gestão no menu e recebe `403 ACESSO_NEGADO` na API; a API nunca devolve `email`/`phone`. | RF28.CA02, RF28.CA08, ABAS §7.b |
| **RF9.CA02** (CA a confirmar) | Dado o modo gestão, quando **adiciono** um usuário (busca por nome/username na mesma `Company`, `AccountStatus` ACTIVE), então nasce um `DepartmentMembership` MEMBRO com `startedAt`, a lotação vigente anterior (em outro departamento) é encerrada com `endedAt` e `reason` TRANSFERENCIA e `User.departmentId` passa a ser o meu departamento; já membro vigente → `409 MEMBRO_DUPLICADO`; outra empresa → `422 FORA_DA_EMPRESA`; conta não ACTIVE → `422 USUARIO_INATIVO`. | RF28.CA02 (1 departamento por vez) |
| **RF9.CA03** (CA a confirmar) | Dado um membro vigente, quando **removo** informando `reason` (obrigatório, `422 VALIDACAO`), então o `DepartmentMembership` recebe `endedAt` e `reason` (sem apagar), `User.departmentId` fica nulo, o `CuratorAppointment` vigente dele é revogado (`revokeReason` = saída do departamento) e suas tarefas/projetos **permanecem** com o dono; remover o próprio chefe (`headUserId`) → `422 CHEFE_NAO_REMOVIVEL` (troca de chefe é RF28.CA07). | RF28.CA02, RF28.CA03, RF28.CA07 |
| **RF9.CA04** (CA a confirmar) | Dado que o removido tem pendências (responsável em `ProjectTask` aberta, `TaskItem` EM_USO/BLOQUEADA como responsável, `SessionParticipant` em sessão ATIVA, `SealBond` EM_REVISAO de que é alvo), quando confirmo a remoção, então o sistema lista as pendências e oferece **gerar Dossiê de Transição** (`HandoffDossier` reason TRANSFERENCIA/SAIDA, RF36) ou **transferir** para outro departamento (remover + adicionar na mesma transação); itens PRIVADOS do empregado nunca entram sem consentimento. | RF36.CA01, RF36.CA05 |
| **RF9.CA05** (CA a confirmar) | Dado a inclusão ou remoção, então `MemberAdded`/`MemberRemoved` (AFTER_COMMIT) gravam `AuditLog MEMBER_ADDED/MEMBER_REMOVED` com `correlationId`, notificam o empregado (`Notification` category SISTEMA: "você foi adicionado/removido do departamento X", com motivo), invalidam o cache Redis de métricas/contadores do departamento e atualizam a aba pública Equipe e a página da empresa (Pessoas). | RF28.CA03 (auditoria), RF28.CA04 (cache) |
| **RF9.CA06** (CA a confirmar) | Dado o histórico, então re-adicionar alguém cria um **novo** `DepartmentMembership` (o anterior permanece encerrado), a linha do tempo de lotações aparece no modo gestão e no perfil do empregado (empresa/departamento atual, RF16), e todas as mensagens são i18n (pt-BR/en/es). | RF28.CA02 (histórico), RF19.CA07 |

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
    +role: Role
    +status: AccountStatus
    +companyId: UUID
    +departmentId: UUID lotação atual
    +avatarUrl: String
    .. +25 campos ..
  }
  class Company {
    <<entity>>
    +id: UUID
    +ownerUserId: UUID perfil EMPRESA
    +legalName: String
    +slug: String
  }
  class Department {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +name: String
    +acronym: String
    +slug: String
    +color: String
    +monogram: String
    +headUserId: UUID CHEFE
    +active: boolean
  }
  class DepartmentMembership {
    <<entity>>
    +id: UUID
    +userId: UUID
    +departmentId: UUID
    +roleInDept: DeptRole
    +startedAt: Instant
    +endedAt: Instant nulo = vigente
    +reason: String
  }
  class CuratorAppointment {
    <<entity>>
    +id: UUID
    +departmentId: UUID
    +curatorUserId: UUID
    +revokedAt: Instant
    +revokeReason: String
    +scope: CuratorScope
  }
}

namespace ws_domain_pendencias {
  class ProjectTask {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +responsibleId: UUID
    +percentComplete: int
  }
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +responsibleId: UUID
    +state: TaskState
    +visibility: Visibility
  }
  class SessionParticipant {
    <<entity>>
    +sessionId: UUID
    +userId: UUID
    +leftAt: Instant
  }
  class SealBond {
    <<entity>>
    +id: UUID
    +targetOwnerId: UUID
    +status: SealBondStatus
  }
  class HandoffDossier {
    <<entity>>
    +id: UUID
    +subjectType: String EMPREGADO
    +subjectUserId: UUID
    +requestedBy: UUID
    +reason: HandoffReason
    +status: HandoffStatus
    +consentForPrivateItems: boolean
  }
}

namespace ws_domain_plataforma {
  class Notification {
    <<entity>>
    +id: UUID
    +recipientId: UUID
    +actorId: UUID
    +type: NotificationType SISTEMA
    +category: String SISTEMA
    +title: String
    +body: String
    +payloadJson: JSON
  }
  class AuditLog {
    <<entity>>
    +id: UUID
    +actorId: UUID
    +action: String MEMBER_ADDED MEMBER_REMOVED MEMBER_TRANSFERRED
    +resourceType: String DEPARTMENT
    +resourceId: UUID
    +correlationId: String
    +metadataJson: JSON
  }
  class DomainEventOutbox {
    <<entity>>
    +aggregateType: String DEPARTMENT
    +eventType: String MemberAdded MemberRemoved
    +payloadJson: JSON
  }
}

namespace ws_domain_enums {
  class DeptRole {
    <<enum>>
    MEMBRO
    CHEFE
    CURADOR
  }
  class ProfileType {
    <<enum>>
    EMPREGADO
    EMPRESA
    CHEFE_DEPARTAMENTO
  }
  class AccountStatus {
    <<enum>>
    PENDING_EMAIL_VERIFICATION
    PENDING_VALIDATION
    ACTIVE
    SUSPENDED
    DELETION_SCHEDULED
  }
  class HandoffReason {
    <<enum>>
    SAIDA
    TRANSFERENCIA
    FIM_GESTAO
    TROCA_CHEFE
  }
}

namespace ws_application {
  class InstitutionalService {
    <<service>>
    +listTeam(actorId, deptId, query, page) TeamView vigentes + histórico
    +addMember(actorId, deptId, userId) DepartmentMembership
    +removeMember(actorId, deptId, userId, reason) DepartmentMembership
    +transferMember(actorId, fromDeptId, toDeptId, userId, reason) DepartmentMembership
    +pendingItemsOf(userId, deptId) PendingSummary
    +assignMembership(actorId, userId, deptId, reason) DepartmentMembership
  }
  class AccessPolicy {
    <<service>>
    +requireDeptHead(user, departmentId) void headUserId ou EMPRESA dona ou ADMIN
    +requireSameCompany(user, companyId) void
  }
  class CuratorService {
    <<service>>
    +revokeAllOf(userId, deptId, reason)
  }
  class HandoffService {
    <<service>>
    +generateForMember(deptId, userId, reason) HandoffDossier
  }
  class NotificationService {
    <<service>>
    +notifyMembershipChange(recipientId, actorId, dept, added, reason)
  }
  class CachePort {
    <<port>>
    +evict(key)
  }
}

namespace ws_web {
  class DepartmentTeamController {
    <<controller>>
    +GET_api_departments_id_team_manage(q, page)
    +POST_api_departments_id_members(userId)
    +DELETE_api_departments_id_members_userId(reason)
    +POST_api_departments_id_members_userId_transfer(toDeptId, reason)
    +GET_api_departments_id_members_userId_pending()
  }
}

namespace ws_infrastructure {
  class DepartmentMembershipJpaRepository {
    <<adapter>>
  }
  class AuditLogJpaRepository {
    <<adapter>>
  }
  class RedisMetricsCache {
    <<adapter>>
  }
  class CassandraNotificationAdapter {
    <<adapter>>
  }
}

Company "1" --> "*" Department
Company "1" --> "*" User : companyId
Department "1" --> "*" DepartmentMembership : lista de empregados = vigentes
User "1" --> "*" DepartmentMembership : histórico de lotações
User --> Department : departmentId atual
Department --> User : headUserId CHEFE
Department "1" --> "*" CuratorAppointment
CuratorAppointment --> User : curatorUserId
ProjectTask --> User : responsibleId pendência
TaskItem --> User : responsibleId pendência
SessionParticipant --> User : userId pendência
SealBond --> User : targetOwnerId pendência
HandoffDossier --> User : subjectUserId
Notification --> User : recipientId
DepartmentMembership --> DeptRole
User --> ProfileType
User --> AccountStatus
HandoffDossier --> HandoffReason

DepartmentTeamController ..> InstitutionalService
DepartmentTeamController ..> AccessPolicy : requireDeptHead 403
InstitutionalService ..> AccessPolicy
InstitutionalService ..> DepartmentMembership
InstitutionalService ..> CuratorService : revoga ao remover
InstitutionalService ..> HandoffService : pendências CA04
InstitutionalService ..> DomainEventOutbox : MemberAdded MemberRemoved
DomainEventOutbox ..> AuditLog : AFTER_COMMIT
DomainEventOutbox ..> NotificationService : AFTER_COMMIT
DomainEventOutbox ..> CachePort : evict métricas do departamento
DepartmentMembershipJpaRepository ..> DepartmentMembership : JPA
AuditLogJpaRepository ..> AuditLog : JPA
RedisMetricsCache ..|> CachePort
CassandraNotificationAdapter ..> Notification : notifications_by_user

note for DepartmentMembership "tabela department_memberships · lista de empregados atuais = endedAt IS NULL · 1 lotação vigente por usuário (RF28.CA02) · nunca apagada (CA06)"
note for AccessPolicy "requireDeptHead = Department.headUserId == user OR Company.ownerUserId == user OR Role ADMIN · senão 403 ACESSO_NEGADO (CA01)"
note for InstitutionalService "addMember: 409 MEMBRO_DUPLICADO, 422 FORA_DA_EMPRESA, 422 USUARIO_INATIVO (CA02) · removeMember: reason obrigatório, 422 CHEFE_NAO_REMOVIVEL (CA03) · API sem email/phone (LGPD)"
note for HandoffDossier "oferecido quando o removido tem pendências (CA04) · itens PRIVADOS só com consentForPrivateItems (RF36.CA05)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Ator humano"]
    U1["CHEFE abre /departments/[slug] → Equipe → modo Minha equipe"]
    U2["Busca um usuário e clica Adicionar"]
    U3["Clica Remover em um membro e informa o motivo"]
    U4["Escolhe: gerar Dossiê de Transição, transferir para outro departamento ou confirmar remoção"]
    U5["EMPREGADO recebe a notificação e vê a lotação atual no perfil"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Seletor de modo: público / Minha equipe (só chefe, EMPRESA em leitura)"]
    W2["Lista de vigentes: nome, username, cargo, entrada, papel, Curador · busca · paginação > 50 · linha do tempo do histórico"]
    W3["Modo gestão oculto no menu"]
    W4["Diálogo de pendências com as opções"]
    W5["Lista atualizada, toast i18n"]
  end

  subgraph LA["ws-application"]
    A1["AccessPolicy.requireDeptHead"]
    A2{"headUserId == eu, ou EMPRESA dona, ou ADMIN?"}
    A3["403 ACESSO_NEGADO"]
    A4["InstitutionalService.listTeam: memberships endedAt IS NULL + histórico, sem email/phone"]
    A5["InstitutionalService.addMember"]
    A6{"Mesma Company?"}
    A7["422 FORA_DA_EMPRESA"]
    A8{"AccountStatus ACTIVE?"}
    A9["422 USUARIO_INATIVO"]
    A10{"Já vigente neste departamento?"}
    A11["409 MEMBRO_DUPLICADO"]
    A12["Encerra lotação vigente em outro departamento: endedAt, reason TRANSFERENCIA"]
    A13["INSERT DepartmentMembership MEMBRO startedAt · User.departmentId = dept"]
    A14["InstitutionalService.removeMember"]
    A15{"reason informado?"}
    A16["422 VALIDACAO"]
    A17{"userId == headUserId?"}
    A18["422 CHEFE_NAO_REMOVIVEL"]
    A19["pendingItemsOf: ProjectTask abertas, TaskItem EM_USO/BLOQUEADA, sessões ATIVAS, SealBond EM_REVISAO"]
    A20{"Há pendências?"}
    A21["HandoffService.generateForMember → HandoffDossier (RF36)"]
    A22["transferMember: removeMember + addMember na mesma transação"]
    A23["UPDATE membership endedAt, reason · User.departmentId = null · CuratorService.revokeAllOf"]
    A24["AFTER_COMMIT MemberAdded / MemberRemoved"]
    A25["AuditLog MEMBER_ADDED / MEMBER_REMOVED com correlationId"]
    A26["NotificationService.notifyMembershipChange (SISTEMA, com motivo)"]
    A27["CachePort.evict metrics:department e contadores"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: departments, department_memberships, users, curator_appointments")]
    P2[("MySQL: project_tasks, tasks, session_participants, seal_bonds — leitura de pendências")]
    P3[("MySQL: handoff_dossiers")]
    P4[("MySQL: audit_log · Cassandra: notifications_by_user")]
    P5[("Redis: cache de métricas do departamento")]
  end

  U1 --> W1 --> A1 --> A2
  A2 -->|"não"| A3 --> W3
  A2 -->|"sim"| A4 --> P1
  A4 --> W2
  W2 --> U2 --> A5 --> A6
  A6 -->|"não"| A7
  A6 -->|"sim"| A8
  A8 -->|"não"| A9
  A8 -->|"sim"| A10
  A10 -->|"sim"| A11
  A10 -->|"não"| A12 --> A13 --> P1
  A13 --> A24
  W2 --> U3 --> A14 --> A15
  A15 -->|"não"| A16
  A15 -->|"sim"| A17
  A17 -->|"sim"| A18
  A17 -->|"não"| A19 --> P2
  A19 --> A20
  A20 -->|"sim"| W4 --> U4
  U4 -->|"dossiê"| A21 --> P3
  A21 --> A23
  U4 -->|"transferir"| A22 --> A12
  U4 -->|"confirmar"| A23
  A20 -->|"não"| A23 --> P1
  A23 --> A24
  A24 --> A25 --> P4
  A24 --> A26 --> P4
  A24 --> A27 --> P5
  A24 --> W5
  A26 --> U5

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A3,A7,A9,A11,A16,A18 err
  class W3,W4 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (CHEFE)
  actor E as Empregado
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant R as Redis
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: abre /departments/secid-uts/team (modo Minha equipe)
  NX->>C: GET /api/departments/D1/team/manage?q=&page=1
  C->>S: AccessPolicy.requireDeptHead(user, D1)
  alt não é headUserId, nem EMPRESA dona, nem ADMIN (CA01)
    S-->>C: 403 ACESSO_NEGADO
    C-->>NX: 403
    NX-->>U: modo gestão indisponível
  else chefe
    C->>S: InstitutionalService.listTeam(actorId, D1, q, page)
    S->>DB: department_memberships WHERE departmentId = D1 AND endedAt IS NULL JOIN users (nome, username, jobTitle) + curator_appointments vigentes
    S->>DB: histórico endedAt IS NOT NULL ORDER BY endedAt DESC
    S-->>C: 200 TeamView {vigentes, historico, total} sem email/phone
    C-->>NX: 200
    NX-->>U: lista de empregados atuais + linha do tempo
  end

  U->>NX: busca "ana.souza" e clica Adicionar (CA02)
  NX->>C: POST /api/departments/D1/members {userId: ana}
  C->>S: InstitutionalService.addMember(actorId, D1, ana)
  S->>DB: users WHERE id = ana (companyId, status) + membership vigente
  alt outra empresa
    S-->>C: 422 FORA_DA_EMPRESA
  else conta não ACTIVE
    S-->>C: 422 USUARIO_INATIVO
  else já vigente em D1
    S-->>C: 409 MEMBRO_DUPLICADO
  else ok
    S->>DB: UPDATE department_memberships SET endedAt = now(), reason = TRANSFERENCIA WHERE userId = ana AND endedAt IS NULL
    S->>DB: INSERT department_memberships (ana, D1, MEMBRO, startedAt)
    S->>DB: UPDATE users SET departmentId = D1 WHERE id = ana
    S->>DE: publish MemberAdded {deptId D1, userId ana, actorId, correlationId}
    S-->>C: 201 DepartmentMembership
    C-->>NX: 201
    NX-->>U: ana aparece na lista de vigentes
  end
  DE->>DB: INSERT audit_log (MEMBER_ADDED, resourceType DEPARTMENT, correlationId) (CA05)
  DE->>CS: INSERT notifications_by_user (recipient ana, category SISTEMA, "você foi adicionado ao departamento SECID-UTS")
  DE->>R: DEL metrics:department:D1 e counters
  E->>NX: vê a notificação e a lotação atual no perfil (CA06)

  U->>NX: clica Remover em "bruno" com motivo "transferido para a CPOE" (CA03)
  NX->>C: GET /api/departments/D1/members/bruno/pending
  C->>S: InstitutionalService.pendingItemsOf(bruno, D1)
  S->>DB: project_tasks abertas, tasks EM_USO/BLOQUEADA, session_participants em sessões ATIVAS, seal_bonds EM_REVISAO WHERE responsável ou alvo = bruno
  S-->>C: 200 PendingSummary {projectTasks 3, sessions 1, sealBonds 0}
  C-->>NX: 200
  NX-->>U: diálogo de pendências: gerar Dossiê, transferir ou confirmar (CA04)
  U->>NX: escolhe transferir para CPOE com Dossiê
  NX->>C: POST /api/departments/D1/members/bruno/transfer {toDeptId: D2, reason, withHandoff: true}
  C->>S: InstitutionalService.transferMember(actorId, D1, D2, bruno, reason)
  S->>S: requireDeptHead(user, D1) e requireDeptHead(user, D2) ou EMPRESA dona
  alt bruno é headUserId de D1
    S-->>C: 422 CHEFE_NAO_REMOVIVEL (troca de chefe é RF28.CA07)
  else reason vazio
    S-->>C: 422 VALIDACAO {field reason}
  else ok, mesma transação
    S->>DB: UPDATE department_memberships SET endedAt = now(), reason WHERE userId = bruno AND departmentId = D1 AND endedAt IS NULL
    S->>DB: UPDATE curator_appointments SET revokedAt = now(), revokeReason = SAIDA_DO_DEPARTAMENTO WHERE curatorUserId = bruno AND departmentId = D1
    S->>DB: INSERT department_memberships (bruno, D2, MEMBRO, startedAt)
    S->>DB: UPDATE users SET departmentId = D2 WHERE id = bruno
    S->>DB: INSERT handoff_dossiers (subjectType EMPREGADO, subjectUserId bruno, reason TRANSFERENCIA, status GERADO) via HandoffService
    S->>DE: publish MemberRemoved {D1, bruno} e MemberAdded {D2, bruno}
    S-->>C: 200 {membership D2, handoffDossierId}
    C-->>NX: 200
    NX-->>U: bruno sai dos vigentes de D1, histórico mostra a saída com motivo
  end
  DE->>DB: INSERT audit_log (MEMBER_REMOVED D1, MEMBER_ADDED D2, correlationId)
  DE->>CS: INSERT notifications_by_user (recipient bruno, "você foi transferido para CPOE", motivo)
  DE->>R: DEL metrics:department:D1, metrics:department:D2
  Note over S,DB: tarefas e projetos de bruno permanecem com ele — o Dossiê (RF36) é que transfere responsabilidades, com consentimento para itens PRIVADOS
```

## 4. Máquina de estados

Entidade central: **`DepartmentMembership`**, que não tem enum próprio — o estado deriva de `endedAt` (nulo = **vigente**, preenchido = **encerrada**) e de `roleInDept` (`DeptRole`). Um usuário tem no máximo uma lotação vigente (RF28.CA02); a "lista de empregados atuais" é o conjunto de lotações vigentes do departamento. Registros nunca são apagados (CA06).

```mermaid
stateDiagram-v2
  direction LR
  state "Sem lotação — User.departmentId nulo" as SemLotacao
  state "Vigente — endedAt nulo, na lista de empregados atuais" as Vigente {
    [*] --> MEMBRO
    MEMBRO --> CURADOR : CuratorAppointment pelo chefe, RF28.CA03
    CURADOR --> MEMBRO : revogação do curador
    MEMBRO --> CHEFE : EMPRESA troca o chefe, RF28.CA07
  }
  state "Encerrada — endedAt + reason, só no histórico" as Encerrada
  [*] --> SemLotacao : cadastro RF1 ou removido sem destino
  SemLotacao --> Vigente : CHEFE adiciona, INSERT membership MEMBRO, User.departmentId = dept (CA02)
  Vigente --> Encerrada : CHEFE remove com reason, endedAt = now, revoga curador, User.departmentId nulo (CA03)
  Vigente --> Encerrada : transferência, reason TRANSFERENCIA, nova Vigente em outro departamento na mesma transação (CA04)
  Encerrada --> Vigente : re-adicionado, NOVO registro, o anterior permanece encerrado (CA06)
  Encerrada --> SemLotacao : sem nova lotação
  note right of Vigente
    1 lotação vigente por usuário (RF28.CA02).
    headUserId não pode ser removido: 422 CHEFE_NAO_REMOVIVEL (CA03).
    Já vigente neste departamento: 409 MEMBRO_DUPLICADO (CA02).
  end note
  note right of Encerrada
    Nunca apagada. Remoção com pendências oferece
    HandoffDossier antes de confirmar (CA04).
    AuditLog + Notification AFTER_COMMIT (CA05).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/departments/[slug] — aba Equipe, seletor público / Minha equipe"]
    F2["app/departments/[slug]/team — modo gestão: lista de vigentes, busca, paginação, histórico"]
    F3["components/ui: TeamMemberRow nome username cargo entrada papel Curador, UserSearch mesma empresa, AddMemberDialog, RemoveMemberDialog com motivo, PendingItemsDialog Dossiê / transferir / confirmar, MembershipTimeline, RoleGate requireDeptHead, DepartmentBadge monograma + cor"]
    F4["Menu Gestão: atalho Minha equipe (só CHEFE)"]
  end

  subgraph WEB["ws-web"]
    C1["DepartmentTeamController — GET /api/departments/{id}/team/manage, POST /members, DELETE /members/{userId}, POST /members/{userId}/transfer, GET /members/{userId}/pending"]
  end

  subgraph APP["ws-application"]
    S1["InstitutionalService RF28"]
    S2["AccessPolicy — requireDeptHead, requireSameCompany"]
    S3["CuratorService RF28"]
    S4["HandoffService RF36"]
    S5["NotificationService"]
    P1["CachePort"]
  end

  subgraph DOM["ws-domain"]
    D1["User · Company · Department · DepartmentMembership · CuratorAppointment"]
    D2["DeptRole · ProfileType · AccountStatus · HandoffReason"]
    D3["ProjectTask · TaskItem · SessionParticipant · SealBond — leitura de pendências"]
    D4["HandoffDossier · Notification · AuditLog · DomainEventOutbox"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: departments, department_memberships, users, curator_appointments, handoff_dossiers, audit_log")]
    I2[("persistence-cassandra: notifications_by_user")]
    I3[("cache-redis: RedisMetricsCache — métricas e contadores do departamento")]
    I4["platform: outbox AFTER_COMMIT, AuditLog"]
  end

  subgraph EXT["Serviços externos"]
    X1(["Nenhum provedor de IA neste RF — o Dossiê CA04 usa Claude/Gemini via RF36"])
  end

  F1 --- F3
  F2 --- F3
  F4 --> F2
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C1
  C1 --> S1
  C1 --> S2
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> D1
  S1 --> D3
  D1 --> D2
  S1 --> D4
  D4 --> I4
  I4 --> S5
  I4 --> P1
  S5 --> I2
  P1 --> I3
  D1 --> I1
  D3 --> I1
  D4 --> I1
  S4 -.-> X1
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF9.CA01 (a confirmar) | Classes `Department.headUserId`, `DepartmentMembership.endedAt` (nota "lista = endedAt IS NULL"), `AccessPolicy.requireDeptHead` (nota), `InstitutionalService.listTeam`, `DepartmentTeamController GET …/team/manage` · Atividades `U1 → W1 → A1 → A2 → A3 403 → W3` / `A2 (sim) → A4 → P1 → W2` · Sequência msgs 1–11 (`alt não é headUserId … → 403` / `else chefe` → TeamView sem email/phone) · Componentes `app/departments/[slug]/team`, `TeamMemberRow`, `RoleGate requireDeptHead`, `Menu Gestão: Minha equipe` |
| RF9.CA02 (a confirmar) | Classes `DepartmentMembership` (startedAt, roleInDept MEMBRO), `User.departmentId/companyId/status`, enums `DeptRole`, `AccountStatus`, `InstitutionalService.addMember`, `AccessPolicy.requireSameCompany` · Atividades `U2 → A5 → A6 → A7 422 FORA_DA_EMPRESA`, `A8 → A9 422 USUARIO_INATIVO`, `A10 → A11 409 MEMBRO_DUPLICADO`, `A12 → A13 → P1` · Sequência `POST /api/departments/D1/members` com os três `alt` de erro e `else ok` (encerra lotação anterior, INSERT membership, UPDATE users.departmentId) · Transição `SemLotacao → Vigente` e nota · Componentes `UserSearch mesma empresa`, `AddMemberDialog` |
| RF9.CA03 (a confirmar) | Classes `DepartmentMembership.endedAt/reason`, `CuratorAppointment.revokedAt/revokeReason`, `InstitutionalService.removeMember`, `CuratorService.revokeAllOf` · Atividades `U3 → A14 → A15 → A16 422 VALIDACAO`, `A17 → A18 422 CHEFE_NAO_REMOVIVEL`, `A23 → P1` · Sequência `alt bruno é headUserId → 422 CHEFE_NAO_REMOVIVEL`, `else reason vazio → 422 VALIDACAO`, `else ok` → UPDATE membership endedAt, UPDATE curator_appointments revokedAt, nota "tarefas e projetos permanecem com ele" · Transição `Vigente → Encerrada : CHEFE remove com reason` e nota · Componente `RemoveMemberDialog com motivo` |
| RF9.CA04 (a confirmar) | Classes `ProjectTask/TaskItem/SessionParticipant/SealBond` (pendências), `HandoffDossier` (reason TRANSFERENCIA/SAIDA, consentForPrivateItems), enum `HandoffReason`, `InstitutionalService.pendingItemsOf/transferMember`, `HandoffService.generateForMember` · Atividades `A19 → P2 → A20 → W4 → U4 → A21 → P3` / `A22 → A12` / `A23` · Sequência `GET …/members/bruno/pending` → PendingSummary → `POST …/transfer {withHandoff}` → INSERT handoff_dossiers na mesma transação · Transição `Vigente → Encerrada : transferência … nova Vigente na mesma transação` e nota · Componentes `PendingItemsDialog`, `HandoffService RF36`, `X1` |
| RF9.CA05 (a confirmar) | Classes `DomainEventOutbox` (MemberAdded/MemberRemoved), `AuditLog MEMBER_ADDED/MEMBER_REMOVED/MEMBER_TRANSFERRED`, `Notification` (category SISTEMA), `NotificationService.notifyMembershipChange`, `CachePort.evict`, `RedisMetricsCache`, `CassandraNotificationAdapter` · Atividades `A24 → A25 → P4`, `A24 → A26 → P4 → U5`, `A24 → A27 → P5`, `A24 → W5` · Sequência `DE->>DB INSERT audit_log`, `DE->>CS INSERT notifications_by_user`, `DE->>R DEL metrics:department` (duas vezes) · Nota do estado *Encerrada* · Componentes `platform: outbox AFTER_COMMIT`, `persistence-cassandra`, `cache-redis` |
| RF9.CA06 (a confirmar) | Classes `DepartmentMembership` (nota "nunca apagada"), `User "1" --> "*" DepartmentMembership : histórico` · Atividades `A4` (histórico) → `W2` (linha do tempo), `U5` · Sequência msg "histórico endedAt IS NOT NULL ORDER BY endedAt DESC", `E->>NX vê a lotação atual no perfil` · Transições `Encerrada → Vigente : re-adicionado, NOVO registro` e `Encerrada → SemLotacao` · Componentes `MembershipTimeline`, `TeamMemberRow` (i18n) |
