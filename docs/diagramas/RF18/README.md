# RF18 — Interagir socialmente com tarefas e projetos: curtir, comentar, salvar, compartilhar, remixar, retornar e atribuir
**HU:** HU18 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (card renomeado em 2026-10-02; origem `_anterior/RF26` = Sprint 4; o card "SPRINT 3" cita "RF18 Indicadores", escopo antigo preservado em `_anterior/RF18` — `RENUMERACAO.md`) · **Equivalente FAI:** RF19 Interações sociais (alvo polimórfico PIECE/SCHEME/DNA) — **retornar** e **atribuir** não existem no FAI · **Aba/rota:** ações inline em todo card de tarefa/projeto (Acervo RF6, Projetos, Mural RF27, Buscar RF17, perfil de terceiros RF16, Mesa RF21/RF22); API `/api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes|counters` (RF19) + `POST /api/assignments` (origem `BOTAO_ESQUEMA`), `POST /api/assignments/{id}/accept|refuse|give-back` (TAXONOMIA §12b, compartilhada com RF10 e RF46)
**Critérios de aceite cobertos:** RF18.CA01 … RF18.CA06 — corpo do card vazio: CA01–CA02 remetem aos RF26.CA01–09 citados no card RF19; CA03–CA06 modelam as duas interações novas do título ("atribuir" = `Assignment` PROPOSTA pelo botão do esquema, "retornar" = `Assignment` → DEVOLVIDA com motivo); todos marcados "(CA a confirmar)". Todas as classes do RF são **(planejado)**; reais: `Guard`, `AuditLogPort`, `SecurityConfig`, `RedisAdaptersConfig`, `CassandraAdaptersConfig`.

> **HU18** — COMO usuário visualizando um esquema de tarefa ou projeto POSSO utilizar as funcionalidades de rede social do sistema PARA interagir com usuários conectados ou membros de minha equipe, a fim de aumentar minha produtividade e gerar networking.

A barra de interações do card tem **sete** ações. As cinco sociais (`Reaction`, `Comment`, `SavedItem`, `Share`, `Remix`, TAXONOMIA §8) são detalhadas no **RF19** (que carrega os RF26.CA01–09 no corpo); aqui elas entram como remissão (CA01–CA02). As duas novas — **atribuir** e **retornar** — usam a mesma entidade `Assignment` do RF10 (chefe) e do RF46 (chat), com `origin BOTAO_ESQUEMA` e sem exigir papel de chefe: qualquer usuário que **vê** o item pode atribuí-lo a um colega **da mesma empresa**.

## Critérios de aceite derivados da HU18 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF18.CA01** (CA a confirmar) | Dado um card de tarefa ou projeto visível para mim, quando abro a barra de interações (`Counters`), então posso **curtir/reagir, comentar, salvar, compartilhar e remixar** exatamente como nos RF26.CA01–CA07 (card RF19), com contadores em tempo quase real (Redis → MySQL em lote). |
| **RF18.CA02** (CA a confirmar) | Dado qualquer interação, quando é enviada, então respeita a visibilidade do alvo (RF26.CA08: PRIVADA só dono, DEPARTAMENTO só membros, EMPRESA só mesma empresa → `403 ACESSO_NEGADO`, `AccessPolicy.canInteract`) e gera notificação agrupada por hora ao dono (RF26.CA09, `Notification.groupKey`). |
| **RF18.CA03** (CA a confirmar) | Dado um usuário que vê a tarefa/projeto, quando clica **Atribuir**, escolhe um colega **da mesma empresa**, prazo e nota, então nasce `Assignment PROPOSTA` (`origin BOTAO_ESQUEMA`, `previousResponsibleId` = responsável atual) com `AuditLog ASSIGNMENT_CREATED` e `Notification ATRIBUICAO_PROPOSTA`; se o ator é CHEFE e o destinatário membro do seu departamento a origem é `MINHA_EQUIPE` (RF10); colega de outra empresa → `403 EMPRESA_DIFERENTE`; alvo que o ator não pode ver → `403 ACESSO_NEGADO`; tarefa ARQUIVADA/CONCLUIDA ou projeto CONCLUIDO/ARQUIVADO → `409 ESTADO_INVALIDO`; já existe PROPOSTA/ACEITA para o mesmo alvo e destinatário → `409 ATRIBUICAO_DUPLICADA`. |
| **RF18.CA04** (CA a confirmar) | Dado uma `Assignment PROPOSTA` para mim, quando **aceito**, então ela vai a ACEITA, `TaskItem.responsibleId`/`ProjectTask.responsibleId` passam a mim, `TaskStateLog` registra (DISPONIVEL → EM_USO se era DISPONIVEL), a atribuição entra no índice de prioridade da minha Tarefa do Dia (RF44) e o remetente recebe `ATRIBUICAO_ACEITA`; quando **recuso**, informo motivo (`reason`, senão `422 MOTIVO_OBRIGATORIO`) e ela vai a RECUSADA com `ATRIBUICAO_RECUSADA`; só o destinatário responde (`403 ACESSO_NEGADO`) e resposta repetida é `409 ATRIBUICAO_JA_RESPONDIDA`. |
| **RF18.CA05** (CA a confirmar) | Dado uma `Assignment ACEITA` minha, quando clico **Retornar** e informo o motivo (≥ 20 caracteres), então ela vai a DEVOLVIDA, `responsibleId` volta a `previousResponsibleId`, `TaskStateLog` registra com o motivo, `AuditLog ASSIGNMENT_RESPONDED` grava e o remetente recebe `ATRIBUICAO_DEVOLVIDA`; o card do remetente mostra `Stamp DEVOLVIDO` + motivo até ele reatribuir ou retomar; sem `Assignment ACEITA` para mim → `404 SEM_ATRIBUICAO`; motivo curto → `422 MOTIVO_OBRIGATORIO`. |
| **RF18.CA06** (CA a confirmar) | Dado o card, quando o abro, então vejo o histórico de atribuições e retornos (`Assignment` por alvo: com quem, quando, status e motivo) ao lado dos contadores sociais; o perfil do destinatário (RF16) mostra a etiqueta "atribuída por …" nos itens visíveis; DELEGUEI da Tarefa do Dia (RF44) cria uma nova `Assignment PROPOSTA` (caminho inverso) — regras completas em RF46.CA03–CA05. |

## 0. Diagrama de casos de uso

As sete ações da barra de interações de um card: as cinco sociais (detalhadas no RF19) e as duas novas, atribuir ("Delegar") e retornar, que usam `Assignment`. Pílulas cheias existem no código hoje; tracejadas são planejadas.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  classDef ucDemo fill:#fff8e6,stroke:#b26a00,stroke-dasharray:2 2,color:#1b1b1b
  responsavel["«ator» Responsável atribuído"]:::ator
  autenticado["«ator» Pessoa autenticada"]:::ator
  subgraph SIS["Work Station — RF18 Interagir e atribuir"]
    direction TB
    UC1(["UC1 Curtir, comentar, salvar, compartilhar ou remixar"]):::ucDemo
    UC2(["UC2 Verificar o acesso ao item"]):::ucDemo
    UC3(["UC3 Atribuir o item a um colega da mesma empresa"]):::ucDemo
    UC4(["UC4 Aceitar a atribuição"]):::ucDemo
    UC5(["UC5 Recusar a atribuição com motivo"]):::ucDemo
    UC6(["UC6 Retornar a atribuição aceita com motivo"]):::ucDemo
    UC7(["UC7 Ver o histórico de atribuições e retornos"]):::ucDemo
    UC8(["UC8 Delegar pela Tarefa do Dia"]):::ucPlan
  end
  responsavel -- "é um" --> autenticado
  autenticado --- UC1
  autenticado --- UC3
  responsavel --- UC4
  responsavel --- UC5
  responsavel --- UC6
  autenticado --- UC7
  UC1 -. "«include»" .-> UC2
  UC3 -. "«include»" .-> UC2
  UC8 -. "«extend»" .-> UC3
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Curtir, comentar, salvar, compartilhar ou remixar | Pessoa autenticada | RF18.CA01, RF18.CA02 | planejado — regras completas no RF19; front DEMO (`lib/social/rules.ts`), sem API |
| UC2 Verificar o acesso ao item | (incluído por UC1, UC3) | RF18.CA02, RF18.CA03 | planejado — `AccessPolicy.canInteract` planejado; o front DEMO usa `canView` (`lib/social/rules.ts`) |
| UC3 Atribuir o item a um colega da mesma empresa | Pessoa autenticada | RF18.CA03 | planejado — `DelegateDialog` ("Delegar") no front DEMO (`lib/social/rules.ts`), sem API; a entidade `Assignment` existe em `ws-domain` |
| UC4 Aceitar a atribuição | Responsável atribuído | RF18.CA04 | planejado — `AssignmentInbox` no front DEMO (`lib/social/rules.ts`), sem API |
| UC5 Recusar a atribuição com motivo | Responsável atribuído | RF18.CA04 | planejado — `AssignmentInbox` no front DEMO (`lib/social/rules.ts`), sem API |
| UC6 Retornar a atribuição aceita com motivo | Responsável atribuído | RF18.CA05 | planejado — motivo com 20 ou mais caracteres; front DEMO (`lib/social/rules.ts`), sem API |
| UC7 Ver o histórico de atribuições e retornos | Pessoa autenticada | RF18.CA06 | planejado — no detalhe `/tasks/[id]` do front DEMO (`lib/social/rules.ts`), sem API |
| UC8 Delegar pela Tarefa do Dia | (estende UC3) | RF18.CA06 | planejado — DELEGUEI do RF44 (regras no RF46) |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class InteractionController {
    <<controller>>
    +react(type, id, ReactionRequest, CurrentUser) CountersView
    +comment(type, id, CommentRequest, CurrentUser) CommentView
    +save(type, id, CurrentUser) CountersView
    +share(type, id, ShareRequest, CurrentUser) ShareView
    +remix(type, id, CurrentUser, ctx) RemixView
    +counters(type, id, CurrentUser) CountersView
  }
  class AssignmentController {
    <<controller>>
    +create(CreateAssignmentRequest, CurrentUser, ctx) AssignmentView
    +accept(id, CurrentUser, ctx) AssignmentView
    +refuse(id, ReasonRequest, CurrentUser, ctx) AssignmentView
    +giveBack(id, ReasonRequest, CurrentUser, ctx) AssignmentView
    +historyFor(targetType, targetId, CurrentUser) List~AssignmentView~
  }
  class InteractionService {
    <<service>>
    +react(actor, target, ReactionType) Counters
    +comment(actor, target, contentMd, parentId) Comment
    +save(actor, target) Counters
    +share(actor, target, ShareChannel) Share
    +remix(actor, target) Remix
  }
  class AssignmentService {
    <<service>>
    +propose(CreateAssignmentCommand, actor, ctx) Assignment
    +accept(id, actor, ctx) Assignment
    +refuse(id, reason, actor, ctx) Assignment
    +giveBack(id, reason, actor, ctx) Assignment
    +historyFor(targetType, targetId) List
    -resolveOrigin(actor, toUser) AssignmentOrigin
  }
  class AssignmentStateMachine {
    <<service>>
    +transition(Assignment, AssignmentStatus, actor) void
  }
  class AccessPolicy {
    <<service>>
    +canView(viewer, target) boolean
    +canInteract(viewer, target) boolean
    +sameCompany(a, b) boolean
  }
  class TaskStateMachine {
    <<service>>
    +transition(TaskItem, TaskState, actor, reason) TaskStateLog
  }
  class CounterCachePort {
    <<port>>
    +increment(key) long
    +counters(targetType, targetId) Counters
  }
  class AssignmentRepositoryPort {
    <<port>>
    +save(Assignment) Assignment
    +findOpen(targetType, targetId, toUserId) Optional
    +findByTarget(targetType, targetId) List
  }
  class MembershipRepositoryPort {
    <<port>>
    +findCurrent(userId) Optional
  }
  class NotificationPort {
    <<port>>
    +notify(Notification) void
  }
  class DailyTaskPort {
    <<port>>
    +boostAssigned(userId, targetId) void
  }

  class Reaction {
    <<entity>>
    +UUID actorId
    +TargetType targetType
    +UUID targetId
    +ReactionType reactionType
  }
  class Comment {
    <<entity>>
    +UUID authorId
    +TargetType targetType
    +UUID targetId
    +UUID parentCommentId
    +String contentMd
    +JSON mentionsJson
  }
  class SavedItem {
    <<entity>>
    +UUID userId
    +TargetType targetType
    +UUID targetId
    +boolean favorite
  }
  class Share {
    <<entity>>
    +UUID actorId
    +ShareChannel channel
    +Instant expiresAt
  }
  class Remix {
    <<entity>>
    +UUID actorId
    +UUID sourceId
    +UUID resultId
  }
  class Assignment {
    <<entity>>
    +UUID id
    +AssignmentTargetType targetType
    +UUID targetId
    +UUID fromUserId
    +UUID toUserId
    +AssignmentOrigin origin
    +AssignmentStatus status
    +LocalDate dueAt
    +String message
    +String reason
    +UUID previousResponsibleId
    +Instant respondedAt
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID responsibleId
    +TaskState state
    +Visibility visibility
    +long likesCount
    +long commentsCount
    +long savesCount
    +long sharesCount
    +long remixesCount
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +ProjectStatus status
    +Visibility visibility
  }
  class ProjectTask {
    <<entity>>
    +UUID responsibleId
  }
  class User {
    <<entity>>
    +UUID id
    +UUID companyId
    +UUID departmentId
    +ProfileType profileType
  }
  class Notification {
    <<entity>>
    +UUID recipientId
    +NotificationType type
    +String groupKey
  }
  class AssignmentStatus {
    <<enum>>
    PROPOSTA
    ACEITA
    RECUSADA
    DEVOLVIDA
  }
  class AssignmentOrigin {
    <<enum>>
    CHAT_WS
    CHAT_DECIA
    BOTAO_ESQUEMA
    MINHA_EQUIPE
  }
  class ReactionType {
    <<enum>>
    CURTIR
    UTIL
    BEM_FUNDAMENTADO
    INOVADOR
    CONFORME
  }
  class ShareChannel {
    <<enum>>
    MURAL
    SESSAO_DECIA
    LINK_EXTERNO
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

  InteractionController --> InteractionService
  AssignmentController --> AssignmentService
  InteractionService --> AccessPolicy
  InteractionService --> CounterCachePort
  InteractionService --> NotificationPort
  AssignmentService --> AssignmentStateMachine
  AssignmentService --> AccessPolicy
  AssignmentService --> TaskStateMachine
  AssignmentService --> AssignmentRepositoryPort
  AssignmentService --> MembershipRepositoryPort
  AssignmentService --> NotificationPort
  AssignmentService --> DailyTaskPort
  InteractionService ..> Reaction
  InteractionService ..> Comment
  InteractionService ..> SavedItem
  InteractionService ..> Share
  InteractionService ..> Remix
  Reaction --> ReactionType
  Reaction --> TargetType
  Share --> ShareChannel
  Assignment --> AssignmentStatus
  Assignment --> AssignmentOrigin
  Assignment "0..*" --> "0..1" TaskItem : targetType TASK
  Assignment "0..*" --> "0..1" ProjectScheme : targetType PROJECT
  Assignment "0..*" --> "1" User : fromUserId
  Assignment "0..*" --> "1" User : toUserId (mesma empresa)
  ProjectScheme "1" *-- "2..*" ProjectTask
  AssignmentService ..> Notification : ATRIBUICAO_*
  note for Assignment "Mesma entidade do RF10 (chefe, MINHA_EQUIPE) e do RF46 (chat). Aqui: origin BOTAO_ESQUEMA, sem exigir chefe — só canView + mesma empresa. resolveOrigin promove a MINHA_EQUIPE quando o ator é o chefe do destinatário."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Usuário que vê o card · Destinatário"]
    A1["Abre a barra de interações de um card (Acervo, Projetos, Mural, Buscar, perfil de terceiro, Mesa)"]
    A2["Curte/reage · comenta · salva · compartilha · remixa (RF19)"]
    A3["Clica Atribuir: escolhe colega da mesma empresa, prazo e nota"]
    A4["Destinatário: aceita ou recusa com motivo"]
    A5["Destinatário (ACEITA): clica Retornar com motivo ≥ 20"]
    A6["Abre o card e vê o histórico de atribuições/retornos"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["Counters (likes, comments, saves, shares, remixes) + botões Atribuir / Retornar · Popover de reações"]
    F2["/api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes (RF19)"]
    F3["Dialog Atribuir: Select colega (mesma empresa), Due, Textarea → POST /api/assignments {origin BOTAO_ESQUEMA}"]
    F4["POST /api/assignments/{id}/accept | refuse {reason}"]
    F5["POST /api/assignments/{id}/give-back {reason ≥ 20}"]
    F6["GET /api/assignments/history?targetType=&targetId= → linha do tempo · Stamp DEVOLVIDO + motivo no card do remetente · etiqueta 'atribuída por …' no perfil (RF16)"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["InteractionController · AssignmentController"]
    E403["403 ACESSO_NEGADO (alvo fora da visibilidade · responder atribuição alheia)"]
    E403E["403 EMPRESA_DIFERENTE"]
    E409E["409 ESTADO_INVALIDO (alvo encerrado)"]
    E409D["409 ATRIBUICAO_DUPLICADA"]
    E409R["409 ATRIBUICAO_JA_RESPONDIDA"]
    E422M["422 MOTIVO_OBRIGATORIO"]
    E404["404 SEM_ATRIBUICAO"]
  end
  subgraph APP["ws-application"]
    I1["InteractionService: AccessPolicy.canInteract (PRIVADA só dono · DEPARTAMENTO só membros · EMPRESA só mesma empresa)"]
    I2["Reaction/Comment/SavedItem/Share/Remix · CounterCachePort.increment · Notification agrupada por hora (groupKey)"]
    P1["AssignmentService.propose: canView(ator, alvo)?"]
    P2{"destinatário da mesma empresa?"}
    P3{"alvo aberto (não CONCLUIDA/ARQUIVADA/CONCLUIDO/ARQUIVADO)?"}
    P4{"já existe PROPOSTA/ACEITA para alvo+destinatário?"}
    P5["resolveOrigin: CHEFE do departamento do destinatário → MINHA_EQUIPE, senão BOTAO_ESQUEMA"]
    P6["Assignment PROPOSTA · previousResponsibleId · AuditLog ASSIGNMENT_CREATED"]
    R1{"ator == toUserId e status == PROPOSTA?"}
    R2["accept: ACEITA · responsibleId = ator · TaskStateLog DISPONIVEL→EM_USO · DailyTaskPort.boostAssigned (RF44)"]
    R3["refuse: reason obrigatório · RECUSADA"]
    G1{"existe ACEITA do ator para o alvo?"}
    G2["giveBack: reason ≥ 20 · DEVOLVIDA · responsibleId = previousResponsibleId · TaskStateLog · AuditLog ASSIGNMENT_RESPONDED"]
    H1["historyFor(target): Assignments por alvo com quem, quando, status, motivo"]
    EV["AFTER_COMMIT: Notification ATRIBUICAO_PROPOSTA/ACEITA/RECUSADA/DEVOLVIDA · TimelineEvent · contadores sociais consolidados"]
  end
  subgraph PERS["Persistência"]
    D1[("MySQL: reactions, comments, saved_items, shares, remixes, assignments, tasks, project_tasks, task_state_log, audit_log")]
    D2[("Redis: counters:{type}:{id} · pending:assignments:{userId}")]
    D3[("Cassandra: notifications_by_user · timeline_by_user")]
  end

  A1 --> F1
  A2 --> F2 --> W1 --> W2 --> I1
  I1 -->|"não"| E403
  I1 --> I2 --> D1
  I2 --> D2
  I2 --> EV
  A3 --> F3 --> W1
  W2 --> P1
  P1 -->|"não"| E403
  P1 --> P2
  P2 -->|"não"| E403E
  P2 -->|"sim"| P3
  P3 -->|"não"| E409E
  P3 -->|"sim"| P4
  P4 -->|"sim"| E409D
  P4 -->|"não"| P5 --> P6 --> D1
  P6 --> EV
  A4 --> F4 --> W2 --> R1
  R1 -->|"outro usuário"| E403
  R1 -->|"já respondida"| E409R
  R1 -->|"accept"| R2 --> D1
  R1 -->|"refuse"| R3
  R3 -->|"sem motivo"| E422M
  R3 --> D1
  A5 --> F5 --> W2 --> G1
  G1 -->|"não"| E404
  G1 -->|"sim"| G2
  G2 -->|"motivo < 20"| E422M
  G2 --> D1
  R2 --> EV
  R3 --> EV
  G2 --> EV
  EV --> D3
  EV --> D2
  A6 --> F6 --> W2 --> H1 --> D1
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor A as Usuário (ator)
  actor D as Usuário (destinatário)
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant R as Repository/MySQL
  participant RD as Redis
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  A->>N: reage BEM_FUNDAMENTADO num projeto do Mural
  N->>C: POST /api/interactions/PROJECT/{id}/reactions {BEM_FUNDAMENTADO}
  C->>S: InteractionService.react(actor, target, type)
  S->>S: AccessPolicy.canInteract(actor, project)
  alt fora da visibilidade (PRIVADA de terceiro / DEPARTAMENTO sem ser membro)
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else ok (detalhes no RF19)
    S->>R: upsert reactions (único por actor+alvo para CURTIR)
    S->>RD: INCR counters:PROJECT:{id}:likes
    S-->>C: CountersView
    C-->>N: 200 (contadores em tempo quase real)
    EV->>CS: Notification REACAO ao dono (groupKey por hora)
  end

  A->>N: Atribuir a tarefa X ao colega Pedro (mesma empresa), prazo, nota
  N->>C: POST /api/assignments {TASK, taskId, toUserId, dueAt, message, origin BOTAO_ESQUEMA}
  C->>S: AssignmentService.propose(cmd, actor, ctx)
  S->>R: tasks.findById + AccessPolicy.canView(actor, task)
  alt alvo invisível para o ator
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else destinatário de outra empresa
    S-->>C: 403 EMPRESA_DIFERENTE
    C-->>N: 403
  else tarefa CONCLUIDA/ARQUIVADA
    S-->>C: 409 ESTADO_INVALIDO
    C-->>N: 409
  else já existe PROPOSTA/ACEITA para alvo + destinatário
    S->>R: assignments.findOpen(TASK, taskId, toUserId)
    S-->>C: 409 ATRIBUICAO_DUPLICADA
    C-->>N: 409
  else ok
    S->>R: memberships.findCurrent(toUserId) → resolveOrigin (MINHA_EQUIPE se ator é chefe do departamento de Pedro)
    S->>R: insert assignments (PROPOSTA, previousResponsibleId = task.responsibleId) + audit_log ASSIGNMENT_CREATED
    S-->>C: AssignmentView
    C-->>N: 201
    EV->>CS: notifications_by_user ATRIBUICAO_PROPOSTA (Pedro) + timeline_by_user
  end

  D->>N: abre a notificação e aceita
  N->>C: POST /api/assignments/{id}/accept
  C->>S: AssignmentService.accept(id, actor, ctx)
  alt não é o destinatário
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else já respondida
    S-->>C: 409 ATRIBUICAO_JA_RESPONDIDA
    C-->>N: 409
  else ok
    S->>R: update assignments (ACEITA, respondedAt) · tasks.responsible_id = Pedro · task_state_log DISPONIVEL→EM_USO
    S-->>C: AssignmentView
    C-->>N: 200
    EV->>CS: ATRIBUICAO_ACEITA ao ator
    EV->>R: DailyTaskPort.boostAssigned (RF44)
  end

  D->>N: dias depois clica Retornar com motivo
  N->>C: POST /api/assignments/{id}/give-back {reason}
  C->>S: AssignmentService.giveBack(id, reason, actor, ctx)
  alt não há ACEITA do ator para o alvo
    S-->>C: 404 SEM_ATRIBUICAO
    C-->>N: 404
  else motivo com menos de 20 caracteres
    S-->>C: 422 MOTIVO_OBRIGATORIO
    C-->>N: 422
  else ok
    S->>R: update assignments (DEVOLVIDA, reason) · tasks.responsible_id = previousResponsibleId · task_state_log · audit_log ASSIGNMENT_RESPONDED
    S-->>C: AssignmentView
    C-->>N: 200
    EV->>CS: ATRIBUICAO_DEVOLVIDA ao ator (Stamp DEVOLVIDO + motivo no card)
  end

  A->>N: abre o card
  N->>C: GET /api/assignments/history?targetType=TASK&targetId={id}
  C->>S: AssignmentService.historyFor(TASK, id)
  S->>R: assignments por alvo (com quem, quando, status, motivo)
  S-->>C: List AssignmentView
  C-->>N: 200 (linha do tempo ao lado dos Counters)
```

## 4. Máquina de estados

Entidade central: **`Assignment.status`** (`AssignmentStatus`), com as guardas específicas do botão do esquema (ator ≠ chefe). As entidades sociais (`Reaction`, `SavedItem`, `Share`, `Remix`, `Comment`) não têm estados além de existir/`active` e ficam no RF19.

```mermaid
stateDiagram-v2
  direction LR
  state "PROPOSTA" as PROP
  state "ACEITA" as ACE
  state "RECUSADA" as REC
  state "DEVOLVIDA" as DEV

  [*] --> PROP : Atribuir no card (CA03) [ator canView, destinatário mesma empresa, alvo aberto, sem duplicata] · origin BOTAO_ESQUEMA (ou MINHA_EQUIPE se ator é o chefe) · ATRIBUICAO_PROPOSTA
  PROP --> ACE : accept pelo destinatário (CA04) · responsibleId = destinatário · TaskStateLog DISPONIVEL→EM_USO · ATRIBUICAO_ACEITA · Tarefa do Dia (RF44)
  PROP --> REC : refuse pelo destinatário com reason (CA04) · ATRIBUICAO_RECUSADA
  ACE --> DEV : Retornar pelo destinatário com reason ≥ 20 (CA05) · responsibleId = previousResponsibleId · ASSIGNMENT_RESPONDED · ATRIBUICAO_DEVOLVIDA
  ACE --> [*] : alvo concluído (RF8.CA05) — cumprida
  REC --> [*]
  DEV --> [*] : remetente reatribui (nova PROPOSTA) ou retoma · Stamp DEVOLVIDO + motivo até lá
  note right of PROP
    Responder por outro usuário: 403 ACESSO_NEGADO.
    Resposta repetida: 409 ATRIBUICAO_JA_RESPONDIDA.
    Nova PROPOSTA para o mesmo alvo e pessoa: 409 ATRIBUICAO_DUPLICADA.
  end note
  note right of DEV
    DELEGUEI da Tarefa do Dia (RF44) cria uma nova PROPOSTA
    (caminho inverso). Regras completas: RF46.CA03–CA05.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["Barra de interações em TaskCard/ProjectCard (Acervo, Projetos, Mural, Buscar, /u/[username], Mesa) · histórico no detalhe"]
    UI["packages/ui: Counters (likes, comments, saves, shares, remixes), Popover (reações), Dialog (Atribuir / Retornar), Select (colega), Due, Textarea, Stamp (DEVOLVIDO), Tag ('atribuída por …'), Toast"]
    BFF["app/bff/interactions/* · app/bff/assignments/*"]
    PG --> UI
    PG --> BFF
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    IC["InteractionController (RF19) · AssignmentController (RF10/RF18/RF46)"]
    GEH["GlobalExceptionHandler (403, 404, 409, 422)"]
  end
  subgraph WSAPP["ws-application"]
    SOC["social: InteractionService (Reaction · Comment · SavedItem · Share · Remix)"]
    ASG["messaging: AssignmentService · AssignmentStateMachine (compartilhados)"]
    ACV["acervo: TaskStateMachine"]
    SECU["security: AccessPolicy.canView/canInteract/sameCompany · Guard (real)"]
    PORTS["ports: AssignmentRepositoryPort · MembershipRepositoryPort · TaskRepositoryPort · ProjectRepositoryPort · CounterCachePort · NotificationPort · DailyTaskPort · AuditLogPort (real)"]
    EVT["events: Reacted · Commented · Saved · Shared · Remixed · AssignmentProposed/Accepted/Refused/GivenBack (AFTER_COMMIT)"]
    GAM["gamification: DailyTaskService (RF44) · DeliberativeProfile (reações de qualidade, RF26.CA09)"]
    SOC --> SECU
    ASG --> SECU
    ASG --> ACV
    SOC --> PORTS
    ASG --> PORTS
    SOC --> EVT
    ASG --> EVT
    EVT --> GAM
  end
  subgraph WSDOM["ws-domain"]
    DOM["social: Reaction · Comment · SavedItem · Share · Remix · Notification · messaging: Assignment · enums AssignmentStatus/AssignmentOrigin/ReactionType/ShareChannel/TargetType · acervo: TaskItem · TaskStateLog · projects: ProjectScheme · ProjectTask · identity: User (real)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: Jpa*Repository (reactions, comments, saved_items, shares, remixes, assignments)"]
    RDS["cache-redis (RedisAdaptersConfig): counters:{type}:{id} · pending:assignments:{userId}"]
    CAS["persistence-cassandra (CassandraAdaptersConfig): notifications_by_user · timeline_by_user"]
  end

  BFF -->|"REST JSON"| SEC --> IC --> SOC
  IC --> ASG
  IC --> GEH
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  CAS -.implementa.-> PORTS
  SOC --> DOM
  ASG --> DOM
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  CAS --> CDB[("Cassandra 4.1")]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF18.CA01 | `InteractionController`, `InteractionService.react/comment/save/share/remix`, `Reaction`, `Comment`, `SavedItem`, `Share`, `Remix`, `CounterCachePort` | `A1`→`A2`→`F2`→`I1`→`I2` | 1–3, 8–12 | — (RF19) | `SOC`, `UI` (`Counters`), `RDS` | planejado — detalhe no RF19 (RF26.CA01–CA07) |
| RF18.CA02 | `AccessPolicy.canInteract`, `NotificationPort`, `Notification.groupKey` | `I1`→`E403`, `I2`→`EV` | 4–7, 13 | — | `SECU`, `EVT`, `CAS` | planejado (RF26.CA08/CA09) |
| RF18.CA03 | `AssignmentController.create`, `AssignmentService.propose/resolveOrigin`, `AccessPolicy.canView/sameCompany`, `AssignmentRepositoryPort.findOpen`, `Assignment` | `A3`→`F3`→`P1`→`P6`, `E403`, `E403E`, `E409E`, `E409D` | 14–33 | `[*]`→`PROP` | `ASG`, `UI` (`Dialog`), `MY` | planejado (RF10, RF46) |
| RF18.CA04 | `AssignmentService.accept/refuse`, `AssignmentStateMachine`, `TaskStateMachine`, `DailyTaskPort` | `A4`→`F4`→`R1`→`R2`/`R3`, `E403`, `E409R`, `E422M` | 34–47 | `PROP`→`ACE`, `PROP`→`REC` | `ASG`, `ACV`, `GAM` | planejado (RF44) |
| RF18.CA05 | `AssignmentService.giveBack`, `Assignment.reason/previousResponsibleId`, `TaskStateLog`, `AuditLogPort` (`ASSIGNMENT_RESPONDED`) | `A5`→`F5`→`G1`→`G2`, `E404`, `E422M` | 48–59 | `ACE`→`DEV` | `ASG`, `UI` (`Stamp` DEVOLVIDO) | planejado |
| RF18.CA06 | `AssignmentController.historyFor`, `AssignmentService.historyFor`, `AssignmentRepositoryPort.findByTarget`, etiqueta no RF16 | `A6`→`F6`→`H1` | 60–65 | nota de `DEV` | `PG`, `UI` (`Tag`) | planejado (RF16, RF44 DELEGUEI, RF46.CA03–CA05) |

## 7. Front implementado (onda Social, DEMO) — "Delegar"

No produto o botão "atribuir" aparece como **Delegar** (pt-BR/es "Delegar", en "Delegate"), na barra social de tarefas e projetos e no detalhe `/tasks/[id]`. `DelegateDialog` busca pessoas da mesma empresa (nome, @usuário, sigla), mostra desabilitadas com motivo as que não podem receber, aceita mensagem (≤ 1000) e prazo (≥ hoje). Regras em `lib/social/rules.ts`: `delegatePermission` (CA03: quem vê o item, mesma empresa, item não fechado; SIGILOSO só o dono — D-92), `recipientPermission` (a si mesmo, outra empresa, conta institucional, já responsável, classificação RESTRITO/SIGILOSO fora do departamento, duplicata PROPOSTA/ACEITA), `delegate` (origem `MINHA_EQUIPE` se o ator chefia o departamento do destinatário, senão `BOTAO_ESQUEMA`; `previousResponsibleId`; **uma** notificação `ATRIBUICAO_PROPOSTA`), `respond` (espelho de `Assignment.respond` do Java, mesma ordem de erros) e `respondToAssignment` (CA04: ACEITA → responsável = destinatário, DISPONIVEL → EM_USO; CA05: DEVOLVIDA com motivo ≥ 20 → responsável volta ao anterior). "Delegadas a mim" (`AssignmentInbox`, em `/profile`) tem Aceitar · Recusar (motivo) e, depois de aceita, Devolver; o card do remetente mostra "Delegada a Y · aguardando" e o histórico (CA06) fica no detalhe.

```mermaid
stateDiagram-v2
  [*] --> PROPOSTA: Delegar
  PROPOSTA --> ACEITA: Aceitar
  PROPOSTA --> RECUSADA: Recusar com motivo
  ACEITA --> DEVOLVIDA: Retornar com motivo de 20 ou mais
```

Capturas `50-delegar-dialogo.png` e `51-delegadas-a-mim.png`; e2e "delegar … aceita" em `e2e/social.spec.ts`.
