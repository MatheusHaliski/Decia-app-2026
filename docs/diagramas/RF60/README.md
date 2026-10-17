# RF60 — Modelar sólidos, superfícies e malhas 3D no Drawings
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF60.CA01 … RF60.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF60.md (CAs copiados como estão escritos); classes reais: `authorizePatch` (`lib/pieces/patch.ts`), `LayerStack` (`lib/pieces/layers.ts`), `RegionLock` (`lib/pieces/collab.ts`), `DrawingClassification` com técnica `TRES_D` (`lib/pieces/classification.ts`), `evaluateAiAction` (`lib/ai/autonomy.ts`); o restante (planejado)

O RF60 descreve a modelagem 3D do Drawings: primitivas (caixa, cilindro, esfera, cone, cunha, toro), operações de perfil (extrusão/PRESSPULL, revolução, loft e varredura), volume almofadado (Inflate) identificado como aproximação ou simulação, booleanas de sólidos (`UNIR`, `SUBTRAIR`, `INTERSECTAR`) validadas antes de gravar, acabamento de arestas apenas onde suportado, e transformações 3D (`MOVER`, `GIRAR`, `REDIMENSIONAR` em XYZ) com seleção múltipla, pivô explícito, limites e desfazer. Toda a modelagem 3D é **capacidade futura declarada por operação**: cada comando expõe na interface se está disponível, parcial ou futuro, qual representação usa (malha poligonal; B-rep só quando houver kernel) e suas limitações, sem prometer equivalência com AutoCAD ou Illustrator. Cada parâmetro tem campo numérico equivalente ao gizmo (WCAG 2.5.7) e o resultado (dimensões, volume, fechamento) é anunciado ao leitor de tela.

Estado real (MATRIZ_RF de 17/10/2026: AUSENTE, 0,00): não há código 3D nesta árvore. A evidência local de 15/10 (`docs/auditoria/2026-10-15/comandos-do-zero/` e `caminhos-compostos/`: BOX, CYLINDER, SUBTRACT, extrusão vazada com teste de volume e GLB validado pelo Khronos) usa malhas poligonais em código ainda fora do repositório, separado da peça e da colaboração 2D. Fontes: `COMANDOS_REFERENCIA_ILLUSTRATOR_AUTOCAD.md` §5, `DRAWINGS_ESTUDO_TECNICO_ACADEMICO.md` (volume exige geometria 3D e câmera; retângulo com sombra não é volume), PLANO_ONDAS Onda 5 (persistir malha/B-rep com unidades e tolerâncias).

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF60.CA01** | Dados BOX, CYLINDER, SPHERE, CONE, WEDGE e TORUS, quando dimensiona, então gera malhas válidas com normais e escala consistente. |
| **RF60.CA02** | Dados EXTRUDE/PRESSPULL e perfil fechado, quando aplica profundidade, então gera volume e rejeita perfil degenerado ou autointersectante. |
| **RF60.CA03** | Dados REVOLVE, LOFT e SWEEP, quando fornece eixo, seções ou trajetória, então informa correspondência/orientação e valida continuidade e fechamento. |
| **RF60.CA04** | Dado Inflate, quando cria volume almofadado, então identifica se é aproximação geométrica ou simulação e permite refino. |
| **RF60.CA05** | Dadas UNION, SUBTRACT e INTERSECT, quando opera sólidos, então valida resultado vazio, fechamento e interseções antes de gravar. |
| **RF60.CA06** | Dados FILLETEDGE e CHAMFEREDGE, quando seleciona arestas, então aplica raio/chanfro nas arestas suportadas e não promete kernel B-rep onde há apenas malha. |
| **RF60.CA07** | Dados 3DMOVE, 3DROTATE e 3DSCALE, quando usa campos ou gizmos XYZ, então permite seleção múltipla, pivô explícito, limites e desfazer. |

## 1. Diagrama de classes

**(real)**: `PatchAuthorizer`, `RegionLock`, `DrawingClassification`, `AutonomyPolicy`. Todo o modelo 3D é **(planejado)** e não consta de `docs/arquitetura/TAXONOMIA.md`.

```mermaid
classDiagram
direction LR
namespace lib_real {
  class PatchAuthorizer {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
  class RegionLock {
    <<entity>>
    +layerId: string
    +regionIds: List~string~
    +expiresAt: number
  }
  class DrawingClassification {
    <<entity>>
    +technique: TRES_D
    +scale: unit_e_ratio
  }
  class AutonomyPolicy {
    <<service>>
    +evaluateAiAction(policy, action, ctx) Verdict
  }
}
namespace modelo3d_planejado {
  class SolidBody {
    <<entity>>
    +id: string
    +representation: MALHA_ou_BREP_FUTURO
    +unit: string
    +closed: boolean
    +manifold: boolean
  }
  class MeshData {
    <<entity>>
    +vertices: List~Vec3~
    +faces: List~Face~
    +normals: List~Vec3~
  }
  class Primitive3D {
    <<enum>>
    BOX
    CYLINDER
    SPHERE
    CONE
    WEDGE
    TORUS
  }
  class ProfileOperation {
    <<service>>
    +extrude(profile, depth) SolidBody
    +revolve(profile, axis, angle) SolidBody
    +loft(sections) SolidBody
    +sweep(section, path) SolidBody
  }
  class InflateOperation {
    <<service>>
    +nature: APROXIMACAO_ou_SIMULACAO
    +refineLevel: number
  }
  class EdgeFinish {
    <<service>>
    +supportedOn: List~string~
    +fillet(edges, radius) SolidBody
    +chamfer(edges, distance) SolidBody
  }
  class Transform3D {
    <<entity>>
    +translate: Vec3
    +rotateDeg: Vec3
    +scale: Vec3
    +pivot: Vec3
    +limits: Box3
  }
  class MeshValidator {
    <<service>>
    +validate(body) List~MeshIssue~
  }
  class OperationCapability {
    <<entity>>
    +operation: string
    +status: DISPONIVEL_PARCIAL_FUTURA_NAO_SUPORTADA
    +representation: string
    +limitation: string
  }
}
namespace ws_planejado {
  class SolidCommandService {
    <<service>>
    +apply(actor, pieceId, command) DrawingRevision
  }
  class MeshKernelPort {
    <<port>>
    +boolean3d(op, a, b) SolidBody
    +validate(body) MeshVerdict
  }
  class MeshKernelAdapter {
    <<adapter>>
  }
  class GlbExportPort {
    <<port>>
    +export(body) ObjectKey
  }
}
SolidBody *-- MeshData
ProfileOperation ..> SolidBody
InflateOperation ..> SolidBody
EdgeFinish ..> SolidBody
Transform3D ..> SolidBody
MeshValidator ..> SolidBody
Primitive3D ..> SolidBody
OperationCapability ..> ProfileOperation
OperationCapability ..> EdgeFinish
SolidCommandService ..> MeshKernelPort
SolidCommandService ..> MeshValidator
SolidCommandService ..> OperationCapability
SolidCommandService ..> PatchAuthorizer
SolidCommandService ..> GlbExportPort
SolidCommandService ..> AutonomyPolicy
MeshKernelAdapter ..|> MeshKernelPort
note for OperationCapability "cada comando 3D declara status, representacao e limite na UI - malha nunca e rotulada como B-rep"
note for InflateOperation "evidencia local de 15/10 usa aproximacao por loft - a UI diz isso"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph P["Pessoa"]
    A1["Abre a área 3D da peça e consulta a matriz de capacidades por operação"]
    A2["Escolhe primitiva ou operação de perfil e informa dimensões, profundidade, eixo, seções ou trajetória em campos"]
    A3["Seleciona sólidos ou arestas (lista navegável ou clique) e aplica booleana ou acabamento"]
    A4["Transforma em XYZ por campos (dx, dy, dz, ângulos, escala, pivô) ou gizmo"]
    A5["Refina Inflate ou desfaz"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["OperationCapability: DISPONIVEL, PARCIAL ou FUTURA com limitação em texto"]
    F2{"Operação disponível?"}
    F3["Explica que é capacidade futura e não executa"]
    F4["Prévia 3D + resumo textual (dimensões, unidade, volume estimado, fechado sim/não) em aria-live"]
    F5["Inflate rotulado como aproximação geométrica ou simulação, com nível de refino"]
    F6["Arestas sem suporte ficam desabilitadas com motivo (só malha, sem kernel B-rep)"]
    F7["POST /api/drawings/[pieceId]/solids/commands com baseRevision (planejado)"]
  end
  subgraph APP["ws-application"]
    S1{"Peça visível e ator editor?"}
    S2{"authorizePatch (camada, escopo, reserva)"}
    S3{"MeshValidator: perfil fechado, sem autointerseção, normais, resultado não vazio, malha fechada?"}
    S4["Grava revisão com malha, unidade e comando inverso, exporta GLB"]
    E404["404 NAO_ENCONTRADO"]
    E403["403 ACESSO_NEGADO"]
    E409["409 REGIAO_RESERVADA"]
    E422["422 GEOMETRIA_INVALIDA"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Pedido explícito: sugerir parâmetros de revolução ou loft"]
    I2["Proposta de parâmetros identificada como IA, sem aplicar"]
  end
  subgraph DB["Persistência"]
    D1[("MySQL: drawing_revisions com solid_bodies e capabilities (planejado)")]
    D2[("S3: GLB validado e malha da revisão anterior")]
  end

  A1 --> F1 --> A2 --> F2
  F2 -->|"futura"| F3
  F2 -->|"disponível ou parcial"| F4 --> F7
  A3 --> F6 --> F4
  A4 --> F4
  A5 --> F5 --> F4
  F7 --> S1 -->|"não visível"| E404
  S1 -->|"leitor"| E403
  S1 -->|"ok"| S2 -->|"reserva alheia"| E409
  S2 -->|"ok"| S3 -->|"falha"| E422
  S3 -->|"ok"| S4 --> D1 & D2
  A2 -.->|"assistente"| I1 --> I2 --> F4
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
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: EXTRUDE do perfil fechado com profundidade 120 digitada
  N->>N: OperationCapability indica PARCIAL com malha poligonal
  N-->>U: prévia e resumo textual com unidade e fechamento
  N->>C: POST /api/drawings/{pieceId}/solids/commands com baseRevision
  C->>S: SolidCommandService.apply(actor, pieceId, command)
  S->>R: findVisible(pieceId, actor)
  alt peça invisível ou inexistente
    S-->>C: 404 NAO_ENCONTRADO
  else ator sem papel de edição
    S-->>C: 403 ACESSO_NEGADO
  else sólido em região reservada por outra pessoa
    S-->>C: 409 REGIAO_RESERVADA
  else perfil degenerado, autointersectante ou resultado vazio
    S-->>C: 422 GEOMETRIA_INVALIDA com o problema encontrado
  else caminho feliz
    S->>S: MeshValidator confirma malha fechada e normais
    S->>R: grava revisão com malha, unidade e inverso
    S->>S3: grava GLB da revisão
    S-->>C: 200 com nova revisão
    S->>EV: SolidChanged
  end
  C-->>N: resposta e foco devolvido à prancheta
  U->>N: GIRAR 3D com pivô e ângulo Z 30 em campos
  N->>C: POST /api/drawings/{pieceId}/solids/commands com Transform3D
  C->>S: apply com limites e pivô explícito
  S->>R: grava revisão e inverso
  U->>N: Ctrl+Z
  N->>C: POST com o comando inverso
  opt parâmetros sugeridos pela IA
    U->>N: pede sugestão de eixo de revolução
    N->>C: POST /api/drawings/{pieceId}/ai/propose
    C->>S: evaluateAiAction(policy, PROPOR_ALTERACAO, ctx)
    S->>AI: perfil, unidade e escopo
    AI-->>S: parâmetros propostos
    S-->>N: proposta revisável, nada aplicado
  end
```

## 4. Máquina de estados

Seleção, reserva e comando seguem o RF57; a **capacidade por operação** (planejado) é a entidade que este RF acrescenta.

```mermaid
stateDiagram-v2
  direction LR
  state Selecao {
    [*] --> VAZIA
    VAZIA --> PARCIAL : escolhe sólidos ou arestas
    PARCIAL --> NOS : sólidos editáveis
    PARCIAL --> REGIAO : arestas suportadas do sólido
    NOS --> VAZIA : Escape
    REGIAO --> VAZIA : Escape
  }
  state Reserva {
    [*] --> LIVRE
    LIVRE --> RESERVADA : acquire sem conflito
    RESERVADA --> EXPIRADA : prazo vence
    RESERVADA --> LIBERADA : dono libera
    EXPIRADA --> LIVRE
    LIBERADA --> LIVRE
  }
  state Comando {
    [*] --> EM_EDICAO
    EM_EDICAO --> APLICADO : MeshValidator aprova
    EM_EDICAO --> [*] : falha de validação, nada gravado
    APLICADO --> DESFEITO : Ctrl+Z
    DESFEITO --> APLICADO : refazer
  }
  state Capacidade {
    [*] --> FUTURA
    FUTURA --> PARCIAL : malha implementada e testada com limites declarados
    PARCIAL --> DISPONIVEL : kernel e testes cobrem o CA
    PARCIAL --> FUTURA : regressão encontrada
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, página-esqueleto)"]
    V3D["Área 3D do DrawingEditor (planejado)"]
    CAP["Matriz OperationCapability (planejado)"]
    FIELDS["Campos XYZ e lista de arestas (planejado)"]
    PATCH["lib/pieces/patch.ts e classification.ts (real)"]
    AUT["lib/ai/autonomy.ts (real)"]
    UI["components/ui (real)"]
    BFF["BFF /api/drawings (planejado)"]
  end
  subgraph WEB["ws-web"]
    DC["DrawingController (planejado)"]
  end
  subgraph APP["ws-application"]
    SCS["SolidCommandService (planejado)"]
  end
  subgraph DOM["ws-domain"]
    DD["SolidBody, MeshData, OperationCapability (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MK["MeshKernelAdapter (planejado)"]
    MY["persistence-mysql (planejado)"]
    ST["storage-s3 GLB (planejado)"]
    AIP["ai-providers (real no gateway)"]
  end
  EXT["Claude/Gemini"]

  PG --> V3D --> CAP & FIELDS & UI & PATCH & AUT
  V3D --> BFF --> DC --> SCS --> DD
  SCS --> MK & MY & ST
  SCS --> AIP --> EXT
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF60.CA01 | `Primitive3D`, `MeshData.normals`, `SolidBody.unit`, `MeshValidator` | `A2`, `F4`, `S3`, `S4` | 11–16 | `EM_EDICAO`→`APLICADO`, `FUTURA`→`PARCIAL` | `FIELDS`, `MK` | planejado (capacidade futura) |
| RF60.CA02 | `ProfileOperation.extrude`, `MeshValidator` | `A2`, `F7`, `S3`, `E422` | 1–11 | `EM_EDICAO`→`[*]` | `SCS`, `MK` | planejado |
| RF60.CA03 | `ProfileOperation.revolve/loft/sweep` | `A2`, `F4`, `S3` | 1–3, 23–28 (opt IA) | `EM_EDICAO`→`APLICADO` | `FIELDS`, `MK` | planejado |
| RF60.CA04 | `InflateOperation` (nature, refineLevel) | `A5`, `F5` | 2–3 | `PARCIAL`→`DISPONIVEL` | `CAP` | planejado |
| RF60.CA05 | `MeshKernelPort.boolean3d`, `MeshValidator` | `A3`, `S2`, `S3`, `E409`, `E422` | 6–16 | `EM_EDICAO`→`APLICADO`, `LIVRE`→`RESERVADA` | `SCS`, `MK` | planejado |
| RF60.CA06 | `EdgeFinish.supportedOn`, `SolidBody.representation`, `OperationCapability` | `A3`, `F6`, `F1` | 2 | `PARCIAL`→`REGIAO` | `CAP`, `FIELDS` | planejado |
| RF60.CA07 | `Transform3D` (pivot, limits), `SolidCommandService.apply` com inverso | `A4`, `A5`, `F4`, `S1`, `E404`, `E403` | 7–8, 17–22 | `VAZIA`→`PARCIAL`→`NOS`, `APLICADO`→`DESFEITO` | `FIELDS`, `SCS` | planejado |

Toda operação 3D aparece na matriz de capacidades com status, representação e limitação; nenhuma malha é rotulada como sólido B-rep. Nenhum CA é marcado como concluído por este diagrama.
