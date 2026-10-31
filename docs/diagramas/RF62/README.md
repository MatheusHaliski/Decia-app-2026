# RF62 — Controlar vistas, câmera, perspectiva e coordenadas no Drawings
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF62.CA01 … RF62.CA08 — corpo do card = especificação de docs/produto/requisitos-studio/RF62.md (CAs copiados como estão escritos); classes reais: `RenderMode`/`toWireframe` (`lib/pieces/wireframe.ts`), `DrawingClassification.projection` (`lib/pieces/classification.ts`), `DRAWING_TAXONOMY.perspective` (`lib/drawings/taxonomy.ts`), `DrawingEditScope` modo `VIEW` (`lib/drawings/selection.ts`), `snapPoint` e `selectedNodeIds` (`lib/studio/selection.ts`), `authorizePatch` (`lib/pieces/patch.ts`); o restante (planejado)

O RF62 garante que alternar a representação nunca altera a geometria: `VISTA` orienta a câmera em planta (superior do sistema de coordenadas de trabalho, com o UCS identificado), ponto de vista por vetor (vetor nulo rejeitado), vistas nomeadas (planta, frontal, lateral, isométricas SW/SE/NE/NW) salvas com câmera e projeção, órbita que não move objetos e tem saída explícita, guias visuais (cubo de navegação, ícone do UCS) que não mexem em permissões, `ESTILO_VISUAL` que só habilita modos implementados (hoje a base é wireframe × preenchido), `ORIGEM`/UCS orientado por face ou eixos com conversão consistente para o espaço global, e `GRADE`/grade de perspectiva de 1, 2 ou 3 pontos, isométrica ou cavaleira, cuja ocultação não remove alinhamentos. Câmera pessoal é estado de visualização (não gera patch); salvar uma vista na peça é edição do documento e passa pela reserva de escopo. Toda navegação tem alternativa por teclado e campos numéricos (WCAG 2.5.7) e a vista ativa é anunciada ao leitor de tela. 3D: órbita, estilos sombreado/realista e UCS por face são capacidade futura declarada por operação; nomes PLAN, VPOINT, VIEW e 3DORBIT são inspiração semântica de AutoCAD, sem paridade.

Estado real (MATRIZ_RF de 17/10/2026: AUSENTE, 0,00): não há câmera nem vistas nesta árvore. Existem o `RenderMode` FILLED/WIREFRAME (base do estilo visual), os vocabulários de projeção e perspectiva usados só para **classificar** desenhos (não controlam câmera), o modo `VIEW` do escopo de edição (nada editável ao visualizar composição) e o `snapPoint` de grade. A evidência local de 15/10 (`comandos-do-zero`: VS wireframe, PLAN, VPOINT; NAVVCUBE só como botões; sem UCS orientável nem grade de perspectiva) está fora do repositório. Fontes: `COMANDOS_REFERENCIA_ILLUSTRATOR_AUTOCAD.md` §2, `DRAWINGS_ESTUDO_TECNICO_ACADEMICO.md` (zoom muda a vista, nunca a dimensão da peça), `DRAWINGS_CAMADAS_COLABORACAO_DECIA.md` (câmera global exige reserva de escopo).

**Atualização 31/10/2026 (parcial):** o modelo 3D do `/drawings` tem câmera em perspectiva com órbita, zoom e pan (com amortecimento e sem atravessar o piso), enquadramento do todo ou do selecionado (F) e coordenadas numéricas no inspetor. Ainda faltam vistas ortográficas nomeadas (topo, frente, lateral), cubo de navegação, UCS orientável e reserva de escopo para a câmera global.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF62.CA01** | Dado PLAN, quando executa, então orienta vista superior do sistema de coordenadas de trabalho, identificando o UCS utilizado. |
| **RF62.CA02** | Dado VPOINT, quando informa vetor válido, então orienta a câmera e rejeita vetor nulo. |
| **RF62.CA03** | Dado VIEW, quando salva/restaura planta, frontal, lateral ou isométricas SW/SE/NE/NW, então mantém câmera e projeção associadas. |
| **RF62.CA04** | Dado 3DORBIT/Shift+botão do meio, quando arrasta, então orbita sem mover objetos e permite sair do modo. |
| **RF62.CA05** | Dado NAVVCUBE/UCSICON, quando alterna, então controla guias visuais e não altera permissões nem geometrias. |
| **RF62.CA06** | Dado VISUALSTYLES/VS, quando escolhe wireframe, sombreado, raios X, conceitual ou realista, então só habilita modos implementados e identifica limitações de materiais/PBR. |
| **RF62.CA07** | Dado UCS, quando orienta plano de trabalho por face/eixos, então novas geometrias usam esse plano, com conversão consistente para o espaço global. |
| **RF62.CA08** | Dada grade de perspectiva 1/2/3 pontos ou plano isométrico/cavaleiro, quando desenha, então aplica transformação correta; ocultar grade não remove alinhamentos existentes. |

## 0. Diagrama de casos de uso

Quem tem acesso à peça muda a própria câmera, a vista e o estilo visual sem gerar patch; salvar vista na peça, orientar o plano de trabalho e desenhar sobre a grade são edições do colaborador explícito (e do dono) e passam pela verificação de escopo e reserva. Não há câmera nem vistas no app.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  autenticado["«ator» Pessoa autenticada"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  dono["«ator» Dono da peça"]:::ator
  subgraph SIS["Work Station — RF62 Vistas e coordenadas"]
    direction TB
    UC1(["UC1 Ver em planta do sistema de trabalho"]):::ucPlan
    UC2(["UC2 Definir ponto de vista por vetor"]):::ucPlan
    UC3(["UC3 Salvar e restaurar vistas nomeadas"]):::ucPlan
    UC4(["UC4 Orbitar a cena"]):::ucPlan
    UC5(["UC5 Alternar cubo de navegação e ícone do UCS"]):::ucPlan
    UC6(["UC6 Escolher estilo visual"]):::ucPlan
    UC7(["UC7 Orientar o plano de trabalho (UCS)"]):::ucPlan
    UC8(["UC8 Desenhar sobre grade de perspectiva"]):::ucPlan
    UC9(["UC9 Navegar por teclado e campos numéricos"]):::ucPlan
    UC10(["UC10 Verificar escopo e reserva (authorizePatch)"]):::ucPlan
  end
  dono -- "é um" --> colaborador
  colaborador -- "é um" --> autenticado
  autenticado --- UC1
  autenticado --- UC2
  colaborador --- UC3
  autenticado --- UC4
  autenticado --- UC5
  autenticado --- UC6
  colaborador --- UC7
  colaborador --- UC8
  autenticado --- UC9
  UC3 -. "«include»" .-> UC10
  UC7 -. "«include»" .-> UC10
  UC8 -. "«include»" .-> UC10
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Ver em planta do sistema de trabalho | `autenticado` | RF62.CA01 | planejado |
| UC2 Definir ponto de vista por vetor | `autenticado` | RF62.CA02 | planejado |
| UC3 Salvar e restaurar vistas nomeadas | `colaborador` | RF62.CA03 | planejado |
| UC4 Orbitar a cena | `autenticado` | RF62.CA04 | planejado |
| UC5 Alternar cubo de navegação e ícone do UCS | `autenticado` | RF62.CA05 | planejado |
| UC6 Escolher estilo visual | `autenticado` | RF62.CA06 | planejado — base `RenderMode` FILLED/WIREFRAME em `lib/pieces/wireframe.ts` |
| UC7 Orientar o plano de trabalho (UCS) | `colaborador` | RF62.CA07 | planejado |
| UC8 Desenhar sobre grade de perspectiva | `colaborador` | RF62.CA08 | planejado |
| UC9 Navegar por teclado e campos numéricos | `autenticado` | RF62.CA01 · CA02 · CA04 | planejado |
| UC10 Verificar escopo e reserva (authorizePatch) | — (incluído por UC3, UC7, UC8) | RF62.CA03 · CA07 · CA08 | planejado — função pura `lib/pieces/patch.ts` |

## 1. Diagrama de classes

**(real)**: `RenderMode`, `DrawingClassification`, `DrawingEditScope`, `SelectionEngine`, `PatchAuthorizer`. Demais **(planejado)**; câmera, vistas e UCS não constam de `docs/arquitetura/TAXONOMIA.md`.

```mermaid
classDiagram
direction LR
namespace lib_real {
  class RenderMode {
    <<enum>>
    FILLED
    WIREFRAME
  }
  class DrawingClassification {
    <<entity>>
    +projection: PLANA_UM_DOIS_TRES_PONTOS_ISOMETRICA_ORTOGONAL
  }
  class DrawingEditScope {
    <<entity>>
    +mode: EDIT_ou_VIEW
    +layerId: string
  }
  class SelectionEngine {
    <<service>>
    +selectedNodeIds(scene, selection) Set~string~
    +snapPoint(point, gridSize, enabled) Point
  }
  class PatchAuthorizer {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
}
namespace vistas_planejado {
  class Ucs {
    <<entity>>
    +id: string
    +name: string
    +origin: Vec3
    +xAxis: Vec3
    +yAxis: Vec3
  }
  class ViewCamera {
    <<entity>>
    +position: Vec3
    +target: Vec3
    +up: Vec3
    +projection: ORTOGRAFICA_ou_PERSPECTIVA
    +ucsId: string
  }
  class SavedView {
    <<entity>>
    +name: PLANTA_FRONTAL_LATERAL_ISO_SW_SE_NE_NW
    +camera: ViewCamera
    +visualStyle: VisualStyle
  }
  class VisualStyle {
    <<enum>>
    WIREFRAME
    PREENCHIDO
    SOMBREADO_FUTURO
    RAIOS_X_FUTURO
    CONCEITUAL_FUTURO
    REALISTA_FUTURO
  }
  class ViewService {
    <<service>>
    +plan(ucs) ViewCamera
    +vpoint(vector) ViewCamera
    +orbit(camera, delta) ViewCamera
    +exitOrbit() void
  }
  class ViewGuides {
    <<entity>>
    +navCubeVisible: boolean
    +ucsIconVisible: boolean
  }
  class CoordinateConverter {
    <<service>>
    +ucsToWorld(point, ucs) Vec3
    +worldToUcs(point, ucs) Vec3
  }
  class PerspectiveGrid {
    <<entity>>
    +kind: UM_DOIS_TRES_PONTOS_ISOMETRICA_CAVALEIRA
    +vanishingPoints: List~Point~
    +visible: boolean
    +project(point) Point
  }
}
namespace ws_planejado {
  class DrawingViewService {
    <<service>>
    +saveView(actor, pieceId, view) DrawingRevision
    +restoreView(actor, pieceId, name) SavedView
  }
  class DrawingRepositoryPort {
    <<port>>
    +saveRevision(revision) void
  }
  class MySqlDrawingRepository {
    <<adapter>>
  }
}
ViewCamera --> Ucs
SavedView *-- ViewCamera
SavedView --> VisualStyle
VisualStyle ..> RenderMode
ViewService ..> ViewCamera
ViewService ..> CoordinateConverter
CoordinateConverter ..> Ucs
PerspectiveGrid ..> SelectionEngine
PerspectiveGrid ..> DrawingClassification
ViewGuides ..> DrawingEditScope
DrawingViewService ..> SavedView
DrawingViewService ..> PatchAuthorizer
DrawingViewService ..> DrawingRepositoryPort
MySqlDrawingRepository ..|> DrawingRepositoryPort
note for ViewService "camera pessoal nao gera patch e a revisao da peca nao muda ao orbitar ou trocar a vista"
note for DrawingClassification "(real) projection classifica o desenho, nao controla a camera"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph P["Pessoa"]
    A1["Escolhe VISTA: planta, frontal, lateral, isométrica ou vetor de ponto de vista em campos x y z"]
    A2["Orbita com Shift+botão do meio, setas ou campos de ângulo, e sai com Escape ou botão Sair"]
    A3["Alterna cubo de navegação e ícone do UCS, ESTILO_VISUAL e GRADE de perspectiva"]
    A4["Define ORIGEM/UCS por face ou por eixos digitados e desenha"]
    A5["Salva ou restaura vista nomeada na peça"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1{"Vetor nulo?"}
    F2["Recusa no campo com mensagem e mantém a câmera atual"]
    F3["ViewService calcula câmera e anuncia por aria-live: vista, projeção e UCS em uso"]
    F4["Órbita altera só a câmera, revisão e geometria iguais, seleção mantida"]
    F5["Estilos FUTURO desabilitados com motivo (sem materiais PBR), wireframe e preenchido habilitados"]
    F6["Guias e grade são preferências de visualização, sem patch e sem mudar permissões"]
    F7["CoordinateConverter converte UCS para global antes do comando de desenho"]
    F8["PerspectiveGrid projeta o ponto e o alinhamento fica gravado no objeto"]
    F9["POST /api/drawings/[pieceId]/views (planejado)"]
  end
  subgraph APP["ws-application"]
    S1{"Peça visível e ator editor?"}
    S2{"Reserva do escopo de vistas do documento livre ou do ator?"}
    S3{"Câmera válida (vetores finitos, up não colinear)?"}
    S4["Grava SavedView com câmera, projeção e estilo na revisão"]
    E404["404 NAO_ENCONTRADO"]
    E403["403 ACESSO_NEGADO"]
    E409["409 REGIAO_RESERVADA"]
    E422["422 GEOMETRIA_INVALIDA"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Pedido explícito: sugerir vista para analisar a fachada"]
    I2["Sugere vista e estilo, sem mudar a câmera dos colegas"]
  end
  subgraph DB["Persistência"]
    D1[("MySQL: drawing_views na revisão da peça (planejado)")]
    D2[("Preferência pessoal: guias, estilo e última câmera (planejado)")]
  end

  A1 --> F1
  F1 -->|"sim"| F2
  F1 -->|"não"| F3
  A2 --> F4 --> F3
  A3 --> F5 --> F6 --> D2
  A4 --> F7 --> F8
  A5 --> F9 --> S1 -->|"não visível"| E404
  S1 -->|"leitor"| E403
  S1 -->|"ok"| S2 -->|"reservado por outra pessoa"| E409
  S2 -->|"ok"| S3 -->|"não"| E422
  S3 -->|"sim"| S4 --> D1
  A1 -.->|"assistente"| I1 --> I2 --> F3
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant R as Repository/MySQL
  participant RD as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: VISTA planta com UCS Fachada
  N->>N: ViewService.plan(ucs) calcula a câmera
  N-->>U: aria-live anuncia vista superior do UCS Fachada em projeção ortográfica
  U->>N: ponto de vista 0 0 0 nos campos
  N-->>U: vetor nulo recusado e câmera mantida
  U->>N: orbita com setas e sai com Escape
  N->>N: câmera muda e revisão e seleção permanecem iguais
  U->>N: salva a vista como ISO_SE
  N->>C: POST /api/drawings/{pieceId}/views com câmera, projeção e baseRevision
  C->>S: DrawingViewService.saveView(actor, pieceId, view)
  S->>R: findVisible(pieceId, actor)
  alt peça invisível ou inexistente
    S-->>C: 404 NAO_ENCONTRADO
  else ator sem papel de edição
    S-->>C: 403 ACESSO_NEGADO
  else escopo de vistas reservado por outra pessoa
    S-->>C: 409 REGIAO_RESERVADA
  else câmera com vetores não finitos ou up colinear
    S-->>C: 422 GEOMETRIA_INVALIDA
  else caminho feliz
    S->>R: grava SavedView na revisão
    S-->>C: 201 com a vista salva
    S->>EV: DrawingViewSaved
    EV->>RD: avisa colegas que há nova vista sem mudar a câmera deles
  end
  C-->>N: resposta e foco no seletor de vistas
  U->>N: restaura ISO_SE
  N->>C: GET /api/drawings/{pieceId}/views/ISO_SE
  C->>S: DrawingViewService.restoreView(actor, pieceId, ISO_SE)
  S-->>N: câmera e projeção associadas
```

## 4. Máquina de estados

Seleção, reserva e comando seguem o RF57 (aqui o comando é salvar vista); acrescenta-se a **navegação** da câmera (planejado), que nunca altera a geometria.

```mermaid
stateDiagram-v2
  direction LR
  state Selecao {
    [*] --> VAZIA
    VAZIA --> PARCIAL : seleção em curso
    PARCIAL --> NOS : objetos selecionados
    PARCIAL --> REGIAO : região selecionada
    NOS --> NOS : troca de vista mantém a seleção
    NOS --> VAZIA : Escape
    REGIAO --> VAZIA : Escape
  }
  state Reserva {
    [*] --> LIVRE
    LIVRE --> RESERVADA : reserva do escopo de vistas
    RESERVADA --> EXPIRADA : prazo vence
    RESERVADA --> LIBERADA : dono libera
    EXPIRADA --> LIVRE
    LIBERADA --> LIVRE
  }
  state Comando {
    [*] --> EM_EDICAO
    EM_EDICAO --> APLICADO : vista salva na revisão
    APLICADO --> DESFEITO : Ctrl+Z remove a vista salva
    DESFEITO --> APLICADO : refazer
  }
  state Navegacao {
    [*] --> VISTA_FIXA
    VISTA_FIXA --> ORBITANDO : Shift+botão do meio, setas ou campos
    ORBITANDO --> VISTA_FIXA : Escape ou botão Sair
    VISTA_FIXA --> VISTA_FIXA : PLAN, VPOINT ou vista restaurada
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, página-esqueleto)"]
    ED["DrawingEditor em /drawings/[pieceId] (planejado)"]
    VIEW["ViewService, CoordinateConverter, PerspectiveGrid, ViewGuides (planejado)"]
    WF["lib/pieces/wireframe.ts RenderMode (real)"]
    CL["lib/pieces/classification.ts e lib/drawings/taxonomy.ts (real, só classificação)"]
    SEL["lib/studio/selection.ts e lib/drawings/selection.ts (real)"]
    UI["components/ui (real)"]
    BFF["BFF /api/drawings (planejado)"]
  end
  subgraph WEB["ws-web"]
    DC["DrawingController (planejado)"]
  end
  subgraph APP["ws-application"]
    DVS["DrawingViewService (planejado)"]
  end
  subgraph DOM["ws-domain"]
    DD["SavedView, ViewCamera, Ucs (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql (planejado)"]
    RE["cache-redis avisos aos colegas (planejado)"]
  end

  PG --> ED --> VIEW & UI & SEL
  VIEW --> WF & CL & SEL
  ED --> BFF --> DC --> DVS --> DD
  DVS --> MY & RE
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF62.CA01 | `ViewService.plan`, `Ucs`, `ViewCamera.ucsId` | `A1`, `F3` | 1–3 | `VISTA_FIXA`→`VISTA_FIXA` | `VIEW` | planejado |
| RF62.CA02 | `ViewService.vpoint` | `A1`, `F1`, `F2`, `S3`, `E422` | 4–5, 15 | `VISTA_FIXA`→`VISTA_FIXA` | `VIEW` | planejado |
| RF62.CA03 | `SavedView`, `DrawingViewService.saveView/restoreView` | `A5`, `F9`, `S1`–`S4`, `E404`, `E403`, `E409` | 8–24 | `LIVRE`→`RESERVADA`, `EM_EDICAO`→`APLICADO` | `DVS`, `MY` | planejado |
| RF62.CA04 | `ViewService.orbit/exitOrbit` | `A2`, `F4` | 6–7 | `VISTA_FIXA`→`ORBITANDO`→`VISTA_FIXA`, `NOS`→`NOS` | `VIEW`, `SEL` | planejado (capacidade 3D futura) |
| RF62.CA05 | `ViewGuides`, `DrawingEditScope` | `A3`, `F6`, `D2` | — (preferência local, sem patch) | — | `VIEW` | planejado |
| RF62.CA06 | `VisualStyle`, `RenderMode` | `A3`, `F5` | — | — | `VIEW`, `WF` | `RenderMode` real; demais estilos futuros |
| RF62.CA07 | `Ucs`, `CoordinateConverter` | `A4`, `F7` | 1–3 | — | `VIEW` | planejado (UCS por face é capacidade 3D futura) |
| RF62.CA08 | `PerspectiveGrid`, `SelectionEngine.snapPoint`, `DrawingClassification.projection` | `A3`, `A4`, `F8` | — | — | `VIEW`, `SEL`, `CL` | grade de `snapPoint` real; perspectiva planejada |

Trocar vista, orbitar, alternar guias ou estilo nunca gera patch nem altera geometria ou permissão; só salvar vista na peça é edição do documento. Nenhum CA é marcado como concluído por este diagrama.
