# RF9 — Adicionar ou remover usuários de uma sessão de conversa ativa.
**HU:** HU9 · **Sprint (board Work Station):** 2 · **Equivalente FAI:** RF10 Copilot (conversa individual no FAI — aqui a sessão é em grupo, com gestão de participantes pelo administrador) · **Aba/rota:** DECIA (`/decia/[sessionId]/participants` — painel de participantes com busca de colegas) — rota sugerida
**Critérios de aceite cobertos:** RF9.CA01 … RF9.CA06 (RF1–RF18 não têm CAs no board: derivados da HU9 + RF4/RF10 e marcados "CA a confirmar")

> **HU9** — COMO administrador da sessão de conversa POSSO adicionar ou remover usuários de uma sessão de conversa ativa PARA manter o grupo de participantes adequado ao tema e às regras de acesso.

## Critérios de aceite derivados da HU9 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF9.CA01** (CA a confirmar) | Dado o administrador da sessão (`adminUserId` ou `Role ADMIN`) numa sessão `ATIVA` (ou `REABERTA`), quando adiciona um usuário (busca por nome/username) com `role` MEMBRO ou OBSERVADOR, então é criado `SessionParticipant` (`joinedAt`, `addedBy`, `canReplyDivergence` padrão false) e `participantCount` é incrementado; o usuário deve respeitar o `accessMode` (RF4.CA04): DEPARTAMENTO → mesmo `departmentId`, EMPRESA/FECHADA → mesma `companyId`; fora do escopo → `422 FORA_DO_ESCOPO_ACESSO`. |
| **RF9.CA02** (CA a confirmar) | Dado o administrador, quando remove um participante informando `removeReason` (obrigatório), então `leftAt`, `removedBy` e `removeReason` são gravados (sem apagar o registro), `participantCount` decrementa, as mensagens do removido **permanecem** no histórico e ele perde o acesso imediatamente (canal SSE encerrado, `403` nas próximas chamadas) e deixa de receber notificações da sessão. |
| **RF9.CA03** (CA a confirmar) | Dado as regras, então: quem não é admin → `403 ACESSO_NEGADO`; sessão fora de `ATIVA`/`REABERTA` → `409 SESSAO_NAO_ATIVA`; usuário já participante ativo → `409 PARTICIPANTE_DUPLICADO`; tentar remover o próprio `adminUserId` ou o participante `IA` → `422 VALIDACAO`; usuário com `AccountStatus` diferente de `ACTIVE` → `422 USUARIO_INATIVO`. |
| **RF9.CA04** (CA a confirmar) | Dado um usuário removido, quando é adicionado de novo, então nasce um **novo** `SessionParticipant` (histórico de entradas e saídas preservado), `lastReadAt` reinicia e ele volta a ver as mensagens conforme o `accessMode`; a troca de papel MEMBRO ↔ OBSERVADOR (`PATCH …/participants/{userId}`) não cria novo registro. |
| **RF9.CA05** (CA a confirmar) | Dado a inclusão ou remoção, então `ParticipantAdded`/`ParticipantRemoved` (AFTER_COMMIT) notificam o afetado (`Notification` DECIA "você foi adicionado/removido" com motivo), publicam mensagem de sistema no chat ("Fulano entrou na sessão" / "saiu da sessão"), atualizam o painel em tempo real e gravam `AuditLog PARTICIPANT_ADDED / PARTICIPANT_REMOVED` com `correlationId`. |
| **RF9.CA06** (CA a confirmar) | Dado o painel de participantes, então ele lista `role`, `joinedAt`, presença online (SSE), `canReplyDivergence` (RF10) e ações do admin (remover, trocar papel, habilitar resposta a divergência); participantes comuns veem a lista sem ações; tudo i18n e paginado quando > 50. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  namespace wai_domain {
    class DeciaSession {
      <<entity>>
      +id: UUID
      +adminUserId: UUID
      +companyId: UUID
      +departmentId: UUID
      +accessMode: SessionAccess
      +status: SessionStatus
      +participantCount: int
      +version: long
    }
    class SessionParticipant {
      <<entity>>
      +id: UUID
      +sessionId: UUID
      +userId: UUID
      +role: ParticipantRole
      +joinedAt: Instant
      +leftAt: Instant
      +addedBy: UUID
      +removedBy: UUID
      +removeReason: String
      +canReplyDivergence: boolean
      +lastReadAt: Instant
    }
    class User {
      <<entity>>
      +id: UUID
      +username: String
      +displayName: String
      +role: Role
      +status: AccountStatus
      +companyId: UUID
      +departmentId: UUID
      +avatarUrl: String
    }
    class Notification {
      <<entity>>
      +recipientId: UUID
      +actorId: UUID
      +type: NotificationType
      +category: String
      +resourceId: UUID
      +body: String
    }
    class AuditLog {
      <<entity>>
      +actorId: UUID
      +action: String
      +resourceType: String
      +resourceId: UUID
      +metadataJson: String
      +correlationId: String
    }
    class ParticipantRole {
      <<enum>>
      ADMIN
      MEMBRO
      OBSERVADOR
      IA
    }
    class SessionAccess {
      <<enum>>
      FECHADA
      DEPARTAMENTO
      EMPRESA
    }
    class SessionStatus {
      <<enum>>
      PROPOSTA
      ATIVA
      EM_RESUMO
      EM_DECISAO
      EM_REVISAO
      REABERTA
      ENCERRADA
      ARQUIVADA
    }
    class SessionAccessPolicy {
      <<service>>
      +inScope(user User, session DeciaSession) boolean
      +canAdminister(user User, session DeciaSession) boolean
      +participantsEditable(status SessionStatus) boolean
    }
  }

  namespace wai_application {
    class ParticipantService {
      <<service>>
      +add(current CurrentUser, sessionId, cmd AddParticipantCommand) ParticipantView
      +remove(current CurrentUser, sessionId, userId, reason) ParticipantView
      +changeRole(current CurrentUser, sessionId, userId, role ParticipantRole) ParticipantView
      +enableReplyDivergence(current CurrentUser, sessionId, userId, enabled) ParticipantView
      +list(current CurrentUser, sessionId, page) Page~ParticipantView~
      +searchCandidates(current CurrentUser, sessionId, query) List~UserCard~
      -requireActive(sessionId, userId) SessionParticipant
    }
    class Guard {
      <<service>>
      +requireSessionAdmin(current CurrentUser, session DeciaSession) void
    }
    class MessageService {
      <<service>>
      +postSystemMessage(sessionId, bodyMd, correlationId) SessionMessage
    }
    class NotificationPort {
      <<port>>
      +notify(recipients List~UUID~, notification Notification) void
    }
    class RealtimePublisherPort {
      <<port>>
      +publish(sessionId, event SessionEvent) void
      +disconnect(sessionId, userId) void
    }
    class DomainEventPublisherPort {
      <<port>>
      +publish(event DomainEvent) void
    }
  }

  namespace wai_web {
    class DeciaSessionController {
      <<controller>>
      +participants(sessionId, page) Page~ParticipantView~
      +addParticipant(sessionId, cmd AddParticipantCommand) ParticipantView
      +removeParticipant(sessionId, userId, body RemoveRequest) ParticipantView
      +changeRole(sessionId, userId, body RoleRequest) ParticipantView
      +searchCandidates(sessionId, q) List~UserCard~
    }
    class SessionStreamController {
      <<controller>>
      +stream(sessionId) SseEmitter
    }
  }

  namespace wai_infrastructure {
    class CassandraNotificationProjector {
      <<adapter>>
    }
    class RedisRealtimePublisher {
      <<adapter>>
      +channel: String
    }
    class OutboxEventPublisher {
      <<adapter>>
    }
  }

  DeciaSessionController --> ParticipantService
  SessionStreamController --> RealtimePublisherPort : subscribe por participante ativo
  ParticipantService --> Guard
  ParticipantService --> SessionAccessPolicy
  ParticipantService --> MessageService : mensagem de sistema
  ParticipantService --> NotificationPort
  ParticipantService --> RealtimePublisherPort
  ParticipantService --> DomainEventPublisherPort
  CassandraNotificationProjector ..|> NotificationPort
  RedisRealtimePublisher ..|> RealtimePublisherPort
  OutboxEventPublisher ..|> DomainEventPublisherPort
  DeciaSession "1" --> "*" SessionParticipant : participantes (histórico)
  SessionParticipant ..> User : userId, addedBy, removedBy
  SessionParticipant --> ParticipantRole
  DeciaSession --> SessionAccess
  DeciaSession --> SessionStatus
  Notification ..> SessionParticipant : PARTICIPANTE_ADICIONADO, PARTICIPANTE_REMOVIDO
  AuditLog ..> SessionParticipant : PARTICIPANT_ADDED, PARTICIPANT_REMOVED

  note for SessionParticipant "tabela session_participants (RF5, RF9) · ativo = leftAt nulo · readmissão cria novo registro · índice único (sessionId, userId) WHERE leftAt IS NULL"
  note for SessionAccessPolicy "inScope: DEPARTAMENTO → mesmo departmentId · EMPRESA/FECHADA → mesma companyId (RF4.CA04)"
```

## 2. Diagrama de atividades

Raias: Administrador da sessão · Participante afetado · Web/BFF · `wai-application` · Persistência (o RF9 não usa o AiEngine).

```mermaid
flowchart TD
  subgraph L1["Ator humano — Administrador da sessão"]
    A1(["Abre o painel de participantes"]) --> A2{"Ação?"}
    A2 -->|adicionar| A3["Busca colega por nome/username e escolhe MEMBRO ou OBSERVADOR"]
    A2 -->|remover| A4["Escolhe o participante e informa o motivo"]
    A2 -->|trocar papel| A5["MEMBRO ↔ OBSERVADOR ou habilita resposta a divergência (RF10)"]
    A20(["Painel atualizado com a lista e os papéis"])
  end

  subgraph L1b["Ator humano — Participante afetado"]
    H1["Recebe notificação: você foi adicionado"] --> H2["Abre a sessão e lê as mensagens"]
    H3["Recebe notificação: você foi removido (motivo)"] --> H4["Perde acesso: SSE encerrado, 403 nas próximas chamadas"]
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["GET /api/decia/sessions/{id}/participants/candidates?q="]
    B2["POST /api/decia/sessions/{id}/participants {userId, role}"]
    B3["DELETE /api/decia/sessions/{id}/participants/{userId} {reason}"]
    B4["PATCH /api/decia/sessions/{id}/participants/{userId} {role | canReplyDivergence}"]
    B5["SSE ParticipantAdded/Removed → lista e presença online"]
  end

  subgraph L3["wai-application — ParticipantService"]
    C1{"É adminUserId ou Role ADMIN?"}
    C1 -->|não| E403["403 ACESSO_NEGADO"]
    C1 -->|sim| C2{"Sessão ATIVA ou REABERTA?"}
    C2 -->|não| E409["409 SESSAO_NAO_ATIVA"]
    C2 -->|sim| C3{"Operação?"}
    C3 -->|adicionar| C4{"Usuário ACTIVE?"}
    C4 -->|não| E422a["422 USUARIO_INATIVO"]
    C4 -->|sim| C5{"Dentro do accessMode? (departamento/empresa)"}
    C5 -->|não| E422b["422 FORA_DO_ESCOPO_ACESSO"]
    C5 -->|sim| C6{"Já é participante ativo?"}
    C6 -->|sim| E409b["409 PARTICIPANTE_DUPLICADO"]
    C6 -->|não| C7["Cria SessionParticipant (role, joinedAt, addedBy) — novo registro mesmo se já foi removido antes"]
    C7 --> C8["participantCount++ (lock otimista version)"]
    C8 --> C9["Mensagem de sistema: Fulano entrou · publica ParticipantAdded (AFTER_COMMIT)"]
    C3 -->|remover| C10{"Alvo é o adminUserId ou o participante IA?"}
    C10 -->|sim| E422c["422 VALIDACAO (não remove admin nem IA)"]
    C10 -->|não| C11{"Motivo informado e alvo ativo?"}
    C11 -->|não| E422c
    C11 -->|sim| C12["leftAt=now, removedBy, removeReason (mensagens permanecem)"]
    C12 --> C13["participantCount-- · desconecta SSE do removido"]
    C13 --> C14["Mensagem de sistema: Fulano saiu · publica ParticipantRemoved (AFTER_COMMIT)"]
    C3 -->|trocar papel| C15["Atualiza role ou canReplyDivergence (sem novo registro)"]
    C15 --> C16["Publica ParticipantRoleChanged (AFTER_COMMIT)"]
    C17["AFTER_COMMIT: Notification ao afetado · AuditLog PARTICIPANT_ADDED/REMOVED · realtime para o painel"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL: session_participants, decia_sessions.participant_count, users, audit_log, domain_events")]
    D2[("Cassandra: messages_by_session (mensagem de sistema), notifications_by_user")]
    D3[("Redis: pub/sub decia.session.{id} · presença online")]
  end

  A3 --> B1 --> D1
  A3 --> B2 --> C1
  A4 --> B3 --> C1
  A5 --> B4 --> C1
  C7 --> D1
  C8 --> D1
  C12 --> D1
  C13 --> D1
  C15 --> D1
  C9 --> D2
  C14 --> D2
  C9 --> C17
  C14 --> C17
  C16 --> C17
  C17 --> D2
  C17 --> D3
  D3 --> B5 --> A20
  C17 --> H1
  C17 --> H3
  C13 --> H4

  classDef erro fill:#fde2e2,stroke:#c0392b,color:#7b1d1d;
  class E403,E409,E409b,E422a,E422b,E422c erro;
```

## 3. Diagrama de sequência

Caminho feliz de adicionar e remover, com os `alt` de erro do CA03 (403, 409, 422) e a readmissão (CA04) em `opt`. Sem ponto e vírgula nas mensagens.

```mermaid
sequenceDiagram
  autonumber
  actor A as Administrador da sessão
  actor P as Participante afetado
  participant N as Next.js (App Router) /decia/[id]/participants
  participant C as DeciaSessionController (wai-web)
  participant S as ParticipantService (wai-application)
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant R as Redis
  participant DE as DomainEvents (AFTER_COMMIT)

  A->>N: busca "Maria" e escolhe MEMBRO
  N->>C: GET /api/decia/sessions/{id}/participants/candidates?q=maria
  C->>S: searchCandidates(currentUser, sessionId, "maria")
  S->>DB: SELECT users WHERE company_id (e department_id se DEPARTAMENTO) AND status=ACTIVE AND nome LIKE
  S-->>C: lista de UserCard (sem quem já está ativo)
  C-->>N: 200

  N->>C: POST /api/decia/sessions/{id}/participants {userId, role=MEMBRO}
  C->>S: add(currentUser, sessionId, AddParticipantCommand)
  S->>DB: SELECT decia_sessions WHERE id (admin_user_id, status, access_mode, version)
  alt não é adminUserId nem ADMIN (CA03)
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else status fora de ATIVA/REABERTA (CA03)
    S-->>C: 409 SESSAO_NAO_ATIVA
    C-->>N: 409
  else usuário fora do accessMode (CA01)
    S->>DB: SELECT users WHERE id (company_id, department_id, status)
    S-->>C: 422 FORA_DO_ESCOPO_ACESSO
  else já é participante ativo (CA03)
    S->>DB: SELECT session_participants WHERE session_id AND user_id AND left_at IS NULL
    S-->>C: 409 PARTICIPANTE_DUPLICADO
  else pode adicionar (CA01)
    S->>DB: BEGIN · INSERT session_participants (role=MEMBRO, joined_at, added_by) · UPDATE decia_sessions SET participant_count+1, version+1 · INSERT domain_events ParticipantAdded · COMMIT
    S->>CS: INSERT messages_by_session (authorKind=IA, "Maria entrou na sessão")
    S-->>C: 201 ParticipantView
    C-->>N: 201
    N-->>A: Maria aparece no painel como MEMBRO
    DE->>CS: AFTER_COMMIT → notifications_by_user (Maria: PARTICIPANTE_ADICIONADO) (CA05)
    DE->>DB: AFTER_COMMIT → INSERT audit_log PARTICIPANT_ADDED (correlationId) (CA05)
    DE->>R: AFTER_COMMIT → PUBLISH decia.session.{id} ParticipantAdded (CA05)
    R-->>N: SSE → painel e presença atualizados (CA06)
    DE-->>P: notificação "você foi adicionado à sessão X"
    P->>N: abre a sessão e lê as mensagens conforme o accessMode
  end

  A->>N: remove João com motivo "mudou de departamento"
  N->>C: DELETE /api/decia/sessions/{id}/participants/{joaoId} {reason}
  C->>S: remove(currentUser, sessionId, joaoId, reason)
  alt alvo é o adminUserId ou o participante IA (CA03)
    S-->>C: 422 VALIDACAO (não é possível remover admin ou IA)
  else motivo vazio (CA02)
    S-->>C: 422 VALIDACAO (details.reason)
  else pode remover (CA02)
    S->>DB: BEGIN · UPDATE session_participants SET left_at=now, removed_by, remove_reason · UPDATE decia_sessions SET participant_count-1 · INSERT domain_events ParticipantRemoved · COMMIT
    S->>R: disconnect(sessionId, joaoId) → encerra o SSE do removido
    S->>CS: INSERT messages_by_session (authorKind=IA, "João saiu da sessão")
    S-->>C: 200 ParticipantView (leftAt preenchido)
    C-->>N: 200
    DE->>CS: AFTER_COMMIT → notifications_by_user (João: PARTICIPANTE_REMOVIDO + motivo) (CA05)
    DE->>DB: AFTER_COMMIT → INSERT audit_log PARTICIPANT_REMOVED (CA05)
    DE->>R: AFTER_COMMIT → PUBLISH ParticipantRemoved → painel dos demais (CA06)
    P->>N: João tenta POST messages
    N->>C: POST /api/decia/sessions/{id}/messages
    C-->>N: 403 ACESSO_NEGADO (não é participante ativo) (CA02)
  end

  opt Readmitir João depois (CA04)
    A->>N: adiciona João de novo como OBSERVADOR
    N->>C: POST /api/decia/sessions/{id}/participants {userId=joaoId, role=OBSERVADOR}
    C->>S: add(currentUser, sessionId, cmd)
    S->>DB: INSERT session_participants (novo registro, lastReadAt nulo) — o antigo com left_at permanece
    S-->>C: 201 ParticipantView
  end
```

## 4. Máquina de estados

Entidade central: `SessionParticipant`. Não há enum de status na TAXONOMIA; o ciclo é implícito por `joinedAt`/`leftAt` e `role`. A guarda da sessão (`SessionStatus` ATIVA/REABERTA) condiciona toda operação do RF9.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> ATIVO : add (RF9.CA01) ou proposta/início da sessão (RF5)

  state "ATIVO (leftAt nulo)" as ATIVO {
    [*] --> MEMBRO
    MEMBRO --> OBSERVADOR : admin troca o papel (RF9.CA04)
    OBSERVADOR --> MEMBRO : admin troca o papel
    MEMBRO --> MEMBRO_RESPONDE_DIVERGENCIA : admin habilita canReplyDivergence (RF10)
    MEMBRO_RESPONDE_DIVERGENCIA --> MEMBRO : admin desabilita
  }

  ATIVO --> REMOVIDO : admin remove com motivo (RF9.CA02) — leftAt, removedBy, removeReason
  ATIVO --> SAIU : participante sai por conta própria (a confirmar)
  ATIVO --> ENCERRADO : sessão vai a ENCERRADA/ARQUIVADA (RF17) — registro preservado
  REMOVIDO --> [*] : registro histórico permanece
  SAIU --> [*]
  ENCERRADO --> [*]

  note right of REMOVIDO
    Readmissão (RF9.CA04) cria um NOVO SessionParticipant
    em ATIVO, não reabre este. Mensagens do removido
    continuam no histórico e no DecisionTrace.
  end note
  note left of ATIVO
    Guarda: add/remove/changeRole só com
    DeciaSession.status ATIVA ou REABERTA
    (409 SESSAO_NAO_ATIVA). ADMIN e IA não são removíveis.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/(app)/decia/[sessionId]/participants/page.tsx (painel)"]
    FE2["components/ui (ParticipantList, UserSearchCombobox, RoleSelect, RemoveDialog com motivo, PresenceDot)"]
    FE3["lib/decia/useSessionStream.ts (ParticipantAdded/Removed/RoleChanged)"]
  end

  subgraph WEB["wai-web"]
    W1["DeciaSessionController /api/decia/sessions/{id}/participants · /{userId} · /candidates"]
    W2["SessionStreamController (SSE, encerra conexão do removido)"]
    W3["SecurityConfig (JWT) · CurrentUserResolver · CorrelationIdFilter"]
  end

  subgraph APP["wai-application"]
    S1["ParticipantService"]
    S2["Guard.requireSessionAdmin"]
    S3["MessageService.postSystemMessage"]
    P1["NotificationPort · RealtimePublisherPort · DomainEventPublisherPort"]
  end

  subgraph DOM["wai-domain"]
    D1["DeciaSession · SessionParticipant · User · Notification · AuditLog"]
    D2["ParticipantRole · SessionAccess · SessionStatus · AccountStatus"]
    D3["SessionAccessPolicy (inScope, participantsEditable)"]
    D4["SessionParticipantRepository · DeciaSessionRepository · UserRepository"]
  end

  subgraph INFRA["wai-infrastructure"]
    I1["persistence-mysql (session_participants, decia_sessions, users, audit_log, domain_events)"]
    I2["persistence-cassandra (messages_by_session mensagem de sistema, notifications_by_user)"]
    I3["cache-redis (RedisRealtimePublisher pub/sub, presença online)"]
    I4["platform (OutboxEventPublisher, NotificationDispatcher, AuditLogWriter)"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  RD[("Redis")]

  FE1 --> FE2
  FE1 --> FE3
  FE1 -->|HTTPS/JSON| W1
  FE3 -->|SSE| W2
  W3 -.-> W1
  W1 --> S1
  S1 --> S2
  S1 --> S3
  S2 --> D3
  S1 --> D3
  S1 --> P1
  S1 --> D1
  S1 --> D4
  I2 -.->|implementa| P1
  I3 -.->|implementa| P1
  I4 -.->|implementa| P1
  W2 --> I3
  D4 --> I1
  I1 --> MY
  I2 --> CA
  I3 --> RD
  BOOT["wai-bootstrap (flags cassandra.enabled, redis.enabled; paginação 50)"] -.-> INFRA
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) |
|---|---|---|---|---|---|
| RF9.CA01 | `ParticipantService.add/searchCandidates`, `SessionParticipant.joinedAt/addedBy/role`, `SessionAccessPolicy.inScope`, `DeciaSession.participantCount/accessMode` | `A3`, `B1`, `B2`, `C4`–`C8` | 1–9, 18–22 (candidatos, `POST participants`, 201) | `[*] → ATIVO (MEMBRO)` | `FE2 UserSearchCombobox`, `W1`, `S1`, `D3`, `I1` |
| RF9.CA02 | `ParticipantService.remove`, `SessionParticipant.leftAt/removedBy/removeReason`, `RealtimePublisherPort.disconnect` | `A4`, `B3`, `C11`–`C13`, `H3`, `H4` | 30–41 (`DELETE participants`, disconnect, 403 na mensagem) | `ATIVO → REMOVIDO` | `W2` (encerra SSE), `I3`, `FE2 RemoveDialog` |
| RF9.CA03 | `Guard.requireSessionAdmin`, `SessionAccessPolicy.participantsEditable`, `User.status`, `ParticipantService.requireActive` | `C1` → `E403`, `C2` → `E409`, `C4` → `E422a`, `C6` → `E409b`, `C10` → `E422c` | 10–17 (403, 409, 422), 32–33 | guarda em `ATIVO` | `S2 Guard`, `W3` |
| RF9.CA04 | `ParticipantService.changeRole/enableReplyDivergence`, `SessionParticipant.canReplyDivergence/lastReadAt` | `A5`, `B4`, `C15`, `C16`, `C7` (novo registro) | 42–47 (`opt` readmissão) | `MEMBRO ↔ OBSERVADOR`, `→ MEMBRO_RESPONDE_DIVERGENCIA`, nota de readmissão | `W1 PATCH`, `FE2 RoleSelect` |
| RF9.CA05 | `DomainEventPublisherPort` (`ParticipantAdded/Removed`), `NotificationPort`, `Notification`, `AuditLog`, `MessageService.postSystemMessage` | `C9`, `C14`, `C17`, `H1`, `H3` | 20, 23–27, 36, 38–40 | — | `I4 OutboxEventPublisher/NotificationDispatcher/AuditLogWriter`, `I2` |
| RF9.CA06 | `ParticipantService.list`, `SessionParticipant.role/joinedAt/canReplyDivergence`, `RealtimePublisherPort` | `A1`, `B5`, `A20` | 26–27 (SSE → painel e presença) | — | `FE1`, `FE2 ParticipantList/PresenceDot`, `FE3`, `I3` (presença) |
