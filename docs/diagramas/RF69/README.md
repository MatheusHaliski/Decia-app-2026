# RF69 — Salvar, exportar, recuperar e navegar no histórico das peças
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Letters (`/letters`, `/letters/[pieceId]`) e Drawings (`/drawings`, `/drawings/[pieceId]`); peça aberta a partir de `/tasks/[id]`, `/projects/[id]` e da sessão DECIA `/decia/[sessionId]` · **Página-esqueleto:** registrada em 17/10/2026; editores ainda não implementados (Ondas 3–5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF69.CA01 … RF69.CA08 — corpo do card = especificação de docs/produto/requisitos-studio/RF69.md (CAs copiados como estão escritos); classes reais: `TaskItem.version` e o 409 `EDICAO_CONCORRENTE` do `TaskService`/`TaskController` (padrão de concorrência a reutilizar), `ResourceAuthorizer`, `AccessPolicy`, `MediaAccessPolicy`, `MediaObject`, `MediaUploadService` (escrito, ainda não é bean — D-67), `lib/pieces/service.ts` (`WorkPiece`/`PiecesService` em memória), `lib/pieces/authorship.ts`, `lib/pieces/provenance.ts`, `lib/pieces/patch.ts`; o restante (planejado)

Protege o trabalho de Letters e Drawings contra falhas e alterações indesejadas. `SALVAR` grava uma `PieceRevision` imutável no servidor e a interface só mostra "Salvo" depois do ACK. `SALVAR_COMO` cria uma cópia com origem ou exporta um formato identificado. Checkpoints periódicos ficam em local declarado, com política de acesso e retenção. `DESFAZER`, `REFAZER`, `RESTAURAR_APAGADO`, `CAMADAS_ANTERIOR`, `REVERTER_AO_SALVO` e a recuperação de rascunho nunca apagam a trilha, nunca duplicam IDs e nunca concedem acesso. Toda transição registra autoria (`ContributionEvent`) e proveniência.

**Estado em 17/10/2026:** a MATRIZ_RF classifica o RF69 como AUSENTE (0,00): o app não tem rota de editor, autosave, exportação nem recuperação. O protótipo local de 16/10, fora do app, exportava JSON e PNG, mas perdia a peça ao recarregar e tinha histórico 2D/3D fragmentado (PLANO_ONDAS, Onda 3, nota de referência 5,25). A meta da Onda 3 é persistir documento e revisões com autosave recuperável, backup e importação/exportação auditáveis. Já existem no repositório o modelo de concorrência por versão das tarefas (`TaskService`, 409 `EDICAO_CONCORRENTE`, D-135), a autorização por recurso (`ResourceAuthorizer` + `AccessPolicy`, em que SIGILOSO não admite ADMIN implícito, D-139) e as bibliotecas puras de peça em `lib/pieces/` (autoria encadeada por hash, manifesto de proveniência sem assinatura, `authorizePatch`). A conclusão do RF segue a prova do RF72: CA → teste → evidência.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF69.CA01** | Dados QSAVE/Ctrl+S e SAVEAS/Save a Copy, quando executa, então salva versão persistida ou exporta formato identificado, sem simular escrita em servidor. |
| **RF69.CA02** | Dado SAVETIME/autosalvamento, quando configurado, então registra checkpoints no intervalo, identifica onde estão armazenados e aplica política de acesso e retenção. |
| **RF69.CA03** | Dado UNDO/REDO ou painel histórico, quando retorna a um estado, então preserva versões e reaplica autorizações/reservas atuais. |
| **RF69.CA04** | Dado OOPS, quando restaura última exclusão, então não desfaz edições posteriores nem duplica IDs ou recria conteúdo fora de permissão. |
| **RF69.CA05** | Dado LAYERP, quando restaura visibilidade/configuração anterior, então não altera geometria nem concede acesso. |
| **RF69.CA06** | Dado Revert/F12, quando volta à última versão salva, então mostra o que será descartado e mantém ponto recuperável. |
| **RF69.CA07** | Dado RECOVER/RECOVERALL/DRAWINGRECOVERY, quando arquivo/checkpoint falha, então valida integridade, oferece versões recuperáveis e não promete reparar DWG sem suporte real. |
| **RF69.CA08** | Dada exportação para telas, quando otimiza, então mantém original editável e informa resolução, perfil e perdas. |

## Comandos e matriz de exportação

Os comandos de referência vêm de `docs/auditoria/2026-10-17/referencias/COMANDOS_REFERENCIA_ILLUSTRATOR_AUTOCAD.md` §3. Servem de inspiração semântica, não de promessa de paridade: a interface usa os nomes próprios do Work Station e descreve o que cada comando faz de fato.

| Referência | Comando do Work Station | O que faz de fato (planejado) | CA |
|---|---|---|---|
| QSAVE / Ctrl+S | `SALVAR` | `POST /api/pieces/{id}/revisions` com `expectedVersion` e `commandId` idempotente; "Salvo rN" só com ACK (versão + hash) | CA01 |
| SAVEAS / Save a Copy | `SALVAR_COMO` | nova `WorkPiece` com `PieceLink` de origem ou exportação de formato da matriz | CA01, CA08 |
| SAVETIME / AUTOSAVE | checkpoint periódico | intervalo configurável; mostra onde está (navegador desta conta ou servidor) e a retenção | CA02 |
| UNDO / REDO / History panel | `DESFAZER`, `REFAZER`, painel de histórico | navega entradas unitárias; reaplicar passa de novo por `authorizePatch` (camada, seleção, reserva) | CA03 |
| OOPS | `RESTAURAR_APAGADO` | recria só os objetos da última exclusão, com os IDs originais, se continuam livres e permitidos | CA04 |
| LAYERP | `CAMADAS_ANTERIOR` | restaura visibilidade, trava e ordem das camadas; não toca geometria nem ACL | CA05 |
| Revert (F12) | `REVERTER_AO_SALVO` | lista o que será descartado e grava checkpoint do estado atual antes de voltar | CA06 |
| RECOVER / RECOVERALL / DRAWINGRECOVERY | recuperação de rascunho | valida hash e `schemaVersion`; oferece versões íntegras; DWG sem motor validado não é "reparado" | CA07 |
| Export for Screens | exportação para telas | artefato separado com resolução, perfil de cor e perdas declaradas; original editável preservado | CA08 |

Matriz de escrita usada pelo `SALVAR_COMO`. Formato pendente não aparece como opção operacional na interface. A matriz completa de leitura/escrita/fidelidade é do RF70.

| Formato | Escrita no app hoje | Escrita planejada | Fidelidade a declarar antes do aceite |
|---|---|---|---|
| `ws-studio` / `ws-asset` (JSON nativo) | não há (só no protótipo fora do app) | Onda 3 | IDs, camadas, metadados e `schemaVersion` preservados |
| PNG (telas) | não há | Onda 3 | resolução, escala, perfil sRGB, fundo transparente ou não, vetores rasterizados |
| SVG | não há | pendente (RF70) | efeitos e hachuras achatados |
| PDF / DOCX (Letters) | não há | pendente (RF70) | paginação e estilos aproximados |
| GLB | não há | pendente (RF70) | unidades, normais e materiais compatíveis |
| DWG | não há | sem motor/SDK validado: não oferecido | — |

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Todos são planejados: não há rota de editor, autosave, exportação nem recuperação; os nomes dos comandos são do Work Station, sem promessa de paridade com Illustrator ou AutoCAD.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  dono["«ator» Dono do recurso"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  subgraph SIS["Work Station — RF69 Salvar e recuperar peças"]
    direction TB
    UC1(["UC1 Salvar revisão (SALVAR)"]):::ucPlan
    UC2(["UC2 Salvar cópia ou exportar formato (SALVAR_COMO)"]):::ucPlan
    UC3(["UC3 Configurar checkpoint periódico"]):::ucPlan
    UC4(["UC4 Desfazer, refazer ou navegar no histórico"]):::ucPlan
    UC5(["UC5 Restaurar a última exclusão (RESTAURAR_APAGADO)"]):::ucPlan
    UC6(["UC6 Restaurar camadas anteriores (CAMADAS_ANTERIOR)"]):::ucPlan
    UC7(["UC7 Reverter ao salvo (REVERTER_AO_SALVO)"]):::ucPlan
    UC8(["UC8 Recuperar rascunho ou checkpoint"]):::ucPlan
    UC9(["UC9 Exportar para telas"]):::ucPlan
    UC10(["UC10 Reaplicar autorização e reservas atuais"]):::ucPlan
  end
  agendador["«ator» Agendador de trabalhos"]:::atorSis
  dono --- UC1
  colaborador --- UC1
  dono --- UC2
  colaborador --- UC2
  dono --- UC3
  colaborador --- UC3
  dono --- UC4
  colaborador --- UC4
  dono --- UC5
  colaborador --- UC5
  dono --- UC6
  colaborador --- UC6
  dono --- UC7
  colaborador --- UC7
  dono --- UC8
  colaborador --- UC8
  dono --- UC9
  colaborador --- UC9
  UC4 -. "«include»" .-> UC10
  UC5 -. "«include»" .-> UC10
  UC9 -. "«extend»" .-> UC2
  UC3 --- agendador
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Salvar revisão (SALVAR) | `dono`, `colaborador` | RF69.CA01 | planejado |
| UC2 Salvar cópia ou exportar formato (SALVAR_COMO) | `dono`, `colaborador` | RF69.CA01, RF69.CA08 | planejado |
| UC3 Configurar checkpoint periódico | `dono`, `colaborador`, `agendador` | RF69.CA02 | planejado |
| UC4 Desfazer, refazer ou navegar no histórico | `dono`, `colaborador` | RF69.CA03 | planejado |
| UC5 Restaurar a última exclusão (RESTAURAR_APAGADO) | `dono`, `colaborador` | RF69.CA04 | planejado |
| UC6 Restaurar camadas anteriores (CAMADAS_ANTERIOR) | `dono`, `colaborador` | RF69.CA05 | planejado |
| UC7 Reverter ao salvo (REVERTER_AO_SALVO) | `dono`, `colaborador` | RF69.CA06 | planejado |
| UC8 Recuperar rascunho ou checkpoint | `dono`, `colaborador` | RF69.CA07 | planejado |
| UC9 Exportar para telas | `dono`, `colaborador` | RF69.CA08 | planejado |
| UC10 Reaplicar autorização e reservas atuais | — (incluído por UC4, UC5) | RF69.CA03, RF69.CA04 | planejado (regra pura `authorizePatch`) |

## 1. Diagrama de classes

Legenda: **(real)** = código no repositório em 17/10/2026; demais classes **(planejado)**. `WorkPiece`, `PieceRevision` e `PieceLink` seguem `docs/produto/LETTERS_DRAWINGS_ENGENHARIA.md` §3 e ainda não estão na TAXONOMIA; `TaskItem`, `MediaObject`, `DeciaSession` e `ProjectScheme` usam os nomes e atributos da TAXONOMIA.

```mermaid
classDiagram
direction LR
namespace pecas_planejado {
  class WorkPiece {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +kind: PieceKind
    +accessClass: AccessClassification
    +visibility: Visibility
    +schemaVersion: int
    +version: long
    +savedRevisionId: UUID
  }
  class PieceRevision {
    <<entity>>
    +id: UUID
    +pieceId: UUID
    +baseVersion: long
    +contentMediaId: UUID
    +sha256: String
    +authorId: UUID
    +origin: MANUAL IA_ACEITA IMPORTACAO RECUPERACAO
    +state: RevisionState
  }
  class PieceCheckpoint {
    <<entity>>
    +baseRevisionId: UUID
    +location: NAVEGADOR_DESTA_CONTA ou SERVIDOR
    +sha256: String
    +schemaVersion: int
    +expiresAt: Instant
  }
  class PieceLink {
    <<entity>>
    +pieceId: UUID
    +targetKind: TAREFA PROJETO SESSAO
    +targetId: UUID
    +revisionId: UUID
    +grantsAccess: false
  }
  class PieceExport {
    <<entity>>
    +revisionId: UUID
    +format: String
    +resolution: String
    +colorProfile: String
    +lossReportJson: JSON
  }
  class RevisionState {
    <<enum>>
    RASCUNHO_LOCAL
    SALVA
    PUBLICADA
    ARQUIVADA
    RECUPERADA
  }
}
namespace dominio_real {
  class TaskItem {
    <<entity>>
    +id: UUID
    +accessClass: AccessClassification
    +version: long
  }
  class MediaObject {
    <<entity>>
    +objectKey: String
    +sha256: String
    +accessClass: MediaAccessClass
  }
  class AccessPolicy {
    <<service>>
    +decide(viewer, resource, action) AccessDecision
  }
}
class PieceController {
  <<controller>>
}
class PieceRevisionService {
  <<service>>
  +save(actor, pieceId, input) RevisionView
  +saveAs(actor, pieceId, target) RevisionView
  +revertToSaved(actor, pieceId) RevisionView
  +listRecoverable(actor, pieceId) List
}
class PieceExportService {
  <<service>>
  +export(actor, revisionId, format, options) PieceExport
}
class ResourceAuthorizer {
  <<service>>
  +require(viewer, resource, action) void
  +requireMedia(viewer, media, parentVisible, action) void
}
class PiecesService_ts {
  <<service>>
  +authorizePatch(id, req) PatchVerdict
  +recordEvent(id, e) ContributionEvent
}
WorkPiece "1" --> "*" PieceRevision : revisões imutáveis
WorkPiece "1" --> "*" PieceCheckpoint : autosave
WorkPiece "1" --> "*" PieceLink : vínculos
PieceLink --> TaskItem : alvo TAREFA
PieceRevision --> MediaObject : conteúdo cifrado
PieceRevision --> RevisionState
PieceExport --> PieceRevision : origem
PieceController --> PieceRevisionService
PieceController --> PieceExportService
PieceRevisionService ..> ResourceAuthorizer : VIEW e EDIT
PieceExportService ..> ResourceAuthorizer : VIEW
ResourceAuthorizer ..> AccessPolicy
PiecesService_ts ..> PieceController : BFF planejado
note for TaskItem "(real) versão otimista e 409 EDICAO_CONCORRENTE no TaskService"
note for PiecesService_ts "(real) lib/pieces/service.ts em memória, sem persistência"
note for MediaObject "(real) S3 ou MinIO, classe PUBLIC PRIVATE RESTRICTED via MediaAccessPolicy"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator: dono ou colaborador explícito da peça"]
    A0(["Edita em /letters/[pieceId] ou /drawings/[pieceId]"])
    A1{"Comando?"}
    A2["Confere a lista do que será descartado e confirma"]
    A3["Escolhe uma versão recuperável"]
    A4["Escolhe formato, resolução e perfil"]
  end
  subgraph FE["Next.js / BFF (planejado)"]
    F1["Checkpoint no intervalo SAVETIME: navegador desta conta, cifrado, com local e retenção visíveis"]
    F2["Histórico unitário: DESFAZER, REFAZER, RESTAURAR_APAGADO, CAMADAS_ANTERIOR"]
    F3{"authorizePatch (real) aceita o estado reaplicado?"}
    F4["Indicador: Não salvo · Salvando · Salvo rN só com ACK"]
    F5["Diálogo REVERTER_AO_SALVO com diferenças"]
    F6["Detecta falha ou checkpoint órfão na reabertura"]
  end
  subgraph WEB["ws-web (planejado)"]
    W1["PieceController: JWT, CorrelationIdFilter, GlobalExceptionHandler"]
  end
  subgraph APP["ws-application"]
    P1{"ResourceAuthorizer (real): invisível ou sem EDIT?"}
    P2{"expectedVersion = versão atual?"}
    P3["PieceRevisionService.save: PieceRevision imutável, ContributionEvent, outbox"]
    P4["revertToSaved: checkpoint do estado atual antes de voltar"]
    P5["listRecoverable: hash, schemaVersion e conta conferidos"]
    P6{"Formato habilitado na matriz?"}
    P7["PieceExportService: job limitado, relatório de perdas, original preservado"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Não é chamada por salvar, histórico, recuperar ou exportar"]
    I2["Nível 4 do RF51 exige checkpoint antes da execução"]
  end
  subgraph PER["Persistência"]
    D1[("MySQL: work_pieces, piece_revisions, piece_checkpoints (planejado)")]
    D2[("S3: conteúdo cifrado e exportações com expiração")]
  end
  A0 --> F1
  A0 --> A1
  A1 -->|SALVAR ou SALVAR_COMO| F4 --> W1 --> P1
  A1 -->|DESFAZER, REFAZER, OOPS, LAYERP| F2 --> F3
  F3 -->|sim| F1
  F3 -->|não| E3["Entrada bloqueada: reserva, camada travada ou fora da seleção"]
  A1 -->|REVERTER_AO_SALVO| F5 --> A2 --> P4
  A1 -->|exportar para telas| A4 --> W1
  F6 --> A3 --> P5
  P1 -->|invisível| E1["404 NAO_ENCONTRADO"]
  P1 -->|sem EDIT| E2["403 ACESSO_NEGADO"]
  P1 -->|autorizado| P2
  P2 -->|não| E4["409 REVISAO_DESATUALIZADA: rascunho preservado, comparar ou salvar cópia"]
  P2 -->|sim| P3 --> D1
  P3 --> D2
  P4 --> P3
  P5 -->|íntegro| P3
  P5 -->|corrompido| E5["Versão não oferecida; DWG sem motor real não é reparado"]
  W1 --> P6
  P6 -->|não| E6["422 FORMATO_NAO_SUPORTADO"]
  P6 -->|acima do limite| E7["413 ARQUIVO_GRANDE"]
  P6 -->|sim| P7 --> D2
  I2 -.-> P3
  I1 -.-> P1
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)
  U->>FE: Ctrl+S (SALVAR) em /drawings/[pieceId]
  FE->>C: POST /api/pieces/{id}/revisions (expectedVersion, commandId, sha256)
  C->>S: PieceRevisionService.save(actor, pieceId, input)
  S->>DB: carrega WorkPiece e monta ScopedResource
  S->>S: ResourceAuthorizer.require(EDIT), SIGILOSO só dono e colaborador explícito
  alt 404 NAO_ENCONTRADO
    S-->>FE: 404 igual para inexistente e invisível
    FE-->>U: não existe ou sem acesso, rascunho local mantido
  else 403 ACESSO_NEGADO
    S-->>FE: 403 leitor sem EDIT
    FE-->>U: oferece SALVAR_COMO em peça própria, se a classificação permitir
  else 409 REVISAO_DESATUALIZADA
    S-->>FE: 409 com a versão atual do servidor
    FE-->>U: rascunho preservado, comparar, mesclar ou salvar cópia
  else versão confere
    S->>S3: grava conteúdo cifrado (classe de armazenamento pela classificação)
    S->>DB: insere PieceRevision rN+1 (hash, baseVersion, autor, origem MANUAL) e outbox
    S->>EV: PieceRevisionSaved com ContributionEvent encadeado
    S-->>FE: 201 (revisionId, version, sha256)
    FE-->>U: Salvo rN+1 somente após o ACK
  end
  U->>FE: exportar para telas (PNG 2x, sRGB)
  FE->>C: POST /api/pieces/{id}/exports (revisionId, formato, resolução, perfil)
  C->>S: PieceExportService.export
  alt 422 FORMATO_NAO_SUPORTADO
    S-->>FE: formato fora da matriz habilitada
  else 413 ARQUIVO_GRANDE
    S-->>FE: cena acima do limite de exportação
  else aceito
    S->>S3: artefato separado com expiração, original editável intocado
    S-->>FE: 202 com relatório de resolução, perfil e perdas
  end
  U->>FE: reabre a peça depois de uma falha
  FE->>C: GET /api/pieces/{id}/checkpoints
  C->>S: PieceRevisionService.listRecoverable
  S->>DB: checkpoints e revisões com hash e schemaVersion
  S-->>FE: versões íntegras, corrompidas marcadas como não recuperáveis
  FE-->>U: escolher versão, sem promessa de reparar DWG
```

## 4. Máquina de estados

Entidade central: `PieceRevision.state` (`RevisionState`, planejado). Cada transição grava `ContributionEvent` (cadeia SHA-256 de `lib/pieces/authorship.ts`, real) e auditoria; restaurar ou recuperar cria nova revisão, nunca reescreve a anterior.

```mermaid
stateDiagram-v2
  [*] --> RASCUNHO_LOCAL: edição ou checkpoint SAVETIME
  RASCUNHO_LOCAL --> RASCUNHO_LOCAL: DESFAZER, REFAZER, RESTAURAR_APAGADO, CAMADAS_ANTERIOR
  RASCUNHO_LOCAL --> SALVA: SALVAR com ACK do servidor
  RASCUNHO_LOCAL --> SALVA: REVERTER_AO_SALVO após checkpoint do descartado
  RASCUNHO_LOCAL --> RECUPERADA: falha detectada e checkpoint íntegro
  RECUPERADA --> SALVA: usuário confirma a versão recuperada
  RECUPERADA --> RASCUNHO_LOCAL: usuário descarta e segue editando
  SALVA --> RASCUNHO_LOCAL: nova edição sobre a revisão salva
  SALVA --> PUBLICADA: publicação explícita de revisão e audiência (RF71)
  SALVA --> ARQUIVADA: arquivar
  PUBLICADA --> ARQUIVADA: despublicar e arquivar
  ARQUIVADA --> SALVA: restaurar cria nova revisão
  ARQUIVADA --> [*]
  note right of SALVA
    409 REVISAO_DESATUALIZADA mantém o rascunho.
    Nenhuma publicação automática.
  end note
  note left of RECUPERADA
    Hash e schemaVersion conferidos.
    Checkpoint de outra conta nunca aparece.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    R1["app/(shell)/letters e drawings: página-esqueleto (real) · [pieceId] (planejado)"]
    R2["SaveIndicator · HistoryPanel · RevertDialog · RecoveryDialog · ExportDialog (planejado)"]
    R3["lib/pieces: service.ts, authorship.ts, provenance.ts, patch.ts (real, em memória)"]
    R4["Rascunho local por conta, cifrado (planejado)"]
    BFF["app/bff"]
    R1 --> R2 --> R3
    R2 --> R4
    R2 --> BFF
  end
  subgraph WEB["ws-web"]
    PC["PieceController (planejado)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (real)"]
  end
  subgraph APPL["ws-application"]
    PRS["pieces/PieceRevisionService (planejado)"]
    PES["pieces/PieceExportService (planejado)"]
    RA["security/ResourceAuthorizer (real)"]
    MUS["media/MediaUploadService (real, ainda não é bean)"]
    AG["ai/AiGateway (real, sem chamador de produção)"]
    PORTS["ports: PieceRepositoryPort (planejado) · MediaStoragePort (real)"]
  end
  subgraph DOM["ws-domain"]
    ENT["WorkPiece · PieceRevision · PieceCheckpoint · PieceLink · PieceExport (planejado)"]
    POL["AccessPolicy · MediaAccessPolicy · TaskItem · MediaObject (real)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: tabelas de peças em migration futura"]
    S3A["storage-s3: S3StorageConfig · LocalMediaStorage"]
    AIP["ai-providers: AiProvidersConfig vazio"]
    PLT["platform: outbox e auditoria"]
  end
  BFF --> PC --> SEC
  PC --> PRS
  PC --> PES
  PRS --> RA --> POL
  PES --> RA
  PRS --> PORTS
  PES --> PORTS
  PES --> MUS
  PRS --> ENT
  PRS --> PLT
  PORTS --> MY --> MYSQL[("MySQL 8")]
  PORTS --> S3A --> S3[("S3 / MinIO")]
  AG -.-> AIP -.-> EXT[("Claude / Gemini: não usados pelo RF69")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente | Prova exigida (RF72) |
|---|---|---|---|---|---|---|
| **RF69.CA01** | `PieceRevisionService.save/saveAs`, `PieceRevision`, `PieceExport`, `commandId` idempotente | A1 → F4 → W1 → P1 → P2 → P3 | `POST /api/pieces/{id}/revisions` até "Salvo rN+1" | `RASCUNHO_LOCAL → SALVA` | `PC`, `PRS`, `MY`, `S3A` | teste de serviço (salvar, reabrir após reinício, ACK) e E2E de recarregar a página sem perder a peça |
| **RF69.CA02** | `PieceCheckpoint` (`location`, `expiresAt`), `CheckpointLocation` | A0 → F1 | `GET /api/pieces/{id}/checkpoints` | `[*] → RASCUNHO_LOCAL` | `R4`, `PRS` | teste do intervalo com relógio controlado; tela mostra local e retenção; outra conta no mesmo navegador não vê o checkpoint |
| **RF69.CA03** | histórico unitário, `authorizePatch` (real, `lib/pieces/patch.ts`), `RegionLock` | A1 → F2 → F3 | — (local) | `RASCUNHO_LOCAL → RASCUNHO_LOCAL` | `R2`, `R3` | teste: refazer contra camada travada ou região reservada é bloqueado; versões salvas intactas |
| **RF69.CA04** | `RESTAURAR_APAGADO`, IDs preservados, `authorizePatch` | A1 → F2 → F3 → E3 | — (local) | `RASCUNHO_LOCAL → RASCUNHO_LOCAL` | `R2`, `R3` | teste: excluir, editar outro objeto, restaurar; edição posterior permanece, sem ID duplicado |
| **RF69.CA05** | `CAMADAS_ANTERIOR` sobre `LayerStack` (`lib/pieces/layers.ts`, real) | A1 → F2 | — (local) | `RASCUNHO_LOCAL → RASCUNHO_LOCAL` | `R2`, `R3` | teste: hash da geometria igual antes e depois; ACL da peça inalterada |
| **RF69.CA06** | `PieceRevisionService.revertToSaved`, `PieceCheckpoint` | A1 → F5 → A2 → P4 → P3 | — (`POST /api/pieces/{id}/restore`) | `RASCUNHO_LOCAL → SALVA` (após checkpoint) | `R2`, `PRS` | teste: diálogo lista diferenças; o estado descartado continua recuperável |
| **RF69.CA07** | `PieceRevisionService.listRecoverable` (verifica integridade), `sha256`, `schemaVersion` | F6 → A3 → P5 → E5 | `GET /api/pieces/{id}/checkpoints` e versões íntegras | `RASCUNHO_LOCAL → RECUPERADA → SALVA` | `PRS`, `R4` | teste com checkpoint truncado e hash divergente; mensagem sem promessa de reparo DWG |
| **RF69.CA08** | `PieceExportService.export`, `PieceExport.lossReportJson`, `MediaUploadService` (real) | A4 → W1 → P6 → P7 | `POST /api/pieces/{id}/exports` com 422, 413 e 202 | — (revisão inalterada) | `PES`, `S3A`, `MUS` | teste: PNG exportado é PNG verdadeiro (assinatura, dimensões, perfil); original editável reabre igual |
