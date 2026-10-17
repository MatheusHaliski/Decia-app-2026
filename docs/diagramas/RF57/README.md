# RF57 — Selecionar objetos, pontos e regiões no Drawings
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF57.CA01 … RF57.CA09 — corpo do card = especificação de docs/produto/requisitos-studio/RF57.md (CAs copiados como estão escritos); classes reais: `DrawingScene`, `DrawingNode`, `DrawingLayer`, `Selection`, `selectAtPoint`, `selectInBounds`, `selectInPolygon`, `selectedNodeIds`, `editableNodeIds`, `snapPoint` (`lib/studio/selection.ts`), `DrawingEditScope`/`canEditDrawingTarget` (`lib/drawings/selection.ts`), `LayerStack` (`lib/pieces/layers.ts`), `RegionLock` (`lib/pieces/collab.ts`), `authorizePatch` (`lib/pieces/patch.ts`), `evaluateAiAction` (`lib/ai/autonomy.ts`); o restante (planejado)

O RF57 define como a pessoa escolhe o que vai editar no Drawings: clique, janela (arraste esquerda→direita, só objetos totalmente contidos), cruzamento (direita→esquerda, objetos que tocam ou cruzam a borda), laço livre e polígono WP/CP, seleção por atributo (`SELECIONAR_SEMELHANTES`, com tolerância e contagem), `SELECIONAR_TUDO` e seleção direta de âncoras, segmentos e alças Bézier. Seleção e permissão são eixos distintos: `selectedNodeIds` só devolve o que está visível e `editableNodeIds` ainda retira camadas e nós travados e regiões reservadas por outra pessoa; o servidor repete a decisão com a mesma regra de `authorizePatch` antes de gravar qualquer transformação (`MOVER`, `REDIMENSIONAR`, `GIRAR`). Todo gesto de arraste tem alternativa por teclado e campos numéricos (WCAG 2.5.7) e o resultado é anunciado ao leitor de tela. Os nomes de comando são inspiração semântica de Illustrator/AutoCAD (referência de 17/10/2026), nunca promessa de paridade.

Estado real (MATRIZ_RF de 17/10/2026: LÓGICA SEM INTERFACE, 0,30): existem só as bibliotecas puras e testadas citadas no cabeçalho; não há canvas, rota `/drawings/[pieceId]`, BFF nem backend de Drawings. Fontes: `docs/auditoria/2026-10-17/referencias/COMANDOS_REFERENCIA_ILLUSTRATOR_AUTOCAD.md` §4, `docs/produto/DRAWINGS_CAMADAS_COLABORACAO_DECIA.md`, `docs/produto/ARQUITETURA_PAINEIS_EDITOR_IA.md`, `docs/auditoria/2026-10-16/paineis-bezier/` (Bézier no código local da auditoria, ainda fora desta árvore), D-136 (autonomia) e D-139/D-141 (SIGILOSO sem ADMIN implícito; invisível = 404). 3D: seleção de faces, arestas e vértices de sólidos é capacidade futura declarada por operação (RF60/RF61).

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF57.CA01** | Dado arraste esquerda-direita, quando termina, então seleciona somente objetos totalmente contidos; direita-esquerda inclui objetos que cruzam ou tocam a borda. |
| **RF57.CA02** | Dado laço livre ou WP/CP, quando conclui, então aplica contenção/cruzamento conforme modo visível e desenha prévia azul/verde. |
| **RF57.CA03** | Dado QSELECT/FILTER ou seleção semelhante, quando filtra por camada, cor, espessura, opacidade, tipo, raio ou bloco, então usa tolerância explícita e mostra a contagem. |
| **RF57.CA04** | Dado V, quando transforma seleção múltipla, então move/escala/rotaciona o conjunto no escopo permitido e permite desfazer. |
| **RF57.CA05** | Dado A, quando seleciona âncora ou segmento, então edita somente os pontos/controladores escolhidos e preserva os demais. |
| **RF57.CA06** | Dado Ctrl+A, quando há camadas ocultas, bloqueadas ou regiões de outra pessoa, então não autoriza modificá-las; seleção e permissão são eixos distintos. |
| **RF57.CA07** | Dado perfil de atalhos CAD ou vetor, quando L/A têm significados diferentes, então resolve por perfil e não intercepta digitação em campos de texto. |
| **RF57.CA08** | Dados pontos de ancoragem e hastes Bézier, quando converte canto/suave com Shift+C, move âncora ou manipula alça com Alt/Option e Shift, então preserva vizinhos, permite alças independentes, recolher um controle e restringir a múltiplos de 45 graus; cada arraste é uma ação reversível e não causa salto de rolagem. |
| **RF57.CA09** | Dado guia de pontos e alças, quando utiliza teclado ou leitor de tela, então identifica âncora, entrada, saída e coordenadas, com controles equivalentes ao arraste e indicação clara dos tipos de curva suportados. |

## 1. Diagrama de classes

Classes do front marcadas **(real)** existem hoje em `lib/`; as demais são **(planejado)**. `DrawingScene`/`DrawingNode` ainda não constam de `docs/arquitetura/TAXONOMIA.md`: as entidades de servidor abaixo são proposta para a Onda 5.

```mermaid
classDiagram
direction LR
namespace lib_real {
  class DrawingScene {
    <<entity>>
    +nodes: List~DrawingNode~
    +layers: List~DrawingLayer~
    +lockedRegions: List~LockedRegion~
  }
  class Selection {
    <<entity>>
    +kind: none_object_objects_layer_region_bounds_polygon
    +mode: contained_ou_crossing
  }
  class SelectionEngine {
    <<service>>
    +selectInBounds(scene, bounds, mode) Selection
    +selectInPolygon(scene, points, mode) Selection
    +selectedNodeIds(scene, selection) Set~string~
    +editableNodeIds(scene, selection) Set~string~
    +snapPoint(point, gridSize, enabled) Point
  }
  class PatchAuthorizer {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
    +canEditDrawingTarget(scope, target) boolean
  }
  class RegionLock {
    <<entity>>
    +layerId: string
    +regionIds: List~string~
    +expiresAt: number
  }
  class AutonomyPolicy {
    <<service>>
    +evaluateAiAction(policy, action, ctx) Verdict
  }
}
namespace front_planejado {
  class SelectionController {
    <<controller>>
    +onLasso(points, mode) Selection
    +announce(count, editableCount) void
  }
  class SimilarSelectionFilter {
    <<service>>
    +tolerance: number
    +apply(scene, seed, criteria) Selection
  }
  class ShortcutProfile {
    <<entity>>
    +resolve(key, focusTarget) CommandId
  }
  class AnchorSelection {
    <<entity>>
    +anchorIndex: number
    +handle: ANCORA_ENTRADA_SAIDA
    +kind: CANTO_ou_SUAVE
  }
  class TransformCommand {
    <<entity>>
    +matrix: Affine2D
    +pivot: Point
    +baseRevision: number
    +inverse() TransformCommand
  }
}
namespace ws_planejado {
  class DrawingController {
    <<controller>>
    +postPatch(pieceId, PatchRequest) PatchResult
  }
  class DrawingCommandService {
    <<service>>
    +apply(actor, pieceId, command) DrawingRevision
    +undo(actor, pieceId, commandId) DrawingRevision
  }
  class DrawingLeaseService {
    <<service>>
    +acquire(actor, pieceId, layerId, regionIds) DrawingLease
  }
  class DrawingRepositoryPort {
    <<port>>
    +findVisible(pieceId, actor) Drawing
  }
  class MySqlDrawingRepository {
    <<adapter>>
  }
}
SelectionEngine ..> DrawingScene
SelectionEngine ..> Selection
SelectionController ..> SelectionEngine
SelectionController ..> ShortcutProfile
SelectionController ..> PatchAuthorizer
SimilarSelectionFilter ..> SelectionEngine
AnchorSelection ..> TransformCommand
PatchAuthorizer ..> RegionLock
DrawingController ..> DrawingCommandService
DrawingCommandService ..> DrawingLeaseService
DrawingCommandService ..> DrawingRepositoryPort
DrawingCommandService ..> AutonomyPolicy
DrawingCommandService ..> TransformCommand
MySqlDrawingRepository ..|> DrawingRepositoryPort
note for SelectionEngine "(real) lib/studio/selection.ts - selecao espacial so alcanca o visivel e a edicao passa por editableNodeIds"
note for PatchAuthorizer "(real) lib/pieces/patch.ts, lib/drawings/selection.ts e lib/pieces/collab.ts - um alvo fora recusa o patch inteiro"
note for AnchorSelection "(planejado nesta arvore) bezier-edit e BezierEditor existem so no codigo local da auditoria de 16/10"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph P["Pessoa (autora ou colaboradora autorizada)"]
    A1["Abre a peça em /drawings/[pieceId] (vinda de /tasks/[id] ou /decia/[sessionId])"]
    A2["Escolhe o modo: clique, janela/cruzamento, laço, polígono WP/CP, semelhantes, Ctrl+A ou seleção direta (A)"]
    A3["Alternativa sem arraste: lista de objetos navegável por Tab/setas, campos x/y/largura/altura do retângulo de seleção, modo Contido/Cruzamento em botão de alternância"]
    A4["Transforma: arraste com V ou campos numéricos dx, dy, escala, ângulo e pivô"]
    A5["Desfaz (Ctrl+Z) ou refaz"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["ShortcutProfile resolve L/A pelo perfil CAD ou vetor e ignora teclas com foco em campo de texto"]
    F2["Prévia azul = contido (esquerda→direita) · verde = cruzamento (direita→esquerda), com padrão de traço além da cor"]
    F3["selectInBounds / selectInPolygon / selectAtPoint (real)"]
    F4["selectedNodeIds (só visível) e editableNodeIds (sem travados nem reservados) (real)"]
    F5["aria-live anuncia: N selecionados, M editáveis, K bloqueados com motivo"]
    F6{"Há itens editáveis?"}
    F7["Gesto contínuo = rascunho local, um único commit no fim (sem salto de rolagem)"]
    F8["POST /api/drawings/[pieceId]/patches com baseRevision, leaseToken e chave idempotente (planejado)"]
    F9["Mostra motivo: camada oculta, travada, inativa ou região de outra pessoa"]
  end
  subgraph APP["ws-application"]
    S1{"Peça visível para o ator? SIGILOSO só dono e colaboradores explícitos"}
    S2{"Ator pode editar (papel EDITOR ou dono)?"}
    S3{"authorizePatch equivalente no servidor: camada, escopo, reserva"}
    S4{"Geometria resultante válida (finita, não degenerada)?"}
    S5{"baseRevision = revisão atual?"}
    S6["Grava DrawingRevision + comando inverso para desfazer"]
    E404["404 NAO_ENCONTRADO"]
    E403["403 ACESSO_NEGADO"]
    E409["409 REGIAO_RESERVADA"]
    E422["422 GEOMETRIA_INVALIDA"]
    E409R["409 REVISAO_DESATUALIZADA (recarrega snapshot, preserva rascunho)"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Pedido explícito: 'selecione os traços tracejados da camada Frente'"]
    I2{"evaluateAiAction: modo permite propor?"}
    I3["Devolve proposta de seleção (ids + critério), nunca aplica sozinha"]
  end
  subgraph DB["Persistência"]
    D1[("MySQL: drawings, drawing_revisions, drawing_leases")]
    D2[("Redis: presença e seleção dos colegas (não substitui a reserva transacional)")]
  end

  A1 --> F1 --> A2 --> F2 --> F3 --> F4 --> F5 --> F6
  A2 -.-> A3 --> F3
  F6 -->|"não"| F9
  F6 -->|"sim"| A4 --> F7 --> F8 --> S1
  S1 -->|"não"| E404
  S1 -->|"sim"| S2 -->|"não"| E403
  S2 -->|"sim"| S3 -->|"reserva de outra pessoa"| E409
  S3 -->|"ok"| S4 -->|"não"| E422
  S4 -->|"sim"| S5 -->|"não"| E409R
  S5 -->|"sim"| S6 --> D1 & D2
  A5 --> F8
  A2 -.->|"semelhantes por IA"| I1 --> I2 -->|"não"| F9
  I2 -->|"sim"| I3 --> F4
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant R as Repository/MySQL
  participant RD as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: arrasta da esquerda para a direita (ou informa x, y, largura e altura)
  N->>N: selectInBounds(scene, bounds, contained) e prévia azul
  N->>N: selectedNodeIds e editableNodeIds
  N-->>U: aria-live com 4 selecionados, 3 editáveis, 1 em região reservada
  U->>N: MOVER dx 20 dy 10 pelo painel numérico (ou arraste com V)
  N->>N: authorizePatch local antecipa o motivo e monta TransformCommand
  N->>C: POST /api/drawings/{pieceId}/patches com baseRevision e leaseToken
  C->>S: DrawingCommandService.apply(actor, pieceId, command)
  S->>R: findVisible(pieceId, actor)
  alt peça inexistente ou invisível (SIGILOSO sem vínculo)
    R-->>S: vazio
    S-->>C: 404 NAO_ENCONTRADO
    C-->>N: 404 e a interface mostra não existe ou sem acesso
  else ator só leitor ou comentador
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403 e a seleção continua, a edição fica desabilitada
  else alvo em região reservada por outra pessoa
    S->>R: lê drawing_leases vivas com relógio do banco
    S-->>C: 409 REGIAO_RESERVADA com dono e expiração da reserva
    C-->>N: 409 e o patch inteiro é recusado
  else geometria resultante inválida
    S-->>C: 422 GEOMETRIA_INVALIDA
    C-->>N: 422 com o alvo e o campo numérico em erro
  else caminho feliz
    S->>R: grava DrawingRevision e comando inverso na mesma transação
    S-->>C: 200 com nova revisão
    C-->>N: 200 e a cena é atualizada
    S->>EV: DrawingPatched
    EV->>RD: publica presença e seleção atualizadas aos colegas
  end
  U->>N: Ctrl+Z
  N->>C: POST /api/drawings/{pieceId}/patches com o comando inverso
  C->>S: DrawingCommandService.undo(actor, pieceId, commandId)
  S->>R: grava revisão inversa sem apagar trabalho de terceiros
  opt semelhantes pedidos à IA
    U->>N: pede seleção semelhante em linguagem natural
    N->>C: POST /api/drawings/{pieceId}/ai/select
    C->>S: evaluateAiAction(policy, PROPOR_ALTERACAO, ctx)
    S->>AI: critérios e ids visíveis da camada ativa
    AI-->>S: proposta de seleção identificada como IA
    S-->>N: proposta revisável, nada aplicado
  end
```

## 4. Máquina de estados

Três máquinas: a **seleção** no cliente (lógica real em `lib/studio/selection.ts`, estados planejados), a **reserva** de região (`RegionLock` real como função pura; `DrawingLease` planejado no servidor) e o **comando** de transformação (planejado).

```mermaid
stateDiagram-v2
  direction LR
  state Selecao {
    [*] --> VAZIA
    VAZIA --> PARCIAL : inicia arraste, laço, polígono ou campos numéricos
    PARCIAL --> NOS : conclui janela, cruzamento, laço, Ctrl+A ou semelhantes
    PARCIAL --> REGIAO : conclui seleção de região da camada
    PARCIAL --> VAZIA : Escape ou nada alcançado
    VAZIA --> NOS : clique ou seleção direta A de âncora
    NOS --> NOS : Shift adiciona ou remove item
    NOS --> VAZIA : Escape ou clique no vazio
    REGIAO --> VAZIA : Escape
  }
  state Reserva {
    [*] --> LIVRE
    LIVRE --> RESERVADA : acquire sem conflito de camada e região
    RESERVADA --> RESERVADA : renovação pelo dono com token vigente
    RESERVADA --> EXPIRADA : prazo vence ou desconexão
    RESERVADA --> LIBERADA : dono libera
    EXPIRADA --> LIVRE : nenhum desenho é apagado
    LIBERADA --> LIVRE
  }
  state Comando {
    [*] --> EM_EDICAO
    EM_EDICAO --> APLICADO : commit único do gesto ou dos campos
    EM_EDICAO --> [*] : Escape cancela sem alterar a peça
    APLICADO --> DESFEITO : Ctrl+Z gera patch inverso
    DESFEITO --> APLICADO : refazer
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, página-esqueleto)"]
    ED["app/(shell)/drawings/[pieceId] DrawingEditor (planejado)"]
    CMD["DrawingCommands e ShortcutProfile (planejado)"]
    NUM["NumericTransformPanel e lista navegável (planejado)"]
    SEL["lib/studio/selection.ts (real)"]
    SCOPE["lib/drawings/selection.ts (real)"]
    PATCH["lib/pieces/patch.ts, layers.ts, collab.ts (real)"]
    AUT["lib/ai/autonomy.ts (real)"]
    UI["components/ui (real)"]
    BFF["BFF /api/drawings (planejado)"]
  end
  subgraph WEB["ws-web"]
    DC["DrawingController (planejado)"]
  end
  subgraph APP["ws-application"]
    DCS["DrawingCommandService (planejado)"]
    DLS["DrawingLeaseService (planejado)"]
  end
  subgraph DOM["ws-domain"]
    DD["Drawing, DrawingRevision, DrawingLease, AccessClassification (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql (planejado para drawings)"]
    RE["cache-redis presença (planejado)"]
    AIP["ai-providers (real no gateway)"]
    PLT["platform AccessPolicy (real)"]
  end
  EXT["Claude/Gemini"]

  PG --> ED --> CMD & NUM & UI & PATCH & AUT
  CMD & NUM --> SEL --> SCOPE
  PATCH --> SCOPE
  ED --> BFF --> DC --> DCS --> DLS
  DCS & DLS --> DD & MY
  DCS --> RE & PLT
  DCS --> AIP --> EXT
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF57.CA01 | `SelectionEngine.selectInBounds` com `Selection.mode` contained/crossing, `selectedNodeIds` | `A2`, `F2`, `F3`, `F4`, `A3` (campos numéricos) | 1–4 | `VAZIA`→`PARCIAL`→`NOS` | `SEL`, `ED` | lógica real (`lib/studio/selection.ts`); direção do arraste e UI planejadas |
| RF57.CA02 | `SelectionEngine.selectInPolygon`, `SelectionController.onLasso` | `F2` (prévia azul/verde com padrão de traço), `F3` | 2–4 | `PARCIAL`→`NOS` | `SEL`, `ED` | lógica real; laço livre e prévia planejados |
| RF57.CA03 | `SimilarSelectionFilter` (tolerance, criteria) | `A2`, `F5` (contagem), `I1`–`I3` | 4, 29–34 (opt IA) | `PARCIAL`→`NOS` | `CMD`, `SEL`, `AIP` | planejado |
| RF57.CA04 | `TransformCommand.inverse`, `DrawingCommandService.apply/undo` | `A4`, `F7`, `F8`, `S3`–`S6`, `A5` | 5–9, 20–28 | `EM_EDICAO`→`APLICADO`→`DESFEITO` | `NUM`, `DC`, `DCS`, `MY` | planejado (`authorizePatch` real) |
| RF57.CA05 | `AnchorSelection`, `TransformCommand` | `A2` (seleção direta A), `F7` | 5–8 | `VAZIA`→`NOS` | `ED`, `NUM` | planejado nesta árvore |
| RF57.CA06 | `editableNodeIds`, `PatchAuthorizer.authorizePatch` (`CAMADA_OCULTA`, `CAMADA_TRAVADA`, `REGIAO_RESERVADA`), `RegionLock`, `DrawingLeaseService` | `F4`, `F6`, `F9`, `S1`–`S3`, `E404`, `E403`, `E409` | 3–4, 9–17 | `LIVRE`→`RESERVADA` | `SEL`, `PATCH`, `DLS`, `PLT` | lógica real; servidor planejado |
| RF57.CA07 | `ShortcutProfile.resolve` | `F1` | — (resolvido no cliente) | — | `CMD` | planejado |
| RF57.CA08 | `AnchorSelection.kind` canto/suave, `TransformCommand` com commit único | `F7` (rascunho local, sem salto de rolagem), `A5` | 5–8, 20–28 | `EM_EDICAO`→`APLICADO`, `APLICADO`→`DESFEITO` | `ED`, `NUM` | planejado nesta árvore (evidência local em paineis-bezier) |
| RF57.CA09 | `AnchorSelection`, `SelectionController.announce` | `A3`, `F5` | 4 | — | `NUM`, `UI` | planejado |

Erros nomeados: `404 NAO_ENCONTRADO` (D-141), `403 ACESSO_NEGADO`, `409 REGIAO_RESERVADA` (motivo de `PatchDenial`), `422 GEOMETRIA_INVALIDA`, `409 REVISAO_DESATUALIZADA`. Nenhum CA é marcado como concluído por este diagrama.
