# RF58 — Criar e editar geometria vetorial e desenho técnico 2D
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF58.CA01 … RF58.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF58.md (CAs copiados como estão escritos); classes reais: `Geometry` (rect, circle, segment, polygon, path), `geometryBounds`, `hitTest`, `snapPoint` (`lib/studio/selection.ts`), `authorizePatch` (`lib/pieces/patch.ts`), `DrawingClassification.scale` (`lib/pieces/classification.ts`), `toWireframe`/`RenderMode` (`lib/pieces/wireframe.ts`), `evaluateAiAction` (`lib/ai/autonomy.ts`); o restante (planejado)

O RF58 cobre a construção de traçados e perfis 2D com coordenadas e precisão: o núcleo da primeira entrega são os comandos `LINHA`, `POLILINHA`, `RETANGULO`, `ELIPSE`, `POLIGONO`, `CAMINHO` (Bézier) e `TEXTO`, seguidos de círculo por raio, diâmetro, 2P, 3P e TTR, arco, linha de construção e ponto; edição por aparar, estender, deslocar, unir, quebrar, `CORTAR_NO_PONTO` e reverter; largura variável e pincel de mancha expandidos em contornos editáveis; auxílios de precisão (OSNAP, ORTHO, POLAR, `GRADE`, `ORIGEM`) que só propõem pontos; e medição (DIST, AREA, cotas) calculada sobre a geometria real, nunca sobre o texto digitado. Cada comando aceita entrada numérica por linha de comando ou campos (alternativa ao arraste, WCAG 2.5.7), anuncia o resultado ao leitor de tela e passa pela mesma autorização de patch (camada ativa, escopo, reserva). Nomes como LINE, PLINE e TRIM são inspiração semântica de AutoCAD/Illustrator, sem promessa de paridade.

Estado real (MATRIZ_RF de 17/10/2026: AUSENTE, 0,00): nenhuma ferramenta de desenho existe nesta árvore; só o tipo `Geometry`, o hit-test e o `snapPoint` de grade (`lib/studio/selection.ts`) servem de base. A evidência local de 15/10 (`docs/auditoria/2026-10-15/comandos-do-zero/`, `caminhos-compostos/`) foi produzida em código ainda fora deste repositório. Fontes: `COMANDOS_REFERENCIA_ILLUSTRATOR_AUTOCAD.md` §5, `docs/produto/DRAWINGS_ESTUDO_TECNICO_ACADEMICO.md` (unidade de tela ≠ milímetro, cota ligada à geometria), D-136 (autonomia). 3D: as mesmas ferramentas com coordenada Z ou plano UCS são capacidade futura declarada por operação (RF60/RF62).

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF58.CA01** | Dados LINE, PLINE, CIRCLE, ARC, RECTANG, POLYGON, ELLIPSE, SPLINE, XLINE e POINT, quando executados com parâmetros válidos, então criam a geometria esperada e rejeitam degenerações. |
| **RF58.CA02** | Dado círculo, quando escolhe raio, diâmetro, 2P, 3P ou TTR, então resolve o método e informa ambiguidade ou impossibilidade. |
| **RF58.CA03** | Dada caneta Bézier ou lápis livre, quando edita controles e simplifica, então informa tolerância/erro máximo e preserva fechamento e pontos protegidos. |
| **RF58.CA04** | Dados TRIM, EXTEND, OFFSET, JOIN/PEDIT, BREAK, tesoura e reversão, quando aplicados, então preservam topologia prevista e mantêm histórico. |
| **RF58.CA05** | Dados largura variável e pincel de mancha, quando expande, então gera contornos editáveis e mantém aparência dentro da tolerância declarada. |
| **RF58.CA06** | Dados OSNAP, ORTHO, POLAR, SNAP/GRID, quando habilitados, então mostram ponto/alinhamento proposto sem deslocar objetos fora do escopo. |
| **RF58.CA07** | Dados DIST, AREA, cotas, unidades e escala, quando mede, então calcula sobre geometria real e distingue medida de valor textual digitado. |

## 0. Diagrama de casos de uso

O colaborador explícito (e o dono) desenha e edita geometria 2D com entrada numérica e auxílios de precisão; medir é leitura e vale para quem tem acesso à peça. Toda gravação passa pela verificação de escopo e reserva. Não há ferramenta de desenho no app.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  autenticado["«ator» Pessoa autenticada"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  dono["«ator» Dono da peça"]:::ator
  subgraph SIS["Work Station — RF58 Geometria vetorial 2D"]
    direction TB
    UC1(["UC1 Desenhar linha, polilinha, retângulo, elipse ou polígono"]):::ucPlan
    UC2(["UC2 Desenhar círculo por raio, diâmetro, 2P, 3P ou TTR"]):::ucPlan
    UC3(["UC3 Traçar caminho Bézier ou lápis livre"]):::ucPlan
    UC4(["UC4 Aparar, estender, deslocar, unir ou quebrar"]):::ucPlan
    UC5(["UC5 Expandir largura variável e pincel de mancha"]):::ucPlan
    UC6(["UC6 Usar OSNAP, ORTHO, POLAR e GRADE"]):::ucPlan
    UC7(["UC7 Medir distância, área e cotas"]):::ucPlan
    UC8(["UC8 Informar coordenadas por comando ou campos"]):::ucPlan
    UC9(["UC9 Pedir proposta de geometria à IA"]):::ucPlan
    UC10(["UC10 Verificar escopo e reserva (authorizePatch)"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  dono -- "é um" --> colaborador
  colaborador -- "é um" --> autenticado
  colaborador --- UC1
  colaborador --- UC2
  colaborador --- UC3
  colaborador --- UC4
  colaborador --- UC5
  colaborador --- UC6
  autenticado --- UC7
  colaborador --- UC8
  colaborador --- UC9
  UC1 -. "«include»" .-> UC10
  UC2 -. "«include»" .-> UC10
  UC3 -. "«include»" .-> UC10
  UC4 -. "«include»" .-> UC10
  UC5 -. "«include»" .-> UC10
  UC9 -. "«extend»" .-> UC4
  UC9 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Desenhar linha, polilinha, retângulo, elipse ou polígono | `colaborador` | RF58.CA01 | planejado |
| UC2 Desenhar círculo por raio, diâmetro, 2P, 3P ou TTR | `colaborador` | RF58.CA02 | planejado |
| UC3 Traçar caminho Bézier ou lápis livre | `colaborador` | RF58.CA03 | planejado |
| UC4 Aparar, estender, deslocar, unir ou quebrar | `colaborador` | RF58.CA04 | planejado |
| UC5 Expandir largura variável e pincel de mancha | `colaborador` | RF58.CA05 | planejado |
| UC6 Usar OSNAP, ORTHO, POLAR e GRADE | `colaborador` | RF58.CA06 | planejado — `snapPoint` de grade em `lib/studio/selection.ts` |
| UC7 Medir distância, área e cotas | `autenticado` | RF58.CA07 | planejado |
| UC8 Informar coordenadas por comando ou campos | `colaborador` | RF58.CA01 · CA02 | planejado |
| UC9 Pedir proposta de geometria à IA | `colaborador`, `ia` (estende UC4) | RF58.CA04 · CA06 | planejado — `evaluateAiAction` real, sem editor |
| UC10 Verificar escopo e reserva (authorizePatch) | — (incluído por UC1, UC2, UC3, UC4, UC5) | RF58.CA04 · CA06 | planejado — função pura `lib/pieces/patch.ts` |

## 1. Diagrama de classes

**(real)**: `Geometry`, `SelectionEngine` (funções de `lib/studio/selection.ts`), `PatchAuthorizer`, `DrawingClassification`, `WireframeSuggestion`. Demais classes **(planejado)**; não constam de `docs/arquitetura/TAXONOMIA.md` e são proposta da Onda 5.

```mermaid
classDiagram
direction LR
namespace lib_real {
  class Geometry {
    <<entity>>
    +kind: rect_circle_segment_polygon_path
    +points: List~Point~
    +closed: boolean
  }
  class SelectionEngine {
    <<service>>
    +geometryBounds(geometry) Bounds
    +hitTest(geometry, point, tolerance) boolean
    +snapPoint(point, gridSize, enabled) Point
  }
  class PatchAuthorizer {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
  class DrawingClassification {
    <<entity>>
    +scale: unit_e_ratio
    +projection: ClassifiedField
  }
  class WireframeSuggestion {
    <<entity>>
    +mode: FILLED_ou_WIREFRAME
    +toWireframe(el) SuggestedElement
  }
}
namespace front_planejado {
  class DrawCommand {
    <<entity>>
    +id: LINHA_POLILINHA_RETANGULO_ELIPSE_POLIGONO_CAMINHO_TEXTO
    +params: List~CommandParam~
    +validate() List~GeometryIssue~
  }
  class CircleSolver {
    <<service>>
    +method: RAIO_DIAMETRO_2P_3P_TTR
    +solve(input) CircleSolution
  }
  class CircleSolution {
    <<entity>>
    +status: UNICA_AMBIGUA_IMPOSSIVEL
    +candidates: List~Geometry~
  }
  class PathSimplifier {
    <<service>>
    +tolerance: number
    +simplify(path, protectedAnchors) SimplifyReport
  }
  class PathEditOps {
    <<service>>
    +trim(target, cutters) Geometry
    +offset(target, distance) Geometry
    +join(paths) Geometry
    +cutAtPoint(path, t) List~Geometry~
  }
  class StrokeExpander {
    <<service>>
    +expand(stroke, widthProfile) ExpandReport
  }
  class SnapEngine {
    <<service>>
    +modes: OSNAP_ORTHO_POLAR_GRADE
    +propose(cursor, scope) SnapCandidate
  }
  class Measurement {
    <<entity>>
    +kind: DIST_AREA_COTA
    +sourceIds: List~string~
    +value: number
    +unit: string
    +textOverride: string
  }
}
namespace ws_planejado {
  class DrawingCommandService {
    <<service>>
    +apply(actor, pieceId, command) DrawingRevision
  }
  class GeometryKernelPort {
    <<port>>
    +validate2d(geometry, tolerance) GeometryVerdict
  }
  class Vector2dKernelAdapter {
    <<adapter>>
  }
  class DrawingRepositoryPort {
    <<port>>
    +saveRevision(revision) void
  }
}
DrawCommand ..> Geometry
CircleSolver ..> CircleSolution
CircleSolution ..> Geometry
PathSimplifier ..> Geometry
PathEditOps ..> Geometry
StrokeExpander ..> Geometry
SnapEngine ..> SelectionEngine
Measurement ..> Geometry
Measurement ..> DrawingClassification
DrawCommand ..> PatchAuthorizer
DrawingCommandService ..> GeometryKernelPort
DrawingCommandService ..> DrawingRepositoryPort
Vector2dKernelAdapter ..|> GeometryKernelPort
DrawingCommandService ..> WireframeSuggestion
note for SnapEngine "so propoe ponto, nunca move objeto fora do escopo - hoje so a grade existe (snapPoint real)"
note for Measurement "valor calculado da geometria - textOverride fica marcado como texto digitado e nao altera a medida"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph P["Pessoa"]
    A1["Escolhe comando pela barra, paleta ou linha de comando (LINHA, CIRCULO TTR, CAMINHO...)"]
    A2["Informa pontos por clique ou por coordenadas absolutas, relativas e polares digitadas"]
    A3["Liga ou desliga OSNAP, ORTHO, POLAR e GRADE (teclas e botões com estado anunciado)"]
    A4["Edita: aparar, estender, deslocar, unir, quebrar, cortar no ponto, reverter, simplificar"]
    A5["Mede DIST, AREA ou insere cota"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["SnapEngine mostra ponto ou alinhamento proposto (marcador + texto), sem mover objetos"]
    F2["DrawCommand.validate: comprimento zero, raio zero, polígono com menos de 3 lados, autointerseção"]
    F3{"Válido?"}
    F4["CircleSolver resolve o método e lista candidatos"]
    F5{"Solução única?"}
    F6["Pede escolha entre candidatos (Tab/Enter) ou informa impossibilidade"]
    F7["Prévia tracejada e aria-live com tipo, medidas e unidade"]
    F8["PathSimplifier e StrokeExpander informam tolerância e erro máximo"]
    F9["Measurement calcula sobre a geometria e marca texto digitado como texto"]
    F10["POST /api/drawings/[pieceId]/patches (planejado)"]
    F11["Mostra o problema sem criar nada"]
  end
  subgraph APP["ws-application"]
    S1{"Peça visível e ator editor?"}
    S2{"authorizePatch no servidor (camada, escopo, reserva)"}
    S3{"GeometryKernelPort.validate2d"}
    S4["Grava DrawingRevision com comando e inverso (histórico)"]
    E404["404 NAO_ENCONTRADO"]
    E403["403 ACESSO_NEGADO"]
    E409["409 REGIAO_RESERVADA"]
    E422["422 GEOMETRIA_INVALIDA"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Pedido explícito: sugerir traçado ou completar perfil"]
    I2["Proposta em WIREFRAME (toWireframe), identificada como IA, aplicada só após revisão"]
  end
  subgraph DB["Persistência"]
    D1[("MySQL: drawings, drawing_revisions")]
  end

  A1 --> A2 --> F1 --> F2 --> F3
  A3 --> F1
  F3 -->|"não"| F11
  F3 -->|"sim, círculo"| F4 --> F5
  F5 -->|"não"| F6 --> F7
  F5 -->|"sim"| F7
  F3 -->|"sim"| F7 --> F10
  A4 --> F8 --> F7
  A5 --> F9 --> F7
  F10 --> S1 -->|"não visível"| E404
  S1 -->|"leitor"| E403
  S1 -->|"ok"| S2 -->|"reserva de outra pessoa"| E409
  S2 -->|"ok"| S3 -->|"degenerada"| E422
  S3 -->|"ok"| S4 --> D1
  A1 -.->|"assistente"| I1 --> I2 --> F7
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
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: CIRCULO TTR com duas tangentes e raio 40 digitado
  N->>N: CircleSolver.solve devolve duas soluções
  N-->>U: aria-live informa solução ambígua e lista os candidatos
  U->>N: escolhe o candidato 2 por teclado
  N->>N: DrawCommand.validate e prévia tracejada
  N->>C: POST /api/drawings/{pieceId}/patches com baseRevision
  C->>S: DrawingCommandService.apply(actor, pieceId, command)
  S->>R: findVisible(pieceId, actor)
  alt peça invisível ou inexistente
    S-->>C: 404 NAO_ENCONTRADO
  else ator sem papel de edição
    S-->>C: 403 ACESSO_NEGADO
  else alvo em região reservada por outra pessoa
    S-->>C: 409 REGIAO_RESERVADA
  else kernel rejeita raio zero, tangentes paralelas ou autointerseção
    S-->>C: 422 GEOMETRIA_INVALIDA com o parâmetro em erro
  else caminho feliz
    S->>R: grava DrawingRevision com comando e inverso
    S-->>C: 200 com nova revisão
    S->>EV: DrawingPatched
  end
  C-->>N: resposta e foco devolvido à prancheta
  U->>N: DIST entre dois pontos com OSNAP fim
  N->>N: SnapEngine propõe o ponto e Measurement calcula na unidade da peça
  N-->>U: distância calculada, distinta de qualquer texto de cota digitado
  opt traçado sugerido pela IA
    U->>N: pede sugestão de perfil
    N->>C: POST /api/drawings/{pieceId}/ai/propose
    C->>S: evaluateAiAction(policy, PROPOR_ALTERACAO, ctx)
    S->>AI: escopo, camada ativa e revisão
    AI-->>S: elementos em WIREFRAME
    S-->>N: proposta revisável, nada aplicado
  end
```

## 4. Máquina de estados

Seleção e reserva seguem o RF57; o **comando de desenho** (planejado) é a entidade central aqui.

```mermaid
stateDiagram-v2
  direction LR
  state Selecao {
    [*] --> VAZIA
    VAZIA --> PARCIAL : comando de edição aguarda alvos
    PARCIAL --> NOS : alvos escolhidos
    PARCIAL --> REGIAO : alvo é região da camada
    NOS --> VAZIA : Escape
    REGIAO --> VAZIA : Escape
  }
  state Reserva {
    [*] --> LIVRE
    LIVRE --> RESERVADA : acquire sem conflito
    RESERVADA --> RESERVADA : renovação pelo dono
    RESERVADA --> EXPIRADA : prazo vence
    RESERVADA --> LIBERADA : dono libera
    EXPIRADA --> LIVRE
    LIBERADA --> LIVRE
  }
  state Comando {
    [*] --> EM_EDICAO
    EM_EDICAO --> EM_EDICAO : ponto ou parâmetro informado
    EM_EDICAO --> [*] : degenerado rejeitado ou Escape, nada criado
    EM_EDICAO --> APLICADO : parâmetros válidos e kernel aprova
    APLICADO --> DESFEITO : Ctrl+Z
    DESFEITO --> APLICADO : refazer
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, página-esqueleto)"]
    ED["DrawingEditor em /drawings/[pieceId] (planejado)"]
    TOOLS["DrawCommand, CircleSolver, PathEditOps, SnapEngine, Measurement (planejado)"]
    CLI["Linha de comando e campos numéricos (planejado)"]
    SEL["lib/studio/selection.ts (real)"]
    PATCH["lib/pieces/patch.ts e classification.ts (real)"]
    WF["lib/pieces/wireframe.ts (real)"]
    UI["components/ui (real)"]
    BFF["BFF /api/drawings (planejado)"]
  end
  subgraph WEB["ws-web"]
    DC["DrawingController (planejado)"]
  end
  subgraph APP["ws-application"]
    DCS["DrawingCommandService (planejado)"]
  end
  subgraph DOM["ws-domain"]
    DD["Drawing, DrawingRevision, GeometryKernelPort (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    KER["Vector2dKernelAdapter (planejado)"]
    MY["persistence-mysql (planejado para drawings)"]
    AIP["ai-providers (real no gateway)"]
  end
  EXT["Claude/Gemini"]

  PG --> ED --> TOOLS & CLI & UI & PATCH
  TOOLS --> SEL
  CLI --> TOOLS
  ED --> BFF --> DC --> DCS --> DD
  DCS --> KER & MY
  DCS --> AIP --> EXT
  AIP -.-> WF
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF58.CA01 | `DrawCommand.validate`, `GeometryKernelPort.validate2d`, `Geometry` | `A1`, `A2`, `F2`, `F3`, `F11`, `S1`–`S3`, `E404`, `E403`, `E409`, `E422` | 5–16 | `EM_EDICAO`→`APLICADO`, `EM_EDICAO`→`[*]`, `LIVRE`→`RESERVADA` | `TOOLS`, `CLI`, `KER` | planejado (`Geometry` real) |
| RF58.CA02 | `CircleSolver`, `CircleSolution` | `F4`, `F5`, `F6` | 1–4 | `EM_EDICAO`→`EM_EDICAO` | `TOOLS` | planejado |
| RF58.CA03 | `PathSimplifier` (tolerance, protectedAnchors) | `A4`, `F8` | 5 | `EM_EDICAO`→`APLICADO` | `TOOLS` | planejado (Bézier só no código local de 16/10) |
| RF58.CA04 | `PathEditOps`, `DrawingCommandService.apply` com inverso | `A4`, `F8`, `S4` | 13–15 | `APLICADO`→`DESFEITO`→`APLICADO` | `TOOLS`, `DCS`, `MY` | planejado |
| RF58.CA05 | `StrokeExpander` | `A4`, `F8` | 5 | `EM_EDICAO`→`APLICADO` | `TOOLS`, `KER` | planejado |
| RF58.CA06 | `SnapEngine.propose`, `SelectionEngine.snapPoint` | `A3`, `F1` | 17–18 | — (só proposta, nenhum objeto se move) | `TOOLS`, `SEL` | `snapPoint` de grade real; OSNAP/ORTHO/POLAR planejados |
| RF58.CA07 | `Measurement` (value, unit, textOverride), `DrawingClassification.scale` | `A5`, `F9` | 17–19 | — | `TOOLS`, `PATCH` | planejado (`scale` real como metadado) |

IA (bloco opt, mensagens 20–25) só propõe em `WIREFRAME`; aplicar segue `evaluateAiAction` (`APLICAR_ALTERACAO` exige revisão e seleção editável). Nenhum CA é marcado como concluído por este diagrama.
