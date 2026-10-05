# RF19 — Curtir, comentar, salvar, compartilhar, retornar, atribuir e remixar tarefas, esquemas de projeto e planos anuais (interações sociais)
**HU:** HU19 · **Sprint (board Work Station):** a confirmar (card renomeado em 2026-10-02; origem `_anterior/RF26` = Sprint 4) · **Equivalente FAI:** RF19 Interações sociais (alvo polimórfico PIECE/SCHEME/DNA) · **Aba/rota:** ações inline em todos os cards (Acervo, Projetos, Planos Anuais, Mural, Buscar, perfil) · **API:** `/api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes|counters`
**Critérios de aceite cobertos:** RF26.CA01 · RF26.CA02 · RF26.CA03 · RF26.CA04 · RF26.CA05 · RF26.CA06 · RF26.CA07 · RF26.CA08 · RF26.CA09 (citados como estão escritos no card — **corpo do card = antigo RF26**). As interações **retornar** e **atribuir** constam só no título, sem CA no corpo: estão modeladas no **RF18** (CA03–CA06) e aqui aparecem apenas como remissão.

> **HU19** — COMO usuário autenticado POSSO curtir, reagir, comentar, salvar, compartilhar e remixar tarefas, esquemas de projeto e planos anuais PARA colaborar, dar retorno de qualidade e reaproveitar o trabalho dos colegas. Ref.: RF26 (equivalente às Interações sociais RF19 do FAI).

Alvo polimórfico `TargetType` (**TASK · PROJECT · PLAN** — além de KIT, PROJECT_TASK, MESSAGE, RECOGNITION usados por outros RFs). Seis interações, cada uma com sua entidade: **curtir** (`Reaction` CURTIR, única por ator e alvo), **reagir** (`Reaction` ÚTIL · BEM_FUNDAMENTADO · INOVADOR · CONFORME), **comentar** (`Comment` com thread `parentCommentId`, edição, exclusão pelo autor ou pelo chefe do departamento, menções → `Notification`), **salvar** (`SavedItem` com marcador favorito → sub-abas *Tarefas salvas* / *Projetos salvos*), **compartilhar** (`Share` em canal MURAL → `MuralEntry` RF27, SESSAO_DECIA → `MessageAttachment` RF29, LINK_EXTERNO com `externalToken`, `expiresAt` e imagem exportada `imageMediaId`) e **remixar** (`Remix` + cópia com `originalTaskId` / `originalProjectId` / `derivedFromPlanId` e crédito visível). Contadores desnormalizados (`likesCount … remixesCount`) em tempo quase real via Redis; toda interação respeita a **visibilidade** do alvo e gera **notificação agrupada por hora** (`Notification.groupKey`) ao dono, alimentando o perfil deliberativo (reações BEM_FUNDAMENTADO e CONFORME pesam na métrica de qualidade).

| CA (como escrito no card) | Enunciado |
|---|---|
| **RF26.CA01** | Curtir/descurtir tarefa, projeto ou plano (1 reação por usuário e alvo, índice único). |
| **RF26.CA02** | Reações qualitativas: ÚTIL, BEM FUNDAMENTADO, INOVADOR, CONFORME (substituem TREND/ELEGANTE/CRIATIVO). |
| **RF26.CA03** | Comentários com resposta (thread), edição, exclusão pelo autor ou pelo chefe do departamento; menções @usuário geram notificação. |
| **RF26.CA04** | Salvar em *Tarefas salvas* / *Projetos salvos* com marcador de favorito. |
| **RF26.CA05** | Compartilhar: no **Mural** da empresa (RF27), **dentro de uma sessão DECIA** (RF29) ou por **link externo** com imagem exportada (capa + resumo) e controle de expiração. |
| **RF26.CA06** | **Remixar** um projeto ou tarefa pública: cria cópia com `originalId` e crédito visível; o autor original vê "remixado por N pessoas". |
| **RF26.CA07** | Contadores (curtidas, comentários, salvos, compartilhamentos, remixes) em tempo quase real nos cards e no perfil. |
| **RF26.CA08** | Interações respeitam a visibilidade: item PRIVADO não recebe interações de terceiros; item DEPARTAMENTO só de membros do departamento. |
| **RF26.CA09** | Toda interação gera notificação ao dono (agrupada por hora) e alimenta o perfil deliberativo (objetivo 2) — reações BEM FUNDAMENTADO e CONFORME pesam na métrica de qualidade. |
| *(título)* retornar · atribuir | Sem CA no corpo. Modelados no **RF18** (`TaskReturn` e `Assignment`, propostas). Aplicam-se a TASK e PROJECT; **não** a PLAN (a confirmar). |

| Interação | Entidade | Regra de unicidade / canal | Contador | Alvos |
|---|---|---|---|---|
| Curtir / descurtir | `Reaction` CURTIR | único (actorId, targetType, targetId, CURTIR) — toggle | `likesCount` | TASK · PROJECT · PLAN |
| Reagir | `Reaction` UTIL · BEM_FUNDAMENTADO · INOVADOR · CONFORME | 1 por tipo, ator e alvo | — (pesa no perfil deliberativo) | TASK · PROJECT · PLAN |
| Comentar | `Comment` | thread via `parentCommentId`, `editedAt`, `deletedBy`, `mentionsJson` | `commentsCount` | TASK · PROJECT · PLAN |
| Salvar | `SavedItem` | único (userId, targetType, targetId), `favorite` | `savesCount` | TASK · PROJECT · PLAN (sub-aba *Meus Planos* — a confirmar) |
| Compartilhar | `Share` | `channel` MURAL · SESSAO_DECIA · LINK_EXTERNO (`externalToken`, `expiresAt`, `imageMediaId`) | `sharesCount` | TASK · PROJECT · PLAN |
| Remixar | `Remix` + nova `TaskItem`/`ProjectScheme`/`AnnualPlan` | só alvos PUBLICA, `originalTaskId` / `originalProjectId` / `derivedFromPlanId` | `remixesCount` | TASK · PROJECT · PLAN |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_social {
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
    +kind: MuralKind COMPARTILHAMENTO
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
    +groupKey: String dono tipo hora
    +read: boolean
  }
}

namespace ws_domain_alvos {
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
    +scope: PlanScope
    +visibility: Visibility
    +derivedFromPlanId: UUID remix
    +status: PlanStatus
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

namespace ws_application {
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
  class ReturnService {
    <<service>>
    +returnItem() ver RF18 proposta
  }
  class AssignmentService {
    <<service>>
    +assign() ver RF18 e RF10 proposta
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

namespace ws_web {
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

namespace ws_infrastructure {
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
Remix ..> AnnualPlan : resultId com derivedFromPlanId
Reaction ..> TaskItem : targetId quando TASK
Reaction ..> ProjectScheme : targetId quando PROJECT
Reaction ..> AnnualPlan : targetId quando PLAN
Notification "*" --> "1" TaskItem : resourceId dono notificado
TaskItem --> Visibility
ProjectScheme --> Visibility
AnnualPlan --> Visibility

InteractionController ..> SocialService
InteractionController ..> ReturnService : RF18
InteractionController ..> AssignmentService : RF18
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

note for Reaction "tabela reactions · único actorId + targetType + targetId + reactionType = CURTIR (CA01) · tipos qualitativos (CA02) · alvos TASK, PROJECT, PLAN"
note for Comment "tabela comments · thread, edição, exclusão pelo autor ou chefe, menções notificam (CA03)"
note for Share "tabela shares · MURAL → MuralEntry, SESSAO_DECIA → MessageAttachment, LINK_EXTERNO com externalToken, expiresAt e imageMediaId (CA05)"
note for SocialService "checkVisibility: PRIVADA só dono, DEPARTAMENTO só membros, EMPRESA só mesma empresa (CA08) · contadores em Redis + colunas desnormalizadas (CA07) · retornar e atribuir → RF18"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Aciona uma ação no card de tarefa, projeto ou plano anual: curtir, reagir, comentar, salvar, compartilhar ou remixar"]
    U2["Dono abre o card ou o perfil"]
    U3["Retornar ou Atribuir → fluxo do RF18"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Atualização otimista do contador e do estado do botão"]
    W2["Mensagem: item sem permissão para interagir"]
    W3["Contadores em tempo quase real: curtidas, comentários, salvos, compartilhamentos, remixes"]
    W4["Autor original vê remixado por N pessoas"]
  end

  subgraph LA["ws-application"]
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
    A11["save: SavedItem com favorite → Tarefas salvas / Projetos salvos / Planos salvos"]
    A12{"Canal do compartilhamento"}
    A13["MURAL: MuralService.postShare → MuralEntry COMPARTILHAMENTO"]
    A14["SESSAO_DECIA: DeciaSessionService.attachToSession → MessageAttachment"]
    A15["LINK_EXTERNO: externalToken, expiresAt, MediaStoragePort.renderShareImage capa + resumo"]
    A16{"Alvo é PUBLICA?"}
    A17["422 REMIX_SOMENTE_PUBLICO"]
    A18["remix: cópia com originalTaskId / originalProjectId / derivedFromPlanId, origin REMIX, crédito visível; Remix; remixesCount + 1"]
    A19["CounterCachePort.incr + UPDATE coluna desnormalizada"]
    A20["AFTER_COMMIT InteractionCreated"]
    A21["NotificationService.notifyOwner: groupKey = dono + tipo + hora; notifyMentions"]
    A22["ReputationService.onQualityReaction se BEM_FUNDAMENTADO ou CONFORME → métrica de qualidade do DeliberativeProfile"]
    A23["ReturnService / AssignmentService — RF18.CA03–CA06"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: reactions, comments, saved_items, shares, remixes + tasks / project_schemes / annual_plans contadores")]
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
  U3 --> A23

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef ref fill:#eef6ff,stroke:#4a4852,color:#1f2937
  class A3,A9,A17 err
  class U3,A23 ref
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  actor O as Dono do item
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant R as Redis
  participant CS as Cassandra
  participant S3 as S3
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: curte o plano anual PA1 no card (CA01, alvo PLAN)
  NX->>NX: atualização otimista do contador (CA07)
  NX->>C: POST /api/interactions/PLAN/PA1/reactions {reactionType CURTIR}
  C->>S: SocialService.toggleLike(actorId, PLAN, PA1)
  S->>DB: annual_plans PA1 (visibility, ownerId, departmentId)
  S->>S: checkVisibility(actor, PA1)
  alt PA1 PRIVADA de outra pessoa, ou DEPARTAMENTO sem ser membro (CA08)
    S-->>C: 403 ACESSO_NEGADO
    C-->>NX: 403
    NX-->>U: desfaz a atualização otimista, mensagem
  else permitido
    S->>DB: SELECT reactions WHERE actorId AND PLAN AND PA1 AND CURTIR (índice único)
    alt já curtido
      S->>DB: DELETE reactions — descurtir
      S->>R: DECR counters:PLAN:PA1:likes
      S->>DB: UPDATE annual_plans SET likesCount = likesCount - 1
    else ainda não
      S->>DB: INSERT reactions (CURTIR, actorHypeAtTime)
      S->>R: INCR counters:PLAN:PA1:likes
      S->>DB: UPDATE annual_plans SET likesCount = likesCount + 1
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
  S->>DB: INSERT saved_items (favorite) — aparece em Tarefas salvas
  S->>R: INCR counters:TASK:T3:saves
  S-->>C: 201

  U->>NX: compartilha o projeto P1 por link externo com expiração em 7 dias (CA05)
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
  Note over S,DB: remix de PLAN cria AnnualPlan com derivedFromPlanId (RF24.CA04) e os 6 PlanAxis copiados

  DE->>CS: INSERT notifications_by_user (recipient dono, category SOCIAL, groupKey dono + tipo + hora) (CA09)
  DE->>DB: UPDATE deliberative_profiles — reações BEM_FUNDAMENTADO e CONFORME pesam na métrica de qualidade (CA09)
  O->>NX: abre o card de P1
  NX->>C: GET /api/interactions/PROJECT/P1/counters
  C->>S: SocialService.counters
  S->>R: MGET counters:PROJECT:P1:*
  S-->>C: 200 {likes, comments, saves, shares, remixes} (CA07)
  NX-->>O: remixado por N pessoas, notificações agrupadas por hora
  Note over U,DE: Retornar e Atribuir (título do card) seguem o RF18: POST .../returns e POST .../assignments
```

## 4. Máquina de estados

O RF19 não tem máquina de estados própria. A entidade com ciclo de vida mais rico que ele altera é o **`Comment`** (`active`, `editedAt`, `deletedBy`); os blocos seguintes mostram o ciclo do **`Share` LINK_EXTERNO** (`expiresAt`) e o toggle de **`Reaction` CURTIR**. Os ciclos de `TaskReturn` e `Assignment` (retornar/atribuir) estão no RF18.

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
  state "Reaction CURTIR — TASK, PROJECT ou PLAN" as RC {
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
    F1["components/ui: InteractionBar, LikeButton, ReactionPicker UTIL BEM_FUNDAMENTADO INOVADOR CONFORME, CommentThread com menções, SaveButton favorito, ShareSheet Mural / Sessão DECIA / Link externo, RemixButton, CountersRow, CreditBadge + ReturnButton e AssignButton (RF18)"]
    F2["Usado em: app/acervo, app/projects, app/plans, app/mural, app/search, app/u/[username], app/profile sub-abas Tarefas salvas e Projetos salvos"]
    F3["app/s/[token] — página pública do link externo com imagem exportada"]
  end

  subgraph WEB["ws-web"]
    C1["InteractionController — /api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes|counters (+ /returns, /assignments RF18)"]
    C2["PublicShareController — /s/{externalToken}"]
  end

  subgraph APP["ws-application"]
    S1["SocialService"]
    S2["MuralService RF27"]
    S3["DeciaSessionService RF29"]
    S4["NotificationService plataforma"]
    S5["ReputationService RF43"]
    S6["ReturnService · AssignmentService RF18 (propostas)"]
    P1["CounterCachePort"]
    P2["MediaStoragePort"]
  end

  subgraph DOM["ws-domain"]
    D1["Reaction · Comment · SavedItem · Share · Remix"]
    D2["TaskItem · ProjectScheme · AnnualPlan contadores e visibilidade · MessageAttachment · MuralEntry"]
    D3["Notification · DeliberativeProfile · Department · DepartmentMembership · DomainEventOutbox"]
  end

  subgraph INFRA["ws-infrastructure/*"]
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
  C1 --> S6
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
| RF26.CA01 | `Reaction` (nota índice único actorId + targetType + targetId + CURTIR), `SocialService.toggleLike` · Atividades `A4 (curtir) → A5 → P1` · Sequência `POST …/PLAN/PA1/reactions {CURTIR}` → `alt já curtido → DELETE` / `INSERT reactions` (msgs 3–21) · Máquina *Reaction CURTIR* · Componente `LikeButton` |
| RF26.CA02 | Enum `ReactionType` (UTIL, BEM_FUNDAMENTADO, INOVADOR, CONFORME), `SocialService.react` · Atividades `A4 (reagir) → A6` · Sequência `POST …/TASK/T3/reactions {BEM_FUNDAMENTADO}` (msgs 22–26) · Nota de *Reaction CURTIR* · Componente `ReactionPicker` |
| RF26.CA03 | `Comment` (parentCommentId, mentionsJson, editedAt, deletedBy, active), `Department.headUserId`, `SocialService.comment/editComment/deleteComment`, `NotificationService.notifyMentions` · Atividades `A7`, `A8 → A9 403 / A10` · Sequência `POST …/comments {contentMd, parentCommentId, mentions}` e `DELETE /api/interactions/comments/{id}` com `alt ator não é autor nem chefe → 403` (msgs 27–40) · Máquina *Comment* · Componente `CommentThread` |
| RF26.CA04 | `SavedItem` (favorite), `SocialService.save` · Atividades `A4 (salvar) → A11` · Sequência `POST …/TASK/T3/saves {favorite true}` (msgs 41–45) · Componentes `SaveButton`, `app/profile sub-abas Tarefas salvas e Projetos salvos` |
| RF26.CA05 | `Share` (channel, sessionId, externalToken, expiresAt, imageMediaId), enum `ShareChannel`, `MuralEntry`, `MessageAttachment`, `MuralService.postShare`, `DeciaSessionService.attachToSession`, `MediaStoragePort.renderShareImage` · Atividades `A12 → A13 / A14 / A15 → P3` · Sequência `POST …/PROJECT/P1/shares {LINK_EXTERNO, expiresAt}` → `renderShareImage` → `INSERT shares` + nota MURAL / SESSAO_DECIA (msgs 46–53) · Máquina *Share LINK_EXTERNO* · Componentes `ShareSheet`, `PublicShareController /s/{token}`, `app/s/[token]`, `storage-s3` |
| RF26.CA06 | `Remix`, `TaskItem.originalTaskId`, `ProjectScheme.originalProjectId / origin REMIX`, `AnnualPlan.derivedFromPlanId`, `SocialService.remix` · Atividades `A16 → A17 422 REMIX_SOMENTE_PUBLICO / A18 → W4` · Sequência `POST …/PROJECT/P1/remixes` → `alt não é PUBLICA → 422` / `INSERT project_schemes (cópia, origin REMIX …)`, `INSERT remixes`, nota remix de PLAN (msgs 54–64) · Componentes `RemixButton`, `CreditBadge` |
| RF26.CA07 | `TaskItem/ProjectScheme/AnnualPlan.likesCount … remixesCount`, `CounterCachePort`, `RedisCounterAdapter`, `SocialService.counters` · Atividades `A19 → P2 → W3`, `W1` (otimista) · Sequência `INCR/DECR counters:…`, `UPDATE … likesCount`, `GET …/counters → MGET` (msgs 2, 67–71) · Componentes `CountersRow`, `cache-redis` |
| RF26.CA08 | `SocialService.checkVisibility` (nota), enum `Visibility`, `DepartmentMembership` · Atividades `A1 → A2 → A3 403 ACESSO_NEGADO → W2` · Sequência `checkVisibility(actor, PA1)` → `alt PA1 PRIVADA de outra pessoa, ou DEPARTAMENTO sem ser membro → 403` (msgs 6–9) |
| RF26.CA09 | `Notification.groupKey` (dono + tipo + hora, category SOCIAL), `DeliberativeProfile`, `NotificationService.notifyOwner`, `ReputationService.onQualityReaction`, `CassandraNotificationAdapter` · Atividades `A20 → A21 → P4`, `A20 → A22 → P4` · Sequência `DE->>CS INSERT notifications_by_user (… groupKey dono + tipo + hora)` e `DE->>DB UPDATE deliberative_profiles` (msgs 65–66) · Componentes `NotificationService`, `ReputationService RF43`, `persistence-cassandra` |
| *(título)* retornar · atribuir | `ReturnService`, `AssignmentService` (propostas, RF18), `InteractionController` (+ `/returns`, `/assignments`) · Atividade `U3 → A23` · Sequência nota final · Componentes `ReturnButton`, `AssignButton` · Detalhe, estados e CAs: **RF18.CA03–CA06** |
