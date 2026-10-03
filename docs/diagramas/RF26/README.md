# RF26 — Curtir, reagir, comentar, salvar, compartilhar e remixar tarefas, esquemas de projeto e planos anuais (interações sociais)
**HU:** HU26 · **Sprint (board Work Station):** 4 · **Equivalente FAI:** RF19 Interações sociais (alvo polimórfico PIECE/SCHEME/DNA) · **Aba/rota:** ações inline em todos os cards (Acervo, Projetos, Planos, Mural, Buscar) · **API:** `/api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes|counters`
**Critérios de aceite cobertos:** RF26.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09

Alvo polimórfico `TargetType` (TASK · PROJECT · PLAN — além de KIT, PROJECT_TASK, MESSAGE, RECOGNITION usados por outros RFs). Seis interações, cada uma com sua entidade: **curtir** (`Reaction` CURTIR, única por ator e alvo), **reagir** (`Reaction` ÚTIL · BEM_FUNDAMENTADO · INOVADOR · CONFORME), **comentar** (`Comment` com thread `parentCommentId`, edição, exclusão pelo autor ou pelo chefe do departamento, menções → `Notification`), **salvar** (`SavedItem` com marcador favorito → sub-abas *Tarefas salvas* / *Projetos salvos*, RF19), **compartilhar** (`Share` em canal MURAL → `MuralEntry` RF27, SESSAO_DECIA → `MessageAttachment` RF29, LINK_EXTERNO com `externalToken`, `expiresAt` e imagem exportada `imageMediaId`) e **remixar** (`Remix` + cópia com `originalTaskId` / `originalProjectId` e crédito visível). Contadores desnormalizados (`likesCount … remixesCount`) em tempo quase real via Redis; toda interação respeita a **visibilidade** do alvo e gera **notificação agrupada por hora** (`Notification.groupKey`) ao dono, alimentando o perfil deliberativo (reações BEM_FUNDAMENTADO e CONFORME pesam na métrica de qualidade).

| Interação | Entidade | Regra de unicidade / canal | Contador |
|---|---|---|---|
| Curtir / descurtir | `Reaction` CURTIR | único (actorId, targetType, targetId, CURTIR) — toggle | `likesCount` |
| Reagir | `Reaction` UTIL · BEM_FUNDAMENTADO · INOVADOR · CONFORME | 1 por tipo, ator e alvo | — (pesa no perfil deliberativo) |
| Comentar | `Comment` | thread via `parentCommentId`, `editedAt`, `deletedBy`, `mentionsJson` | `commentsCount` |
| Salvar | `SavedItem` | único (userId, targetType, targetId), `favorite` | `savesCount` |
| Compartilhar | `Share` | `channel` MURAL · SESSAO_DECIA · LINK_EXTERNO (`externalToken`, `expiresAt`, `imageMediaId`) | `sharesCount` |
| Remixar | `Remix` + nova `TaskItem`/`ProjectScheme` | só alvos PUBLICA, `originalTaskId` / `originalProjectId` | `remixesCount` |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace wai_domain_social {
  class Reaction {
    <<entity>>
    +id: UUID
    +actorId: UUID
    +targetType: TargetType
    +targetId: UUID
    +reactionType: ReactionType
    +at: Instant
    +actorHypeAtTime: BigDecimal
    +ignoredReason: String antifraude
  }
  class Comment {
    <<entity>>
    +id: UUID
    +authorId: UUID
    +targetType: TargetType
    +targetId: UUID
    +parentCommentId: UUID
    +contentMd: String
    +mentionsJson: JSON
    +editedAt: Instant
    +deletedBy: UUID
    +active: boolean
  }
  class SavedItem {
    <<entity>>
    +id: UUID
    +userId: UUID
    +targetType: TargetType
    +targetId: UUID
    +favorite: boolean
    +savedAt: Instant
  }
  class Share {
    <<entity>>
    +id: UUID
    +actorId: UUID
    +targetType: TargetType
    +targetId: UUID
    +channel: ShareChannel
    +sessionId: UUID
    +externalToken: String
    +expiresAt: Instant
    +imageMediaId: UUID
  }
  class Remix {
    <<entity>>
    +id: UUID
    +actorId: UUID
    +sourceType: TargetType
    +sourceId: UUID
    +resultType: TargetType
    +resultId: UUID
    +modelOfferId: UUID
    +ledgerEntryId: UUID
    +at: Instant
  }
  class MuralEntry {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +kind: String COMPARTILHAMENTO
    +targetType: TargetType
    +targetId: UUID
    +actorId: UUID
  }
  class Notification {
    <<entity>>
    +id: UUID
    +recipientId: UUID
    +actorId: UUID
    +type: NotificationType
    +category: String SOCIAL
    +resourceType: String
    +resourceId: UUID
    +groupKey: String recipient tipo hora
    +read: boolean
  }
}

namespace wai_domain_alvos {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +visibility: Visibility
    +originalTaskId: UUID
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
    +visibility: Visibility
    +originalProjectId: UUID
    +origin: SchemeOrigin REMIX
    +likesCount: long
    +commentsCount: long
    +savesCount: long
    +sharesCount: long
    +remixesCount: long
  }
  class AnnualPlan {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +visibility: Visibility
    +likesCount: long
    +commentsCount: long
    +savesCount: long
  }
  class MessageAttachment {
    <<entity>>
    +messageId: UUID
    +targetType: String TASK PROJECT PLAN
    +targetId: UUID
    +snapshotJson: JSON
  }
  class DeliberativeProfile {
    <<entity>>
    +userId: UUID
    +periodKey: String
    +evidenceUse: BigDecimal
    +deltaJson: JSON
  }
  class Department {
    <<entity>>
    +id: UUID
    +headUserId: UUID chefe pode excluir comentário
  }
  class DepartmentMembership {
    <<entity>>
    +userId: UUID
    +departmentId: UUID
    +endedAt: Instant
  }
}

namespace wai_domain_enums {
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
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
}

namespace wai_application {
  class SocialService {
    <<service>>
    +toggleLike(actorId, type, id) Reaction
    +react(actorId, type, id, reactionType) Reaction
    +comment(actorId, type, id, contentMd, parentId, mentions) Comment
    +editComment(actorId, commentId, contentMd) Comment
    +deleteComment(actorId, commentId) autor ou chefe do departamento
    +save(userId, type, id, favorite) SavedItem
    +share(actorId, type, id, channel, sessionId, expiresAt) Share
    +remix(actorId, type, id) Remix
    +counters(type, id) Counters
    -checkVisibility(actor, target) 403 ACESSO_NEGADO
  }
  class MuralService {
    <<service>>
    +postShare(Share) MuralEntry
  }
  class DeciaSessionService {
    <<service>>
    +attachToSession(sessionId, type, id) MessageAttachment
  }
  class NotificationService {
    <<service>>
    +notifyOwner(event) agrupa por groupKey hora
    +notifyMentions(Comment)
  }
  class ReputationService {
    <<service>>
    +onQualityReaction(ownerId, reactionType) BEM_FUNDAMENTADO CONFORME
  }
  class CounterCachePort {
    <<port>>
    +incr(type, id, counter)
    +get(type, id) Counters
  }
  class MediaStoragePort {
    <<port>>
    +renderShareImage(target) MediaObject capa + resumo
    +presign(mediaId) URL
  }
}

namespace wai_web {
  class InteractionController {
    <<controller>>
    +POST_api_interactions_type_id_reactions(body)
    +DELETE_api_interactions_type_id_reactions_reactionType()
    +POST_api_interactions_type_id_comments(body)
    +PATCH_api_interactions_comments_commentId(body)
    +DELETE_api_interactions_comments_commentId()
    +POST_api_interactions_type_id_saves(favorite)
    +POST_api_interactions_type_id_shares(channel, sessionId, expiresAt)
    +POST_api_interactions_type_id_remixes()
    +GET_api_interactions_type_id_counters()
    +GET_s_token_link_externo_publico()
  }
}

namespace wai_infrastructure {
  class RedisCounterAdapter {
    <<adapter>>
  }
  class S3StorageAdapter {
    <<adapter>>
  }
  class CassandraNotificationAdapter {
    <<adapter>>
  }
}

Reaction --> ReactionType
Reaction --> TargetType
Comment --> TargetType
Comment "*" --> "0..1" Comment : parentCommentId thread
SavedItem --> TargetType
Share --> ShareChannel
Share --> TargetType
Share "1" --> "0..1" MuralEntry : channel MURAL
Share "1" --> "0..1" MessageAttachment : channel SESSAO_DECIA
Remix --> TargetType : sourceType e resultType
Remix ..> TaskItem : resultId com originalTaskId
Remix ..> ProjectScheme : resultId com originalProjectId
Reaction ..> TaskItem : targetId quando TASK
Reaction ..> ProjectScheme : targetId quando PROJECT
Reaction ..> AnnualPlan : targetId quando PLAN
Notification "*" --> "1" TaskItem : resourceId dono notificado
TaskItem --> Visibility
ProjectScheme --> Visibility
AnnualPlan --> Visibility

InteractionController ..> SocialService
SocialService ..> MuralService : MURAL
SocialService ..> DeciaSessionService : SESSAO_DECIA
SocialService ..> MediaStoragePort : LINK_EXTERNO imagem
SocialService ..> CounterCachePort
SocialService ..> NotificationService : AFTER_COMMIT
SocialService ..> ReputationService : AFTER_COMMIT
SocialService ..> Department : chefe exclui comentário
SocialService ..> DepartmentMembership : visibilidade DEPARTAMENTO
NotificationService ..> Notification
ReputationService ..> DeliberativeProfile
RedisCounterAdapter ..|> CounterCachePort
S3StorageAdapter ..|> MediaStoragePort
CassandraNotificationAdapter ..> Notification : notifications_by_user TTL

note for Reaction "tabela reactions · único actorId + targetType + targetId + reactionType = CURTIR (CA01) · tipos qualitativos (CA02)"
note for Comment "tabela comments · thread, edição, exclusão pelo autor ou chefe, menções notificam (CA03)"
note for Share "tabela shares · MURAL → MuralEntry, SESSAO_DECIA → MessageAttachment, LINK_EXTERNO com externalToken, expiresAt e imageMediaId (CA05)"
note for SocialService "checkVisibility: PRIVADA só dono, DEPARTAMENTO só membros, EMPRESA só mesma empresa (CA08) · contadores em Redis + colunas desnormalizadas (CA07)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Aciona uma ação no card: curtir, reagir, comentar, salvar, compartilhar ou remixar"]
    U2["Dono abre o card ou o perfil"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Atualização otimista do contador e do estado do botão"]
    W2["Mensagem: item sem permissão para interagir"]
    W3["Contadores em tempo quase real: curtidas, comentários, salvos, compartilhamentos, remixes"]
    W4["Autor original vê remixado por N pessoas"]
  end

  subgraph LA["wai-application"]
    A1["SocialService.checkVisibility"]
    A2{"PRIVADA e ator não é dono? DEPARTAMENTO e ator não é membro? EMPRESA e outra empresa?"}
    A3["403 ACESSO_NEGADO"]
    A4{"Qual ação?"}
    A5["toggleLike: existe Reaction CURTIR? remove, senão insere — índice único"]
    A6["react: insere Reaction UTIL / BEM_FUNDAMENTADO / INOVADOR / CONFORME, 1 por tipo"]
    A7["comment: Comment com parentCommentId opcional, mentionsJson"]
    A8{"Editar ou excluir: ator é autor? ou chefe do departamento do alvo?"}
    A9["403 ACESSO_NEGADO"]
    A10["editComment editedAt / deleteComment deletedBy, active false"]
    A11["save: SavedItem com favorite"]
    A12{"Canal do compartilhamento"}
    A13["MURAL: MuralService.postShare → MuralEntry COMPARTILHAMENTO"]
    A14["SESSAO_DECIA: DeciaSessionService.attachToSession → MessageAttachment"]
    A15["LINK_EXTERNO: externalToken, expiresAt, MediaStoragePort.renderShareImage capa + resumo"]
    A16{"Alvo é PUBLICA?"}
    A17["422 REMIX_SOMENTE_PUBLICO"]
    A18["remix: cópia com originalTaskId / originalProjectId, origin REMIX, crédito visível; Remix; remixesCount + 1"]
    A19["CounterCachePort.incr + UPDATE coluna desnormalizada"]
    A20["AFTER_COMMIT InteractionCreated"]
    A21["NotificationService.notifyOwner: groupKey = dono + tipo + hora; notifyMentions"]
    A22["ReputationService.onQualityReaction se BEM_FUNDAMENTADO ou CONFORME → métrica de qualidade do DeliberativeProfile"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: reactions, comments, saved_items, shares, remixes + tasks/project_schemes/annual_plans contadores")]
    P2[("Redis: counters:{type}:{id}")]
    P3[("MySQL: mural_entries · message_attachments · S3: imagem do link")]
    P4[("Cassandra: notifications_by_user TTL · MySQL: deliberative_profiles")]
  end

  U1 --> A1 --> A2
  A2 -->|"sim"| A3 --> W2
  A2 -->|"não"| A4
  A4 -->|"curtir"| A5
  A4 -->|"reagir"| A6
  A4 -->|"comentar"| A7
  A4 -->|"editar/excluir comentário"| A8
  A8 -->|"não"| A9
  A8 -->|"sim"| A10
  A4 -->|"salvar"| A11
  A4 -->|"compartilhar"| A12
  A12 -->|"MURAL"| A13 --> P3
  A12 -->|"SESSAO_DECIA"| A14 --> P3
  A12 -->|"LINK_EXTERNO"| A15 --> P3
  A4 -->|"remixar"| A16
  A16 -->|"não"| A17
  A16 -->|"sim"| A18
  A5 --> P1
  A6 --> P1
  A7 --> P1
  A10 --> P1
  A11 --> P1
  A13 --> P1
  A14 --> P1
  A15 --> P1
  A18 --> P1
  P1 --> A19 --> P2 --> W3
  A19 --> W1
  P1 --> A20
  A20 --> A21 --> P4
  A20 --> A22 --> P4
  A18 --> W4
  U2 --> W3

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  class A3,A9,A17 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  actor O as Dono do item
  participant NX as Next.js (App Router)
  participant C as Controller (wai-web)
  participant S as Service (wai-application)
  participant DB as Repository/MySQL
  participant R as Redis
  participant CS as Cassandra
  participant S3 as S3
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: curte o projeto P1 no card (CA01)
  NX->>NX: atualização otimista do contador (CA07)
  NX->>C: POST /api/interactions/PROJECT/P1/reactions {reactionType CURTIR}
  C->>S: SocialService.toggleLike(actorId, PROJECT, P1)
  S->>DB: project_schemes P1 (visibility, ownerId, departmentId)
  S->>S: checkVisibility(actor, P1)
  alt P1 PRIVADA de outra pessoa, ou DEPARTAMENTO sem ser membro (CA08)
    S-->>C: 403 ACESSO_NEGADO
    C-->>NX: 403
    NX-->>U: desfaz a atualização otimista, mensagem
  else permitido
    S->>DB: SELECT reactions WHERE actorId AND PROJECT AND P1 AND CURTIR (índice único)
    alt já curtido
      S->>DB: DELETE reactions — descurtir
      S->>R: DECR counters:PROJECT:P1:likes
      S->>DB: UPDATE project_schemes SET likesCount = likesCount - 1
    else ainda não
      S->>DB: INSERT reactions (CURTIR, actorHypeAtTime)
      S->>R: INCR counters:PROJECT:P1:likes
      S->>DB: UPDATE project_schemes SET likesCount = likesCount + 1
      S->>DE: publish InteractionCreated {REACTION, CURTIR}
    end
    S-->>C: 200 {liked, likesCount}
    C-->>NX: 200
  end

  U->>NX: reage BEM_FUNDAMENTADO à tarefa T3 (CA02)
  NX->>C: POST /api/interactions/TASK/T3/reactions {reactionType BEM_FUNDAMENTADO}
  C->>S: SocialService.react
  S->>DB: INSERT reactions (BEM_FUNDAMENTADO)
  S->>DE: publish InteractionCreated {REACTION, BEM_FUNDAMENTADO}
  S-->>C: 201

  U->>NX: comenta em T3 mencionando @ana e responde a um comentário (CA03)
  NX->>C: POST /api/interactions/TASK/T3/comments {contentMd, parentCommentId, mentions [ana]}
  C->>S: SocialService.comment
  S->>DB: INSERT comments (parentCommentId, mentionsJson)
  S->>R: INCR counters:TASK:T3:comments
  S->>DE: publish CommentCreated
  S-->>C: 201 Comment
  O->>NX: chefe do departamento exclui o comentário
  NX->>C: DELETE /api/interactions/comments/{commentId}
  C->>S: SocialService.deleteComment(actorId chefe)
  S->>DB: comments + Department.headUserId do alvo
  alt ator não é autor nem chefe do departamento
    S-->>C: 403 ACESSO_NEGADO
  else autorizado
    S->>DB: UPDATE comments SET active false, deletedBy
    S-->>C: 204
  end

  U->>NX: salva T3 como favorita (CA04)
  NX->>C: POST /api/interactions/TASK/T3/saves {favorite true}
  C->>S: SocialService.save
  S->>DB: INSERT saved_items (favorite) — aparece em Tarefas salvas RF19
  S->>R: INCR counters:TASK:T3:saves
  S-->>C: 201

  U->>NX: compartilha P1 por link externo com expiração em 7 dias (CA05)
  NX->>C: POST /api/interactions/PROJECT/P1/shares {channel LINK_EXTERNO, expiresAt}
  C->>S: SocialService.share
  S->>S3: MediaStoragePort.renderShareImage(P1) — capa + resumo
  S3-->>S: imageMediaId
  S->>DB: INSERT shares (channel LINK_EXTERNO, externalToken, expiresAt, imageMediaId)
  S->>R: INCR counters:PROJECT:P1:shares
  S-->>C: 201 {url /s/{externalToken}, expiresAt}
  Note over S,DB: channel MURAL → MuralService.postShare cria MuralEntry COMPARTILHAMENTO (RF27). channel SESSAO_DECIA → DeciaSessionService.attachToSession cria MessageAttachment (RF29).

  U->>NX: remixa o projeto público P1 (CA06)
  NX->>C: POST /api/interactions/PROJECT/P1/remixes
  C->>S: SocialService.remix(actorId, PROJECT, P1)
  alt P1 não é PUBLICA
    S-->>C: 422 REMIX_SOMENTE_PUBLICO
  else pública
    S->>DB: INSERT project_schemes (cópia, origin REMIX, originalProjectId P1, ownerId ator)
    S->>DB: INSERT project_tasks copiados
    S->>DB: INSERT remixes (sourceType PROJECT, sourceId P1, resultType PROJECT, resultId)
    S->>R: INCR counters:PROJECT:P1:remixes
    S->>DB: UPDATE project_schemes SET remixesCount + 1 WHERE id = P1
    S->>DE: publish RemixCreated
    S-->>C: 201 cópia com crédito visível
  end

  DE->>CS: INSERT notifications_by_user (recipient dono, category SOCIAL, groupKey dono + tipo + hora) (CA09)
  DE->>DB: UPDATE deliberative_profiles — reações BEM_FUNDAMENTADO e CONFORME pesam na métrica de qualidade (CA09)
  O->>NX: abre o card de P1
  NX->>C: GET /api/interactions/PROJECT/P1/counters
  C->>S: SocialService.counters
  S->>R: MGET counters:PROJECT:P1:*
  S-->>C: 200 {likes, comments, saves, shares, remixes} (CA07)
  NX-->>O: "remixado por N pessoas", notificações agrupadas por hora
```

## 4. Máquina de estados

O RF26 não tem máquina de estados própria. A entidade com ciclo de vida mais rico que ele altera é o **`Comment`** (`active`, `editedAt`, `deletedBy`), mostrado abaixo; o segundo diagrama aninhado mostra o ciclo do **`Share` LINK_EXTERNO** (`expiresAt`) e o toggle de **`Reaction` CURTIR**.

```mermaid
stateDiagram-v2
  state "Comment" as CM {
    [*] --> PUBLICADO : POST comments, raiz ou resposta com parentCommentId
    PUBLICADO --> PUBLICADO : nova resposta na thread
    PUBLICADO --> EDITADO : autor edita, editedAt
    EDITADO --> EDITADO : autor edita novamente
    PUBLICADO --> EXCLUIDO : autor ou chefe do departamento exclui, deletedBy, active false
    EDITADO --> EXCLUIDO : autor ou chefe do departamento exclui
    EXCLUIDO --> [*]
  }
  state "Share LINK_EXTERNO" as SH {
    [*] --> LINK_ATIVO : POST shares LINK_EXTERNO, externalToken, imagem capa + resumo
    LINK_ATIVO --> LINK_EXPIRADO : passa expiresAt
    LINK_ATIVO --> LINK_REVOGADO : autor revoga
    LINK_EXPIRADO --> [*]
    LINK_REVOGADO --> [*]
  }
  state "Reaction CURTIR" as RC {
    [*] --> NAO_CURTIDO
    NAO_CURTIDO --> CURTIDO : toggleLike insere, índice único
    CURTIDO --> NAO_CURTIDO : toggleLike remove
  }
  note right of CM
    Menções em mentionsJson geram Notification (CA03).
    Exclusão por terceiro sem papel de chefe: 403 ACESSO_NEGADO.
  end note
  note right of SH
    Canais MURAL e SESSAO_DECIA não expiram:
    viram MuralEntry e MessageAttachment (CA05).
  end note
  note right of RC
    1 reação CURTIR por usuário e alvo (CA01).
    Reações qualitativas seguem a mesma regra por tipo (CA02).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["components/ui: InteractionBar, LikeButton, ReactionPicker UTIL BEM_FUNDAMENTADO INOVADOR CONFORME, CommentThread com menções, SaveButton favorito, ShareSheet Mural / Sessão DECIA / Link externo, RemixButton, CountersRow, CreditBadge"]
    F2["Usado em: app/acervo, app/projects, app/plans, app/mural, app/search, app/profile sub-abas Tarefas salvas e Projetos salvos"]
    F3["app/s/[token] — página pública do link externo com imagem exportada"]
  end

  subgraph WEB["wai-web"]
    C1["InteractionController — /api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes|counters"]
    C2["PublicShareController — /s/{externalToken}"]
  end

  subgraph APP["wai-application"]
    S1["SocialService"]
    S2["MuralService RF27"]
    S3["DeciaSessionService RF29"]
    S4["NotificationService plataforma"]
    S5["ReputationService RF43"]
    P1["CounterCachePort"]
    P2["MediaStoragePort"]
  end

  subgraph DOM["wai-domain"]
    D1["Reaction · Comment · SavedItem · Share · Remix"]
    D2["TaskItem · ProjectScheme · AnnualPlan contadores e visibilidade · MessageAttachment · MuralEntry"]
    D3["Notification · DeliberativeProfile · Department · DepartmentMembership · DomainEventOutbox"]
  end

  subgraph INFRA["wai-infrastructure/*"]
    I1[("persistence-mysql: reactions, comments, saved_items, shares, remixes, mural_entries, message_attachments, tasks, project_schemes, annual_plans, deliberative_profiles")]
    I2[("cache-redis: RedisCounterAdapter counters:{type}:{id}:*")]
    I3[("persistence-cassandra: notifications_by_user TTL, timeline_by_user")]
    I4[("storage-s3: imagem exportada do link externo")]
    I5["platform: outbox AFTER_COMMIT InteractionCreated, CommentCreated, RemixCreated"]
  end

  F1 --- F2
  F1 -->|"HTTPS/JSON"| C1
  F3 -->|"HTTPS"| C2
  C1 --> S1
  C2 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> P1
  S1 --> P2
  S1 --> D1
  S1 --> D2
  S1 --> D3
  D3 --> I5
  I5 --> S4
  I5 --> S5
  S4 --> I3
  S5 --> I1
  D1 --> I1
  D2 --> I1
  P1 --> I2
  P2 --> I4
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF26.CA01 | `Reaction` (nota índice único actorId + targetType + targetId + CURTIR), `SocialService.toggleLike` · Atividades `A4 (curtir) → A5 → P1` · Sequência `POST …/PROJECT/P1/reactions {CURTIR}` → `alt já curtido → DELETE` / `INSERT reactions` · Máquina *Reaction CURTIR* · Componente `LikeButton` |
| RF26.CA02 | Enum `ReactionType` (UTIL, BEM_FUNDAMENTADO, INOVADOR, CONFORME), `SocialService.react` · Atividades `A4 (reagir) → A6` · Sequência `POST …/TASK/T3/reactions {BEM_FUNDAMENTADO}` · Nota de *Reaction CURTIR* · Componente `ReactionPicker` |
| RF26.CA03 | `Comment` (parentCommentId, mentionsJson, editedAt, deletedBy, active), `Department.headUserId`, `SocialService.comment/editComment/deleteComment`, `NotificationService.notifyMentions` · Atividades `A7`, `A8 → A9 403 / A10` · Sequência `POST …/comments {contentMd, parentCommentId, mentions}` e `DELETE /api/interactions/comments/{id}` com `alt ator não é autor nem chefe → 403` · Máquina *Comment* (PUBLICADO → EDITADO → EXCLUIDO) · Componente `CommentThread` |
| RF26.CA04 | `SavedItem` (favorite), `SocialService.save` · Atividades `A4 (salvar) → A11` · Sequência `POST …/TASK/T3/saves {favorite true}` → "aparece em Tarefas salvas RF19" · Componentes `SaveButton`, `app/profile sub-abas Tarefas salvas e Projetos salvos` |
| RF26.CA05 | `Share` (channel, sessionId, externalToken, expiresAt, imageMediaId), enum `ShareChannel`, `MuralEntry`, `MessageAttachment`, `MuralService.postShare`, `DeciaSessionService.attachToSession`, `MediaStoragePort.renderShareImage` · Atividades `A12 → A13 / A14 / A15 → P3` · Sequência `POST …/PROJECT/P1/shares {LINK_EXTERNO, expiresAt}` → `renderShareImage` → `INSERT shares` + nota MURAL / SESSAO_DECIA · Máquina *Share LINK_EXTERNO* · Componentes `ShareSheet`, `PublicShareController /s/{token}`, `app/s/[token]`, `storage-s3` |
| RF26.CA06 | `Remix`, `TaskItem.originalTaskId`, `ProjectScheme.originalProjectId / origin REMIX`, `SocialService.remix` · Atividades `A16 → A17 422 REMIX_SOMENTE_PUBLICO / A18 → W4` · Sequência `POST …/PROJECT/P1/remixes` → `alt não é PUBLICA → 422` / `INSERT project_schemes (cópia, origin REMIX, originalProjectId)`, `INSERT remixes`, "remixado por N pessoas" · Componentes `RemixButton`, `CreditBadge` |
| RF26.CA07 | `TaskItem/ProjectScheme/AnnualPlan.likesCount … remixesCount`, `CounterCachePort`, `RedisCounterAdapter`, `SocialService.counters` · Atividades `A19 → P2 → W3`, `W1` (otimista) · Sequência `INCR/DECR counters:…`, `UPDATE … likesCount`, `GET …/counters` → `MGET` · Componentes `CountersRow`, `cache-redis` |
| RF26.CA08 | `SocialService.checkVisibility` (nota), enum `Visibility`, `DepartmentMembership` · Atividades `A1 → A2 → A3 403 ACESSO_NEGADO → W2` · Sequência `checkVisibility(actor, P1)` → `alt P1 PRIVADA de outra pessoa, ou DEPARTAMENTO sem ser membro → 403` |
| RF26.CA09 | `Notification.groupKey` (dono + tipo + hora, category SOCIAL), `DeliberativeProfile`, `NotificationService.notifyOwner`, `ReputationService.onQualityReaction`, `CassandraNotificationAdapter` · Atividades `A20 → A21 → P4`, `A20 → A22 → P4` · Sequência `DE->>CS INSERT notifications_by_user (… groupKey dono + tipo + hora)` e `DE->>DB UPDATE deliberative_profiles — BEM_FUNDAMENTADO e CONFORME pesam` · Componentes `NotificationService`, `ReputationService RF43`, `persistence-cassandra` |
