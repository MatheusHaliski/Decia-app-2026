# RF4 — Definir o tema da conversa dentro de uma sessão de conversa do DECIA, assim como definir controle de acesso à conversa.
**HU:** HU4 · **Sprint (board Work Station):** 1 · **Equivalente FAI:** RF10 Copilot (`CopilotService`; o DECIA é o Copilot elevado a hub do app — card "Mapa de equivalência") · **Aba/rota:** DECIA (`/decia/new` para criar, `/decia/[sessionId]/settings` para tema e acesso) — rotas sugeridas
**Critérios de aceite cobertos:** RF4.CA01 … RF4.CA06 (RF1–RF18 não têm CAs no board: derivados da HU4 e marcados "CA a confirmar")

> **HU4** — COMO administrador do sistema POSSO definir o tema de uma sessão de conversa do DECIA e definir o controle de acesso à conversa PARA delimitar o escopo da discussão e garantir que apenas usuários autorizados participem da sessão.

> **Nota de modelagem (a confirmar em `DECISOES.md`):** a HU4 fala em "administrador do sistema", mas a TAXONOMIA (§5.1) define `DeciaSession.adminUserId` como **administrador da sessão** (perfil CHEFE_DEPARTAMENTO do departamento ou `Role ADMIN`). Este RF assume que **o administrador da sessão** (CHEFE ou ADMIN) define tema e acesso.

## Critérios de aceite derivados da HU4 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF4.CA01** (CA a confirmar) | Dado um CHEFE_DEPARTAMENTO (ou ADMIN) autenticado, quando cria a sessão informando `topic` (3–300 caracteres), `description` (opcional), `departmentId` e `accessMode` (`SessionAccess` FECHADA · DEPARTAMENTO · EMPRESA), então a `DeciaSession` nasce em `SessionStatus PROPOSTA` com `adminUserId` = ele, `aiMode` padrão ECONOMIA e um `SessionParticipant` com `role ADMIN`; erros voltam como `422 VALIDACAO` por campo. |
| **RF4.CA02** (CA a confirmar) | Dado um usuário que não é o `adminUserId` nem `Role ADMIN`, quando tenta alterar tema ou acesso, então recebe `403 ACESSO_NEGADO`; participantes MEMBRO/OBSERVADOR só leem o tema e o modo de acesso no cabeçalho da sessão. |
| **RF4.CA03** (CA a confirmar) | Dado a sessão em `PROPOSTA` ou `ATIVA`, quando o admin edita `topic`/`description`/`accessMode` (`PATCH /api/decia/sessions/{id}/topic` e `/access`), então a alteração é salva e uma mensagem de sistema registra "tema alterado de X para Y"; em `EM_RESUMO`, `EM_DECISAO`, `EM_REVISAO`, `ENCERRADA` ou `ARQUIVADA` a edição é recusada com `409 SESSAO_BLOQUEADA` (confirmar se `REABERTA` permite). |
| **RF4.CA04** (CA a confirmar) | Dado o `accessMode`, então ele define quem **vê e entra** na sessão: FECHADA → somente `SessionParticipant` ativos (convite, RF9); DEPARTAMENTO → qualquer `User` com `departmentId` igual pode ver e pedir para entrar; EMPRESA → qualquer `User` da mesma `companyId`. Quem está fora do escopo recebe `403 ACESSO_NEGADO` (sem revelar o tema). Tornar o acesso mais restritivo **não remove** participantes já adicionados (a confirmar). |
| **RF4.CA05** (CA a confirmar) | Dado a sessão criada, então o admin pode escolher `aiMode` AVANCADO (cota de IA ou DECIA Points, RF43.CA06) e `messageTtlDays` (TTL das mensagens no Cassandra, padrão da empresa); a lista "Sessões" mostra tema, modo de acesso, status e nº de participantes, respeitando o CA04. |
| **RF4.CA06** (CA a confirmar) | Dado qualquer alteração de tema ou acesso, então ela gera `AuditLog SESSION_TOPIC_CHANGED` / `SESSION_ACCESS_CHANGED` com `correlationId`, o evento `SessionSettingsChanged` (AFTER_COMMIT) notifica os participantes ativos (`Notification` categoria DECIA) e tudo é i18n. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  namespace ws_domain {
    class DeciaSession {
      <<entity>>
      +id: UUID
      +topic: String
      +description: String
      +adminUserId: UUID
      +createdByUserId: UUID
      +companyId: UUID
      +departmentId: UUID
      +accessMode: SessionAccess
      +status: SessionStatus
      +aiMode: AiMode
      +linkedProjectId: UUID
      +messageTtlDays: int
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
    }
    class User {
      <<entity>>
      +id: UUID
      +profileType: ProfileType
      +role: Role
      +companyId: UUID
      +departmentId: UUID
    }
    class Department {
      <<entity>>
      +id: UUID
      +companyId: UUID
      +name: String
      +acronym: String
      +headUserId: UUID
    }
    class Notification {
      <<entity>>
      +recipientId: UUID
      +type: NotificationType
      +category: String
      +resourceType: String
      +resourceId: UUID
      +groupKey: String
    }
    class AuditLog {
      <<entity>>
      +actorId: UUID
      +action: String
      +resourceId: UUID
      +metadataJson: String
      +correlationId: String
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
    class ParticipantRole {
      <<enum>>
      ADMIN
      MEMBRO
      OBSERVADOR
      IA
    }
    class AiMode {
      <<enum>>
      ECONOMIA
      AVANCADO
    }
    class SessionAccessPolicy {
      <<service>>
      +canView(user User, session DeciaSession, participant SessionParticipant) boolean
      +canAdminister(user User, session DeciaSession) boolean
      +settingsEditable(status SessionStatus) boolean
    }
  }

  namespace ws_application {
    class DeciaSessionService {
      <<service>>
      +create(current CurrentUser, cmd CreateSessionCommand) SessionView
      +changeTopic(current CurrentUser, sessionId, cmd TopicCommand) SessionView
      +changeAccess(current CurrentUser, sessionId, cmd AccessCommand) SessionView
      +changeAiMode(current CurrentUser, sessionId, mode AiMode) SessionView
      +get(current CurrentUser, sessionId) SessionView
      +list(current CurrentUser, filter SessionFilter) Page~SessionCard~
    }
    class Guard {
      <<service>>
      +requireSessionAdmin(current CurrentUser, session DeciaSession) void
      +requireSessionView(current CurrentUser, session DeciaSession) void
    }
    class NotificationPort {
      <<port>>
      +notify(recipients List~UUID~, notification Notification) void
    }
    class DomainEventPublisherPort {
      <<port>>
      +publish(event DomainEvent) void
    }
    class AiQuotaPort {
      <<port>>
      +canUseAdvanced(userId, departmentId) boolean
    }
  }

  namespace ws_web {
    class DeciaSessionController {
      <<controller>>
      +create(cmd CreateSessionCommand) SessionView
      +changeTopic(sessionId, cmd TopicCommand) SessionView
      +changeAccess(sessionId, cmd AccessCommand) SessionView
      +changeAiMode(sessionId, body AiModeRequest) SessionView
      +get(sessionId) SessionView
      +list(filter SessionFilter) Page~SessionCard~
    }
  }

  namespace ws_infrastructure {
    class CassandraNotificationProjector {
      <<adapter>>
    }
    class OutboxEventPublisher {
      <<adapter>>
    }
    class RedisAiQuota {
      <<adapter>>
    }
  }

  DeciaSessionController --> DeciaSessionService
  DeciaSessionService --> Guard
  DeciaSessionService --> SessionAccessPolicy
  DeciaSessionService --> NotificationPort
  DeciaSessionService --> DomainEventPublisherPort
  DeciaSessionService --> AiQuotaPort
  Guard --> SessionAccessPolicy
  CassandraNotificationProjector ..|> NotificationPort
  OutboxEventPublisher ..|> DomainEventPublisherPort
  RedisAiQuota ..|> AiQuotaPort
  DeciaSession "1" --> "*" SessionParticipant : participantes
  DeciaSession --> SessionAccess
  DeciaSession --> SessionStatus
  DeciaSession --> AiMode
  DeciaSession ..> User : adminUserId
  DeciaSession ..> Department : departmentId
  SessionParticipant --> ParticipantRole
  SessionParticipant ..> User : userId
  Notification ..> DeciaSession : resourceId
  AuditLog ..> DeciaSession : SESSION_TOPIC_CHANGED

  note for DeciaSession "tabela decia_sessions · .. +6 campos (planAxisId, startedAt, closedAt, archivedAt, messageCount, archiveMediaId, indexedInMemory) .."
  note for SessionAccessPolicy "FECHADA: só participantes · DEPARTAMENTO: mesmo departmentId · EMPRESA: mesma companyId (RF4.CA04)"
```

## 2. Diagrama de atividades

Raias: Administrador da sessão · Web/BFF · `ws-application` · Persistência (o RF4 não usa o AiEngine).

```mermaid
flowchart TD
  subgraph L1["Ator humano — Administrador da sessão (CHEFE_DEPARTAMENTO ou ADMIN)"]
    A1(["Abre DECIA → Nova sessão ou Configurações da sessão"]) --> A2["Informa tema (3–300), descrição e departamento"]
    A2 --> A3["Escolhe o modo de acesso: FECHADA · DEPARTAMENTO · EMPRESA"]
    A3 --> A4["Escolhe aiMode (ECONOMIA padrão · AVANCADO) e TTL das mensagens"]
    A4 --> A5["Salva"]
    A20(["Sessão criada em PROPOSTA ou configurações atualizadas"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["Validação client-side (zod) · POST /api/decia/sessions ou PATCH /api/decia/sessions/{id}/topic | /access"]
    B2["Cabeçalho da sessão mostra tema, modo de acesso e status (somente leitura para MEMBRO/OBSERVADOR)"]
  end

  subgraph L3["ws-application — DeciaSessionService"]
    C1{"É adminUserId da sessão ou Role ADMIN?"}
    C1 -->|não| E403["403 ACESSO_NEGADO"]
    C1 -->|sim| C2{"Campos válidos? (tema 3–300, accessMode no enum, departamento da empresa)"}
    C2 -->|não| E422["422 VALIDACAO (details por campo)"]
    C2 -->|sim| C3{"É criação?"}
    C3 -->|sim| C4["Cria DeciaSession status=PROPOSTA, adminUserId=atual, aiMode ECONOMIA"]
    C4 --> C5["Cria SessionParticipant role=ADMIN"]
    C3 -->|não| C6{"status PROPOSTA ou ATIVA?"}
    C6 -->|não| E409["409 SESSAO_BLOQUEADA"]
    C6 -->|sim| C7{"aiMode AVANCADO pedido?"}
    C7 -->|sim| C8{"Cota de IA ou DECIA Points disponíveis? (RF43.CA06)"}
    C8 -->|não| E409b["409 COTA_INSUFICIENTE"]
    C8 -->|sim| C9
    C7 -->|não| C9["Atualiza topic/description/accessMode/aiMode (lock otimista version)"]
    C9 --> C10["Mensagem de sistema na sessão: tema ou acesso alterado"]
    C5 --> C11["AuditLog SESSION_CREATED · publica SessionCreated (AFTER_COMMIT)"]
    C10 --> C12["AuditLog SESSION_TOPIC_CHANGED / SESSION_ACCESS_CHANGED · publica SessionSettingsChanged (AFTER_COMMIT)"]
    C12 --> C13["Notification categoria DECIA aos participantes ativos"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL: decia_sessions, session_participants, audit_log, domain_events")]
    D2[("Cassandra: notifications_by_user · messages_by_session (mensagem de sistema)")]
    D3[("Redis: quota de IA (AiQuota) por usuário/departamento")]
  end

  A5 --> B1 --> C1
  C8 --> D3
  C4 --> D1
  C5 --> D1
  C9 --> D1
  C10 --> D2
  C13 --> D2
  C11 --> A20
  C13 --> A20
  B2 -.-> A1

  classDef erro fill:#fde2e2,stroke:#c0392b,color:#7b1d1d;
  class E403,E422,E409,E409b erro;
```

## 3. Diagrama de sequência

Caminho feliz da criação e da troca do modo de acesso, com os `alt` de erro do CA02 (403) e do CA03 (409).

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (CHEFE_DEPARTAMENTO ou ADMIN)
  participant N as Next.js (App Router) /decia/new + /decia/[id]/settings
  participant C as DeciaSessionController (ws-web)
  participant S as DeciaSessionService (ws-application)
  participant DB as Repository/MySQL
  participant R as Redis
  participant CS as Cassandra
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>N: tema, descrição, departamento, accessMode=DEPARTAMENTO, aiMode=ECONOMIA
  N->>C: POST /api/decia/sessions (Bearer)
  C->>S: create(currentUser, CreateSessionCommand)
  S->>S: Guard.requireSessionAdminCandidate (CHEFE do departamento ou ADMIN) (CA01)
  S->>S: valida topic 3–300, accessMode, departmentId da companyId (CA01)
  S->>DB: INSERT decia_sessions (status=PROPOSTA, admin_user_id, access_mode, ai_mode)
  S->>DB: INSERT session_participants (role=ADMIN, joined_at)
  S->>DE: publish SessionCreated(sessionId, correlationId)
  S-->>C: 201 SessionView
  C-->>N: 201
  N-->>U: cabeçalho com tema, modo de acesso e status PROPOSTA
  DE->>DB: AFTER_COMMIT → INSERT audit_log SESSION_CREATED (CA06)

  U->>N: muda acesso para FECHADA e aiMode para AVANCADO
  N->>C: PATCH /api/decia/sessions/{id}/access
  C->>S: changeAccess(currentUser, sessionId, AccessCommand)
  S->>DB: SELECT decia_sessions WHERE id (com version)
  alt não é adminUserId nem ADMIN (CA02)
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
    N-->>U: "Somente o administrador da sessão altera o acesso"
  else status fora de PROPOSTA/ATIVA (CA03)
    S-->>C: 409 SESSAO_BLOQUEADA
    C-->>N: 409
  else admin e status editável (CA03, CA04, CA05)
    opt aiMode AVANCADO
      S->>R: AiQuota.canUseAdvanced(userId, departmentId)
      alt sem cota nem DECIA Points
        S-->>C: 409 COTA_INSUFICIENTE
      end
    end
    S->>DB: UPDATE decia_sessions SET access_mode=FECHADA, ai_mode=AVANCADO, version=version+1
    S->>CS: INSERT messages_by_session (authorKind=IA, "Acesso alterado para FECHADA")
    S->>DE: publish SessionSettingsChanged(sessionId, changedFields)
    S-->>C: 200 SessionView
    C-->>N: 200
    N-->>U: cabeçalho atualizado
    DE->>DB: AFTER_COMMIT → audit_log SESSION_ACCESS_CHANGED (CA06)
    DE->>CS: AFTER_COMMIT → notifications_by_user (categoria DECIA) para participantes ativos (CA06)
  end

  U->>N: outro usuário fora do departamento abre /decia/{id}
  N->>C: GET /api/decia/sessions/{id}
  C->>S: get(currentUser, sessionId)
  S->>S: SessionAccessPolicy.canView (FECHADA → só participantes) (CA04)
  S-->>C: 403 ACESSO_NEGADO (sem revelar o tema)
```

## 4. Máquina de estados

Entidade central: `DeciaSession.status` (`SessionStatus`). O RF4 cria a sessão em `PROPOSTA` e só permite editar tema/acesso enquanto `PROPOSTA` ou `ATIVA` (CA03); as demais transições pertencem aos RF5, RF11, RF12, RF14, RF15 e RF17 e aparecem para contexto.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> PROPOSTA : POST /api/decia/sessions (RF4.CA01)

  state "Tema e acesso editáveis (RF4.CA03)" as EDITAVEL {
    PROPOSTA --> ATIVA : admin inicia a sessão (RF5)
  }

  ATIVA --> EM_RESUMO : IA gera o resumo analítico (RF11)
  EM_RESUMO --> EM_DECISAO : IA registra a decisão final (RF12)
  EM_DECISAO --> EM_REVISAO : decisão enviada ao admin (RF12/RF15)
  EM_REVISAO --> ENCERRADA : decisão VALIDADA (RF15/RF17)
  EM_REVISAO --> REABERTA : decisão DEVOLVIDA e reabertura aceita (RF14)
  REABERTA --> EM_RESUMO : novo ciclo de resumo (RF11)
  ENCERRADA --> ARQUIVADA : histórico exportado (RF17)
  PROPOSTA --> ARQUIVADA : admin recusa a proposta (RF5)
  ARQUIVADA --> [*]

  note right of EDITAVEL
    PATCH topic / access / aiMode aceitos.
    Fora daqui → 409 SESSAO_BLOQUEADA.
    Confirmar se REABERTA também permite.
  end note
  note left of PROPOSTA
    accessMode define quem vê a sessão
    já em PROPOSTA (RF4.CA04).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/(app)/decia/new/page.tsx (tema, acesso, aiMode)"]
    FE2["app/(app)/decia/[sessionId]/settings/page.tsx"]
    FE3["app/(app)/decia/page.tsx (lista de sessões por acesso)"]
    FE4["components/ui (Form, Select SessionAccess, Badge SessionStatus, AccessModeHint)"]
  end

  subgraph WEB["ws-web"]
    W1["DeciaSessionController /api/decia/sessions · /{id} · /{id}/topic · /{id}/access · /{id}/ai-mode"]
    W2["SecurityConfig (JWT) · CurrentUserResolver · CorrelationIdFilter"]
  end

  subgraph APP["ws-application"]
    S1["DeciaSessionService"]
    S2["Guard (requireSessionAdmin, requireSessionView)"]
    P1["NotificationPort · DomainEventPublisherPort · AiQuotaPort"]
  end

  subgraph DOM["ws-domain"]
    D1["DeciaSession · SessionParticipant · Notification · AuditLog"]
    D2["SessionAccess · SessionStatus · ParticipantRole · AiMode"]
    D3["SessionAccessPolicy (regra de visibilidade)"]
    D4["DeciaSessionRepository · SessionParticipantRepository"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["persistence-mysql (decia_sessions, session_participants, audit_log, domain_events)"]
    I2["persistence-cassandra (notifications_by_user, messages_by_session para mensagem de sistema)"]
    I3["cache-redis (RedisAiQuota)"]
    I4["platform (OutboxEventPublisher, AuditLogWriter, NotificationDispatcher)"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  RD[("Redis")]

  FE1 --> W1
  FE2 --> W1
  FE3 --> W1
  FE1 --> FE4
  FE2 --> FE4
  W2 -.-> W1
  W1 --> S1
  S1 --> S2
  S2 --> D3
  S1 --> D3
  S1 --> P1
  S1 --> D1
  S1 --> D4
  I2 -.->|implementa| P1
  I3 -.->|implementa| P1
  I4 -.->|implementa| P1
  D4 --> I1
  I1 --> MY
  I2 --> CA
  I3 --> RD
  BOOT["ws-bootstrap (flags cassandra.enabled, redis.enabled; TTL padrão de mensagens)"] -.-> INFRA
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) |
|---|---|---|---|---|---|
| RF4.CA01 | `DeciaSessionService.create`, `DeciaSession.topic/description/accessMode/adminUserId/aiMode`, `SessionParticipant role ADMIN`, `SessionAccess` | `A2`–`A5`, `C2` → `E422`, `C4`, `C5` | 1–11 (`POST /api/decia/sessions`, 201) | `[*] → PROPOSTA` | `FE1`, `W1`, `S1`, `I1 decia_sessions` |
| RF4.CA02 | `Guard.requireSessionAdmin`, `SessionAccessPolicy.canAdminister` | `C1` → `E403`, `B2` | 17–20 (`403 ACESSO_NEGADO`) | — | `S2 Guard`, `D3 SessionAccessPolicy` |
| RF4.CA03 | `DeciaSessionService.changeTopic/changeAccess`, `SessionAccessPolicy.settingsEditable`, `DeciaSession.version` | `C6` → `E409`, `C9`, `C10` | 13–16, 21–22, 29–31 (`PATCH …/access`, `409 SESSAO_BLOQUEADA`) | estado composto `EDITAVEL` (PROPOSTA, ATIVA) | `FE2`, `W1 /topic /access`, `I2` (mensagem de sistema) |
| RF4.CA04 | `SessionAccessPolicy.canView`, `SessionAccess`, `User.departmentId/companyId` | `B2`, `E403` | 37–41 (`GET …/{id}` → 403 sem revelar o tema) | nota em `PROPOSTA` | `D3`, `FE3` (lista filtrada) |
| RF4.CA05 | `DeciaSession.aiMode/messageTtlDays`, `AiQuotaPort`/`RedisAiQuota`, `DeciaSessionService.changeAiMode/list` | `A4`, `C7`, `C8` → `E409b` | 24–28 (`AiQuota.canUseAdvanced`, `409 COTA_INSUFICIENTE`) | — | `W1 /ai-mode`, `I3 cache-redis`, `FE3` |
| RF4.CA06 | `AuditLog`, `Notification`, `NotificationPort`, `DomainEventPublisherPort` | `C11`, `C12`, `C13` | 12, 34–36 (AFTER_COMMIT → audit_log, notifications_by_user) | — | `I4 platform`, `I2 notifications_by_user` |
