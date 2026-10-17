# RF56 — Colaborar, comentar e resolver conflitos em documentos Letters no DECIA
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Letters (`/letters`, `/letters/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 4 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF56.CA01 … RF56.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF56.md (CAs copiados como estão escritos); classes reais: `lib/pieces/collab.ts` (RegionLock, acquireLock, canEditRegions, LOCK_TTL_MS), `lib/pieces/patch.ts` (authorizePatch, REGIAO_RESERVADA), `lib/pieces/authorship.ts`, `lib/ai/autonomy.ts` (SessionRole), `ws-domain` `SessionParticipant`/`ParticipantRole`/`DecisionTraceNode`, `TaskService`, `ResourceAuthorizer`, `AccessPolicy`, `components/decia/*`; o restante (planejado)

Editores autorizados de uma tarefa abrem o mesmo documento Letters dentro de uma sessão DECIA: alterações em blocos diferentes convergem e são persistidas, o mesmo bloco segue uma política explícita de reserva ou merge sem sobrescrita silenciosa, gravações com reserva expirada, desconexão ou acesso revogado são rejeitadas no servidor com rascunho recuperável, comentários e sugestões guardam autor, data, trecho e resolução, observadores só leem, e a versão aprovada vira evidência imutável da decisão sem ser publicada automaticamente.

**Estado em 17/10/2026.** Não há colaboração Letters no app (MATRIZ_RF: AUSENTE, 0,00; PLANO_ONDAS Onda 4). Reais e reaproveitados: reserva de regiões com prazo (`lib/pieces/collab.ts`, TTL de 60 s renovável só pelo dono) e a porta única `authorizePatch` que aplica camada, seleção e reserva juntas, ambas funções puras sem servidor; papéis de sessão `SessionRole` (`lib/ai/autonomy.ts`) e, no backend, `SessionParticipant`/`ParticipantRole` (ADMIN · MEMBRO · OBSERVADOR · IA) e `DecisionTraceNode` (grafo imutável do RF29) em `ws-domain`; `ResourceAuthorizer` com 404 uniforme e `AccessPolicy` (SIGILOSO só dono e colaboradores explícitos, D-139); a UI DECIA em `components/decia/*` (`DecisionWorkspace`, `DecisionCard`). Planejado: `CollabDocPort` com Yjs e transporte WebSocket no Spring, presença via Redis, snapshots em S3 e atualizações em Cassandra (`COEDICAO_TECNICA.md`).

**Heurística × mock × IA real.** Convergência, reservas e autorização são determinísticas e testáveis sem IA; testes de concorrência usam dois clientes simulados (*mock*) contra o mesmo serviço; nenhuma IA participa deste RF, e propostas de IA de outros RF dentro da sessão continuam sujeitas à autonomia do proprietário (D-136).

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF56.CA01** | Dados dois editores autorizados, quando alteram blocos diferentes, então as alterações convergem e são persistidas. |
| **RF56.CA02** | Dados dois editores no mesmo bloco, quando há concorrência, então usa política explícita de bloqueio ou merge e não sobrescreve silenciosamente. |
| **RF56.CA03** | Dada reserva expirada, desconexão ou revogação, quando tenta gravar, então servidor rejeita e preserva rascunho recuperável. |
| **RF56.CA04** | Dado comentário ou sugestão, quando é resolvido, então mantém autor, data, trecho de origem e estado de resolução. |
| **RF56.CA05** | Dada sessão DECIA vinculada, quando compartilha documento, então aplica simultaneamente ACL da tarefa e participação/papel válido da sessão. |
| **RF56.CA06** | Dado usuário observador, quando tenta editar ou aceitar proposta, então bloqueia no servidor. |
| **RF56.CA07** | Dada versão aprovada, quando vira evidência de decisão, então mantém vínculo imutável à revisão, sem publicar o documento automaticamente. |

## 0. Diagrama de casos de uso

Na sessão DECIA, editar exige ao mesmo tempo o vínculo de colaborador na tarefa e o papel na sessão; o observador só lê e o responsável pela decisão fixa a versão aprovada como evidência. Reserva e autorização existem como funções puras; a coedição em tela é planejada.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  colaborador["«ator» Colaborador explícito"]:::ator
  dono["«ator» Dono da peça"]:::ator
  participante_sessao["«ator» Participante da sessão"]:::ator
  decisor["«ator» Responsável pela decisão"]:::ator
  subgraph SIS["Work Station — RF56 Coedição Letters no DECIA"]
    direction TB
    UC1(["UC1 Abrir documento na sessão DECIA"]):::ucPlan
    UC2(["UC2 Editar blocos em paralelo"]):::ucPlan
    UC3(["UC3 Reservar bloco antes de editar"]):::ucPlan
    UC4(["UC4 Recuperar rascunho após gravação rejeitada"]):::ucPlan
    UC5(["UC5 Comentar ou sugerir em trecho"]):::ucPlan
    UC6(["UC6 Resolver comentário ou sugestão"]):::ucPlan
    UC7(["UC7 Acompanhar a sessão como observador"]):::ucPlan
    UC8(["UC8 Fixar versão aprovada como evidência"]):::ucPlan
    UC9(["UC9 Verificar ACL da tarefa e papel na sessão"]):::ucPlan
    UC10(["UC10 Verificar escopo e reserva (authorizePatch)"]):::ucPlan
  end
  dono -- "é um" --> colaborador
  participante_sessao --- UC1
  colaborador --- UC2
  participante_sessao --- UC2
  colaborador --- UC3
  participante_sessao --- UC3
  colaborador --- UC4
  participante_sessao --- UC4
  colaborador --- UC5
  participante_sessao --- UC5
  colaborador --- UC6
  participante_sessao --- UC6
  participante_sessao --- UC7
  decisor --- UC8
  UC1 -. "«include»" .-> UC9
  UC2 -. "«include»" .-> UC9
  UC2 -. "«include»" .-> UC10
  UC5 -. "«include»" .-> UC9
  UC6 -. "«include»" .-> UC9
  UC8 -. "«include»" .-> UC9
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Abrir documento na sessão DECIA | `participante_sessao` | RF56.CA05 | planejado |
| UC2 Editar blocos em paralelo | `colaborador`, `participante_sessao` | RF56.CA01 · CA02 | planejado |
| UC3 Reservar bloco antes de editar | `colaborador`, `participante_sessao` | RF56.CA02 | planejado — `acquireLock` (`lib/pieces/collab.ts`), sem tela |
| UC4 Recuperar rascunho após gravação rejeitada | `colaborador`, `participante_sessao` | RF56.CA03 | planejado |
| UC5 Comentar ou sugerir em trecho | `colaborador`, `participante_sessao` | RF56.CA04 | planejado |
| UC6 Resolver comentário ou sugestão | `colaborador`, `participante_sessao` | RF56.CA04 | planejado |
| UC7 Acompanhar a sessão como observador | `participante_sessao` | RF56.CA06 | planejado |
| UC8 Fixar versão aprovada como evidência | `decisor` | RF56.CA07 | planejado — `DecisionTraceNode` imutável no `ws-domain` |
| UC9 Verificar ACL da tarefa e papel na sessão | — (incluído por UC1, UC2, UC5, UC6, UC8) | RF56.CA05 · CA06 | planejado — `ResourceAuthorizer` e `ParticipantRole` reais, sem tela |
| UC10 Verificar escopo e reserva (authorizePatch) | — (incluído por UC2) | RF56.CA02 · CA03 | planejado — função pura `lib/pieces/patch.ts` |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

class MergePolicy {
  <<enum>>
  RESERVA_POR_BLOCO
  MERGE_CRDT_COM_REVISAO
}
class ParticipantRole {
  <<enum>>
  ADMIN
  MEMBRO
  OBSERVADOR
  IA
}
class SessionParticipant {
  <<entity>>
  +sessionId: UUID
  +userId: UUID
  +role: ParticipantRole
  +leftAt: Instant
}
class RegionLock {
  <<entity>>
  +pieceId: String
  +layerId: String
  +regionIds: List~String~
  +ownerId: String
  +expiresAt: long
}
class DocComment {
  <<entity>>
  +id: UUID
  +pieceId: UUID
  +authorId: UUID
  +createdAt: Instant
  +anchorBlockId: String
  +anchorRevision: long
  +excerpt: String
  +isSuggestion: boolean
  +status: String
  +resolvedBy: UUID
  +resolvedAt: Instant
}
class RecoverableDraft {
  <<entity>>
  +pieceId: UUID
  +userId: UUID
  +baseVersion: long
  +reason: String
  +savedAt: Instant
}
class PieceRevision {
  <<entity>>
  +id: UUID
  +version: long
  +contentHash: String
  +approvedBy: UUID
  +approvedAt: Instant
}
class DecisionTraceNode {
  <<entity>>
  +sessionId: UUID
  +nodeType: TraceNodeType
  +refId: UUID
  +actorId: UUID
  +snapshotJson: String
}
class CollabSessionService {
  <<service>>
  +join(actor, pieceId, sessionId) CollabHandle
  +applyUpdate(actor, pieceId, update, baseVersion) PieceRevision
  +resolveComment(actor, commentId) DocComment
  +linkAsEvidence(actor, pieceId, revisionId, decisionId) DecisionTraceNode
}
class CollabDocPort {
  <<port>>
  +open(pieceId, actor) CollabDocHandle
  +applyUpdate(pieceId, update) void
  +awareness(pieceId) List~Presence~
}
class LockRules {
  <<service>>
  +acquireLock(locks, req, now) LockResult
  +canEditRegions(locks, query, now) boolean
}
class ResourceAuthorizer {
  <<service>>
  +require(actor, resource, action) void
  +requireDecision(viewer, decision, role, delegated, action) void
}
class TaskService {
  <<service>>
  +get(actor, id) TaskView
}

SessionParticipant --> ParticipantRole
CollabSessionService ..> MergePolicy
CollabSessionService ..> LockRules
LockRules ..> RegionLock
CollabSessionService ..> CollabDocPort
CollabSessionService ..> ResourceAuthorizer : ACL da tarefa
CollabSessionService ..> SessionParticipant : papel válido na sessão
CollabSessionService ..> TaskService
CollabSessionService ..> DocComment
CollabSessionService ..> RecoverableDraft
CollabSessionService ..> DecisionTraceNode : nó ARTEFATO
DecisionTraceNode --> PieceRevision : refId imutável

note for LockRules "(real) lib/pieces/collab.ts e patch.ts, TTL 60 s"
note for SessionParticipant "(real) ws-domain/decia"
note for DecisionTraceNode "(real) ws-domain/rastro, grafo append-only"
note for CollabDocPort "(planejado) ws-infrastructure/collab-yjs"
```

Legenda: **(real)** `ParticipantRole`, `SessionParticipant`, `DecisionTraceNode` (records de `ws-domain`), `RegionLock` e `LockRules` (funções de `lib/pieces/collab.ts` e `lib/pieces/patch.ts`), `ResourceAuthorizer`, `TaskService`. **(planejado)** `MergePolicy`, `DocComment`, `RecoverableDraft`, `PieceRevision`, `CollabSessionService`, `CollabDocPort` (`COEDICAO_TECNICA.md` §9).

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph H["Usuários (editores, comentadores, observadores)"]
    A0(["Abre o documento pela sessão DECIA"])
    A1["Edita um bloco"]
    A2["Comenta ou sugere em um trecho"]
    A3["Resolve comentário ou sugestão"]
    A4["Aprova uma revisão e a vincula à decisão"]
  end
  subgraph W["Web/BFF (Next.js)"]
    W1["Presença sem expor dados não autorizados"]
    W2["Salvo só após confirmação do servidor"]
    W3["Mostra conflito com as duas versões e quem reservou"]
    W4["Oferece rascunho recuperável"]
  end
  subgraph S["ws-application"]
    S1{"ACL da tarefa permite?"}
    S2{"Participação ativa e papel válido na sessão?"}
    S3{"Papel é OBSERVADOR?"}
    S4{"Mesmo bloco de outro editor?"}
    S5{"Reserva vigente, conexão viva e acesso mantido?"}
    S6["Converge e persiste a atualização"]
    S7["Registra resolução com autor, data, trecho e estado"]
    S8["Cria nó ARTEFATO imutável para a revisão aprovada"]
  end
  subgraph P["Persistência"]
    P1[("Atualizações em Cassandra e snapshot em S3")]
    P2[("PieceRevision e DocComment, MySQL")]
    P3[("DecisionTraceNode, MySQL e Cassandra")]
  end
  A0 --> S1
  S1 -->|"não"| E404["404 NAO_ENCONTRADO"]
  S1 -->|"sim"| S2
  S2 -->|"não"| E404S["404 NAO_ENCONTRADO para a sessão"]
  S2 -->|"sim"| W1
  W1 --> A1 --> S3
  S3 -->|"sim"| E403["403 ACESSO_NEGADO"]
  S3 -->|"não"| S4
  S4 -->|"sim, RESERVA_POR_BLOCO"| E409["409 CONFLITO_RESERVA"] --> W3
  S4 -->|"não, ou MERGE_CRDT_COM_REVISAO"| S5
  S5 -->|"não"| E409X["409 RESERVA_EXPIRADA ou 404 após revogação"] --> W4
  S5 -->|"sim"| S6 --> P1 --> W2
  W1 --> A2 --> P2
  A2 --> A3 --> S7 --> P2
  W1 --> A4 --> S8 --> P3
  S8 -.->|"sem mudar o estado da peça"| W2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor A as Usuário A (editor)
  actor B as Usuário B (editor)
  actor O as Observador
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant R as Repository/MySQL
  participant K as Cassandra
  participant D as Redis
  participant E as DomainEvents (AFTER_COMMIT)

  A->>N: Abre o documento em /decia/{sessionId}
  N->>C: GET /api/decia/sessions/{sid}/pieces/{id}/collab
  C->>S: CollabSessionService.join
  S->>R: ResourceAuthorizer.require(EDIT na tarefa) e SessionParticipant ativo
  alt sem ACL da tarefa ou sem participação válida
    S-->>N: 404 NAO_ENCONTRADO
  else autorizado
    S->>D: presença e fan-out da sessão
    S-->>N: estado do documento e papel efetivo
  end
  A->>N: Edita bloco 3
  B->>N: Edita bloco 7
  N->>C: atualizações dos dois editores com baseVersion
  C->>S: applyUpdate de A e de B
  S->>K: grava atualizações em ordem, convergência por bloco
  S->>R: PieceRevision n+1
  S-->>N: ambos confirmados
  B->>N: Tenta editar bloco 3 reservado por A
  N->>C: POST lock do bloco 3
  C->>S: acquireLock
  alt bloco reservado por outro editor
    S-->>N: 409 CONFLITO_RESERVA com dono da reserva
  end
  A->>N: Grava depois que a reserva expirou
  N->>C: atualização com reserva antiga
  C->>S: canEditRegions e releitura do acesso
  alt reserva expirada, desconexão ou acesso revogado
    S->>R: RecoverableDraft do usuário
    S-->>N: 409 RESERVA_EXPIRADA ou 404 NAO_ENCONTRADO, rascunho recuperável
  end
  O->>N: Tenta aceitar sugestão
  N->>C: POST /api/pieces/{id}/suggestions/{sid}/accept
  C->>S: papel OBSERVADOR na sessão
  S-->>N: 403 ACESSO_NEGADO
  A->>N: Resolve comentário
  C->>S: resolveComment mantém autor, data e trecho
  S->>R: DocComment RESOLVIDO com resolvedBy e resolvedAt
  A->>N: Vincula revisão aprovada à decisão
  C->>S: linkAsEvidence(pieceId, revisionId, decisionId)
  S->>R: DecisionTraceNode ARTEFATO com refId da revisão e hash
  S->>E: EvidenceLinked, peça continua no estado atual
```

## 4. Máquina de estados

Entidades afetadas: a peça Letters (`WorkPiece.state`, planejado), a proposta de IA (aceite bloqueado para observadores) e o comentário ou sugestão (`DocComment.status`, planejado).

```mermaid
stateDiagram-v2
  state PecaLetters {
    [*] --> RASCUNHO
    RASCUNHO --> RASCUNHO: atualizações convergidas geram PieceRevision
    RASCUNHO --> EM_REVISAO: pessoa envia versão para revisão
    EM_REVISAO --> RASCUNHO: devolvida ou conteúdo alterado invalida aprovação
    EM_REVISAO --> PUBLICADA: publicação explícita por humano autorizado
    RASCUNHO --> ARQUIVADA: arquivar
    PUBLICADA --> ARQUIVADA: arquivar
    note right of EM_REVISAO
      Vincular a revisão aprovada à decisão não muda o estado.
      Publicar é sempre uma ação separada.
    end note
  }
  state PropostaIA {
    [*] --> PROPOSTA
    PROPOSTA --> ACEITA: aceite por EDITOR ou PROPRIETARIO
    PROPOSTA --> REJEITADA: rejeitada
    PROPOSTA --> INVALIDADA_POR_POLITICA: proprietário trocou a autonomia
    PROPOSTA --> OBSOLETA_POR_REVISAO: outro editor mudou o trecho
  }
  state ComentarioSugestao {
    [*] --> ABERTO: autor, data e trecho de origem gravados
    ABERTO --> RESOLVIDO: resolver
    ABERTO --> SUGESTAO_ACEITA: aceitar sugestão
    ABERTO --> SUGESTAO_REJEITADA: rejeitar sugestão
    RESOLVIDO --> ABERTO: reabrir
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Next.js app/ e components/"]
    DS["app/(shell)/decia e components/decia/* (real)"]
    LE["LettersEditor colaborativo com Yjs (planejado)"]
    UI["components/ui"]
    BFF["app/bff"]
  end
  subgraph LIB["lib/*"]
    COL["lib/pieces/collab.ts e patch.ts (real)"]
    AUT["lib/ai/autonomy.ts SessionRole (real)"]
  end
  subgraph WEB["ws-web"]
    WSK["CollabWebSocketHandler e PieceController (planejado)"]
  end
  subgraph APP["ws-application"]
    CSS["collab/CollabSessionService (planejado)"]
    TS["acervo/TaskService (real)"]
    RA["security/ResourceAuthorizer (real)"]
  end
  subgraph DOM["ws-domain"]
    AP["security/AccessPolicy (real)"]
    DEC["decia/SessionParticipant e rastro/DecisionTraceNode (real)"]
  end
  subgraph INF["ws-infrastructure"]
    YJS["collab-yjs CollabDocPort (planejado)"]
    CA["persistence-cassandra atualizações e rastro"]
    MY["persistence-mysql revisões e comentários"]
    RD["cache-redis presença e fan-out"]
    S3A["storage-s3 snapshots"]
  end
  DS --> LE --> UI
  LE --> COL
  LE --> AUT
  LE --> BFF --> WSK --> CSS
  CSS --> RA --> AP
  CSS --> TS
  CSS --> DEC
  CSS --> YJS --> CA
  YJS --> RD
  YJS --> S3A
  CSS --> MY
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividade) | Mensagem (sequência) | Transição | Componente |
|---|---|---|---|---|---|
| **RF56.CA01** | `CollabSessionService.applyUpdate`, `CollabDocPort`, `PieceRevision` | A1 → S4 (não) → S5 → S6 → P1 | 8–14 | `RASCUNHO → RASCUNHO` | `CSS`, `YJS`, `CA` |
| **RF56.CA02** | `MergePolicy`, `RegionLock`, `LockRules.acquireLock` | S4 → E409 → W3 | 15–18 | `PROPOSTA → OBSOLETA_POR_REVISAO` | `COL`, `CSS` |
| **RF56.CA03** | `LockRules.canEditRegions`, `RecoverableDraft` (reason), releitura da ACL | S5 → E409X → W4 | 19–23 | — | `CSS`, `MY` |
| **RF56.CA04** | `DocComment` (authorId, createdAt, anchorBlockId, excerpt, status, resolvedBy, resolvedAt) | A2 → A3 → S7 → P2 | 28–30 | `ABERTO → RESOLVIDO / SUGESTAO_ACEITA / SUGESTAO_REJEITADA` | `CSS`, `MY` |
| **RF56.CA05** | `ResourceAuthorizer` (ACL da tarefa) e `SessionParticipant` ativo com `ParticipantRole` | S1 → S2 | 1–7 | — | `RA`, `DEC`, `TS` |
| **RF56.CA06** | `ParticipantRole.OBSERVADOR`, `SessionRole.LEITOR` | S3 → E403 | 24–27 | aceite só por EDITOR ou PROPRIETARIO | `CSS`, `AUT` |
| **RF56.CA07** | `DecisionTraceNode` (nodeType ARTEFATO, refId da revisão, snapshotJson com hash), `PieceRevision.approvedBy` | A4 → S8 → P3 | 31–34 | nota em `EM_REVISAO`, nenhuma ida a `PUBLICADA` | `DEC`, `CSS` |

Regras transversais refletidas: autorização no servidor em toda conexão e gravação (dupla ACL tarefa e sessão, 404 uniforme D-141); SIGILOSO só dono e colaboradores explícitos, sem ADMIN implícito (D-139); revogação encerra atualizações futuras; conflitos preservam os dois trabalhos; nenhuma publicação automática.
