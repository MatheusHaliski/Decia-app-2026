# RF18 — Interagir socialmente com tarefas e projetos: curtir, comentar, salvar, compartilhar, remixar, retornar e atribuir
**HU:** HU18 · **Sprint (board Work Station):** a confirmar (card renomeado em 2026-10-02; origem `_anterior/RF26` = Sprint 4) · **Equivalente FAI:** RF19 Interações sociais (alvo polimórfico) — **retornar** e **atribuir** não existem no FAI · **Aba/rota:** ações inline em todo card de tarefa/projeto (Acervo, Projetos, Mural, Buscar, perfil de terceiros, Mesa) · **API:** `/api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes|counters` (RF19) + `POST /api/assignments` (origem `BOTAO_ESQUEMA`), `POST /api/assignments/{id}/accept|refuse|give-back` (TAXONOMIA §12b, compartilhada com RF10 e RF46)
**Critérios de aceite cobertos:** RF18.CA01 … RF18.CA06 — corpo do card vazio: CA01–CA02 remetem aos RF26.CA01–09 citados no card RF19; CA03–CA06 modelam as duas interações novas ("atribuir" = RF10/RF46.CA03–CA05 pelo botão do esquema; "retornar" = `Assignment` → DEVOLVIDA com motivo); todos marcados "(CA a confirmar)"

> **HU18** — COMO usuário visualizando um esquema de tarefa ou projeto POSSO utilizar as funcionalidades de rede social do sistema PARA interagir com usuários conectados ou membros de minha equipe, a fim de aumentar minha produtividade e gerar networking.

O RF18 é a **barra de interações** de todo card de **tarefa** (`TaskItem`) e **projeto** (`ProjectScheme`). As seis interações sociais clássicas (curtir/reagir, comentar, salvar, compartilhar, remixar) são as do antigo RF26, detalhadas no card **RF19** (RF26.CA01–09) e **não repetidas aqui**. Este README modela as **duas interações novas**, que mudam o fluxo de trabalho e não só a reputação, usando a entidade única **`Assignment`** (TAXONOMIA §12b, *proposta*; mesma entidade de RF10 "chefe atribui" e RF46 "atribuir pelo chat"):

- **Atribuir** — pelo botão do card (`AssignmentOrigin.BOTAO_ESQUEMA`) qualquer usuário **propõe** uma tarefa/projeto a um colega **da mesma empresa**, com prazo e nota (`Assignment` PROPOSTA, `fromUserId`, `toUserId`, `dueAt`, `message`, `previousResponsibleId`); o CHEFE atribuindo a membro do seu departamento (origem `MINHA_EQUIPE`, RF10) segue o mesmo caminho com `requireDeptHead`. O destinatário **aceita** (ACEITA → `TaskItem.responsibleId` / `ProjectTask.responsibleId`, `TaskStateLog`, Tarefa do Dia RF44) ou **recusa com motivo** (RECUSADA).
- **Retornar** — quem **aceitou** uma atribuição **devolve ao remetente com motivo** (`AssignmentService.giveBack` → `Assignment` DEVOLVIDA, `reason` obrigatório, `responsibleId` restaurado para `previousResponsibleId`, `TaskStateLog`, `Notification ATRIBUICAO_DEVOLVIDA`). Para **projeto** devolvido o card do remetente mostra o carimbo DEVOLVIDO com motivo (design system *Stamp*); `ProjectStatus.DEVOLVIDO` continua reservado à revisão de decisão (RF15/RF29) — **dúvida Q-53**. Retornar um item **sem** `Assignment` ACEITA (ex.: tarefa só compartilhada em sessão ou levada ao acervo) responde `404 SEM_ATRIBUICAO` nesta versão (a confirmar).

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF18.CA01** (CA a confirmar) | Dado um card de tarefa ou projeto visível para mim, quando abro a barra de interações, então posso **curtir/reagir, comentar, salvar, compartilhar e remixar** exatamente como nos RF26.CA01–CA07 (citados no card RF19), com contadores em tempo quase real. |
| **RF18.CA02** (CA a confirmar) | Dado qualquer interação, quando é enviada, então respeita a visibilidade do alvo (RF26.CA08: PRIVADA só dono, DEPARTAMENTO só membros, EMPRESA só mesma empresa → `403 ACESSO_NEGADO`) e gera notificação agrupada por hora ao dono (RF26.CA09). |
| **RF18.CA03** (CA a confirmar) | Dado um usuário que vê a tarefa/projeto, quando clica **Atribuir**, escolhe um colega **da mesma empresa**, prazo e nota, então nasce `Assignment` PROPOSTA (`origin BOTAO_ESQUEMA`, `previousResponsibleId` = responsável atual), com `AuditLog ASSIGNMENT_CREATED` e `Notification ATRIBUICAO_PROPOSTA` ao destinatário; se o ator é CHEFE e o destinatário membro do seu departamento a origem é `MINHA_EQUIPE` (RF10); colega de outra empresa → `403 EMPRESA_DIFERENTE`; alvo que o ator não pode ver → `403 ACESSO_NEGADO`; tarefa ARQUIVADA/CONCLUIDA ou projeto CONCLUIDO/ARQUIVADO → `409 ESTADO_INVALIDO`; já existe PROPOSTA/ACEITA para o mesmo alvo e destinatário → `409 ATRIBUICAO_DUPLICADA`. |
| **RF18.CA04** (CA a confirmar) | Dado uma `Assignment` PROPOSTA para mim, quando **aceito**, então ela vai a ACEITA, `TaskItem.responsibleId` / `ProjectTask.responsibleId` passam a mim, `TaskStateLog` registra (DISPONIVEL → EM_USO se era DISPONIVEL), a atribuição entra no índice de prioridade da minha Tarefa do Dia (RF44) e o remetente recebe `ATRIBUICAO_ACEITA`; quando **recuso**, informo motivo (`reason`, sem ele `422 MOTIVO_OBRIGATORIO`) e ela vai a RECUSADA com `ATRIBUICAO_RECUSADA`; só o destinatário responde (`403 ACESSO_NEGADO`) e resposta repetida é `409 ATRIBUICAO_JA_RESPONDIDA`. |
| **RF18.CA05** (CA a confirmar) | Dado uma `Assignment` ACEITA minha, quando clico **Retornar** e informo o motivo (≥ 20 caracteres), então ela vai a DEVOLVIDA, `responsibleId` volta a `previousResponsibleId`, `TaskStateLog` registra com o motivo, `AuditLog ASSIGNMENT_RESPONDED` grava e o remetente recebe `ATRIBUICAO_DEVOLVIDA`; o card do remetente mostra carimbo DEVOLVIDO + motivo até ele reatribuir ou retomar; sem `Assignment` ACEITA para mim → `404 SEM_ATRIBUICAO`; motivo curto → `422 MOTIVO_OBRIGATORIO`. |
| **RF18.CA06** (CA a confirmar) | Dado o card, quando o abro, então vejo o histórico de atribuições e retornos (`Assignment` por alvo, com quem, quando, status e motivo) ao lado dos contadores sociais; o perfil do destinatário (RF16) mostra a etiqueta "atribuída por …" nos itens visíveis; DELEGUEI da Tarefa do Dia (RF44) cria uma nova `Assignment` PROPOSTA (caminho inverso) — regras completas em RF46.CA03–CA05. |

| Interação | Entidade | Quem pode | Efeito no alvo | Notificação |
|---|---|---|---|---|
| Curtir · reagir · comentar · salvar · compartilhar · remixar | `Reaction`, `Comment`, `SavedItem`, `Share`, `Remix` | qualquer usuário com visibilidade (RF26.CA08) | contadores desnormalizados | `REACAO`, `COMENTARIO`, `MENCAO`, `REMIX` (RF26.CA09) |
| **Atribuir** (propor) | `Assignment` PROPOSTA, origem `BOTAO_ESQUEMA` (ou `MINHA_EQUIPE` se CHEFE → membro, RF10) | quem vê o alvo, a colega da mesma empresa | ao aceitar: `responsibleId` = destinatário · DISPONIVEL → EM_USO | `ATRIBUICAO_PROPOSTA` → `ATRIBUICAO_ACEITA` / `ATRIBUICAO_RECUSADA` · prioridade na Tarefa do Dia (RF44) |
| **Retornar** (devolver) | `Assignment` ACEITA → DEVOLVIDA, `reason` obrigatório | só o destinatário (`toUserId`) de uma atribuição ACEITA | `responsibleId` = `previousResponsibleId` · `TaskStateLog` · carimbo DEVOLVIDO no card do remetente | `ATRIBUICAO_DEVOLVIDA` |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_social {
  class Reaction {
    <<entity>>
    +actorId: UUID
    +targetType: TargetType
    +targetId: UUID
    +reactionType: ReactionType
  }
  class Comment {
    <<entity>>
    +authorId: UUID
    +targetType: TargetType
    +targetId: UUID
    +parentCommentId: UUID
    +contentMd: String
  }
  class SavedItem {
    <<entity>>
    +userId: UUID
    +targetType: TargetType
    +targetId: UUID
    +favorite: boolean
  }
  class Share {
    <<entity>>
    +actorId: UUID
    +targetType: TargetType
    +targetId: UUID
    +channel: ShareChannel
  }
  class Remix {
    <<entity>>
    +actorId: UUID
    +sourceType: TargetType
    +sourceId: UUID
    +resultId: UUID
  }
  class Notification {
    <<entity>>
    +recipientId: UUID
    +actorId: UUID
    +type: NotificationType
    +category: String SOCIAL
    +resourceType: String
    +resourceId: UUID
    +payloadJson: JSON motivo prazo
    +groupKey: String
  }
}

namespace ws_domain_mensageria_atribuicao {
  class Assignment {
    <<entity>>
    +id: UUID
    +targetType: AssignmentTargetType
    +targetId: UUID
    +fromUserId: UUID quem atribui
    +toUserId: UUID destinatário
    +origin: AssignmentOrigin
    +status: AssignmentStatus
    +dueAt: LocalDate
    +message: String nota
    +reason: String obrigatório em RECUSADA e DEVOLVIDA
    +previousResponsibleId: UUID
    +traceNodeId: UUID quando CHAT_DECIA
    +respondedAt: Instant
  }
  class DirectMessage {
    <<entity>>
    +conversationId: UUID
    +authorId: UUID
    +assignmentId: UUID mensagem de sistema RF46
  }
}

namespace ws_domain_alvos {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +responsibleId: UUID
    +state: TaskState
    +visibility: Visibility
    +dueAt: LocalDate
    +likesCount: long
    +commentsCount: long
    +savesCount: long
    +sharesCount: long
    +remixesCount: long
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +status: ProjectStatus
    +visibility: Visibility
    +likesCount: long
    +remixesCount: long
  }
  class ProjectTask {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +taskId: UUID
    +responsibleId: UUID
    +dueAt: LocalDate
  }
  class TaskStateLog {
    <<entity>>
    +taskId: UUID
    +fromState: TaskState
    +toState: TaskState
    +actorId: UUID
    +reason: String
    +correlationId: String
  }
  class User {
    <<entity>>
    +id: UUID
    +companyId: UUID mesma empresa
    +profileType: ProfileType
  }
  class Department {
    <<entity>>
    +id: UUID
    +headUserId: UUID chefe → MINHA_EQUIPE
  }
  class DepartmentMembership {
    <<entity>>
    +userId: UUID
    +departmentId: UUID
    +endedAt: Instant
  }
  class DailyTask {
    <<entity>>
    +userId: UUID
    +taskDate: LocalDate
    +priorityIndexJson: JSON inclui atribuída
    +feedback: DailyFeedback DELEGUEI
    +delegatedToUserId: UUID
  }
  class AuditLog {
    <<entity>>
    +actorId: UUID
    +action: String ASSIGNMENT_CREATED ASSIGNMENT_RESPONDED
    +resourceType: String
    +resourceId: UUID
  }
}

namespace ws_domain_enums {
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
  class AssignmentTargetType {
    <<enum>>
    TASK
    PROJECT
  }
  class AssignmentOrigin {
    <<enum>>
    CHAT_WS
    CHAT_DECIA
    BOTAO_ESQUEMA
    MINHA_EQUIPE
  }
  class AssignmentStatus {
    <<enum>>
    PROPOSTA
    ACEITA
    RECUSADA
    DEVOLVIDA
  }
  class NotificationType {
    <<enum>>
    REACAO
    COMENTARIO
    MENCAO
    REMIX
    ATRIBUICAO_PROPOSTA
    ATRIBUICAO_ACEITA
    ATRIBUICAO_RECUSADA
    ATRIBUICAO_DEVOLVIDA
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
}

namespace ws_application {
  class SocialService {
    <<service>>
    +toggleLike() react() comment() save() share() remix() ver RF19
    +counters(type, id) Counters
    -checkVisibility(actor, target) 403 ACESSO_NEGADO
  }
  class AssignmentService {
    <<service>>
    +propose(fromUserId, target, toUserId, dueAt, message, origin) Assignment
    +accept(toUserId, assignmentId) Assignment
    +refuse(toUserId, assignmentId, reason) Assignment
    +giveBack(toUserId, assignmentId, reason) Assignment retornar
    +historyForTarget(viewer, target) List~Assignment~
    -requireAssignee(actor, assignment) 403 ACESSO_NEGADO
    -requireOpen(assignment) 409 ATRIBUICAO_JA_RESPONDIDA
    -requireUnique(target, toUserId) 409 ATRIBUICAO_DUPLICADA
    -applyResponsible(assignment) TaskItem ou ProjectTask
  }
  class AccessPolicy {
    <<service>>
    +canView(actor, target) boolean
    +requireSameCompany(a, b) 403 EMPRESA_DIFERENTE
    +isDeptHeadOf(actor, toUserId) boolean origem MINHA_EQUIPE
  }
  class TaskStateMachine {
    <<service>>
    +transition(task, toState, actor, reason) TaskStateLog
  }
  class NotificationService {
    <<service>>
    +notifyOwner(event) groupKey hora
    +notify(recipient, type, payload)
  }
  class DailyTaskService {
    <<service>>
    +onAssignmentAccepted(toUserId, taskId, dueAt) prioridade atribuída
  }
  class CounterCachePort {
    <<port>>
    +incr(type, id, counter)
    +get(type, id) Counters
  }
}

namespace ws_web {
  class InteractionController {
    <<controller>>
    +POST_api_interactions_type_id_reactions_comments_saves_shares_remixes()
    +GET_api_interactions_type_id_counters()
    +GET_api_interactions_type_id_assignments() histórico do card
  }
  class AssignmentController {
    <<controller>>
    +POST_api_assignments(targetType, targetId, toUserId, dueAt, message, origin)
    +POST_api_assignments_id_accept()
    +POST_api_assignments_id_refuse(reason)
    +POST_api_assignments_id_give_back(reason)
    +GET_api_assignments_me(status)
  }
}

namespace ws_infrastructure {
  class RedisCounterAdapter {
    <<adapter>>
  }
  class CassandraNotificationAdapter {
    <<adapter>>
  }
  class MySqlAssignmentAdapter {
    <<adapter>>
  }
}

Reaction --> TargetType
Comment --> TargetType
SavedItem --> TargetType
Share --> TargetType
Remix --> TargetType
Assignment --> AssignmentTargetType
Assignment --> AssignmentOrigin
Assignment --> AssignmentStatus
Assignment "*" --> "1" User : fromUserId
Assignment "*" --> "1" User : toUserId mesma empresa
Assignment ..> TaskItem : targetId quando TASK → responsibleId
Assignment ..> ProjectScheme : targetId quando PROJECT
Assignment ..> ProjectTask : responsibleId das tarefas do projeto
Assignment ..> Department : MINHA_EQUIPE exige headUserId
Assignment ..> DepartmentMembership : destinatário membro vigente RF10
Assignment ..> DailyTask : ACEITA entra no priorityIndexJson
Assignment "1" --> "*" TaskStateLog : ACEITA e DEVOLVIDA
Assignment "1" --> "0..1" DirectMessage : mensagem de sistema RF46
TaskItem --> TaskState
Notification --> NotificationType
Notification ..> Assignment : ATRIBUICAO_*

InteractionController ..> SocialService
InteractionController ..> AssignmentService : historyForTarget
AssignmentController ..> AssignmentService
AssignmentService ..> AccessPolicy
AssignmentService ..> TaskStateMachine
AssignmentService ..> NotificationService : AFTER_COMMIT
AssignmentService ..> DailyTaskService : AFTER_COMMIT
AssignmentService ..> AuditLog
SocialService ..> CounterCachePort
RedisCounterAdapter ..|> CounterCachePort
CassandraNotificationAdapter ..> Notification : notifications_by_user TTL
MySqlAssignmentAdapter ..> Assignment : assignments

note for Assignment "TAXONOMIA 12b.4 (proposta) · tabela assignments · entidade única de RF10, RF18/RF19 e RF46 · PROPOSTA → ACEITA | RECUSADA, ACEITA → DEVOLVIDA (retornar) · reason obrigatório em RECUSADA e DEVOLVIDA (CA03–CA05)"
note for AssignmentService "propose: canView + requireSameCompany + requireUnique, origem BOTAO_ESQUEMA ou MINHA_EQUIPE se chefe → membro (CA03) · giveBack restaura previousResponsibleId (CA05)"
note for SocialService "seis interações clássicas detalhadas no RF19 (RF26.CA01–09) — aqui só referenciadas (CA01, CA02)"
note for TaskItem "retornar não cria estado novo em TaskState: o responsável volta ao anterior e o card do remetente ganha carimbo DEVOLVIDO (Q-53)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário (ator) · Destinatário · Remetente"]
    U1["Abre a barra de interações de uma tarefa ou projeto"]
    U2["Escolhe: curtir, reagir, comentar, salvar, compartilhar, remixar"]
    U3["Clica Atribuir, escolhe colega, prazo e nota"]
    U4["Destinatário aceita ou recusa com motivo"]
    U5["Destinatário clica Retornar e escreve o motivo"]
    U6["Remetente abre o card: carimbo DEVOLVIDO + motivo, reatribui ou retoma"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["InteractionBar com contadores otimistas + histórico de atribuições do card"]
    W2["AssignModal: colegas da mesma empresa (membros do departamento se CHEFE), prazo, nota"]
    W3["Card do destinatário: etiqueta Atribuída por · prazo; botões Aceitar / Recusar; depois Retornar"]
    W4["ReturnModal: motivo min 20 caracteres"]
    W5["Mensagem de erro específica (i18n)"]
  end

  subgraph LA["ws-application"]
    A1["SocialService.checkVisibility → ações RF26.CA01–09 (ver RF19)"]
    A2["AssignmentService.propose"]
    A3{"AccessPolicy.canView(ator, alvo)?"}
    A4["403 ACESSO_NEGADO"]
    A5{"destinatário da mesma empresa?"}
    A6["403 EMPRESA_DIFERENTE"]
    A7{"alvo ARQUIVADA/CONCLUIDA ou CONCLUIDO/ARQUIVADO?"}
    A8["409 ESTADO_INVALIDO"]
    A9{"já existe PROPOSTA ou ACEITA para alvo + destinatário?"}
    A10["409 ATRIBUICAO_DUPLICADA"]
    A11["origin = MINHA_EQUIPE se ator é headUserId do departamento do destinatário, senão BOTAO_ESQUEMA"]
    A12["INSERT Assignment PROPOSTA (previousResponsibleId = responsável atual); AuditLog ASSIGNMENT_CREATED"]
    A13{"ator é o toUserId e status PROPOSTA?"}
    A14["403 ACESSO_NEGADO ou 409 ATRIBUICAO_JA_RESPONDIDA"]
    A15["accept → ACEITA; applyResponsible: TaskItem/ProjectTask.responsibleId = toUserId; TaskStateMachine DISPONIVEL → EM_USO; TaskStateLog"]
    A16{"motivo informado?"}
    A17["422 MOTIVO_OBRIGATORIO"]
    A18["refuse → RECUSADA com reason"]
    A19["AssignmentService.giveBack"]
    A20{"existe Assignment ACEITA com toUserId = ator para o alvo?"}
    A21["404 SEM_ATRIBUICAO"]
    A22["giveBack → DEVOLVIDA com reason; responsibleId = previousResponsibleId; TaskStateLog com motivo; AuditLog ASSIGNMENT_RESPONDED"]
    A23["AFTER_COMMIT: NotificationService ATRIBUICAO_PROPOSTA / ACEITA / RECUSADA / DEVOLVIDA · DailyTaskService.onAssignmentAccepted"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["Sem inferência direta — a atribuição ACEITA entra no PriorityIndexCalculator determinístico da Tarefa do Dia (RF44)"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: reactions, comments, saved_items, shares, remixes · Redis counters")]
    P2[("MySQL: assignments, tasks.responsibleId, project_tasks.responsibleId, task_state_log, audit_log")]
    P3[("Cassandra: notifications_by_user · MySQL: daily_tasks priorityIndexJson")]
  end

  U1 --> W1
  W1 --> U2 --> A1 --> P1
  W1 --> U3 --> W2 --> A2 --> A3
  A3 -->|"não"| A4 --> W5
  A3 -->|"sim"| A5
  A5 -->|"não"| A6 --> W5
  A5 -->|"sim"| A7
  A7 -->|"sim"| A8 --> W5
  A7 -->|"não"| A9
  A9 -->|"sim"| A10 --> W5
  A9 -->|"não"| A11 --> A12 --> P2
  A12 --> A23
  A12 --> W3 --> U4 --> A13
  A13 -->|"não"| A14 --> W5
  A13 -->|"sim, aceitar"| A15 --> P2
  A13 -->|"sim, recusar"| A16
  A16 -->|"não"| A17 --> W5
  A16 -->|"sim"| A18 --> P2
  A15 --> A23
  A18 --> A23
  W3 --> U5 --> W4 --> A19 --> A20
  A20 -->|"não"| A21 --> W5
  A20 -->|"sim"| A16
  A16 -->|"sim, retornar"| A22 --> P2
  A22 --> A23
  A22 --> U6 --> U3
  A23 --> P3
  A23 -.-> I1

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  class A4,A6,A8,A10,A14,A17,A21,W5 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (remetente)
  actor M as Maria (destinatária)
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant R as Redis
  participant CS as Cassandra
  participant DE as DomainEvents (AFTER_COMMIT)

  Note over U,R: CA01, CA02 — curtir, reagir, comentar, salvar, compartilhar, remixar: fluxo detalhado no RF19 (RF26.CA01–09)
  U->>NX: curte a tarefa T3
  NX->>C: POST /api/interactions/TASK/T3/reactions {CURTIR}
  C->>S: SocialService.toggleLike → checkVisibility
  S->>DB: INSERT reactions
  S->>R: INCR counters:TASK:T3:likes
  S-->>C: 200 {liked, likesCount}

  U->>NX: Atribuir T3 a Maria, prazo 30/10, nota (CA03)
  NX->>C: POST /api/assignments {targetType TASK, targetId T3, toUserId maria, dueAt 2026-10-30, message, origin BOTAO_ESQUEMA}
  C->>S: AssignmentService.propose(userId, TASK T3, maria, dueAt, message, BOTAO_ESQUEMA)
  S->>DB: tasks T3 (state, responsibleId, visibility, departmentId) + users (companyId de ambos) + departments.headUserId + assignments abertas para T3 e maria
  alt ator não vê T3
    S-->>C: 403 ACESSO_NEGADO
  else Maria é de outra empresa
    S-->>C: 403 EMPRESA_DIFERENTE
  else T3 ARQUIVADA ou CONCLUIDA
    S-->>C: 409 ESTADO_INVALIDO
  else já existe PROPOSTA ou ACEITA para T3 e Maria
    S-->>C: 409 ATRIBUICAO_DUPLICADA
  else permitido
    S->>S: origin = MINHA_EQUIPE se ator é headUserId do departamento de Maria (RF10), senão BOTAO_ESQUEMA
    S->>DB: INSERT assignments (PROPOSTA, from ator, to maria, dueAt, message, previousResponsibleId = responsibleId atual)
    S->>DB: INSERT audit_log ASSIGNMENT_CREATED
    S->>DE: publish AssignmentProposed {T3, maria}
    S-->>C: 201 Assignment PROPOSTA
    C-->>NX: 201
    NX-->>U: card com etiqueta Proposta a Maria · aguardando aceite
  end
  DE->>CS: INSERT notifications_by_user (recipient maria, type ATRIBUICAO_PROPOSTA, payload prazo e nota)

  M->>NX: aceita a atribuição (CA04)
  NX->>C: POST /api/assignments/{id}/accept
  C->>S: AssignmentService.accept(maria, id)
  alt ator não é toUserId
    S-->>C: 403 ACESSO_NEGADO
  else status já não é PROPOSTA
    S-->>C: 409 ATRIBUICAO_JA_RESPONDIDA
  else ok
    S->>DB: UPDATE assignments SET status ACEITA, respondedAt
    S->>DB: UPDATE tasks SET responsibleId = maria · TaskStateMachine DISPONIVEL → EM_USO · INSERT task_state_log (reason ATRIBUICAO_ACEITA)
    S->>DB: INSERT audit_log ASSIGNMENT_RESPONDED
    S->>DE: publish AssignmentAccepted
    S-->>C: 200 Assignment ACEITA
    C-->>NX: 200
  end
  DE->>CS: INSERT notifications_by_user (recipient remetente, type ATRIBUICAO_ACEITA)
  DE->>DB: DailyTaskService.onAssignmentAccepted → priorityIndexJson de maria inclui atribuída (RF44)
  Note over M,DB: recusar: POST /api/assignments/{id}/refuse {reason} → RECUSADA, ATRIBUICAO_RECUSADA ao remetente. Sem reason → 422 MOTIVO_OBRIGATORIO

  M->>NX: dias depois clica Retornar em T3 e escreve o motivo (CA05)
  NX->>C: POST /api/assignments/{id}/give-back {reason "Falta a planilha orçamentária atualizada e o parecer jurídico"}
  C->>S: AssignmentService.giveBack(maria, id, reason)
  S->>DB: assignments WHERE id AND toUserId = maria
  alt não existe Assignment ACEITA de Maria para T3
    S-->>C: 404 SEM_ATRIBUICAO
  else reason com menos de 20 caracteres
    S-->>C: 422 MOTIVO_OBRIGATORIO
  else permitido
    S->>DB: UPDATE assignments SET status DEVOLVIDA, reason, respondedAt
    S->>DB: UPDATE tasks SET responsibleId = previousResponsibleId · INSERT task_state_log (reason devolvida com motivo)
    S->>DB: INSERT audit_log ASSIGNMENT_RESPONDED
    S->>DE: publish AssignmentGivenBack {T3, remetente, reason}
    S-->>C: 200 Assignment DEVOLVIDA
    C-->>NX: 200
    NX-->>M: card sai da minha lista, etiqueta Devolvida ao remetente
  end
  DE->>CS: INSERT notifications_by_user (recipient remetente, type ATRIBUICAO_DEVOLVIDA, payload motivo)

  U->>NX: abre T3 (CA06)
  NX->>C: GET /api/interactions/TASK/T3/assignments
  C->>S: AssignmentService.historyForTarget(viewer, TASK T3)
  S->>DB: assignments WHERE targetType TASK AND targetId T3 ORDER BY at
  S-->>C: 200 [{maria, PROPOSTA → ACEITA → DEVOLVIDA, reason, datas}]
  C-->>NX: 200
  NX-->>U: carimbo DEVOLVIDO com motivo + histórico ao lado dos contadores sociais, botão Reatribuir
  Note over U,DB: projeto devolvido segue o mesmo fluxo em project_tasks.responsibleId e não altera ProjectStatus (Q-53)
```

## 4. Máquina de estados

Entidade central do RF18 é **`Assignment.status`** (`AssignmentStatus` PROPOSTA · ACEITA · RECUSADA · DEVOLVIDA, TAXONOMIA §12b — a mesma máquina do RF46 vista pelo botão do esquema). O segundo bloco mostra o efeito sobre **`TaskItem.state`** (`TaskState`), que **não ganha estado novo**: retornar restaura o responsável e volta a tarefa a DISPONIVEL se ninguém mais a usa (Q-53).

```mermaid
stateDiagram-v2
  state "Assignment.status — atribuir e retornar pelo card (CA03–CA05)" as AS {
    [*] --> PROPOSTA : POST assignments origem BOTAO_ESQUEMA ou MINHA_EQUIPE, previousResponsibleId guardado
    PROPOSTA --> ACEITA : destinatário aceita, responsibleId atualizado, TaskStateLog, Tarefa do Dia
    PROPOSTA --> RECUSADA : destinatário recusa com motivo obrigatório
    ACEITA --> DEVOLVIDA : destinatário retorna com motivo, responsibleId = previousResponsibleId
    ACEITA --> ACEITA : trabalho segue, DELEGUEI da Tarefa do Dia gera nova Assignment (RF44)
    ACEITA --> [*] : tarefa CONCLUIDA ou projeto CONCLUIDO
    RECUSADA --> [*]
    DEVOLVIDA --> [*] : remetente reatribui (nova Assignment) ou retoma
  }
  state "TaskItem.state — efeito de atribuir e retornar" as TS {
    DISPONIVEL --> EM_USO : Assignment ACEITA (responsibleId = destinatário)
    EM_USO --> EM_USO : Assignment DEVOLVIDA e tarefa ainda em projeto, responsibleId restaurado
    EM_USO --> DISPONIVEL : Assignment DEVOLVIDA e tarefa fora de projeto
  }
  note right of AS
    Só o destinatário responde 403 ACESSO_NEGADO.
    Resposta repetida 409 ATRIBUICAO_JA_RESPONDIDA.
    Recusar ou retornar sem motivo 422 MOTIVO_OBRIGATORIO.
    Propor duplicada 409 ATRIBUICAO_DUPLICADA. Outra empresa 403 EMPRESA_DIFERENTE.
    Toda transição grava AuditLog e notifica ATRIBUICAO_* (CA06).
  end note
  note right of TS
    Carimbo DEVOLVIDO com motivo no card do remetente enquanto a última Assignment é DEVOLVIDA.
    ProjectStatus.DEVOLVIDO continua reservado à revisão de decisão (RF15/RF29) — dúvida Q-53.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["components/ui: InteractionBar — LikeButton, ReactionPicker, CommentThread, SaveButton, ShareSheet, RemixButton (RF19) + AssignButton com AssignModal (colegas da mesma empresa / membros do departamento, prazo, nota), AcceptRefuseBar, ReturnButton com ReturnModal (motivo min 20), AssignmentBadge, AssignmentHistory, Stamp DEVOLVIDO"]
    F2["Usado em: app/tasks, app/projects, app/mural, app/search, app/u/[username] (RF16), app/desk (RF21), Minha equipe (RF10), chat (RF46)"]
  end

  subgraph WEB["ws-web"]
    C1["InteractionController — /api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes|counters (RF19) + /assignments (histórico do card)"]
    C2["AssignmentController — /api/assignments, /{id}/accept, /{id}/refuse, /{id}/give-back, /me (compartilhado com RF10 e RF46)"]
  end

  subgraph APP["ws-application"]
    S1["SocialService RF19"]
    S2["AssignmentService — propose, accept, refuse, giveBack (TAXONOMIA 12b)"]
    S3["AccessPolicy — canView, requireSameCompany, isDeptHeadOf"]
    S4["TaskStateMachine RF41"]
    S5["NotificationService plataforma"]
    S6["DailyTaskService RF44"]
    P1["CounterCachePort"]
  end

  subgraph DOM["ws-domain"]
    D1["Reaction · Comment · SavedItem · Share · Remix"]
    D2["Assignment · enums AssignmentTargetType, AssignmentOrigin, AssignmentStatus · NotificationType ATRIBUICAO_* (TAXONOMIA 12b, proposta)"]
    D3["TaskItem · ProjectScheme · ProjectTask · TaskStateLog · User · Department · DepartmentMembership · DailyTask · Notification · AuditLog · DomainEventOutbox"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: reactions, comments, saved_items, shares, remixes, assignments, tasks, project_schemes, project_tasks, task_state_log, daily_tasks, audit_log")]
    I2[("cache-redis: counters:{type}:{id}:*")]
    I3[("persistence-cassandra: notifications_by_user TTL · messages_by_conversation (mensagem de sistema, RF46)")]
    I4["platform: outbox AFTER_COMMIT AssignmentProposed, AssignmentAccepted, AssignmentRefused, AssignmentGivenBack, InteractionCreated"]
  end

  F1 --- F2
  F1 -->|"HTTPS/JSON"| C1
  F1 -->|"HTTPS/JSON"| C2
  C1 --> S1
  C1 --> S2
  C2 --> S2
  S1 --> P1
  S1 --> D1
  S2 --> S3
  S2 --> S4
  S2 --> D2
  S2 --> D3
  D3 --> I4
  I4 --> S5
  I4 --> S6
  S5 --> I3
  S6 --> I1
  D1 --> I1
  D2 --> I1
  D3 --> I1
  P1 --> I2
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF18.CA01 | Classes `Reaction`, `Comment`, `SavedItem`, `Share`, `Remix`, `SocialService` (nota "seis interações detalhadas no RF19"), `CounterCachePort` · Atividades `U1 → W1 → U2 → A1 → P1` · Sequência msgs 1–6 (curtir T3, INCR counters) · Componentes `InteractionBar` (parte RF19), `cache-redis` · Detalhe completo: RF19 (RF26.CA01–07) |
| RF18.CA02 | `SocialService.checkVisibility` (403), `Notification.groupKey`, `NotificationService.notifyOwner` · Atividade `A1` · Sequência nota inicial · Componentes `NotificationService`, `persistence-cassandra` · Detalhe: RF19 (RF26.CA08–09) |
| RF18.CA03 | `Assignment` (TAXONOMIA 12b; nota), enums `AssignmentTargetType`, `AssignmentOrigin` (BOTAO_ESQUEMA, MINHA_EQUIPE), `AssignmentStatus`, `AssignmentService.propose/requireUnique`, `AccessPolicy.canView/requireSameCompany/isDeptHeadOf`, `Department.headUserId`, `AuditLog ASSIGNMENT_CREATED`, `NotificationType.ATRIBUICAO_PROPOSTA` · Atividades `U3 → W2 → A2 → A3 (403) → A5 (403 EMPRESA_DIFERENTE) → A7 (409 ESTADO_INVALIDO) → A9 (409 ATRIBUICAO_DUPLICADA) → A11 → A12 → P2 → A23` · Sequência msgs 7–24 (`POST /api/assignments … origin BOTAO_ESQUEMA`, 4 `alt` de erro, `INSERT assignments PROPOSTA … previousResponsibleId`, `notifications_by_user ATRIBUICAO_PROPOSTA`) · Transição `[*] → PROPOSTA` · Componentes `AssignButton`, `AssignModal`, `AssignmentController`, `AssignmentService` |
| RF18.CA04 | `AssignmentService.accept/refuse/requireAssignee/requireOpen/applyResponsible`, `TaskItem.responsibleId`, `ProjectTask.responsibleId`, `TaskStateMachine`, `TaskStateLog`, `DailyTaskService.onAssignmentAccepted`, `DailyTask.priorityIndexJson`, `NotificationType.ATRIBUICAO_ACEITA/ATRIBUICAO_RECUSADA` · Atividades `W3 → U4 → A13 (403/409) → A15 → P2 → A23` e `A16 (422) → A18` · Sequência msgs 25–38 (`accept`, `alt` 403 / 409, `responsibleId = maria · DISPONIVEL → EM_USO`, `ATRIBUICAO_ACEITA`, `onAssignmentAccepted`, nota recusar → 422) · Transições `PROPOSTA → ACEITA / RECUSADA`, `DISPONIVEL → EM_USO` · Componentes `AcceptRefuseBar`, `AssignmentBadge`, `DailyTaskService RF44` |
| RF18.CA05 | `AssignmentService.giveBack`, `Assignment.reason/previousResponsibleId/respondedAt`, `TaskStateLog`, `AuditLog ASSIGNMENT_RESPONDED`, `NotificationType.ATRIBUICAO_DEVOLVIDA` · Atividades `U5 → W4 → A19 → A20 (404 SEM_ATRIBUICAO) → A16 (422) → A22 → P2 → A23`, `U6` (carimbo) · Sequência msgs 39–52 (`POST /api/assignments/{id}/give-back {reason}`, `alt` 404 / 422, `status DEVOLVIDA`, `responsibleId = previousResponsibleId`, `ATRIBUICAO_DEVOLVIDA`) · Transição `ACEITA → DEVOLVIDA` e `EM_USO → EM_USO / DISPONIVEL` + notas (Q-53) · Componentes `ReturnButton`, `ReturnModal`, `Stamp DEVOLVIDO` |
| RF18.CA06 | `AssignmentService.historyForTarget`, `InteractionController.GET_api_interactions_type_id_assignments`, `DailyTask.feedback DELEGUEI/delegatedToUserId`, `AuditLog`, `DirectMessage.assignmentId` (RF46) · Atividades `W1` (histórico no card), `A23 → P3`, transição `ACEITA → ACEITA` (DELEGUEI) · Sequência msgs 53–59 (`GET …/assignments → histórico`, carimbo + botão Reatribuir, nota do projeto) · Componentes `AssignmentHistory`, `app/u/[username] (RF16)`, `Minha equipe (RF10)`, `chat (RF46)` |


Tela/aba: `/mural` (esqueleto em `app/(shell)/mural/page.tsx`) · `/u/[username]` (esqueleto em `app/(shell)/u/[username]/page.tsx`) · `/tasks` (esqueleto em `app/(shell)/tasks/page.tsx`) · `/admin` (esqueleto em `app/(shell)/admin/page.tsx`)
