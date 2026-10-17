# RF66 — Editar desenhos simultaneamente no DECIA com reservas transacionais
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF66.CA01 … RF66.CA08 — corpo do card = especificação de docs/produto/requisitos-studio/RF66.md (CAs copiados como estão escritos); classes reais: `RegionLock`/`acquireLock`/`releaseLocks`/`canEditRegions`/`LOCK_TTL_MS` (`lib/pieces/collab.ts`), `authorizePatch`/`PatchOrigin`/`PatchDenial` (`lib/pieces/patch.ts`), `LayerStack` (`lib/pieces/layers.ts`), `PiecesService` em memória (`lib/pieces/service.ts`), `SessionRole`/`AiProposal`/`proposalValidity` (`lib/ai/autonomy.ts`), `ResourceAuthorizer` (ws-application) e `AccessPolicy` (ws-domain, D-139), `DecisionWorkspace`/`AiSuggestion` (`components/decia/*`), `AiGateway` (sem motor registrado); o restante (planejado)

O RF66 leva a edição de uma mesma peça do Drawings para várias pessoas ao mesmo tempo, dentro de uma sessão DECIA, com reservas transacionais por camada e região: patches em escopos disjuntos convivem e mantêm a ordem visual; reservas sobrepostas, ancestrais ou descendentes são recusadas sem revelar conteúdo; renovação, liberação e expiração usam relógio do servidor e token de fencing; patch antigo nunca sobrescreve revisão nova; revogação de acesso, SIGILOSO e papel de observador são revalidados no servidor em cada gravação. A IA participa só como proponente, sob as mesmas reservas.

**Estado em 17/10/2026:** a MATRIZ_RF registra RF66 como LÓGICA SEM INTERFACE (0.30): `lib/pieces/collab.ts` (lease de 60 s, conflito por interseção de regiões na mesma camada, renovação só pelo dono) e `lib/pieces/patch.ts` (porta única manual e IA que passou a checar seleção, camada e reserva em conjunto) são funções puras testadas, com `PiecesService` em memória; não há endpoints, tabela de reservas, token de fencing nem relógio de banco. A prova de `docs/auditoria/2026-10-15/colaboracao-2d` (duas contas, tarefa SIGILOSO com concessão explícita, conflito na região maior, dois patches preservados, reabertura na revisão 2) veio do checkout de desenvolvimento local e não usou sessão DECIA real. O PLANO_ONDAS (Onda 5, nota 5.7) pede integrar edição e IA às mesmas reservas, concorrência estrita, reconexão e sessão DECIA real. Colaboração 3D não é oferecida até cumprir as mesmas garantias no servidor.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF66.CA01** | Dados usuários autorizados em áreas/camadas disjuntas, quando enviam patches simultâneos, então preserva ambos e mantém ordem visual. |
| **RF66.CA02** | Dados escopos sobrepostos ou ancestrais/descendentes na mesma camada, quando o segundo tenta reservar, então rejeita com mensagem sem revelar conteúdo não autorizado. |
| **RF66.CA03** | Dada reserva, quando renova/libera/expira, então usa relógio do servidor e token de fencing; cliente antigo não escreve depois da expiração. |
| **RF66.CA04** | Dada revisão de objeto alterada, quando chega patch antigo, então rejeita sem sobrescrever e preserva rascunho para reconciliação. |
| **RF66.CA05** | Dada revogação de acesso durante edição, quando tenta gravar, então autorização é revalidada transacionalmente. |
| **RF66.CA06** | Dado desenho SIGILOSO, quando administrador sem concessão explícita tenta acessar, então nega; proprietário e colaboradores autorizados seguem a política definida. |
| **RF66.CA07** | Dada sessão DECIA, quando entra observador/não participante, então só recebe operações compatíveis com papel e acesso à tarefa; URLs diretas não contornam a regra. |
| **RF66.CA08** | Dada colaboração 3D, quando é oferecida, então implementa as mesmas garantias no servidor; demonstração 3D local não satisfaz esse aceite. |

## Contrato de servidor (planejado)

Endpoints propostos em `DRAWINGS_CAMADAS_COLABORACAO_DECIA.md`, ainda não publicados: `POST /api/decia/sessions/{sessionId}/drawings/{drawingId}/leases` (reservar), `PATCH …/leases/{leaseId}` (renovar com token vigente), `DELETE …/leases/{leaseId}` (liberar), `POST …/patches` (revisão esperada, token e chave idempotente) e `GET …/events` (presença, reservas e patches autorizados por SSE/WebSocket). A gravação bloqueia a peça (`SELECT … FOR UPDATE`), relê a ACL, confere reserva, token e revisão do objeto e só então grava; Redis transmite presença, mas não substitui o controle transacional. Mensagens de conflito dizem “região reservada por outra pessoa até hh:mm” sem mostrar o conteúdo nem o nome quando a pessoa não pode vê-lo. Presença usa cor com nome em texto.

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR
namespace lib_pieces_real {
  class RegionLock {
    <<entity>>
    +pieceId: string
    +layerId: string
    +regionIds: List~string~
    +ownerId: string
    +expiresAt: number
  }
  class CollabOps {
    <<service>>
    +acquireLock(locks, req, now, ttl) LockResult
    +releaseLocks(locks, pieceId, ownerId, now) List~RegionLock~
    +canEditRegions(locks, q, now) boolean
  }
  class AuthorizePatch {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
  class PatchOrigin {
    <<enum>>
    MANUAL
    IA
  }
}
namespace ws_real {
  class ResourceAuthorizer {
    <<service>>
    +require(viewer, resource, action) void
  }
  class AccessPolicy {
    <<service>>
    +visible(viewer, resource) boolean
    +decide(viewer, resource, action) AccessDecision
  }
}
namespace ws_domain_drawings_planejado {
  class DrawingLease {
    <<entity>>
    +id: UUID
    +pieceId: UUID
    +layerId: UUID
    +regionPath: String
    +ownerId: UUID
    +fencingToken: long
    +expiresAt: Instant
    +status: LeaseStatus
  }
  class DrawingPatch {
    <<entity>>
    +id: UUID
    +actorId: UUID
    +origin: PatchOrigin
    +objectId: UUID
    +expectedRevision: long
    +leaseId: UUID
    +fencingToken: long
    +idempotencyKey: String
  }
  class DrawingCollaborator {
    <<entity>>
    +pieceId: UUID
    +userId: UUID
    +grant: CollaboratorGrant
    +grantedBy: UUID
  }
  class DrawingSessionBinding {
    <<entity>>
    +sessionId: UUID
    +pieceId: UUID
    +taskId: UUID
  }
  class DrawingPatchService {
    <<service>>
    +apply(actor, patch) PatchResult
  }
  class DrawingLeaseService {
    <<service>>
    +acquire(actor, scope) DrawingLease
    +renew(leaseId, token) DrawingLease
    +release(leaseId, token) void
  }
  class CollabEventStream {
    <<adapter>>
    +subscribe(sessionId, viewer) Flux~Event~
  }
}
DrawingLeaseService ..> CollabOps : regra pura portada ao servidor
DrawingLeaseService --> DrawingLease
DrawingPatchService --> DrawingPatch
DrawingPatchService ..> AuthorizePatch
DrawingPatchService ..> ResourceAuthorizer : revalida na transação
ResourceAuthorizer ..> AccessPolicy
DrawingPatch --> PatchOrigin
DrawingSessionBinding --> DrawingCollaborator
CollabEventStream ..> ResourceAuthorizer : filtra por papel
note for AccessPolicy "real - ADMIN sem acesso implícito a SIGILOSO (D-139)"
note for DrawingLease "planejado - expiresAt pelo relógio do banco - fencingToken monotônico por peça"
note for DrawingSessionBinding "planejado - ParticipantRole ADMIN, MEMBRO, OBSERVADOR, IA - observador sem lease"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph PES["Pessoas (Ana e Bruno na sessão DECIA; observador)"]
    P0(["Ana reserva Frente/B2"]) --> P1(["Bruno pede Frente/B2, ancestral ou descendente"])
    P2(["Bruno reserva Fundo/B2 ou Frente/C3"])
    P3(["Ana e Bruno enviam patches ao mesmo tempo"])
    P4(["Cliente antigo tenta gravar após expirar"])
    P5(["Observador abre a peça por URL direta"])
    P6(["Admin sem concessão abre desenho SIGILOSO"])
  end
  subgraph BFF["Next.js / BFF (app/(shell)/decia/[sessionId] e drawings)"]
    B1["Envia patch com expectedRevision, leaseId, fencingToken e idempotencyKey"]
    B2["Guarda rascunho local e abre reconciliação"]
    B3["Fica somente leitura ao expirar e pede nova reserva"]
  end
  subgraph APP["ws-application"]
    S1{"ResourceAuthorizer: acesso à peça e papel na sessão?"}
    S2{"Conflito ancestral, descendente ou mesma região na camada?"}
    S3["Emite lease com fencingToken e expiresAt do relógio do banco"]
    S4{"Na transação: ACL ainda válida?"}
    S5{"Lease vigente e token igual?"}
    S6{"Revisão do objeto igual à esperada?"}
    S7{"authorizePatch MANUAL ou IA"}
    S8["Grava, incrementa revisão global e publica evento após commit"]
    S9["Colaboração 3D só com as mesmas garantias; senão não é oferecida"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Propõe alteração no escopo reservado; aplicar exige revisão humana e reserva vigente"]
  end
  subgraph DB["Persistência"]
    D1[("MySQL: drawing_leases, drawing_patches, revisões (planejado)")]
    D2[("Redis: presença e fan-out")]
    D3[("Cassandra: eventos da sessão (planejado)")]
  end
  E403["403 ACESSO_NEGADO (ou 404 sem revelar existência, D-141)"]
  E409R["409 REGIAO_RESERVADA (sem conteúdo alheio)"]
  E409L["409 RESERVA_EXPIRADA (fencing obsoleto)"]
  E409V["409 REVISAO_DESATUALIZADA (rascunho preservado)"]
  E422["422 VALIDACAO (FORA_DA_SELECAO, CAMADA_OCULTA)"]
  P0 --> S1
  P1 --> S1
  P2 --> S1
  S1 -->|não| E403
  S1 -->|sim| S2
  S2 -->|sim| E409R
  S2 -->|não| S3 --> D1
  P3 --> B1 --> S4
  P4 --> B1
  S4 -->|"revogado"| E403
  S4 -->|sim| S5
  S5 -->|não| E409L --> B3
  S5 -->|sim| S6
  S6 -->|não| E409V --> B2
  S6 -->|sim| S7
  S7 -->|"reserva de outra pessoa"| E409R
  S7 -->|"fora do escopo"| E422
  S7 -->|ok| S8 --> D1
  S8 --> D2
  S8 --> D3
  P5 --> S1
  P6 --> S1
  I1 --> B1
  S9 -.-> S1
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant A as Usuário (Ana)
  participant B as Usuário (Bruno)
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)
  A->>N: reserva Frente/B2
  N->>C: POST /api/decia/sessions/sid/drawings/did/leases
  C->>S: DrawingLeaseService.acquire(Ana, Frente, B2)
  S->>DB: SELECT FOR UPDATE da peça e reservas vivas (NOW do banco)
  S-->>N: lease L1 com fencingToken 41 e expiresAt
  B->>N: reserva Frente/B (ancestral de B2)
  N->>C: POST leases
  C->>S: DrawingLeaseService.acquire(Bruno, Frente, B)
  alt ancestral ou descendente reservado na mesma camada
    S-->>N: 409 REGIAO_RESERVADA (sem conteúdo nem detalhes alheios)
  end
  B->>N: reserva Fundo/B2
  C->>S: DrawingLeaseService.acquire(Bruno, Fundo, B2)
  S-->>N: lease L2 com fencingToken 42
  par Ana
    A->>N: patch em Frente/B2 (rev 7, L1, token 41)
  and Bruno
    B->>N: patch em Fundo/B2 (rev 3, L2, token 42)
  end
  N->>C: POST patches
  C->>S: DrawingPatchService.apply
  S->>DB: bloqueia peça, relê ACL, confere lease, token e revisão do objeto
  alt acesso revogado durante a edição
    S-->>N: 403 ACESSO_NEGADO
  else lease expirada ou token obsoleto
    S-->>N: 409 RESERVA_EXPIRADA (cliente fica somente leitura)
  else revisão do objeto já mudou
    S-->>N: 409 REVISAO_DESATUALIZADA (rascunho preservado para reconciliação)
  else alvo fora da seleção ou camada oculta
    S-->>N: 422 VALIDACAO
  end
  S->>DB: grava os dois patches e a revisão global
  S->>EV: DrawingPatched após commit
  EV->>R: fan-out filtrado por papel e acesso
  R-->>N: Ana e Bruno recebem ambos os patches na ordem das camadas
  B->>N: pede proposta da IA para Fundo/B2
  N->>C: POST ai/proposals (escopo L2, revisão 4)
  C->>S: AiGateway.infer
  alt sem motor registrado
    S-->>N: 503 IA_INDISPONIVEL
  else orçamento esgotado
    S-->>N: 429 ORCAMENTO_IA
  end
  S->>AI: complete(contexto PUBLICO ou INTERNO mascarado)
  AI-->>S: proposta no escopo L2
  S-->>N: proposta EM_REVISAO, aplicar exige L2 vigente e revisão humana
```

## 4. Máquina de estados

Entidades: reserva (`DrawingLease.status`, planejado sobre `RegionLock` real), patch recebido (`DrawingPatch`, planejado) e proposta de IA (`AiDrawingProposal.status`, planejado sobre `AiProposal` real).

```mermaid
stateDiagram-v2
  state "Reserva (DrawingLease)" as LEASE {
    [*] --> LIVRE
    LIVRE --> RESERVADA: acquire atômico sem conflito, fencingToken novo
    RESERVADA --> RESERVADA: renew com token vigente antes de expiresAt
    RESERVADA --> LIBERADA: release pelo dono com token vigente
    RESERVADA --> EXPIRADA: relógio do banco passa de expiresAt
    LIBERADA --> [*]
    EXPIRADA --> [*]
  }
  state "Patch (DrawingPatch)" as PATCH {
    [*] --> RECEBIDO
    RECEBIDO --> APLICADO: ACL, lease, token, revisão e authorizePatch ok
    RECEBIDO --> REJEITADO_ACESSO: ACL revogada ou papel incompatível
    RECEBIDO --> REJEITADO_RESERVA: lease expirada, token obsoleto ou região alheia
    RECEBIDO --> REJEITADO_REVISAO: revisão do objeto mudou, rascunho preservado
    APLICADO --> [*]
    REJEITADO_ACESSO --> [*]
    REJEITADO_RESERVA --> [*]
    REJEITADO_REVISAO --> [*]
  }
  state "Proposta de IA (AiDrawingProposal.status)" as PROP {
    [*] --> SOLICITADA
    SOLICITADA --> GERADA
    GERADA --> EM_REVISAO
    EM_REVISAO --> ACEITA: revisão humana com lease vigente
    EM_REVISAO --> REJEITADA
    EM_REVISAO --> INVALIDADA_POR_POLITICA: lease expirou, revisão ou política mudou
    ACEITA --> [*]
    REJEITADA --> [*]
    INVALIDADA_POR_POLITICA --> [*]
  }
```

Expirar a reserva não apaga desenho; reconectar exige nova reserva. Desfazer é patch inverso próprio, nunca restauração cega de revisão que apagaria trabalho alheio.

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    DEC["app/(shell)/decia/[sessionId] e components/decia (real)"]
    PG["app/(shell)/drawings/page.tsx (real, esqueleto)"]
    ED["CollabDrawingEditor, PresenceBar, LeaseBadge (planejado)"]
    LIB["lib/pieces/collab.ts, patch.ts, service.ts (real, em memória)"]
    DEC --> ED
    PG --> ED --> LIB
  end
  subgraph WEB["ws-web"]
    DC["DrawingLeaseController, DrawingPatchController, CollabEventsEndpoint (planejado)"]
  end
  subgraph APPL["ws-application"]
    LS["DrawingLeaseService, DrawingPatchService (planejado)"]
    RA["security/ResourceAuthorizer (real)"]
    GW["ai/AiGateway (real)"]
    EVT["DomainEvents AFTER_COMMIT"]
  end
  subgraph DOM["ws-domain"]
    AP["security/AccessPolicy (real, D-139)"]
    ENT["DrawingLease, DrawingPatch, DrawingCollaborator, DrawingSessionBinding (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql (bloqueio transacional)"]
    CA["persistence-cassandra (eventos)"]
    RD["cache-redis (presença e fan-out)"]
    AIP["ai-providers (sem motor)"]
  end
  EXT["Claude / Gemini (não registrados)"]
  ED --> DC --> LS --> RA --> AP
  LS --> ENT --> MY --> MYSQL[("MySQL 8")]
  LS --> EVT --> RD --> REDIS[("Redis")]
  EVT --> CA --> CASS[("Cassandra")]
  LS --> GW --> AIP -.-> EXT
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF66.CA01 | `DrawingPatchService.apply`, revisão por objeto e global, `CollabEventStream` | P3 → B1 → S4 → S5 → S6 → S7 → S8 | par patches simultâneos, grava os dois, fan-out | PATCH `RECEBIDO → APLICADO` | `LS`, `RD`, `MY` |
| RF66.CA02 | `DrawingLeaseService.acquire`, `CollabOps.acquireLock` (real), `RegionLock` (real) | P1 → S1 → S2 → E409R | alt 409 ancestral ou descendente | LEASE `LIVRE` mantido | `LS` |
| RF66.CA03 | `DrawingLease` (fencingToken, expiresAt do banco), `renew`/`release` | P4 → B1 → S5 → E409L → B3 | alt 409 RESERVA_EXPIRADA | LEASE `RESERVADA → EXPIRADA / LIBERADA` | `MY` |
| RF66.CA04 | `DrawingPatch.expectedRevision`, rascunho local | S6 → E409V → B2 | alt 409 REVISAO_DESATUALIZADA | PATCH `RECEBIDO → REJEITADO_REVISAO` | `ED`, `LS` |
| RF66.CA05 | `ResourceAuthorizer` (real) relido na transação | S4 → E403 | alt 403 acesso revogado | PATCH `RECEBIDO → REJEITADO_ACESSO` | `RA` |
| RF66.CA06 | `AccessPolicy` (real, D-139), `DrawingCollaborator` | P6 → S1 → E403 | alt 403 (ou 404, D-141) | — | `AP`, `RA` |
| RF66.CA07 | `DrawingSessionBinding`, `ParticipantRole` OBSERVADOR, `CollabEventStream` filtrado | P5 → S1 → E403 | fan-out filtrado por papel e acesso | — | `DEC`, `DC`, `RA` |
| RF66.CA08 | mesmas classes de servidor exigidas para 3D; demonstração local não conta | S9 → S1 | — | mesmas máquinas LEASE e PATCH | `LS`, `MY` |
