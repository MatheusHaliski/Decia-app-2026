# RF5 — Iniciar, junto ao Administrador da sessão, uma nova sessão de conversa do DECIA.
**HU:** HU5 · **Sprint (board Work Station):** 1 · **Equivalente FAI:** RF10 Copilot (`CopilotService` abre a conversa; aqui a abertura é em grupo, com proposta → confirmação do administrador) · **Aba/rota:** DECIA (`/decia/new` para propor, `/decia/[sessionId]` com o botão "Iniciar sessão" para o admin; `/projects/[id]` → "Abrir sessão DECIA", RF29.CA01) — rotas sugeridas
**Critérios de aceite cobertos:** RF5.CA01 … RF5.CA06 (RF1–RF18 não têm CAs no board: derivados da HU5 e marcados "CA a confirmar")

> **HU5** — COMO grupo da conversa (conjunto de usuários vinculados a um tema) POSSO iniciar uma nova sessão de conversa em conjunto com o administrador da sessão PARA dar início à discussão estruturada sobre o tema definido.

> **Nota de modelagem (TAXONOMIA §14):** o "grupo da conversa" é modelado como `SessionParticipant` com `role MEMBRO`; não existe entidade `Group`. O "em conjunto" vira o par **proposta** (`createdByUserId`, status `PROPOSTA`) → **confirmação** (`adminUserId`, status `ATIVA`). Confirmar em `DECISOES.md`.

## Critérios de aceite derivados da HU5 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF5.CA01** (CA a confirmar) | Dado um EMPREGADO autenticado, quando propõe uma sessão informando tema proposto, departamento e convidados (≥ 1 colega dentro do `accessMode`), então a `DeciaSession` é criada em `PROPOSTA` com `createdByUserId` = ele, `adminUserId` = CHEFE do departamento (`Department.headUserId`) e os convidados viram `SessionParticipant role MEMBRO` (`addedBy` = proponente); o proponente também entra como MEMBRO. |
| **RF5.CA02** (CA a confirmar) | Dado a proposta criada, então o administrador recebe `Notification` (categoria DECIA, "sessão proposta") e o grupo vê a sessão como "aguardando o administrador"; o administrador pode **ajustar tema e acesso (RF4)** antes de iniciar. |
| **RF5.CA03** (CA a confirmar) | Dado o administrador na sessão `PROPOSTA`, quando clica em "Iniciar sessão" (`POST /api/decia/sessions/{id}/start`), então o status passa a `ATIVA`, `startedAt` = agora, é criado o `SessionParticipant role IA` e a IA publica a mensagem de abertura com o tema, as regras e o modo (ECONOMIA/AVANCADO); quem não é `adminUserId`/ADMIN recebe `403 ACESSO_NEGADO`. |
| **RF5.CA04** (CA a confirmar) | Dado a proposta, quando o administrador **recusa** (`POST …/decline` com motivo obrigatório), então a sessão vai a `ARQUIVADA` com `archivedAt` e o motivo é notificado ao grupo; iniciar uma sessão que não está em `PROPOSTA` → `409 ESTADO_INVALIDO`; iniciar com menos de 2 participantes humanos → `422 VALIDACAO`. |
| **RF5.CA05** (CA a confirmar) | Dado um projeto (RF29.CA01), quando o responsável clica em "Abrir sessão DECIA", então o mesmo fluxo cria a sessão com `topic` = objetivo do projeto, `linkedProjectId`, participantes = responsáveis + chefe do departamento, anexa as tarefas como contexto da IA e o projeto passa a `EM_DECISAO`. |
| **RF5.CA06** (CA a confirmar) | Dado o início da sessão, então `SessionStarted` (AFTER_COMMIT) notifica todos os participantes, grava `AuditLog SESSION_STARTED`, atualiza `participantCount` e abre o canal em tempo real (SSE) da sessão; a lista "Minhas sessões" separa PROPOSTA (aguardando) de ATIVA; tudo i18n. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  namespace wai_domain {
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
      +startedAt: Instant
      +archivedAt: Instant
      +participantCount: int
      +messageCount: int
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
      +lastReadAt: Instant
    }
    class SessionMessage {
      <<entity>>
      +id: TIMEUUID
      +sessionId: UUID
      +authorId: UUID
      +authorKind: String
      +bodyMd: String
      +sentAt: Instant
      +correlationId: String
    }
    class Department {
      <<entity>>
      +id: UUID
      +companyId: UUID
      +headUserId: UUID
      +acronym: String
    }
    class ProjectScheme {
      <<entity>>
      +id: UUID
      +objective: String
      +status: ProjectStatus
      +departmentId: UUID
    }
    class Notification {
      <<entity>>
      +recipientId: UUID
      +type: NotificationType
      +category: String
      +resourceId: UUID
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
    class SessionAccess {
      <<enum>>
      FECHADA
      DEPARTAMENTO
      EMPRESA
    }
  }

  namespace wai_application {
    class DeciaSessionService {
      <<service>>
      +propose(current CurrentUser, cmd ProposeSessionCommand) SessionView
      +openFromProject(current CurrentUser, projectId) SessionView
      +start(current CurrentUser, sessionId) SessionView
      +decline(current CurrentUser, sessionId, reason) SessionView
      +mySessions(current CurrentUser, filter SessionFilter) Page~SessionCard~
    }
    class ParticipantService {
      <<service>>
      +addMany(session DeciaSession, userIds List~UUID~, role ParticipantRole, addedBy) int
      +addAiParticipant(session DeciaSession) SessionParticipant
      +activeHumans(sessionId) int
    }
    class MessageService {
      <<service>>
      +postSystemMessage(sessionId, bodyMd, correlationId) SessionMessage
    }
    class AiEngine {
      <<service>>
      +openingMessage(session DeciaSession, contextTaskIds List~UUID~) AiOutcome~String~
    }
    class NotificationPort {
      <<port>>
      +notify(recipients List~UUID~, notification Notification) void
    }
    class RealtimePublisherPort {
      <<port>>
      +publish(sessionId, event SessionEvent) void
    }
    class DomainEventPublisherPort {
      <<port>>
      +publish(event DomainEvent) void
    }
  }

  namespace wai_web {
    class DeciaSessionController {
      <<controller>>
      +propose(cmd ProposeSessionCommand) SessionView
      +openFromProject(projectId) SessionView
      +start(sessionId) SessionView
      +decline(sessionId, body DeclineRequest) SessionView
      +mySessions(filter SessionFilter) Page~SessionCard~
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

  DeciaSessionController --> DeciaSessionService
  DeciaSessionService --> ParticipantService
  DeciaSessionService --> MessageService
  DeciaSessionService --> AiEngine : mensagem de abertura
  DeciaSessionService --> NotificationPort
  DeciaSessionService --> RealtimePublisherPort
  DeciaSessionService --> DomainEventPublisherPort
  CassandraNotificationProjector ..|> NotificationPort
  RedisRealtimePublisher ..|> RealtimePublisherPort
  OutboxEventPublisher ..|> DomainEventPublisherPort
  DeciaSession "1" --> "*" SessionParticipant : grupo da conversa
  DeciaSession "1" --> "*" SessionMessage : mensagens
  DeciaSession ..> Department : headUserId vira adminUserId
  DeciaSession ..> ProjectScheme : linkedProjectId (RF29.CA01)
  DeciaSession --> SessionStatus
  DeciaSession --> SessionAccess
  SessionParticipant --> ParticipantRole
  Notification ..> DeciaSession : SESSAO_PROPOSTA, SESSAO_INICIADA

  note for DeciaSession "tabela decia_sessions · createdByUserId = quem propôs (grupo) · adminUserId = quem inicia · .. +7 campos .."
  note for SessionParticipant "tabela session_participants · grupo da conversa = participantes MEMBRO (TAXONOMIA §14)"
```

## 2. Diagrama de atividades

Raias: Grupo (EMPREGADO proponente) · Administrador da sessão · Web/BFF · `wai-application` · IA (AiEngine) · Persistência.

```mermaid
flowchart TD
  subgraph L1["Ator humano — Grupo da conversa (EMPREGADO)"]
    A1(["Abre DECIA → Propor sessão"]) --> A2["Informa tema proposto, departamento e convidados (≥ 1)"]
    A2 --> A3["Envia a proposta"]
    A10["Vê a sessão como aguardando o administrador"]
    A30(["Sessão ATIVA: grupo pode enviar mensagens (RF6)"])
  end

  subgraph L1b["Ator humano — Administrador da sessão (CHEFE_DEPARTAMENTO ou ADMIN)"]
    H1["Recebe notificação da proposta"] --> H2["Abre a sessão PROPOSTA e ajusta tema/acesso se quiser (RF4)"]
    H2 --> H3{"Iniciar ou recusar?"}
    H3 -->|iniciar| H4["Clica em Iniciar sessão"]
    H3 -->|recusar| H5["Informa o motivo e recusa"]
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["POST /api/decia/sessions (propose)"]
    B2["POST /api/decia/sessions/{id}/start"]
    B3["POST /api/decia/sessions/{id}/decline"]
    B4["Abre o canal SSE /api/decia/sessions/{id}/stream"]
  end

  subgraph L3["wai-application — DeciaSessionService / ParticipantService"]
    C1{"Proponente da empresa e convidados dentro do accessMode?"}
    C1 -->|não| E422["422 VALIDACAO (convidado fora do escopo ou sem convidados)"]
    C1 -->|sim| C2["Cria DeciaSession PROPOSTA: createdByUserId=proponente, adminUserId=Department.headUserId"]
    C2 --> C3["SessionParticipant MEMBRO para proponente e convidados (addedBy=proponente)"]
    C3 --> C4["Publica SessionProposed (AFTER_COMMIT) → Notification ao admin"]
    C5{"É adminUserId ou ADMIN?"}
    C5 -->|não| E403["403 ACESSO_NEGADO"]
    C5 -->|sim| C6{"status PROPOSTA?"}
    C6 -->|não| E409["409 ESTADO_INVALIDO"]
    C6 -->|sim| C7{"≥ 2 participantes humanos ativos?"}
    C7 -->|não| E422b["422 VALIDACAO (mínimo 2 participantes)"]
    C7 -->|sim| C8["status → ATIVA, startedAt=now, participantCount"]
    C8 --> C9["Cria SessionParticipant role=IA"]
    C9 --> C10["Pede ao AiEngine a mensagem de abertura (tema, regras, modo)"]
    C11["Grava mensagem de abertura (authorKind=IA)"] --> C12["Publica SessionStarted (AFTER_COMMIT) → Notification a todos · AuditLog SESSION_STARTED · realtime"]
    C13{"É adminUserId ou ADMIN e status PROPOSTA?"}
    C13 -->|não| E403
    C13 -->|sim| C14["status → ARQUIVADA, archivedAt=now, motivo em description"]
    C14 --> C15["Publica SessionDeclined (AFTER_COMMIT) → Notification ao grupo com o motivo"]
  end

  subgraph L4["IA (AiEngine)"]
    I1["Capability ABRIR_SESSAO (modo ECONOMIA: template local · AVANCADO: provedor)"] --> I2["Texto de abertura + AiInferenceLog"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL: decia_sessions, session_participants, audit_log, domain_events, ai_inference_log")]
    D2[("Cassandra: messages_by_session, notifications_by_user")]
    D3[("Redis: pub/sub da sessão (SSE)")]
  end

  A3 --> B1 --> C1
  C2 --> D1
  C3 --> D1
  C4 --> D2
  C4 --> A10
  C4 --> H1
  H4 --> B2 --> C5
  H5 --> B3 --> C13
  C8 --> D1
  C10 --> I1
  I2 --> C11
  C11 --> D2
  C12 --> D2
  C12 --> D3
  D3 --> B4 --> A30
  C14 --> D1
  C15 --> D2

  classDef erro fill:#fde2e2,stroke:#c0392b,color:#7b1d1d;
  class E422,E422b,E403,E409 erro;
```

## 3. Diagrama de sequência

Caminho feliz proposta → notificação → início, com os `alt` de erro do CA03 (403) e do CA04 (409 / 422) e a recusa em `opt`.

```mermaid
sequenceDiagram
  autonumber
  actor G as Grupo (EMPREGADO proponente)
  actor A as Administrador da sessão (CHEFE)
  participant N as Next.js (App Router) /decia
  participant C as DeciaSessionController (wai-web)
  participant S as DeciaSessionService (wai-application)
  participant P as ParticipantService (wai-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant R as Redis
  participant DE as DomainEvents (AFTER_COMMIT)

  G->>N: tema proposto, departamento, convidados
  N->>C: POST /api/decia/sessions (Bearer)
  C->>S: propose(currentUser, ProposeSessionCommand)
  S->>DB: SELECT departments WHERE id (headUserId → adminUserId)
  S->>S: valida convidados dentro do accessMode e da companyId (CA01)
  S->>DB: INSERT decia_sessions (status=PROPOSTA, created_by_user_id, admin_user_id)
  S->>P: addMany(session, proponente + convidados, MEMBRO, addedBy=proponente)
  P->>DB: INSERT session_participants (role=MEMBRO, joined_at)
  S->>DE: publish SessionProposed(sessionId, adminUserId)
  S-->>C: 201 SessionView (PROPOSTA)
  C-->>N: 201
  N-->>G: "Aguardando o administrador iniciar"
  DE->>CS: AFTER_COMMIT → notifications_by_user (admin: SESSAO_PROPOSTA) (CA02)
  DE->>DB: AFTER_COMMIT → audit_log SESSION_PROPOSED

  A->>N: abre a sessão PROPOSTA e clica em Iniciar sessão
  N->>C: POST /api/decia/sessions/{id}/start
  C->>S: start(currentUser, sessionId)
  S->>DB: SELECT decia_sessions WHERE id (status, admin_user_id, version)
  alt não é adminUserId nem ADMIN (CA03)
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else status diferente de PROPOSTA (CA04)
    S-->>C: 409 ESTADO_INVALIDO
    C-->>N: 409
  else menos de 2 participantes humanos (CA04)
    S->>P: activeHumans(sessionId)
    S-->>C: 422 VALIDACAO (mínimo 2 participantes)
  else pode iniciar (CA03)
    S->>DB: UPDATE decia_sessions SET status=ATIVA, started_at=now, participant_count
    S->>P: addAiParticipant(session)
    P->>DB: INSERT session_participants (role=IA)
    S->>AI: openingMessage(session, contextTaskIds)
    AI-->>S: texto de abertura (tema, regras, modo) + AiInferenceLog
    S->>CS: INSERT messages_by_session (authorKind=IA, bodyMd=abertura)
    S->>DB: INSERT session_messages_idx + UPDATE message_count
    S->>DE: publish SessionStarted(sessionId, participantIds)
    S-->>C: 200 SessionView (ATIVA)
    C-->>N: 200
    N-->>A: sessão ativa, caixa de mensagem habilitada
    DE->>CS: AFTER_COMMIT → notifications_by_user (todos: SESSAO_INICIADA) (CA06)
    DE->>R: AFTER_COMMIT → PUBLISH decia.session.{id} SessionStarted → SSE dos participantes (CA06)
    DE->>DB: AFTER_COMMIT → audit_log SESSION_STARTED (CA06)
    R-->>N: evento SSE
    N-->>G: sessão passou a ATIVA, pode enviar mensagens (RF6)
  end

  opt Administrador recusa a proposta (CA04)
    A->>N: Recusar com motivo
    N->>C: POST /api/decia/sessions/{id}/decline
    C->>S: decline(currentUser, sessionId, reason)
    S->>DB: UPDATE decia_sessions SET status=ARQUIVADA, archived_at=now
    S->>DE: publish SessionDeclined(sessionId, reason)
    DE->>CS: AFTER_COMMIT → notifications_by_user (grupo: SESSAO_RECUSADA + motivo)
    S-->>C: 200 SessionView (ARQUIVADA)
  end
```

## 4. Máquina de estados

Entidade central: `DeciaSession.status` (`SessionStatus`). O RF5 é dono de `PROPOSTA → ATIVA` (iniciar) e `PROPOSTA → ARQUIVADA` (recusar); o restante é contexto dos RF11–RF17.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> PROPOSTA : grupo propõe (RF5.CA01) ou Abrir sessão DECIA no projeto (RF5.CA05)
  PROPOSTA --> PROPOSTA : admin ajusta tema e acesso (RF4)
  PROPOSTA --> ATIVA : admin inicia (RF5.CA03) — startedAt, participante IA, mensagem de abertura
  PROPOSTA --> ARQUIVADA : admin recusa com motivo (RF5.CA04)
  ATIVA --> EM_RESUMO : IA gera o resumo analítico (RF11)
  EM_RESUMO --> EM_DECISAO : IA registra a decisão (RF12)
  EM_DECISAO --> EM_REVISAO : enviada ao admin (RF15)
  EM_REVISAO --> ENCERRADA : decisão validada (RF15/RF17)
  EM_REVISAO --> REABERTA : devolvida e reaberta (RF14)
  REABERTA --> EM_RESUMO : novo ciclo
  ENCERRADA --> ARQUIVADA : histórico exportado (RF17)
  ARQUIVADA --> [*]

  note right of PROPOSTA
    Visível ao grupo como "aguardando o administrador".
    Iniciar exige adminUserId (403) e status PROPOSTA (409)
    e pelo menos 2 participantes humanos (422).
  end note
  note right of ATIVA
    Só aqui (e em REABERTA) o grupo envia mensagens (RF6)
    e o admin adiciona/remove participantes (RF9).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/(app)/decia/new/page.tsx (propor: tema, convidados)"]
    FE2["app/(app)/decia/[sessionId]/page.tsx (botão Iniciar / Recusar para o admin)"]
    FE3["app/(app)/projects/[id] → Abrir sessão DECIA (RF29.CA01)"]
    FE4["app/api/decia/[sessionId]/stream/route.ts (SSE proxy)"]
    FE5["components/ui (ParticipantPicker, SessionStatusBadge, Toast)"]
  end

  subgraph WEB["wai-web"]
    W1["DeciaSessionController /api/decia/sessions · /{id}/start · /{id}/decline · /from-project/{projectId}"]
    W2["SessionStreamController /api/decia/sessions/{id}/stream (SSE)"]
    W3["SecurityConfig (JWT) · CurrentUserResolver"]
  end

  subgraph APP["wai-application"]
    S1["DeciaSessionService"]
    S2["ParticipantService"]
    S3["MessageService (mensagem de sistema)"]
    S4["AiEngine (capability ABRIR_SESSAO)"]
    P1["NotificationPort · RealtimePublisherPort · DomainEventPublisherPort"]
  end

  subgraph DOM["wai-domain"]
    D1["DeciaSession · SessionParticipant · SessionMessage · Department · ProjectScheme · Notification · AuditLog"]
    D2["SessionStatus · ParticipantRole · SessionAccess · AiMode"]
    D3["DeciaSessionRepository · SessionParticipantRepository · DepartmentRepository · ProjectSchemeRepository"]
  end

  subgraph INFRA["wai-infrastructure"]
    I1["persistence-mysql (decia_sessions, session_participants, session_messages_idx, audit_log, domain_events)"]
    I2["persistence-cassandra (messages_by_session, notifications_by_user)"]
    I3["cache-redis (RedisRealtimePublisher pub/sub)"]
    I4["ai-providers (ClaudeProvider, GeminiProvider, LocalEngine)"]
    I5["platform (OutboxEventPublisher, NotificationDispatcher, AuditLogWriter)"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini (mensagem de abertura em modo AVANCADO)"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  RD[("Redis")]

  FE1 --> W1
  FE2 --> W1
  FE3 --> W1
  FE2 --> FE4
  FE4 --> W2
  FE1 --> FE5
  W3 -.-> W1
  W1 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> P1
  S1 --> D1
  S1 --> D3
  S4 --> I4
  I4 --> X1
  I2 -.->|implementa| P1
  I3 -.->|implementa| P1
  I5 -.->|implementa| P1
  W2 --> I3
  D3 --> I1
  I1 --> MY
  I2 --> CA
  I3 --> RD
  BOOT["wai-bootstrap (flags ai.provider.claude, ai.provider.gemini, ai.local.only, cassandra.enabled)"] -.-> INFRA
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) |
|---|---|---|---|---|---|
| RF5.CA01 | `DeciaSessionService.propose`, `DeciaSession.createdByUserId/adminUserId`, `Department.headUserId`, `ParticipantService.addMany`, `SessionParticipant role MEMBRO` | `A2`, `A3`, `B1`, `C1` → `E422`, `C2`, `C3` | 1–11 (`POST /api/decia/sessions`, 201 PROPOSTA) | `[*] → PROPOSTA` | `FE1`, `W1`, `S1`, `S2`, `I1` |
| RF5.CA02 | `Notification` (SESSAO_PROPOSTA), `NotificationPort`, `DeciaSessionService` (RF4 em PROPOSTA) | `C4`, `H1`, `H2`, `A10` | 12–14 | `PROPOSTA → PROPOSTA` (ajustes do RF4) | `I2 notifications_by_user`, `I5 NotificationDispatcher`, `FE2` |
| RF5.CA03 | `DeciaSessionService.start`, `ParticipantService.addAiParticipant`, `SessionParticipant role IA`, `AiEngine.openingMessage`, `MessageService.postSystemMessage` | `H4`, `B2`, `C5` → `E403`, `C8`–`C12`, `I1`, `I2` | 15–19, 26–37 | `PROPOSTA → ATIVA` | `W1 /start`, `S4 AiEngine`, `I4 ai-providers`, `X1` |
| RF5.CA04 | `DeciaSessionService.decline`, `ParticipantService.activeHumans`, `DeciaSession.archivedAt` | `C6` → `E409`, `C7` → `E422b`, `H5`, `B3`, `C13`–`C15` | 20–25, 43–50 (`opt` recusa) | `PROPOSTA → ARQUIVADA` | `W1 /decline` |
| RF5.CA05 | `DeciaSessionService.openFromProject`, `DeciaSession.linkedProjectId`, `ProjectScheme.objective/status` | (variante de `C2`: topic = objetivo, participantes = responsáveis + chefe) | 1–11 com origem `FE3` | `[*] → PROPOSTA` (via projeto) | `FE3`, `W1 /from-project`, `D3 ProjectSchemeRepository` |
| RF5.CA06 | `DomainEventPublisherPort`, `RealtimePublisherPort`/`RedisRealtimePublisher`, `AuditLog`, `DeciaSession.participantCount` | `C12`, `D3`, `B4`, `A30` | 38–42 (AFTER_COMMIT → notificações, PUBLISH, audit_log, SSE) | nota em `ATIVA` | `W2 SessionStreamController`, `FE4`, `I3 cache-redis`, `I5` |
