# RF71 — Integrar peças Letters e Drawings à jornada de tarefas, projetos e DECIA
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Letters (`/letters`, `/letters/[pieceId]`) e Drawings (`/drawings`, `/drawings/[pieceId]`); peça aberta a partir de `/tasks/[id]`, `/projects/[id]` e da sessão DECIA `/decia/[sessionId]` · **Página-esqueleto:** registrada em 17/10/2026; editores ainda não implementados (Ondas 3–5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF71.CA01 … RF71.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF71.md (CAs copiados como estão escritos); classes reais: `TaskItem`, `TaskBrief` (V36 `task_briefs`), `TaskService`, `TaskController`, `ResourceAuthorizer`, `AccessPolicy`, `ScopedResource`, `SourceKind.DECIA`, `lib/tasks/client.ts`, `components/tasks/TaskForm.tsx`, `components/decia/*`, `lib/pieces/service.ts`, `lib/pieces/authorship.ts`, `lib/pieces/provenance.ts`, `lib/ai/autonomy.ts`; o restante (planejado)

Transforma produção e decisões em trabalho rastreável e compartilhável. Uma peça Letters ou Drawings nasce de uma tarefa ou projeto, ou é levada a eles, e pode chegar à sessão DECIA, sempre com o mesmo histórico. O vínculo persistente peça → tarefa → projeto → sessão (`PieceLink`) guarda origem, revisão e acesso em cada transição. Vincular nunca concede acesso: a classificação só restringe, e cada leitura reavalia a ACL do recurso de destino. Uma decisão DECIA vira tarefa proposta, que só é criada com confirmação humana. Publicar no perfil exige escolher a revisão e a audiência. Remix gera derivação com origem, licença, autores e mudanças.

**Estado em 17/10/2026:** a MATRIZ_RF classifica o RF71 como AUSENTE (0,00); a nota de referência do PLANO_ONDAS é 3,45 porque estúdios, tarefa, projeto e decisão não compartilham uma peça nem um histórico. A Onda 3 cria o vínculo persistente e mantém origem, revisão e acesso em cada transição. Já são reais: tarefas com briefing profissional (D-135: objetivo, área, entregáveis, critérios de conclusão e referências; `TaskService` como primeiro chamador do `ResourceAuthorizer`; invisível responde 404, D-141), SIGILOSO = PRIVADA no front (D-137) e sem ADMIN implícito (D-139), o enum `SourceKind` com `DECIA` e `REMIX`, o workspace DECIA com sugestão de IA só após pedido (`components/decia/*`, D-136) e a autoria por cadeia de eventos em `lib/pieces/authorship.ts`. Não há rota de peça, publicação nem remix. A conclusão segue a prova do RF72: CA → teste → evidência.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF71.CA01** | Dada tarefa/projeto, quando cria peça Letters/Drawings, então mantém vínculo, proprietário, visibilidade e revisão persistida. |
| **RF71.CA02** | Dada decisão DECIA, quando gera trabalho, então cria tarefa com objetivo, responsável proposto, critério de aceite e referência à evidência revisada. |
| **RF71.CA03** | Dado perfil profissional, quando publica peça, então exige escolha explícita da revisão e audiência; salvar, seguir, curtir ou compartilhar não concede acesso. |
| **RF71.CA04** | Dado remix, quando autorizado, então cria derivação com origem, licença, autores e mudanças; não infere porcentagens de autoria como prova. |
| **RF71.CA05** | Dado comentário, curtida ou compartilhamento, quando a visibilidade muda, então revalida acesso aos derivados e evita vazamento por prévias e contagens. |
| **RF71.CA06** | Dado chefe/departamento, quando acompanha entregas, então vê apenas dados autorizados e distingue rascunho, revisado, aprovado e publicado. |
| **RF71.CA07** | Dado usuário de qualquer área profissional, quando percorre o fluxo, então recebe exemplos e instruções claros sem exigir terminologia técnica não explicada. |

## Regras do vínculo

| Transição | Origem registrada | Revisão registrada | Acesso |
|---|---|---|---|
| tarefa → peça (criar na tarefa) | `PieceLink` TAREFA, `createdBy`, `ContributionEvent` MANUAL | `PieceRevision` r1 persistida | peça herda classificação da tarefa ou mais restrita; EDIT na tarefa exigido |
| peça → projeto (levar ao projeto) | `PieceLink` PROJETO | revisão escolhida, fixada | membros do projeto não ganham leitura da peça; veem só o que a ACL da peça permite |
| peça → sessão DECIA (anexar como evidência) | `PieceLink` SESSAO | revisão revisada fixada | participante sem VIEW vê "item sem acesso", sem título nem prévia |
| decisão → tarefa | `SourceKind.DECIA` + referência à decisão e à evidência | revisão da evidência citada | tarefa nasce RASCUNHO do responsável proposto só após confirmação |
| peça → perfil (publicar) | `PiecePublication` com autor e data | revisão escolhida explicitamente | audiência escolhida; nunca automática |
| peça → remix | `PieceDerivation` (origem, licença, autores, mudanças) | revisão de origem fixada | só se a licença e a ACL permitirem; derivado não amplia acesso à fonte |

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. A tarefa com briefing e a verificação de acesso já são reais; a peça, o vínculo, a publicação e o remix são planejados.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  dono["«ator» Dono do recurso"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  decisor["«ator» Responsável pela decisão"]:::ator
  autenticado["«ator» Pessoa autenticada"]:::ator
  chefe["«ator» Chefe de departamento"]:::ator
  subgraph SIS["Work Station — RF71 Peças na jornada"]
    direction TB
    UC1(["UC1 Vincular peça à tarefa, ao projeto ou à sessão DECIA"]):::ucPlan
    UC2(["UC2 Verificar acesso à tarefa ou ao projeto"]):::uc
    UC3(["UC3 Gerar trabalho a partir da decisão DECIA"]):::ucPlan
    UC4(["UC4 Criar tarefa com briefing"]):::uc
    UC5(["UC5 Publicar peça no perfil"]):::ucPlan
    UC6(["UC6 Remixar peça de outra pessoa"]):::ucPlan
    UC7(["UC7 Alterar a visibilidade da peça"]):::ucPlan
    UC8(["UC8 Revalidar acesso a derivados, prévias e contagens"]):::ucPlan
    UC9(["UC9 Acompanhar entregas do departamento"]):::ucPlan
    UC10(["UC10 Consultar exemplos e instruções por área"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  dono --- UC1
  colaborador --- UC1
  decisor --- UC3
  dono --- UC5
  autenticado --- UC6
  dono --- UC7
  chefe --- UC9
  autenticado --- UC10
  UC1 -. "«include»" .-> UC2
  UC3 -. "«include»" .-> UC4
  UC7 -. "«include»" .-> UC8
  UC10 -. "«extend»" .-> UC1
  UC3 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Vincular peça à tarefa, ao projeto ou à sessão DECIA | `dono`, `colaborador` | RF71.CA01 | planejado |
| UC2 Verificar acesso à tarefa ou ao projeto | — (incluído por UC1) | RF71.CA01, RF71.CA06 | real (`ResourceAuthorizer` no `TaskService`; invisível responde 404, D-141) |
| UC3 Gerar trabalho a partir da decisão DECIA | `decisor`, `ia` | RF71.CA02 | planejado (IA só redige sob pedido, RF51) |
| UC4 Criar tarefa com briefing | — (incluído por UC3) | RF71.CA02 | real (`TaskController`, `components/tasks/TaskForm.tsx`, D-135) |
| UC5 Publicar peça no perfil | `dono` | RF71.CA03 | planejado |
| UC6 Remixar peça de outra pessoa | `autenticado` | RF71.CA04 | planejado |
| UC7 Alterar a visibilidade da peça | `dono` | RF71.CA05 | planejado |
| UC8 Revalidar acesso a derivados, prévias e contagens | — (incluído por UC7) | RF71.CA05 | planejado |
| UC9 Acompanhar entregas do departamento | `chefe` | RF71.CA06 | planejado |
| UC10 Consultar exemplos e instruções por área | `autenticado` | RF71.CA07 | planejado |

## 1. Diagrama de classes

Legenda: **(real)** = código no repositório em 17/10/2026; demais classes **(planejado)**. `WorkPiece`, `PieceRevision` e `PieceLink` seguem `LETTERS_DRAWINGS_ENGENHARIA.md` §3; `TaskItem`, `ProjectScheme`, `DeciaSession`, `FinalDecision` e `Remix` usam os nomes e atributos da TAXONOMIA.

```mermaid
classDiagram
direction LR
namespace pecas_planejado {
  class WorkPiece {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +kind: LETTERS ou DRAWINGS
    +accessClass: AccessClassification
    +visibility: Visibility
    +version: long
  }
  class PieceRevision {
    <<entity>>
    +id: UUID
    +pieceId: UUID
    +authorId: UUID
    +origin: RevisionOrigin
    +reviewState: RevisionState
    +sha256: String
  }
  class PieceLink {
    <<entity>>
    +id: UUID
    +pieceId: UUID
    +targetKind: TAREFA PROJETO SESSAO
    +targetId: UUID
    +revisionId: UUID
    +createdBy: UUID
    +createdAt: Instant
    +grantsAccess: false
  }
  class PiecePublication {
    <<entity>>
    +revisionId: UUID
    +audience: Visibility
    +publishedBy: UUID
    +withdrawnAt: Instant
  }
  class PieceDerivation {
    <<entity>>
    +sourcePieceId: UUID
    +sourceRevisionId: UUID
    +license: String
    +authorsJson: JSON
    +changeSummary: String
  }
}
namespace dominio {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +responsibleId: UUID
    +sourceKind: SourceKind
    +sourceRef: String
    +accessClass: AccessClassification
    +visibility: Visibility
    +state: TaskState
  }
  class TaskBrief {
    <<entity>>
    +taskId: UUID
    +objective: String
    +area: WorkArea
    +acceptanceCriteriaJson: JSON
    +referencesJson: JSON
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +objective: String
  }
  class DeciaSession {
    <<entity>>
    +id: UUID
    +topic: String
  }
  class FinalDecision {
    <<entity>>
    +resultingTaskId: UUID
  }
  class Remix {
    <<entity>>
    +sourceType: String
    +sourceId: UUID
    +resultId: UUID
  }
}
class TaskService {
  <<service>>
  +create(actor, input, ctx) TaskView
  +get(actor, id) TaskView
}
class PieceLinkService {
  <<service>>
  +createInTask(actor, taskId, kind) WorkPiece
  +linkTo(actor, pieceId, target, revisionId) PieceLink
}
class WorkFromDecisionService {
  <<service>>
  +proposeTask(actor, decisionId) TaskProposal
  +confirm(actor, proposal) TaskView
}
class PublicationService {
  <<service>>
  +publish(actor, revisionId, audience) PiecePublication
  +remix(actor, sourceRevisionId) PieceDerivation
  +onVisibilityChanged(pieceId) void
}
class ResourceAuthorizer {
  <<service>>
  +require(viewer, resource, action) void
}
class AccessPolicy {
  <<service>>
  +effectiveVisibility(visibility, classification) Visibility
}
WorkPiece "1" --> "*" PieceRevision
WorkPiece "1" --> "*" PieceLink : vínculos persistentes
PieceLink --> TaskItem : TAREFA
PieceLink --> ProjectScheme : PROJETO
PieceLink --> DeciaSession : SESSAO
PieceLink --> PieceRevision : revisão fixada
TaskItem "1" --> "1" TaskBrief : briefing V36
FinalDecision --> TaskItem : tarefa resultante
PiecePublication --> PieceRevision : revisão escolhida
PieceDerivation --> PieceRevision : origem
PieceDerivation ..> Remix : registro social
PieceLinkService ..> TaskService : EDIT na tarefa
WorkFromDecisionService ..> TaskService : create com confirmação
PieceLinkService ..> ResourceAuthorizer
PublicationService ..> ResourceAuthorizer
ResourceAuthorizer ..> AccessPolicy
note for TaskService "(real) ResourceAuthorizer VIEW e EDIT, invisível = 404, 409 EDICAO_CONCORRENTE"
note for TaskBrief "(real) V36 task_briefs, critérios e referências validados no serviço"
note for PieceLink "grantsAccess sempre falso, a ACL do destino é reavaliada a cada leitura"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator: dono, colaborador, chefe ou visitante"]
    A0(["Em /tasks/[id] escolhe Nova peça Letters ou Drawings"])
    A1(["Na sessão DECIA escolhe Gerar trabalho a partir da decisão"])
    A2["Revisa objetivo, responsável proposto, critério e evidência e confirma"]
    A3(["Publica no perfil"])
    A4["Escolhe revisão e audiência"]
    A5(["Remixa peça de outra pessoa"])
    A6(["Chefe abre entregas do departamento"])
  end
  subgraph FE["Next.js / BFF"]
    F1["TaskForm e lib/tasks/client.ts (real)"]
    F2["DecisionWorkspace e AiSuggestion (real)"]
    F3["Assistente com exemplos por área e glossário curto (planejado)"]
    F4["Painel de entregas: Rascunho · Revisado · Aprovado · Publicado (planejado)"]
  end
  subgraph APP["ws-application"]
    P1{"ResourceAuthorizer (real): EDIT na tarefa ou projeto?"}
    P2["PieceLinkService: WorkPiece com classificação igual ou mais restrita, PieceLink, r1"]
    P3["WorkFromDecisionService: TaskProposal com SourceKind DECIA"]
    P4["TaskService.create (real) após confirmação"]
    P5{"Revisão e audiência escolhidas explicitamente?"}
    P6{"Licença e ACL permitem remix?"}
    P7["PieceDerivation com origem, licença, autores e mudanças"]
    P8["onVisibilityChanged: revalida derivados, prévias, contagens e links"]
    P9["Filtro por viewer: só itens com VIEW, estado de revisão visível"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Pode redigir a proposta de tarefa só sob pedido (RF51), sem aplicar"]
  end
  subgraph PER["Persistência"]
    D1[("MySQL: tasks, task_briefs (real) · work_pieces, piece_links, piece_publications (planejado)")]
    D2[("Outbox e auditoria: ContributionEvent em cada transição")]
  end
  A0 --> F1 --> P1
  P1 -->|invisível| E1["404 NAO_ENCONTRADO"]
  P1 -->|sem EDIT| E2["403 ACESSO_NEGADO"]
  P1 -->|autorizado| P2 --> D1
  P2 --> D2
  A1 --> F2 --> P3 --> A2 --> P4 --> D1
  I1 -.-> P3
  A3 --> A4 --> P5
  P5 -->|não| E3["Nada publicado: sem publicação automática"]
  P5 -->|sim, revisão mudou| E4["409 REVISAO_DESATUALIZADA"]
  P5 -->|sim| D1
  A5 --> P6
  P6 -->|não| E1
  P6 -->|sim| P7 --> D2
  P8 --> D1
  A6 --> P9 --> F4
  F3 -.-> F1
  F3 -.-> F2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant EV as DomainEvents (AFTER_COMMIT)
  U->>FE: em /tasks/[id] clica Nova peça Drawings
  FE->>C: POST /api/tasks/{taskId}/pieces (kind DRAWINGS)
  C->>S: PieceLinkService.createInTask(actor, taskId, kind)
  S->>DB: carrega TaskItem e monta ScopedResource TASK
  S->>S: ResourceAuthorizer.require(EDIT)
  alt 404 NAO_ENCONTRADO
    S-->>FE: 404 igual para inexistente e invisível (D-141)
  else 403 ACESSO_NEGADO
    S-->>FE: 403 leitor sem EDIT na tarefa
  else autorizado
    S->>DB: WorkPiece (classificação da tarefa ou mais restrita), PieceRevision r1, PieceLink TAREFA
    S->>EV: PieceCreated com ContributionEvent MANUAL
    S-->>FE: 201 abre /drawings/[pieceId]
  end
  U->>FE: na sessão DECIA pede Gerar trabalho
  FE->>C: POST /api/decisions/{id}/work-proposals
  C->>S: WorkFromDecisionService.proposeTask
  opt usuário pediu redação pela IA
    S->>AI: rascunho de objetivo e critério (classe até INTERNO)
    AI-->>S: texto proposto, nada aplicado
  end
  S-->>FE: proposta com objetivo, responsável proposto, critério e evidência revisada
  U->>FE: revisa e confirma
  FE->>C: POST /api/tasks (sourceKind DECIA, referência à evidência)
  C->>S: TaskService.create
  S->>DB: tasks e task_briefs
  S-->>FE: 201 tarefa RASCUNHO do responsável proposto
  U->>FE: publica a peça no perfil escolhendo r7 e audiência DEPARTAMENTO
  FE->>C: POST /api/pieces/{id}/publications (revisionId, audience, expectedVersion)
  C->>S: PublicationService.publish
  alt 409 REVISAO_DESATUALIZADA
    S-->>FE: 409 a revisão escolhida não é mais a revisada
  else publicada
    S->>DB: PiecePublication e RevisionState PUBLICADA
    S->>EV: PiecePublished, reavalia derivados e contagens
    S-->>FE: 201
  end
```

## 4. Máquina de estados

Entidade central: `PieceRevision.reviewState` (planejado), lida pelo painel de entregas do CA06. Estende os estados do RF69 com revisão e aprovação humanas. Cada transição grava autor, data, `ContributionEvent` e `PieceLink` afetado; nenhuma é automática a partir de IA, curtida, seguir ou compartilhar.

```mermaid
stateDiagram-v2
  [*] --> RASCUNHO_LOCAL: peça criada na tarefa, projeto ou sessão
  RASCUNHO_LOCAL --> SALVA: SALVAR com ACK (RF69)
  RASCUNHO_LOCAL --> RECUPERADA: recuperação após falha (RF69)
  RECUPERADA --> SALVA: usuário confirma
  SALVA --> REVISADA: revisor marca a revisão como revisada
  REVISADA --> APROVADA: aprovador registrado aprova
  REVISADA --> SALVA: revisão devolvida com comentários
  APROVADA --> PUBLICADA: publicação explícita de revisão e audiência
  SALVA --> PUBLICADA: dono publica revisão própria explicitamente
  PUBLICADA --> ARQUIVADA: despublicar ou arquivar
  SALVA --> ARQUIVADA: arquivar
  ARQUIVADA --> [*]
  note right of PUBLICADA
    Mudar a visibilidade revalida derivados,
    prévias e contagens (CA05).
  end note
  note left of SALVA
    Painel do chefe: rascunho = RASCUNHO_LOCAL ou SALVA,
    revisado, aprovado e publicado, só com VIEW.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    R1["app/(shell)/tasks/[id] · projects/[id] · decia/[sessionId] (real) · letters e drawings: página-esqueleto (real)"]
    R2["components/tasks/TaskForm · lib/tasks/client.ts (real)"]
    R3["components/decia: DecisionWorkspace, AiSuggestion (real)"]
    R4["PiecePanel na tarefa · DeliveriesBoard · PublishDialog (planejado)"]
    R5["lib/pieces: authorship, provenance, service · lib/ai/autonomy.ts (real)"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
    R1 --> R3 --> BFF
    R1 --> R4 --> BFF
    R4 --> R5
  end
  subgraph WEB["ws-web"]
    TC["acervo/TaskController (real)"]
    PLC["PieceLinkController · PublicationController (planejado)"]
  end
  subgraph APPL["ws-application"]
    TS["acervo/TaskService (real)"]
    PLS["pieces/PieceLinkService · WorkFromDecisionService · PublicationService (planejado)"]
    RA["security/ResourceAuthorizer (real)"]
    AG["ai/AiGateway (real, sem chamador de produção)"]
  end
  subgraph DOM["ws-domain"]
    TE["TaskItem · TaskBrief · SourceKind · AccessPolicy · ScopedResource (real)"]
    PE["WorkPiece · PieceRevision · PieceLink · PiecePublication · PieceDerivation (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: tasks, task_briefs V36 (real) · piece_links (planejado)"]
    S3A["storage-s3: conteúdo das revisões"]
    AIP["ai-providers: AiProvidersConfig vazio"]
    PLT["platform: outbox e auditoria"]
  end
  BFF --> TC --> TS
  BFF --> PLC --> PLS
  PLS --> TS
  PLS --> RA
  TS --> RA --> TE
  PLS --> PE
  PLS --> PLT
  PLS --> AG -.-> AIP -.-> EXT[("Claude / Gemini")]
  TS --> MY --> MYSQL[("MySQL 8")]
  PLS --> S3A --> S3[("S3 / MinIO")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente | Prova exigida (RF72) |
|---|---|---|---|---|---|---|
| **RF71.CA01** | `PieceLinkService.createInTask`, `WorkPiece`, `PieceLink` TAREFA, `PieceRevision` r1, `TaskService` (real) | A0 → F1 → P1 → P2 | `POST /api/tasks/{taskId}/pieces` com 404, 403 e 201 | `[*] → RASCUNHO_LOCAL → SALVA` | `PLC`, `PLS`, `TS`, `MY` | teste de serviço e E2E: criar na tarefa, sair, entrar e reabrir com vínculo, dono, visibilidade e revisão iguais |
| **RF71.CA02** | `WorkFromDecisionService`, `TaskBrief` (objetivo, critérios, referências, real), `TaskItem.responsibleId`, `SourceKind.DECIA` | A1 → F2 → P3 → A2 → P4 | `work-proposals`, `POST /api/tasks` | — (tarefa nasce RASCUNHO) | `R3`, `PLS`, `TS` | teste: sem confirmação nada é criado; tarefa traz objetivo, responsável proposto, critério e referência à revisão da evidência |
| **RF71.CA03** | `PublicationService.publish`, `PiecePublication` (revisão e audiência) | A3 → A4 → P5 → E3 | `POST /api/pieces/{id}/publications` com 409 e 201 | `APROVADA → PUBLICADA`, `SALVA → PUBLICADA` | `PLC`, `R4` | teste: salvar, seguir, curtir e compartilhar não mudam ACL; publicar sem escolher revisão é recusado |
| **RF71.CA04** | `PieceDerivation` (origem, licença, autores, mudanças), `Remix`, `lib/pieces/authorship.ts` (`aiShare` é medida do log, mostrada em faixa, nunca prova) | A5 → P6 → P7 | — (`POST /api/pieces/{id}/remixes`) | — | `PLS`, `R5` | teste: remix sem licença é recusado; derivado lista autores e mudanças sem percentual de autoria inferido |
| **RF71.CA05** | `PublicationService.onVisibilityChanged`, `AccessPolicy.effectiveVisibility` (real) | P8 | `PiecePublished` e reavaliação | nota de PUBLICADA | `PLS`, `RA` | teste com duas contas: após restringir, prévia, contagem e link do derivado não revelam a fonte |
| **RF71.CA06** | filtro por viewer, `ResourceAuthorizer` (real), `reviewState` | A6 → P9 → F4 | — (`GET /api/departments/{id}/deliveries`) | `SALVA → REVISADA → APROVADA → PUBLICADA` | `R4`, `RA` | teste: chefe sem colaboração explícita não vê SIGILOSO (D-137, D-139); rótulos dos quatro estados visíveis |
| **RF71.CA07** | assistente com exemplos por área (`WorkArea` real) | F3 | — | — | `R4`, `R2` | teste com tarefas de software, administração, design, pesquisa, marketing e planejamento (roteiro da jornada de 17/10) e revisão de linguagem sem jargão |
